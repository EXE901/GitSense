'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Footer } from '@/components/dashboard/footer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background safe-area-inset-all">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Page content */}
        <div className="flex-1 overflow-y-auto scroll-smooth-container reduce-shift momentum-scroll">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 will-animate-gpu">
            {children}
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </main>
    </div>
  );
}
