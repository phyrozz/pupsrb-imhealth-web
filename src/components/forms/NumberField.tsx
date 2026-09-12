import { NumberInput } from '@mantine/core';
import type { ComponentProps } from 'react';

export type NumberFieldProps = ComponentProps<typeof NumberInput>;

export default function NumberField(props: NumberFieldProps) {
  return <NumberInput {...props} />;
}
