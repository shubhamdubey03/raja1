import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Tag, Percent, Calendar, Plus, Trash2, X, Users, ShoppingBag } from 'lucide-react';

const Schemes = () => {
  const [activeTab, setActiveTab] = useState('discounts');
  const [discounts, setDiscounts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);

  // Discount form state
  const [discountForm, setDiscountForm] = useState({
    code: '',
    discount_type: 'percentage',
    value: '', // in percentage or rupees
    min_order_value: '0', // in rupees
    max_usage_count: '0',
    valid_from: '',
    valid_until: '',
    scope_type: '', // '', 'product', 'category'
    scope_id: '',
    applicable_to: 'all',
    description: ''
  });

  // Scheme form state
  const [schemeForm, setSchemeForm] = useState({
    user_id: '', // Empty means all dealers
    scheme_type: 'volume', // 'volume', 'buy_x_get_y'
    product_id: '',
    category_id: '',
    min_qty: '0',
    discount_pct: '0', // in percentage
    free_qty: '0',
    valid_from: '',
    valid_until: '',
    description: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [discRes, schemeRes, prodRes, catRes, retRes] = await Promise.all([
        api.get('/admin/discounts'),
        api.get('/admin/dealer-schemes'),
        api.get('/products', { params: { page_size: 100 } }),
        api.get('/categories'),
        api.get('/admin/retailers')
      ]);
      setDiscounts(discRes.data);
      setSchemes(schemeRes.data);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setRetailers(retRes.data);
    } catch (err) {
      console.error('Error loading discounts/schemes data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format currencies
  const fmt = (paise) => `INR ${(paise / 100).toFixed(2)}`;

  // Create Discount Code
  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    try {
      const isPercent = discountForm.discount_type === 'percentage';
      const payload = {
        code: discountForm.code.toUpperCase().trim(),
        discount_type: discountForm.discount_type,
        value: isPercent ? Math.round(Number(discountForm.value) * 100) : Math.round(Number(discountForm.value) * 100),
        min_order_value: Math.round(Number(discountForm.min_order_value) * 100),
        max_usage_count: Number(discountForm.max_usage_count),
        valid_from: new Date(discountForm.valid_from).toISOString(),
        valid_until: new Date(discountForm.valid_until).toISOString(),
        scope_type: discountForm.scope_type || null,
        scope_id: discountForm.scope_id || null,
        applicable_to: discountForm.applicable_to,
        description: discountForm.description || null
      };

      await api.post('/admin/discounts', payload);
      setShowDiscountModal(false);
      alert('Discount code created successfully!');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error creating discount code');
    }
  };

  // Delete Discount Code
  const handleDeleteDiscount = async (id) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    try {
      await api.delete(`/admin/discounts/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error deleting discount code');
    }
  };

  // Create Dealer Scheme
  const handleCreateScheme = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        user_id: schemeForm.user_id || null,
        scheme_type: schemeForm.scheme_type,
        product_id: schemeForm.product_id || null,
        category_id: schemeForm.category_id || null,
        min_qty: Number(schemeForm.min_qty),
        discount_pct: Math.round(Number(schemeForm.discount_pct) * 100),
        free_qty: Number(schemeForm.free_qty),
        valid_from: new Date(schemeForm.valid_from).toISOString(),
        valid_until: new Date(schemeForm.valid_until).toISOString(),
        description: schemeForm.description || null
      };

      await api.post('/admin/dealer-schemes', payload);
      setShowSchemeModal(false);
      alert('Dealer scheme created successfully!');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error creating dealer scheme');
    }
  };

  // Delete Dealer Scheme
  const handleDeleteScheme = async (id) => {
    if (!confirm('Are you sure you want to delete this dealer scheme?')) return;
    try {
      await api.delete(`/admin/dealer-schemes/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error deleting dealer scheme');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Discounts & Schemes</h1>
          <p>Manage coupon codes and volume schemes for retailers</p>
        </div>
        <div>
          {activeTab === 'discounts' ? (
            <button className="btn btn-primary" onClick={() => setShowDiscountModal(true)}>
              <Plus size={16} style={{ marginRight: 6 }} />
              Create Coupon
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowSchemeModal(true)}>
              <Plus size={16} style={{ marginRight: 6 }} />
              Create Scheme
            </button>
          )}
        </div>
      </div>

      <div className="tab-row">
        <button className={`tab-btn ${activeTab === 'discounts' ? 'active' : ''}`} onClick={() => setActiveTab('discounts')}>
          Discount Coupons
        </button>
        <button className={`tab-btn ${activeTab === 'schemes' ? 'active' : ''}`} onClick={() => setActiveTab('schemes')}>
          Dealer Schemes
        </button>
      </div>

      {activeTab === 'discounts' ? (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Order</th>
                <th>Usage Limit</th>
                <th>Validity</th>
                <th>Scope</th>
                <th>Applicable To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, letterSpacing: 0.5 }}>{d.code}</td>
                  <td>
                    <span className="badge active" style={{ textTransform: 'uppercase' }}>
                      {d.discount_type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {d.discount_type === 'percentage' ? `${(d.value / 100).toFixed(1)}%` : fmt(d.value)}
                  </td>
                  <td>{fmt(d.min_order_value)}</td>
                  <td>
                    {d.max_usage_count === 0 ? 'Unlimited' : `${d.current_usage} / ${d.max_usage_count}`}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column' }}>
                      <span>From: {new Date(d.valid_from).toLocaleDateString()}</span>
                      <span>To: {new Date(d.valid_until).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td>
                    {d.scope_type ? (
                      <span className="badge warning">
                        {d.scope_type.toUpperCase()}: {
                          d.scope_type === 'product'
                            ? products.find(p => p.id === d.scope_id)?.name || 'Product'
                            : categories.find(c => c.id === d.scope_id)?.name || 'Category'
                        }
                      </span>
                    ) : (
                      <span className="badge active">GLOBAL</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${d.applicable_to === 'all' ? 'active' : 'warning'}`} style={{ textTransform: 'uppercase' }}>
                      {d.applicable_to}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon delete-btn" onClick={() => handleDeleteDiscount(d.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {discounts.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No discount codes created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Dealer Target</th>
                <th>Scheme Type</th>
                <th>Scope</th>
                <th>Requirements</th>
                <th>Benefit</th>
                <th>Validity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schemes.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>
                    {s.user_id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Users size={14} color="var(--primary)" />
                        <span>
                          {retailers.find(r => r.id === s.user_id)?.retailer_profile?.business_name || 'Specific Dealer'}
                        </span>
                      </div>
                    ) : (
                      'All Dealers'
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{s.scheme_type.replace(/_/g, ' ')}</td>
                  <td>
                    {s.product_id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <ShoppingBag size={14} color="var(--secondary)" />
                        <span>{products.find(p => p.id === s.product_id)?.name || 'Product'}</span>
                      </div>
                    ) : s.category_id ? (
                      `Category: ${categories.find(c => c.id === s.category_id)?.name || 'Category'}`
                    ) : (
                      'Global'
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>Min Qty: {s.min_qty}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                    {s.scheme_type === 'volume' ? `${(s.discount_pct / 100).toFixed(1)}% Off` : `+${s.free_qty} Free`}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column' }}>
                      <span>From: {new Date(s.valid_from).toLocaleDateString()}</span>
                      <span>To: {new Date(s.valid_until).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td>
                    <button className="btn-icon delete-btn" onClick={() => handleDeleteScheme(s.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {schemes.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No dealer schemes created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE DISCOUNT MODAL */}
      {showDiscountModal && (
        <div className="modal-overlay" onClick={() => setShowDiscountModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Discount Coupon</h2>
              <button className="btn-icon" onClick={() => setShowDiscountModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateDiscount}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Coupon Code (e.g. SAVE10)</label>
                  <input
                    className="form-input"
                    value={discountForm.code}
                    onChange={e => setDiscountForm({ ...discountForm, code: e.target.value })}
                    placeholder="E.g. SUMMER50"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Discount Type</label>
                    <select
                      className="form-select"
                      value={discountForm.discount_type}
                      onChange={e => setDiscountForm({ ...discountForm, discount_type: e.target.value })}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (Rupees)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {discountForm.discount_type === 'percentage' ? 'Percentage Value (%)' : 'Flat Value (INR)'}
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      value={discountForm.value}
                      onChange={e => setDiscountForm({ ...discountForm, value: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Min Order Value (INR)</label>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      value={discountForm.min_order_value}
                      onChange={e => setDiscountForm({ ...discountForm, min_order_value: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Usage Count (0 = Unlimited)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={discountForm.max_usage_count}
                      onChange={e => setDiscountForm({ ...discountForm, max_usage_count: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Valid From</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={discountForm.valid_from}
                      onChange={e => setDiscountForm({ ...discountForm, valid_from: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valid Until</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={discountForm.valid_until}
                      onChange={e => setDiscountForm({ ...discountForm, valid_until: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                     <label className="form-label">Coupon Scope</label>
                     <select
                       className="form-select"
                       value={discountForm.scope_type}
                       onChange={e => setDiscountForm({ ...discountForm, scope_type: e.target.value, scope_id: '' })}
                     >
                       <option value="">Global (All items)</option>
                       <option value="product">Specific Product</option>
                       <option value="category">Specific Category</option>
                     </select>
                   </div>
                   <div className="form-group">
                     <label className="form-label">Applicable To</label>
                     <select
                       className="form-select"
                       value={discountForm.applicable_to}
                       onChange={e => setDiscountForm({ ...discountForm, applicable_to: e.target.value })}
                     >
                       <option value="all">All (Retailers & Vendors)</option>
                       <option value="retailer">Retailers Only</option>
                       <option value="vendor">Vendors Only</option>
                     </select>
                   </div>
                </div>
                {discountForm.scope_type && (
                  <div className="form-group">
                    <label className="form-label">Select {discountForm.scope_type === 'product' ? 'Product' : 'Category'}</label>
                    <select
                      className="form-select"
                      value={discountForm.scope_id}
                      onChange={e => setDiscountForm({ ...discountForm, scope_id: e.target.value })}
                      required
                    >
                      <option value="">Select scope target</option>
                      {discountForm.scope_type === 'product'
                        ? products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                        : categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                      }
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Description / Internal Notes</label>
                  <textarea
                    className="form-textarea"
                    value={discountForm.description}
                    onChange={e => setDiscountForm({ ...discountForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDiscountModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Code</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SCHEME MODAL */}
      {showSchemeModal && (
        <div className="modal-overlay" onClick={() => setShowSchemeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Dealer Scheme</h2>
              <button className="btn-icon" onClick={() => setShowSchemeModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateScheme}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Target Dealer</label>
                    <select
                      className="form-select"
                      value={schemeForm.user_id}
                      onChange={e => setSchemeForm({ ...schemeForm, user_id: e.target.value })}
                    >
                      <option value="">All Retailers / Dealers</option>
                      {retailers.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.retailer_profile?.business_name || r.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scheme Type</label>
                    <select
                      className="form-select"
                      value={schemeForm.scheme_type}
                      onChange={e => setSchemeForm({ ...schemeForm, scheme_type: e.target.value })}
                    >
                      <option value="volume">Volume Discount (buy X get Y% off)</option>
                      <option value="buy_x_get_y">Buy X Get Y Free</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Scope Product</label>
                    <select
                      className="form-select"
                      value={schemeForm.product_id}
                      onChange={e => setSchemeForm({ ...schemeForm, product_id: e.target.value, category_id: '' })}
                    >
                      <option value="">Global / Select product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scope Category</label>
                    <select
                      className="form-select"
                      value={schemeForm.category_id}
                      onChange={e => setSchemeForm({ ...schemeForm, category_id: e.target.value, product_id: '' })}
                    >
                      <option value="">Global / Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Min Purchase Qty</label>
                    <input
                      className="form-input"
                      type="number"
                      value={schemeForm.min_qty}
                      onChange={e => setSchemeForm({ ...schemeForm, min_qty: e.target.value })}
                      required
                    />
                  </div>
                  {schemeForm.scheme_type === 'volume' ? (
                    <div className="form-group">
                      <label className="form-label">Discount (%)</label>
                      <input
                        className="form-input"
                        type="number"
                        step="any"
                        value={schemeForm.discount_pct}
                        onChange={e => setSchemeForm({ ...schemeForm, discount_pct: e.target.value })}
                        required
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Free Qty (Units)</label>
                      <input
                        className="form-input"
                        type="number"
                        value={schemeForm.free_qty}
                        onChange={e => setSchemeForm({ ...schemeForm, free_qty: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Valid From</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={schemeForm.valid_from}
                      onChange={e => setSchemeForm({ ...schemeForm, valid_from: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valid Until</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={schemeForm.valid_until}
                      onChange={e => setSchemeForm({ ...schemeForm, valid_until: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Offer Text</label>
                  <textarea
                    className="form-textarea"
                    value={schemeForm.description}
                    onChange={e => setSchemeForm({ ...schemeForm, description: e.target.value })}
                    placeholder="E.g. Buy 10 bags of cement, get 1 free"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSchemeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Scheme</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schemes;
