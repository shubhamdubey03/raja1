import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search } from 'lucide-react';

const statusOptions = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled', 'returned'];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      const params = { page, page_size: 20 };
      if (statusFilter) params.order_status = statusFilter;
      const { data } = await api.get('/orders', { params });
      setOrders(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, page]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      load();
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.detail || 'Error updating status'); }
  };

  const fmt = (paise) => `INR ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap"><h1>Orders</h1><p>Track and manage all orders</p></div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters">
            <select className="select-filter" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <table className="custom-table">
          <thead><tr><th>Order #</th><th>Status</th><th>Items</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Action</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 700 }}>
                  {o.order_number}
                  {o.return_image_url && (
                    <div style={{ marginTop: 4 }}>
                      <a
                        href={o.return_image_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: '#BA1A1A', textDecoration: 'underline', fontWeight: 'bold' }}
                      >
                        View Verification Image
                      </a>
                      {o.return_reason && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Reason: {o.return_reason}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                <td>{o.items?.length || 0}</td>
                <td>{fmt(o.subtotal)}</td>
                <td>{fmt(o.gst_amount)}</td>
                <td style={{ fontWeight: 700 }}>{fmt(o.grand_total)}</td>
                <td>
                  {o.status !== 'delivered' && o.status !== 'cancelled' && (
                    <select className="select-filter" value="" onChange={e => e.target.value && updateStatus(o.id, e.target.value)} style={{ fontSize: '0.78rem' }}>
                      <option value="">Update...</option>
                      {statusOptions.filter(s => s !== o.status).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No orders found</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
        <span style={{ padding: '6px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Page {page}</span>
        <button className="btn btn-secondary btn-sm" disabled={orders.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
};

export default Orders;
