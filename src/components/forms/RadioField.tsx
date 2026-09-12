import { Radio } from '@mantine/core';
import type { ComponentProps } from 'react';

export type RadioFieldProps = ComponentProps<typeof Radio.Group>;
export type RadioOptionProps = ComponentProps<typeof Radio>;

export function RadioField(props: RadioFieldProps) {
  return <Radio.Group {...props} />;
}

export function RadioOption(props: RadioOptionProps) {
  return <Radio {...props} />;
}
