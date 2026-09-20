import { Group, Title, Text, SimpleGrid, Badge } from '@mantine/core';
import { useAuth } from '../context/AuthContext';
import ScenarioChart from '../components/dashboard/ScenarioChart';
import ProgramChart from '../components/dashboard/ProgramChart';
import AssessmentTrendChart from '../components/dashboard/AssessmentTrendChart';
import MentalHealthTrendChart from '../components/dashboard/MentalHealthTrendChart';
import StatsCards from '../components/dashboard/StatsCards';

export default function DashboardPage() {
  const { session } = useAuth();
  const email = session?.getIdToken().payload.email ?? '';
  return (
    <>
      <Group justify="space-between" className="dashboard-heading">
        <div>
          <Text className="eyebrow" mb="xs">CAMPUS OVERVIEW</Text>
          <Title order={1}>Wellbeing dashboard</Title>
          <Text c="dimmed" mt="xs" className="dashboard-module-description">Welcome back{email ? `, ${email}` : ''}. Here is your campus at a glance.</Text>
        </div>
        <Badge variant="light" size="lg" color="brand">PUP Santa Rosa</Badge>
      </Group>
      <StatsCards />
      <Title order={3} mt="xl" mb={4}>Assessment insights</Title>
      <Text c="dimmed" size="sm" mb="lg">Participation, results, and trends across your campus.</Text>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <ScenarioChart /><ProgramChart /><AssessmentTrendChart /><MentalHealthTrendChart />
      </SimpleGrid>
    </>
  );
}
