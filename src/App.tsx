import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingOverlay } from '@mantine/core';

import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentAssessmentsPage from './pages/StudentAssessmentsPage';
import GenerateReportPage from './pages/GenerateReportPage';
import GenerateByProgramPage from './pages/GenerateByProgramPage';
import GenerateByStudentPage from './pages/GenerateByStudentPage';
import MyAccountPage from './pages/MyAccountPage';

// Student-facing pages
import AssessmentLoginPage from './pages/assessment/AssessmentLoginPage';
import AssessmentSignUpPage from './pages/assessment/AssessmentSignUpPage';
import AssessmentFormPage from './pages/assessment/AssessmentFormPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingOverlay visible />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireStudentAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingOverlay visible />;
  if (!user) return <Navigate to="/assessment/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/assessment/login" element={<AssessmentLoginPage />} />
      <Route path="/assessment/sign-up" element={<AssessmentSignUpPage />} />
      <Route path="/assessment/form" element={<RequireStudentAuth><AssessmentFormPage /></RequireStudentAuth>} />

      {/* Admin (protected) */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="student-assessments" element={<StudentAssessmentsPage />} />
        <Route path="generate-report" element={<GenerateReportPage />} />
        <Route path="generate-report/by-program" element={<GenerateByProgramPage />} />
        <Route path="generate-report/by-student" element={<GenerateByStudentPage />} />
        <Route path="my-account" element={<MyAccountPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
