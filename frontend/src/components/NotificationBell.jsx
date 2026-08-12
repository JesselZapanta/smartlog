import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { notificationIcon, notificationStyles, routeFor, timeAgo } from "@/lib/notifications";

export default function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/notifications", { params: { per_page: 5 } });
      setItems(res.data.data);
      setUnreadCount(res.data.meta.unread_count);
    } catch {
      // The 401 interceptor handles auth failures; stay quiet on network errors.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleOpen(open) {
    if (open) load();
  }

  async function handleClick(notification) {
    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
      } catch {
        // Marking read is best-effort; navigation should still happen.
      }
      setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
    }

    const to = routeFor(notification);
    if (to) navigate(to);
  }

  async function markAllRead() {
    setMarking(true);
    try {
      await api.put("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Best-effort; the next load will resync.
    } finally {
      setMarking(false);
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative h-11 w-11 rounded-full text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2.5rem)] p-0">
        <div className="flex items-center justify-between px-3 pb-1 pt-3">
          <DropdownMenuLabel className="p-0 font-heading text-sm font-bold text-green-950">Notifications</DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1 rounded-lg px-2 text-xs font-semibold text-green-700 hover:bg-green-50"
            onClick={markAllRead}
            disabled={marking || unreadCount === 0}
          >
            {marking ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator className="my-1" />

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400">
            <Inbox size={24} className="text-gray-300" />
            No notifications yet
          </div>
        ) : (
          items.map((notification) => {
            const Icon = notificationIcon(notification.type);
            const to = routeFor(notification);
            return (
              <DropdownMenuItem
                key={notification.id}
                className="cursor-pointer items-start gap-2.5 px-3 py-2.5"
                onClick={() => handleClick(notification)}
                disabled={!to}
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${notificationStyles(notification.type)}`}>
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${notification.is_read ? "font-medium text-gray-600" : "font-bold text-green-950"}`}>
                      {notification.title}
                    </span>
                    {!notification.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-green-600" />}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-gray-500">{notification.message}</span>
                  <span className="mt-1 block text-[11px] text-gray-400">{timeAgo(notification.created_at)}</span>
                </span>
              </DropdownMenuItem>
            );
          })
        )}

        {!loading && items.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer justify-center gap-2 py-3 text-sm font-semibold text-green-700 hover:bg-green-50"
              onClick={() => navigate("/notifications")}
            >
              <Bell size={15} /> View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
