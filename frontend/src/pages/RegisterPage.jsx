import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  GraduationCap,
  ImagePlus,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/PasswordInput.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { useAuth } from "@/contexts/AuthContext";
import { LogoBadge } from "@/components/Logo.jsx";
import AuthAnimatedSide from "@/components/AuthAnimatedSide.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { getInitials } from "@/pages/admin/users/constants.js";
import InternDetailsStep from "@/pages/admin/users/InternDetailsStep.jsx";
import {
  getRegions,
  getProvinces,
  getCities,
  getRegionCities,
  getBarangays,
  nameOf,
} from "@/lib/psgc";

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

const internFields = {
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
  cor: z.union([z.string(), z.instanceof(File)]),
};

const internRequiredFields = [
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
  "cor",
];

const internFieldMessages = {
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
  cor: "Certificate of Registration (COR) is required",
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_COR_SIZE = 10 * 1024 * 1024;

const avatarMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const registerSchema = z
  .object({
    ...accountFields,
    ...locationFields,
    ...internFields,
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your password"),
  })
  .superRefine((data, ctx) => {
    internRequiredFields.forEach((field) => {
      if (!data[field]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: internFieldMessages[field] });
      }
    });
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password_confirmation"],
        message: "Passwords do not match",
      });
    }
  });

const internStepFields = Object.keys(internFields);

const formFieldNames = [
  "firstname",
  "middlename",
  "lastname",
  "extension",
  "contact_number",
  "profile_picture",
  "region",
  "province",
  "city_municipality",
  "barangay",
  ...internStepFields,
  "email",
  "password",
  "password_confirmation",
];

const accountStepFields = ["firstname", "middlename", "lastname", "extension", "contact_number", "profile_picture"];
const locationStepFields = ["region", "province", "city_municipality", "barangay"];
const credentialsStepFields = ["email", "password", "password_confirmation"];

const steps = [
  { id: 1, label: "Account Information", icon: UserRound },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Intern Details", icon: GraduationCap },
  { id: 4, label: "Credentials", icon: KeyRound },
];

const stepFields = {
  1: accountStepFields,
  2: locationStepFields,
  3: internStepFields,
  4: credentialsStepFields,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
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

  const [institutes, setInstitutes] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingInstitutes, setLoadingInstitutes] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstname: "",
      middlename: "",
      lastname: "",
      extension: "",
      contact_number: "",
      profile_picture: "",
      cor: "",
      region: "",
      province: "",
      city_municipality: "",
      barangay: "",
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
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

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
      .get("/register/reference-data")
      .then((res) => {
        if (!active) return;
        setInstitutes(res.data.data.institutes || []);
        setPrograms(res.data.data.programs || []);
      })
      .catch((err) => {
        if (active) toast.error("Failed to load registration data", { description: firstErrorMessage(err) });
      })
      .finally(() => {
        if (active) {
          setLoadingInstitutes(false);
          setLoadingPrograms(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

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
    form.setValue("profile_picture", file);
  }

  function removeAvatar() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    form.setValue("profile_picture", "");
  }

  function handleCorChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Invalid file", { description: "Only PDF files are allowed." });
      return;
    }
    if (file.size > MAX_COR_SIZE) {
      toast.error("File too large", { description: "COR must be 10 MB or smaller." });
      return;
    }
    form.setValue("cor", file);
  }

  async function handleSubmit() {
    const valid = await form.trigger(credentialsStepFields);
    if (!valid) return;
    form.clearErrors(formFieldNames.filter((name) => !credentialsStepFields.includes(name)));

    const values = form.getValues();
    setSubmitting(true);
    try {
      const payload = {
        firstname: values.firstname,
        middlename: values.middlename,
        lastname: values.lastname,
        extension: values.extension,
        contact_number: values.contact_number,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
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
        region: values.region,
        province: values.province,
        city_municipality: values.city_municipality,
        barangay: values.barangay,
      };

      const avatarIsFile = values.profile_picture instanceof File;
      const corIsFile = values.cor instanceof File;
      let body = payload;
      if (avatarIsFile || corIsFile) {
        body = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) body.append(key, value);
        });
        if (avatarIsFile) body.append("profile_picture", values.profile_picture);
        if (corIsFile) body.append("cor", values.cor);
      }

      await register(body);
      toast.success("Registration successful", {
        description: "Check your email for the 6-digit verification code.",
      });
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      const errors = err.response?.data?.errors;
      const emailMessages = Array.isArray(errors?.email) ? errors.email : [];
      const duplicateEmail = emailMessages.some((message) =>
        /already been taken|already exists|duplicate/i.test(message)
      );

      toast.error(duplicateEmail ? "Email already registered" : "Registration failed", {
        description: duplicateEmail
          ? `${values.email} is already in use. Sign in instead or use a different email.`
          : firstErrorMessage(err),
      });

      if (errors && typeof errors === "object") {
        const errorFields = Object.keys(errors);
        const targetStep = [1, 2, 3, 4].find((s) =>
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
        if (emailMessages.length > 0 && !form.formState.errors.email) {
          setStep(4);
          form.setError("email", { message: emailMessages[0] });
          document.getElementById("register-email")?.scrollIntoView({ behavior: "smooth", block: "center" });
          document.getElementById("register-email")?.focus({ preventScroll: true });
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 lg:h-[100dvh] lg:overflow-hidden">
      <AuthAnimatedSide />

      <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="my-auto w-full max-w-2xl">
          <div className="relative -mx-4 -mt-4 mb-8 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 px-6 pb-8 pt-6 sm:mx-0 sm:mt-0 lg:hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:20px_20px]" />
            <div className="relative flex items-center gap-3">
              <Link to="/" aria-label="SMARTLOG — back to landing page" className="flex shrink-0 no-underline">
              <LogoBadge size={48} className="drop-shadow-lg" />
            </Link>
              <div>
                <div className="font-heading text-lg font-bold leading-tight text-white">SMARTLOG</div>
                <div className="font-mono text-[11px] font-medium tracking-widest text-emerald-100">
                  OJT MONITORING SYSTEM
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60">
            <div className="px-5 pb-2 pt-7 sm:px-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 ring-1 ring-green-600/15">
                <GraduationCap size={13} /> Intern registration
              </span>
              <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-gray-900">Create your account</h1>
              <p className="mt-1.5 text-sm text-gray-500">Register as an OJT intern in a few steps.</p>
            </div>

            <Card className="mx-5 mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm ring-gray-100 sm:mx-8">
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
                            {avatarPreview && (
                              <AvatarImage src={avatarPreview} alt="Profile preview" className="object-cover" />
                            )}
                            <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-lg font-bold text-white sm:text-xl">
                              {getInitials(`${form.watch("firstname") || ""} ${form.watch("lastname") || ""}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-center gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                            <label
                              htmlFor="register-profile-picture-input"
                              className="inline-flex h-8 w-auto cursor-pointer items-center justify-center gap-1 rounded-lg bg-green-600 px-4 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-green-700 sm:h-8"
                            >
                              <ImagePlus size={12} />
                              {avatarPreview ? "Change photo" : "Upload photo"}
                            </label>
                            {avatarPreview && (
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
                          id="register-profile-picture-input"
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
                          Select your address from the Philippine Standard Geographic Code (PSGC).
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

{step === 3 && (
  <div className="space-y-4">
    <InternDetailsStep
      form={form}
      institutes={institutes}
      programs={programs}
      loadingInstitutes={loadingInstitutes}
      loadingPrograms={loadingPrograms}
      hideAcademicYear
    />

    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-4 ring-1 ring-gray-100 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Certificate of Registration (COR) *
        </p>
        <p className="mt-0.5 text-xs text-gray-400">Upload your COR for this semester as a PDF. Max 10 MB.</p>
      </div>
      <label
        htmlFor="register-cor-input"
        className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-green-700"
      >
        <FileText size={16} />
        {form.watch("cor") instanceof File ? form.watch("cor").name : "Upload COR"}
      </label>
      <input id="register-cor-input" type="file" accept="application/pdf" className="hidden" onChange={handleCorChange} />
    </div>
    {form.formState.errors.cor && (
      <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
        <AlertCircle size={13} /> {form.formState.errors.cor.message}
      </p>
    )}
  </div>
)}

                    {step === 4 && (
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
                                      id="register-email"
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
                                  Password *
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <PasswordInput
                                      placeholder="At least 8 characters"
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
                            name="password_confirmation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                  Confirm password *
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <PasswordInput placeholder="Repeat password" className="h-11 rounded-xl pl-10" {...field} />
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

                  <div className="flex flex-row items-center justify-between gap-2 border-t border-gray-100 px-5 py-4 sm:px-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 rounded-xl sm:flex-initial"
                      onClick={() => navigate("/login")}
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
                      {step < 4 ? (
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
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="h-11 flex-1 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:flex-initial"
                        >
                          {submitting ? (
                            <>
                              <Loader2 size={16} className="animate-spin" /> Creating account…
                            </>
                          ) : (
                            <>
                              Create account <ArrowRight size={16} />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            </Card>

            <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:px-8">
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-green-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">
            Tangub City Global College — OJT Monitoring System
          </p>
        </div>
      </main>
    </div>
  );
}
