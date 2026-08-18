import { Loader2 } from "lucide-react";

export default function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 size={28} className="animate-spin text-green-600" />
    </div>
  );
}
