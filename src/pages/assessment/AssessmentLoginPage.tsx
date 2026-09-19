import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Title,
  Text,
  Stack,
  Anchor,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import AuthLayout from '../../components/AuthLayout';
import { FormAlert, FormButton, PasswordField, TextField } from '../../components/forms';
import { useAuth } from '../../context/AuthContext';

type AuthError = Error & { code?: string };

export default function AssessmentLoginPage() {
  const { signInStudent, completeNewPassword, hasPendingNewPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const verification = location.state as { email?: string; verified?: boolean } | null;
  const [email, setEmail] = useState(verification?.email ?? '');
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
      if (authError.code === 'UserNotConfirmedException') {
        navigate('/assessment/verify', { state: { email } });
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
            <Title order={2}>{showNewPasswordForm ? 'Set new password' : 'Welcome'}</Title>
            <Text c="dimmed" size="sm">
              {showNewPasswordForm ? 'Complete your first login' : 'Sign in to your student account to continue.'}
            </Text>
          </div>

          {verification?.verified && !showNewPasswordForm && (
            <FormAlert color="green" variant="light">
              Email verified. Sign in to finish saving your student account details.
            </FormAlert>
          )}

          {error && (
            <FormAlert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </FormAlert>
          )}

          {showNewPasswordForm && !error && (
            <FormAlert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
              This is a first-login account. Please set a new password to continue.
            </FormAlert>
          )}

          {!showNewPasswordForm ? (
            <form onSubmit={handleSubmit}>
              <Stack>
                <TextField
                  label="Email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@pup.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <PasswordField
                  label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <FormButton type="submit" loading={loading} fullWidth>
                  Sign In
                </FormButton>
              </Stack>
            </form>
          ) : (
            <form onSubmit={handleNewPasswordSubmit}>
              <Stack>
              <TextField label="Email" value={email} disabled />
                <PasswordField
                  label="New Password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <PasswordField
                  label="Confirm New Password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
                <FormButton type="submit" loading={loading} fullWidth>
                  Save Password
                </FormButton>
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
                <Anchor component={Link} to="/admin">
                  Log in here
                </Anchor>
              </Text>
            </>
          )}
        </Stack>
    </AuthLayout>
  );
}
