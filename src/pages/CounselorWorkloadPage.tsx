import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, SegmentedControl, Select, Stack, Table, Text } from '@mantine/core';
import { IconBriefcase, IconRefresh } from '@tabler/icons-react';
import AdminPageHeader from '../components/data-display/AdminPageHeader';
import DataTableShell from '../components/data-display/DataTableShell';
import { claimCounselorWorkload, getCounselorWorkload, updateCounselorWorkload, type CounselorWorkloadResponse, type WorkloadItem } from '../lib/api';
import { usePermissions } from '../context/PermissionsContext';

const STATUS_COLOR = { assigned: 'blue', in_review: 'yellow', completed: 'green' } as const;
const STATUS_LABEL = { assigned: 'Assigned', in_review: 'In review', completed: 'Completed' } as const;
type Scope = 'mine' | 'unassigned' | 'all';

export default function CounselorWorkloadPage() {
  const { data: identity, can } = usePermissions();
  const isSuperAdmin = identity.role_name === 'su_admin';
  const [scope, setScope] = useState<Scope>('mine');
  const [payload, setPayload] = useState<CounselorWorkloadResponse>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await getCounselorWorkload(scope); setPayload(data); }
    catch { setPayload({ items: [] }); setError('Your workload could not be loaded. Please try again.'); }
    finally { setLoading(false); }
  }, [scope]);
  useEffect(() => { void load(); }, [load]);

  const change = async (item: WorkloadItem, status: 'assigned' | 'in_review' | 'completed', assigned_admin_id?: string) => {
    setSavingId(item.assessment_id); setError('');
    try { await updateCounselorWorkload(item.assessment_id, { status, ...(assigned_admin_id ? { assigned_admin_id } : {}) }); await load(); }
    catch { setError('The workload item could not be updated.'); }
    finally { setSavingId(null); }
  };
  const claim = async (item: WorkloadItem) => {
    setSavingId(item.assessment_id); setError('');
    try { await claimCounselorWorkload(item.assessment_id); setScope('mine'); await load(); }
    catch { setError('This assessment is no longer available to claim.'); }
    finally { setSavingId(null); }
  };

  return <Stack>
    <AdminPageHeader title="Counselor Workload" description="Claim submitted assessments, track review progress, and keep counselor assignments visible." actions={<Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void load()} loading={loading}>Refresh</Button>} />
    <Alert title="How this queue works">Unassigned assessments are ready to claim. Counselors can update their own items; super administrators can assign or reassign work across the team. This does not replace counseling status.</Alert>
    <SegmentedControl value={scope} onChange={(value) => setScope(value as Scope)} data={[
      { label: 'My workload', value: 'mine' }, { label: 'Unassigned', value: 'unassigned' }, ...(isSuperAdmin ? [{ label: 'All work', value: 'all' }] : []),
    ]} />
    {error && <Alert color="red" title="Workload unavailable">{error}</Alert>}
    <DataTableShell loading={loading} empty={!loading && !error && payload.items.length === 0} emptyIcon={<IconBriefcase size={24} />} emptyTitle={scope === 'mine' ? 'No assigned assessments' : 'No assessments in this queue'} emptyDescription={scope === 'unassigned' ? 'New student submissions will appear here.' : 'Your assigned assessments will appear here.'}>
      <Table.ScrollContainer minWidth={760}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Submitted</Table.Th><Table.Th>Student</Table.Th><Table.Th>Result</Table.Th><Table.Th>Assigned to</Table.Th><Table.Th>Review state</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead><Table.Tbody>
        {payload.items.map((item) => <Table.Tr key={item.assessment_id}><Table.Td>{new Date(item.created_at).toLocaleDateString()}</Table.Td><Table.Td><Text fw={500}>{[item.first_name, item.last_name].filter(Boolean).join(' ') || 'Student'}</Text><Text size="xs" c="dimmed">{item.student_number}</Text></Table.Td><Table.Td>{item.result_scenario}</Table.Td><Table.Td>{item.assigned_to ?? <Text c="dimmed" size="sm">Unassigned</Text>}</Table.Td><Table.Td>{item.workload_status ? <Badge color={STATUS_COLOR[item.workload_status]}>{STATUS_LABEL[item.workload_status]}</Badge> : <Badge color="gray">Unassigned</Badge>}</Table.Td><Table.Td>
          {scope === 'unassigned' && identity.role_name === 'guidance_counselor' && can('workload', 'update') ? <Button size="xs" onClick={() => void claim(item)} loading={savingId === item.assessment_id}>Claim</Button> : item.workload_status && can('workload', 'update') && <Select size="xs" w={140} value={item.workload_status} disabled={savingId === item.assessment_id} data={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} onChange={(value) => value && void change(item, value as 'assigned' | 'in_review' | 'completed', isSuperAdmin ? item.assigned_admin_id ?? undefined : undefined)} />}
          {isSuperAdmin && <Select mt="xs" size="xs" placeholder="Assign counselor" data={(payload.counselors ?? []).map((c) => ({ value: c.id, label: c.email }))} value={item.assigned_admin_id} disabled={savingId === item.assessment_id} onChange={(value) => value && void change(item, item.workload_status ?? 'assigned', value)} />}
        </Table.Td></Table.Tr>)}
      </Table.Tbody></Table></Table.ScrollContainer>
    </DataTableShell>
  </Stack>;
}
