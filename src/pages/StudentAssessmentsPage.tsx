import { useState, useEffect, useCallback } from 'react';
import {
  Group,
  TextInput,
  Select,
  Table,
  Pagination,
  Badge,
  Text,
  Tooltip,
  Alert,
  Button,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconClipboardList, IconRefresh, IconSearch } from '@tabler/icons-react';
import { listAssessments } from '../lib/api';
import AssessmentResponsesModal from '../components/AssessmentResponsesModal';
import StudentHistorySidebar from '../components/StudentHistorySidebar';
import AdminPageHeader from '../components/data-display/AdminPageHeader';
import DataTableShell from '../components/data-display/DataTableShell';
import DataToolbar from '../components/data-display/DataToolbar';
import ResizableSplitView from '../components/layout/ResizableSplitView';

interface Assessment {
  id: string;
  created_at: string;
  user_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  name_suffix: string;
  student_number: string;
  result_scenario: string;
  counseling_status: string;
  counseling_status_id: string;
  program_initial: string;
  year: string;
  email: string;
  birth_date: string;
  marital_status: string;
  is_working_student: boolean;
  total_count: number;
}

interface AssessmentListPayload {
  items?: Assessment[];
  data?: Assessment[];
  total?: number;
}

function normalizeAssessmentList(payload: Assessment[] | AssessmentListPayload | undefined) {
  if (Array.isArray(payload)) {
    return { items: payload, total: payload[0]?.total_count ?? payload.length };
  }

  const items = payload?.items ?? payload?.data ?? [];
  return { items, total: payload?.total ?? items[0]?.total_count ?? items.length };
}

function formatAssessmentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true,
  });
}

const SCENARIO_COLORS: Record<string, string> = {
  None: 'gray',
  'Scenario 1': 'blue',
  'Scenario 2': 'yellow',
  'Scenario 3': 'red',
};

const ROWS_OPTIONS = ['10', '20', '50', '75', '100'];
const SCENARIOS = ['', 'None', 'Scenario 1', 'Scenario 2', 'Scenario 3'];
const STATUSES = ['', 'Pending', 'For Additional Inquiry', 'Resolved'];

export default function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Assessment | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure();

  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState('20');
  const [filterScenario, setFilterScenario] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalCount / parseInt(rowsPerPage)));

  const fetchAssessments = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAssessments({
          search: search,
          scenario: filterScenario,
          status: filterStatus,
          page_size: rowsPerPage,
          page: currentPage,
        });
        const result = normalizeAssessmentList(res.data as Assessment[] | AssessmentListPayload);
        setAssessments(result.items);
        setTotalCount(result.total);
      } catch {
        setAssessments([]);
        setTotalCount(0);
        setError('We could not load student assessments. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [search, filterScenario, filterStatus, rowsPerPage]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchAssessments(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [fetchAssessments]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchAssessments(p);
  };

  return (
    <div className="students-workspace assessments-workspace">
      <AdminPageHeader title="Student Assessments" description="Review submissions, open response details, and follow up with students who need support." mb="lg" actions={<Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => fetchAssessments(page)} loading={loading}>
          Refresh
        </Button>} />

      <AssessmentResponsesModal
        assessmentId={selectedAssessmentId}
        opened={modalOpened}
        onClose={closeModal}
      />

      <DataToolbar mb="md">
        <Group gap="xs">
          <Text size="sm">Show</Text>
          <Select
            w={80}
            size="sm"
            data={ROWS_OPTIONS}
            value={rowsPerPage}
            onChange={(v) => { setRowsPerPage(v ?? '20'); setPage(1); }}
            allowDeselect={false}
          />
          <Text size="sm">records</Text>
        </Group>

        <Select
          label="by Scenario"
          size="sm"
          w={160}
          data={SCENARIOS.map((v) => ({ value: v, label: v || 'All' }))}
          value={filterScenario}
          onChange={(v) => { setFilterScenario(v ?? ''); setPage(1); }}
          allowDeselect={false}
        />
        <Select
          label="by Status"
          size="sm"
          w={200}
          data={STATUSES.map((v) => ({ value: v, label: v || 'All' }))}
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v ?? ''); setPage(1); }}
          allowDeselect={false}
        />
        <TextInput
          placeholder="Search by student..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftSection={<IconSearch size={16} />}
          w={280}
        />
      </DataToolbar>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} title="Assessments unavailable">
          <Group justify="space-between" wrap="wrap">
            <Text size="sm">{error}</Text>
            <Button size="xs" variant="light" color="red" onClick={() => fetchAssessments(page)}>Try again</Button>
          </Group>
        </Alert>
      )}

      <ResizableSplitView detail={selectedStudent ? <StudentHistorySidebar user={selectedStudent} onClose={() => setSelectedStudent(null)} /> : undefined}>
        <div className="assessments-list-pane">
          <DataTableShell className="students-result-panel" loading={loading} empty={!loading && !error && assessments.length === 0} emptyIcon={<IconClipboardList size={24} />} emptyTitle={search || filterScenario || filterStatus ? 'No assessments match these filters' : 'No student assessments yet'} emptyDescription={search || filterScenario || filterStatus ? 'Try adjusting or clearing your filters.' : 'Completed student submissions will appear here.'}>
            <Table.ScrollContainer minWidth={800}><Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Student No.</Table.Th>
                  <Table.Th>Result</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {assessments.map((a) => (
                  <Table.Tr key={a.id} className="student-table-row" data-selected={selectedStudent?.id === a.id || undefined} tabIndex={0} aria-selected={selectedStudent?.id === a.id} aria-label={`View details for assessment by ${[a.first_name, a.last_name].filter(Boolean).join(' ') || 'student'}`} onClick={() => setSelectedStudent(a)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedStudent(a); } }}>
                    <Table.Td>
                      {formatAssessmentDate(a.created_at)}
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="View Student's Detail" position="left">
                        <Text size="sm" fw={500}>
                          {[a.first_name, a.middle_name, a.last_name, a.name_suffix].filter(Boolean).join(' ')}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>{a.student_number}</Table.Td>
                    <Table.Td>
                      <Tooltip label="View Assessment Responses">
                        <Badge style={{ cursor: 'pointer' }} color={SCENARIO_COLORS[a.result_scenario] ?? 'gray'} onClick={(event) => { event.stopPropagation(); setSelectedAssessmentId(a.id); openModal(); }}>
                          {a.result_scenario || 'Not scored'}
                        </Badge>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>{a.counseling_status || 'Not set'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table></Table.ScrollContainer>
          </DataTableShell>
            {assessments.length > 0 && <Text size="sm" c="dimmed" mt="xs">Showing {(page - 1) * parseInt(rowsPerPage) + 1}–{Math.min(page * parseInt(rowsPerPage), totalCount)} of {totalCount} assessment{totalCount === 1 ? '' : 's'}</Text>}
            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination total={totalPages} value={page} onChange={handlePageChange} />
              </Group>
            )}
        </div>
      </ResizableSplitView>
    </div>
  );
}
