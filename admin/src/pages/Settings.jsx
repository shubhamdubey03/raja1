import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search } from 'lucide-react';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const params = { page_size: 50 };
        if (filter) params.action = filter;
        const { data } = await api.get('/admin/audit-log', { params });
        setLogs(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [filter]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap"><h1>Settings</h1><p>Audit log and system configuration</p></div>
      </div>
      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600 }}>Audit Log</span>
          <div className="table-search">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Filter by action..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
        </div>
        <table className="custom-table">
          <thead><tr><th>Action</th><th>Entity</th><th>Role</th><th>Changes</th><th>Time</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ fontWeight: 700 }}>{l.action}</td>
                <td>{l.entity_type}</td>
                <td><span className="badge info">{l.role}</span></td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.diff_json ? JSON.stringify(l.diff_json) : '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLog;
