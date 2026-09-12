import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Radio,
  Progress,
  ScrollArea,
  Stack,
  Text,
  Title,
  Loader,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconLogout } from '@tabler/icons-react';
import assessmentData from '../../data/assessment_questions.json';
import { submitAssessment, createPersonalDetails } from '../../lib/api';
import ThemeToggle from '../../components/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

type ResponseValue = string;
type DetailsStatus = 'saving' | 'error' | 'ready';

function requestErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function parsePendingDetails(raw: string, email: string) {
  let details: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    details = parsed as Record<string, unknown>;
  } catch {
    throw new Error('Your saved signup details could not be read. Please contact an administrator to complete your account.');
  }
  if (typeof details.email !== 'string' || details.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error('These saved signup details belong to a different email address. Sign out and sign in with the email you used to register. Your information has been kept.');
  }
  return details;
}

export default function AssessmentFormPage() {
  const navigate = useNavigate();
  const { signOut, session, isLoading: authLoading } = useAuth();
  const authenticatedEmail: unknown = session?.getIdToken().payload.email;
  const accountEmail = typeof authenticatedEmail === 'string' ? authenticatedEmail.trim() : '';
  const questions = assessmentData.questions;
  const responses = assessmentData.responses;

  const [answers, setAnswers] = useState<ResponseValue[]>(
    () => Array.from({ length: questions.length }, () => '')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingDetails] = useState(() => sessionStorage.getItem('pendingPersonalDetails'));
  const [detailsStatus, setDetailsStatus] = useState<DetailsStatus>(pendingDetails ? 'saving' : 'ready');
  const [detailsAttempt, setDetailsAttempt] = useState(0);
  const [detailsError, setDetailsError] = useState('');
  const detailsRequestRef = useRef<{ email: string; promise: Promise<void> } | null>(null);

  useEffect(() => {
    if (!pendingDetails || authLoading) return;
    let active = true;

    // Reuse the same request when StrictMode replays this effect.
    if (!detailsRequestRef.current || detailsRequestRef.current.email !== accountEmail) {
      const promise = Promise.resolve()
        .then(() => {
          if (!accountEmail) throw new Error('We could not verify your signed-in email. Please sign out and sign in again before saving your account details.');
          return createPersonalDetails(parsePendingDetails(pendingDetails, accountEmail));
        })
        .then(() => {
          // A later signup must not have its pending details removed by this request.
          if (sessionStorage.getItem('pendingPersonalDetails') === pendingDetails) {
            sessionStorage.removeItem('pendingPersonalDetails');
          }
        });
      detailsRequestRef.current = { email: accountEmail, promise };
    }

    detailsRequestRef.current.promise.then(
      () => { if (active) setDetailsStatus('ready'); },
      (requestError: unknown) => {
        if (active) {
          setDetailsError(requestErrorMessage(requestError, 'We could not save your account details. Please retry before submitting your assessment.'));
          setDetailsStatus('error');
        }
      },
    );

    return () => { active = false; };
  }, [pendingDetails, detailsAttempt, accountEmail, authLoading]);

  const retryPersonalDetails = () => {
    detailsRequestRef.current = null;
    setDetailsError('');
    setDetailsStatus('saving');
    setDetailsAttempt((attempt) => attempt + 1);
  };

  const allAnswered = answers.every(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (detailsStatus !== 'ready') {
      setError('Please wait for your account details to be saved before submitting. If saving failed, select Retry.');
      return;
    }
    if (!allAnswered) { setError('Please answer all questions before submitting.'); return; }
    setLoading(true);
    try {
      await submitAssessment({ responses: answers, questions });
      setSuccess('Assessment submitted successfully.');
      setTimeout(() => { signOut(); navigate('/assessment/login'); }, 1200);
    } catch (err: unknown) {
      setError(requestErrorMessage(err, 'Unable to submit assessment. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="assessment-container" size="lg" py="xl" h="100dvh" style={{ display: 'flex', flexDirection: 'column' }}>
      <Card className="assessment-card" shadow="sm" radius="lg" p={{ base: 'md', sm: 'xl' }} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Sticky header — always visible */}
        <Stack gap="sm" mb="md">
          <Group justify="space-between">
            <div>
              <Title order={2}>Assessment Form</Title>
              <Text c="dimmed" size="sm">Please answer every item based on how you have been feeling recently.</Text>
            </div>
            <Group gap="xs"><ThemeToggle /><Button variant="subtle" color="red" leftSection={<IconLogout size={16} />}
              onClick={() => { signOut(); navigate('/assessment/login'); }}>
              Sign Out
            </Button></Group>
          </Group>

          <Card withBorder radius="md" p="md" className="rating-guide">
            <Text size="sm" fw={600} mb={6}>Rating Guide</Text>
            <Group gap="xs" wrap="wrap">
              {[
                { label: 'Not at all', desc: 'Never experienced this' },
                { label: 'Slight', desc: 'Rare, not bothersome' },
                { label: 'Mild', desc: 'Occasionally, somewhat bothersome' },
                { label: 'Moderate', desc: 'Often, bothersome' },
                { label: 'Severe', desc: 'Constant, very bothersome' },
              ].map((r) => (
                <Text key={r.label} size="xs">
                  <Text span fw={700}>{r.label}</Text> — {r.desc}
                </Text>
              ))}
            </Group>
          </Card>

          {error && <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">{error}</Alert>}
          {success && <Alert icon={<IconCircleCheck size={16} />} color="green" variant="light">{success}</Alert>}
          {detailsStatus === 'saving' && (
            <Alert color="blue" variant="light" icon={<Loader size="sm" aria-hidden="true" />} role="status" aria-live="polite">
              Saving your account details. You can answer the questions while we finish.
            </Alert>
          )}
          {detailsStatus === 'error' && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" role="alert">
              <Text size="sm">{detailsError} Your information is kept for another attempt.</Text>
              <Button type="button" variant="light" color="red" size="xs" mt="xs" onClick={retryPersonalDetails}>Retry</Button>
            </Alert>
          )}
          {pendingDetails && detailsStatus === 'ready' && (
            <Alert icon={<IconCircleCheck size={16} />} color="green" variant="light" role="status" aria-live="polite">
              Your account details have been saved.
            </Alert>
          )}
        </Stack>

        {/* Scrollable questions */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <ScrollArea style={{ flex: 1 }} pr="sm">
            <Stack gap="lg">
              {questions.map((item, index) => (
                <Card key={`${item.domain}-${index}`} withBorder radius="md" p="md">
                  <Stack gap="xs">
                    {item.domain && (
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">{item.domain}</Text>
                    )}
                    <Text fw={500}>{index + 1}. {item.question}</Text>
                    <Radio.Group
                      aria-label={`${index + 1}. ${item.question}`}
                      value={answers[index]}
                      onChange={(value) => setAnswers((cur) => { const next = [...cur]; next[index] = value; return next; })}
                    >
                      <Group mt="xs">
                        {responses.map((response) => (
                          <Radio key={response} value={response} label={response} />
                        ))}
                      </Group>
                    </Radio.Group>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </ScrollArea>

          <Progress value={answers.filter(Boolean).length / questions.length * 100} mt="md" size="sm" aria-label="Assessment completion" />
          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">{answers.filter(Boolean).length} of {questions.length} answered</Text>
            <Button type="submit" loading={loading} disabled={!allAnswered || detailsStatus !== 'ready'}>Submit Assessment</Button>
          </Group>
        </form>

      </Card>
    </Container>
  );
}
