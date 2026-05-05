import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Import logo from assets folder
import logo from '../assets/GMS_LOGO_.png'; // Adjust path based on your folder structure
// OR if you have multiple formats:
// import logoSvg from './assets/logo.svg';
// import logoWebp from './assets/logo.webp';

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

// ─── Inline Styles (Zepto/Blinkit style - larger cards) ─────────────────────
const S = {
  page: { width: '100%', minHeight: '100vh', fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif", background: '#f5f7fb', overflowX: 'hidden' },

  // navbar
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a2b44', padding: '0 32px', height: '70px', position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: { height: '40px', width: 'auto', objectFit: 'contain' },
  navTitle: { color: 'white', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.3px' },
  navActions: { display: 'flex', gap: '12px', alignItems: 'center' },
  navBtnOutline: { background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '40px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' },
  navBtnSolid: { background: 'white', color: '#0a2b44', border: 'none', borderRadius: '40px', padding: '8px 22px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 },

  // hero section
  hero: { background: 'linear-gradient(135deg, #0a2b44 0%, #0f3b5e 100%)', padding: '48px 20px 56px', textAlign: 'center', position: 'relative' },
  heroBadge: { background: 'rgba(255,255,255,0.12)', color: '#8bcbff', fontSize: '12px', fontWeight: 600, padding: '6px 20px', borderRadius: '40px', display: 'inline-block', marginBottom: '20px', letterSpacing: '1px' },
  heroTitle: { color: 'white', fontSize: 'clamp(1.8rem,5vw,2.6rem)', fontWeight: 800, lineHeight: 1.2, maxWidth: '700px', margin: '0 auto' },
  heroSpan: { color: '#6bc2ff' },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: '15px', maxWidth: '520px', margin: '16px auto 0', lineHeight: 1.5 },

  // store section
  store: { background: '#f5f7fb', padding: '40px 20px 70px' },
  sectionHeader: { textAlign: 'center', marginBottom: '32px' },
  sectionH2: { fontSize: '1.8rem', fontWeight: 700, color: '#0a2b44', letterSpacing: '-0.5px' },
  sectionSub: { fontSize: '15px', color: '#5a6874', marginTop: '8px' },

  // category tabs
  catTabs: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '36px' },
  catTabActive: { padding: '10px 26px', borderRadius: '40px', border: 'none', background: '#0a2b44', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(10,43,68,0.2)' },
  catTabInactive: { padding: '10px 26px', borderRadius: '40px', border: '1px solid #cad2db', background: 'white', color: '#3a4a5c', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' },

  // product grid
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '24px', maxWidth: '1300px', margin: '0 auto' },

  // product card
  pCard: { background: 'white', borderRadius: '20px', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #edf2f7', cursor: 'pointer' },
  pImg: { width: '100%', height: '160px', background: 'linear-gradient(145deg, #f0f5fe, #e6edf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '58px', borderBottom: '1px solid #f0f4fa' },
  pBody: { padding: '16px 16px 20px' },
  pCat: { fontSize: '11px', fontWeight: 700, color: '#2e7eb0', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' },
  pName: { fontSize: '17px', fontWeight: 700, color: '#161e2e', lineHeight: 1.3, marginBottom: '4px' },
  pDesc: { fontSize: '12px', color: '#7a879a', marginTop: '4px', lineHeight: 1.4 },
  pPrice: { fontSize: '13px', color: '#0a2b44', fontWeight: 700, marginTop: '8px', background: '#eef3fc', display: 'inline-block', padding: '3px 10px', borderRadius: '20px' },
  pSizes: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' },
  sizeChipActive: { fontSize: '11px', padding: '5px 12px', borderRadius: '40px', border: '1.5px solid #0a2b44', background: '#0a2b44', color: 'white', cursor: 'pointer', fontWeight: 600 },
  sizeChipInactive: { fontSize: '11px', padding: '5px 12px', borderRadius: '40px', border: '1px solid #cfddee', background: 'white', color: '#4a5b6e', cursor: 'pointer', transition: 'all 0.15s' },
  pFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #ecf3fa' },
  qtyCtrl: { display: 'flex', alignItems: 'center', gap: '12px', background: '#f6f9fe', padding: '4px 10px', borderRadius: '40px' },
  qtyBtn: { width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'white', color: '#0a2b44', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  qtyNum: { fontSize: '15px', fontWeight: 700, minWidth: '24px', textAlign: 'center', color: '#1a2c3e' },
  addBtnDefault: { fontSize: '12px', padding: '8px 18px', background: '#0a2b44', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' },
  addBtnAdded: { fontSize: '12px', padding: '8px 18px', background: '#1f8a4c', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer', fontWeight: 600 },

  // cart fab
  cartFab: { position: 'fixed', bottom: '26px', right: '26px', background: '#0a2b44', color: 'white', border: 'none', borderRadius: '60px', padding: '14px 28px', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 999, boxShadow: '0 12px 28px rgba(10,43,68,0.35)', fontWeight: 700 },
  cartBadge: { background: '#e25c5a', color: 'white', borderRadius: '50%', width: '26px', height: '26px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 },

  // modal styles
  overlayWrap: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: 'white', borderRadius: '28px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', position: 'relative', boxShadow: '0 30px 50px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 26px 16px', borderBottom: '1px solid #eef2f8' },
  modalTitle: { fontSize: '18px', fontWeight: 800, color: '#111' },
  closeBtn: { background: '#f0f4fa', border: 'none', borderRadius: '50%', width: '34px', height: '34px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: '20px 26px 28px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 600 },
  input: { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '16px', fontSize: '14px', outline: 'none', transition: 'border 0.2s' },
  btnBlock: { width: '100%', padding: '14px', background: '#0a2b44', color: 'white', border: 'none', borderRadius: '40px', fontSize: '14px', cursor: 'pointer', fontWeight: 700, marginTop: '12px' },
  cartItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #edf2f9' },
  ciName: { fontSize: '14px', fontWeight: 700 },
  cartTotal: { display: 'flex', justifyContent: 'space-between', paddingTop: '14px', fontWeight: 800, fontSize: '15px' },
  successWrap: { textAlign: 'center', padding: '8px 0' },
  orderSummaryBox: { background: '#f8fafc', borderRadius: '20px', padding: '14px', fontSize: '12px', whiteSpace: 'pre-wrap' }
};

// ─── ProductCard Component ────────────────────────────────────────────────
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

// ─── Main Landing Page ────────────────────────────────────────────────
function LandingPage() {
  const navigate = useNavigate();

  const [activeCat, setActiveCat] = useState('All');
  const [cart, setCart] = useState({});
  const [selectedSizes, setSelectedSizes] = useState({});
  const [modal, setModal] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enqName, setEnqName] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqCity, setEnqCity] = useState('');
  const [enqNotes, setEnqNotes] = useState('');
  const [enqLoading, setEnqLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = modal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modal]);

  const handleSizeSelect = useCallback((pid, size) => {
    setSelectedSizes(prev => ({ ...prev, [pid]: size }));
  }, []);

  const handleQtyChange = useCallback((pid, delta) => {
    setCart(prev => {
      const next = { ...prev };
      next[pid] = Math.max(0, (next[pid] || 0) + delta);
      if (next[pid] === 0) delete next[pid];
      return next;
    });
  }, []);

  const handleAdd = useCallback((pid) => {
    setCart(prev => ({ ...prev, [pid]: (prev[pid] || 0) + 1 }));
  }, []);

  const cartTotal = Object.values(cart).reduce((a, b) => a + b, 0);

  const getSize = (pid) => {
    const p = PRODUCTS.find(x => x.id === pid);
    return selectedSizes[pid] || (p ? p.sizes[0] : '');
  };

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
      alert(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  };

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
      await axios.post('/api/enquiry', { name: enqName, phone: enqPhone, email: enqEmail, city: enqCity, notes: enqNotes, items });
    } catch (_) {}
    setSuccessData({ name: enqName, phone: enqPhone, items });
    setModal('success');
    setEnqLoading(false);
  };

  const visibleProducts = activeCat === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.cat === activeCat);

  const renderModal = () => {
    if (!modal) return null;
    if (modal === 'staffLogin') return (
      <div style={S.overlayWrap} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
        <div style={S.modal}>
          <div style={S.modalHeader}><span style={S.modalTitle}>Staff Login</span><button style={S.closeBtn} onClick={() => setModal(null)}>×</button></div>
          <div style={S.modalBody}>
            <div style={S.formGroup}><label style={S.label}>Name</label><input style={S.input} type="text" value={staffName} onChange={e => setStaffName(e.target.value)} /></div>
        <div style={S.formGroup}>
  <label style={S.label}>Password</label>
  <div style={{ position: 'relative' }}>
    <input 
      style={{ ...S.input, paddingRight: '45px' }} 
      type={showPassword ? 'text' : 'password'} 
      value={staffPassword} 
      onChange={e => setStaffPassword(e.target.value)} 
      onKeyDown={e => e.key === 'Enter' && handleStaffLogin()} 
    />
    <button 
      style={{ 
        position: 'absolute', 
        right: '12px', 
        top: '10%', 
        transform: 'translateY(-50%)', 
        background: 'none', 
        border: 'none', 
        cursor: 'pointer',
        fontSize: '18px',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b'
      }} 
      onClick={() => setShowPassword(v => !v)}
      type="button"
    >
      {showPassword ? '🙈' : '👁️'}
    </button>
  </div>
</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button style={{ ...S.btnBlock, marginTop: 0, background: '#eef2f8', color: '#333' }} onClick={() => setModal(null)}>Cancel</button>
              <button style={{ ...S.btnBlock, marginTop: 0 }} onClick={handleStaffLogin}>Login</button>
            </div>
          </div>
        </div>
      </div>
    );
    if (modal === 'cart') {
      const items = Object.entries(cart);
      return (
        <div style={S.overlayWrap} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={S.modal}>
            <div style={S.modalHeader}><span style={S.modalTitle}>Your Cart ({cartTotal})</span><button style={S.closeBtn} onClick={() => setModal(null)}>×</button></div>
            <div style={S.modalBody}>
              {items.length === 0 && <p style={{ color: '#6c7a8e' }}>Cart empty.</p>}
              {items.map(([id, qty]) => {
                const p = PRODUCTS.find(x => x.id == id);
                return (<div key={id} style={S.cartItem}><div><div style={S.ciName}>{p.emoji} {p.name}</div><div style={{ fontSize: '12px', color: '#6c7a8e' }}>Size: {getSize(Number(id))} · Qty: {qty}</div></div><div>{p.price}</div></div>);
              })}
              {items.length > 0 && <><div style={S.cartTotal}><span>Total items</span><span>{cartTotal}</span></div><button style={S.btnBlock} onClick={() => setModal('enquiry')}>Proceed to Enquiry →</button></>}
            </div>
          </div>
        </div>
      );
    }
    if (modal === 'enquiry') return (
      <div style={S.overlayWrap} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
        <div style={S.modal}>
          <div style={S.modalHeader}><span style={S.modalTitle}>Get a Quote</span><button style={S.closeBtn} onClick={() => setModal(null)}>×</button></div>
          <div style={S.modalBody}>
            <p style={{ fontSize: '13px', color: '#5b6e8c', marginBottom: '18px' }}>We'll reach out with pricing & timeline within 24h.</p>
            <div style={S.formGroup}><label style={S.label}>Full Name *</label><input style={S.input} value={enqName} onChange={e => setEnqName(e.target.value)} /></div>
            <div style={S.formGroup}><label style={S.label}>Phone *</label><input style={S.input} value={enqPhone} onChange={e => setEnqPhone(e.target.value)} /></div>
            <div style={S.formGroup}><label style={S.label}>Email</label><input style={S.input} value={enqEmail} onChange={e => setEnqEmail(e.target.value)} /></div>
            <div style={S.formGroup}><label style={S.label}>City</label><input style={S.input} value={enqCity} onChange={e => setEnqCity(e.target.value)} /></div>
            <div style={S.formGroup}><label style={S.label}>Notes</label><input style={S.input} value={enqNotes} onChange={e => setEnqNotes(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ ...S.btnBlock, marginTop: 0, background: '#eef2f8', color: '#333' }} onClick={() => setModal('cart')}>Back</button>
              <button style={{ ...S.btnBlock, marginTop: 0 }} onClick={handleSubmitEnquiry} disabled={enqLoading}>{enqLoading ? 'Sending...' : 'Submit Enquiry'}</button>
            </div>
          </div>
        </div>
      </div>
    );
    if (modal === 'success' && successData) {
      const summary = successData.items.map(i => `${i.name} (${i.size}) × ${i.qty} — ${i.price}`).join('\n');
      return (
        <div style={S.overlayWrap} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={S.modal}>
            <div style={S.modalBody}>
              <div style={S.successWrap}>
                <div style={{ fontSize: '56px' }}>✅</div>
                <h3 style={{ fontSize: '20px', margin: '12px 0 6px' }}>Enquiry Sent!</h3>
                <p style={{ fontSize: '13px', color: '#4a5a72' }}>Thanks {successData.name}, our team will contact {successData.phone} soon.</p>
                <div style={S.orderSummaryBox}>{summary}</div>
                <button style={{ ...S.btnBlock, background: '#1f8a4c' }} onClick={() => { setModal(null); setCart({}); setSelectedSizes({}); setEnqName(''); setEnqPhone(''); setEnqEmail(''); setEnqCity(''); setEnqNotes(''); setSuccessData(null); }}>Continue Shopping</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={S.page}>
      <nav style={S.navbar}>
        <div style={S.navLeft}>
          {!logoError ? (
            <img 
              src={logo} 
              alt="Company Logo" 
              style={S.logo}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span style={{ fontSize: '28px' }}>📢</span>
          )}
          <span style={S.navTitle}>Global Marketing Solutions</span>
        </div>
        <div style={S.navActions}>
          <button style={S.navBtnSolid} onClick={() => setModal('staffLogin')}>Staff Login</button>
        </div>
      </nav>

      <div style={S.hero}>
        <div style={S.heroBadge}>360° Marketing Solutions</div>
        <h1 style={S.heroTitle}>ATL · BTL · <span style={S.heroSpan}>Digital</span> Marketing<br />Products at your fingertips</h1>
        <p style={S.heroSub}>Choose from 26+ advertising solutions — pick size, add quantity & request a quote instantly.</p>
      </div>

      <div style={S.store}>
        <div style={S.sectionHeader}>
          <h2 style={S.sectionH2}>Our Product Catalog</h2>
          <p style={S.sectionSub}>Larger, easier to browse — like your favorite quick-commerce apps</p>
        </div>
        <div style={S.catTabs}>
          {CATEGORIES.map(c => (
            <button key={c} style={c === activeCat ? S.catTabActive : S.catTabInactive} onClick={() => setActiveCat(c)}>{c}</button>
          ))}
        </div>
        <div style={S.grid}>
          {visibleProducts.map(p => (
            <ProductCard key={p.id} product={p} qty={cart[p.id] || 0} selectedSize={selectedSizes[p.id] || p.sizes[0]} onSizeSelect={handleSizeSelect} onQtyChange={handleQtyChange} onAdd={handleAdd} />
          ))}
        </div>
      </div>

      {cartTotal > 0 && (
        <button style={S.cartFab} onClick={() => setModal('cart')}>
          🛒 Cart <span style={S.cartBadge}>{cartTotal}</span>
        </button>
      )}
      {renderModal()}
    </div>
  );
}

export default LandingPage;