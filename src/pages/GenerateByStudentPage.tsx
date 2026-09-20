import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  MultiSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconMail, IconSearch, IconSend } from '@tabler/icons-react';
import { generateReport, getStudents, type ReportFormat } from '../lib/api';
import { usePermissions } from '../context/PermissionsContext';

const STATUSES = [
  { value: '1', label: 'No Further Action' },
  { value: '2', label: 'For Additional Inquiry' },
  { value: '3', label: 'For Counseling' },
  { value: '4', label: 'For Referral' },
  { value: '5', label: 'Closed' },
];
const SCENARIOS = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Scenario 1' },
  { value: '2', label: 'Scenario 2' },
  { value: '3', label: 'Scenario 3' },
];
const OUTPUT_FORMATS = [
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel workbook (.xlsx)' },
];
const ALL_VALUE = '__all__';
const ALL_OPTION = { value: ALL_VALUE, label: 'All' };

function updateFilterValues(nextValues: string[], currentValues: string[]) {
  if (nextValues.includes(ALL_VALUE) && !currentValues.includes(ALL_VALUE)) return [ALL_VALUE];
  const specificValues = nextValues.filter((value) => value !== ALL_VALUE);
  return specificValues.length ? specificValues : [ALL_VALUE];
}

function selectedFilters(values: string[]) {
  const filters = values.filter((value) => value !== ALL_VALUE);
  return filters.length ? filters : undefined;
}

function toDateOnly(date: Date | null) {
  if (!date) return undefined;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function GenerateByStudentPage() {
  const { can } = usePermissions();
  const canDownload = can('reports', 'download');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [statuses, setStatuses] = useState<string[]>([ALL_VALUE]);
  const [scenarios, setScenarios] = useState<string[]>([ALL_VALUE]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [recommendations, setRecommendations] = useState('');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [error, setError] = useState('');
  const [queued, setQueued] = useState(false);
  const searchController = useRef<AbortController | null>(null);
  const searchSequence = useRef(0);

  useEffect(() => () => searchController.current?.abort(), []);

  const searchStudents = useCallback(async (query: string) => {
    if (!query.trim()) {
      searchController.current?.abort();
      searchSequence.current += 1;
      setStudentOptions([]);
      setSearchPerformed(false);
      setSearching(false);
      return;
    }
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    const sequence = ++searchSequence.current;
    setSearching(true);
    setSearchPerformed(true);
    setSearchError('');
    try {
      const res = await getStudents({ search: query, page_size: 20, page: 1, signal: controller.signal });
      if (controller.signal.aborted || sequence !== searchSequence.current) return;
      setStudentOptions(
        (res.data ?? []).map((student: Record<string, string>) => ({
          value: student.user_id,
          label: `${student.first_name} ${student.last_name} (${student.student_number})`,
        })),
      );
    } catch {
      if (controller.signal.aborted || sequence !== searchSequence.current) return;
      setStudentOptions([]);
      setSearchError('Students could not be searched. Please try again.');
    } finally {
      if (sequence === searchSequence.current) setSearching(false);
    }
  }, []);

  const handleStudentSearch = (value: string) => {
    setStudentSearch(value);
    setSelectedUserId('');
    searchStudents(value);
  };

  const handleGenerate = async () => {
    if (!canDownload) return;
    setError('');
    setQueued(false);
    if (!selectedUserId) {
      setError('Select a student before queuing a report.');
      return;
    }
    setLoading(true);
    try {
      await generateReport({
        report_type: 'student',
        format,
        filters: {
          user_id: selectedUserId,
          counseling_status_ids: selectedFilters(statuses),
          scenario_ids: selectedFilters(scenarios),
          start_date: toDateOnly(dateRange[0]),
          end_date: toDateOnly(dateRange[1]),
          recommendations: recommendations.trim() || undefined,
        },
      });
      setQueued(true);
    } catch (cause: unknown) {
      const response = cause as { response?: { data?: { message?: string; error?: string } } };
      setError(response.response?.data?.message ?? response.response?.data?.error ?? 'The report could not be queued. Please try again.');
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
              onChange={(event) => handleStudentSearch(event.target.value)}
              rightSection={searching ? <Loader size={16} /> : <IconSearch size={16} />}
              aria-busy={searching}
              mb="xs"
            />
            {searchError && <Alert color="red" title="Unable to search students" mb="xs">{searchError}</Alert>}
            {searchPerformed && !searching && !searchError && studentOptions.length === 0 && <Text size="sm" c="dimmed">No matching students found.</Text>}
            {studentOptions.length > 0 && (
              <Card withBorder p="xs" radius="sm">
                <Stack gap={4}>
                  {studentOptions.map((option) => (
                    <UnstyledButton
                      key={option.value}
                      p="xs"
                      style={{
                        cursor: 'pointer',
                        borderRadius: 4,
                        background: selectedUserId === option.value ? 'var(--app-tint)' : undefined,
                        textAlign: 'left',
                      }}
                      onClick={() => {
                        searchController.current?.abort();
                        searchSequence.current += 1;
                        setSelectedUserId(option.value);
                        setStudentSearch(option.label);
                        setStudentOptions([]);
                        setSearchError('');
                        setSearchPerformed(false);
                        setSearching(false);
                      }}
                    >
                      <Text size="sm">{option.label}</Text>
                    </UnstyledButton>
                  ))}
                </Stack>
              </Card>
            )}
          </div>
          <MultiSelect label="Counseling Status" data={[ALL_OPTION, ...STATUSES]} value={statuses} onChange={(values) => setStatuses((current) => updateFilterValues(values, current))} />
          <MultiSelect label="Assessment Results" data={[ALL_OPTION, ...SCENARIOS]} value={scenarios} onChange={(values) => setScenarios((current) => updateFilterValues(values, current))} />
          <DatePickerInput
            type="range"
            label="Date Range"
            placeholder="Pick date range"
            value={dateRange}
            onChange={(value) => setDateRange(value.map((date) => date ? new Date(`${date}T00:00:00`) : null) as [Date | null, Date | null])}
            clearable
          />
          <Textarea label="Recommendations" placeholder="Optional recommendations text..." minRows={3} value={recommendations} onChange={(event) => setRecommendations(event.target.value)} />
          <Select
            label="Output format"
            description="The finished report will be emailed to the signed-in administrator."
            data={OUTPUT_FORMATS}
            value={format}
            onChange={(value) => { if (value) setFormat(value as ReportFormat); }}
            allowDeselect={false}
            required
          />
          {error && <Alert color="red" title="Unable to generate report">{error}</Alert>}
          {queued && <Alert color="green" title="Report generated" icon={<IconMail size={16} />}>Your {format.toUpperCase()} report is being prepared and will be sent to your email address when it is ready.</Alert>}
          {!canDownload && <Alert color="yellow" title="Access restricted">Your role does not have permission to generate reports.</Alert>}
          <Group justify="flex-end">
            <Button disabled={!canDownload} onClick={handleGenerate} loading={loading}>
              Generate report
            </Button>
          </Group>
        </Stack>
      </Card>
    </>
  );
}
