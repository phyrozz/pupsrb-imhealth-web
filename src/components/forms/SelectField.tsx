import { Select } from '@mantine/core';
import type { ComponentProps } from 'react';

export type SelectFieldProps = ComponentProps<typeof Select>;

export default function SelectField(props: SelectFieldProps) {
  return <Select {...props} />;
}
