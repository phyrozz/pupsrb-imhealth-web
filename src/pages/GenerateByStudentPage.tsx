import { useState, useCallback } from 'react';
import {
  Title,
  Card,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Text,
  MultiSelect,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconDownload, IconSearch } from '@tabler/icons-react';
import { getStudents, listAssessments } from '../lib/api';
import { usePermissions } from '../context/PermissionsContext';
import jsPDF from 'jspdf';

const STATUSES = [
  { value: '1', label: 'Pending' },
  { value: '2', label: 'For Additional Inquiry' },
  { value: '3', label: 'Resolved' },
];
const SCENARIOS = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Scenario 1' },
  { value: '2', label: 'Scenario 2' },
  { value: '3', label: 'Scenario 3' },
];

export default function GenerateByStudentPage() {
  const { can } = usePermissions();
  const canDownload = can('reports', 'download');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');

  const searchStudents = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await getStudents({ search: q, page_size: 20, page: 1 });
      setStudentOptions(
        (res.data ?? []).map((s: Record<string, string>) => ({
          value: s.user_id,
          label: `${s.first_name} ${s.last_name} (${s.student_number})`,
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleGenerate = async () => {
    if (!canDownload) return;
    if (!selectedUserId) { setMessage('Please select a student.'); return; }
    setLoading(true);
    setMessage('');
    try {
      // Fetch all assessments for this student, then filter client-side
      const allData: Record<string, unknown>[] = [];
      let page = 1;
      while (true) {
        const res = await listAssessments({ user_id: selectedUserId, page_size: 100, page });
        const batch: Record<string, unknown>[] = res.data ?? [];
        if (!batch.length) break;
        allData.push(...batch);
        if (batch.length < 100) break;
        page++;
      }

      let data = allData;
      if (statuses.length) data = data.filter((r) => statuses.includes(String(r.counseling_status_id)));
      if (scenarios.length) data = data.filter((r) => scenarios.includes(String(r.result_scenario_id)));
      if (dateRange[0]) data = data.filter((r) => new Date(r.created_at as string) >= dateRange[0]!);
      if (dateRange[1]) data = data.filter((r) => new Date(r.created_at as string) <= dateRange[1]!);

      if (!data.length) { setMessage('No results found.'); return; }

      const studentLabel = studentOptions.find((o) => o.value === selectedUserId)?.label ?? 'Student';
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Report: ${studentLabel}`, 10, 15);
      doc.setFontSize(10);
      let y = 25;
      data.forEach((item: Record<string, unknown>, i: number) => {
        if (y > 270) { doc.addPage(); y = 15; }
        const date = new Date(item.created_at as string).toLocaleDateString();
        doc.text(`${i + 1}. ${date} — ${item.result_scenario} — ${item.counseling_status}`, 10, y);
        y += 7;
      });
      if (recommendations) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text('Recommendations:', 10, 15);
        const lines = doc.splitTextToSize(recommendations, 190);
        doc.setFontSize(10);
        doc.text(lines, 10, 25);
      }
      doc.save('report-by-student.pdf');
    } catch {
      setMessage('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title order={2} mb="xl">Generate Report by Student</Title>
      <Card withBorder radius="md" p="xl" maw={600}>
        <Stack>
          <div>
            <TextInput
              label="Search Student"
              placeholder="Type name or student number..."
              value={studentSearch}
              onChange={(e) => { setStudentSearch(e.target.value); searchStudents(e.target.value); }}
              rightSection={searching ? undefined : <IconSearch size={16} />}
              mb="xs"
            />
            {studentOptions.length > 0 && (
              <Card withBorder p="xs" radius="sm">
                <Stack gap={4}>
                  {studentOptions.map((o) => (
                    <Text
                      key={o.value}
                      size="sm"
                      p="xs"
                      style={{
                        cursor: 'pointer',
                        borderRadius: 4,
                        background: selectedUserId === o.value ? 'var(--app-tint)' : undefined,
                      }}
                      onClick={() => { setSelectedUserId(o.value); setStudentSearch(o.label); setStudentOptions([]); }}
                    >
                      {o.label}
                    </Text>
                  ))}
                </Stack>
              </Card>
            )}
          </div>

          <MultiSelect
            label="Counseling Status"
            placeholder="All"
            data={STATUSES}
            value={statuses}
            onChange={setStatuses}
          />
          <MultiSelect
            label="Assessment Results"
            placeholder="All"
            data={SCENARIOS}
            value={scenarios}
            onChange={setScenarios}
          />
          <DatePickerInput
            type="range"
            label="Date Range"
            placeholder="Pick date range"
            value={dateRange}
            onChange={(value) => setDateRange(value.map((date) => date ? new Date(`${date}T00:00:00`) : null) as [Date | null, Date | null])}
            clearable
          />
          <Textarea
            label="Recommendations"
            placeholder="Optional recommendations text..."
            minRows={3}
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
          {message && <Text c={message.includes('Failed') ? 'red' : 'dimmed'} size="sm">{message}</Text>}
          {!canDownload && <Text size="sm">Your role does not have permission to download reports.</Text>}
          <Group justify="flex-end">
            <Button
              leftSection={<IconDownload size={16} />}
              disabled={!canDownload}
              onClick={handleGenerate}
              loading={loading}
            >
              Generate PDF
            </Button>
          </Group>
        </Stack>
      </Card>
    </>
  );
}
