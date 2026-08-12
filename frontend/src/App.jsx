import { Route, Routes } from "react-router-dom";
import Landing from "@/pages/Landing.jsx";
import Login from "@/pages/Login.jsx";
import RegisterPage from "@/pages/RegisterPage.jsx";
import VerifyEmailPage from "@/pages/VerifyEmailPage.jsx";
import AdminDashboard from "@/pages/admin/AdminDashboard.jsx";
import InternDashboard from "@/pages/intern/InternDashboard.jsx";
import ResubmitRegistrationPage from "@/pages/intern/ResubmitRegistrationPage.jsx";
import CoordinatorDashboard from "@/pages/ojt_coordinator/CoordinatorDashboard.jsx";
import RegistrationApprovalsListPage from "@/pages/ojt_coordinator/registrations/RegistrationApprovalsListPage.jsx";
import RegistrationApprovalDetailPage from "@/pages/ojt_coordinator/registrations/RegistrationApprovalDetailPage.jsx";
import CoordinatorInternListPage from "@/pages/ojt_coordinator/interns/CoordinatorInternListPage.jsx";
import CoordinatorInternDetailPage from "@/pages/ojt_coordinator/interns/CoordinatorInternDetailPage.jsx";
import InstructorDashboard from "@/pages/ojt_instructor/InstructorDashboard.jsx";
import HteDashboard from "@/pages/hte/HteDashboard.jsx";
import ProfilePage from "@/pages/profile/ProfilePage.jsx";
import NotificationsPage from "@/pages/notifications/NotificationsPage.jsx";
import UserListPage from "@/pages/admin/users/UserListPage.jsx";
import UserFormPage from "@/pages/admin/users/UserFormPage.jsx";
import InternListPage from "@/pages/admin/interns/InternListPage.jsx";
import InternDetailPage from "@/pages/admin/interns/InternDetailPage.jsx";
import AcademicTermListPage from "@/pages/admin/academic-terms/AcademicTermListPage.jsx";
import InstituteListPage from "@/pages/admin/institutes/InstituteListPage.jsx";
import ProgramListPage from "@/pages/admin/programs/ProgramListPage.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern"
        element={
          <ProtectedRoute roles={["intern"]}>
            <InternDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern/resubmit"
        element={
          <ProtectedRoute roles={["intern"]}>
            <ResubmitRegistrationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/registrations"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <RegistrationApprovalsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/registrations/:uuid"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <RegistrationApprovalDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/interns"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorInternListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/interns/:uuid"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorInternDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["admin"]}>
            <UserListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <ProtectedRoute roles={["admin"]}>
            <UserFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:id/edit"
        element={
          <ProtectedRoute roles={["admin"]}>
            <UserFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interns"
        element={
          <ProtectedRoute roles={["admin"]}>
            <InternListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/interns/:uuid"
        element={
          <ProtectedRoute roles={["admin"]}>
            <InternDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/academic-years"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AcademicTermListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/institutes"
        element={
          <ProtectedRoute roles={["admin"]}>
            <InstituteListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/programs"
        element={
          <ProtectedRoute roles={["admin"]}>
            <ProgramListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute roles={["admin", "intern", "ojt_coordinator", "ojt_instructor", "hte"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute roles={["admin", "intern", "ojt_coordinator", "ojt_instructor", "hte"]}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;