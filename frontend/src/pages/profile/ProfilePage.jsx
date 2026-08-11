import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Building2,
  BadgeCheck,
  UserCog,
  ImagePlus,
  Trash2,
  UserRound,
  CalendarDays,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import InternLayout from "@/layouts/InternLayout.jsx";
import InstructorLayout from "@/layouts/InstructorLayout.jsx";
import HteLayout from "@/layouts/HteLayout.jsx";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const layoutByRole = {
  admin: AdminLayout,
  ojt_coordinator: CoordinatorLayout,
  ojt_instructor: InstructorLayout,
  intern: InternLayout,
  hte: HteLayout,
};

const roleLabels = {
  admin: "Administrator",
  ojt_coordinator: "OJT Coordinator",
  ojt_instructor: "OJT Instructor",
  intern: "Intern",
  hte: "Host Training Establishment",
};

const roleTabByRole = {
  intern: { value: "intern", label: "Intern Details", icon: GraduationCap },
  hte: { value: "hte", label: "HTE Details", icon: Building2 },
  ojt_coordinator: { value: "assignment", label: "Assignment", icon: BadgeCheck },
  ojt_instructor: { value: "assignment", label: "Assignment", icon: UserCog },
};

const labelClass = "text-xs font-bold uppercase tracking-wider text-gray-700";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

const avatarMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const accountSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  middlename: z.string(),
  lastname: z.string().min(1, "Last name is required"),
  extension: z.string(),
  contact_number: z.string(),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  profile_picture: z.union([z.string(), z.instanceof(File)]).optional(),
});

const locationSchema = z.object({
  region: z.string().min(1, "Select a region"),
  province: z.string().min(1, "Select a province"),
  city_municipality: z.string().min(1, "Select a city or municipality"),
  barangay: z.string().min(1, "Select a barangay"),
});

const internSchema = z.object({
  date_of_birth: z.string().min(1, "Date of birth is required"),
  place_of_birth: z.string().min(1, "Place of birth is required"),
  fathers_name: z.string().min(1, "Father's name is required"),
  fathers_occupation: z.string().min(1, "Father's occupation is required"),
  fathers_contact: z.string().min(1, "Father's contact is required"),
  mothers_name: z.string().min(1, "Mother's name is required"),
  mothers_occupation: z.string().min(1, "Mother's occupation is required"),
  mothers_contact: z.string().min(1, "Mother's contact is required"),
  parents_guardian_address: z.string().min(1, "Parents / guardian address is required"),
  practicum_instructor: z.string().min(1, "Practicum instructor is required"),
});

const hteSchema = z.object({
  name: z.string().min(1, "HTE / company name is required"),
  start_at: z.string(),
  end_at: z.string(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    password: z.string().min(8, "New password must be at least 8 characters"),
    password_confirmation: z.string(),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function homePathFor(role) {
  if (!role) return "/";
  const map = { admin: "admin", ojt_coordinator: "coordinator", ojt_instructor: "instructor" };
  return `/${map[role] || role}`;
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700">
        {value || "—"}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const Layout = layoutByRole[user?.role] || null;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("account");

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingIntern, setSavingIntern] = useState(false);
  const [savingHte, setSavingHte] = useState(false);

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [codes, setCodes] = useState({ region: "", province: "", city: "", barangay: "" });

  const accountForm = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstname: "", middlename: "", lastname: "", extension: "", contact_number: "", email: "", profile_picture: "",
    },
  });

  const locationForm = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { region: "", province: "", city_municipality: "", barangay: "" },
  });

  const internForm = useForm({
    resolver: zodResolver(internSchema),
    defaultValues: {
      date_of_birth: "", place_of_birth: "", fathers_name: "", fathers_occupation: "", fathers_contact: "",
      mothers_name: "", mothers_occupation: "", mothers_contact: "", parents_guardian_address: "", practicum_instructor: "",
    },
  });

  const hteForm = useForm({
    resolver: zodResolver(hteSchema),
    defaultValues: { name: "", start_at: "", end_at: "" },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });

  useEffect(() => {
    let active = true;
    api
      .get("/profile")
      .then((res) => {
        if (!active) return;
        const data = res.data.data;
        setProfile(data);
        accountForm.reset({
          firstname: data.user.firstname || "",
          middlename: data.user.middlename || "",
          lastname: data.user.lastname || "",
          extension: data.user.extension || "",
          contact_number: data.user.contact_number || "",
          email: data.user.email || "",
          profile_picture: "",
        });
        if (data.intern) {
          internForm.reset({
            date_of_birth: data.intern.date_of_birth ? String(data.intern.date_of_birth).slice(0, 10) : "",
            place_of_birth: data.intern.place_of_birth || "",
            fathers_name: data.intern.fathers_name || "",
            fathers_occupation: data.intern.fathers_occupation || "",
            fathers_contact: data.intern.fathers_contact || "",
            mothers_name: data.intern.mothers_name || "",
            mothers_occupation: data.intern.mothers_occupation || "",
            mothers_contact: data.intern.mothers_contact || "",
            parents_guardian_address: data.intern.parents_guardian_address || "",
            practicum_instructor: data.intern.practicum_instructor || "",
          });
        }
        if (data.hte) {
          hteForm.reset({
            name: data.hte.name || "",
            start_at: data.hte.start_at ? String(data.hte.start_at).slice(0, 10) : "",
            end_at: data.hte.end_at ? String(data.hte.end_at).slice(0, 10) : "",
          });
        }
        if (data.location) {
          resolveLocation(data.location);
        }
      })
      .catch((err) => {
        if (active) toast.error("Failed to load profile", { description: firstErrorMessage(err) });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    locationForm.setValue("region", location.region || "");
    if (!regionCode) return;

    setLoadingProvinces(true);
    try {
      const provincesData = await getProvinces(regionCode);
      setProvinces(provincesData);
      const provinceCode = codeOf(provincesData, location.province);
      setCodes((c) => ({ ...c, province: provinceCode }));
      locationForm.setValue("province", location.province || "");
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
      locationForm.setValue("city_municipality", location.city_municipality || "");
      if (!cityCode) return;

      setLoadingBarangays(true);
      const barangaysData = await getBarangays(cityCode);
      setBarangays(barangaysData);
      const barangayCode = codeOf(barangaysData, location.barangay);
      setCodes((c) => ({ ...c, barangay: barangayCode }));
      locationForm.setValue("barangay", location.barangay || "");
    } catch (err) {
      toast.error("Failed to load saved location", { description: err.message });
    } finally {
      setLoadingProvinces(false);
      setLoadingCities(false);
      setLoadingBarangays(false);
    }
  }

  function onRegionChange(code) {
    setCodes((c) => ({ ...c, region: code, province: "", city: "", barangay: "" }));
    locationForm.setValue("region", nameOf(regions, code));
    locationForm.setValue("province", "");
    locationForm.setValue("city_municipality", "");
    locationForm.setValue("barangay", "");
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
    locationForm.setValue("province", nameOf(provinces, code));
    locationForm.setValue("city_municipality", "");
    locationForm.setValue("barangay", "");
    setCities([]);
    setBarangays([]);
    if (!code) return;
    setLoadingCities(true);
    (async () => {
      try {
        setCities(await getCities(code));
      } catch {
        setCities(await getRegionCities(codes.region));
      }
    })()
      .catch((err) => toast.error("Failed to load cities", { description: err.message }))
      .finally(() => setLoadingCities(false));
  }

  function onCityChange(code) {
    setCodes((c) => ({ ...c, city: code, barangay: "" }));
    locationForm.setValue("city_municipality", nameOf(cities, code));
    locationForm.setValue("barangay", "");
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
    locationForm.setValue("barangay", nameOf(barangays, code));
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
    accountForm.setValue("profile_picture", file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function removeAvatar() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    accountForm.setValue("profile_picture", "");
  }

  async function saveAccount() {
    const valid = await accountForm.trigger();
    if (!valid) return;
    setSavingAccount(true);
    try {
      const values = accountForm.getValues();
      const payload = {
        firstname: values.firstname,
        middlename: values.middlename,
        lastname: values.lastname,
        extension: values.extension,
        contact_number: values.contact_number,
        email: profile.user.email,
      };
      const avatarIsFile = values.profile_picture instanceof File;
      const body = avatarIsFile ? new FormData() : payload;
      if (avatarIsFile) {
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) body.append(key, value);
        });
        body.append("profile_picture", values.profile_picture);
        body.append("_method", "PUT");
      }
      const res = avatarIsFile ? await api.post("/profile", body) : await api.put("/profile", body);
      const updatedUser = res.data.data.user;
      setProfile((p) => ({ ...p, user: updatedUser }));
      await refreshUser();
      toast.success("Profile updated");
      if (res.data.data.email_changed) {
        toast.info("Email changed", {
          description: "Verify your new email address to keep logging in — check your inbox for the OTP.",
        });
      }
    } catch (err) {
      toast.error("Failed to update profile", { description: firstErrorMessage(err) });
    } finally {
      setSavingAccount(false);
    }
  }

  async function savePassword() {
    const valid = await passwordForm.trigger();
    if (!valid) return;
    setSavingPassword(true);
    try {
      await api.put("/profile/password", passwordForm.getValues());
      passwordForm.reset({ current_password: "", password: "", password_confirmation: "" });
      toast.success("Password updated");
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors?.current_password?.[0]) {
        passwordForm.setError("current_password", { message: errors.current_password[0] });
      }
      toast.error("Failed to update password", { description: firstErrorMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  }

  async function saveLocation() {
    const valid = await locationForm.trigger();
    if (!valid) return;
    setSavingLocation(true);
    try {
      const values = locationForm.getValues();
      const res = await api.put("/profile/location", {
        region: values.region,
        province: values.province,
        city_municipality: values.city_municipality,
        barangay: values.barangay,
      });
      setProfile((p) => ({ ...p, location: res.data.data.location }));
      toast.success("Address updated");
    } catch (err) {
      toast.error("Failed to update address", { description: firstErrorMessage(err) });
    } finally {
      setSavingLocation(false);
    }
  }

  async function saveIntern() {
    const valid = await internForm.trigger();
    if (!valid) return;
    setSavingIntern(true);
    try {
      const res = await api.put("/profile/intern", internForm.getValues());
      setProfile((p) => ({ ...p, intern: res.data.data.intern }));
      toast.success("Intern details updated");
    } catch (err) {
      toast.error("Failed to update intern details", { description: firstErrorMessage(err) });
    } finally {
      setSavingIntern(false);
    }
  }

  async function saveHte() {
    const valid = await hteForm.trigger();
    if (!valid) return;
    setSavingHte(true);
    try {
      const values = hteForm.getValues();
      const res = await api.put("/profile/hte", {
        name: values.name,
        start_at: values.start_at || null,
        end_at: values.end_at || null,
      });
      setProfile((p) => ({ ...p, hte: res.data.data.hte }));
      toast.success("HTE details updated");
    } catch (err) {
      toast.error("Failed to update HTE details", { description: firstErrorMessage(err) });
    } finally {
      setSavingHte(false);
    }
  }

  const roleTab = user ? roleTabByRole[user.role] : null;
  const placementData = profile
    ? {
        institute: profile.institutes.find((i) => i.id === (profile.intern?.institute_id || profile.hte?.institute_id || profile.coordinator?.institute_id)),
        program: profile.programs.find((p) => p.id === (profile.intern?.program_id || profile.hte?.program_id || profile.coordinator?.program_id)),
        academicYear: profile.academic_terms.find((t) => t.id === profile.intern?.academic_year_id),
      }
    : null;

  if (!Layout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-500 px-4 py-5 sm:px-8 sm:py-6">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <Button
            asChild
            variant="ghost"
            className="h-11 w-11 shrink-0 rounded-xl bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 hover:text-white"
          >
            <Link to={homePathFor(user?.role)} aria-label="Back to dashboard">
              <ArrowLeft size={18} />
            </Link>
          </Button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm sm:h-12 sm:w-12">
            <UserRound size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-bold text-white sm:text-xl">My Profile</h1>
            <p className="mt-0.5 truncate text-xs text-green-100 sm:text-sm">
              Manage your account details and personal information
            </p>
          </div>
        </div>
      </div>

      {loading || !profile ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm ring-1 ring-gray-100">
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="hidden h-10 flex-1 rounded-lg sm:block" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-14 w-14 shrink-0 sm:h-16 sm:w-16">
                {(avatarPreview || profile.user.profile_picture) && (
                  <AvatarImage
                    src={avatarPreview || profile.user.profile_picture}
                    alt="Profile picture"
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-lg font-bold text-white">
                  {getInitials(`${accountForm.watch("firstname") || ""} ${accountForm.watch("lastname") || ""}`)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className="truncate font-heading text-base font-bold text-green-950 sm:text-lg">
                    {profile.user.full_name}
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-green-100">
                    {roleLabels[profile.user.role] || profile.user.role}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">{profile.user.email}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 sm:text-xs">
                  <span className="font-mono">#{profile.user.id}</span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} /> Joined {formatDate(profile.user.created_at)}
                  </span>
                  {profile.user.email_verified_at ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-green-700">
                      <BadgeCheck size={12} /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                      <ShieldAlert size={12} /> Unverified
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label
                  htmlFor="profile-picture-input"
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-green-700 sm:px-4 sm:text-sm"
                >
                  <ImagePlus size={15} />
                  {avatarPreview || profile.user.profile_picture ? "Change" : "Upload photo"}
                </label>
                {(avatarPreview || profile.user.profile_picture) && (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Remove photo"
                    className="h-11 w-11 rounded-xl px-0 text-red-600 hover:bg-red-50"
                    onClick={removeAvatar}
                  >
                    <Trash2 size={15} />
                  </Button>
                )}
                <input
                  id="profile-picture-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <div className="rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm ring-1 ring-gray-100 sm:p-2">
              <TabsList className="h-11! w-full gap-1 bg-gray-100/80">
                <TabsTrigger value="account" className="min-w-0 gap-1 rounded-md px-1 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm">
                  <UserRound size={15} className="hidden shrink-0 sm:block" /> <span className="truncate">Account</span>
                </TabsTrigger>
                <TabsTrigger value="location" className="min-w-0 gap-1 rounded-md px-1 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm">
                  <MapPin size={15} className="hidden shrink-0 sm:block" /> <span className="truncate">Location</span>
                </TabsTrigger>
                {roleTab && (
                  <TabsTrigger value={roleTab.value} className="min-w-0 gap-1 rounded-md px-1 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm">
                    <roleTab.icon size={15} className="hidden shrink-0 sm:block" /> <span className="truncate">{roleTab.label}</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="credentials" className="min-w-0 gap-1 rounded-md px-1 text-xs font-semibold sm:gap-1.5 sm:px-3 sm:text-sm data-active:bg-green-600! data-active:text-white! data-active:shadow-sm">
                  <Lock size={15} className="hidden shrink-0 sm:block" /> <span className="truncate">Credentials</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="account" className="mt-0">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                <div className="mb-3.5 flex items-center gap-2 border-b border-gray-50 pb-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                    <UserRound size={16} />
                  </div>
                  <div>
                    <h2 className="font-heading text-sm font-bold text-green-950">Account Information</h2>
                    <p className="text-xs text-gray-400">Your name and contact details.</p>
                  </div>
                </div>
                <Form {...accountForm}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={accountForm.control}
                      name="firstname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>First name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan" className="h-11 rounded-xl" {...field} />
                          </FormControl>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="middlename"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Middle name</FormLabel>
                          <FormControl>
                            <Input placeholder="Santos" className="h-11 rounded-xl" {...field} />
                          </FormControl>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="lastname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Last name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Dela Cruz" className="h-11 rounded-xl" {...field} />
                          </FormControl>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="extension"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Extension</FormLabel>
                          <FormControl>
                            <Input placeholder="Jr., Sr., III" className="h-11 rounded-xl" {...field} />
                          </FormControl>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="contact_number"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className={labelClass}>Contact number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <Input placeholder="0917 000 0000" className="h-11 rounded-xl pl-10" {...field} />
                            </div>
                          </FormControl>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-2 flex justify-end border-t border-gray-50 pt-4">
                    <Button
                      type="button"
                      onClick={saveAccount}
                      disabled={savingAccount}
                      className="h-11 w-full rounded-xl bg-green-600 px-6 font-semibold text-white hover:bg-green-700 sm:w-auto"
                    >
                      {savingAccount ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Saving…
                        </>
                      ) : (
                        <>Save changes</>
                      )}
                    </Button>
                  </div>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="location" className="mt-0">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                <div className="mb-3.5 flex items-center gap-2 border-b border-gray-50 pb-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h2 className="font-heading text-sm font-bold text-green-950">Address</h2>
                    <p className="text-xs text-gray-400">From the Philippine Standard Geographic Code (PSGC).</p>
                  </div>
                </div>
                <Form {...locationForm}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={locationForm.control}
                      name="region"
                      render={() => (
                        <FormItem>
                          <FormLabel className={labelClass}>Region *</FormLabel>
                          <Select
                            disabled={loadingProvinces && !codes.region}
                            onValueChange={onRegionChange}
                            value={codes.region || undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl">
                                <SelectValue placeholder="Select region" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {regions.map((r) => (
                                <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={locationForm.control}
                      name="province"
                      render={() => (
                        <FormItem>
                          <FormLabel className={labelClass}>Province *</FormLabel>
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
                                <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={locationForm.control}
                      name="city_municipality"
                      render={() => (
                        <FormItem>
                          <FormLabel className={labelClass}>City / Municipality *</FormLabel>
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
                                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={locationForm.control}
                      name="barangay"
                      render={() => (
                        <FormItem>
                          <FormLabel className={labelClass}>Barangay *</FormLabel>
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
                                <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="min-h-[1.25rem]"><FormMessage /></div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-2 flex justify-end border-t border-gray-50 pt-4">
                    <Button
                      type="button"
                      onClick={saveLocation}
                      disabled={savingLocation}
                      className="h-11 w-full rounded-xl bg-green-600 px-6 font-semibold text-white hover:bg-green-700 sm:w-auto"
                    >
                      {savingLocation ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Saving…
                        </>
                      ) : (
                        <>Save address</>
                      )}
                    </Button>
                  </div>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="credentials" className="mt-0">
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                  <div className="mb-3.5 flex items-center gap-2 border-b border-gray-50 pb-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                      <Mail size={15} />
                    </div>
                    <div>
                      <h2 className="font-heading text-sm font-bold text-green-950">Email</h2>
                      <p className="text-xs text-gray-400">Your login email — read only.</p>
                    </div>
                  </div>
                  <ReadOnlyField label="Email address" value={profile.user.email} />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                  <div className="mb-3.5 flex items-center gap-2 border-b border-gray-50 pb-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                      <Lock size={15} />
                    </div>
                    <div>
                      <h2 className="font-heading text-sm font-bold text-green-950">Password</h2>
                      <p className="text-xs text-gray-400">Update the password you use to sign in.</p>
                    </div>
                  </div>
                  <Form {...passwordForm}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={passwordForm.control}
                        name="current_password"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className={labelClass}>Current password *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Your current password" className="h-11 rounded-xl" {...field} />
                            </FormControl>
                            <div className="min-h-[1.25rem]"><FormMessage /></div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>New password *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="At least 8 characters" className="h-11 rounded-xl" {...field} />
                            </FormControl>
                            <div className="min-h-[1.25rem]"><FormMessage /></div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="password_confirmation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Confirm new password *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Repeat new password" className="h-11 rounded-xl" {...field} />
                            </FormControl>
                            <div className="min-h-[1.25rem]"><FormMessage /></div>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-2 flex justify-end border-t border-gray-50 pt-4">
                      <Button
                        type="button"
                        onClick={savePassword}
                        disabled={savingPassword}
                        className="h-11 w-full rounded-xl bg-green-600 px-6 font-semibold text-white hover:bg-green-700 sm:w-auto"
                      >
                        {savingPassword ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Saving…
                          </>
                        ) : (
                          <>Update password</>
                        )}
                      </Button>
                    </div>
                  </Form>
                </div>
              </div>
            </TabsContent>

            {roleTab?.value === "intern" && profile.intern && (
              <TabsContent value="intern" className="mt-0">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                    <div className="mb-3.5 flex items-center gap-2 border-b border-gray-50 pb-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                        <GraduationCap size={16} />
                      </div>
                      <div>
                        <h2 className="font-heading text-sm font-bold text-green-950">Placement</h2>
                        <p className="text-xs text-gray-400">Managed by your OJT coordinator.</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <ReadOnlyField label="Academic year" value={placementData?.academicYear?.description} />
                      <ReadOnlyField label="Institute" value={placementData?.institute?.name} />
                      <ReadOnlyField label="Program" value={placementData?.program?.name} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                    <div className="mb-3.5 flex items-center gap-2 border-b border-gray-50 pb-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                        <UserRound size={16} />
                      </div>
                      <div>
                        <h2 className="font-heading text-sm font-bold text-green-950">Personal Information</h2>
                        <p className="text-xs text-gray-400">Your birth and family details.</p>
                      </div>
                    </div>
                    <Form {...internForm}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={internForm.control}
                          name="date_of_birth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Date of birth *</FormLabel>
                              <FormControl>
                                <Input type="date" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="place_of_birth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Place of birth *</FormLabel>
                              <FormControl>
                                <Input placeholder="City / Municipality" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="fathers_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Father's name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="fathers_occupation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Father's occupation *</FormLabel>
                              <FormControl>
                                <Input placeholder="Occupation" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="fathers_contact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Father's contact *</FormLabel>
                              <FormControl>
                                <Input placeholder="0917 000 0000" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="mothers_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Mother's name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="mothers_occupation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Mother's occupation *</FormLabel>
                              <FormControl>
                                <Input placeholder="Occupation" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="mothers_contact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Mother's contact *</FormLabel>
                              <FormControl>
                                <Input placeholder="0917 000 0000" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="parents_guardian_address"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className={labelClass}>Parents / guardian address *</FormLabel>
                              <FormControl>
                                <Input placeholder="Complete address" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={internForm.control}
                          name="practicum_instructor"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className={labelClass}>Practicum instructor *</FormLabel>
                              <FormControl>
                                <Input placeholder="Instructor name" className="h-11 rounded-xl" {...field} />
                              </FormControl>
                              <div className="min-h-[1.25rem]"><FormMessage /></div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-2 flex justify-end border-t border-gray-50 pt-4">
                        <Button
                          type="button"
                          onClick={saveIntern}
                          disabled={savingIntern}
                          className="h-11 w-full rounded-xl bg-green-600 px-6 font-semibold text-white hover:bg-green-700 sm:w-auto"
                        >
                          {savingIntern ? (
                            <>
                              <Loader2 size={16} className="animate-spin" /> Saving…
                            </>
                          ) : (
                            <>Save intern details</>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </div>
              </TabsContent>
            )}

            {roleTab?.value === "hte" && profile.hte && (
              <TabsContent value="hte" className="mt-0">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                  <div className="mb-3.5 flex items-center gap-2 border-b border-gray-50 pb-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h2 className="font-heading text-sm font-bold text-green-950">Host Training Establishment</h2>
                      <p className="text-xs text-gray-400">The company or office where interns are deployed.</p>
                    </div>
                  </div>
                  <Form {...hteForm}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={hteForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className={labelClass}>HTE / company name *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input placeholder="e.g. Tangub City Hall" className="h-11 rounded-xl pl-10" {...field} />
                              </div>
                            </FormControl>
                            <div className="min-h-[1.25rem]"><FormMessage /></div>
                          </FormItem>
                        )}
                      />
                      <ReadOnlyField label="Institute" value={placementData?.institute?.name} />
                      <ReadOnlyField label="Program" value={placementData?.program?.name} />
                      <FormField
                        control={hteForm.control}
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
                        control={hteForm.control}
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
                    </div>
                    <div className="mt-2 flex justify-end border-t border-gray-50 pt-4">
                      <Button
                        type="button"
                        onClick={saveHte}
                        disabled={savingHte}
                        className="h-11 w-full rounded-xl bg-green-600 px-6 font-semibold text-white hover:bg-green-700 sm:w-auto"
                      >
                        {savingHte ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Saving…
                          </>
                        ) : (
                          <>Save HTE details</>
                        )}
                      </Button>
                    </div>
                  </Form>
                </div>
              </TabsContent>
            )}

            {roleTab?.value === "assignment" && (
              <TabsContent value="assignment" className="mt-0">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                  <div className="mb-3.5 flex items-center gap-2 border-b border-gray-50 pb-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                      <BadgeCheck size={16} />
                    </div>
                    <div>
                      <h2 className="font-heading text-sm font-bold text-green-950">Assignment</h2>
                      <p className="text-xs text-gray-400">Managed by the administrator.</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyField label="Institute" value={placementData?.institute?.name} />
                    <ReadOnlyField label="Program" value={placementData?.program?.name} />
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
      </div>
    </Layout>
  );
}
