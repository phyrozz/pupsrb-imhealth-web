import { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Group,
  MultiSelect,
  Select,
  Stack,
  Textarea,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconMail, IconSend } from '@tabler/icons-react';
import { generateReport, getPrograms, type Program, type ReportFormat } from '../lib/api';
import { usePermissions } from '../context/PermissionsContext';
import { AsyncMultiSelectField, type AsyncSelectPage } from '../components/forms';

const YEARS = ['1', '2', '3', '4', '5'];
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

export default function GenerateByProgramPage() {
  const { can } = usePermissions();
  const canDownload = can('reports', 'download');
  const [programs, setPrograms] = useState<string[]>([ALL_VALUE]);
  const [years, setYears] = useState<string[]>([ALL_VALUE]);
  const [statuses, setStatuses] = useState<string[]>([ALL_VALUE]);
  const [scenarios, setScenarios] = useState<string[]>([ALL_VALUE]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [recommendations, setRecommendations] = useState('');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queued, setQueued] = useState(false);

  const loadPrograms = useCallback(async (query: string, page: number, signal: AbortSignal): Promise<AsyncSelectPage<Program>> => {
    const { data } = await getPrograms({ q: query, page, pageSize: 25, signal });
    if (!Array.isArray(data.items) || !data.items.every((program) =>
      Number.isSafeInteger(program.id) && typeof program.initial === 'string' && typeof program.name === 'string'
    ) || !Number.isSafeInteger(data.page) || !Number.isSafeInteger(data.page_size) ||
      !Number.isSafeInteger(data.total) || typeof data.has_more !== 'boolean') {
      throw new Error('Invalid programs response');
    }
    return data;
  }, []);

  const handleGenerate = async () => {
    if (!canDownload) return;
    setLoading(true);
    setError('');
    setQueued(false);
    try {
      await generateReport({
        report_type: 'program',
        format,
        filters: {
          programs: selectedFilters(programs),
          years: selectedFilters(years),
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
      <Title order={2} mb="xl">Generate Report by Program</Title>
      <Card withBorder radius="md" p="xl" maw={600}>
        <Stack>
          <AsyncMultiSelectField
            label="Programs"
            placeholder={programs.includes(ALL_VALUE) ? undefined : 'Search programs'}
            description="Leave blank to include every program."
            loadPage={loadPrograms}
            getOptionValue={(program) => program.initial}
            getOptionLabel={(program) => `${program.initial} — ${program.name}`}
            value={programs}
            onChange={(values) => setPrograms((current) => updateFilterValues(values, current))}
            pinnedOptions={[ALL_OPTION]}
          />
          <MultiSelect label="Year Levels" data={[ALL_OPTION, ...YEARS]} value={years} onChange={(values) => setYears((current) => updateFilterValues(values, current))} />
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
