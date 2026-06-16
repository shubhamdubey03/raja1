import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Users as UsersIcon } from 'lucide-react';

const Users = () => {
  const [tab, setTab] = useState('vendors');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    mobile: '',
    full_name: '',
    business_name: '',
    password: '',
    gst_number: '',
    pan_number: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!newVendor.mobile || !newVendor.full_name || !newVendor.business_name || !newVendor.password) {
      alert('Please fill in all required fields (Mobile, Full Name, Business Name, Password)');
      return;
    }
    let formattedMobile = newVendor.mobile.trim();
    if (!formattedMobile.startsWith('+')) {
      if (formattedMobile.length === 10) {
        formattedMobile = `+91${formattedMobile}`;
      } else {
        alert('Please enter a valid 10-digit mobile number or include country code (e.g. +91...)');
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post('/vendor/create', {
        ...newVendor,
        mobile: formattedMobile,
      });
      alert('Vendor created successfully!');
      setShowAddModal(false);
      setNewVendor({
        mobile: '',
        full_name: '',
        business_name: '',
        password: '',
        gst_number: '',
        pan_number: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
      });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.message || 'Error creating vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'vendors' ? '/admin/vendors' : '/admin/retailers';
      const { data } = await api.get(endpoint);
      setUsers(data);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [tab]);

  const toggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      const endpoint = tab === 'vendors' 
        ? `/admin/vendors/${userId}/status` 
        : `/admin/retailers/${userId}/status`;
      await api.patch(endpoint, { status: newStatus });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error updating status');
    }
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const nameMatch = u.full_name?.toLowerCase().includes(query);
    const mobileMatch = u.mobile?.includes(query);
    const profile = tab === 'vendors' ? u.vendor_profile : u.retailer_profile;
    const bizMatch = profile?.business_name?.toLowerCase().includes(query);
    return nameMatch || mobileMatch || bizMatch;
  });

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>User Management</h1>
          <p>Manage registered vendors and retailers</p>
        </div>
        {tab === 'vendors' && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Add Vendor
          </button>
        )}
      </div>

      <div className="tab-row">
        <button className={`tab-btn ${tab === 'vendors' ? 'active' : ''}`} onClick={() => setTab('vendors')}>Vendors</button>
        <button className={`tab-btn ${tab === 'retailers' ? 'active' : ''}`} onClick={() => setTab('retailers')}>Retailers</button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              {tab === 'vendors' ? 'Vendor Directory' : 'Retailer Directory'}
            </span>
            <div style={{ position: 'relative', width: '300px' }}>
              <input
                type="text"
                placeholder="Search by name, mobile, business..."
                className="form-input"
                style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: '3rem 0' }}><div className="spinner" /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 0' }}>
            <UsersIcon size={40} style={{ color: 'var(--primary)' }} />
            <h3>No users found</h3>
            <p>Try refining your search or add users to start seeing data.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              {tab === 'vendors' ? (
                <tr>
                  <th>Business Details</th>
                  <th>Contact Info</th>
                  <th>GSTIN / PAN</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              ) : (
                <tr>
                  <th>Business Details</th>
                  <th>Owner Name</th>
                  <th>Contact Info</th>
                  <th>Type</th>
                  <th>Credit Limit</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                if (tab === 'vendors') {
                  const vp = u.vendor_profile || {};
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{vp.business_name || 'N/A'}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contact Person: {u.full_name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{u.mobile}</span>
                          {u.email && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>GST: {vp.gst_number || 'N/A'}</span>
                          {vp.pan_number && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PAN: {vp.pan_number}</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{vp.city || 'N/A'}, {vp.state || 'N/A'}</span>
                          {vp.address && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={vp.address}>{vp.address}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.status}`}>{u.status}</span>
                      </td>
                      <td>
                        <button 
                          className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`} 
                          onClick={() => toggleStatus(u.id, u.status)}
                        >
                          {u.status === 'active' ? 'Block' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                } else {
                  const rp = u.retailer_profile || {};
                  return (
                    <tr key={u.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rp.business_name || 'N/A'}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{rp.owner_name || u.full_name}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{u.mobile}</span>
                          {u.email && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</span>}
                        </div>
                      </td>
                      <td>{rp.business_type || 'N/A'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                        INR {(rp.credit_limit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{rp.city || 'N/A'}, {rp.state || 'N/A'}</span>
                          {rp.address && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={rp.address}>{rp.address}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.status}`}>{u.status}</span>
                      </td>
                      <td>
                        <button 
                          className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`} 
                          onClick={() => toggleStatus(u.id, u.status)}
                        >
                          {u.status === 'active' ? 'Block' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Add New Vendor</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>
            <form onSubmit={handleAddVendor}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={newVendor.full_name}
                      onChange={e => setNewVendor({ ...newVendor, full_name: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={newVendor.mobile}
                      onChange={e => setNewVendor({ ...newVendor, mobile: e.target.value })}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Business Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={newVendor.business_name}
                      onChange={e => setNewVendor({ ...newVendor, business_name: e.target.value })}
                      placeholder="e.g. Sharma Logistics"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input
                      type="password"
                      className="form-input"
                      required
                      value={newVendor.password}
                      onChange={e => setNewVendor({ ...newVendor, password: e.target.value })}
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">GST Number (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newVendor.gst_number}
                      onChange={e => setNewVendor({ ...newVendor, gst_number: e.target.value })}
                      placeholder="15-character GSTIN"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN Number (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newVendor.pan_number}
                      onChange={e => setNewVendor({ ...newVendor, pan_number: e.target.value })}
                      placeholder="10-character PAN"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newVendor.address}
                    onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                    placeholder="Street address, locality"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">City (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newVendor.city}
                      onChange={e => setNewVendor({ ...newVendor, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newVendor.state}
                      onChange={e => setNewVendor({ ...newVendor, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newVendor.pincode}
                      onChange={e => setNewVendor({ ...newVendor, pincode: e.target.value })}
                      placeholder="6-digit ZIP"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
