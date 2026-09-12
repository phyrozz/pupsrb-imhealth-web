import { useComputedColorScheme, useMantineTheme } from '@mantine/core';
import type { ApexOptions } from 'apexcharts';

export default function useChartTheme(): ApexOptions {
  const scheme = useComputedColorScheme('light');
  const theme = useMantineTheme();
  return {
    theme: { mode: scheme },
    chart: { background: 'transparent', foreColor: scheme === 'dark' ? '#c6ccda' : '#5c677a', fontFamily: theme.fontFamily, toolbar: { show: false }, animations: { enabled: false } },
    colors: [scheme === 'dark' ? '#f38aa4' : '#a91645', '#4c8fe8', '#9b7de2', '#d79420', '#2bafa0'],
    grid: { borderColor: scheme === 'dark' ? '#303b50' : '#e1e5ee', strokeDashArray: 4 },
    tooltip: { theme: scheme },
    dataLabels: { enabled: false },
  };
}
