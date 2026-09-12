import { useEffect, useState } from 'react';
import { Card, Text, Skeleton } from '@mantine/core';
import useChartTheme from './useChartTheme';
import ReactApexChart from 'react-apexcharts';
import { getMentalHealthTrend } from '../../lib/api';

interface TrendRow { created_at: string; count: number; }

export default function MentalHealthTrendChart() {
  const chartTheme = useChartTheme();
  const [uptrend, setUptrend] = useState<TrendRow[]>([]);
  const [downtrend, setDowntrend] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMentalHealthTrend()
      .then((r) => {
        setUptrend(r.data?.uptrend ?? []);
        setDowntrend(r.data?.downtrend ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton height={320} radius="md" />;

  const dates = [...new Set([...uptrend.map((d) => d.created_at), ...downtrend.map((d) => d.created_at)])].sort();

  return (
    <Card withBorder radius="lg" p="lg">
      <Text fw={700} mb="sm">Mental Health Trend</Text>
      <ReactApexChart
        type="area"
        height={280}
        options={{
          ...chartTheme,
          xaxis: { categories: dates, type: 'datetime' },
          noData: { text: 'No data available' },
          stroke: { curve: 'smooth' },
          legend: { position: 'bottom' },
          colors: ['#40c057', '#fa5252'],
        }}
        series={[
          { name: 'Uptrend', data: dates.map((d) => uptrend.find((r) => r.created_at === d)?.count ?? 0) },
          { name: 'Downtrend', data: dates.map((d) => downtrend.find((r) => r.created_at === d)?.count ?? 0) },
        ]}
      />
    </Card>
  );
}
