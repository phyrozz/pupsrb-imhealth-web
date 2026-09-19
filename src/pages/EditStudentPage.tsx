import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, Group, Loader, NumberInput, Select, Stack, Text, TextInput } from '@mantine/core';
import { getPrograms, getStudent, updateStudent, type Program, type StudentDetailsUpdate } from '../lib/api';
import { usePermissions } from '../context/PermissionsContext';
import AdminPageHeader from '../components/data-display/AdminPageHeader';

type StudentRecord = StudentDetailsUpdate & { email: string };
const empty: StudentDetailsUpdate = { first_name: '', middle_name: null, last_name: '', name_suffix: null, student_number: '', birth_date: '', program_id: null, year: 1, marital_status: null, is_working_student: false };

export default function EditStudentPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canEdit = can('students', 'update');
  const [form, setForm] = useState<StudentDetailsUpdate>(empty);
  const [email, setEmail] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!userId || !canEdit) return;
    let active = true;
    Promise.all([getStudent(userId), getPrograms({ pageSize: 50 })]).then(([studentResponse, programResponse]) => {
      if (!active) return;
      const student = studentResponse.data as StudentRecord;
      setForm({
        first_name: student.first_name ?? '', middle_name: student.middle_name ?? null,
        last_name: student.last_name ?? '', name_suffix: student.name_suffix ?? null,
        student_number: student.student_number ?? '', birth_date: student.birth_date?.slice(0, 10) ?? '',
        program_id: student.program_id ?? null, year: Number(student.year) || 1,
        marital_status: student.marital_status ?? null, is_working_student: Boolean(student.is_working_student),
      });
      setEmail(student.email ?? '');
      setPrograms(programResponse.data.items ?? []);
    }).catch(() => { if (active) setError('Student details could not be loaded. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, canEdit]);

  if (!canEdit) return <Alert color="yellow" title="Access restricted">Your role cannot update student details.</Alert>;
  if (loading) return <Stack align="center" py="xl"><Loader /><Text>Loading student details…</Text></Stack>;
  if (!email) return <Alert color="red" title="Student unavailable">{error || 'Student details could not be loaded.'}<Button ml="sm" variant="light" onClick={() => navigate(-1)}>Go back</Button></Alert>;

  const set = <K extends keyof StudentDetailsUpdate>(key: K, value: StudentDetailsUpdate[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;
    setError(''); setMessage('');
    if (!form.first_name.trim() || !form.last_name.trim() || !/^\d{4}-\d{5}-[A-Z]{2}-\d$/.test(form.student_number) || !form.birth_date) {
      setError('Enter a first name, last name, valid student number, and birth date.');
      return;
    }
    setSaving(true);
    try {
      await updateStudent(userId, form);
      setMessage('Student details updated.');
    } catch (cause: unknown) {
      const response = cause as { response?: { data?: { message?: string; error?: string } } };
      setError(response.response?.data?.message ?? response.response?.data?.error ?? 'Student details could not be saved.');
    } finally { setSaving(false); }
  };

  return <Stack maw={760}>
    <AdminPageHeader title="Edit student details" description="Update the student profile shown in assessments." />
    {error && <Alert color="red" title="Unable to update student">{error}</Alert>}
    {message && <Alert color="green" title="Saved">{message}</Alert>}
    <form onSubmit={save}><Stack>
      <TextInput label="Email" value={email} readOnly description="Email is managed by the student's sign-in account." />
      <Group grow align="start"><TextInput label="First name" required value={form.first_name} onChange={(e) => set('first_name', e.currentTarget.value)} /><TextInput label="Last name" required value={form.last_name} onChange={(e) => set('last_name', e.currentTarget.value)} /></Group>
      <Group grow align="start"><TextInput label="Middle name" value={form.middle_name ?? ''} onChange={(e) => set('middle_name', e.currentTarget.value || null)} /><TextInput label="Name suffix" value={form.name_suffix ?? ''} onChange={(e) => set('name_suffix', e.currentTarget.value || null)} /></Group>
      <Group grow align="start"><TextInput label="Student number" required value={form.student_number} onChange={(e) => set('student_number', e.currentTarget.value.toUpperCase())} description="Format: 2021-12345-AB-0" /><TextInput label="Birth date" type="date" required value={form.birth_date} onChange={(e) => set('birth_date', e.currentTarget.value)} /></Group>
      <Group grow align="start"><Select label="Program" data={programs.map((p) => ({ value: String(p.id), label: `${p.initial} — ${p.name}` }))} value={form.program_id == null ? null : String(form.program_id)} onChange={(value) => set('program_id', value ? Number(value) : null)} clearable searchable /><NumberInput label="Year level" required min={1} max={5} value={form.year} onChange={(value) => set('year', Number(value))} /></Group>
      <Select label="Marital status" data={['Single', 'Married', 'Separated', 'Widowed']} value={form.marital_status} onChange={(value) => set('marital_status', value)} clearable />
      <Checkbox label="Working student" checked={form.is_working_student} onChange={(e) => set('is_working_student', e.currentTarget.checked)} />
      <Group><Button type="submit" loading={saving}>Save details</Button><Button variant="default" onClick={() => navigate(-1)}>Cancel</Button></Group>
    </Stack></form>
  </Stack>;
}
