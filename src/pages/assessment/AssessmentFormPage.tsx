import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconLogout } from '@tabler/icons-react';
import assessmentData from '../../data/assessment_questions.json';
import { submitAssessment, createPersonalDetails } from '../../lib/api';
import ThemeToggle from '../../components/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

type ResponseValue = string;

export default function AssessmentFormPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const questions = assessmentData.questions;
  const responses = assessmentData.responses;

  const [answers, setAnswers] = useState<ResponseValue[]>(
    () => Array.from({ length: questions.length }, () => '')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingPersonalDetails');
    if (!pending) return;
    sessionStorage.removeItem('pendingPersonalDetails');
    createPersonalDetails(JSON.parse(pending)).catch(console.error);
  }, []);

  const allAnswered = answers.every(Boolean);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!allAnswered) { setError('Please answer all questions before submitting.'); return; }
    setLoading(true);
    try {
      await submitAssessment({ responses: answers, questions });
      setSuccess('Assessment submitted successfully.');
      setTimeout(() => { signOut(); navigate('/assessment/login'); }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
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
            <Button type="submit" loading={loading} disabled={!allAnswered}>Submit Assessment</Button>
          </Group>
        </form>

      </Card>
    </Container>
  );
}
