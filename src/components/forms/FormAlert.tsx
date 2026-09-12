import { Alert } from '@mantine/core';
import type { ComponentProps } from 'react';

export type FormAlertProps = ComponentProps<typeof Alert>;

export default function FormAlert(props: FormAlertProps) {
  return <Alert {...props} />;
}
