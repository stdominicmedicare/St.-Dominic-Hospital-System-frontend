/**
 * Base layout: Header, department Sidebar, main, Footer, MobileNav.
 */
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import MobileNav from './MobileNav';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[#F2FAF7]">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-1">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-24 md:p-6 lg:p-8 lg:pb-6">
            {children}
          </main>
        </div>
        <Footer />
      </div>
      <MobileNav />
    </div>
  );
}
