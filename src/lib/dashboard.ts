// Statistics returned by DashboardDAL.get_stats. Missing values must stay
// distinguishable from a genuine zero when rendering an incomplete response.
export interface DashboardStats {
  total_students?: number | string | null;
  answered_assessments_total?: number | string | null;
  working_student_count?: number | string | null;
  working_student_total?: number | string | null;
  scenario_increase_count?: number | string | null;
  scenario_decrease_count?: number | string | null;
}

export function formatDashboardCount(value: unknown): string {
  if (typeof value !== 'number' && typeof value !== 'string') return '—';
  if (typeof value === 'string' && value.trim() === '') return '—';
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count.toLocaleString() : '—';
}
