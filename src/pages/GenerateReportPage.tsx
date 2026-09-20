import { useNavigate } from 'react-router-dom';
import { Title, SimpleGrid, Card, Text, Button, Group } from '@mantine/core';
import { usePermissions } from '../context/PermissionsContext';
import { IconArrowRight, IconFileReport } from '@tabler/icons-react';

export default function GenerateReportPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();

  return (
    <>
      <Title order={2} mb="xl">Generate Report</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder radius="md" p="xl" mih={240}>
          <Group mb="sm" gap="xs">
            <IconFileReport size={20} />
            <Text fw={700}>Generate by Program</Text>
          </Group>
          <Text size="sm" c="dimmed" mb="auto">
            Generate a report by program such as BSIT or BSECE. Choose PDF, CSV, or Excel, and receive it by email when it is ready.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button disabled={!can('assessments')} rightSection={<IconArrowRight size={16} />} onClick={() => navigate('/generate-report/by-program')}>
              Open report builder
            </Button>
          </Group>
        </Card>

        <Card withBorder radius="md" p="xl" mih={240}>
          <Group mb="sm" gap="xs">
            <IconFileReport size={20} />
            <Text fw={700}>Generate by Student</Text>
          </Group>
          <Text size="sm" c="dimmed" mb="auto">
            Generate a report by individual student. Choose PDF, CSV, or Excel, and receive it by email when it is ready.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button disabled={!can('students') || !can('assessments')} rightSection={<IconArrowRight size={16} />} onClick={() => navigate('/generate-report/by-student')}>
              Open report builder
            </Button>
          </Group>
        </Card>
      </SimpleGrid>
    </>
  );
}
