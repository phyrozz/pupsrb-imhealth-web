import axios from 'axios';
import type { DashboardStats } from './dashboard';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Attach Cognito ID token to every request
api.interceptors.request.use((config) => {
  // Dynamically import to avoid circular deps — token is stored in localStorage by Cognito SDK
  const activeToken = sessionStorage.getItem('imhealth.activeIdToken');
  const fallbackTokenKey = Object.keys(localStorage).find((key) => key.endsWith('.idToken'));
  const token = activeToken ?? (fallbackTokenKey ? localStorage.getItem(fallbackTokenKey) : null);
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export default api;

export interface Program {
  id: number;
  initial: string;
  name: string;
}

export interface ProgramsPage {
  items: Program[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

export interface GetProgramsOptions {
  q?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export const getPrograms = ({ q = '', page = 1, pageSize = 25, signal }: GetProgramsOptions = {}) =>
  api.get<ProgramsPage>('/programs', {
    params: { q, page, page_size: pageSize },
    signal,
  });

// ── Students ──────────────────────────────────────────────────────────────────
export interface GetStudentsOptions {
  search?: string;
  result_count?: string;
  program?: string;
  page_size?: string | number;
  page?: string | number;
  signal?: AbortSignal;
}

export const getStudents = ({ signal, ...params }: GetStudentsOptions) =>
  api.get('/students', { params, signal });
export const getStudent = (userId: string) => api.get(`/students/${userId}`);
export interface StudentDetailsUpdate {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  name_suffix: string | null;
  student_number: string;
  birth_date: string;
  program_id: number | null;
  year: number;
  marital_status: string | null;
  is_working_student: boolean;
}
export const updateStudent = (userId: string, data: StudentDetailsUpdate) => api.put(`/students/${userId}`, data);
export const createPersonalDetails = (data: unknown) => api.post('/students/personal-details', data);
export interface OwnStudentDetails extends Omit<StudentDetailsUpdate, 'marital_status'> {
  email: string;
  marital_status_id: number | null;
}
export type OwnStudentDetailsUpdate = Omit<OwnStudentDetails, 'email'>;
export const getPersonalDetails = () => api.get<OwnStudentDetails>('/students/personal-details');
export const updatePersonalDetails = (data: OwnStudentDetailsUpdate) => api.put<OwnStudentDetails>('/students/personal-details', data);
export const importStudentsCsv = (data: { csv: string }) => api.post('/students/import', data);

// ── Assessments ───────────────────────────────────────────────────────────────
export const listAssessments = (params: {
  search?: string;
  scenario?: string;
  status?: string;
  user_id?: string;
  page_size?: string | number;
  page?: string | number;
}) => api.get('/assessments', { params });
export const submitAssessment = (data: unknown) => api.post('/assessments', data);
export const getAssessmentAvailability = () => api.get<{ available: boolean; next_available_at: string | null }>('/assessments/availability');
export interface AssessmentResult {
  assessment_id: string;
  responses: number[];
}

export const getAprioriResult = (assessmentId: string) =>
  api.get<AssessmentResult>(`/assessments/${assessmentId}/apriori`);
export const updateCounselingStatus = (assessmentId: string, data: unknown) =>
  api.put(`/assessments/${assessmentId}/counseling-status`, data);
export const sendStatusEmail = (data: unknown) => api.post('/assessments/send-status-email', data);

export interface WorkloadItem {
  assessment_id: number;
  created_at: string;
  user_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  name_suffix: string;
  student_number: string;
  email: string;
  program_initial: string;
  year: string | null;
  birth_date: string | null;
  marital_status: string;
  is_working_student: boolean;
  result_scenario: string;
  previous_scenario: string | null;
  scenario_increased: boolean;
  workload_status: 'assigned' | 'in_review' | 'completed' | null;
  assigned_admin_id: string | null;
  assigned_to: string | null;
}

export interface CounselorWorkloadResponse {
  items: WorkloadItem[];
  has_more: boolean;
  counselors?: { id: string; email: string }[];
}

export const getCounselorWorkload = (scope: 'mine' | 'unassigned' | 'all', page: number, pageSize = 30) =>
  api.get<CounselorWorkloadResponse>('/counselor-workload', { params: { scope, page, page_size: pageSize } });
export const claimCounselorWorkload = (assessmentId: number) => api.post(`/counselor-workload/${assessmentId}/claim`);
export const updateCounselorWorkload = (assessmentId: number, data: { status: 'assigned' | 'in_review' | 'completed'; assigned_admin_id?: string }) =>
  api.put(`/counselor-workload/${assessmentId}`, data);

export interface AdminUser { id: string; email: string; role_id: number; role_name: string; created_at: string }
export interface AdminRole { id: number; role_name: string }
export const getAdminUsers = () => api.get<{ admins: AdminUser[]; roles: AdminRole[] }>('/admin-users');
export const createAdminUser = (data: { email: string; role_id: number }) => api.post<AdminUser>('/admin-users', data);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardStats = () => api.get<DashboardStats>('/dashboard/stats');
export const getScenariosChart = () => api.get('/dashboard/charts/scenarios');
export const getProgramsChart = () => api.get('/dashboard/charts/programs');
export const getAssessmentTrend = (scenario: string) => api.get<{ session_date: string; count: number }[]>('/dashboard/charts/assessment-trend', { params: { scenario } });
export const getMentalHealthTrend = () => api.get('/dashboard/charts/mental-health-trend');
export const getStudentTrend = (userId: string) => api.get(`/dashboard/charts/student-trend/${userId}`);

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile = () => api.get('/profile');
export const updateProfile = (data: unknown) => api.put('/profile', data);
export const getAvatarUploadUrl = () => api.get('/profile/avatar/upload-url');
export const updateAvatarUrl = (data: unknown) => api.put('/profile/avatar', data);
