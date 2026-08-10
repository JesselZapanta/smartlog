import { Route, Routes } from "react-router-dom";
import Landing from "@/pages/Landing.jsx";
import Login from "@/pages/Login.jsx";
import AdminDashboard from "@/pages/admin/AdminDashboard.jsx";
import UserListPage from "@/pages/admin/users/UserListPage.jsx";
import UserFormPage from "@/pages/admin/users/UserFormPage.jsx";
import AcademicTermListPage from "@/pages/admin/academic-terms/AcademicTermListPage.jsx";
import InstituteListPage from "@/pages/admin/institutes/InstituteListPage.jsx";
import ProgramListPage from "@/pages/admin/programs/ProgramListPage.jsx";
import ProtectedRoute from "@/components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <UserListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <ProtectedRoute>
            <UserFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:id/edit"
        element={
          <ProtectedRoute>
            <UserFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/academic-years"
        element={
          <ProtectedRoute>
            <AcademicTermListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/institutes"
        element={
          <ProtectedRoute>
            <InstituteListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/programs"
        element={
          <ProtectedRoute>
            <ProgramListPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
