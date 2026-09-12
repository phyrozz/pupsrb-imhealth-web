import { useState } from 'react';
import {
  Title,
  Card,
  Stack,
  MultiSelect,
  Textarea,
  Button,
  Group,
  Text,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconDownload } from '@tabler/icons-react';
import { listAssessments } from '../lib/api';
import jsPDF from 'jspdf';

const PROGRAMS = ['BSIT', 'BSECE', 'BSIE', 'BSME', 'BSCE', 'BSEE'];
const YEARS = ['1', '2', '3', '4', '5'];
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

export default function GenerateByProgramPage() {
  const [programs, setPrograms] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setMessage('');
    try {
      // API supports: search, scenario, status, page_size. Fetch all matching pages.
      const allData: Record<string, unknown>[] = [];
      let page = 1;
      while (true) {
        const res = await listAssessments({
          page_size: 100,
          page,
        });
        const batch: Record<string, unknown>[] = res.data ?? [];
        if (!batch.length) break;
        allData.push(...batch);
        if (batch.length < 100) break;
        page++;
      }

      // Client-side filtering
      let data = allData;
      if (programs.length) data = data.filter((r) => programs.includes(r.program_initial as string));
      if (years.length) data = data.filter((r) => years.includes(String(r.year)));
      if (statuses.length) data = data.filter((r) => statuses.includes(String(r.counseling_status_id)));
      if (scenarios.length) data = data.filter((r) => scenarios.includes(String(r.result_scenario_id)));
      if (dateRange[0]) data = data.filter((r) => new Date(r.created_at as string) >= dateRange[0]!);
      if (dateRange[1]) data = data.filter((r) => new Date(r.created_at as string) <= dateRange[1]!);

      if (!data.length) {
        setMessage('No results found.');
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Program Report', 10, 15);
      doc.setFontSize(10);
      let y = 25;
      data.forEach((item: Record<string, unknown>, i: number) => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.text(`${i + 1}. ${item.first_name} ${item.last_name} — ${item.result_scenario} — ${item.counseling_status}`, 10, y);
        y += 7;
      });
      if (recommendations) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text('Recommendations:', 10, 15);
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(recommendations, 190);
        doc.text(lines, 10, 25);
      }
      doc.save('report-by-program.pdf');
    } catch {
      setMessage('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title order={2} mb="xl">Generate Report by Program</Title>
      <Card withBorder radius="md" p="xl" maw={600}>
        <Stack>
          <MultiSelect
            label="Programs"
            placeholder="All"
            data={PROGRAMS}
            value={programs}
            onChange={setPrograms}
          />
          <MultiSelect
            label="Year Levels"
            placeholder="All"
            data={YEARS}
            value={years}
            onChange={setYears}
          />
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
          <Group justify="flex-end">
            <Button
              leftSection={<IconDownload size={16} />}
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
