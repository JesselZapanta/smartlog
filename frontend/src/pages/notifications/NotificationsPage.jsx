import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCheck, Inbox, Loader2 } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import api from "@/lib/api";
import { getEcho } from "@/lib/echo";
import { formatNotificationDate, notificationIcon, notificationStyles, routeFor } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import InternLayout from "@/layouts/InternLayout.jsx";
import InstructorLayout from "@/layouts/InstructorLayout.jsx";
import HteLayout from "@/layouts/HteLayout.jsx";

const layoutByRole = {
  admin: AdminLayout,
  ojt_coordinator: CoordinatorLayout,
  ojt_instructor: InstructorLayout,
  intern: InternLayout,
  hte: HteLayout,
};

function homePathFor(role) {
  if (!role) return "/";
  const map = { admin: "admin", ojt_coordinator: "coordinator", ojt_instructor: "instructor" };
  return `/${map[role] || role}`;
}

function getPageList(current, total) {
  const pages = [];
  const range = 1;
  const add = (page) => {
    if (!pages.includes(page) && page >= 1 && page <= total) pages.push(page);
  };
  add(1);
  for (let i = current - range; i <= current + range; i++) add(i);
  add(total);
  const withEllipsis = [];
  let prev = 0;
  pages.sort((a, b) => a - b).forEach((page) => {
    if (prev && page - prev > 1) withEllipsis.push("…");
    withEllipsis.push(page);
    prev = page;
  });
  return withEllipsis;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const Layout = layoutByRole[user?.role] || null;

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", { params: { per_page: 10, page } });
      setRows(res.data.data);
      setMeta(res.data.meta);
    } catch {
      // The 401 interceptor handles auth failures; stay quiet on network errors.
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(`user.${user.uuid}`);
    channel.listen(".notification.pushed", () => {
      if (page === 1) load();
      else setPage(1);
    });

    return () => {
      channel.stopListening(".notification.pushed");
      echo.leaveChannel(`private-user.${user.uuid}`);
    };
  }, [user, page, load]);

  async function handleClick(notification) {
    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
      } catch {
        // Marking read is best-effort; navigation should still happen.
      }
      setRows((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    }

    const to = routeFor(notification);
    if (to) navigate(to);
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.put("/notifications/read-all");
      setRows((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Best-effort; the next load will resync.
    } finally {
      setMarkingAll(false);
    }
  }

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
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="h-11 w-11 shrink-0 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <Link to={homePathFor(user?.role)} aria-label="Back to dashboard">
              <ArrowLeft size={18} />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-lg font-bold text-green-950 sm:text-xl">Notifications</h1>
            <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">
              {meta ? `${meta.unread_count} unread · ${meta.total} total` : "Your updates and alerts"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold text-green-700 sm:px-4 sm:text-sm"
            onClick={markAllRead}
            disabled={markingAll || (meta?.unread_count ?? 0) === 0}
          >
            {markingAll ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
            <span className="hidden sm:inline">Mark all read</span>
            <span className="sm:hidden">Mark read</span>
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
          {loading ? (
            <PageLoader />
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-gray-400">
              <Inbox size={28} className="text-gray-300" />
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {rows.map((notification) => {
                const Icon = notificationIcon(notification.type);
                const to = routeFor(notification);
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      disabled={!to}
                      onClick={() => handleClick(notification)}
                      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors sm:px-5 ${
                        to ? "cursor-pointer hover:bg-green-50/40" : "cursor-default"
                      }`}
                    >
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${notificationStyles(notification.type)}`}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm ${notification.is_read ? "font-medium text-gray-600" : "font-bold text-green-950"}`}>
                            {notification.title}
                          </span>
                          {!notification.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-green-600" />}
                        </span>
                        <span className="mt-0.5 block text-sm text-gray-500">{notification.message}</span>
                        <span className="mt-1 block text-[11px] font-medium text-gray-400">
                          {formatNotificationDate(notification.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!loading && meta && meta.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">{meta.from ?? 0}</span>–
              <span className="font-semibold text-gray-700">{meta.to ?? 0}</span> of{" "}
              <span className="font-semibold text-gray-700">{meta.total}</span> notifications
            </p>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
                {getPageList(page, meta.last_page).map((item) =>
                  typeof item === "number" ? (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        isActive={item === page}
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(item);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < meta.last_page) setPage(page + 1);
                    }}
                    aria-disabled={page >= meta.last_page}
                    className={page >= meta.last_page ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </Layout>
  );
}
