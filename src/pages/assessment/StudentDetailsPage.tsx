import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { Alert, Button, Card, Checkbox, Container, Group, Loader, NumberInput, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { getPersonalDetails, getPrograms, updatePersonalDetails, type OwnStudentDetails, type OwnStudentDetailsUpdate, type Program } from '../../lib/api';
import ThemeToggle from '../../components/ThemeToggle';

const maritalStatuses = [
  { value: '1', label: 'Single' },
  { value: '2', label: 'Married' },
  { value: '3', label: 'Separated' },
  { value: '4', label: 'Widowed' },
];

function message(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message || fallback;
  return fallback;
}

function editableFields(profile: OwnStudentDetails): OwnStudentDetailsUpdate {
  return {
    first_name: profile.first_name ?? '', middle_name: profile.middle_name ?? null,
    last_name: profile.last_name ?? '', name_suffix: profile.name_suffix ?? null,
    student_number: profile.student_number ?? '', birth_date: profile.birth_date?.slice(0, 10) ?? '',
    program_id: profile.program_id ?? null, year: Number(profile.year),
    marital_status_id: profile.marital_status_id ?? null,
    is_working_student: Boolean(profile.is_working_student),
  };
}

export default function StudentDetailsPage() {
  const [details, setDetails] = useState<OwnStudentDetailsUpdate | null>(null);
  const [email, setEmail] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getPersonalDetails(), getPrograms({ pageSize: 50 })]).then(([detailResponse, programResponse]) => {
      if (!active) return;
      setEmail(detailResponse.data.email);
      setDetails(editableFields(detailResponse.data));
      setPrograms(programResponse.data.items ?? []);
      setError('');
    }).catch((cause: unknown) => {
      if (active) setError(message(cause, 'Your details could not be loaded. Please try again.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const set = <K extends keyof OwnStudentDetailsUpdate>(key: K, value: OwnStudentDetailsUpdate[K]) =>
    setDetails((current) => current ? { ...current, [key]: value } : current);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!details) return;
    setError(''); setSaved(false);
    if (!details.first_name.trim() || !details.last_name.trim() || !/^\d{4}-\d{5}-[A-Z]{2}-\d$/.test(details.student_number) || !details.birth_date || !Number.isInteger(details.year) || details.year < 1 || details.year > 5) {
      setError('Enter a first name, last name, valid student number, birth date, and year level from 1 to 5.');
      return;
    }
    setSaving(true);
    try {
      const profile = (await updatePersonalDetails(details)).data;
      setEmail(profile.email);
      setDetails(editableFields(profile));
      setSaved(true);
    } catch (cause: unknown) {
      setError(message(cause, 'Your details could not be saved. Please try again.'));
    } finally { setSaving(false); }
  };

  return <Container size="md" py="xl">
    <Card withBorder shadow="sm" radius="lg" p={{ base: 'md', sm: 'xl' }}>
      <Stack>
        <Group justify="space-between"><div><Title order={2}>My details</Title><Text c="dimmed" size="sm">Review and update your student profile.</Text></div><ThemeToggle /></Group>
        <Button component={Link} to="/assessment/form" variant="subtle" w="fit-content" leftSection={<IconArrowLeft size={16} />}>Go back</Button>
        {loading && <Group role="status"><Loader size="sm" /><Text>Loading your details…</Text></Group>}
        {error && <Alert color="red" title="Unable to update details">{error}{!details && <Button mt="xs" variant="light" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>Retry</Button>}</Alert>}
        {saved && <Alert color="green" title="Saved">Your details have been updated.</Alert>}
        {details && <form onSubmit={save}><Stack>
          <TextInput label="Email" value={email} readOnly description="Your sign-in email cannot be changed here." />
          <Group grow align="start"><TextInput label="First name" required value={details.first_name} onChange={(e) => set('first_name', e.currentTarget.value)} /><TextInput label="Last name" required value={details.last_name} onChange={(e) => set('last_name', e.currentTarget.value)} /></Group>
          <Group grow align="start"><TextInput label="Middle name" value={details.middle_name ?? ''} onChange={(e) => set('middle_name', e.currentTarget.value || null)} /><TextInput label="Name suffix" value={details.name_suffix ?? ''} onChange={(e) => set('name_suffix', e.currentTarget.value || null)} /></Group>
          <Group grow align="start"><TextInput label="Student number" required value={details.student_number} onChange={(e) => set('student_number', e.currentTarget.value.toUpperCase())} description="Format: 2021-12345-AB-0" /><TextInput label="Birth date" type="date" required value={details.birth_date} onChange={(e) => set('birth_date', e.currentTarget.value)} /></Group>
          <Group grow align="start"><Select label="Program" searchable clearable data={programs.map((program) => ({ value: String(program.id), label: `${program.initial} — ${program.name}` }))} value={details.program_id == null ? null : String(details.program_id)} onChange={(value) => set('program_id', value ? Number(value) : null)} /><NumberInput label="Year level" min={1} max={5} required value={details.year} onChange={(value) => set('year', Number(value))} /></Group>
          <Select label="Marital status" clearable data={maritalStatuses} value={details.marital_status_id == null ? null : String(details.marital_status_id)} onChange={(value) => set('marital_status_id', value ? Number(value) : null)} />
          <Checkbox label="Working student" checked={details.is_working_student} onChange={(e) => set('is_working_student', e.currentTarget.checked)} />
          <Group><Button type="submit" loading={saving}>Save details</Button></Group>
        </Stack></form>}
      </Stack>
    </Card>
  </Container>;
}
