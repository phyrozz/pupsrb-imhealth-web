import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Badge, Button, FileButton, Group, Pagination, Select, Table, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconSearch, IconUpload, IconUsers } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { getPrograms, getStudents, importStudentsCsv } from '../lib/api';
import StudentHistorySidebar from '../components/StudentHistorySidebar';
import AdminPageHeader from '../components/data-display/AdminPageHeader';
import DataTableShell from '../components/data-display/DataTableShell';
import DataToolbar from '../components/data-display/DataToolbar';
import ResizableSplitView from '../components/layout/ResizableSplitView';
import type { Student } from '../components/students/types';

const ROWS_OPTIONS = ['10', '20', '50', '75', '100'];
const SESSION_OPTIONS = ['', '0', '1', '2', '3', '4', '5', '6'];

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.message ?? error.response?.data?.error;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  return fallback;
}

function formatStudentName(student: Student) {
  return [student.first_name, student.middle_name, student.last_name, student.name_suffix].filter(Boolean).join(' ');
}

function formatDate(date: string) {
  return date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [programs, setPrograms] = useState<string[]>([]);
  const [programsError, setProgramsError] = useState('');
  const requestController = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState('20');
  const [filterSession, setFilterSession] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const totalPages = Math.ceil(totalCount / Number(rowsPerPage));

  useEffect(() => {
    const controller = new AbortController();
    const loadPrograms = async () => {
      try {
        const programInitials: string[] = [];
        let currentPage = 1;
        let hasMore = true;
        while (hasMore) {
          const { data } = await getPrograms({ page: currentPage, pageSize: 100, signal: controller.signal });
          if (!Array.isArray(data.items) || typeof data.has_more !== 'boolean') throw new Error('Invalid programs response');
          programInitials.push(...data.items.map((program) => program.initial).filter(Boolean));
          hasMore = data.has_more;
          currentPage += 1;
        }
        setPrograms([...new Set(programInitials)].sort());
      } catch (err) {
        if (!axios.isCancel(err)) setProgramsError('Programs could not be loaded. You can still search all programs.');
      }
    };
    void loadPrograms();
    return () => controller.abort();
  }, []);

  useEffect(() => () => requestController.current?.abort(), []);

  const fetchStudents = useCallback(async (currentPage = page) => {
    if (!search.trim()) return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError('');
    setSelectedStudent(null);
    setStudents([]);
    setTotalCount(0);
    try {
      const res = await getStudents({
        search,
        result_count: filterSession,
        program: filterProgram,
        page_size: rowsPerPage,
        page: currentPage,
        signal: controller.signal,
      });
      if (sequence !== requestSequence.current) return;
      const data: Student[] = res.data ?? [];
      setStudents(data);
      setTotalCount(data[0]?.total_count ?? 0);
      setSearched(true);
    } catch (err) {
      if (axios.isCancel(err) || sequence !== requestSequence.current) return;
      setError(getRequestErrorMessage(err, 'Students could not be loaded. Please try again.'));
      setSearched(true);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [search, filterSession, filterProgram, rowsPerPage, page]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    fetchStudents(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    fetchStudents(nextPage);
  };

  const handleImportCsv = async (file: File | null) => {
    if (!file) return;
    try {
      await importStudentsCsv({ csv: await file.text() });
      notifications.show({ message: 'CSV imported successfully', color: 'green' });
    } catch {
      notifications.show({ message: 'Import failed', color: 'red' });
    }
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, student: Student) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedStudent(student);
    }
  };

  const emptyTitle = !searched ? 'Find a student' : 'No students found';
  const emptyDescription = !searched
    ? 'Search by student name or student number to view student records.'
    : 'Try adjusting the name, student number, or filters and search again.';

  return (
    <div className="students-workspace">
      <AdminPageHeader
        title="Students"
        description="Search student records, review assessment history, and import approved student lists."
        mb="lg"
        actions={<FileButton onChange={handleImportCsv} accept=".csv">{(props) => <Button {...props} variant="light" leftSection={<IconUpload size={17} />}>Import CSV</Button>}</FileButton>}
      />

      <form onSubmit={handleSearch}>
        <DataToolbar mb="md">
          <TextInput aria-label="Search students" placeholder="Name or student number" description="Required to search" value={search} onChange={(event) => setSearch(event.target.value)} leftSection={<IconSearch size={16} />} w={{ base: '100%', sm: 280 }} />
          <Select label="Program" placeholder="All programs" w={{ base: '100%', xs: 165 }} data={[{ value: '', label: 'All programs' }, ...programs.map((program) => ({ value: program, label: program }))]} value={filterProgram} onChange={(value) => setFilterProgram(value ?? '')} allowDeselect={false} />
          <Select label="Sessions" w={{ base: '100%', xs: 145 }} data={SESSION_OPTIONS.map((value) => ({ value, label: value === '' ? 'All sessions' : `${value} sessions` }))} value={filterSession} onChange={(value) => setFilterSession(value ?? '')} allowDeselect={false} />
          <Select label="Rows" w={{ base: '100%', xs: 100 }} data={ROWS_OPTIONS} value={rowsPerPage} onChange={(value) => setRowsPerPage(value ?? '20')} allowDeselect={false} />
          <Button type="submit" loading={loading} leftSection={<IconSearch size={17} />}>Search</Button>
        </DataToolbar>
      </form>

      {programsError && <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="Program filters unavailable" mb="md">{programsError}</Alert>}
      {error && <Alert icon={<IconAlertCircle size={16} />} color="red" title="Could not load students" mb="md" withCloseButton onClose={() => setError('')}>{error}</Alert>}

      <ResizableSplitView detail={selectedStudent ? <StudentHistorySidebar user={selectedStudent} onClose={() => setSelectedStudent(null)} /> : undefined}>
        <div>
          {searched && totalCount > 0 && !loading && (
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">{totalCount.toLocaleString()} student{totalCount === 1 ? '' : 's'} found</Text>
              <Text size="sm" c="dimmed">Select a row to view assessment history</Text>
            </Group>
          )}
          <DataTableShell className="students-result-panel" loading={loading} empty={!loading && (Boolean(error) || !searched || students.length === 0)} emptyIcon={<IconUsers size={24} />} emptyTitle={error ? 'Student list unavailable' : emptyTitle} emptyDescription={error ? 'Please try your search again in a moment.' : emptyDescription}>
            <Table.ScrollContainer minWidth={950}>
              <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Student no.</Table.Th><Table.Th>Email</Table.Th><Table.Th>Program</Table.Th><Table.Th>Year</Table.Th><Table.Th>Working</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {students.map((student) => {
                    const isSelected = selectedStudent?.user_id === student.user_id;
                    return <Table.Tr key={student.user_id} className="student-table-row" data-selected={isSelected || undefined} tabIndex={0} aria-label={`View assessment history for ${formatStudentName(student)}`} aria-selected={isSelected} onClick={() => setSelectedStudent(student)} onKeyDown={(event) => handleRowKeyDown(event, student)}>
                      <Table.Td className="student-name-cell"><Text fw={600} size="sm">{formatStudentName(student)}</Text><Text size="xs" c="dimmed">Born {formatDate(student.birth_date)}</Text></Table.Td>
                      <Table.Td ff="monospace">{student.student_number}</Table.Td>
                      <Table.Td>{student.email}</Table.Td>
                      <Table.Td><Badge variant="light" color="grape">{student.program_initial || '—'}</Badge></Table.Td>
                      <Table.Td>{student.year || '—'}</Table.Td>
                      <Table.Td>{student.is_working_student ? 'Yes' : 'No'}</Table.Td>
                    </Table.Tr>;
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </DataTableShell>
          {totalPages > 1 && !loading && <Group justify="space-between" mt="md" wrap="wrap"><Text size="sm" c="dimmed">Page {page} of {totalPages}</Text><Pagination total={totalPages} value={page} onChange={handlePageChange} /></Group>}
        </div>
      </ResizableSplitView>
    </div>
  );
}
