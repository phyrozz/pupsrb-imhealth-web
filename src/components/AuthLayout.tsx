import type { ReactNode } from 'react';
import { Card, Group, Text, ThemeIcon, Title } from '@mantine/core';
import { IconHeartHandshake, IconArrowUpRight } from '@tabler/icons-react';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';

export default function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="auth-page">
      <header className="auth-header"><Brand /><ThemeToggle /></header>
      <main className={`auth-content${wide ? ' auth-content-wide' : ''}`} id="main-content">
        <section className="auth-intro">
          <Text className="eyebrow" mb="lg">STUDENT WELLBEING · PUP SANTA ROSA</Text>
          <Title order={1}>A little check-in.<br /><span className="brand-accent">A step toward<br />better wellbeing.</span></Title>
          <Text c="dimmed" size="lg" mt="xl" maw={420}>A space to understand how you feel and connect with your campus support.</Text>
          <Group className="auth-intro-note" mt={48} gap="md" wrap="nowrap">
            <ThemeIcon size={48} radius="xl" variant="light"><IconHeartHandshake size={26} /></ThemeIcon>
            <div><Text fw={650}>Your wellbeing matters</Text><Text c="dimmed" size="sm">One check-in at a time.</Text></div>
            <IconArrowUpRight size={22} className="brand-accent" />
          </Group>
        </section>
        <Card className="auth-card" p={{ base: 'lg', sm: 36 }} radius="lg">{children}</Card>
      </main>
      <footer className="auth-footer"><Text size="xs" c="dimmed">PUP Santa Rosa Branch · iMHealth</Text></footer>
    </div>
  );
}
