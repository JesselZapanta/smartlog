import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  Phone,
  Lock,
  User,
  UserRound,
  UserCog,
  UserPlus,
  KeyRound,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
  FileText,
  Upload,
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import {
  getInitials,
  roleOptions,
  roleStepConfig,
  roleStepAllFields,
  recordTypeFor,
} from "@/pages/admin/users/constants.js";
import {
  getRegions,
  getProvinces,
  getCities,
  getRegionCities,
  getBarangays,
  codeOf,
  nameOf,
} from "@/lib/psgc";
import InternDetailsStep from "@/pages/admin/users/InternDetailsStep.jsx";
import HteDetailsStep from "@/pages/admin/users/HteDetailsStep.jsx";
import CoordinatorDetailsStep from "@/pages/admin/users/CoordinatorDetailsStep.jsx";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const accountFields = {
  firstname: z.string().min(1, "First name is required"),
  middlename: z.string(),
  lastname: z.string().min(1, "Last name is required"),
  extension: z.string(),
  contact_number: z.string(),
  role: z.string().min(1, "Role is required"),
  profile_picture: z.union([z.string(), z.instanceof(File)]).optional(),
};

const locationFields = {
  region: z.string().min(1, "Select a region"),
  province: z.string().min(1, "Select a province"),
  city_municipality: z.string().min(1, "Select a city or municipality"),
  barangay: z.string().min(1, "Select a barangay"),
};

const roleFields = {
  academic_year_id: z.string(),
  institute_id: z.string(),
  program_id: z.string(),
  date_of_birth: z.string(),
  place_of_birth: z.string(),
  fathers_name: z.string(),
  fathers_occupation: z.string(),
  fathers_contact: z.string(),
  mothers_name: z.string(),
  mothers_occupation: z.string(),
  mothers_contact: z.string(),
  parents_guardian_address: z.string(),
  practicum_instructor: z.string(),
  name: z.string(),
  moa: z.union([z.string(), z.instanceof(File)]).optional(),
  cor: z.union([z.string(), z.instanceof(File)]).optional(),
  start_at: z.string(),
  end_at: z.string(),
  status: z.string(),
};

const credentialsFields = {
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
};

const roleRequiredFields = {
  intern: [
    "academic_year_id",
    "institute_id",
    "program_id",
    "date_of_birth",
    "place_of_birth",
    "fathers_name",
    "fathers_occupation",
    "fathers_contact",
    "mothers_name",
    "mothers_occupation",
    "mothers_contact",
    "parents_guardian_address",
    "practicum_instructor",
  ],
  hte: ["name", "institute_id", "program_id"],
  ojt_coordinator: ["institute_id", "program_id"],
  ojt_instructor: ["institute_id", "program_id"],
};

const roleFieldMessages = {
  academic_year_id: "Select an academic year",
  institute_id: "Select an institute",
  program_id: "Select a program",
  date_of_birth: "Date of birth is required",
  place_of_birth: "Place of birth is required",
  fathers_name: "Father's name is required",
  fathers_occupation: "Father's occupation is required",
  fathers_contact: "Father's contact is required",
  mothers_name: "Mother's name is required",
  mothers_occupation: "Mother's occupation is required",
  mothers_contact: "Mother's contact is required",
  parents_guardian_address: "Parents / guardian address is required",
  practicum_instructor: "Practicum instructor is required",
  name: "HTE / company name is required",
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const MAX_COR_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const avatarMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function applyRoleRequired(data, ctx) {
  const required = roleRequiredFields[data.role];
  if (!required) return;
  required.forEach((field) => {
    if (!data[field]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: roleFieldMessages[field] });
    }
  });
}

const createSchema = z
  .object({
    ...accountFields,
    ...locationFields,
    ...roleFields,
    ...credentialsFields,
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your password"),
  })
  .superRefine((data, ctx) => {
    applyRoleRequired(data, ctx);
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password_confirmation"],
        message: "Passwords do not match",
      });
    }
  });

const editSchema = z
  .object({
    ...accountFields,
    ...locationFields,
    ...roleFields,
    ...credentialsFields,
    password: z
      .string()
      .optional()
      .refine((value) => !value || value.length >= 8, { message: "Password must be at least 8 characters" }),
    password_confirmation: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    applyRoleRequired(data, ctx);
    if (data.password && data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password_confirmation"],
        message: "Passwords do not match",
      });
    }
  });

const formFieldNames = [
  "firstname",
  "middlename",
  "lastname",
  "extension",
  "contact_number",
  "role",
  "profile_picture",
  "region",
  "province",
  "city_municipality",
  "barangay",
  ...roleStepAllFields,
  "email",
  "password",
  "password_confirmation",
];

const accountStepFields = ["firstname", "middlename", "lastname", "extension", "contact_number", "role", "profile_picture"];
const locationStepFields = ["region", "province", "city_municipality", "barangay"];
const credentialsStepFields = ["email", "password", "password_confirmation"];

function buildRolePayload(type, values) {
  if (type === "intern") {
    return {
      academic_year_id: Number(values.academic_year_id),
      institute_id: Number(values.institute_id),
      program_id: Number(values.program_id),
      date_of_birth: values.date_of_birth,
      place_of_birth: values.place_of_birth || null,
      fathers_name: values.fathers_name || null,
      fathers_occupation: values.fathers_occupation || null,
      fathers_contact: values.fathers_contact || null,
      mothers_name: values.mothers_name || null,
      mothers_occupation: values.mothers_occupation || null,
      mothers_contact: values.mothers_contact || null,
      parents_guardian_address: values.parents_guardian_address || null,
      practicum_instructor: values.practicum_instructor || null,
      cor: values.cor instanceof File ? values.cor : undefined,
    };
  }
  if (type === "hte") {
    return {
      name: values.name,
      institute_id: Number(values.institute_id),
      program_id: Number(values.program_id),
      moa: values.moa instanceof File ? values.moa : undefined,
      start_at: values.start_at || null,
      end_at: values.end_at || null,
      status: values.status || "active",
    };
  }
  return {
    institute_id: Number(values.institute_id),
    program_id: Number(values.program_id),
  };
}

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [codes, setCodes] = useState({ region: "", province: "", city: "", barangay: "" });

  const [terms, setTerms] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingTerms, setLoadingTerms] = useState(true);
  const [loadingInstitutes, setLoadingInstitutes] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [existingMoaUrl, setExistingMoaUrl] = useState(null);
  const [existingCorUrl, setExistingCorUrl] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState(null);

  const form = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      firstname: "",
      middlename: "",
      lastname: "",
      extension: "",
      contact_number: "",
      role: "",
      profile_picture: "",
      region: "",
      province: "",
      city_municipality: "",
      barangay: "",
      academic_year_id: "",
      institute_id: "",
      program_id: "",
      date_of_birth: "",
      place_of_birth: "",
      fathers_name: "",
      fathers_occupation: "",
      fathers_contact: "",
      mothers_name: "",
      mothers_occupation: "",
      mothers_contact: "",
      parents_guardian_address: "",
      practicum_instructor: "",
      name: "",
      moa: "",
      cor: "",
      start_at: "",
      end_at: "",
      status: "active",
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

  const role = form.watch("role");
  const previousRole = useRef(role);
  const originalRole = useRef(null);
  const loadedRoleValues = useRef(null);
  const loadedLocation = useRef(null);
  const roleStep = roleStepConfig[role] || null;
  const lastStep = roleStep ? 4 : 3;

  const steps = [
    { id: 1, label: "Account Information", icon: UserRound },
    { id: 2, label: "Location", icon: MapPin },
    ...(roleStep ? [{ id: 3, label: roleStep.label, icon: roleStep.icon }] : []),
    { id: lastStep, label: "Credentials", icon: KeyRound },
  ];

  const stepFields = {
    1: accountStepFields,
    2: locationStepFields,
    3: roleStep ? roleStep.fields : credentialsStepFields,
    4: credentialsStepFields,
  };

  useEffect(() => {
    if (loading) return;
    if (previousRole.current !== role) {
      if (step > 2) setStep(1);
      roleStepAllFields.forEach((field) => form.setValue(field, ""));
      setExistingMoaUrl(null);
      setExistingCorUrl(null);
      loadedRoleValues.current = null;
      previousRole.current = role;
    }
  }, [role, loading, form, step]);

  useEffect(() => {
    let active = true;
    setLoadingRegions(true);
    getRegions()
      .then((data) => {
        if (active) setRegions(data);
      })
      .catch((err) => {
        if (active) toast.error("Failed to load regions", { description: err.message });
      })
      .finally(() => {
        if (active) setLoadingRegions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/academic-terms/options")
      .then((res) => {
        if (active) setTerms(res.data.data);
      })
      .catch((err) => {
        if (active) toast.error("Failed to load academic years", { description: firstErrorMessage(err) });
      })
      .finally(() => {
        if (active) setLoadingTerms(false);
      });
    api
      .get("/institutes?per_page=100")
      .then((res) => {
        if (active) setInstitutes(res.data.data);
      })
      .catch((err) => {
        if (active) toast.error("Failed to load institutes", { description: firstErrorMessage(err) });
      })
      .finally(() => {
        if (active) setLoadingInstitutes(false);
      });
    api
      .get("/programs?per_page=100")
      .then((res) => {
        if (active) setPrograms(res.data.data);
      })
      .catch((err) => {
        if (active) toast.error("Failed to load programs", { description: firstErrorMessage(err) });
      })
      .finally(() => {
        if (active) setLoadingPrograms(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function resolveLocation(location) {
    let regionsData = regions;
    if (!regionsData.length) {
      try {
        regionsData = await getRegions();
        setRegions(regionsData);
      } catch {
        return;
      }
    }
    const regionCode = codeOf(regionsData, location.region);
    setCodes((c) => ({ ...c, region: regionCode }));
    form.setValue("region", location.region || "");
    if (!regionCode) return;

    setLoadingProvinces(true);
    try {
      const provincesData = await getProvinces(regionCode);
      setProvinces(provincesData);
      const provinceCode = codeOf(provincesData, location.province);
      setCodes((c) => ({ ...c, province: provinceCode }));
      form.setValue("province", location.province || "");
      if (!provinceCode) return;

      setLoadingCities(true);
      let citiesData = [];
      try {
        citiesData = await getCities(provinceCode);
      } catch {
        citiesData = await getRegionCities(regionCode);
      }
      setCities(citiesData);
      const cityCode = codeOf(citiesData, location.city_municipality);
      setCodes((c) => ({ ...c, city: cityCode }));
      form.setValue("city_municipality", location.city_municipality || "");
      if (!cityCode) return;

      setLoadingBarangays(true);
      const barangaysData = await getBarangays(cityCode);
      setBarangays(barangaysData);
      const barangayCode = codeOf(barangaysData, location.barangay);
      setCodes((c) => ({ ...c, barangay: barangayCode }));
      form.setValue("barangay", location.barangay || "");
      loadedLocation.current = {
        region: location.region || "",
        province: location.province || "",
        city_municipality: location.city_municipality || "",
        barangay: location.barangay || "",
      };
    } catch (err) {
      toast.error("Failed to load saved location", { description: err.message });
    } finally {
      setLoadingProvinces(false);
      setLoadingCities(false);
      setLoadingBarangays(false);
    }
  }

  function prefillRoleStep(type, record) {
    if (type === "intern") {
      form.setValue("academic_year_id", record.academic_year_id ? String(record.academic_year_id) : "");
      form.setValue("institute_id", record.institute_id ? String(record.institute_id) : "");
      form.setValue("program_id", record.program_id ? String(record.program_id) : "");
      form.setValue("date_of_birth", record.date_of_birth ? String(record.date_of_birth).slice(0, 10) : "");
      form.setValue("place_of_birth", record.place_of_birth || "");
      form.setValue("fathers_name", record.fathers_name || "");
      form.setValue("fathers_occupation", record.fathers_occupation || "");
      form.setValue("fathers_contact", record.fathers_contact || "");
      form.setValue("mothers_name", record.mothers_name || "");
      form.setValue("mothers_occupation", record.mothers_occupation || "");
      form.setValue("mothers_contact", record.mothers_contact || "");
      form.setValue("parents_guardian_address", record.parents_guardian_address || "");
      form.setValue("practicum_instructor", record.practicum_instructor || "");
      setExistingCorUrl(record.cor || null);
    } else if (type === "hte") {
      form.setValue("name", record.name || "");
      form.setValue("institute_id", record.institute_id ? String(record.institute_id) : "");
      form.setValue("program_id", record.program_id ? String(record.program_id) : "");
      form.setValue("moa", record.moa_url ? record.moa || "" : "");
      setExistingMoaUrl(record.moa_url || null);
      form.setValue("start_at", record.start_at ? String(record.start_at).slice(0, 10) : "");
      form.setValue("end_at", record.end_at ? String(record.end_at).slice(0, 10) : "");
      form.setValue("status", record.status || "active");
    } else {
      form.setValue("institute_id", record.institute_id ? String(record.institute_id) : "");
      form.setValue("program_id", record.program_id ? String(record.program_id) : "");
    }

    const currentValues = form.getValues();
    loadedRoleValues.current = {
      type,
      values: Object.fromEntries(roleStepAllFields.map((name) => [name, currentValues[name]])),
    };
  }

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    api
      .get(`/users/${id}`)
      .then((res) => {
        if (!active) return;
        const user = res.data.data;
        previousRole.current = user.role;
        originalRole.current = user.role;
        form.reset({
          firstname: user.firstname || "",
          middlename: user.middlename || "",
          lastname: user.lastname || "",
          extension: user.extension || "",
          contact_number: user.contact_number || "",
          role: user.role || "",
          profile_picture: user.profile_picture || "",
          region: "",
          province: "",
          city_municipality: "",
          barangay: "",
          academic_year_id: "",
          institute_id: "",
          program_id: "",
          date_of_birth: "",
          place_of_birth: "",
          fathers_name: "",
          fathers_occupation: "",
          fathers_contact: "",
          mothers_name: "",
          mothers_occupation: "",
          mothers_contact: "",
          parents_guardian_address: "",
          practicum_instructor: "",
      name: "",
      moa: "",
      start_at: "",
      end_at: "",
      status: "active",
      email: user.email || "",
          password: "",
          password_confirmation: "",
        });

        const recordType = recordTypeFor(user.role);
        if (recordType) {
          api
            .get(`/users/${id}/${recordType}`)
            .then((res2) => {
              if (active && res2.data.data) prefillRoleStep(recordType, res2.data.data);
            })
            .catch(() => {
              // No role record yet — leave step empty.
            });
        }
        setExistingAvatarUrl(user.profile_picture || null);
      })
      .catch((err) => {
        if (active) {
          toast.error("Failed to load user", { description: firstErrorMessage(err) });
          navigate("/admin/users");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    api
      .get(`/users/${id}/location`)
      .then((res) => {
        if (active && res.data.data) resolveLocation(res.data.data);
      })
      .catch(() => {
        // No saved location yet — leave step empty.
      });

    return () => {
      active = false;
    };
  }, [id, isEdit, form, navigate]);

  async function handleNext() {
    const valid = await form.trigger(stepFields[step]);
    const stepHasErrors = stepFields[step].some((name) => Boolean(form.formState.errors[name]));
    if (valid && !stepHasErrors) setStep((s) => s + 1);
  }

  function onRegionChange(code) {
    setCodes((c) => ({ ...c, region: code, province: "", city: "", barangay: "" }));
    form.setValue("region", nameOf(regions, code));
    form.setValue("province", "");
    form.setValue("city_municipality", "");
    form.setValue("barangay", "");
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    if (!code) return;
    setLoadingProvinces(true);
    getProvinces(code)
      .then(setProvinces)
      .catch((err) => toast.error("Failed to load provinces", { description: err.message }))
      .finally(() => setLoadingProvinces(false));
  }

  function onProvinceChange(code) {
    setCodes((c) => ({ ...c, province: code, city: "", barangay: "" }));
    form.setValue("province", nameOf(provinces, code));
    form.setValue("city_municipality", "");
    form.setValue("barangay", "");
    setCities([]);
    setBarangays([]);
    if (!code) return;
    loadCities(code);
  }

  async function loadCities(provinceCode) {
    setLoadingCities(true);
    try {
      let data = [];
      try {
        data = await getCities(provinceCode);
      } catch {
        data = await getRegionCities(codes.region);
      }
      setCities(data);
    } catch (err) {
      toast.error("Failed to load cities", { description: err.message });
    } finally {
      setLoadingCities(false);
    }
  }

  function onCityChange(code) {
    setCodes((c) => ({ ...c, city: code, barangay: "" }));
    form.setValue("city_municipality", nameOf(cities, code));
    form.setValue("barangay", "");
    setBarangays([]);
    if (!code) return;
    setLoadingBarangays(true);
    getBarangays(code)
      .then(setBarangays)
      .catch((err) => toast.error("Failed to load barangays", { description: err.message }))
      .finally(() => setLoadingBarangays(false));
  }

  function onBarangayChange(code) {
    setCodes((c) => ({ ...c, barangay: code }));
    form.setValue("barangay", nameOf(barangays, code));
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!avatarMimeTypes.includes(file.type)) {
      toast.error("Invalid file", { description: "Only JPG, PNG, GIF or WebP images are allowed." });
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("File too large", { description: "Profile photo must be 2 MB or smaller." });
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    setExistingAvatarUrl(null);
    form.setValue("profile_picture", file);
  }

  function removeAvatar() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setExistingAvatarUrl(null);
    form.setValue("profile_picture", "");
  }

  function handleCorChange(event, onChange) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Invalid file", { description: "Only PDF files are allowed." });
      return;
    }
    if (file.size > MAX_COR_SIZE) {
      toast.error("File too large", { description: "COR file must be 10 MB or smaller." });
      return;
    }
    setExistingCorUrl(null);
    onChange(file);
  }

  async function handleSave() {
    const valid = await form.trigger(stepFields[lastStep]);
    if (!valid) return;
    form.clearErrors(formFieldNames.filter((name) => !stepFields[lastStep].includes(name)));
    await onSubmit(form.getValues());
  }

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const userPayload = {
        firstname: values.firstname,
        middlename: values.middlename,
        lastname: values.lastname,
        extension: values.extension,
        contact_number: values.contact_number,
        role: values.role,
        email: values.email,
      };

      let userId = id;
      const avatarIsFile = values.profile_picture instanceof File;

      const body = avatarIsFile ? new FormData() : userPayload;
      if (avatarIsFile) {
        Object.entries(userPayload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) body.append(key, value);
        });
        body.append("profile_picture", values.profile_picture);
      }

      const nextType = recordTypeFor(values.role);
      const prevType = isEdit ? recordTypeFor(originalRole.current) : null;

      const buildRoleSave = (targetId) => {
        const rolePayload = buildRolePayload(nextType, values);
        const hasFile =
          (nextType === "hte" && rolePayload.moa instanceof File) ||
          (nextType === "intern" && rolePayload.cor instanceof File);
        if (hasFile) {
          const formData = new FormData();
          Object.entries(rolePayload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) formData.append(key, value);
          });
          formData.append("_method", "PUT");
          return api.post(`/users/${targetId}/${nextType}`, formData);
        }
        return api.put(`/users/${targetId}/${nextType}`, rolePayload);
      };

      const buildLocationSave = (targetId) =>
        api.put(`/users/${targetId}/location`, {
          region: values.region,
          province: values.province,
          city_municipality: values.city_municipality,
          barangay: values.barangay,
          status: "active",
        });

      if (isEdit) {
        if (values.password) {
          if (avatarIsFile) {
            body.append("password", values.password);
            body.append("password_confirmation", values.password_confirmation);
          } else {
            body.password = values.password;
            body.password_confirmation = values.password_confirmation;
          }
        }

        const requests = [];
        if (avatarIsFile) {
          body.append("_method", "PUT");
          requests.push(api.post(`/users/${id}`, body));
        } else {
          requests.push(api.put(`/users/${id}`, body));
        }

        if (prevType && prevType !== nextType) {
          requests.push(
            api.delete(`/users/${id}/${prevType}`).catch(() => {
              // No previous record — nothing to clean up.
            })
          );
        }

        const roleStepFields = roleStep ? roleStep.fields : [];
        const roleChanged =
          !loadedRoleValues.current ||
          loadedRoleValues.current.type !== nextType ||
          roleStepFields.some((name) => values[name] !== loadedRoleValues.current.values[name]);
        if (nextType && roleChanged) {
          requests.push(buildRoleSave(id));
        }

        const locationChanged =
          !loadedLocation.current ||
          values.region !== loadedLocation.current.region ||
          values.province !== loadedLocation.current.province ||
          values.city_municipality !== loadedLocation.current.city_municipality ||
          values.barangay !== loadedLocation.current.barangay;
        const hasLocationValues = Boolean(values.region) && Boolean(values.province) && Boolean(values.city_municipality) && Boolean(values.barangay);
        if (hasLocationValues && locationChanged) {
          requests.push(buildLocationSave(id));
        }

        await Promise.all(requests);
      } else {
        if (avatarIsFile) {
          body.append("password", values.password);
          body.append("password_confirmation", values.password_confirmation);
        } else {
          body.password = values.password;
          body.password_confirmation = values.password_confirmation;
        }
        const created = await api.post("/users", body);
        userId = created.data.data.uuid;

        const requests = [];
        if (nextType) requests.push(buildRoleSave(userId));
        requests.push(buildLocationSave(userId));
        await Promise.all(requests);
      }

      toast.success(isEdit ? "User updated" : "User created", {
        description: `${values.firstname} ${values.lastname} was ${isEdit ? "updated" : "added"}.`,
      });
      navigate("/admin/users");
    } catch (err) {
      toast.error(isEdit ? "Update failed" : "Creation failed", { description: firstErrorMessage(err) });
      const errors = err.response?.data?.errors;
      if (errors && typeof errors === "object") {
        const errorFields = Object.keys(errors);
        const orderedSteps = [1, 2, 3, 4];
        const targetStep = orderedSteps.find((s) =>
          errorFields.some((name) => stepFields[s]?.includes(name))
        );
        if (targetStep) setStep(targetStep);
        const visibleFields = targetStep ? stepFields[targetStep] : [];
        Object.entries(errors).forEach(([name, messages]) => {
          if (
            visibleFields.includes(name) &&
            formFieldNames.includes(name) &&
            Array.isArray(messages) &&
            messages.length > 0
          ) {
            form.setError(name, { message: messages[0] });
          }
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-gray-500">
              <Link to="/admin/users">
                <ArrowLeft size={18} />
              </Link>
            </Button>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-600/25">
              {isEdit ? <UserCog size={22} /> : <UserPlus size={22} />}
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-green-950 sm:text-2xl">
                {isEdit ? "Edit User" : "Add New User"}
              </h1>
              <p className="text-sm text-gray-500">
                {isEdit ? "Update account details and role." : "Create a new system account."}
              </p>
            </div>
          </div>

        {loading ? (
          <PageLoader />
        ) : (
          <Card className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm ring-gray-100 sm:mt-5">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {steps.map((s, index) => (
                          <Fragment key={s.id}>
                            {index > 0 && (
                              <div className={`h-0.5 flex-1 rounded-full ${step > index ? "bg-green-600" : "bg-gray-200"}`} />
                            )}
                            <div
                              aria-label={s.label}
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                step >= s.id ? "bg-green-600 text-white shadow-sm shadow-green-600/30" : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {step > s.id ? <Check size={14} /> : s.id}
                            </div>
                          </Fragment>
                        ))}
                      </div>
            </div>

            <Form {...form}>
              <form onSubmit={(event) => event.preventDefault()} noValidate>
                <CardContent className="p-5 sm:p-6">
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3 ring-1 ring-gray-100 sm:flex-row sm:items-center sm:p-4">
                        <Avatar className="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                          {(avatarPreview || existingAvatarUrl) && (
                            <AvatarImage
                              src={avatarPreview || existingAvatarUrl}
                              alt="Profile preview"
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-lg font-bold text-white sm:text-xl">
                            {getInitials(`${form.watch("firstname") || ""} ${form.watch("lastname") || ""}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex w-auto flex-col items-center gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                          <label
                            htmlFor="profile-picture-input"
                            className="inline-flex h-8 w-auto cursor-pointer items-center justify-center gap-1 rounded-lg bg-green-600 px-4 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-green-700 sm:h-8"
                          >
                            <ImagePlus size={12} />
                            {avatarPreview || existingAvatarUrl ? "Change photo" : "Upload photo"}
                          </label>
                          {(avatarPreview || existingAvatarUrl) && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 w-auto rounded-lg px-3 text-xs font-medium text-red-600 hover:bg-red-50 sm:h-8"
                              onClick={removeAvatar}
                            >
                              <X size={12} /> Remove
                            </Button>
                          )}
                        </div>
                        <p className="w-full text-center text-xs text-gray-400 sm:ml-auto sm:max-w-[9.5rem] sm:text-left">
                          JPG, PNG, GIF or WebP. Max 2 MB.
                        </p>
                      </div>
                      <input
                        id="profile-picture-input"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />

                      <div className="flex items-center gap-2">
                        <UserRound size={14} className="text-green-600" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          Account information
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="firstname"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                First name *
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input placeholder="Juan" className="h-11 rounded-xl pl-10" {...field} />
                                </div>
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lastname"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Last name *
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input placeholder="Dela Cruz" className="h-11 rounded-xl pl-10" {...field} />
                                </div>
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="middlename"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Middle name
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input placeholder="Santos" className="h-11 rounded-xl pl-10" {...field} />
                                </div>
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="extension"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Extension
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input placeholder="Jr., Sr., III" className="h-11 rounded-xl pl-10" {...field} />
                                </div>
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contact_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Contact number
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input placeholder="09XX XXX XXXX" className="h-11 rounded-xl pl-10" {...field} />
                                </div>
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Role *
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {roleOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-green-600" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Location</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Select the user&apos;s address from the Philippine Standard Geographic Code (PSGC).
                      </p>

                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="region"
                          render={() => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Region *
                              </FormLabel>
                              <Select disabled={loadingRegions} onValueChange={onRegionChange} value={codes.region || undefined}>
                                <FormControl>
                                  <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                                    <SelectValue placeholder={loadingRegions ? "Loading regions…" : "Select region"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {regions.map((r) => (
                                    <SelectItem key={r.code} value={r.code}>
                                      {r.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="province"
                          render={() => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Province *
                              </FormLabel>
                              <Select
                                disabled={!codes.region || loadingProvinces}
                                onValueChange={onProvinceChange}
                                value={codes.province || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                                    <SelectValue placeholder={loadingProvinces ? "Loading provinces…" : "Select province"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {provinces.map((p) => (
                                    <SelectItem key={p.code} value={p.code}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="city_municipality"
                          render={() => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                City / Municipality *
                              </FormLabel>
                              <Select
                                disabled={!codes.province || loadingCities}
                                onValueChange={onCityChange}
                                value={codes.city || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                                    <SelectValue placeholder={loadingCities ? "Loading cities…" : "Select city / municipality"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {cities.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="barangay"
                          render={() => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Barangay *
                              </FormLabel>
                              <Select
                                disabled={!codes.city || loadingBarangays}
                                onValueChange={onBarangayChange}
                                value={codes.barangay || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                                    <SelectValue placeholder={loadingBarangays ? "Loading barangays…" : "Select barangay"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {barangays.map((b) => (
                                    <SelectItem key={b.code} value={b.code}>
                                      {b.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {step === 3 && roleStep && (
                    roleStep.type === "intern" ? (
                      <Fragment>
                        <InternDetailsStep
                          form={form}
                          terms={terms}
                          institutes={institutes}
                          programs={programs}
                          loadingTerms={loadingTerms}
                          loadingInstitutes={loadingInstitutes}
                          loadingPrograms={loadingPrograms}
                        />

                        <FormField
                          control={form.control}
                          name="cor"
                          render={({ field }) => {
                            const selectedFile = field.value instanceof File ? field.value : null;
                            const hasExisting = !selectedFile && typeof field.value === "string" && Boolean(field.value);
                            return (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                  Certificate of Registration (COR)
                                </FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    {hasExisting && existingCorUrl && (
                                      <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                                        <a
                                          href={existingCorUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex min-w-0 items-center gap-2 text-sm font-medium text-green-700 hover:underline"
                                        >
                                          <FileText size={16} className="shrink-0" />
                                          <span className="truncate">Current COR file</span>
                                        </a>
                                        <span className="shrink-0 text-xs text-gray-400">opens in new tab</span>
                                      </div>
                                    )}
                                    {selectedFile && (
                                      <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                                        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-green-800">
                                          <FileText size={16} className="shrink-0" />
                                          <span className="truncate">{selectedFile.name}</span>
                                          <span className="shrink-0 text-xs text-gray-500">{formatFileSize(selectedFile.size)}</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => field.onChange("")}
                                          className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-green-100 hover:text-red-600"
                                          aria-label="Remove selected COR file"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    )}
                                    <label
                                      htmlFor="cor-file-input"
                                      className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                                    >
                                      <Upload size={16} />
                                      {selectedFile || hasExisting ? "Choose a new PDF" : "Choose PDF file"}
                                    </label>
                                    <input
                                      id="cor-file-input"
                                      type="file"
                                      accept="application/pdf,.pdf"
                                      className="hidden"
                                      name={field.name}
                                      onChange={(event) => handleCorChange(event, field.onChange)}
                                    />
                                  </div>
                                </FormControl>
                                <FormDescription className="text-xs text-gray-400">
                                  PDF only, max 10 MB. {hasExisting ? "Uploading a new file replaces the current one." : "Optional."}
                                </FormDescription>
                                <div className="min-h-[1.25rem]"><FormMessage /></div>
                              </FormItem>
                            );
                          }}
                        />
                      </Fragment>
                    ) : roleStep.type === "hte" ? (
                      <HteDetailsStep
                        form={form}
                        institutes={institutes}
                        programs={programs}
                        loadingInstitutes={loadingInstitutes}
                        loadingPrograms={loadingPrograms}
                        existingMoaUrl={existingMoaUrl}
                      />
                    ) : (
                      <CoordinatorDetailsStep
                        role={role}
                        form={form}
                        institutes={institutes}
                        programs={programs}
                        loadingInstitutes={loadingInstitutes}
                        loadingPrograms={loadingPrograms}
                      />
                    )
                  )}

                  {step === lastStep && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <KeyRound size={14} className="text-green-600" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Credentials</p>
                      </div>

                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Email *
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input
                                    type="email"
                                    placeholder="name@tcgc.edu.ph"
                                    className="h-11 rounded-xl pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                {isEdit ? "New password" : "Password *"}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input
                                    type="password"
                                    placeholder={isEdit ? "Leave blank to keep current" : "At least 8 characters"}
                                    className="h-11 rounded-xl pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              {isEdit && (
                                <FormDescription className="text-xs text-gray-400">
                                  Leave blank to keep the current password.
                                </FormDescription>
                              )}
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="password_confirmation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                {isEdit ? "Confirm new password" : "Confirm password *"}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                  <Input type="password" placeholder="Repeat password" className="h-11 rounded-xl pl-10" {...field} />
                                </div>
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>

                <div className="flex flex-row items-center justify-between gap-2 border-t border-gray-100 px-4 py-4 sm:px-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-xl sm:flex-initial"
                    onClick={() => navigate("/admin/users")}
                  >
                    Cancel
                  </Button>
                  <div className="flex flex-1 flex-row items-center justify-end gap-2 sm:flex-initial">
                    {step > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 flex-1 rounded-xl sm:flex-initial"
                        onClick={() => setStep((s) => s - 1)}
                      >
                        <ChevronLeft size={16} /> Back
                      </Button>
                    )}
                    {step < lastStep ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="h-11 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
                      >
                        Next <ChevronRight size={16} />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={submitting}
                        className="h-11 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Saving…
                          </>
                        ) : (
                          <>
                            <Save size={16} /> {isEdit ? "Update user" : "Create user"}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
