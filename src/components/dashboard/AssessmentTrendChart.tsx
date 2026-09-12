import { useEffect, useState } from 'react';
import { Card, Text, Skeleton } from '@mantine/core';
import useChartTheme from './useChartTheme';
import ReactApexChart from 'react-apexcharts';
import { getAssessmentTrend } from '../../lib/api';

export default function AssessmentTrendChart() {
  const chartTheme = useChartTheme();
  const [data, setData] = useState<{ date: string; count: number; scenario: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The API returns date/count rows for a single requested scenario.
    Promise.all(['None', 'Scenario 1', 'Scenario 2', 'Scenario 3'].map(async (scenario) => {
      const response = await getAssessmentTrend(scenario);
      return response.data.map((row) => ({ date: row.session_date, count: row.count, scenario }));
    }))
      .then((rows) => setData(rows.flat()))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton height={320} radius="md" />;

  // Group by scenario for multi-series line chart
  const scenarios = [...new Set(data.map((d) => d.scenario))];
  const dates = [...new Set(data.map((d) => d.date))].sort();
  const series = scenarios.map((s) => ({
    name: s,
    data: dates.map((date) => data.find((d) => d.date === date && d.scenario === s)?.count ?? 0),
  }));

  return (
    <Card withBorder radius="lg" p="lg">
      <Text fw={700} mb="sm">Assessment Trend</Text>
      <ReactApexChart
        type="line"
        height={280}
        options={{
          ...chartTheme,
          xaxis: { categories: dates, type: 'datetime' },
          noData: { text: 'No data available' },
          stroke: { curve: 'smooth' },
          legend: { position: 'bottom' },
        }}
        series={series}
      />
    </Card>
  );
}
