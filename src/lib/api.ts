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
export const getStudents = (params: {
  search?: string;
  result_count?: string;
  program?: string;
  page_size?: string | number;
  page?: string | number;
}) => api.get('/students', { params });
export const getStudent = (userId: string) => api.get(`/students/${userId}`);
export const createPersonalDetails = (data: unknown) => api.post('/students/personal-details', data);
export const updatePersonalDetails = (data: unknown) => api.put('/students/personal-details', data);
export const importStudentsCsv = (formData: FormData) =>
  api.post('/students/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

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
export const getAprioriResult = (assessmentId: string) => api.get(`/assessments/${assessmentId}/apriori`);
export const updateCounselingStatus = (assessmentId: string, data: unknown) =>
  api.put(`/assessments/${assessmentId}/counseling-status`, data);
export const sendStatusEmail = (data: unknown) => api.post('/assessments/send-status-email', data);

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
