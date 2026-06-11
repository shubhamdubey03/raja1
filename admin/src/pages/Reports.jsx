import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart3, TrendingUp } from 'lucide-react';

const Reports = () => {
  const [report, setReport] = useState(null);
  const [range, setRange] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/reports/sales', { params: { range } });
        setReport(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [range]);

  const downloadPdfReport = async () => {
    try {
      const response = await api.get('/admin/reports/sales/pdf', {
        params: { range },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_report_${range}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Error downloading PDF report:', err);
      alert('Error downloading PDF report');
    }
  };

  const fmt = (paise) => `INR ${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap"><h1>Reports & Analytics</h1><p>Sales performance and insights</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="select-filter" style={{ marginBottom: 0 }} value={range} onChange={e => { setRange(e.target.value); setLoading(true); }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button className="btn btn-secondary" onClick={downloadPdfReport}>
            Download PDF
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--card-color': 'var(--primary)' }}>
          <div className="kpi-info"><span className="kpi-title">Total Orders</span><span className="kpi-value">{report?.total_orders || 0}</span></div>
          <div className="kpi-icon-wrap"><BarChart3 size={22} /></div>
        </div>
        <div className="kpi-card" style={{ '--card-color': 'var(--secondary)' }}>
          <div className="kpi-info"><span className="kpi-title">Revenue</span><span className="kpi-value">{fmt(report?.total_revenue)}</span></div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}><TrendingUp size={22} /></div>
        </div>
        <div className="kpi-card" style={{ '--card-color': 'var(--warning)' }}>
          <div className="kpi-info"><span className="kpi-title">Pending Orders</span><span className="kpi-value">{report?.pending_orders || 0}</span></div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}><BarChart3 size={22} /></div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header"><span className="card-title">Sales Trend ({range})</span></div>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <BarChart3 size={48} style={{ opacity: 0.5, marginBottom: 12 }} />
          <p>Chart visualization available with recharts integration</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
