import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Card,
  Avatar,
  Divider,
  Text,
  Title,
  Group,
  Stack,
  ActionIcon,
  Badge,
  Table,
  Loader,
  Select,
  Button,
  ScrollArea,
  SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconX, IconEdit, IconDeviceFloppy } from '@tabler/icons-react';
import { listAssessments, updateCounselingStatus, sendStatusEmail } from '../lib/api';
import { usePermissions } from '../context/PermissionsContext';
import AssessmentResponsesModal from './AssessmentResponsesModal';
import useChartTheme from './dashboard/useChartTheme';
import ReactApexChart from 'react-apexcharts';
import { getStudentTrend } from '../lib/api';
import { Link } from 'react-router-dom';
import type { Student } from './students/types';
import { displayDate, studentName } from './students/types';

interface Assessment {
  id: string;
  created_at: string;
  result_scenario: string;
  counseling_status: string;
  counseling_status_id: string;
}

const SCENARIO_COLORS: Record<string, string> = {
  None: 'gray',
  'Scenario 1': 'blue',
  'Scenario 2': 'yellow',
  'Scenario 3': 'red',
};

const COUNSELING_STATUSES = [
  { value: '1', label: 'Pending' },
  { value: '2', label: 'For Additional Inquiry' },
  { value: '3', label: 'Resolved' },
];

export default function StudentHistorySidebar({
  user,
  onClose,
}: {
  user: Student;
  onClose: () => void;
}) {
  const { can } = usePermissions();
  const canReadHistory = can('assessments');
  const canReadTrend = canReadHistory && can('dashboard');
  const canUpdate = canReadHistory && can('assessments', 'update');
  const canEditStudent = can('students') && can('students', 'update');
  const [error, setError] = useState('');
  const chartTheme = useChartTheme();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [tempChanges, setTempChanges] = useState<Record<string, string>>({});
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<{ date: string; scenario: number }[]>([]);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assmRes, trendRes] = await Promise.all([
        canReadHistory ? listAssessments({ user_id: user.user_id }) : Promise.resolve({ data: [] }),
        canReadTrend ? getStudentTrend(user.user_id) : Promise.resolve({ data: [] }),
      ]);
      setAssessments(assmRes.data ?? []);
      setTrendData(trendRes.data ?? []);
    } catch {
      setError('Assessment history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [user.user_id, canReadHistory, canReadTrend]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const handleSave = async () => {
    if (!canUpdate) return;
    try {
      for (const [id, statusId] of Object.entries(tempChanges)) {
        await updateCounselingStatus(id, { counseling_status_id: statusId });
      }
      // Send email if any status changed to "For Additional Inquiry" (id: 2)
      const needsEmail = Object.values(tempChanges).some((id) => id === '2');
      if (needsEmail) {
        const timestamps = assessments
          .filter((a) => tempChanges[a.id] === '2')
          .map((a) => a.created_at);
        await sendStatusEmail({ user_id: user.user_id, assessment_timestamps: timestamps });
      }
      setTempChanges({});
      setIsEditMode(false);
      await loadData();
      notifications.show({ message: 'Statuses updated', color: 'green' });
    } catch {
      notifications.show({ message: 'Failed to save changes', color: 'red' });
    }
  };

  const fullName = studentName(user);

  return (
    <>
      <AssessmentResponsesModal
        assessmentId={selectedAssessmentId}
        opened={modalOpened}
        onClose={closeModal}
      />
      <Card h="100%" withBorder className="student-detail-panel">
        {loading ? (
          <Stack align="center" justify="center" h={300}>
            <Loader />
          </Stack>
        ) : (
          <ScrollArea h="100%">
            <Group justify="space-between" mb="md" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <Avatar color="grape" radius="xl">{user.first_name?.[0]}{user.last_name?.[0]}</Avatar>
                <div><Title order={4}>{fullName}</Title><Text size="sm" c="dimmed">{user.student_number}</Text></div>
              </Group>
              <ActionIcon variant="subtle" onClick={onClose} aria-label="Close student history">
                <IconX size={16} />
              </ActionIcon>
            </Group>

            <Divider mb="md" />
            <Group justify="space-between" mb="xs">
              <Title order={5}>Student profile</Title>
              {canEditStudent && <Button component={Link} to={`/students/${user.user_id}/edit`} size="xs" variant="light" leftSection={<IconEdit size={14} />}>Edit details</Button>}
            </Group>
            <SimpleGrid cols={2} spacing="xs" mb="md">
              {[["Program", user.program_initial || 'Not recorded'], ["Year level", user.year || 'Not recorded'], ["Birth date", displayDate(user.birth_date)], ["Working student", user.is_working_student ? 'Yes' : 'No']].map(([label, value]) => <div className="student-detail-item" key={label}><Text size="xs" c="dimmed">{label}</Text><Text size="sm" fw={500}>{value}</Text></div>)}
            </SimpleGrid>
            <Title order={5} mb="xs">Contact and personal details</Title>
            <Table withRowBorders={false} fz="sm" mb="md">
              <Table.Tbody>
                <Table.Tr><Table.Td fw={600}>Student No.</Table.Td><Table.Td>{user.student_number}</Table.Td></Table.Tr>
                <Table.Tr><Table.Td fw={600}>Email</Table.Td><Table.Td>{user.email}</Table.Td></Table.Tr>
                <Table.Tr><Table.Td fw={600}>Program</Table.Td><Table.Td>{user.program_initial}</Table.Td></Table.Tr>
                <Table.Tr><Table.Td fw={600}>Year</Table.Td><Table.Td>{user.year || '—'}</Table.Td></Table.Tr>
                <Table.Tr><Table.Td fw={600}>Birth Date</Table.Td><Table.Td>{user.birth_date ? new Date(user.birth_date).toLocaleDateString() : '—'}</Table.Td></Table.Tr>
                <Table.Tr><Table.Td fw={600}>Marital Status</Table.Td><Table.Td>{user.marital_status}</Table.Td></Table.Tr>
                <Table.Tr><Table.Td fw={600}>Working Student</Table.Td><Table.Td>{user.is_working_student ? 'Yes' : 'No'}</Table.Td></Table.Tr>
              </Table.Tbody>
            </Table>

            {trendData.length > 0 && (
              <>
                <Title order={5} mb="xs">Assessment Trend</Title>
                <ReactApexChart
                  type="line"
                  height={160}
                  options={{
                    ...chartTheme,
                    xaxis: { categories: trendData.map((d) => d.date), type: 'datetime' },
                    stroke: { curve: 'smooth' },
                    chart: { ...chartTheme.chart, toolbar: { show: false } },
                    yaxis: { tickAmount: 3 },
                  }}
                  series={[{ name: 'Scenario', data: trendData.map((d) => d.scenario) }]}
                />
              </>
            )}

            <Group justify="space-between" mt="md" mb="xs">
              <Title order={5}>Assessment History</Title>
              <Group gap="xs">
                {canUpdate && isEditMode && (
                  <Button size="xs" leftSection={<IconDeviceFloppy size={14} />} onClick={handleSave}>
                    Save
                  </Button>
                )}
                {canUpdate && <ActionIcon
                  aria-label="Edit counseling statuses"
                  variant={isEditMode ? 'filled' : 'subtle'}
                  color="blue"
                  onClick={() => setIsEditMode((v) => !v)}
                >
                  <IconEdit size={16} />
                </ActionIcon>}
              </Group>
            </Group>

            {error && <Alert color="red">{error}<Button variant="light" onClick={() => void loadData()}>Retry</Button></Alert>}
            {!canReadHistory && <Text size="sm" c="dimmed">Your role does not have access to assessment history.</Text>}
            <Stack gap="xs">
              {assessments.map((a) => (
                <Card key={a.id} withBorder p="sm" radius="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text size="xs" c="dimmed">
                        {new Date(a.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </Text>
                      <Badge
                        color={SCENARIO_COLORS[a.result_scenario] ?? 'gray'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setSelectedAssessmentId(a.id); openModal(); }}
                      >
                        {a.result_scenario}
                      </Badge>
                    </div>
                    {canUpdate && isEditMode ? (
                      <Select
                        size="xs"
                        w={160}
                        data={COUNSELING_STATUSES}
                        value={tempChanges[a.id] ?? a.counseling_status_id}
                        onChange={(v) => setTempChanges((p) => ({ ...p, [a.id]: v! }))}
                      />
                    ) : (
                      <Text size="xs">{a.counseling_status}</Text>
                    )}
                  </Group>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Card>
    </>
  );
}
