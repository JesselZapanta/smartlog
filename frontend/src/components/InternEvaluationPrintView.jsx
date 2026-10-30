import { useMemo } from "react";
import { categorySections, ratingLabels } from "@/pages/hte/evaluations/constants.js";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionTitle({ children }) {
  return <h2 className="mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-700">{children}</h2>;
}

function ratingText(response) {
  if (!response) return "—";
  if (response.is_na) return "N/A";
  const label = ratingLabels[String(response.rating)];
  return label ? `${response.rating} – ${label}` : String(response.rating);
}

function SummaryTiles({ summary }) {
  const categories = summary?.categories ?? {};
  return (
    <div className="grid grid-cols-3 gap-2">
      {categorySections.map((section) => {
        const avg = categories[section.key];
        const weight = section.key === "job_knowledge" ? "40%" : "30%";
        return (
          <div key={section.key} className="rounded border border-gray-200 p-3 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
              {section.title} · {weight}
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-gray-900">
              {avg != null ? Number(avg).toFixed(2) : "—"} <span className="text-xs font-normal text-gray-400">/ 5.00</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

function WeightedLine({ value }) {
  if (value == null) return null;
  return (
    <div className="mt-2 flex items-center justify-between rounded-lg bg-green-600 px-3 py-2 text-white">
      <span className="text-[11px] font-semibold">Weighted Average (30% + 30% + 40%)</span>
      <span className="font-heading text-sm font-bold">{Number(value).toFixed(2)} / 5.00</span>
    </div>
  );
}

export default function InternEvaluationPrintView({ data, preparedName, roleLabel }) {
  const placements = data?.placements ?? [];
  const multi = placements.length > 1;

  const grouped = useMemo(() => {
    const byCategory = new Map(categorySections.map((s) => [s.key, []]));
    (data?.criteria ?? []).forEach((c) => byCategory.get(c.category)?.push(c));
    return categorySections.map((s) => ({ ...s, items: byCategory.get(s.key) ?? [] })).filter((s) => s.items.length > 0);
  }, [data]);

  if (!data) {
    return null;
  }

  const yearLabel = data.intern?.academic_year || "—";
  const generatedAt = new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const instituteName = data.intern?.institute || placements[0]?.hte?.institute || "—";

  return (
    <div className="mx-auto max-w-[8.5in] bg-white p-6 print:max-w-none print:p-0">
      <div className="mb-6 border-b border-gray-200 pb-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-widest text-green-700">Tangub City Global College</p>
        <h1 className="mt-1 font-heading text-lg font-bold text-gray-900">Intern Evaluation Report</h1>
        <p className="text-[10px] text-gray-500">SMARTLOG OJT Monitoring System · {instituteName}</p>
        <p className="mt-2 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-[10px] font-semibold text-green-700 ring-1 ring-green-100">AY: {yearLabel}</p>
        <p className="mt-1 text-[9px] text-gray-400">Generated: {generatedAt}</p>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-gray-200 p-4">
          <h2 className="font-heading text-sm font-bold text-gray-900">{data.intern.full_name}</h2>
          <p className="text-xs text-gray-500">
            {data.intern.email} · {data.intern.program || "—"} · {data.intern.institute || "—"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold capitalize text-gray-600 ring-1 ring-gray-200">{data.intern.status}</span>
            {data.intern.ojt_status && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 font-semibold capitalize text-green-700 ring-1 ring-green-100">
                {data.intern.ojt_status.replace(/-/g, " ")}
              </span>
            )}
          </div>
        </div>

        {!multi && placements[0]?.hte && (
          <div className="rounded-xl border border-green-100 bg-green-50/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Host Training Establishment</p>
            <p className="font-heading text-sm font-bold text-green-950">{placements[0].hte.name}</p>
            <p className="text-xs text-gray-600">{placements[0].hte.institute || "—"} · {placements[0].hte.program || "—"}</p>
          </div>
        )}

        {multi && (
          <div>
            <SectionTitle>HTE Placements ({placements.length})</SectionTitle>
            <div className="space-y-2">
              {placements.map((placement, index) => (
                <div
                  key={placement.id ?? index}
                  className="break-inside-avoid rounded-xl border border-green-100 bg-green-50/40 p-3"
                  style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-sm font-bold text-green-950">
                      {index + 1}. {placement.hte?.name ?? "—"}
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-green-700 ring-1 ring-green-200">
                      {placement.is_current ? "Current" : "Previous"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{placement.hte?.institute || "—"} · {placement.hte?.program || "—"}</p>
                  <p className="mt-1 text-[10px] text-gray-500">
                    Assigned: {formatDate(placement.assigned_at)} · Deployed: {placement.deployed_at ? formatDate(placement.deployed_at) : "—"} ·{" "}
                    {placement.is_current ? "Current host" : `Unassigned: ${formatDate(placement.unassigned_at)}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionTitle>Evaluation Summary</SectionTitle>
          {!multi ? (
            <>
              <SummaryTiles summary={placements[0]?.summary} />
              <WeightedLine value={placements[0]?.summary?.weighted_average} />
            </>
          ) : (
            <div className="space-y-3">
              {placements.map((placement, index) => (
                <div
                  key={placement.id ?? index}
                  className="break-inside-avoid rounded-xl border border-gray-200 p-3"
                  style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-heading text-xs font-bold text-gray-900">
                      {index + 1}. {placement.hte?.name ?? "—"}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {placement.summary?.answered ?? 0} of {placement.summary?.total ?? 0} answered
                    </p>
                  </div>
                  <SummaryTiles summary={placement.summary} />
                  <WeightedLine value={placement.summary?.weighted_average} />
                </div>
              ))}
              {data.blended_average != null && (
                <div className="flex items-center justify-between rounded-lg bg-green-700 px-3 py-2.5 text-white">
                  <span className="text-[11px] font-semibold">
                    Blended Final Average (equal weight across {data.blended_placements} placement
                    {data.blended_placements === 1 ? "" : "s"})
                  </span>
                  <span className="font-heading text-base font-bold">{Number(data.blended_average).toFixed(2)} / 5.00</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {grouped.map((section) => (
            <div key={section.key} className="break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <h3 className="font-heading text-sm font-bold text-gray-900">{section.title}</h3>
              <p className="text-xs text-gray-500">{section.description}</p>
              <table className="mt-2 w-full border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">#</th>
                    <th className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-600">Indicator</th>
                    {placements.map((placement, index) => (
                      <th
                        key={placement.id ?? index}
                        className="max-w-[1.7in] px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-gray-600"
                      >
                        <span className="block truncate">{multi ? placement.hte?.name ?? `HTE ${index + 1}` : "Rating"}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((c, idx) => (
                    <tr key={c.id} className="border-b border-gray-100">
                      <td className="px-2 py-1.5 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-1.5 leading-snug text-gray-800">{c.indicator}</td>
                      {placements.map((placement, pIdx) => (
                        <td key={placement.id ?? pIdx} className="px-2 py-1.5 text-center font-semibold text-gray-900">
                          {ratingText(placement.responses?.[c.id])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div className="w-[42%] text-[9px] sm:w-[36%] sm:text-xs" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
            <p className="text-gray-600">Prepared by:</p>
            <div className="mt-8 border-b border-gray-800 sm:mt-12" />
            <p className="mt-1.5 text-center font-heading text-[10px] font-bold uppercase tracking-wide text-gray-900 sm:text-xs">{preparedName}</p>
            <p className="text-center text-[9px] text-gray-500 sm:text-[10px]">{roleLabel}</p>
          </div>
        </div>

        <p className="mt-6 border-t border-gray-200 pt-3 text-center text-[7px] uppercase tracking-widest text-gray-400">
          SMARTLOG OJT Monitoring System · Tangub City Global College · Confidential
        </p>
      </div>
    </div>
  );
}
