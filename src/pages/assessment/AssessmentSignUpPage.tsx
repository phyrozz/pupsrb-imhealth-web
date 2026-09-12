import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Anchor,
  Select,
  SimpleGrid,
  Radio,
  Group,
  NumberInput,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import AuthLayout from '../../components/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';

const PROGRAMS = [
  { value: 'BSIT', label: 'BSIT - Bachelor of Science in Information Technology' },
  { value: 'BSECE', label: 'BSECE - Bachelor of Science in Electronics Engineering' },
  { value: 'BSIE', label: 'BSIE - Bachelor of Science in Industrial Engineering' },
  { value: 'BSME', label: 'BSME - Bachelor of Science in Mechanical Engineering' },
  { value: 'BSCE', label: 'BSCE - Bachelor of Science in Civil Engineering' },
  { value: 'BSEE', label: 'BSEE - Bachelor of Science in Electrical Engineering' },
];

const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced'];

const STUDENT_NUMBER_REGEX = /^\d{4}-\d{5}-[A-Z]{2}-\d$/;

export default function AssessmentSignUpPage() {
  const { studentUserPool } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    middleName: '',
    lastName: '',
    nameSuffix: '',
    studentNumber: '',
    birthDate: '',
    program: '',
    year: 1,
    maritalStatus: '',
    isWorkingStudent: 'false',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (val: string | number | null) =>
    setForm((f) => ({ ...f, [field]: val ?? '' }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!STUDENT_NUMBER_REGEX.test(form.studentNumber)) {
      setError('Invalid student number format (e.g. 2021-12345-AB-0).');
      return;
    }

    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        studentUserPool.signUp(
          form.email,
          form.password,
          [new CognitoUserAttribute({ Name: 'email', Value: form.email })],
          [],
          (err) => (err ? reject(err) : resolve())
        );
      });

      // Store personal details in sessionStorage — submitted after email confirmation + sign-in
      sessionStorage.setItem('pendingPersonalDetails', JSON.stringify({
        email: form.email,
        first_name: form.firstName,
        middle_name: form.middleName,
        last_name: form.lastName,
        name_suffix: form.nameSuffix,
        student_number: form.studentNumber,
        birth_date: form.birthDate,
        program_initial: form.program,
        year: form.year,
        marital_status: form.maritalStatus,
        is_working_student: form.isWorkingStudent === 'true',
      }));

      navigate('/assessment/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout wide>
          <Text className="eyebrow" mb="xs">STUDENT PORTAL</Text>
          <Title order={2} mb="xs">Create your account</Title>
          <Text c="dimmed" size="sm" mb="lg">Tell us a little about yourself to get started.</Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="md">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack>
              <SimpleGrid cols={{ base: 1, xs: 2 }}>
                <TextInput label="First Name" value={form.firstName} onChange={(e) => set('firstName')(e.target.value)} required />
                <TextInput label="Middle Name" value={form.middleName} onChange={(e) => set('middleName')(e.target.value)} />
                <TextInput label="Last Name" value={form.lastName} onChange={(e) => set('lastName')(e.target.value)} required />
                <TextInput label="Suffix (Jr., III, etc.)" value={form.nameSuffix} onChange={(e) => set('nameSuffix')(e.target.value)} />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, xs: 2 }}>
                <TextInput
                  label="Student Number"
                  placeholder="2021-12345-IT-0"
                  value={form.studentNumber}
                  onChange={(e) => set('studentNumber')(e.target.value)}
                  error={form.studentNumber && !STUDENT_NUMBER_REGEX.test(form.studentNumber) ? 'Invalid format' : undefined}
                  required
                />
                <TextInput
                  label="Birth Date"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set('birthDate')(e.target.value)}
                  required
                />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, xs: 3 }}>
                <Select
                  label="Program"
                  data={PROGRAMS}
                  value={form.program}
                  onChange={set('program')}
                  required
                  className="signup-program"
                />
                <NumberInput
                  label="Year"
                  value={form.year as number}
                  onChange={set('year')}
                  min={1}
                  max={5}
                  required
                />
              </SimpleGrid>

              <Select
                label="Marital Status"
                data={MARITAL_STATUSES}
                value={form.maritalStatus}
                onChange={set('maritalStatus')}
                required
              />

              <Radio.Group
                label="Are you a working student?"
                value={form.isWorkingStudent}
                onChange={set('isWorkingStudent')}
              >
                <Group mt="xs">
                  <Radio value="true" label="Yes" />
                  <Radio value="false" label="No" />
                </Group>
              </Radio.Group>

              <TextInput label="Email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} required />
              <PasswordInput label="Password" value={form.password} onChange={(e) => set('password')(e.target.value)} required />
              <PasswordInput label="Confirm Password" value={form.confirmPassword} onChange={(e) => set('confirmPassword')(e.target.value)} required />

              <Text size="xs" c="dimmed">
                By creating an account, you agree to PUP's{' '}
                <Anchor href="https://www.pup.edu.ph/privacy/" target="_blank" size="xs">Privacy Statement</Anchor>.
              </Text>

              <Button type="submit" loading={loading} fullWidth>
                Create Account
              </Button>

              <Text ta="center" size="sm">
                Already have an account?{' '}
                <Anchor component={Link} to="/assessment/login">Sign in</Anchor>
              </Text>
            </Stack>
          </form>
    </AuthLayout>
  );
}
