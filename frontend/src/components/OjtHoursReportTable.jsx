/**
 * Per-intern OJT hours, rendered on the report screens.
 *
 * OJT hours are declared by the intern on their OJT enrollment application for the term
 * they are serving, so each row is one intern's requirement for one term. A row whose
 * `required_hours` is null means that intern has not applied for OJT enrollment for that
 * term yet — shown as an em dash rather than as zero.
 */
export default function OjtHoursReportTable({ rows = [], compact = false }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-gray-400">No OJT enrollments recorded</p>;
  }

  const requiredOf = (row) => (row.required_hours != null ? row.required_hours : null);

  if (compact) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.slice(0, 6).map((row) => {
          const required = requiredOf(row);

          return (
            <div
              key={`${row.intern_id}-${row.academic_year_id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <span className="min-w-0 text-sm font-medium text-gray-700">
                <span className="block break-words">{row.student}</span>
                <span className="block break-words text-xs text-gray-400">{row.academic_year}</span>
              </span>
              <span className="shrink-0 font-heading text-sm font-bold text-green-700">
                {required != null ? `${required} hrs required` : "Not declared"}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => {
        const required = requiredOf(row);

        return (
          <div
            key={`${row.intern_id}-${row.academic_year_id}`}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="break-words text-xs font-semibold uppercase tracking-wider text-gray-500">
              {row.student}
            </p>
            <p className="mt-0.5 break-words text-xs text-gray-400">{row.academic_year}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-gray-900">
              {required != null ? (
                <>
                  {required} <span className="text-sm font-medium text-gray-500">hrs</span>
                </>
              ) : (
                <span className="text-lg text-gray-400">Not declared</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {row.earned_hours ?? 0} hrs rendered
            </p>
          </div>
        );
      })}
    </div>
  );
}