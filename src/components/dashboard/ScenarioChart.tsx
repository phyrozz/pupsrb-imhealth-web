import { useEffect, useState } from 'react';
import { Card, Text, Skeleton } from '@mantine/core';
import useChartTheme from './useChartTheme';
import ReactApexChart from 'react-apexcharts';
import { getScenariosChart } from '../../lib/api';

export default function ScenarioChart() {
  const chartTheme = useChartTheme();
  const [data, setData] = useState<{ scenario_name: string; result_count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScenariosChart()
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton height={320} radius="md" />;

  return (
    <Card withBorder radius="lg" p="lg">
      <Text fw={700} mb="sm">Assessment Results by Scenario</Text>
      <ReactApexChart
        type="donut"
        height={280}
        options={{
          ...chartTheme,
          labels: data.map((d) => d.scenario_name),
          legend: { position: 'bottom' },
          noData: { text: 'No data available' },
        }}
        series={data.map((d) => d.result_count)}
      />
    </Card>
  );
}
