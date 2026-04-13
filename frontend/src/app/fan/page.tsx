"use client";

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const MENU = [
  { id: 'burger', name: 'Classic Burger Combo', price: 15 },
  { id: 'nachos', name: 'Loaded Nachos', price: 12 },
  { id: 'beer', name: 'Draft Beer', price: 9 }
];

export default function FanApp() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{ seat: string, items: Record<string, number> }>({ seat: '', items: {} });

  useEffect(() => {
    // Connect to backend WebSocket
    const socket: Socket = io('http://localhost:8080');

    socket.on('emergency_alert', (newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    socket.on('alert_dismissed', (id) => {
      setAlerts(prev => prev.filter(a => a._id !== id));
    });

    socket.on('density_update', (updatedZone) => {
      setZones(prev => prev.map(z => z._id === updatedZone._id ? updatedZone : z));
    });

    // Fetch initial data
    fetch('http://localhost:8080/api/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlerts(data);
        } else {
          // Fallback silently if backend database is offline
          setAlerts([]);
        }
      })
      .catch(err => console.error(err));

    // Mock initial zones for UI display if backend isn't populated
    setZones([
      { _id: '1', name: 'North Concourse Restroom', currentDensity: 85, estimatedWaitTime: 12 },
      { _id: '2', name: 'Burger & Fries Stand', currentDensity: 40, estimatedWaitTime: 5 },
      { _id: '3', name: 'South Exit Gate', currentDensity: 20, estimatedWaitTime: 1 }
    ]);

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOrder = (e: any) => {
    e.preventDefault();
    const orderItems = MENU.filter(m => orderDetails.items[m.id] > 0).map(m => ({
      name: m.name,
      quantity: orderDetails.items[m.id],
      price: m.price
    }));

    if (orderItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    fetch('http://localhost:8080/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatNumber: orderDetails.seat,
        items: orderItems,
        totalAmount
      })
    }).then(res => res.json()).then(data => {
      alert('Order Placed Successfully!');
      setOrdering(false);
      setOrderDetails({ seat: '', items: {} });
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrderDetails(prev => {
      const current = prev.items[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, items: { ...prev.items, [id]: next } };
    });
  };

  return (
    <main className="container">
      <h2>Fan Dashboard</h2>
      
      {Array.isArray(alerts) && alerts.map((alert, i) => (
        <div key={i} className={`alert-banner alert-${alert.type || 'info'}`}>
          <span style={{ marginRight: '10px', fontSize: '1.25rem' }}>
            {alert.type === 'emergency' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          {alert.message}
        </div>
      ))}

      <div className="grid grid-cols-2" style={{ marginTop: '2rem' }}>
        <div>
          <h3>Live Wait Times</h3>
          <div className="grid">
            {zones.map(zone => (
              <div key={zone._id} className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>{zone.name}</span>
                  <span className={zone.currentDensity > 75 ? 'text-gradient' : ''} style={{ fontWeight: 800 }}>
                    {zone.estimatedWaitTime} min
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${zone.currentDensity}%`, 
                    height: '100%', 
                    background: zone.currentDensity > 75 ? 'var(--danger)' : zone.currentDensity > 50 ? 'var(--warning)' : 'var(--success)',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>In-Seat Ordering</h3>
          <div className="glass-panel text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            {!ordering ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍔</div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Skip the line and get food delivered right to your seat.</p>
                <button className="btn btn-primary" onClick={() => setOrdering(true)}>Start Order</button>
              </>
            ) : (
              <form onSubmit={handleOrder} style={{ width: '100%', textAlign: 'left' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Seat Number</label>
                  <input required placeholder="e.g. Sec 112, Row D, Seat 5" value={orderDetails.seat} onChange={e => setOrderDetails({...orderDetails, seat: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.5)', color: 'white' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>What would you like?</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {MENU.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>${m.price}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button type="button" onClick={() => updateQuantity(m.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}>-</button>
                          <span style={{ width: '20px', textAlign: 'center' }}>{orderDetails.items[m.id] || 0}</span>
                          <button type="button" onClick={() => updateQuantity(m.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Place Order</button>
                  <button type="button" className="btn" onClick={() => setOrdering(false)} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'white' }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
