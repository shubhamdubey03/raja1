import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    image_url: '',
    visible_to_vendor: true,
    visible_to_retailer: true,
    parent_id: ''
  });

  const load = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({
      name: '',
      description: '',
      image_url: '',
      visible_to_vendor: true,
      visible_to_retailer: true,
      parent_id: ''
    });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditItem(c);
    setForm({
      name: c.name,
      description: c.description || '',
      image_url: c.image_url || '',
      visible_to_vendor: c.visible_to_vendor,
      visible_to_retailer: c.visible_to_retailer,
      parent_id: c.parent_id || ''
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': undefined }
      });
      setForm(prev => ({ ...prev, image_url: data.image_url }));
    } catch (err) {
      alert('Failed to upload image: ' + (err.response?.data?.message || err.response?.data?.detail || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      parent_id: form.parent_id && form.parent_id !== '' ? form.parent_id : null
    };
    try {
      if (editItem) {
        await api.patch(`/categories/${editItem.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error saving category');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (err) {
      alert('Error deleting category');
    }
  };

  const buildOrderedCategories = (flatCats) => {
    const rootCats = flatCats.filter(c => !c.parent_id);
    const subCats = flatCats.filter(c => c.parent_id);
    
    const ordered = [];
    rootCats.forEach(root => {
      ordered.push(root);
      const directSubs = subCats.filter(sub => sub.parent_id === root.id);
      directSubs.forEach(sub => {
        ordered.push(sub);
        const leafSubs = subCats.filter(leaf => leaf.parent_id === sub.id);
        leafSubs.forEach(leaf => {
          ordered.push(leaf);
        });
      });
    });
    
    flatCats.forEach(c => {
      if (!ordered.find(o => o.id === c.id)) {
        ordered.push(c);
      }
    });
    return ordered;
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const orderedCategories = buildOrderedCategories(filteredCategories);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Categories</h1>
          <p>Manage product categories and catalog visibility</p>
        </div>
        <button id="add-category-btn" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters" />
          <div className="table-search">
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder="Search categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Category Name</th>
              <th>Type</th>
              <th>Description</th>
              <th>Visibility</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orderedCategories.map(c => (
              <tr key={c.id}>
                <td>
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 4,
                      backgroundColor: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      fontWeight: 'bold'
                    }}>
                      N/A
                    </div>
                  )}
                </td>
                <td style={{ 
                  fontWeight: 700,
                  paddingLeft: c.parent_id ? (c.depth ? c.depth * 24 + 12 : 24) : 12,
                  color: c.parent_id ? 'var(--text-muted)' : 'var(--text-primary)'
                }}>
                  {c.parent_id && <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>└─</span>}
                  {c.name}
                </td>
                <td>
                  {c.parent_id ? (
                    <span style={{
                      fontSize: 10,
                      backgroundColor: '#E8F5E9',
                      color: '#1B5E20',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 'bold'
                    }}>
                      Sub-category
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 10,
                      backgroundColor: '#E3F2FD',
                      color: '#0D47A1',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 'bold'
                    }}>
                      Parent
                    </span>
                  )}
                </td>
                <td>{c.description || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.visible_to_vendor && (
                      <span style={{
                        fontSize: 10,
                        backgroundColor: '#E3F2FD',
                        color: '#0D47A1',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 'bold'
                      }}>
                        Vendor
                      </span>
                    )}
                    {c.visible_to_retailer && (
                      <span style={{
                        fontSize: 10,
                        backgroundColor: '#E8F5E9',
                        color: '#1B5E20',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 'bold'
                      }}>
                        Retailer
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${c.is_active ? 'active' : 'inactive'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon edit-btn" onClick={() => openEdit(c)}>
                      <Edit size={14} />
                    </button>
                    <button className="btn-icon delete-btn" onClick={() => handleDelete(c.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orderedCategories.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No categories found
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
              <h2>{editItem ? 'Edit Category' : 'Add Category'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Parent Category</label>
                  <select
                    className="form-input"
                    value={form.parent_id}
                    onChange={e => setForm({ ...form, parent_id: e.target.value })}
                  >
                    <option value="">None (Top-level category)</option>
                    {categories.filter(c => !c.parent_id && (!editItem || c.id !== editItem.id)).map(parent => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category Image</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                    {form.image_url ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={form.image_url}
                          alt="Preview"
                          style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            backgroundColor: '#FF3B30',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 10,
                            padding: 0
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        fontWeight: '600',
                        border: '1px dashed var(--border)'
                      }}>
                        No Image
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <label
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          padding: '6px 12px',
                          fontSize: 13,
                          fontWeight: '600'
                        }}
                      >
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        PNG, JPG or WEBP. Max 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id="visible_to_vendor"
                      checked={form.visible_to_vendor}
                      onChange={e => setForm({ ...form, visible_to_vendor: e.target.checked })}
                    />
                    <label htmlFor="visible_to_vendor" style={{ fontSize: 13, fontWeight: '600', cursor: 'pointer' }}>
                      Visible to Vendors
                    </label>
                  </div>
                  <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id="visible_to_retailer"
                      checked={form.visible_to_retailer}
                      onChange={e => setForm({ ...form, visible_to_retailer: e.target.checked })}
                    />
                    <label htmlFor="visible_to_retailer" style={{ fontSize: 13, fontWeight: '600', cursor: 'pointer' }}>
                      Visible to Retailers
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
