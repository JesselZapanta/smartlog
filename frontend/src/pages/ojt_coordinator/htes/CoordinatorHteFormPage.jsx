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
  UserRound,
  KeyRound,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
  FileText,
  Upload,
  Building2,
  Store,
} from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import {
  getRegions,
  getProvinces,
  getCities,
  getRegionCities,
  getBarangays,
  codeOf,
  nameOf,
} from "@/lib/psgc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import PageLoader from "@/components/PageLoader";
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
  profile_picture: z.union([z.string(), z.instanceof(File)]).optional(),
};

const locationFields = {
  region: z.string().min(1, "Select a region"),
  province: z.string().min(1, "Select a province"),
  city_municipality: z.string().min(1, "Select a city or municipality"),
  barangay: z.string().min(1, "Select a barangay"),
};

const hteFields = {
  name: z.string().min(1, "HTE / company name is required"),
  program_id: z.string().min(1, "Select a program"),
  moa: z.union([z.string(), z.instanceof(File)]).optional(),
  start_at: z.string(),
  end_at: z.string(),
  status: z.string().min(1, "Select a status"),
};

const credentialsFields = {
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_MOA_SIZE = 10 * 1024 * 1024;

const avatarMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const createSchema = z
  .object({
    ...accountFields,
    ...locationFields,
    ...hteFields,
    ...credentialsFields,
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  })
  .refine((data) => !data.end_at || !data.start_at || data.end_at >= data.start_at, {
    message: "End date must be after start date",
    path: ["end_at"],
  });

const editSchema = z
  .object({
    ...accountFields,
    ...locationFields,
    ...hteFields,
    ...credentialsFields,
    password: z
      .string()
      .optional()
      .refine((value) => !value || value.length >= 8, { message: "Password must be at least 8 characters" }),
    password_confirmation: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  })
  .refine((data) => !data.end_at || !data.start_at || data.end_at >= data.start_at, {
    message: "End date must be after start date",
    path: ["end_at"],
  });

const accountStepFields = ["firstname", "middlename", "lastname", "extension", "contact_number", "profile_picture"];
const locationStepFields = ["region", "province", "city_municipality", "barangay"];
const hteStepFields = ["name", "program_id", "moa", "start_at", "end_at", "status"];
const credentialsStepFields = ["email", "password", "password_confirmation"];

const stepFields = {
  1: accountStepFields,
  2: locationStepFields,
  3: hteStepFields,
  4: credentialsStepFields,
};

export default function CoordinatorHteFormPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(uuid);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const lastStep = 4;

  const [institute, setInstitute] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [codes, setCodes] = useState({ region: "", province: "", city: "", barangay: "" });

  const [existingMoaUrl, setExistingMoaUrl] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState(null);
  const mounted = useRef(true);

  const form = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      firstname: "",
      middlename: "",
      lastname: "",
      extension: "",
      contact_number: "",
      profile_picture: "",
      region: "",
      province: "",
      city_municipality: "",
      barangay: "",
      name: "",
      program_id: "",
      moa: "",
      start_at: "",
      end_at: "",
      status: "active",
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

  const steps = [
    { id: 1, label: "Account Information", icon: UserRound },
    { id: 2, label: "Location", icon: MapPin },
    { id: 3, label: "HTE Details", icon: Building2 },
    { id: 4, label: "Credentials", icon: KeyRound },
  ];

  useEffect(() => {
    mounted.current = true;
    api
      .get("/coordinator/htes/reference")
      .then((res) => {
        if (!mounted.current) return;
        setInstitute(res.data.data.institute);
        setPrograms(res.data.data.programs || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setLoadingPrograms(false);
      });

    getRegions()
      .then((data) => mounted.current && setRegions(data))
      .catch((err) => mounted.current && toast.error("Failed to load regions", { description: err.message }));

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !uuid) return;
    let active = true;

    api
      .get(`/coordinator/htes/${uuid}`)
      .then((res) => {
        if (!active) return;
        const data = res.data.data;
        form.reset({
          firstname: data.contact_person?.split(" ")[0] || "",
          middlename: "",
          lastname: data.contact_person?.split(" ").slice(1).join(" ") || "",
          extension: "",
          contact_number: data.contact_number || "",
          profile_picture: "",
          region: data.location?.region || "",
          province: data.location?.province || "",
          city_municipality: data.location?.city_municipality || "",
          barangay: data.location?.barangay || "",
          name: data.name || "",
          program_id: data.program_id ? String(data.program_id) : "",
          moa: "",
          start_at: data.start_at || "",
          end_at: data.end_at || "",
          status: data.status || "active",
          email: data.email || "",
          password: "",
          password_confirmation: "",
        });
        setExistingMoaUrl(data.moa_url || null);
        setExistingAvatarUrl(data.profile_picture || null);
      })
      .catch((err) => {
        if (active) {
          toast.error("Failed to load HTE", { description: firstErrorMessage(err) });
          navigate("/coordinator/htes");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uuid, isEdit, form, navigate]);

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
    form.setValue("profile_picture", file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function removeAvatar() {
    form.setValue("profile_picture", "");
    setAvatarPreview(null);
  }

  function handleMoaChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Invalid file", { description: "Only PDF files are allowed." });
      return;
    }
    if (file.size > MAX_MOA_SIZE) {
      toast.error("File too large", { description: "MOA file must be 10 MB or smaller." });
      return;
    }
    form.setValue("moa", file);
  }

  async function handleSave() {
    const valid = await form.trigger();
    if (!valid) {
      const orderedSteps = [1, 2, 3, 4];
      const targetStep = orderedSteps.find((s) => stepFields[s]?.some((name) => Boolean(form.formState.errors[name])));
      if (targetStep) setStep(targetStep);
      return;
    }

    setSubmitting(true);
    const values = form.getValues();
    try {
      const payload = {
        firstname: values.firstname,
        middlename: values.middlename || null,
        lastname: values.lastname,
        extension: values.extension || null,
        contact_number: values.contact_number || null,
        email: values.email,
        name: values.name,
        program_id: Number(values.program_id),
        start_at: values.start_at || null,
        end_at: values.end_at || null,
        status: values.status || "active",
        region: values.region,
        province: values.province,
        city_municipality: values.city_municipality,
        barangay: values.barangay,
      };
      if (values.password) {
        payload.password = values.password;
        payload.password_confirmation = values.password_confirmation;
      }

      const avatarIsFile = values.profile_picture instanceof File;
      const moaIsFile = values.moa instanceof File;

      if (isEdit) {
        const requests = [];
        const userBody = avatarIsFile ? new FormData() : { ...payload };
        if (avatarIsFile) {
          Object.entries({ ...payload, password: payload.password, password_confirmation: payload.password_confirmation }).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") userBody.append(key, value);
          });
          userBody.append("profile_picture", values.profile_picture);
          userBody.append("_method", "PUT");
          requests.push(api.post(`/coordinator/htes/${uuid}`, userBody));
        } else {
          requests.push(api.put(`/coordinator/htes/${uuid}`, userBody));
        }

        if (moaIsFile) {
          const formData = new FormData();
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") formData.append(key, value);
          });
          formData.append("moa", values.moa);
          formData.append("_method", "PUT");
          requests.push(api.post(`/coordinator/htes/${uuid}`, formData));
        }

        await Promise.all(requests);
        toast.success("HTE updated", { description: `${values.name} was updated.` });
      } else {
        const body = avatarIsFile || moaIsFile ? new FormData() : payload;
        if (body instanceof FormData) {
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") body.append(key, value);
          });
          if (avatarIsFile) body.append("profile_picture", values.profile_picture);
          if (moaIsFile) body.append("moa", values.moa);
        }
        await api.post("/coordinator/htes", body);
        toast.success("HTE created", { description: `${values.name} was created.` });
      }

      navigate("/coordinator/htes");
    } catch (err) {
      toast.error(isEdit ? "Update failed" : "Create failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass = "data-[size=default]:h-11 w-full rounded-xl";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";

  return (
    <CoordinatorLayout>
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-gray-500">
            <Link to="/coordinator/htes">
              <ArrowLeft size={18} />
            </Link>
          </Button>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-600/25">
            <Store size={22} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-green-950 sm:text-2xl">
              {isEdit ? "Edit HTE" : "Add New HTE"}
            </h1>
            <p className="text-sm text-gray-500">
              {institute ? `For ${institute.name}` : "Loading your institute…"}
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
                            {((form.watch("firstname") || "") + " " + (form.watch("lastname") || ""))
                              .trim()
                              .split(" ")
                              .filter(Boolean)
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex w-auto flex-col items-center gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                          <label
                            htmlFor="hte-profile-picture-input"
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
                        id="hte-profile-picture-input"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="firstname"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>First name *</FormLabel>
                              <FormControl>
                                <Input className="h-11 rounded-xl" placeholder="e.g. Liza" {...field} />
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
                              <FormLabel className={labelClass}>Middle name</FormLabel>
                              <FormControl>
                                <Input className="h-11 rounded-xl" placeholder="Optional" {...field} />
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
                              <FormLabel className={labelClass}>Last name *</FormLabel>
                              <FormControl>
                                <Input className="h-11 rounded-xl" placeholder="e.g. Cruz" {...field} />
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
                              <FormLabel className={labelClass}>Extension</FormLabel>
                              <FormControl>
                                <Input className="h-11 rounded-xl" placeholder="Jr., Sr., III (optional)" {...field} />
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
                              <FormLabel className={labelClass}>Contact number</FormLabel>
                              <FormControl>
                                <Input className="h-11 rounded-xl" placeholder="0917 123 4567" {...field} />
                              </FormControl>
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
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Address</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Region *</FormLabel>
                              <Select
                                disabled={loadingRegions}
                                onValueChange={onRegionChange}
                                value={codeOf(regions, field.value) || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className={selectClass}>
                                    <SelectValue placeholder={loadingRegions ? "Loading regions…" : "Select region"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {regions.map((region) => (
                                    <SelectItem key={region.code} value={region.code}>
                                      {region.name}
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
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Province *</FormLabel>
                              <Select
                                disabled={!codes.region || loadingProvinces}
                                onValueChange={onProvinceChange}
                                value={codeOf(provinces, field.value) || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className={selectClass}>
                                    <SelectValue
                                      placeholder={
                                        loadingProvinces ? "Loading provinces…" : codes.region ? "Select province" : "Select region first"
                                      }
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {provinces.map((province) => (
                                    <SelectItem key={province.code} value={province.code}>
                                      {province.name}
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
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>City / Municipality *</FormLabel>
                              <Select
                                disabled={!codes.province || loadingCities}
                                onValueChange={onCityChange}
                                value={codeOf(cities, field.value) || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className={selectClass}>
                                    <SelectValue
                                      placeholder={
                                        loadingCities ? "Loading cities…" : codes.province ? "Select city / municipality" : "Select province first"
                                      }
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {cities.map((city) => (
                                    <SelectItem key={city.code} value={city.code}>
                                      {city.name}
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
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Barangay *</FormLabel>
                              <Select
                                disabled={!codes.city || loadingBarangays}
                                onValueChange={onBarangayChange}
                                value={codeOf(barangays, field.value) || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className={selectClass}>
                                    <SelectValue
                                      placeholder={
                                        loadingBarangays ? "Loading barangays…" : codes.city ? "Select barangay" : "Select city first"
                                      }
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {barangays.map((barangay) => (
                                    <SelectItem key={barangay.code} value={barangay.code}>
                                      {barangay.name}
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

                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-green-600" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">HTE details</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className={labelClass}>HTE / company name *</FormLabel>
                              <FormControl>
                                <Input className="h-11 rounded-xl" placeholder="e.g. Tangub City Hall" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="program_id"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className={labelClass}>Program *</FormLabel>
                              <Select
                                disabled={loadingPrograms}
                                onValueChange={field.onChange}
                                value={field.value || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className={selectClass}>
                                    <SelectValue placeholder={loadingPrograms ? "Loading programs…" : "Select program"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {programs.map((program) => (
                                    <SelectItem key={program.id} value={String(program.id)}>
                                      {program.name}
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
                          name="start_at"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Start date</FormLabel>
                              <FormControl>
                                <Input type="date" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="end_at"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>End date</FormLabel>
                              <FormControl>
                                <Input type="date" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Status</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className={selectClass}>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[{ value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "inactive", label: "Inactive" }].map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="moa"
                          render={({ field }) => {
                            const selectedFile = field.value instanceof File ? field.value : null;
                            const hasExisting = existingMoaUrl && !selectedFile;
                            return (
                              <FormItem className="sm:col-span-2">
                                <FormLabel className={labelClass}>MOA file (PDF)</FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    {hasExisting && (
                                      <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                                        <a
                                          href={existingMoaUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex min-w-0 items-center gap-2 text-sm font-medium text-green-700 hover:underline"
                                        >
                                          <FileText size={16} className="shrink-0" />
                                          <span className="truncate">Current MOA file</span>
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
                                          onClick={() => form.setValue("moa", "")}
                                          className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-green-100 hover:text-red-600"
                                          aria-label="Remove selected MOA file"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    )}
                                    <label
                                      htmlFor="hte-moa-file-input"
                                      className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                                    >
                                      <Upload size={16} />
                                      {selectedFile || hasExisting ? "Choose a new PDF" : "Choose PDF file"}
                                    </label>
                                    <input
                                      id="hte-moa-file-input"
                                      type="file"
                                      accept="application/pdf,.pdf"
                                      className="hidden"
                                      onChange={handleMoaChange}
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
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <KeyRound size={14} className="text-green-600" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Credentials</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className={labelClass}>Email *</FormLabel>
                              <FormControl>
                                <Input className="h-11 rounded-xl" type="email" placeholder="hte@example.com" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        {!isEdit && (
                          <>
                            <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={labelClass}>Password *</FormLabel>
                                  <FormControl>
                                    <PasswordInput className="h-11 rounded-xl" placeholder="Min 8 characters" {...field} />
                                  </FormControl>
                                  <div className="min-h-[1.25rem]"><FormMessage /></div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="password_confirmation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={labelClass}>Confirm password *</FormLabel>
                                  <FormControl>
                                    <PasswordInput className="h-11 rounded-xl" placeholder="Repeat password" {...field} />
                                  </FormControl>
                                  <div className="min-h-[1.25rem]"><FormMessage /></div>
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                        {isEdit && (
                          <>
                            <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel className={labelClass}>New password (optional)</FormLabel>
                                  <FormControl>
                                    <PasswordInput className="h-11 rounded-xl" placeholder="Leave blank to keep current password" {...field} />
                                  </FormControl>
                                  <div className="min-h-[1.25rem]"><FormMessage /></div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="password_confirmation"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel className={labelClass}>Confirm new password</FormLabel>
                                  <FormControl>
                                    <PasswordInput className="h-11 rounded-xl" placeholder="Repeat new password" {...field} />
                                  </FormControl>
                                  <div className="min-h-[1.25rem]"><FormMessage /></div>
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                <div className="flex flex-row items-center justify-between gap-2 border-t border-gray-100 px-4 py-4 sm:px-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-xl sm:flex-initial"
                    onClick={() => navigate("/coordinator/htes")}
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
                            <Save size={16} /> {isEdit ? "Update HTE" : "Create HTE"}
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
    </CoordinatorLayout>
  );
}
