import { useState, useEffect, useCallback } from 'react';
import {
  Title,
  Group,
  TextInput,
  Select,
  Table,
  Pagination,
  Loader,
  Center,
  Badge,
  Grid,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { listAssessments } from '../lib/api';
import AssessmentResponsesModal from '../components/AssessmentResponsesModal';
import StudentHistorySidebar from '../components/StudentHistorySidebar';

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
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Assessment | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure();

  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState('20');
  const [filterScenario, setFilterScenario] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const totalPages = Math.ceil(totalCount / parseInt(rowsPerPage));

  const fetchAssessments = useCallback(
    async (currentPage = page) => {
      setLoading(true);
      try {
        const res = await listAssessments({
          search: search,
          scenario: filterScenario,
          status: filterStatus,
          page_size: rowsPerPage,
          page: currentPage,
        });
        const data: Assessment[] = res.data ?? [];
        setAssessments(data);
        setTotalCount(data[0]?.total_count ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [search, filterScenario, filterStatus, rowsPerPage, page]
  );

  useEffect(() => {
    fetchAssessments(1);
  }, [search, filterScenario, filterStatus, rowsPerPage]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchAssessments(p);
  };

  return (
    <>
      <Title order={2} mb="md">Student Assessments</Title>

      <AssessmentResponsesModal
        assessmentId={selectedAssessmentId}
        opened={modalOpened}
        onClose={closeModal}
      />

      <Group mb="md" wrap="wrap" gap="sm">
        <Group gap="xs">
          <Text size="sm">Show</Text>
          <Select
            w={80}
            size="sm"
            data={ROWS_OPTIONS}
            value={rowsPerPage}
            onChange={(v) => setRowsPerPage(v ?? '20')}
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
          onChange={(v) => setFilterScenario(v ?? '')}
          allowDeselect={false}
        />
        <Select
          label="by Status"
          size="sm"
          w={200}
          data={STATUSES.map((v) => ({ value: v, label: v || 'All' }))}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v ?? '')}
          allowDeselect={false}
        />
        <TextInput
          placeholder="Search by student..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftSection={<IconSearch size={16} />}
          w={280}
        />
      </Group>

      {loading ? (
        <Center h={400}><Loader /></Center>
      ) : (
        <Grid>
          <Grid.Col span={{ base: 12, lg: selectedStudent ? 8 : 12 }}>
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
                  <Table.Tr key={a.id}>
                    <Table.Td>
                      {new Date(a.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: 'numeric', hour12: true,
                      })}
                    </Table.Td>
                    <Table.Td
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedStudent(a)}
                    >
                      <Tooltip label="View Student's Detail" position="left">
                        <Text size="sm">
                          {[a.first_name, a.middle_name, a.last_name, a.name_suffix].filter(Boolean).join(' ')}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>{a.student_number}</Table.Td>
                    <Table.Td
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setSelectedAssessmentId(a.id); openModal(); }}
                    >
                      <Tooltip label="View Assessment Responses">
                        <Badge color={SCENARIO_COLORS[a.result_scenario] ?? 'gray'}>
                          {a.result_scenario}
                        </Badge>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>{a.counseling_status}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table></Table.ScrollContainer>
            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination total={totalPages} value={page} onChange={handlePageChange} />
              </Group>
            )}
          </Grid.Col>

          {selectedStudent && (
            <Grid.Col span={{ base: 12, lg: 4 }}>
              <StudentHistorySidebar
                user={selectedStudent}
                onClose={() => setSelectedStudent(null)}
              />
            </Grid.Col>
          )}
        </Grid>
      )}
    </>
  );
}
