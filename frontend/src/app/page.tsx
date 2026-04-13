export default function Home() {
  return (
    <main className="container" style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>
        Welcome to the <span className="text-gradient">Smart Stadium</span>
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px' }}>
        Experience the future of live events with real-time crowd management, predictive wait times, and seamless mobile food ordering.
      </p>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <a href="/fan" className="btn btn-primary" style={{ textDecoration: 'none', fontSize: '1.1rem' }}>Enter Fan Experience</a>
        <a href="/command-center" className="btn" style={{ background: 'var(--bg-card)', color: 'white', textDecoration: 'none', border: '1px solid var(--glass-border)', fontSize: '1.1rem' }}>Command Center</a>
      </div>
    </main>
  );
}
