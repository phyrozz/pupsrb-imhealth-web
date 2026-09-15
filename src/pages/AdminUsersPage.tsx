import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Group, Paper, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconRefresh, IconUserPlus, IconUsers } from '@tabler/icons-react';
import AdminPageHeader from '../components/data-display/AdminPageHeader';
import DataTableShell from '../components/data-display/DataTableShell';
import { createAdminUser, getAdminUsers, type AdminRole, type AdminUser } from '../lib/api';
import { usePermissions } from '../context/PermissionsContext';

export default function AdminUsersPage() {
  const { data: identity, can } = usePermissions();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isSuperAdmin = identity.role_name === 'su_admin';
  const selectableRoles = roles.filter((role) => isSuperAdmin || role.role_name !== 'su_admin');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await getAdminUsers(); setAdmins(data.admins); setRoles(data.roles); }
    catch { setAdmins([]); setRoles([]); setError('Administrator accounts could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    const parsedRoleId = Number(roleId);
    if (!email.trim() || !Number.isInteger(parsedRoleId) || parsedRoleId < 1) { setError('Enter an email address and select a role.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await createAdminUser({ email: email.trim(), role_id: parsedRoleId });
      setEmail(''); setRoleId(null); setSuccess('Administrator created. Cognito will send the account invitation email.'); await load();
    } catch (requestError: unknown) {
      const message = typeof requestError === 'object' && requestError && 'response' in requestError
        ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      setError(message || 'Administrator account could not be created.');
    } finally { setSaving(false); }
  };

  return <Stack>
    <AdminPageHeader title="Admin Users" description="Create administrator accounts and assign their role before they first sign in." actions={<Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void load()} loading={loading}>Refresh</Button>} />
    {can('admin_users', 'insert') && <Paper withBorder p="lg"><Stack gap="md"><Text fw={600}>Add administrator</Text><Text size="sm" c="dimmed">The new administrator receives a Cognito invitation email with a temporary password.</Text><Group align="end" wrap="wrap"><TextInput label="Email address" placeholder="name@pup.edu.ph" value={email} onChange={(event) => setEmail(event.currentTarget.value)} w={{ base: '100%', sm: 300 }} /><Select label="Role" placeholder="Select a role" data={selectableRoles.map((role) => ({ value: String(role.id), label: role.role_name }))} value={roleId} onChange={setRoleId} w={{ base: '100%', sm: 220 }} /><Button leftSection={<IconUserPlus size={16} />} onClick={() => void create()} loading={saving}>Create admin</Button></Group></Stack></Paper>}
    {error && <Alert color="red" title="Admin users">{error}</Alert>}
    {success && <Alert color="green" role="status">{success}</Alert>}
    <DataTableShell loading={loading} empty={!loading && !error && admins.length === 0} emptyIcon={<IconUsers size={24} />} emptyTitle="No administrator accounts" emptyDescription="Create the first administrator above.">
      <Table.ScrollContainer minWidth={560}><Table striped><Table.Thead><Table.Tr><Table.Th>Email</Table.Th><Table.Th>Role</Table.Th><Table.Th>Created</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{admins.map((admin) => <Table.Tr key={admin.id}><Table.Td>{admin.email}</Table.Td><Table.Td><Text tt="capitalize">{admin.role_name.replaceAll('_', ' ')}</Text></Table.Td><Table.Td>{new Date(admin.created_at).toLocaleDateString()}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>
    </DataTableShell>
  </Stack>;
}
