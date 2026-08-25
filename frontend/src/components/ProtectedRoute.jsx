import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const homeByRole = {
  admin: "/admin",
  intern: "/intern",
  ojt_instructor: "/instructor",
  ojt_coordinator: "/coordinator",
  hte: "/hte",
};

export default function ProtectedRoute({ children, roles, approvedIntern = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-green-600" />
          <p className="text-sm font-medium text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeByRole[user.role] || "/"} replace />;
  }

  if (approvedIntern && user.role === "intern" && user.registration_status !== "approved") {
    return <Navigate to="/intern" replace />;
  }

  return children;
}
