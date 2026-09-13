import { Center, Paper, Stack, Text, ThemeIcon, type PaperProps } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface DataTableShellProps extends PaperProps {
  children?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
}

/** A table container with predictable loading and empty states for admin modules. */
export default function DataTableShell({
  children,
  loading = false,
  empty = false,
  emptyTitle = 'Nothing to show yet',
  emptyDescription,
  emptyIcon,
  ...paperProps
}: DataTableShellProps) {
  if (loading || empty) {
    return (
      <Paper withBorder radius="md" p="xl" {...paperProps}>
        <Center mih={260}>
          {loading ? (
            <span className="data-table-loading" aria-label="Loading" />
          ) : (
            <Stack align="center" gap="xs" maw={420} ta="center">
              <ThemeIcon variant="light" color="gray" size={48} radius="xl">
                {emptyIcon ?? <IconInbox size={24} />}
              </ThemeIcon>
              <Text fw={600}>{emptyTitle}</Text>
              {emptyDescription && <Text size="sm" c="dimmed">{emptyDescription}</Text>}
            </Stack>
          )}
        </Center>
      </Paper>
    );
  }

  return <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }} {...paperProps}>{children}</Paper>;
}
