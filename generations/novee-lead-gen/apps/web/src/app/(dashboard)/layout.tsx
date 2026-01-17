import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/DashboardNav';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FingerprintCollector } from '@/components/FingerprintCollector';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated server-side
  const user = await getSessionUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Collect browser fingerprint after login */}
      <FingerprintCollector />

      {/* Header */}
      <DashboardHeader user={user} />

      <div className="flex">
        {/* Sidebar Navigation */}
        <DashboardNav />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
