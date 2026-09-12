import { TextInput } from '@mantine/core';
import type { ComponentProps } from 'react';

export type TextFieldProps = ComponentProps<typeof TextInput>;

export default function TextField(props: TextFieldProps) {
  return <TextInput {...props} />;
}
