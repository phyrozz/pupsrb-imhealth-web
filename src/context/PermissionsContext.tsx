import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Button, Loader, Stack, Text } from '@mantine/core';
import api from '../lib/api';
import { useAuth } from './AuthContext';

interface Permissions {
  role_id: number;
  role_name: string;
  permissions: Record<string, string[]>;
}
const Context = createContext<{ data: Permissions; can: (module: string, permission?: string) => boolean } | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [result, setResult] = useState<{ user: typeof user; data: Permissions } | null>(null);
  const [errorUser, setErrorUser] = useState<{ user: typeof user } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get<Permissions>('/admin/permissions/me', { signal: controller.signal }).then(({ data }) => {
      if (!data || !Number.isInteger(data.role_id) || typeof data.role_name !== 'string' || !data.permissions || typeof data.permissions !== 'object' || Array.isArray(data.permissions) || Object.values(data.permissions).some((value) => !Array.isArray(value) || value.some((item) => typeof item !== 'string'))) throw new Error('Invalid permissions response');
      if (!controller.signal.aborted) setResult({ user, data });
    }).catch(() => { if (!controller.signal.aborted) setErrorUser({ user }); });
    return () => controller.abort();
  }, [user, attempt]);
  if (errorUser?.user === user) return <Alert color="red" title="Permissions unavailable"><Stack><Text>Access could not be verified. Please try again.</Text><Button onClick={() => { setErrorUser(null); setAttempt((value) => value + 1); }}>Retry</Button></Stack></Alert>;
  if (!result || result.user !== user) return <Stack align="center" justify="center" mih="100dvh" p="md" role="status"><Loader /><Text ta="center">Preparing your workspace…</Text></Stack>;
  const { data } = result;
  return <Context.Provider value={{ data, can: (module, permission = 'read') => data.permissions[module]?.includes(permission) ?? false }}>{children}</Context.Provider>;
}

// Kept with the provider so authorization consumers share a single contract.
// eslint-disable-next-line react-refresh/only-export-components
export function usePermissions() {
  const value = useContext(Context);
  if (!value) throw new Error('PermissionsProvider is required');
  return value;
}

export function RequirePermission({ module, dependencies = [], children }: { module: string; dependencies?: string[]; children: React.ReactNode }) {
  const { can } = usePermissions();
  return can(module) && dependencies.every((dependency) => can(dependency)) ? children : <Alert color="yellow" title="Access restricted">Your role does not have read access to this module or its required data.</Alert>;
}
