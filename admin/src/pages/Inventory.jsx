import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Warehouse, AlertTriangle, Plus, Upload, X } from 'lucide-react';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Stock adjustment states
  const [adjusting, setAdjusting] = useState(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // Add Product Modal States
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    base_price: '',
    gst_rate: '18',
    stock_qty: '0',
    low_stock_threshold: '10',
    category_id: '',
    sub_category_id: '',
    unit: 'piece'
  });

  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/products', { params: { page_size: 100 } }),
        api.get('/categories')
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdjust = async (productId) => {
    if (!adjQty || !adjReason) return alert('Please fill qty and reason');
    try {
      await api.patch(`/products/${productId}/stock`, { adjustment: Number(adjQty), reason: adjReason });
      setAdjusting(null); setAdjQty(''); setAdjReason('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error adjusting stock');
    }
  };

  const openCreateModal = () => {
    setForm({
      name: '',
      sku: '',
      description: '',
      base_price: '',
      gst_rate: '18',
      stock_qty: '0',
      low_stock_threshold: '10',
      category_id: String(categories.filter(c => !c.parent_id)[0]?.id || ''),
      sub_category_id: '',
      unit: 'piece'
    });
    setShowModal(true);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      base_price: Number(form.base_price),
      gst_rate: Number(form.gst_rate),
      stock_qty: Number(form.stock_qty),
      low_stock_threshold: Number(form.low_stock_threshold),
      sub_category_id: form.sub_category_id ? form.sub_category_id : null
    };
    try {
      await api.post('/products', payload);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error creating product');
    }
  };

  const handleBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const { data } = await api.post('/products/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(data.message || 'Bulk import successful!');
      load();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail;
      const detail = err.response?.data?.detail;
      if (typeof detail === 'object' && detail.errors) {
        alert(`${detail.message || errMsg}:\n\n${detail.errors.join('\n')}`);
      } else {
        alert(errMsg || 'Error importing bulk products');
      }
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const fmt = (paise) => `INR ${(paise / 100).toFixed(2)}`;

  const rootCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => String(c.parent_id) === String(form.category_id));

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const lowStock = products.filter(p => p.stock_qty <= p.low_stock_threshold && p.stock_qty > 0);
  const outOfStock = products.filter(p => p.stock_qty <= 0);

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Inventory</h1>
          <p>Stock levels and adjustments</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handleBulkUploadClick} disabled={uploading}>
            <Upload size={16} style={{ marginRight: 6 }} />
            {uploading ? 'Importing...' : 'Bulk Import (CSV/Excel)'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv, .xlsx, .xls"
            style={{ display: 'none' }}
          />
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} style={{ marginRight: 6 }} />
            Add Item
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--card-color': 'var(--primary)' }}>
          <div className="kpi-info">
            <span className="kpi-title">Total Products</span>
            <span className="kpi-value">{products.length}</span>
          </div>
          <div className="kpi-icon-wrap"><Warehouse size={22} /></div>
        </div>
        <div className="kpi-card" style={{ '--card-color': 'var(--warning)' }}>
          <div className="kpi-info">
            <span className="kpi-title">Low Stock</span>
            <span className="kpi-value">{lowStock.length}</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <AlertTriangle size={22} />
          </div>
        </div>
        <div className="kpi-card" style={{ '--card-color': 'var(--danger)' }}>
          <div className="kpi-info">
            <span className="kpi-title">Out of Stock</span>
            <span className="kpi-value">{outOfStock.length}</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.name}</td>
                <td>{p.sku}</td>
                <td style={{ fontWeight: 700 }}>{p.stock_qty}</td>
                <td>{p.low_stock_threshold}</td>
                <td>
                  <span className={`badge ${p.stock_qty <= 0 ? 'danger' : p.stock_qty <= p.low_stock_threshold ? 'warning' : 'active'}`}>
                    {p.stock_qty <= 0 ? 'Out of Stock' : p.stock_qty <= p.low_stock_threshold ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
                <td>
                  {adjusting === p.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="+/-"
                        value={adjQty}
                        onChange={e => setAdjQty(e.target.value)}
                        style={{ width: 70, padding: '6px 8px', fontSize: '0.82rem' }}
                      />
                      <input
                        className="form-input"
                        placeholder="Reason"
                        value={adjReason}
                        onChange={e => setAdjReason(e.target.value)}
                        style={{ width: 120, padding: '6px 8px', fontSize: '0.82rem' }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleAdjust(p.id)}>Go</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setAdjusting(null)}>✕</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => setAdjusting(p.id)}>Adjust</button>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No inventory items found. Add items to list.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Product / Inventory Item</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input className="form-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={form.category_id}
                      onChange={e => setForm({ ...form, category_id: e.target.value, sub_category_id: '' })}
                      required
                    >
                      <option value="">Select category</option>
                      {rootCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sub-Category</label>
                    <select
                      className="form-select"
                      value={form.sub_category_id}
                      onChange={e => setForm({ ...form, sub_category_id: e.target.value })}
                      disabled={!form.category_id || subCategories.length === 0}
                    >
                      <option value="">
                        {!form.category_id
                          ? 'Select Category first'
                          : subCategories.length === 0
                            ? 'No sub-categories'
                            : 'Select sub-category'}
                      </option>
                      {subCategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Base Price (paise)</label>
                    <input className="form-input" type="number" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Rate (%)</label>
                    <select className="form-select" value={form.gst_rate} onChange={e => setForm({ ...form, gst_rate: e.target.value })}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Initial Stock Qty</label>
                    <input className="form-input" type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Low Stock Threshold</label>
                    <input className="form-input" type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
