import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex relative">
      <div className="fixed inset-0 z-0">
        <img
          src="https://wisemedia.io/wp-content/uploads/2025/10/IMG-5-Wise-Media.webp"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70"></div>
      </div>

      <Sidebar />

      <div className="flex-1 flex flex-col lg:ml-64 relative z-10">
        <TopNav />

        <main className="flex-1 overflow-auto p-4 lg:p-8 pt-20 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
