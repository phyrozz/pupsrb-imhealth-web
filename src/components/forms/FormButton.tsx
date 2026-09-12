import { Button } from '@mantine/core';
import type { ButtonProps } from '@mantine/core';
import type { ComponentPropsWithoutRef } from 'react';

export type FormButtonProps = ButtonProps & ComponentPropsWithoutRef<'button'>;

export default function FormButton(props: FormButtonProps) {
  return <Button {...props} />;
}
