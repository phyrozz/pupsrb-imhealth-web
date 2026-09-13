import { Group, Stack, Text, Title, type GroupProps } from '@mantine/core';
import type { ReactNode } from 'react';

interface AdminPageHeaderProps extends GroupProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** A consistent heading and action area for admin data-management pages. */
export default function AdminPageHeader({
  title,
  description,
  actions,
  ...stackProps
}: AdminPageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md" {...stackProps}>
      <Stack gap={4} maw={720}>
        <Title order={2}>{title}</Title>
        {description && <Text c="dimmed">{description}</Text>}
      </Stack>
      {actions && <Group gap="sm" wrap="wrap">{actions}</Group>}
    </Group>
  );
}
