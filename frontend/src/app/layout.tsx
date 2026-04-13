import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Stadium Experience',
  description: 'Next-Gen event experience for fans and operations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{ padding: '1.5rem', background: 'rgba(24, 24, 27, 0.4)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>
            <span className="text-gradient">Apex</span> Stadium
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a href="/" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>Home</a>
            <a href="/fan" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>Fan App</a>
            <a href="/command-center" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>Command Center</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
