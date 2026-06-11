import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { IndianRupee, ShoppingCart, Users, TrendingUp, Package, Clock } from 'lucide-react';

const Dashboard = () => {
  const [kpis, setKpis] = useState({ total_orders: 0, total_revenue: 0, active_vendors: 0, active_retailers: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, ordersRes, logsRes] = await Promise.all([
          api.get('/admin/reports/dashboard'),
          api.get('/orders?page_size=5'),
          api.get('/admin/audit-log?page_size=8'),
        ]);
        setKpis(dashRes.data);
        setRecentOrders(ordersRes.data);
        setAuditLogs(logsRes.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000); // Refresh every 60s (P6-03)
    return () => clearInterval(interval);
  }, []);

  const formatAmount = (paise) => `INR ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const cards = [
    { title: 'Total Orders', value: kpis.total_orders, icon: ShoppingCart, color: 'var(--primary)', bg: 'var(--primary-light)' },
    { title: 'Total Revenue', value: formatAmount(kpis.total_revenue), icon: IndianRupee, color: 'var(--secondary)', bg: 'var(--secondary-light)' },
    { title: 'Active Vendors', value: kpis.active_vendors, icon: Package, color: 'var(--info)', bg: 'var(--info-light)' },
    { title: 'Active Retailers', value: kpis.active_retailers, icon: Users, color: 'var(--warning)', bg: 'var(--warning-light)' },
  ];

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Dashboard</h1>
          <p>Platform overview & key metrics</p>
        </div>
      </div>

      <div className="kpi-grid">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="kpi-card" style={{ '--card-color': c.color, '--card-bg-light': c.bg }}>
              <div className="kpi-info">
                <span className="kpi-title">{c.title}</span>
                <span className="kpi-value">{c.value}</span>
              </div>
              <div className="kpi-icon-wrap"><Icon size={22} /></div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header"><span className="card-title">Recent Orders</span></div>
          {recentOrders.length === 0 ? (
            <div className="empty-state"><ShoppingCart size={40} /><h3>No orders yet</h3></div>
          ) : (
            <table className="custom-table">
              <thead><tr><th>Order #</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700 }}>{o.order_number}</td>
                    <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                    <td>{formatAmount(o.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-header"><span className="card-title">Activity Log</span></div>
          <div className="activity-list">
            {auditLogs.length === 0 ? (
              <div className="empty-state"><Clock size={32} /><p>No recent activity</p></div>
            ) : (
              auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--primary)' }} />
                  <div>
                    <div className="activity-text"><strong>{log.action}</strong> — {log.entity_type}</div>
                    <div className="activity-time">{new Date(log.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
