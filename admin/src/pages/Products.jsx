import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', description: '', base_price: '', gst_rate: '18', stock_qty: '0', low_stock_threshold: '10', category_id: '', unit: 'piece' });

  const load = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/products', { params: { keyword: search || undefined, category_id: catFilter || undefined, page_size: 100 } }),
        api.get('/categories'),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, catFilter]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', sku: '', description: '', base_price: '', gst_rate: '18', stock_qty: '0', low_stock_threshold: '10', category_id: categories[0]?.id || '', unit: 'piece' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    setForm({ name: p.name, sku: p.sku, description: p.description || '', base_price: String(p.base_price), gst_rate: String(p.gst_rate), stock_qty: String(p.stock_qty), low_stock_threshold: String(p.low_stock_threshold), category_id: p.category_id, unit: p.unit });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, base_price: Number(form.base_price), gst_rate: Number(form.gst_rate), stock_qty: Number(form.stock_qty), low_stock_threshold: Number(form.low_stock_threshold) };
    try {
      if (editItem) {
        await api.patch(`/products/${editItem.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      load();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await api.patch(`/products/${id}`, { status: 'hidden' }); load(); }
    catch (err) { alert('Error deleting product'); }
  };

  const fmt = (paise) => `INR ${(paise / 100).toFixed(2)}`;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Products</h1>
          <p>Manage product catalog and pricing</p>
        </div>
        <button id="add-product-btn" className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Product</button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters">
            <select className="select-filter" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="table-search">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <table className="custom-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Base Price</th><th>GST</th><th>Stock</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.name}</td>
                <td>{p.sku}</td>
                <td>{categories.find(c => c.id === p.category_id)?.name || '—'}</td>
                <td>{fmt(p.base_price)}</td>
                <td>{p.gst_rate}%</td>
                <td><span className={`badge ${p.stock_qty <= 0 ? 'danger' : p.stock_qty <= p.low_stock_threshold ? 'warning' : 'active'}`}>{p.stock_qty}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-icon edit-btn" onClick={() => openEdit(p)}><Edit size={14} /></button>
                  <button className="btn-icon delete-btn" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No products found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Product' : 'Add Product'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Category</label>
                  <select className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group"><label className="form-label">Base Price (paise)</label><input className="form-input" type="number" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">GST Rate (%)</label>
                    <select className="form-select" value={form.gst_rate} onChange={e => setForm({ ...form, gst_rate: e.target.value })}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group"><label className="form-label">Stock Qty</label><input className="form-input" type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Low Stock Threshold</label><input className="form-input" type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
