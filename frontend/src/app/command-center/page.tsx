"use client";

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CommandCenter() {
  const [zones, setZones] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState('info');
  const [socket, setSocket] = useState<Socket | null>(null);

  // Mock data for the chart to simulate density over time
  const [chartData, setChartData] = useState(
    Array.from({ length: 10 }).map((_, i) => ({ time: `10:${i}0`, GateA: 20 + Math.random()*20, Concourse: 40 + Math.random()*30 }))
  );

  useEffect(() => {
    const s = io('http://localhost:8080');
    setSocket(s);

    s.on('new_order', (order) => {
      setOrders(prev => [order, ...prev]);
    });

    s.on('alert_dismissed', (id) => {
      setAlerts(prev => prev.filter(a => a._id !== id));
    });

    s.on('emergency_alert', (newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    s.on('density_update', (updatedZone) => {
      setZones(prev => prev.map(z => z._id === updatedZone._id ? { ...z, ...updatedZone } : z));
      
      setChartData(prev => {
        if (updatedZone._id === '1' || updatedZone._id === '2') {
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          const newData = { 
            time: timeStr, 
            GateA: prev[prev.length - 1].GateA, 
            Concourse: prev[prev.length - 1].Concourse 
          };
          if (updatedZone._id === '1') newData.GateA = updatedZone.currentDensity;
          if (updatedZone._id === '2') newData.Concourse = updatedZone.currentDensity;
          return [...prev.slice(1), newData];
        }
        return prev;
      });
    });

    fetch('http://localhost:8080/api/orders')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setOrders(data); })
      .catch(console.error);

    fetch('http://localhost:8080/api/alerts')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAlerts(data); })
      .catch(console.error);

    // Mock initial zones
    setZones([
      { _id: '1', name: 'North Concourse Restroom', currentDensity: 85, estimatedWaitTime: 12 },
      { _id: '2', name: 'Burger & Fries Stand', currentDensity: 40, estimatedWaitTime: 5 },
      { _id: '3', name: 'South Exit Gate', currentDensity: 20, estimatedWaitTime: 1 }
    ]);

    return () => { s.disconnect(); };
  }, []);

  const sendAlert = (e: any) => {
    e.preventDefault();
    fetch('http://localhost:8080/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: alertMsg, type: alertType })
    }).then(res => res.json()).then(data => {
      setAlertMsg('');
      alert('Alert Broadcasted');
    });
  };

  const dismissAlert = (id: string) => {
    fetch(`http://localhost:8080/api/alerts/${id}`, { method: 'DELETE' })
      .catch(err => console.error(err));
  };

  // Function to simulate a camera/sensor density update and trigger ML prediction
  const simulateSensorUpdate = (zoneId: string, newDensity: number) => {
    // Optimistic UI update for the slider
    setZones(prev => prev.map(z => z._id === zoneId ? { ...z, currentDensity: newDensity } : z));

    // 1. Get Prediction from Python ML Service
    const targetZone = zones.find(z => z._id === zoneId);
    if (!targetZone) return;

    fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone_id: zoneId,
        current_density: newDensity,
        capacity: 500 // mock capacity
      })
    })
    .then(res => res.json())
    .then(prediction => {
      // 2. Push update to backend exactly like a real IoT app
      const finalDensity = newDensity;
      const waitTime = prediction.predicted_wait_time_minutes;
      
      // Update our local state optimistically or through socket
      if (socket) {
        socket.emit('update_density', { zoneId, density: finalDensity, waitTime });
      }
    })
    .catch(err => {
      console.error("ML service failed, fallback to socket only", err);
      if (socket) {
        socket.emit('update_density', { zoneId, density: newDensity });
      }
    });
  };

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Central Command Center</h2>
        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', border: '1px solid var(--success)', fontSize: '0.875rem' }}>
          AI Predictive Engine: ONLINE
        </span>
      </div>

      <div className="grid grid-cols-3">
        {/* Left Column: Alerts & Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel">
            <h3>Broadcast Alert</h3>
            <form onSubmit={sendAlert} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select value={alertType} onChange={e => setAlertType(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)' }}>
                <option value="info">General Info</option>
                <option value="warning">Warning / Delay</option>
                <option value="emergency">Emergency Alert</option>
              </select>
              <textarea required value={alertMsg} onChange={e => setAlertMsg(e.target.value)} placeholder="Type alert message to broadcast to all fan devices..." rows={3} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', resize: 'none' }}></textarea>
              <button type="submit" className="btn btn-primary">Send Broadcast</button>
            </form>
          </div>

          <div className="glass-panel">
            <h3>Active Broadcasts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
              {alerts.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No active alerts.</p> : alerts.map((a, i) => (
                <div key={i} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', borderLeft: `3px solid var(--${a.type === 'emergency' ? 'danger' : a.type === 'warning' ? 'warning' : 'primary-color'})`, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.875rem' }}>{a.message}</div>
                  <button onClick={() => dismissAlert(a._id)} style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '1.25rem', cursor: 'pointer', lineHeight: '1', opacity: 0.7 }} title="Dismiss">&times;</button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ flex: 1 }}>
            <h3>Incoming Orders</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {orders.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No live orders.</p> : orders.map((o, i) => (
                <div key={i} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', borderLeft: '3px solid var(--primary-color)' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Seat: {o.seatNumber} <span style={{ float: 'right', color: 'var(--success)' }}>${o.totalAmount}</span></div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {o.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Density & Charts */}
        <div className="grid-cols-2" style={{ gridColumn: 'span 2 / span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel">
            <h3>Live Density Trends</h3>
            <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
                  <Line type="monotone" dataKey="GateA" stroke="var(--primary-color)" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Concourse" stroke="var(--accent-color)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel">
            <h3>Zone Sensor Controls (Simulator)</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {zones.map(zone => (
                <div key={zone._id} style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', height: '40px' }}>{zone.name}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: zone.currentDensity > 75 ? 'var(--danger)' : zone.currentDensity > 50 ? 'var(--warning)' : 'var(--success)' }}>
                    {zone.currentDensity}%
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Est Wait: {zone.estimatedWaitTime}m</div>
                  <input type="range" min="0" max="100" value={zone.currentDensity} onChange={e => simulateSensorUpdate(zone._id, parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
