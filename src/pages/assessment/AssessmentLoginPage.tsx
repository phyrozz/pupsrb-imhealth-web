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
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import AuthLayout from '../../components/AuthLayout';
import { useAuth } from '../../context/AuthContext';

type AuthError = Error & { code?: string };

export default function AssessmentLoginPage() {
  const { signInStudent, completeNewPassword, hasPendingNewPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);

  const showNewPasswordForm = needsNewPassword || hasPendingNewPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInStudent(email, password);
      navigate('/assessment/form');
    } catch (err: unknown) {
      const authError = err as AuthError;
      if (authError.code === 'NEW_PASSWORD_REQUIRED' || authError.message === 'NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true);
        setError('');
        return;
      }
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await completeNewPassword(newPassword);
      navigate('/assessment/form');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to set new password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
        <Stack gap="lg">
          <div>
            <Text className="eyebrow" mb="xs">STUDENT PORTAL</Text>
            <Title order={2}>{showNewPasswordForm ? 'Set new password' : 'Welcome back'}</Title>
            <Text c="dimmed" size="sm">
              {showNewPasswordForm ? 'Complete your first login' : 'Sign in to your student account to continue.'}
            </Text>
          </div>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}

          {showNewPasswordForm && !error && (
            <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
              This is a first-login account. Please set a new password to continue.
            </Alert>
          )}

          {!showNewPasswordForm ? (
            <form onSubmit={handleSubmit}>
              <Stack>
                <TextInput
                  label="Email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@pup.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <PasswordInput
                  label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="submit" loading={loading} fullWidth>
                  Sign In
                </Button>
              </Stack>
            </form>
          ) : (
            <form onSubmit={handleNewPasswordSubmit}>
              <Stack>
                <TextInput label="Email" value={email} disabled />
                <PasswordInput
                  label="New Password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <PasswordInput
                  label="Confirm New Password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
                <Button type="submit" loading={loading} fullWidth>
                  Save Password
                </Button>
              </Stack>
            </form>
          )}

          {!showNewPasswordForm && (
            <>
              <Text ta="center" size="sm">
                Don't have an account?{' '}
                <Anchor component={Link} to="/assessment/sign-up">
                  Create one
                </Anchor>
              </Text>
              <Text ta="center" size="sm">
                Are you an admin?{' '}
                <Anchor component={Link} to="/login">
                  Log in here
                </Anchor>
              </Text>
            </>
          )}
        </Stack>
    </AuthLayout>
  );
}
