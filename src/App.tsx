import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingOverlay } from '@mantine/core';

import { PermissionsProvider, RequirePermission } from './context/PermissionsContext';
import RolePermissionsPage from './pages/RolePermissionsPage';

import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import EditStudentPage from './pages/EditStudentPage';
import StudentAssessmentsPage from './pages/StudentAssessmentsPage';
import GenerateReportPage from './pages/GenerateReportPage';
import GenerateByProgramPage from './pages/GenerateByProgramPage';
import GenerateByStudentPage from './pages/GenerateByStudentPage';
import MyAccountPage from './pages/MyAccountPage';
import CounselorWorkloadPage from './pages/CounselorWorkloadPage';
import AdminUsersPage from './pages/AdminUsersPage';

// Student-facing pages
import AssessmentLoginPage from './pages/assessment/AssessmentLoginPage';
import AssessmentSignUpPage from './pages/assessment/AssessmentSignUpPage';
import AssessmentVerifyPage from './pages/assessment/AssessmentVerifyPage';
import AssessmentFormPage from './pages/assessment/AssessmentFormPage';
import StudentDetailsPage from './pages/assessment/StudentDetailsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, activePool, isLoading } = useAuth();
  if (isLoading) return <LoadingOverlay visible />;
  if (!user || activePool !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function RequireStudentAuth({ children }: { children: React.ReactNode }) {
  const { user, activePool, isLoading } = useAuth();
  if (isLoading) return <LoadingOverlay visible />;
  if (!user || activePool !== 'student') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<AssessmentLoginPage />} />
      <Route path="/admin" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/admin" replace />} />
      <Route path="/assessment/login" element={<Navigate to="/" replace />} />
      <Route path="/assessment/sign-up" element={<AssessmentSignUpPage />} />
      <Route path="/assessment/verify" element={<AssessmentVerifyPage />} />
      <Route path="/assessment/form" element={<RequireStudentAuth><AssessmentFormPage /></RequireStudentAuth>} />
      <Route path="/assessment/my-details" element={<RequireStudentAuth><StudentDetailsPage /></RequireStudentAuth>} />

      {/* Admin (protected) */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <PermissionsProvider><AdminLayout /></PermissionsProvider>
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<RequirePermission module="dashboard"><DashboardPage /></RequirePermission>} />
        <Route path="students" element={<RequirePermission module="students"><StudentsPage /></RequirePermission>} />
        <Route path="students/:userId/edit" element={<RequirePermission module="students"><EditStudentPage /></RequirePermission>} />
        <Route path="student-assessments" element={<RequirePermission module="assessments"><StudentAssessmentsPage /></RequirePermission>} />
        <Route path="counselor-workload" element={<RequirePermission module="workload"><CounselorWorkloadPage /></RequirePermission>} />
        <Route path="admin-users" element={<RequirePermission module="admin_users"><AdminUsersPage /></RequirePermission>} />
        <Route path="generate-report" element={<RequirePermission module="reports"><GenerateReportPage /></RequirePermission>} />
        <Route path="generate-report/by-program" element={<RequirePermission module="reports" dependencies={['assessments']}><GenerateByProgramPage /></RequirePermission>} />
        <Route path="generate-report/by-student" element={<RequirePermission module="reports" dependencies={['students', 'assessments']}><GenerateByStudentPage /></RequirePermission>} />
        <Route path="role-permissions" element={<RequirePermission module="permissions"><RolePermissionsPage /></RequirePermission>} />
        <Route path="my-account" element={<MyAccountPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
