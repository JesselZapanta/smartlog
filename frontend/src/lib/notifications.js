import { Bell, Building2, CheckCircle2, RefreshCw, Rocket, XCircle, FileText } from "lucide-react";

export function routeFor(notification) {
  switch (notification.type) {
    case "registration_approved":
      return "/intern";
    case "registration_rejected":
      return "/intern/resubmit";
    case "registration_submitted":
    case "registration_resubmitted":
      return `/coordinator/registrations/${notification.data?.uuid || ""}`;
    case "hte_assigned":
    case "intern_deployed":
      return "/intern/requirements";
    case "requirement_approved":
    case "requirement_rejected":
      return "/intern/requirements";
    case "requirement_submitted":
      return `/coordinator/intern-requirements/${notification.data?.uuid || ""}`;
    default:
      return null;
  }
}

export function notificationIcon(type) {
  switch (type) {
    case "registration_approved":
      return CheckCircle2;
    case "registration_rejected":
      return XCircle;
    case "registration_submitted":
    case "registration_resubmitted":
      return RefreshCw;
    case "hte_assigned":
      return Building2;
    case "intern_deployed":
      return Rocket;
    case "requirement_approved":
      return CheckCircle2;
    case "requirement_rejected":
      return XCircle;
    case "requirement_submitted":
      return FileText;
    default:
      return Bell;
  }
}

export function notificationStyles(type) {
  switch (type) {
    case "registration_approved":
      return "bg-green-50 text-green-700";
    case "registration_rejected":
      return "bg-red-50 text-red-600";
    case "registration_submitted":
      return "bg-sky-50 text-sky-600";
    case "registration_resubmitted":
      return "bg-amber-50 text-amber-600";
    case "hte_assigned":
      return "bg-green-50 text-green-700";
    case "intern_deployed":
      return "bg-green-50 text-green-700";
    case "requirement_approved":
      return "bg-green-50 text-green-700";
    case "requirement_rejected":
      return "bg-red-50 text-red-600";
    case "requirement_submitted":
      return "bg-sky-50 text-sky-600";
    default:
      return "bg-gray-50 text-gray-500";
  }
}

export function timeAgo(value) {
  if (!value) return "";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatNotificationDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
