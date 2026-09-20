import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react';
import { Alert, Badge, Button, Card, Collapse, Divider, Drawer, Group, SegmentedControl, Select, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBriefcase, IconChevronDown, IconChevronUp, IconRefresh } from '@tabler/icons-react';
import AdminPageHeader from '../components/data-display/AdminPageHeader';
import DataTableShell from '../components/data-display/DataTableShell';
import AssessmentResponsesModal from '../components/AssessmentResponsesModal';
import { claimCounselorWorkload, getCounselorWorkload, updateCounselorWorkload, type CounselorWorkloadResponse, type WorkloadItem } from '../lib/api';
import { usePermissions } from '../context/PermissionsContext';

const STATUS_COLOR = { assigned: 'blue', in_review: 'yellow', completed: 'green' } as const;
const STATUS_LABEL = { assigned: 'Assigned', in_review: 'In review', completed: 'Completed' } as const;
type Scope = 'mine' | 'unassigned' | 'all';

export default function CounselorWorkloadPage() {
  const { data: identity, can } = usePermissions();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const isSuperAdmin = identity.role_name === 'su_admin';
  const [scope, setScope] = useState<Scope>('mine');
  const [payload, setPayload] = useState<CounselorWorkloadResponse>({ items: [], has_more: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorkloadItem | null>(null);
  const [responsesOpened, setResponsesOpened] = useState(false);
  const [queueHelpOpen, setQueueHelpOpen] = useState(false);
  const [error, setError] = useState('');
  const errorActive = useRef(false);
  const scopeRef = useRef<Scope>('mine');
  const generation = useRef(0);
  const nextPage = useRef(1);
  const hasMore = useRef(true);
  const requestActive = useRef(false);
  const scrollArea = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (selectedScope: Scope, currentGeneration: number) => {
    if (requestActive.current || !hasMore.current) return;
    const page = nextPage.current;
    requestActive.current = true;
    if (page > 1) setLoadingMore(true);
    errorActive.current = false;
    setError('');
    try {
      const { data } = await getCounselorWorkload(selectedScope, page);
      if (currentGeneration !== generation.current) return;
      nextPage.current = page + 1;
      hasMore.current = data.has_more;
      setPayload((previous) => {
        if (page === 1) return data;
        const ids = new Set(previous.items.map((item) => item.assessment_id));
        return { ...data, counselors: data.counselors ?? previous.counselors, items: [...previous.items, ...data.items.filter((item) => !ids.has(item.assessment_id))] };
      });
    } catch {
      if (currentGeneration === generation.current) {
        errorActive.current = true;
        setError(page === 1 ? 'Your workload could not be loaded. Please try again.' : 'More assessments could not be loaded. Please try again.');
      }
    } finally {
      if (currentGeneration === generation.current) {
        requestActive.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);
  const reset = useCallback((selectedScope: Scope) => {
    generation.current += 1;
    nextPage.current = 1;
    hasMore.current = true;
    requestActive.current = false;
    errorActive.current = false;
    scrollArea.current?.scrollTo({ top: 0 });
    setPayload({ items: [], has_more: false });
    setLoading(true);
    setLoadingMore(false);
    setError('');
    void loadPage(selectedScope, generation.current);
  }, [loadPage]);
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    if (errorActive.current) return;
    const element = event.currentTarget;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 180) void loadPage(scope, generation.current);
  };
  const refresh = () => reset(scope);
  const retry = () => void loadPage(scope, generation.current);
  useEffect(() => {
    const timer = window.setTimeout(() => reset(scope), 0);
    return () => window.clearTimeout(timer);
  }, [reset, scope]);
  useEffect(() => {
    if (loading || loadingMore || error || !hasMore.current || requestActive.current) return;
    const element = scrollArea.current;
    if (!element || element.scrollHeight > element.clientHeight) return;
    const timer = window.setTimeout(() => { void loadPage(scope, generation.current); }, 0);
    return () => window.clearTimeout(timer);
  }, [payload, loading, loadingMore, error, loadPage, scope]);

  const change = async (item: WorkloadItem, status: 'assigned' | 'in_review' | 'completed', assigned_admin_id?: string) => {
    setSavingId(item.assessment_id); setError('');
    try { await updateCounselorWorkload(item.assessment_id, { status, ...(assigned_admin_id ? { assigned_admin_id } : {}) }); reset(scopeRef.current); }
    catch { setError('The workload item could not be updated.'); }
    finally { setSavingId(null); }
  };
  const claim = async (item: WorkloadItem) => {
    const startedScope = scopeRef.current;
    setSavingId(item.assessment_id); setError('');
    try {
      await claimCounselorWorkload(item.assessment_id);
      if (scopeRef.current !== startedScope || scopeRef.current === 'mine') reset(scopeRef.current);
      else { scopeRef.current = 'mine'; setScope('mine'); }
    }
    catch { setError('This assessment is no longer available to claim.'); }
    finally { setSavingId(null); }
  };
  const openDetails = (item: WorkloadItem) => setSelectedItem(item);
  const studentName = (item: WorkloadItem) => [item.first_name, item.middle_name, item.last_name, item.name_suffix].filter(Boolean).join(' ') || 'Student';
  const detailDate = (value: string | null) => value ? new Date(value).toLocaleDateString() : 'Not recorded';
  const itemActions = (item: WorkloadItem) => <>
    {scope === 'unassigned' && identity.role_name === 'guidance_counselor' && can('workload', 'update') ? <Button size="xs" onClick={() => void claim(item)} loading={savingId === item.assessment_id}>Claim</Button> : item.workload_status && can('workload', 'update') && <Select size="xs" w={140} value={item.workload_status} disabled={savingId === item.assessment_id} data={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} onChange={(value) => value && void change(item, value as 'assigned' | 'in_review' | 'completed', isSuperAdmin ? item.assigned_admin_id ?? undefined : undefined)} />}
    {isSuperAdmin && <Select mt="xs" size="xs" placeholder="Assign counselor" data={(payload.counselors ?? []).map((c) => ({ value: c.id, label: c.email }))} value={item.assigned_admin_id} disabled={savingId === item.assessment_id} onChange={(value) => value && void change(item, item.workload_status ?? 'assigned', value)} />}
  </>;

  return <Stack className="counselor-workload-workspace">
    <AssessmentResponsesModal assessmentId={responsesOpened && selectedItem ? String(selectedItem.assessment_id) : null} opened={responsesOpened} onClose={() => setResponsesOpened(false)} zIndex={400} />
    <Drawer opened={selectedItem !== null} onClose={() => setSelectedItem(null)} title="Student and assessment details" position="right" size="lg">
      {selectedItem && <Stack gap="md">
        <div><Title order={4}>{studentName(selectedItem)}</Title><Text size="sm" c="dimmed">{selectedItem.student_number || 'Student number not recorded'}</Text></div>
        <Divider label="Student profile" labelPosition="center" />
        <SimpleGrid cols={2} spacing="sm">
          {[
            ['Email', selectedItem.email || 'Not recorded'],
            ['Program', selectedItem.program_initial || 'Not recorded'],
            ['Year level', selectedItem.year || 'Not recorded'],
            ['Birth date', detailDate(selectedItem.birth_date)],
            ['Marital status', selectedItem.marital_status || 'Not recorded'],
            ['Working student', selectedItem.is_working_student ? 'Yes' : 'No'],
          ].map(([label, value]) => <div className="student-detail-item" key={label}><Text size="xs" c="dimmed">{label}</Text><Text size="sm" fw={500}>{value}</Text></div>)}
        </SimpleGrid>
        <Divider label="Selected assessment" labelPosition="center" />
        <SimpleGrid cols={2} spacing="sm">
          <div className="student-detail-item"><Text size="xs" c="dimmed">Submitted</Text><Text size="sm" fw={500}>{detailDate(selectedItem.created_at)}</Text></div>
          <div className="student-detail-item"><Text size="xs" c="dimmed">Result</Text><Text size="sm" fw={500}>{selectedItem.result_scenario}</Text></div>
          <div className="student-detail-item"><Text size="xs" c="dimmed">Previous scenario</Text><Text size="sm" fw={500}>{selectedItem.previous_scenario ?? 'No previous assessment'}</Text></div>
          <div className="student-detail-item"><Text size="xs" c="dimmed">Review state</Text><Text size="sm" fw={500}>{selectedItem.workload_status ? STATUS_LABEL[selectedItem.workload_status] : 'Unassigned'}</Text></div>
        </SimpleGrid>
        {selectedItem.scenario_increased && <Alert color="orange" title="Priority review">This scenario increased from the student’s previous assessment.</Alert>}
        <Group justify="flex-end"><Button variant="light" onClick={() => setResponsesOpened(true)}>View assessment responses</Button></Group>
      </Stack>}
    </Drawer>
    <AdminPageHeader title="Counselor Workload" description="Claim submitted assessments, track review progress, and keep counselor assignments visible." descriptionClassName="counselor-workload-description" actions={<Button variant="light" leftSection={<IconRefresh size={16} />} onClick={refresh} loading={loading}>Refresh</Button>} />
    <Alert title="How this queue works">
      <Collapse in={!isMobile || queueHelpOpen}>
        <Text size="sm">Assessments whose scenario increased from the student’s previous assessment appear first and are marked for priority review. Unassigned assessments are ready to claim. Counselors can update their own items; super administrators can assign or reassign work across the team. This does not replace counseling status.</Text>
      </Collapse>
      {isMobile && <Button mt={queueHelpOpen ? 'sm' : 0} size="xs" variant="subtle" color="gray" rightSection={queueHelpOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />} onClick={() => setQueueHelpOpen((open) => !open)}>{queueHelpOpen ? 'Hide' : 'Show'}</Button>}
    </Alert>
    <SegmentedControl value={scope} onChange={(value) => { scopeRef.current = value as Scope; setScope(value as Scope); }} data={[
      { label: 'My workload', value: 'mine' }, { label: 'Unassigned', value: 'unassigned' }, ...(isSuperAdmin ? [{ label: 'All work', value: 'all' }] : []),
    ]} />
    {error && <Alert color="red" title="Workload unavailable">{error} <Button size="xs" variant="light" color="red" onClick={retry}>Retry</Button></Alert>}
    <DataTableShell loading={loading} empty={!loading && !error && payload.items.length === 0} emptyIcon={<IconBriefcase size={24} />} emptyTitle={scope === 'mine' ? 'No assigned assessments' : 'No assessments in this queue'} emptyDescription={scope === 'unassigned' ? 'New student submissions will appear here.' : 'Your assigned assessments will appear here.'} className="counselor-workload-list">
      <div ref={scrollArea} onScroll={onScroll} className="counselor-workload-scroll" role="region" aria-label="Counselor workload assessments" tabIndex={0}>
      <Table.ScrollContainer minWidth={760} className="counselor-workload-table"><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Submitted</Table.Th><Table.Th>Student</Table.Th><Table.Th>Result</Table.Th><Table.Th>Assigned to</Table.Th><Table.Th>Review state</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead><Table.Tbody>
        {payload.items.map((item) => <Table.Tr key={item.assessment_id} className={`student-table-row${item.scenario_increased ? ' counselor-workload-priority-row' : ''}`} tabIndex={0} aria-label={`View details for ${studentName(item)}`} onClick={() => openDetails(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetails(item); } }}><Table.Td>{new Date(item.created_at).toLocaleDateString()}</Table.Td><Table.Td><Text fw={500}>{studentName(item)}</Text><Text size="xs" c="dimmed">{item.student_number}</Text></Table.Td><Table.Td>{item.scenario_increased && <Badge color="orange" variant="light" mb={4}>Increased scenario · Priority review</Badge>}<Text size="sm">{item.result_scenario}</Text>{item.previous_scenario !== null && <Text size="xs" c="dimmed">Previous: {item.previous_scenario} → Current: {item.result_scenario}</Text>}</Table.Td><Table.Td>{item.assigned_to ?? <Text c="dimmed" size="sm">Unassigned</Text>}</Table.Td><Table.Td>{item.workload_status ? <Badge color={STATUS_COLOR[item.workload_status]}>{STATUS_LABEL[item.workload_status]}</Badge> : <Badge color="gray">Unassigned</Badge>}</Table.Td><Table.Td onClick={(event) => event.stopPropagation()}>
          {itemActions(item)}
        </Table.Td></Table.Tr>)}
      </Table.Tbody></Table></Table.ScrollContainer>
      <Stack p="sm" gap="sm" className="counselor-workload-mobile-list">
        {payload.items.map((item) => <Card key={item.assessment_id} withBorder p="sm" className={`counselor-workload-mobile-card${item.scenario_increased ? ' counselor-workload-priority-row' : ''}`} tabIndex={0} role="button" aria-label={`View details for ${studentName(item)}`} onClick={() => openDetails(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetails(item); } }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap"><div><Text fw={650}>{studentName(item)}</Text><Text size="xs" c="dimmed">{item.student_number}</Text></div><Text size="xs" c="dimmed" ta="right">{detailDate(item.created_at)}</Text></Group>
          <Divider my="sm" />
          <Group justify="space-between" align="flex-start" wrap="nowrap"><div><Text size="xs" c="dimmed">Assessment result</Text>{item.scenario_increased && <Badge color="orange" variant="light" mt={3}>Priority review</Badge>}<Text size="sm" fw={500} mt={item.scenario_increased ? 4 : 0}>{item.result_scenario}</Text>{item.previous_scenario !== null && <Text size="xs" c="dimmed">Previous: {item.previous_scenario}</Text>}</div><div><Text size="xs" c="dimmed">Review state</Text>{item.workload_status ? <Badge mt={3} color={STATUS_COLOR[item.workload_status]}>{STATUS_LABEL[item.workload_status]}</Badge> : <Badge mt={3} color="gray">Unassigned</Badge>}</div></Group>
          <Text size="xs" c="dimmed" mt="sm">Assigned to: {item.assigned_to ?? 'Unassigned'}</Text>
          <div onClick={(event) => event.stopPropagation()}>{itemActions(item)}</div>
        </Card>)}
      </Stack>
      {loadingMore && <Text p="sm" ta="center" role="status">Loading more assessments…</Text>}
      </div>
    </DataTableShell>
  </Stack>;
}
