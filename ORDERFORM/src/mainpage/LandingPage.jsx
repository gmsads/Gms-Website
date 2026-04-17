import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ─── Product Catalog ────────────────────────────────────────────────────────
const PRODUCTS = [
  // ATL
  { id: 1,  cat: 'ATL',     name: 'TV Advertisement',         emoji: '📺', sizes: ['10 sec', '30 sec', '60 sec'],                   price: 'Quote on request', desc: 'Prime time & regional channels' },
  { id: 2,  cat: 'ATL',     name: 'FM Radio Ad',              emoji: '📻', sizes: ['15 sec', '30 sec'],                             price: 'Quote on request', desc: 'Jingles & announcements' },
  { id: 3,  cat: 'ATL',     name: 'Newspaper Ad',             emoji: '📰', sizes: ['Quarter page', 'Half page', 'Full page', 'Front page'], price: '₹ per sq cm',    desc: 'National & regional dailies' },
  { id: 4,  cat: 'ATL',     name: 'Outdoor Hoarding',         emoji: '🪧', sizes: ['10×8 ft', '20×10 ft', '40×20 ft', 'Unipole'],  price: '₹/month',         desc: 'Highway & city billboards' },
  { id: 5,  cat: 'ATL',     name: 'Cinema Hall Ad',           emoji: '🎬', sizes: ['30 sec', '60 sec'],                             price: 'Quote on request', desc: 'On-screen branding before movies' },
  // BTL
  { id: 6,  cat: 'BTL',     name: 'Pamphlet Printing',        emoji: '📄', sizes: ['A5', 'A4', 'A3'],                               price: '₹ per 1000 pcs',  desc: 'Design + print combo available' },
  { id: 7,  cat: 'BTL',     name: 'Brochure Printing',        emoji: '📑', sizes: ['Bifold', 'Trifold', 'Z-fold'],                  price: '₹ per 500 pcs',   desc: 'Premium glossy & matte finish' },
  { id: 8,  cat: 'BTL',     name: 'Rollup Standee',           emoji: '🎴', sizes: ['2×4 ft', '3×6 ft', 'Custom'],                  price: '₹ per unit',      desc: 'Retractable & fixed variants' },
  { id: 9,  cat: 'BTL',     name: 'Promotional Canopy Tent',  emoji: '⛺', sizes: ['8×8 ft', '10×10 ft', '12×12 ft'],              price: '₹ per event',     desc: 'Branded canopies for activations' },
  { id: 10, cat: 'BTL',     name: 'Auto Rickshaw Ad',         emoji: '🛺', sizes: ['Full wrap', 'Back panel', 'Hood'],              price: '₹/month per auto', desc: 'Targeted city-level reach' },
  { id: 11, cat: 'BTL',     name: 'Sky Balloon',              emoji: '🎈', sizes: ['Small (5ft)', 'Medium (8ft)', 'Large (12ft)'],  price: '₹ per day',       desc: 'Promotional & advertising balloons' },
  { id: 12, cat: 'BTL',     name: 'Tricycle Ad',              emoji: '🛵', sizes: ['Front panel', 'Full wrap'],                    price: '₹/month',         desc: 'Local area targeted reach' },
  { id: 13, cat: 'BTL',     name: 'Bus Advertising',          emoji: '🚌', sizes: ['Full wrap', 'Back panel', 'Side panel'],       price: '₹/month per bus', desc: 'City-wide bus fleet branding' },
  { id: 14, cat: 'BTL',     name: 'Visiting Card',            emoji: '💳', sizes: ['250 pcs', '500 pcs', '1000 pcs'],              price: '₹ per batch',     desc: 'Glossy / matte / spot UV' },
  { id: 15, cat: 'BTL',     name: 'I Card (ID Card)',         emoji: '🪪', sizes: ['CR80 standard', 'Custom'],                     price: '₹ per batch',     desc: 'PVC / laminated options' },
  // Vans
  { id: 16, cat: 'Vans',    name: 'LED Video Van',            emoji: '🚐', sizes: ['Half day', 'Full day', 'Weekly'],              price: '₹ per booking',   desc: 'High-res LED with audio system' },
  { id: 17, cat: 'Vans',    name: 'Mobile Van Branding',      emoji: '🚚', sizes: ['Side panels', 'Full wrap'],                    price: '₹ per van',       desc: 'Route-optimised promotions' },
  { id: 18, cat: 'Vans',    name: 'Election Campaign Van',    emoji: '📢', sizes: ['Half day', 'Full day', 'Weekly'],              price: '₹ per booking',   desc: 'Mild steel frames + PA system' },
  { id: 19, cat: 'Vans',    name: 'Promotional Advertising Van', emoji: '🎺', sizes: ['Half day', 'Full day'],                    price: '₹ per booking',   desc: 'Audio promotions & campaigns' },
  // Signage
  { id: 20, cat: 'Signage', name: 'LED Sign Board',           emoji: '💡', sizes: ['2×1 ft', '4×2 ft', '6×3 ft', 'Custom'],      price: '₹ per sq ft',     desc: 'Indoor & outdoor LED boards' },
  { id: 21, cat: 'Signage', name: 'Acrylic Sign Board',       emoji: '🔠', sizes: ['1×2 ft', '2×4 ft', 'Custom'],                 price: '₹ per sq ft',     desc: 'LED letter acrylic finish' },
  { id: 22, cat: 'Signage', name: 'Flex Board',               emoji: '🖼️', sizes: ['3×2 ft', '6×4 ft', '10×6 ft', 'Custom'],     price: '₹ per sq ft',     desc: 'Customised flex printing' },
  { id: 23, cat: 'Signage', name: 'LED Backlit Signs',        emoji: '✨', sizes: ['Custom'],                                      price: '₹ per sq ft',     desc: 'Glowing backlit signage' },
  { id: 24, cat: 'Signage', name: 'No Parking Board',         emoji: '🚫', sizes: ['12×18 in', '18×24 in'],                       price: '₹ per unit',      desc: 'Rust-free weatherproof finish' },
  // Digital
  { id: 25, cat: 'Digital', name: 'Logo Designing',           emoji: '✏️', sizes: ['Basic', 'Premium', 'Enterprise'],             price: '₹ per project',   desc: 'Vector + brand guidelines' },
  { id: 26, cat: 'Digital', name: 'WhatsApp Marketing',       emoji: '💬', sizes: ['1000 msgs', '5000 msgs', '10000 msgs'],       price: '₹ per batch',     desc: 'Bulk broadcast campaigns' },
];

const CATEGORIES = ['All', 'ATL', 'BTL', 'Vans', 'Signage', 'Digital'];

const ROLE_ROUTES = {
  'Executive':        '/order',
  'Admin':            '/admin-dashboard',
  'Designer':         '/designer-dashboard',
  'Account':          '/account-dashboard',
  'Service Executive':'/service-dashboard',
  'Service Manager':  '/service-manager-dashboard',
  'Sales Manager':    '/sales-manager-dashboard',
  'Digital Marketing':'/digital-dashboard',
  'Vendor':           '/vendor-dashboard',
  'Agent':            '/agent-dashboard',
  'IT':               '/it-dashboard',
  'Unit':             '/unit-dashboard',
  'FieldExecutive':   '/order',
  'fieldexecutive':   '/order',
  'HR':               '/hr-dashboard',
  'Video Editor':     '/video-editor-dashboard',
};

// ─── Inline Styles ───────────────────────────────────────────────────────────
const S = {
  // layout
  page: { width: '100%', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#f5f6fa', overflowX: 'hidden' },

  // navbar
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#003366', padding: '0 32px', height: '64px', position: 'sticky', top: 0, zIndex: 200 },
  navTitle: { color: 'white', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.3px' },
  navActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  navBtnOutline: { background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: '7px', padding: '7px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 },
  navBtnSolid: { background: 'white', color: '#003366', border: 'none', borderRadius: '7px', padding: '7px 18px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 },

  // hero
  hero: { background: 'linear-gradient(135deg,#001a3d 0%,#003366 55%,#00509e 100%)', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', position: 'relative', overflow: 'hidden' },
  heroBadge: { background: 'rgba(255,255,255,0.1)', color: '#7ecbff', fontSize: '11px', fontWeight: 600, padding: '5px 16px', borderRadius: '20px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '20px', border: '1px solid rgba(126,203,255,0.3)' },
  heroTitle: { color: 'white', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 700, textAlign: 'center', lineHeight: 1.25, maxWidth: '640px' },
  heroSpan: { color: '#4db8ff' },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: '15px', textAlign: 'center', maxWidth: '500px', marginTop: '16px', lineHeight: 1.7 },
  heroCta: { display: 'flex', gap: '14px', marginTop: '36px', flexWrap: 'wrap', justifyContent: 'center' },
  btnPrimary: { background: '#4db8ff', color: '#001a3d', border: 'none', borderRadius: '9px', padding: '13px 32px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: '9px', padding: '13px 32px', fontSize: '15px', cursor: 'pointer' },
  stats: { display: 'flex', gap: '48px', marginTop: '52px', flexWrap: 'wrap', justifyContent: 'center' },
  stat: { textAlign: 'center' },
  statNum: { color: 'white', fontSize: '1.6rem', fontWeight: 700 },
  statLbl: { color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '3px' },

  // store
  store: { background: '#f5f6fa', padding: '40px 20px 80px' },
  sectionHeader: { textAlign: 'center', marginBottom: '28px' },
  sectionH2: { fontSize: '1.5rem', fontWeight: 700, color: '#001a3d' },
  sectionSub: { fontSize: '14px', color: '#666', marginTop: '6px' },

  // cat tabs
  catTabs: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '28px' },
  catTabActive: { padding: '7px 20px', borderRadius: '20px', border: 'none', background: '#003366', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  catTabInactive: { padding: '7px 20px', borderRadius: '20px', border: '1px solid #d0d5e8', background: 'white', color: '#555', fontSize: '13px', cursor: 'pointer' },

  // product grid
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '14px', maxWidth: '1000px', margin: '0 auto' },

  // product card
  pCard: { background: 'white', borderRadius: '12px', border: '1px solid #e5e9f2', overflow: 'hidden', transition: 'transform 0.15s,box-shadow 0.15s' },
  pImg: { width: '100%', height: '110px', background: 'linear-gradient(135deg,#e8f0fe,#d0e4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' },
  pBody: { padding: '12px' },
  pCat: { fontSize: '10px', fontWeight: 700, color: '#4da6ff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  pName: { fontSize: '13px', fontWeight: 600, color: '#111', lineHeight: 1.4 },
  pDesc: { fontSize: '11px', color: '#888', marginTop: '3px' },
  pPrice: { fontSize: '11px', color: '#003366', fontWeight: 600, marginTop: '5px' },
  pSizes: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' },
  sizeChipActive: { fontSize: '10px', padding: '3px 8px', borderRadius: '4px', border: '1.5px solid #003366', background: '#003366', color: 'white', cursor: 'pointer', fontWeight: 600 },
  sizeChipInactive: { fontSize: '10px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #ccc', background: 'white', color: '#444', cursor: 'pointer' },
  pFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' },
  qtyCtrl: { display: 'flex', alignItems: 'center', gap: '8px' },
  qtyBtn: { width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #ddd', background: '#f8f9fc', color: '#333', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontWeight: 600 },
  qtyNum: { fontSize: '13px', fontWeight: 700, minWidth: '18px', textAlign: 'center', color: '#111' },
  addBtnDefault: { fontSize: '11px', padding: '5px 12px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  addBtnAdded: { fontSize: '11px', padding: '5px 12px', background: '#1d9e75', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },

  // cart fab
  cartFab: { position: 'fixed', bottom: '24px', right: '24px', background: '#003366', color: 'white', border: 'none', borderRadius: '50px', padding: '12px 22px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 999, boxShadow: '0 6px 20px rgba(0,51,102,0.4)', fontWeight: 600 },
  cartBadge: { background: '#e24b4a', color: 'white', borderRadius: '50%', width: '22px', height: '22px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },

  // overlay + modal
  overlayWrap: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: 'white', borderRadius: '14px', width: '100%', maxWidth: '440px', maxHeight: '88vh', overflowY: 'auto', position: 'relative' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #eee' },
  modalTitle: { fontSize: '16px', fontWeight: 700, color: '#111' },
  closeBtn: { background: '#f4f5f9', border: '1px solid #e0e0e0', borderRadius: '50%', width: '30px', height: '30px', fontSize: '18px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  modalBody: { padding: '20px 24px 24px' },

  // form
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px', fontWeight: 500 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #dde0ec', borderRadius: '8px', fontSize: '14px', color: '#111', outline: 'none', boxSizing: 'border-box' },
  pwWrap: { position: 'relative' },
  pwToggle: { position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#888' },

  // cart items
  cartItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f2f2f2' },
  ciName: { fontSize: '13px', fontWeight: 600, color: '#111' },
  ciDetail: { fontSize: '12px', color: '#888', marginTop: '2px' },
  ciPrice: { fontSize: '12px', color: '#666', minWidth: '80px', textAlign: 'right' },
  cartTotal: { display: 'flex', justifyContent: 'space-between', paddingTop: '12px', marginTop: '8px', borderTop: '1px solid #ddd', fontWeight: 700, color: '#111', fontSize: '14px' },

  // btn block
  btnBlock: { width: '100%', padding: '12px', background: '#003366', color: 'white', border: 'none', borderRadius: '9px', fontSize: '14px', cursor: 'pointer', fontWeight: 700, marginTop: '12px' },

  // login tabs
  loginTabs: { display: 'flex', marginBottom: '20px', border: '1px solid #e0e0e0', borderRadius: '9px', overflow: 'hidden' },
  loginTabActive: { flex: 1, padding: '9px', fontSize: '13px', textAlign: 'center', cursor: 'pointer', background: '#003366', color: 'white', border: 'none', fontWeight: 600 },
  loginTabInactive: { flex: 1, padding: '9px', fontSize: '13px', textAlign: 'center', cursor: 'pointer', background: '#f5f6fa', color: '#666', border: 'none' },

  // success
  successWrap: { textAlign: 'center', padding: '10px 0 8px' },
  successIcon: { width: '60px', height: '60px', borderRadius: '50%', background: '#eaf7f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  orderSummaryBox: { background: '#f5f6fa', borderRadius: '8px', padding: '12px', marginTop: '14px', textAlign: 'left', fontSize: '12px', color: '#555', lineHeight: 1.9, whiteSpace: 'pre-wrap' },

  // hint text
  hint: { fontSize: '12px', color: '#888', marginTop: '4px' },
};

// ─── ProductCard ─────────────────────────────────────────────────────────────
function ProductCard({ product, qty, selectedSize, onSizeSelect, onQtyChange, onAdd }) {
  return (
    <div style={S.pCard}>
      <div style={S.pImg}>{product.emoji}</div>
      <div style={S.pBody}>
        <div style={S.pCat}>{product.cat}</div>
        <div style={S.pName}>{product.name}</div>
        <div style={S.pDesc}>{product.desc}</div>
        <div style={S.pPrice}>{product.price}</div>
        <div style={S.pSizes}>
          {product.sizes.map(s => (
            <span
              key={s}
              style={s === selectedSize ? S.sizeChipActive : S.sizeChipInactive}
              onClick={() => onSizeSelect(product.id, s)}
            >{s}</span>
          ))}
        </div>
        <div style={S.pFooter}>
          <div style={S.qtyCtrl}>
            <button style={S.qtyBtn} onClick={() => onQtyChange(product.id, -1)}>−</button>
            <span style={S.qtyNum}>{qty}</span>
            <button style={S.qtyBtn} onClick={() => onQtyChange(product.id, 1)}>+</button>
          </div>
          <button
            style={qty > 0 ? S.addBtnAdded : S.addBtnDefault}
            onClick={() => onAdd(product.id)}
          >{qty > 0 ? '✓ Added' : 'Add'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function LandingPage() {
  const navigate = useNavigate();

  // views: 'hero' | 'store'
  const [view, setView] = useState('hero');

  // ── store state
  const [activeCat, setActiveCat] = useState('All');
  const [cart, setCart] = useState({});           // { productId: qty }
  const [selectedSizes, setSelectedSizes] = useState({}); // { productId: size }

  // ── modal state
  const [modal, setModal] = useState(null); // 'staffLogin' | 'cart' | 'enquiry' | 'success'

  // ── staff login state (YOUR EXISTING LOGIC)
  const [staffName, setStaffName] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── enquiry state
  const [enqName, setEnqName] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqCity, setEnqCity] = useState('');
  const [enqNotes, setEnqNotes] = useState('');
  const [enqLoading, setEnqLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = modal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modal]);

  // ── size select
  const handleSizeSelect = useCallback((pid, size) => {
    setSelectedSizes(prev => ({ ...prev, [pid]: size }));
  }, []);

  // ── qty change
  const handleQtyChange = useCallback((pid, delta) => {
    setCart(prev => {
      const next = { ...prev };
      next[pid] = Math.max(0, (next[pid] || 0) + delta);
      if (next[pid] === 0) delete next[pid];
      return next;
    });
  }, []);

  // ── add to cart
  const handleAdd = useCallback((pid) => {
    setCart(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }));
  }, []);

  const cartTotal = Object.values(cart).reduce((a, b) => a + b, 0);

  const getSize = (pid) => {
    const p = PRODUCTS.find(x => x.id === pid);
    return selectedSizes[pid] || (p ? p.sizes[0] : '');
  };

  // ── STAFF LOGIN (your existing logic, unchanged)
  const handleStaffLogin = async () => {
    try {
      const res = await axios.post('/api/login', { name: staffName, password: staffPassword });
      if (!res.data.success) { alert('Login failed: Invalid credentials'); return; }
      const { role } = res.data;
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('role', role);
      localStorage.setItem('userName', staffName);
      const route = ROLE_ROUTES[role];
      if (route) { navigate(route, { replace: true }); }
      else { alert('Unknown role. Please contact administrator.'); }
    } catch (error) {
      console.error('Login error:', error);
      const msg = error.response?.data?.message || error.message || 'Server error';
      alert(`Login failed: ${msg}`);
    }
  };

  // ── SUBMIT ENQUIRY
  const handleSubmitEnquiry = async () => {
    if (!enqName.trim() || !enqPhone.trim()) {
      alert('Please enter your name and contact number.');
      return;
    }
    setEnqLoading(true);
    const items = Object.entries(cart).map(([id, qty]) => {
      const p = PRODUCTS.find(x => x.id == id);
      return { name: p.name, size: getSize(Number(id)), qty, price: p.price };
    });
    try {
      // POST to your backend — wire up the endpoint
      await axios.post('/api/enquiry', {
        name: enqName, phone: enqPhone, email: enqEmail,
        city: enqCity, notes: enqNotes, items,
      });
    } catch (_) {
      // proceed even if backend not wired yet (for frontend testing)
    }
    setSuccessData({ name: enqName, phone: enqPhone, items });
    setModal('success');
    setEnqLoading(false);
  };

  // ── filtered products
  const visibleProducts = activeCat === 'All'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.cat === activeCat);

  // ──────────────────────────────────────────────────────────────────────────
  // MODALS
  // ──────────────────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!modal) return null;

    // ── STAFF LOGIN
    if (modal === 'staffLogin') return (
      <div style={S.overlayWrap} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
        <div style={S.modal}>
          <div style={S.modalHeader}>
            <span style={S.modalTitle}>Staff Login</span>
            <button style={S.closeBtn} onClick={() => setModal(null)}>×</button>
          </div>
          <div style={S.modalBody}>
            <div style={S.formGroup}>
              <label style={S.label}>Name</label>
              <input
                style={S.input} type="text" autoComplete="off"
                placeholder="Enter your name"
                value={staffName} onChange={e => setStaffName(e.target.value)}
              />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Password</label>
              <div style={S.pwWrap}>
                <input
                  style={{ ...S.input, paddingRight: '40px' }}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={staffPassword} onChange={e => setStaffPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                />
                <button style={S.pwToggle} onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? '👁‍🗨' : '👁'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                style={{ ...S.btnBlock, marginTop: 0, background: '#f0f2f8', color: '#333' }}
                onClick={() => setModal(null)}
              >Cancel</button>
              <button style={{ ...S.btnBlock, marginTop: 0 }} onClick={handleStaffLogin}>Login</button>
            </div>
          </div>
        </div>
      </div>
    );

    // ── CART
    if (modal === 'cart') {
      const items = Object.entries(cart);
      return (
        <div style={S.overlayWrap} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>Your Cart ({cartTotal} items)</span>
              <button style={S.closeBtn} onClick={() => setModal(null)}>×</button>
            </div>
            <div style={S.modalBody}>
              {items.length === 0 && <p style={{ color: '#888', fontSize: '14px' }}>Your cart is empty.</p>}
              {items.map(([id, qty]) => {
                const p = PRODUCTS.find(x => x.id == id);
                return (
                  <div key={id} style={S.cartItem}>
                    <div>
                      <div style={S.ciName}>{p.emoji} {p.name}</div>
                      <div style={S.ciDetail}>Size: {getSize(Number(id))} · Qty: {qty}</div>
                    </div>
                    <div style={S.ciPrice}>{p.price}</div>
                  </div>
                );
              })}
              {items.length > 0 && (
                <>
                  <div style={S.cartTotal}>
                    <span>Total items</span><span>{cartTotal}</span>
                  </div>
                  <button style={S.btnBlock} onClick={() => setModal('enquiry')}>
                    Proceed to Enquiry →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── ENQUIRY FORM
    if (modal === 'enquiry') return (
      <div style={S.overlayWrap} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
        <div style={S.modal}>
          <div style={S.modalHeader}>
            <span style={S.modalTitle}>Submit Enquiry</span>
            <button style={S.closeBtn} onClick={() => setModal(null)}>×</button>
          </div>
          <div style={S.modalBody}>
            <p style={{ fontSize: '13px', color: '#777', marginBottom: '16px', lineHeight: 1.6 }}>
              Fill in your details and our team will contact you with a detailed quote within 24 hours.
            </p>
            <div style={S.formGroup}>
              <label style={S.label}>Your Name *</label>
              <input style={S.input} placeholder="Full name" value={enqName} onChange={e => setEnqName(e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Contact Number *</label>
              <input style={S.input} placeholder="+91 XXXXX XXXXX" value={enqPhone} onChange={e => setEnqPhone(e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Email (optional)</label>
              <input style={S.input} placeholder="you@example.com" value={enqEmail} onChange={e => setEnqEmail(e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>City / Area</label>
              <input style={S.input} placeholder="e.g. Hyderabad" value={enqCity} onChange={e => setEnqCity(e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Notes</label>
              <input style={S.input} placeholder="Budget, timeline, or any other details" value={enqNotes} onChange={e => setEnqNotes(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                style={{ ...S.btnBlock, marginTop: 0, background: '#f0f2f8', color: '#333' }}
                onClick={() => setModal('cart')}
              >← Back</button>
              <button
                style={{ ...S.btnBlock, marginTop: 0, opacity: enqLoading ? 0.7 : 1 }}
                onClick={handleSubmitEnquiry}
                disabled={enqLoading}
              >{enqLoading ? 'Submitting...' : 'Submit Enquiry'}</button>
            </div>
          </div>
        </div>
      </div>
    );

    // ── SUCCESS
    if (modal === 'success' && successData) {
      const summaryText = successData.items.map(i => `${i.name} (${i.size}) × ${i.qty} — ${i.price}`).join('\n');
      return (
        <div style={S.overlayWrap} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={S.modal}>
            <div style={S.modalBody}>
              <div style={S.successWrap}>
                <div style={S.successIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d9e75" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111' }}>Enquiry Submitted!</h3>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '8px', lineHeight: 1.7 }}>
                  Thanks <strong>{successData.name}</strong>, our team will call you at{' '}
                  <strong>{successData.phone}</strong> within 24 hours with a detailed quote.
                </p>
                <div style={S.orderSummaryBox}>{summaryText}</div>
                <button
                  style={{ ...S.btnBlock, background: '#1d9e75' }}
                  onClick={() => {
                    setModal(null);
                    setCart({});
                    setSelectedSizes({});
                    setEnqName(''); setEnqPhone(''); setEnqEmail(''); setEnqCity(''); setEnqNotes('');
                    setSuccessData(null);
                  }}
                >Continue Browsing</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* ── NAVBAR ─────────────────────────────────────── */}
      <nav style={S.navbar}>
        <span style={S.navTitle}>Global Marketing Solutions</span>
        <div style={S.navActions}>
          {view === 'store' ? (
            <button style={S.navBtnOutline} onClick={() => setView('hero')}>← Home</button>
          ) : (
            <button style={S.navBtnOutline} onClick={() => setView('store')}>Browse Products</button>
          )}
          <button style={S.navBtnSolid} onClick={() => setModal('staffLogin')}>Staff Login</button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────── */}
      {view === 'hero' && (
        <div style={S.hero}>
          {/* dot pattern */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

          <div style={S.heroBadge}>360° Marketing Solutions</div>
          <h1 style={S.heroTitle}>
            ATL · BTL · <span style={S.heroSpan}>Digital</span> Marketing Done Right
          </h1>
          <p style={S.heroSub}>
            From hoardings to LED vans, newspaper ads to brochures — order exactly what you need, the way you shop online.
          </p>
          <div style={S.heroCta}>
            <button style={S.btnPrimary} onClick={() => setView('store')}>
              Explore Our Products
            </button>
            <button style={S.btnSecondary} onClick={() => setModal('staffLogin')}>
              Staff Portal
            </button>
          </div>
          <div style={S.stats}>
            {[['500+','Campaigns Delivered'],['ATL + BTL','Full Coverage'],['Hyderabad','& Pan India']].map(([n,l]) => (
              <div key={l} style={S.stat}>
                <div style={S.statNum}>{n}</div>
                <div style={S.statLbl}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STORE ──────────────────────────────────────── */}
      {view === 'store' && (
        <div style={S.store}>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionH2}>Our Products & Services</h2>
            <p style={S.sectionSub}>Choose sizes, set quantities — submit an enquiry and we'll send you a quote within 24 hrs</p>
          </div>

          {/* category filter */}
          <div style={S.catTabs}>
            {CATEGORIES.map(c => (
              <button
                key={c}
                style={c === activeCat ? S.catTabActive : S.catTabInactive}
                onClick={() => setActiveCat(c)}
              >{c}</button>
            ))}
          </div>

          {/* product grid */}
          <div style={S.grid}>
            {visibleProducts.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                qty={cart[p.id] || 0}
                selectedSize={selectedSizes[p.id] || p.sizes[0]}
                onSizeSelect={handleSizeSelect}
                onQtyChange={handleQtyChange}
                onAdd={handleAdd}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── CART FAB ───────────────────────────────────── */}
      {cartTotal > 0 && (
        <button style={S.cartFab} onClick={() => setModal('cart')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          View Cart
          <span style={S.cartBadge}>{cartTotal}</span>
        </button>
      )}

      {/* ── MODALS ─────────────────────────────────────── */}
      {renderModal()}
    </div>
  );
}

export default LandingPage;