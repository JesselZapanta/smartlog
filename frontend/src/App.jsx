import { Route, Routes } from "react-router-dom";
import Landing from "@/pages/Landing.jsx";
import Login from "@/pages/Login.jsx";
import RegisterPage from "@/pages/RegisterPage.jsx";
import VerifyEmailPage from "@/pages/VerifyEmailPage.jsx";
import AdminDashboard from "@/pages/admin/AdminDashboard.jsx";
import InternDashboard from "@/pages/intern/InternDashboard.jsx";
import ResubmitRegistrationPage from "@/pages/intern/ResubmitRegistrationPage.jsx";
import InternRequirementsPage from "@/pages/intern/requirements/InternRequirementsPage.jsx";
import InternPhotoDtrPage from "@/pages/intern/photo-dtr/InternPhotoDtrPage.jsx";
import InternDtrLogsPage from "@/pages/intern/dtr-logs/InternDtrLogsPage.jsx";
import InternDtrPrintPage from "@/pages/intern/dtr-logs/InternDtrPrintPage.jsx";
import JournalCalendarPage from "@/pages/intern/journals/JournalCalendarPage.jsx";
import JournalFormPage from "@/pages/intern/journals/JournalFormPage.jsx";
import CoordinatorDashboard from "@/pages/ojt_coordinator/CoordinatorDashboard.jsx";
import RegistrationApprovalsListPage from "@/pages/ojt_coordinator/registrations/RegistrationApprovalsListPage.jsx";
import RegistrationApprovalDetailPage from "@/pages/ojt_coordinator/registrations/RegistrationApprovalDetailPage.jsx";
import CoordinatorInternListPage from "@/pages/ojt_coordinator/interns/CoordinatorInternListPage.jsx";
import CoordinatorInternDetailPage from "@/pages/ojt_coordinator/interns/CoordinatorInternDetailPage.jsx";
import CoordinatorHteListPage from "@/pages/ojt_coordinator/htes/CoordinatorHteListPage.jsx";
import CoordinatorHteFormPage from "@/pages/ojt_coordinator/htes/CoordinatorHteFormPage.jsx";
import CoordinatorHteAssignmentsPage from "@/pages/ojt_coordinator/hte-assignments/CoordinatorHteAssignmentsPage.jsx";
import AssignInternsPage from "@/pages/ojt_coordinator/hte-assignments/AssignInternsPage.jsx";
import CoordinatorRequirementListPage from "@/pages/ojt_coordinator/requirements/CoordinatorRequirementListPage.jsx";
import CoordinatorInternRequirementsPage from "@/pages/ojt_coordinator/requirements/CoordinatorInternRequirementsPage.jsx";
import CoordinatorInternRequirementsDetailPage from "@/pages/ojt_coordinator/requirements/CoordinatorInternRequirementsDetailPage.jsx";
import InstructorDashboard from "@/pages/ojt_instructor/InstructorDashboard.jsx";
import HteDashboard from "@/pages/hte/HteDashboard.jsx";
import HteAssignedInternsPage from "@/pages/hte/interns/HteAssignedInternsPage.jsx";
import HteAssignedInternDetailPage from "@/pages/hte/interns/HteAssignedInternDetailPage.jsx";
import HteInternRecordsPage from "@/pages/hte/records/HteInternRecordsPage.jsx";
import HteInternRecordsDetailPage from "@/pages/hte/records/HteInternRecordsDetailPage.jsx";
import HteInternRecordsDayPage from "@/pages/hte/records/HteInternRecordsDayPage.jsx";
import ProfilePage from "@/pages/profile/ProfilePage.jsx";
import NotificationsPage from "@/pages/notifications/NotificationsPage.jsx";
import UserListPage from "@/pages/admin/users/UserListPage.jsx";
import UserFormPage from "@/pages/admin/users/UserFormPage.jsx";
import InternListPage from "@/pages/admin/interns/InternListPage.jsx";
import InternDetailPage from "@/pages/admin/interns/InternDetailPage.jsx";
import HteListPage from "@/pages/admin/htes/HteListPage.jsx";
import HteDetailPage from "@/pages/admin/htes/HteDetailPage.jsx";
import AcademicTermListPage from "@/pages/admin/academic-terms/AcademicTermListPage.jsx";
import InstituteListPage from "@/pages/admin/institutes/InstituteListPage.jsx";
import ProgramListPage from "@/pages/admin/programs/ProgramListPage.jsx";
import RequirementListPage from "@/pages/admin/requirements/RequirementListPage.jsx";
import OjtHourListPage from "@/pages/admin/ojt-hours/OjtHourListPage.jsx";
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
        path="/intern/requirements"
        element={
          <ProtectedRoute roles={["intern"]} approvedIntern>
            <InternRequirementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern/photo-dtr"
        element={
          <ProtectedRoute roles={["intern"]} approvedIntern>
            <InternPhotoDtrPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern/dtr-logs"
        element={
          <ProtectedRoute roles={["intern"]} approvedIntern>
            <InternDtrLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern/dtr-logs/print"
        element={
          <ProtectedRoute roles={["intern"]} approvedIntern>
            <InternDtrPrintPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern/journals"
        element={
          <ProtectedRoute roles={["intern"]} approvedIntern>
            <JournalCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern/journals/:date"
        element={
          <ProtectedRoute roles={["intern"]} approvedIntern>
            <JournalFormPage />
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
        path="/coordinator/htes"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorHteListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/htes/new"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorHteFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/htes/:uuid/edit"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorHteFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/hte-assignments"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorHteAssignmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/hte-assignments/:uuid/assign"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <AssignInternsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/requirements"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorRequirementListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/intern-requirements"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorInternRequirementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/intern-requirements/:uuid"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorInternRequirementsDetailPage />
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
        path="/hte/interns"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteAssignedInternsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/interns/:uuid"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteAssignedInternDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/records"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteInternRecordsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/records/:uuid"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteInternRecordsDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/records/:uuid/:date"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteInternRecordsDayPage />
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
        path="/admin/htes"
        element={
          <ProtectedRoute roles={["admin"]}>
            <HteListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/htes/:uuid"
        element={
          <ProtectedRoute roles={["admin"]}>
            <HteDetailPage />
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
        path="/admin/requirements"
        element={
          <ProtectedRoute roles={["admin"]}>
            <RequirementListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ojt-hours"
        element={
          <ProtectedRoute roles={["admin"]}>
            <OjtHourListPage />
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