import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Anchor, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { CognitoUser } from 'amazon-cognito-identity-js';
import AuthLayout from '../../components/AuthLayout';
import { FormAlert, FormButton, TextField } from '../../components/forms';
import { useAuth } from '../../context/AuthContext';

type CognitoError = Error & { code?: string };
type LocationState = { email?: string } | null;

function confirmationErrorMessage(error: unknown) {
  const cognitoError = error as CognitoError;
  switch (cognitoError?.code) {
    case 'CodeMismatchException':
      return 'That verification code is incorrect. Please check the email and try again.';
    case 'ExpiredCodeException':
      return 'That verification code has expired. Request a new code and try again.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'UserNotFoundException':
      return 'We could not find an account for that email address.';
    default:
      return 'We could not verify your account. Please try again.';
  }
}

export default function AssessmentVerifyPage() {
  const { studentUserPool } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const savedEmail = sessionStorage.getItem('pendingStudentVerificationEmail') ?? '';
  const [email, setEmail] = useState((location.state as LocationState)?.email ?? savedEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('Enter the code sent to your email address.');
  const [loading, setLoading] = useState(false);

  const getUser = () => new CognitoUser({ Username: email.trim(), Pool: studentUserPool });

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        getUser().confirmRegistration(code.trim(), true, (confirmError) =>
          confirmError ? reject(confirmError) : resolve(),
        );
      });
      sessionStorage.removeItem('pendingStudentVerificationEmail');
      navigate('/assessment/login', { state: { email: email.trim(), verified: true } });
    } catch (confirmError: unknown) {
      setError(confirmationErrorMessage(confirmError));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address before requesting a new code.');
      return;
    }
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        getUser().resendConfirmationCode((resendError) =>
          resendError ? reject(resendError) : resolve(),
        );
      });
      sessionStorage.setItem('pendingStudentVerificationEmail', email.trim());
      setNotice('A new verification code has been sent.');
    } catch (resendError: unknown) {
      setError(confirmationErrorMessage(resendError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Stack gap="lg">
        <div>
          <Text className="eyebrow" mb="xs">STUDENT PORTAL</Text>
          <Title order={2}>Verify your email</Title>
          <Text c="dimmed" size="sm">Confirm your account before signing in.</Text>
        </div>

        {error && <FormAlert icon={<IconAlertCircle size={16} />} color="red" variant="light">{error}</FormAlert>}
        {notice && <FormAlert icon={<IconCircleCheck size={16} />} color="blue" variant="light">{notice}</FormAlert>}

        <form onSubmit={handleConfirm}>
          <Stack>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <TextField
              label="Verification code"
              autoComplete="one-time-code"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <FormButton type="submit" loading={loading} fullWidth>Verify account</FormButton>
            <FormButton type="button" variant="subtle" loading={loading} onClick={handleResend}>
              Send a new code
            </FormButton>
          </Stack>
        </form>

        <Text ta="center" size="sm">
          Already verified? <Anchor component={Link} to="/assessment/login">Sign in</Anchor>
        </Text>
      </Stack>
    </AuthLayout>
  );
}
