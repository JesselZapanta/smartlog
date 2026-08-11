import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Send, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { LogoMark } from "@/components/Logo.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import InternDetailsStep from "@/pages/admin/users/InternDetailsStep.jsx";
import {
  getRegions,
  getProvinces,
  getCities,
  getRegionCities,
  getBarangays,
  nameOf,
  codeOf,
} from "@/lib/psgc";

const resubmitSchema = z.object({
  institute_id: z.string().min(1, "Select an institute"),
  program_id: z.string().min(1, "Select a program"),
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
  cor: z.union([z.string(), z.instanceof(File)]).optional(),
  region: z.string().min(1, "Select a region"),
  province: z.string().min(1, "Select a province"),
  city_municipality: z.string().min(1, "Select a city or municipality"),
  barangay: z.string().min(1, "Select a barangay"),
});

const selectClass = "data-[size=default]:h-11 w-full rounded-xl";

export default function ResubmitRegistrationPage() {
  const navigate = useNavigate();
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [institutes, setInstitutes] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingInstitutes, setLoadingInstitutes] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [codes, setCodes] = useState({ region: "", province: "", city: "", barangay: "" });

  const form = useForm({
    resolver: zodResolver(resubmitSchema),
    defaultValues: {
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
      cor: "",
      region: "",
      province: "",
      city_municipality: "",
      barangay: "",
    },
  });

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/my-registration"), api.get("/register/reference-data"), getRegions()])
      .then(([regRes, refRes, regionsData]) => {
        if (!active) return;
        setReg(regRes.data.data);
        setInstitutes(refRes.data.data.institutes || []);
        setPrograms(refRes.data.data.programs || []);
        setRegions(regionsData);
      })
      .catch((err) => {
        if (active) toast.error("Failed to load your registration", { description: firstErrorMessage(err) });
      })
      .finally(() => {
        if (active) {
          setLoadingInstitutes(false);
          setLoadingPrograms(false);
          setLoadingRegions(false);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!reg?.intern || !reg?.location || regions.length === 0) return;

    const { intern, location } = reg;

    form.reset({
      institute_id: intern.institute_id ? String(intern.institute_id) : "",
      program_id: intern.program_id ? String(intern.program_id) : "",
      date_of_birth: intern.date_of_birth ? String(intern.date_of_birth).slice(0, 10) : "",
      place_of_birth: intern.place_of_birth || "",
      fathers_name: intern.fathers_name || "",
      fathers_occupation: intern.fathers_occupation || "",
      fathers_contact: intern.fathers_contact || "",
      mothers_name: intern.mothers_name || "",
      mothers_occupation: intern.mothers_occupation || "",
      mothers_contact: intern.mothers_contact || "",
      parents_guardian_address: intern.parents_guardian_address || "",
      practicum_instructor: intern.practicum_instructor || "",
      region: location.region || "",
      province: location.province || "",
      city_municipality: location.city_municipality || "",
      barangay: location.barangay || "",
    });

    const regionCode = codeOf(regions, location.region);
    if (!regionCode) return;

    (async () => {
      setCodes((c) => ({ ...c, region: regionCode }));
      setLoadingProvinces(true);
      try {
        const provs = await getProvinces(regionCode);
        setProvinces(provs);
        const provinceCode = codeOf(provs, location.province);
        if (!provinceCode) return;
        setCodes((c) => ({ ...c, province: provinceCode }));

        let citiesData = [];
        try {
          citiesData = await getCities(provinceCode);
        } catch {
          citiesData = await getRegionCities(regionCode);
        }
        setCities(citiesData);
        const cityCode = codeOf(citiesData, location.city_municipality);
        if (!cityCode) return;
        setCodes((c) => ({ ...c, city: cityCode }));

        setLoadingBarangays(true);
        const brgs = await getBarangays(cityCode);
        setBarangays(brgs);
        const brgCode = codeOf(brgs, location.barangay);
        if (brgCode) setCodes((c) => ({ ...c, barangay: brgCode }));
      } catch (err) {
        toast.error("Failed to prefill your location", { description: err.message });
      } finally {
        setLoadingProvinces(false);
        setLoadingBarangays(false);
      }
    })();
  }, [reg, regions, form]);

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

  function handleCorChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Invalid file", { description: "Only PDF files are allowed." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", { description: "COR must be 10 MB or smaller." });
      return;
    }
    form.setValue("cor", file);
  }

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const payload = {
        institute_id: Number(values.institute_id),
        program_id: Number(values.program_id),
        date_of_birth: values.date_of_birth,
        place_of_birth: values.place_of_birth,
        fathers_name: values.fathers_name,
        fathers_occupation: values.fathers_occupation,
        fathers_contact: values.fathers_contact,
        mothers_name: values.mothers_name,
        mothers_occupation: values.mothers_occupation,
        mothers_contact: values.mothers_contact,
        parents_guardian_address: values.parents_guardian_address,
        practicum_instructor: values.practicum_instructor,
        region: values.region,
        province: values.province,
        city_municipality: values.city_municipality,
        barangay: values.barangay,
      };

      const corIsFile = values.cor instanceof File;
      let body = payload;
      if (corIsFile) {
        body = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) body.append(key, value);
        });
        body.append("cor", values.cor);
      }

      await api.post("/my-registration/resubmit", body);
      toast.success("Registration resubmitted", {
        description: "Your OJT coordinator will review it again.",
      });
      navigate("/intern");
    } catch (err) {
      toast.error("Resubmission failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && reg && reg.intern?.status !== "rejected") {
    return <Navigate to="/intern" replace />;
  }

  const selectedCorName = form.watch("cor") instanceof File ? form.watch("cor").name : null;
  const existingCorName = reg?.intern?.cor ? reg.intern.cor.split("/").pop() : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/intern" className="flex items-center gap-2 no-underline">
            <LogoMark size={32} />
            <div>
              <div className="font-heading text-sm font-bold leading-tight text-green-900">SMARTLOG</div>
              <div className="font-mono text-[11px] font-medium text-green-700/75">RESUBMIT REGISTRATION</div>
            </div>
          </Link>
          <Button asChild variant="ghost" className="h-11 gap-2 rounded-xl text-sm font-semibold text-gray-600">
            <Link to="/intern">
              <ArrowLeft size={16} /> Back to dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-3 pb-10 pt-4 sm:px-4 sm:pt-6">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-4 sm:p-5">
          <h1 className="font-heading text-lg font-bold text-red-900">Fix and resubmit your registration</h1>
          <p className="mt-1 text-sm text-red-700">
            Update the details below and resubmit. Your OJT coordinator will review your registration again.
          </p>
          {reg?.intern?.rejection_reason && (
            <div className="mt-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-red-100">
              <p className="text-xs font-bold uppercase tracking-wide text-red-500">Reason for rejection</p>
              <p className="mt-1 text-sm text-gray-800">{reg.intern.rejection_reason}</p>
            </div>
          )}
        </section>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-green-600" />
          </div>
        ) : (
          <Card className="rounded-3xl border-gray-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                        Certificate of Registration (COR)
                      </p>
                      <p className="mt-0.5 min-w-0 text-xs text-gray-400">
                        {selectedCorName
                          ? `Will replace with: ${selectedCorName}`
                          : existingCorName
                            ? `Current file: ${existingCorName}`
                            : "Upload your COR for this semester as a PDF. Max 10 MB."}
                      </p>
                    </div>
                    <label
                      htmlFor="resubmit-cor-input"
                      className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                    >
                      <FileText size={16} />
                      {selectedCorName ? "Change file" : existingCorName ? "Replace COR" : "Upload COR"}
                    </label>
                    <input
                      id="resubmit-cor-input"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleCorChange}
                    />
                  </div>

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
                                <SelectTrigger className={selectClass}>
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
                                <SelectTrigger className={selectClass}>
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
                                <SelectTrigger className={selectClass}>
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
                                <SelectTrigger className={selectClass}>
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

                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 gap-2 rounded-xl font-semibold text-gray-600"
                      onClick={() => form.reset()}
                      disabled={submitting}
                    >
                      <RotateCcw size={16} /> Reset
                    </Button>
                    <Button type="submit" className="h-11 gap-2 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Resubmitting…
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Resubmit Registration
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
