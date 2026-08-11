import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusChip from "@/components/StatusChip";

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function InternsTable({ rows = [] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-400">No interns yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
            <th className="pb-3 pr-4 font-semibold">Intern</th>
            <th className="pb-3 pr-4 font-semibold">Program</th>
            <th className="pb-3 pr-4 font-semibold">Status</th>
            <th className="pb-3 text-right font-semibold">Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((intern) => (
            <tr key={intern.uuid} className="border-b border-gray-50 last:border-0">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {intern.profile_picture && <AvatarImage src={intern.profile_picture} alt={intern.full_name} />}
                    <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                      {getInitials(intern.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-green-900">{intern.full_name}</p>
                    <p className="truncate text-xs text-gray-400">{intern.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4 text-gray-600">{intern.program || "—"}</td>
              <td className="py-3 pr-4">
                <StatusChip status={intern.email_verified_at ? "verified" : "pending"} />
              </td>
              <td className="py-3 text-right">
                <span className="rounded bg-green-100 px-2 py-0.5 font-mono text-xs font-semibold text-green-800">
                  {intern.created_at ? new Date(intern.created_at).toLocaleDateString("en-US") : "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
