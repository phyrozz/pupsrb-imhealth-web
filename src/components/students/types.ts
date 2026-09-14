export interface Student {
  user_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  name_suffix: string;
  student_number: string;
  email: string;
  birth_date: string;
  program_initial: string;
  year: string;
  marital_status: string;
  is_working_student: boolean;
  total_count: number;
}

export const studentName = (student: Student) =>
  [student.first_name, student.middle_name, student.last_name, student.name_suffix].filter(Boolean).join(' ');

export const displayDate = (date: string) =>
  date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
