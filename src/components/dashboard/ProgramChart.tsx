import { useEffect, useState } from 'react';
import { Card, Text, Skeleton } from '@mantine/core';
import useChartTheme from './useChartTheme';
import ReactApexChart from 'react-apexcharts';
import { getProgramsChart } from '../../lib/api';

export default function ProgramChart() {
  const chartTheme = useChartTheme();
  const [data, setData] = useState<{ program_initial: string | null; result_count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProgramsChart()
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton height={320} radius="md" />;

  return (
    <Card withBorder radius="lg" p="lg">
      <Text fw={700} mb="sm">Students by Program</Text>
      <ReactApexChart
        type="bar"
        height={280}
        options={{
          ...chartTheme,
          xaxis: { categories: data.map((d) => d.program_initial ?? 'Unassigned') },
          plotOptions: { bar: { borderRadius: 4 } },
          noData: { text: 'No data available' },
          dataLabels: { enabled: false },
        }}
        series={[{ name: 'Students', data: data.map((d) => d.result_count) }]}
      />
    </Card>
  );
}
