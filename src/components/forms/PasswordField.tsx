import { PasswordInput } from '@mantine/core';
import type { ComponentProps } from 'react';

export type PasswordFieldProps = ComponentProps<typeof PasswordInput>;

export default function PasswordField(props: PasswordFieldProps) {
  return <PasswordInput {...props} />;
}
