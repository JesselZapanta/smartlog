import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { homeByRole } from "@/components/ProtectedRoute.jsx";

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

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

  if (user) {
    return <Navigate to={homeByRole[user.role] || "/"} replace />;
  }

  return children;
}
