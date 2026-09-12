import { Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconHeartHandshake } from '@tabler/icons-react';

export default function Brand() {
  return (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon size={42} radius="md" variant="filled"><IconHeartHandshake size={27} stroke={1.6} /></ThemeIcon>
      <Stack gap={0}>
        <Text fw={750} size="lg" lh={1.2}>PUP <span className="brand-accent">iMHealth</span></Text>
        <Text size="xs" c="dimmed">Santa Rosa Branch</Text>
      </Stack>
    </Group>
  );
}
