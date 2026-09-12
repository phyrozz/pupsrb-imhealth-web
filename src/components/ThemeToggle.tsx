import { ActionIcon, Menu, useMantineColorScheme } from '@mantine/core';
import { IconCheck, IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';

const appearances = [
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
  { value: 'auto', label: 'Use system setting', icon: IconDeviceDesktop },
] as const;

export default function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const Icon = appearances.find((item) => item.value === colorScheme)?.icon ?? IconDeviceDesktop;
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="default" radius="xl" aria-label="Change appearance" title="Change appearance">
          <Icon size={20} stroke={1.7} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Appearance</Menu.Label>
        {appearances.map((item) => (
          <Menu.Item key={item.value} leftSection={<item.icon size={17} />}
            rightSection={colorScheme === item.value ? <IconCheck size={16} /> : undefined}
            onClick={() => setColorScheme(item.value)}>{item.label}</Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
