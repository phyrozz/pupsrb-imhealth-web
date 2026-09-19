import { useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Title,
  Text,
  Stack,
  Anchor,
  SimpleGrid,
  Group,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import AuthLayout from '../../components/AuthLayout';
import {
  FormAlert,
  FormButton,
  NumberField,
  PasswordField,
  RadioField,
  RadioOption,
  AsyncSelectField,
  SelectField,
  type AsyncSelectPage,
  TextField,
} from '../../components/forms';
import { useAuth } from '../../context/AuthContext';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { getPrograms, type Program } from '../../lib/api';

const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced'];

const STUDENT_NUMBER_REGEX = /^\d{4}-\d{5}-[A-Z]{2}-\d$/;

function getSignUpErrorMessage(error: unknown) {
  const cognitoError = error as { code?: string; name?: string; __type?: string };
  const code = cognitoError?.code ?? cognitoError?.name ?? cognitoError?.__type;

  switch (code) {
    case 'InvalidPasswordException':
      return 'Password does not meet the account requirements. Choose a stronger password with uppercase and lowercase letters, a number, and a symbol.';
    case 'UsernameExistsException':
      return 'An account already exists for this email address. Sign in or use a different email.';
    case 'InvalidParameterException':
      return 'Please check your email address and the required account details.';
    case 'NotAuthorizedException':
      return 'Student self-registration is not enabled yet. Please contact an administrator.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Too many sign-up attempts. Please wait a few minutes and try again.';
    case 'CodeDeliveryFailureException':
      return 'We could not send the confirmation message. Please try again later.';
    default:
      return 'We could not create your account. Please try again.';
  }
}

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
  const loadPrograms = useCallback(async (query: string, page: number, signal: AbortSignal): Promise<AsyncSelectPage<Program>> => {
    const { data } = await getPrograms({ q: query, page, pageSize: 25, signal });
    if (!Array.isArray(data.items) || !data.items.every((program) =>
      Number.isSafeInteger(program.id) && typeof program.initial === 'string' && typeof program.name === 'string'
    ) || !Number.isSafeInteger(data.page) || !Number.isSafeInteger(data.page_size) ||
      !Number.isSafeInteger(data.total) || typeof data.has_more !== 'boolean') {
      throw new Error('Invalid programs response');
    }
    return data;
  }, []);
  const getProgramOptionValue = useCallback((program: Program) => String(program.id), []);
  const getProgramOptionLabel = useCallback((program: Program) => `${program.initial} - ${program.name}`, []);

  const selectedProgramId = Number(form.program);
  const hasSelectedProgram = form.program.trim() !== '' && Number.isSafeInteger(selectedProgramId);

  const set = (field: string) => (val: string | number | null) =>
    setForm((f) => ({ ...f, [field]: val ?? '' }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasSelectedProgram) {
      setError('Please select an available program before creating your account.');
      return;
    }

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
        program_id: selectedProgramId,
        year: form.year,
        marital_status: form.maritalStatus,
        is_working_student: form.isWorkingStudent === 'true',
      }));
      sessionStorage.setItem('pendingStudentVerificationEmail', form.email);
      navigate('/assessment/verify', { state: { email: form.email } });
    } catch (err: unknown) {
      setError(getSignUpErrorMessage(err));
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
            <FormAlert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="md">
              {error}
            </FormAlert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack>
              <SimpleGrid cols={{ base: 1, xs: 2 }}>
                <TextField label="First Name" value={form.firstName} onChange={(e) => set('firstName')(e.target.value)} required />
                <TextField label="Middle Name" value={form.middleName} onChange={(e) => set('middleName')(e.target.value)} />
                <TextField label="Last Name" value={form.lastName} onChange={(e) => set('lastName')(e.target.value)} required />
                <TextField label="Suffix (Jr., III, etc.)" value={form.nameSuffix} onChange={(e) => set('nameSuffix')(e.target.value)} />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, xs: 2 }}>
                <TextField
                  label="Student Number"
                  placeholder="2021-12345-IT-0"
                  value={form.studentNumber}
                  onChange={(e) => set('studentNumber')(e.target.value)}
                  error={form.studentNumber && !STUDENT_NUMBER_REGEX.test(form.studentNumber) ? 'Invalid format' : undefined}
                  required
                />
                <TextField
                  label="Birth Date"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set('birthDate')(e.target.value)}
                  required
                />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, xs: 3 }}>
                <Stack gap="xs" className="signup-program">
                  <AsyncSelectField
                    label="Program"
                    placeholder="Select your program"
                    loadPage={loadPrograms}
                    getOptionValue={getProgramOptionValue}
                    getOptionLabel={getProgramOptionLabel}
                    value={form.program || null}
                    onChange={set('program')}
                    required
                  />
                </Stack>
                <NumberField
                  label="Year"
                  value={form.year as number}
                  onChange={set('year')}
                  min={1}
                  max={5}
                  required
                />
              </SimpleGrid>

              <SelectField
                label="Marital Status"
                data={MARITAL_STATUSES}
                value={form.maritalStatus}
                onChange={set('maritalStatus')}
                required
              />

              <RadioField
                label="Are you a working student?"
                value={form.isWorkingStudent}
                onChange={set('isWorkingStudent')}
              >
                <Group mt="xs">
                  <RadioOption value="true" label="Yes" />
                  <RadioOption value="false" label="No" />
                </Group>
              </RadioField>

              <TextField label="Email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} required />
              <PasswordField label="Password" value={form.password} onChange={(e) => set('password')(e.target.value)} required />
              <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={(e) => set('confirmPassword')(e.target.value)} required />

              <Text size="xs" c="dimmed">
                By creating an account, you agree to PUP's{' '}
                <Anchor href="https://www.pup.edu.ph/privacy/" target="_blank" size="xs">Privacy Statement</Anchor>.
              </Text>

              <FormButton type="submit" loading={loading} disabled={!hasSelectedProgram} fullWidth>
                Create Account
              </FormButton>

              <Text ta="center" size="sm">
                Already have an account?{' '}
                <Anchor component={Link} to="/">Sign in</Anchor>
              </Text>
            </Stack>
          </form>
    </AuthLayout>
  );
}
