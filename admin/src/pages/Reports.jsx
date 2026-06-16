import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        textAlign: 'left'
      }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.9rem', color: 'var(--secondary)' }}>
          Revenue: INR {payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
        {payload[1] && (
          <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
            Orders: {payload[1].value}
          </p>
        )}
      </div>
    );
  }
  return null;
};

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
        <div style={{ width: '100%', height: 350, marginTop: 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={report?.trend_data || []}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
              <XAxis 
                dataKey="label" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} 
              />
              <YAxis 
                yAxisId="left"
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(v) => `₹${v}`}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="revenue" 
                name="Revenue"
                stroke="var(--secondary)" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="orders" 
                name="Orders"
                stroke="var(--primary)" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorOrders)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;
