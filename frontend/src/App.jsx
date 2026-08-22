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
import InternEvaluateHtePage from "@/pages/intern/evaluations/InternEvaluateHtePage.jsx";
import InternIssuesListPage from "@/pages/intern/issues/InternIssuesListPage.jsx";
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
import EvaluationListPage from "@/pages/ojt_coordinator/evaluations/EvaluationListPage.jsx";
import CoordinatorInternEvaluationListPage from "@/pages/ojt_coordinator/evaluations/CoordinatorInternEvaluationListPage.jsx";
import CoordinatorInternEvaluationDetailPage from "@/pages/ojt_coordinator/evaluations/CoordinatorInternEvaluationDetailPage.jsx";
import CoordinatorHteEvaluationListPage from "@/pages/ojt_coordinator/evaluations/CoordinatorHteEvaluationListPage.jsx";
import CoordinatorHteInternListPage from "@/pages/ojt_coordinator/evaluations/CoordinatorHteInternListPage.jsx";
import CoordinatorHteEvaluationDetailPage from "@/pages/ojt_coordinator/evaluations/CoordinatorHteEvaluationDetailPage.jsx";
import CoordinatorIssuesListPage from "@/pages/ojt_coordinator/issues/CoordinatorIssuesListPage.jsx";
import CoordinatorIssueFormPage from "@/pages/ojt_coordinator/issues/CoordinatorIssueFormPage.jsx";
import InstructorDashboard from "@/pages/ojt_instructor/InstructorDashboard.jsx";
import InstructorDeployedInternsPage from "@/pages/ojt_instructor/interns/InstructorDeployedInternsPage.jsx";
import InstructorInternDetailPage from "@/pages/ojt_instructor/interns/InstructorInternDetailPage.jsx";
import InstructorInternMonitoringPage from "@/pages/ojt_instructor/monitoring/InstructorInternMonitoringPage.jsx";
import InstructorInternMonitoringCalendarPage from "@/pages/ojt_instructor/monitoring/InstructorInternMonitoringCalendarPage.jsx";
import InstructorInternMonitoringDayPage from "@/pages/ojt_instructor/monitoring/InstructorInternMonitoringDayPage.jsx";
import InstructorInternDtrLogsPage from "@/pages/ojt_instructor/monitoring/InstructorInternDtrLogsPage.jsx";
import InstructorInternDtrPrintPage from "@/pages/ojt_instructor/monitoring/InstructorInternDtrPrintPage.jsx";
import InstructorInternEvaluationListPage from "@/pages/ojt_instructor/evaluations/InstructorInternEvaluationListPage.jsx";
import InstructorInternEvaluationDetailPage from "@/pages/ojt_instructor/evaluations/InstructorInternEvaluationDetailPage.jsx";
import HteDashboard from "@/pages/hte/HteDashboard.jsx";
import HteAssignedInternsPage from "@/pages/hte/interns/HteAssignedInternsPage.jsx";
import HteAssignedInternDetailPage from "@/pages/hte/interns/HteAssignedInternDetailPage.jsx";
import HteInternMonitoringPage from "@/pages/hte/monitoring/HteInternMonitoringPage.jsx";
import HteInternMonitoringCalendarPage from "@/pages/hte/monitoring/HteInternMonitoringCalendarPage.jsx";
import HteInternMonitoringDayPage from "@/pages/hte/monitoring/HteInternMonitoringDayPage.jsx";
import HteEvaluateInternListPage from "@/pages/hte/evaluations/HteEvaluateInternListPage.jsx";
import HteEvaluateInternFormPage from "@/pages/hte/evaluations/HteEvaluateInternFormPage.jsx";
import HteIssuesListPage from "@/pages/hte/issues/HteIssuesListPage.jsx";
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
import DocumentsPage from "@/pages/admin/documents/DocumentsPage.jsx";
import AdminReportPage from "@/pages/admin/ReportPage.jsx";
import CoordinatorReportPage from "@/pages/ojt_coordinator/ReportPage.jsx";
import InstructorReportPage from "@/pages/ojt_instructor/ReportPage.jsx";
import InternReportPage from "@/pages/intern/ReportPage.jsx";
import HteReportPage from "@/pages/hte/ReportPage.jsx";
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
        path="/intern/evaluations"
        element={
          <ProtectedRoute roles={["intern"]} approvedIntern>
            <InternEvaluateHtePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern/issues"
        element={
          <ProtectedRoute roles={["intern"]} approvedIntern>
            <InternIssuesListPage />
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
        path="/coordinator/evaluations"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <EvaluationListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/intern-evaluations"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorInternEvaluationListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/intern-evaluations/:uuid"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorInternEvaluationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/hte-evaluations"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorHteEvaluationListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/hte-evaluations/:hteUuid"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorHteInternListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/hte-evaluations/:hteUuid/:internUuid"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorHteEvaluationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/issues"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorIssuesListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/issues/:id"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorIssueFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/hte-evaluations/:uuid"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorHteEvaluationDetailPage />
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
        path="/instructor/interns"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorDeployedInternsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/interns/:uuid"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorInternDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/monitoring"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorInternMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/monitoring/:uuid"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorInternMonitoringCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/monitoring/:uuid/:date"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorInternMonitoringDayPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/monitoring/:uuid/dtr-logs"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorInternDtrLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/monitoring/:uuid/dtr-logs/print"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorInternDtrPrintPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/intern-evaluations"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorInternEvaluationListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/intern-evaluations/:uuid"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorInternEvaluationDetailPage />
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
        path="/hte/monitoring"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteInternMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/monitoring/:uuid"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteInternMonitoringCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/monitoring/:uuid/:date"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteInternMonitoringDayPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/evaluations"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteEvaluateInternListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/evaluations/:uuid"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteEvaluateInternFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/issues"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteIssuesListPage />
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
        path="/admin/documents"
        element={
          <ProtectedRoute roles={["admin"]}>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/reports"
        element={
          <ProtectedRoute roles={["ojt_coordinator"]}>
            <CoordinatorReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/reports"
        element={
          <ProtectedRoute roles={["ojt_instructor"]}>
            <InstructorReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/intern/reports"
        element={
          <ProtectedRoute roles={["intern"]}>
            <InternReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hte/reports"
        element={
          <ProtectedRoute roles={["hte"]}>
            <HteReportPage />
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