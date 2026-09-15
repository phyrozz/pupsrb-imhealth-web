import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Group, Loader, Select, Stack, Table, Text } from '@mantine/core';
import api from '../lib/api';
import AdminPageHeader from '../components/data-display/AdminPageHeader';
import { usePermissions } from '../context/PermissionsContext';

interface Grant { role_id: number; module_id: number; permission_type_id: number }
interface Matrix {
  roles: { id: number; role_name: string }[];
  modules: { id: number; module_key: string; module_name: string }[];
  permission_types: { id: number; permission_key: string; permission_name: string }[];
  grants: Grant[];
}
function isMatrix(value: unknown): value is Matrix {
  if (!value || typeof value !== 'object') return false;
  const matrix = value as Matrix;
  const hasId = (item: unknown): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && Number.isInteger((item as Record<string, unknown>).id);
  return Array.isArray(matrix.roles) && matrix.roles.every((item) => hasId(item) && typeof item.role_name === 'string')
    && Array.isArray(matrix.modules) && matrix.modules.every((item) => hasId(item) && typeof item.module_key === 'string' && typeof item.module_name === 'string')
    && Array.isArray(matrix.permission_types) && matrix.permission_types.every((item) => hasId(item) && typeof item.permission_key === 'string' && typeof item.permission_name === 'string')
    && Array.isArray(matrix.grants) && matrix.grants.every((item) => Boolean(item) && typeof item === 'object' && Number.isInteger(item.role_id) && Number.isInteger(item.module_id) && Number.isInteger(item.permission_type_id));
}
export default function RolePermissionsPage() {
  const { data: own } = usePermissions();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get<unknown>('/role-permissions'); if (!isMatrix(data)) throw new Error('Invalid permission matrix response'); setMatrix(data); }
    catch { setError('The permission matrix could not be loaded.'); setMatrix(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (own.role_name === 'su_admin') void Promise.resolve().then(load); }, [load, own.role_name]);
  if (own.role_name !== 'su_admin') return <Alert color="yellow" title="Access restricted">Only super administrators can manage role permissions.</Alert>;
  const current = matrix?.roles.find((item) => String(item.id) === role);
  const immutable = current?.role_name === 'su_admin';
  const chooseRole = (value: string | null) => {
    setRole(value); setSuccess('');
    setSelected(matrix?.grants.filter((grant) => String(grant.role_id) === value).map((grant) => `${grant.module_id}:${grant.permission_type_id}`) ?? []);
  };
  const save = async () => {
    if (!role || immutable) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put(`/role-permissions/${role}`, { grants: selected.map((key) => { const [module_id, permission_type_id] = key.split(':').map(Number); return { module_id, permission_type_id }; }) });
      await load(); setRole(null); setSelected([]); setSuccess('Role permissions saved.');
    } catch { setError('Permissions could not be saved. Please retry.'); }
    finally { setSaving(false); }
  };
  return <Stack>
    <AdminPageHeader title="Role Permissions" description="Set access for administrator modules by role." />
    <Alert title="Administrator access">These permissions apply only to admin modules. Super administrator permissions are protected and cannot be edited. Permission management is reserved for super administrators; that module cannot be granted to other roles. Student CSV import requires both Insert and Upload. Report exports require Download plus read access to the assessment data (and student data for student reports).</Alert>
    {error && <Alert color="red" title="Permission matrix unavailable">{error}<Button variant="light" ml="md" onClick={() => void load()}>Reload</Button></Alert>}
    {success && <Alert color="green" role="status">{success}</Alert>}
    {loading ? <Group role="status"><Loader size="sm" /><Text>Loading matrix…</Text></Group> : matrix && <>
      <Select label="Administrator role" placeholder="Select a role" data={matrix.roles.map((item) => ({ value: String(item.id), label: item.role_name }))} value={role} onChange={chooseRole} disabled={saving} />
      {!matrix.roles.length && <Text>No administrator roles are available.</Text>}
      {role && <Table.ScrollContainer minWidth={620}><Table withTableBorder withColumnBorders><Table.Thead><Table.Tr><Table.Th>Module</Table.Th>{matrix.permission_types.map((type) => <Table.Th key={type.id}>{type.permission_name}</Table.Th>)}</Table.Tr></Table.Thead><Table.Tbody>{matrix.modules.map((module) => <Table.Tr key={module.id}><Table.Th>{module.module_name}</Table.Th>{matrix.permission_types.map((type) => {
        const key = `${module.id}:${type.id}`;
        return <Table.Td key={type.id}><Checkbox aria-label={`${current?.role_name}: ${module.module_name} ${type.permission_name}`} checked={selected.includes(key)} disabled={immutable || saving || module.module_key === 'permissions'} onChange={(event) => { const checked = event.currentTarget.checked; setSelected((values) => checked ? [...values, key] : values.filter((value) => value !== key)); }} /></Table.Td>;
      })}</Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}
      <Group justify="flex-end"><Button disabled={!role || immutable} loading={saving} onClick={() => void save()}>Save permissions</Button></Group>
    </>}
  </Stack>;
}
