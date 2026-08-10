import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function NotificationBell({ count = 3 }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Notifications"
      className="relative h-11 w-11 rounded-full text-gray-500 hover:bg-gray-50 hover:text-gray-700"
      onClick={() => toast.info("No new notifications", { description: "Notifications page coming soon." })}
    >
      <Bell size={20} />
      {count > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </Button>
  );
}
