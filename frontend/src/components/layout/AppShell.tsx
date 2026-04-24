import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@/utils/cn';

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="min-h-screen bg-card">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className={cn('flex-1 p-6 bg-background', className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
