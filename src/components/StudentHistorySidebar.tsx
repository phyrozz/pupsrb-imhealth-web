import { useState, useEffect, useCallback } from 'react';
import {
  Card,
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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconX, IconEdit, IconDeviceFloppy } from '@tabler/icons-react';
import { listAssessments, updateCounselingStatus, sendStatusEmail } from '../lib/api';
import AssessmentResponsesModal from './AssessmentResponsesModal';
import useChartTheme from './dashboard/useChartTheme';
import ReactApexChart from 'react-apexcharts';
import { getStudentTrend } from '../lib/api';

interface Student {
  user_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  name_suffix: string;
  student_number: string;
  email: string;
  birth_date: string;
  program_initial: string;
  year: string;
  marital_status: string;
  is_working_student: boolean;
}

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
    try {
      const [assmRes, trendRes] = await Promise.all([
        listAssessments({ user_id: user.user_id }),
        getStudentTrend(user.user_id),
      ]);
      setAssessments(assmRes.data ?? []);
      setTrendData(trendRes.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.user_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
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

  const fullName = [user.first_name, user.middle_name, user.last_name, user.name_suffix]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <AssessmentResponsesModal
        assessmentId={selectedAssessmentId}
        opened={modalOpened}
        onClose={closeModal}
      />
      <Card h="100%" withBorder style={{ overflow: 'auto' }}>
        {loading ? (
          <Stack align="center" justify="center" h={300}>
            <Loader />
          </Stack>
        ) : (
          <ScrollArea h="100%">
            <Group justify="space-between" mb="md">
              <Title order={4}>{fullName}</Title>
              <ActionIcon variant="subtle" onClick={onClose} aria-label="Close student history">
                <IconX size={16} />
              </ActionIcon>
            </Group>

            <Title order={5} mb="xs">Personal Details</Title>
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
                {isEditMode && (
                  <Button size="xs" leftSection={<IconDeviceFloppy size={14} />} onClick={handleSave}>
                    Save
                  </Button>
                )}
                <ActionIcon
                  variant={isEditMode ? 'filled' : 'subtle'}
                  color="blue"
                  onClick={() => setIsEditMode((v) => !v)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Group>
            </Group>

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
                    {isEditMode ? (
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
