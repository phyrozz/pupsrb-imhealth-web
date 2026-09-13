import { Card, Group, type CardProps } from '@mantine/core';
import type { ReactNode } from 'react';

interface DataToolbarProps extends CardProps {
  children: ReactNode;
}

/** A responsive, bordered control area shared by searchable/filterable admin tables. */
export default function DataToolbar({ children, ...cardProps }: DataToolbarProps) {
  return (
    <Card withBorder radius="md" p="md" {...cardProps}>
      <Group align="flex-end" gap="sm" wrap="wrap">
        {children}
      </Group>
    </Card>
  );
}
