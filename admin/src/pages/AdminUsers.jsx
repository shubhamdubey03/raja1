import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Plus, X } from 'lucide-react';

const AdminUsers = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', mobile: '', password: '' });

  const load = async () => {
    try { const { data } = await api.get('/admin/users'); setAdmins(data); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await api.post('/admin/users', form); setShowModal(false); load(); }
    catch (err) { alert(err.response?.data?.message || err.response?.data?.detail || 'Error'); }
  };

  const toggleStatus = async (id, status) => {
    try { await api.patch(`/admin/users/${id}/status`, { status: status === 'active' ? 'blocked' : 'active' }); load(); }
    catch (err) { alert(err.response?.data?.message || err.response?.data?.detail || 'Error'); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap"><h1>Admin Security</h1><p>Super Admin only — manage admin accounts</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Add Admin</button>
      </div>
      <div className="table-container">
        <table className="custom-table">
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700 }}>{a.full_name}</td>
                <td>{a.email}</td>
                <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                <td><button className={`btn btn-sm ${a.status === 'active' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(a.id, a.status)}>{a.status === 'active' ? 'Block' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Create Admin</h2><button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Mobile</label><input className="form-input" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={8} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
