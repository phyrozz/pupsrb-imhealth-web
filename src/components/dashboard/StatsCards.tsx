import { useEffect, useState } from 'react';
import { SimpleGrid, Card, Text, Title, Skeleton, Group, ThemeIcon, Alert, Button } from '@mantine/core';
import { IconUsers, IconClipboardCheck, IconBriefcase, IconCalendarCheck } from '@tabler/icons-react';
import { getDashboardStats } from '../../lib/api';
import { formatDashboardCount, type DashboardStats } from '../../lib/dashboard';

const items = [
  { label: 'Total students', key: 'total_students', icon: IconUsers, color: 'brand' },
  { label: 'Students assessed', key: 'answered_assessments_total', icon: IconClipboardCheck, color: 'blue' },
  { label: 'Working students', key: 'working_student_count', icon: IconBriefcase, color: 'violet' },
  { label: 'Scenario increases', key: 'scenario_increase_count', icon: IconCalendarCheck, color: 'teal' },
] as const;

export default function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getDashboardStats().then((r) => {
      if (!r.data || typeof r.data !== 'object' || Array.isArray(r.data)) {
        throw new Error('Invalid dashboard statistics response');
      }
      if (active) setStats(r.data);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  if (error) return <Alert color="red" title="Unable to load campus statistics">Please try again.<Button variant="subtle" size="sm" ml="sm" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Retry</Button></Alert>;
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg">
      {items.map((item) => stats ? (
        <Card key={item.key} className="stat-card" withBorder radius="lg" p="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Text size="sm" c="dimmed" fw={600}>{item.label}</Text>
            <ThemeIcon size={40} radius="md" variant="light" color={item.color}><item.icon size={22} stroke={1.7} /></ThemeIcon>
          </Group>
          <Title order={2} mt="sm" fz={32}>{formatDashboardCount(stats[item.key])}</Title>
        </Card>
      ) : <Skeleton key={item.key} height={150} radius="lg" aria-label={`Loading ${item.label}`} />)}
    </SimpleGrid>
  );
}
