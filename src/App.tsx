import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingOverlay } from '@mantine/core';

import { PermissionsProvider, RequirePermission, usePermissions } from './context/PermissionsContext';
import RolePermissionsPage from './pages/RolePermissionsPage';

import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentAssessmentsPage from './pages/StudentAssessmentsPage';
import GenerateReportPage from './pages/GenerateReportPage';
import GenerateByProgramPage from './pages/GenerateByProgramPage';
import GenerateByStudentPage from './pages/GenerateByStudentPage';
import MyAccountPage from './pages/MyAccountPage';
import CounselorWorkloadPage from './pages/CounselorWorkloadPage';

// Student-facing pages
import AssessmentLoginPage from './pages/assessment/AssessmentLoginPage';
import AssessmentSignUpPage from './pages/assessment/AssessmentSignUpPage';
import AssessmentVerifyPage from './pages/assessment/AssessmentVerifyPage';
import AssessmentFormPage from './pages/assessment/AssessmentFormPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, activePool, isLoading } = useAuth();
  if (isLoading) return <LoadingOverlay visible />;
  if (!user || activePool !== 'admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireStudentAuth({ children }: { children: React.ReactNode }) {
  const { user, activePool, isLoading } = useAuth();
  if (isLoading) return <LoadingOverlay visible />;
  if (!user || activePool !== 'student') return <Navigate to="/assessment/login" replace />;
  return <>{children}</>;
}

function AdminHome() {
  const { can, data } = usePermissions();
  const destinations = [['dashboard', '/dashboard'], ['students', '/students'], ['workload', '/counselor-workload'], ['assessments', '/student-assessments'], ['reports', '/generate-report']];
  const destination = destinations.find(([module]) => can(module))?.[1] ?? (data.role_name === 'su_admin' && can('permissions') ? '/role-permissions' : '/my-account');
  return <Navigate to={destination} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/assessment/login" element={<AssessmentLoginPage />} />
      <Route path="/assessment/sign-up" element={<AssessmentSignUpPage />} />
      <Route path="/assessment/verify" element={<AssessmentVerifyPage />} />
      <Route path="/assessment/form" element={<RequireStudentAuth><AssessmentFormPage /></RequireStudentAuth>} />

      {/* Admin (protected) */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <PermissionsProvider><AdminLayout /></PermissionsProvider>
          </RequireAuth>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="dashboard" element={<RequirePermission module="dashboard"><DashboardPage /></RequirePermission>} />
        <Route path="students" element={<RequirePermission module="students"><StudentsPage /></RequirePermission>} />
        <Route path="student-assessments" element={<RequirePermission module="assessments"><StudentAssessmentsPage /></RequirePermission>} />
        <Route path="counselor-workload" element={<RequirePermission module="workload"><CounselorWorkloadPage /></RequirePermission>} />
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
