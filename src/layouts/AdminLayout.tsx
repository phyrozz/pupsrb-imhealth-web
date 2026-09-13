import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Avatar, Burger, Group, Text, NavLink, Button, ScrollArea, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLayoutDashboard, IconUsers, IconClipboardList, IconFileReport, IconUser, IconLogout } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import Brand from '../components/Brand';
import ThemeToggle from '../components/ThemeToggle';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: IconLayoutDashboard },
  { label: 'Students', href: '/students', icon: IconUsers },
  { label: 'Assessments', href: '/student-assessments', icon: IconClipboardList },
  { label: 'Generate Report', href: '/generate-report', icon: IconFileReport },
  { label: 'My Account', href: '/my-account', icon: IconUser },
];

export default function AdminLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const email = session?.getIdToken().payload.email ?? '';
  const isReportRoute = pathname.startsWith('/generate-report');

  return (
    <AppShell header={{ height: 80 }} navbar={{ width: 268, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="lg">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AppShell.Header className="app-header">
        <Group h="100%" px={{ base: 'md', sm: 'xl' }} className="app-header-inner">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
            <Brand />
          </Group>
          <Group gap="md">
            <Text c="dimmed" size="sm" visibleFrom="md">Campus wellbeing workspace</Text>
            <ThemeToggle />
            <Avatar color="brand" radius="xl" size={36} visibleFrom="sm" aria-label="Administrator">{email.charAt(0).toUpperCase() || 'A'}</Avatar>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md" className="app-navbar">
        <AppShell.Section grow component={ScrollArea}>
          <Text size="xs" c="dimmed" fw={700} className="sidebar-caption">WORKSPACE</Text>
          <nav aria-label="Main navigation">
            {navItems.map((item) => {
              const isReportItem = item.href === '/generate-report';
              const isActive = pathname === item.href;
              return (
                <div key={item.href}>
                  <NavLink component={Link} to={item.href} label={item.label} leftSection={<item.icon size={21} stroke={1.7} />}
                    active={isActive} aria-current={isActive ? 'page' : undefined}
                    onClick={close} />
                  {isReportItem && isReportRoute && (
                    <Stack gap={0} className="report-subnav">
                <NavLink component={Link} to="/generate-report/by-program" label="By Program" active={pathname === '/generate-report/by-program'} onClick={close} />
                <NavLink component={Link} to="/generate-report/by-student" label="By Student" active={pathname === '/generate-report/by-student'} onClick={close} />
                    </Stack>
                  )}
                </div>
              );
            })}
          </nav>
        </AppShell.Section>
        <AppShell.Section className="sidebar-footer">
          <Text size="sm" fw={650} px="xs">Administrator</Text>
          <Text size="xs" c="dimmed" px="xs" mb="md" truncate>{email}</Text>
          <Button fullWidth variant="light" color="brand" leftSection={<IconLogout size={18} />}
            onClick={() => { signOut(); navigate('/login'); }}>Sign Out</Button>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main className="app-main">
        <div className="app-content" id="main-content" tabIndex={-1}><Outlet /></div>
      </AppShell.Main>
    </AppShell>
  );
}
