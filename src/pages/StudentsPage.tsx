import { useState, useCallback } from 'react';
import {
  Title,
  Group,
  TextInput,
  Select,
  Button,
  Table,
  Pagination,
  Loader,
  Center,
  Text,
  Grid,
  ActionIcon,
  FileButton,
} from '@mantine/core';
import { IconSearch, IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getStudents, importStudentsCsv } from '../lib/api';
import StudentHistorySidebar from '../components/StudentHistorySidebar';

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
  total_count: number;
}

const ROWS_OPTIONS = ['10', '20', '50', '75', '100'];
const SESSION_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];
const PROGRAMS = ['', 'BSIT', 'BSECE', 'BSIE', 'BSME', 'BSCE', 'BSEE'];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState('20');
  const [filterSession, setFilterSession] = useState('0');
  const [filterProgram, setFilterProgram] = useState('');

  const totalPages = Math.ceil(totalCount / parseInt(rowsPerPage));

  const fetchStudents = useCallback(
    async (currentPage = page) => {
      if (!search.trim()) return;
      setLoading(true);
      try {
        const res = await getStudents({
          search: search,
          result_count: filterSession,
          program: filterProgram,
          page_size: rowsPerPage,
          page: currentPage,
        });
        const data: Student[] = res.data ?? [];
        setStudents(data);
        setTotalCount(data[0]?.total_count ?? 0);
        setSearched(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [search, filterSession, filterProgram, rowsPerPage, page]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchStudents(p);
  };

  const handleImportCsv = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await importStudentsCsv(fd);
      notifications.show({ message: 'CSV imported successfully', color: 'green' });
    } catch {
      notifications.show({ message: 'Import failed', color: 'red' });
    }
  };

  return (
    <>
      <Title order={2} mb="md">Students</Title>

      <form onSubmit={handleSearch}>
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
            label="by No. of Sessions"
            size="sm"
            w={140}
            data={SESSION_OPTIONS.map((v) => ({ value: v, label: v === '0' ? 'All' : v }))}
            value={filterSession}
            onChange={(v) => setFilterSession(v ?? '0')}
            allowDeselect={false}
          />
          <Select
            label="by Program"
            size="sm"
            w={140}
            data={PROGRAMS.map((v) => ({ value: v, label: v || 'All' }))}
            value={filterProgram}
            onChange={(v) => setFilterProgram(v ?? '')}
            allowDeselect={false}
          />
          <TextInput
            aria-label="Search students"
            placeholder="Search name or student number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftSection={<IconSearch size={16} />}
            w={{ base: '100%', sm: 300 }}
          />
          <Button type="submit" loading={loading} style={{ alignSelf: 'flex-end' }}>
            Search
          </Button>
          <FileButton onChange={handleImportCsv} accept=".csv">
            {(props) => (
              <ActionIcon {...props} variant="subtle" title="Import CSV" style={{ alignSelf: 'flex-end' }}>
                <IconUpload size={18} />
              </ActionIcon>
            )}
          </FileButton>
        </Group>
      </form>

      {loading ? (
        <Center h={400}><Loader /></Center>
      ) : !searched ? (
        <Center h={400}><Text c="dimmed">Start searching for a student...</Text></Center>
      ) : (
        <Grid>
          <Grid.Col span={{ base: 12, lg: selectedStudent ? 8 : 12 }}>
            <Table.ScrollContainer minWidth={800}><Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Student No.</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Birth Date</Table.Th>
                  <Table.Th>Program</Table.Th>
                  <Table.Th>Year</Table.Th>
                  <Table.Th>Marital Status</Table.Th>
                  <Table.Th>Working?</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {students.map((s) => (
                  <Table.Tr
                    key={s.user_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedStudent(s)}
                  >
                    <Table.Td>{[s.first_name, s.middle_name, s.last_name, s.name_suffix].filter(Boolean).join(' ')}</Table.Td>
                    <Table.Td>{s.student_number}</Table.Td>
                    <Table.Td>{s.email}</Table.Td>
                    <Table.Td>{s.birth_date ? new Date(s.birth_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</Table.Td>
                    <Table.Td>{s.program_initial}</Table.Td>
                    <Table.Td>{s.year || '—'}</Table.Td>
                    <Table.Td>{s.marital_status}</Table.Td>
                    <Table.Td>{s.is_working_student ? 'Yes' : 'No'}</Table.Td>
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
