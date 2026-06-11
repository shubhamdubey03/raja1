import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BookOpen, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const Ledger = () => {
  const [entries, setEntries] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/ledger', { params: { page_size: 50 } });
        setEntries(data.entries || []);
        setBalance(data.outstanding_balance || 0);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const fmt = (paise) => `INR ${(Math.abs(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const balanceColor = balance > 0 ? 'var(--danger)' : balance < 0 ? 'var(--secondary)' : 'var(--text-primary)';

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap"><h1>Ledger & Credit</h1><p>Track all debit and credit entries</p></div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="kpi-card" style={{ '--card-color': balanceColor }}>
          <div className="kpi-info">
            <span className="kpi-title">Outstanding Balance</span>
            <span className="kpi-value" style={{ color: balanceColor }}>{fmt(balance)}</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <BookOpen size={22} />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead><tr><th>Type</th><th>Amount</th><th>Reference</th><th>Description</th><th>Date</th></tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {e.entry_type === 'debit' ? <ArrowUpCircle size={16} color="var(--danger)" /> : <ArrowDownCircle size={16} color="var(--secondary)" />}
                    <span style={{ fontWeight: 700, color: e.entry_type === 'debit' ? 'var(--danger)' : 'var(--secondary)' }}>
                      {e.entry_type.toUpperCase()}
                    </span>
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{fmt(e.amount)}</td>
                <td>{e.reference_type}</td>
                <td>{e.description || '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No ledger entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Ledger;
