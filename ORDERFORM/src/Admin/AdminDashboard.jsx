import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../Executive/OrderForm';
import DigitalMarketingOrderForm from '../Executive/Digitalform';
import axios from 'axios';
import GMSLogo from '../assets/GMS_LOGO_.png'
import WhatsAppDashboard from './WhatsApp';
import { Chart as ChartJS, Title, Tooltip, LineElement, PointElement, Legend, ArcElement, BarElement, CategoryScale, LinearScale, RadialLinearScale, Filler } from 'chart.js';
import { Bar, Doughnut, PolarArea } from 'react-chartjs-2';
import { FaWhatsapp } from 'react-icons/fa';

ChartJS.register(
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Filler
);

/* ═══════════════════════════════════════════════════════════
   SIDEBAR CSS
═══════════════════════════════════════════════════════════ */
const SIDEBAR_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

:root {
  --sb-w:         280px;
  --sb-bg:        #0f172a;
  --sb-border:    rgba(255,255,255,0.08);
  --sb-surface:   rgba(255,255,255,0.05);
  --sb-hover:     rgba(255,255,255,0.08);
  --accent:       #818cf8;
  --accent-glow:  rgba(129,140,248,0.3);
  --accent-soft:  rgba(129,140,248,0.12);
  --accent-mid:   rgba(129,140,248,0.2);
  --teal:         #2dd4bf;
  --violet:       #a78bfa;
  --t1:           #f8fafc;
  --t2:           #cbd5e1;
  --t3:           #64748b;
  --t4:           #334155;
  --font:         'Outfit', system-ui, sans-serif;
}

@keyframes sb-slideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes sb-fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes activeDot {
  0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.6); }
  50%      { box-shadow: 0 0 0 5px rgba(129,140,248,0); }
}
@keyframes shimmerLine {
  0%   { opacity: 0.4; transform: scaleX(0.6); }
  50%  { opacity: 1;   transform: scaleX(1); }
  100% { opacity: 0.4; transform: scaleX(0.6); }
}
@keyframes countBadge {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.sb {
  width: var(--sb-w);
  min-width: var(--sb-w);
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 50;
  background: var(--sb-bg);
  border-right: 1px solid var(--sb-border);
  overflow: hidden;
  transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1),
              width    0.32s cubic-bezier(0.4, 0, 0.2, 1);
  background-image:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129,140,248,0.08) 0%, transparent 60%);
}
.sb::before {
  content: '';
  position: absolute;
  top: 0; left: 20px; right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(129,140,248,0.5), transparent);
  animation: shimmerLine 4s ease infinite;
}

.sb.closed {
  transform: translateX(-100%);
}

.sb-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--sb-border);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.18s;
  position: relative;
}
.sb-logo:hover { background: var(--sb-hover); }
.sb-logo img { width: 120px; height: auto; flex-shrink: 0; }
.sb-logo-pill {
  margin-left: auto;
  background: var(--accent-mid);
  border: 1px solid rgba(129,140,248,0.4);
  color: #c7d2fe;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font);
  letter-spacing: 0.1em;
  padding: 4px 10px;
  border-radius: 100px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.sb-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 0 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(129,140,248,0.3) transparent;
}
.sb-body::-webkit-scrollbar       { width: 4px; }
.sb-body::-webkit-scrollbar-thumb { background: rgba(129,140,248,0.3); border-radius: 3px; }

.sb-group { margin-bottom: 4px; }

.sb-group-hdr {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  border-radius: 0;
}
.sb-group-hdr:hover { background: var(--sb-hover); }

.sb-group-icon { font-size: 16px; line-height: 1; flex-shrink: 0; }

.sb-group-label {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t3);
  flex: 1;
  transition: color 0.15s;
}
.sb-group-hdr:hover .sb-group-label { color: var(--t2); }

.sb-chevron {
  color: var(--t4);
  font-size: 12px;
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), color 0.15s;
  flex-shrink: 0;
}
.sb-chevron.open {
  transform: rotate(180deg);
  color: var(--accent);
}

.sb-sep {
  height: 1px;
  background: var(--sb-border);
  margin: 8px 20px;
}

.sb-items {
  overflow: hidden;
  animation: sb-fadeUp 0.22s ease both;
}

.sb-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px 10px 32px;
  text-decoration: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  position: relative;
  transition:
    background   0.15s ease,
    border-color 0.15s ease,
    padding-left 0.18s ease,
    color        0.15s ease;
}
.sb-item:hover {
  background: var(--sb-hover);
  padding-left: 36px;
}
.sb-item-emoji {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.sb-item:hover .sb-item-emoji { transform: scale(1.15); }

.sb-item-label {
  font-family: var(--font);
  font-size: 14px;
  font-weight: 500;
  color: var(--t2);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}
.sb-item:hover .sb-item-label { color: var(--t1); }

.sb-badge {
  background: var(--accent-mid);
  border: 1px solid rgba(129,140,248,0.35);
  color: #c7d2fe;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font);
  padding: 3px 8px;
  border-radius: 100px;
  flex-shrink: 0;
  animation: countBadge 0.3s ease both;
}

.sb-item.active {
  background: var(--accent-soft);
  border-left-color: var(--accent);
  padding-left: 36px;
}
.sb-item.active .sb-item-label {
  color: #e2e8ff;
  font-weight: 600;
}
.sb-item.active::after {
  content: '';
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: activeDot 2.2s ease infinite;
}

.sb-new {
  font-size: 9px;
  font-weight: 700;
  font-family: var(--font);
  letter-spacing: 0.08em;
  color: #34d399;
  background: rgba(52,211,153,0.12);
  border: 1px solid rgba(52,211,153,0.3);
  padding: 3px 7px;
  border-radius: 100px;
  flex-shrink: 0;
}

.sb-footer {
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 1px solid var(--sb-border);
  background: rgba(0,0,0,0.2);
}

.sb-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid transparent;
}
.sb-user:hover {
  background: var(--sb-hover);
  border-color: var(--sb-border);
}

.sb-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--violet));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font);
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  box-shadow: 0 4px 12px var(--accent-glow);
  flex-shrink: 0;
  letter-spacing: 0.02em;
  position: relative;
}
.sb-avatar::after {
  content: '';
  position: absolute;
  bottom: -2px; right: -2px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid var(--sb-bg);
}

.sb-user-info { flex: 1; min-width: 0; }
.sb-username {
  font-family: var(--font);
  font-size: 14px;
  font-weight: 600;
  color: var(--t1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-role {
  font-family: var(--font);
  font-size: 11px;
  color: var(--t3);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-logout {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.25);
  color: #f87171;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  font-family: var(--font);
}
.sb-logout:hover {
  background: rgba(239,68,68,0.2);
  border-color: rgba(239,68,68,0.4);
  transform: scale(1.05);
  color: #fca5a5;
}

.sb-search {
  margin: 16px 16px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--sb-border);
  border-radius: 12px;
  padding: 10px 14px;
  transition: border-color 0.15s, background 0.15s;
}
.sb-search:focus-within {
  border-color: rgba(129,140,248,0.5);
  background: var(--accent-soft);
}
.sb-search-icon { font-size: 14px; color: var(--t3); flex-shrink: 0; }
.sb-search input {
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font);
  font-size: 13px;
  color: var(--t1);
  width: 100%;
}
.sb-search input::placeholder { color: var(--t3); }

.sb-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 49;
  animation: sb-fadeUp 0.2s ease;
}
`;

/* ═══════════════════════════════════════════════════════════
   NAV STRUCTURE
═══════════════════════════════════════════════════════════ */
const NAV = [
  {
    key: 'overview', label: 'Overview', icon: '⚡',
    items: [
      { to: '/admin-dashboard', label: 'Dashboard', emoji: '📊' },
    ],
  },
  {
    key: 'sales', label: 'Sales', icon: '💼',
    items: [
      { to: 'create-order',       label: 'Create Order',       emoji: '➕', badge: 'NEW' },
      { to: 'advance-approvals',  label: 'Advance Approvals',  emoji: '✅' },
      { to: 'view-orders',        label: 'View All Orders',    emoji: '📋' },
      { to: 'parties',            label: 'Clients',            emoji: '👥' },
      { to: 'quotation',          label: 'Quotation',          emoji: '💬' },
      { to: 'performance',        label: 'Performance',        emoji: '📈' },
      { to: 'view-prospective',   label: 'View Prospects',     emoji: '🎯' },
      { to: 'select-appointment', label: 'Appointments',       emoji: '📅' },
      { to: 'ledger',             label: 'Ledger',             emoji: '📒' },
      { to: 'purchase',           label: 'Purchase',           emoji: '🛒' },
    ],
  },
  {
    key: 'users', label: 'Manage Users', icon: '👤',
    items: [
      { to: 'add-executive',     label: 'Add Employee',        emoji: '➕' },
      { to: 'Employees',         label: 'Employees',           emoji: '👨‍💼' },
      { to: 'tele-breaks',       label: 'Tele Breaks',         emoji: '☕' },
      { to: 'unit-attendance',   label: 'Unit Attendance',     emoji: '🕐' },
      { to: 'view-leaves',       label: 'View Leave Requests', emoji: '🏖️' },
      { to: 'activity',          label: 'Target',              emoji: '🎯' },
      { to: 'executives-logins', label: 'Executive Login Time',emoji: '🔐' },
      { to: 'daily-report',      label: 'Daily Report',        emoji: '📄' },
      { to: 'fieldvisitsadmin',  label: 'Field Visits',        emoji: '📍' },
    ],
  },
  {
    key: 'reports', label: 'Reports', icon: '📊',
    items: [
      { to: 'daily-report',      label: 'Daily Report',        emoji: '📄' },
      { to: 'view-hrreport',     label: 'HR Report',           emoji: '👔' },
      { to: 'fieldvisitsadmin',  label: 'Field Visits',        emoji: '🗺️' },
    ],
  },
  {
    key: 'operations', label: 'Operations', icon: '🔧',
    items: [
      { to: 'assign-service',    label: 'Assign Service',      emoji: '🔄' },
      { to: 'pending-service',   label: 'Pending Service',     emoji: '⏳' },
      { to: 'view-design',       label: 'View Design',         emoji: '🎨' },
      { to: 'design-report',     label: 'Design Reports',      emoji: '🗂️' },
      { to: 'vendors',           label: 'Vendors',             emoji: '🏪' },
    ],
  },
  {
    key: 'accounts', label: 'Accounts', icon: '💰',
    items: [
      { to: 'pending-payment',   label: 'Pending Payment',     emoji: '💳' },
      { to: 'view-expenses',     label: 'View Expenses',       emoji: '💸' },
      { to: 'inventory',         label: 'Inventory',           emoji: '📦' },
    ],
  },
  {
    key: 'clients', label: 'Clients', icon: '🤝',
    items: [
      { to: 'prospects',         label: 'Create Prospects',    emoji: '🎯' },
      { to: 'appointments',      label: 'Create Appointments', emoji: '📅' },
    ],
  },
  {
    key: 'events', label: 'Events', icon: '🎉',
    items: [
      { to: 'create-anniversary',label: 'Create Anniversary',  emoji: '🎂' },
      { to: 'anniversary-list',  label: 'Anniversary List',    emoji: '📋' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   SIDEBAR COMPONENT
═══════════════════════════════════════════════════════════ */
function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const [openSec, setOpenSec] = useState({ overview: true });
  const [search, setSearch] = useState('');

  const userName = localStorage.getItem('userName') || 'Admin User';
  const initials = userName.split(' ').map(w => w[0]?.toUpperCase()).join('').slice(0, 2);
  const isMobile = window.innerWidth <= 768;

  const toggle = (key) => setOpenSec(p => ({ ...p, [key]: !p[key] }));
  const closeMob = () => { if (isMobile && onClose) onClose(); };

  const query = search.trim().toLowerCase();
  const filtered = query
    ? NAV.map(sec => ({
        ...sec,
        items: sec.items.filter(it => it.label.toLowerCase().includes(query)),
      })).filter(sec => sec.items.length > 0)
    : NAV;

  const handleNavigation = (to, e) => {
    if (e) e.preventDefault();
    if (to === 'create-order') {
      navigate('create-order');
    } else {
      navigate(to);
    }
    closeMob();
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace('/');
  };

  return (
    <>
      <style>{SIDEBAR_CSS}</style>

      {isMobile && open && (
        <div className="sb-overlay" onClick={onClose} />
      )}

      <aside className={`sb${open ? '' : ' closed'}`}>
        <div
          className="sb-logo"
          onClick={() => { handleNavigation('/admin-dashboard'); }}
        >
          <img src={GMSLogo} alt="GMS Logo" />
          <span className="sb-logo-pill">Admin</span>
        </div>

        <div className="sb-search">
          <span className="sb-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search menu…"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (e.target.value.trim()) {
                const expanded = {};
                NAV.forEach(s => expanded[s.key] = true);
                setOpenSec(expanded);
              }
            }}
          />
          {search && (
            <span
              style={{ color: 'var(--t3)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
              onClick={() => setSearch('')}
            >
              ✕
            </span>
          )}
        </div>

        <div className="sb-body">
          {filtered.map((sec, si) => (
            <div key={sec.key} className="sb-group">
              {si > 0 && <div className="sb-sep" />}
              <div
                className="sb-group-hdr"
                onClick={() => toggle(sec.key)}
              >
                <span className="sb-group-icon">{sec.icon}</span>
                <span className="sb-group-label">{sec.label}</span>
                <span className={`sb-chevron${openSec[sec.key] ? ' open' : ''}`}>
                  ▾
                </span>
              </div>
              {(openSec[sec.key] || query) && (
                <div className="sb-items">
                  {sec.items.map((item) => (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      className={({ isActive }) =>
                        `sb-item${isActive ? ' active' : ''}`
                      }
                      onClick={(e) => handleNavigation(item.to, e)}
                      style={{ animationDelay: `${sec.items.indexOf(item) * 0.03}s` }}
                    >
                      <span className="sb-item-emoji">{item.emoji}</span>
                      <span className="sb-item-label">{item.label}</span>
                      {item.badge === 'NEW' && (
                        <span className="sb-new">NEW</span>
                      )}
                      {item.count != null && (
                        <span className="sb-badge">{item.count}</span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
          {query && filtered.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--t3)',
              fontFamily: 'var(--font)',
              fontSize: 14,
            }}>
              No results for "{search}"
            </div>
          )}
        </div>

        <div className="sb-footer">
          <div
            className="sb-user"
            onClick={() => { handleNavigation('/admin-dashboard/profile'); }}
          >
            <div className="sb-avatar">{initials}</div>
            <div className="sb-user-info">
              <div className="sb-username">{userName}</div>
              <div className="sb-role">Administrator · GMS</div>
            </div>
            <button
              className="sb-logout"
              title="Sign out"
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const location = useLocation();
  const navigate = useNavigate();
  const [prospectiveData, setProspectiveData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  
  const [financialYear, setFinancialYear] = useState(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    if (currentMonth >= 0 && currentMonth <= 2) {
      return `${currentYear - 1}-${currentYear}`;
    }
    return `${currentYear}-${currentYear + 1}`;
  });
  
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);

  const [showWhatsAppDashboard, setShowWhatsAppDashboard] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [orderNumber, setOrderNumber] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState('order');

  const monthLabels = [
    'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
  ];

  const getFinancialYears = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const years = [];
    years.push('all');
    for (let i = -10; i <= 5; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      years.push(`${startYear}-${endYear}`);
    }
    return [...new Set(years)].sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      const aStart = parseInt(a.split('-')[0]);
      const bStart = parseInt(b.split('-')[0]);
      return bStart - aStart;
    });
  };

  const financialYears = getFinancialYears();

  const getClientTypeData = () => {
    const defaultTypes = {
      Retail: { count: 0, amount: 0 },
      Renewal: { count: 0, amount: 0 },
      Agent: { count: 0, amount: 0 },
      'Renewal-Agent': { count: 0, amount: 0 }
    };
    if (!chartData?.clientTypes) return defaultTypes;
    if (chartData.clientTypes.Retail && typeof chartData.clientTypes.Retail === 'object') {
      return chartData.clientTypes;
    }
    return {
      Retail: { count: chartData.clientTypes.Retail || 0, amount: 0 },
      Renewal: { count: chartData.clientTypes.Renewal || 0, amount: 0 },
      Agent: { count: chartData.clientTypes.Agent || 0, amount: 0 },
      'Renewal-Agent': { count: chartData.clientTypes['Renewal-Agent'] || 0, amount: 0 }
    };
  };

  const clientTypes = getClientTypeData();

  const handleMenuItemClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth > 768;
      setSidebarOpen(isDesktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setWeeklyLoading(true);
      try {
        const params = new URLSearchParams();
        if (useDateRange && startDate && endDate) {
          params.append('startDate', startDate);
          params.append('endDate', endDate);
        } else {
          if (financialYear !== 'all') {
            params.append('financialYear', financialYear);
          } else {
            params.append('financialYear', 'all');
          }
          if (selectedMonth !== null) {
            params.append('month', selectedMonth + 1);
          }
        }
        const [chartRes, prospectRes] = await Promise.all([
          axios.get(`/api/dashboard/chart-data?${params.toString()}`).catch(err => {
            console.error('Chart data error:', err);
            return { data: null };
          }),
          axios.get(`/api/prospective-clients/stats?${params.toString()}`).catch(err => {
            console.error('Prospective data error:', err);
            return { data: null };
          })
        ]);
        if (chartRes && chartRes.data) {
          setChartData(chartRes.data);
        } else {
          setChartData(null);
        }
        if (prospectRes && prospectRes.data) {
          setProspectiveData(prospectRes.data);
        } else {
          setProspectiveData(null);
        }
      } catch (err) {
        console.error('API Error:', err);
        setChartData(null);
        setProspectiveData(null);
      } finally {
        setLoading(false);
        setWeeklyLoading(false);
      }
    };
    fetchDashboardData();
  }, [financialYear, selectedMonth, startDate, endDate, useDateRange]);

  useEffect(() => {
    const fetchComparisonData = async () => {
      setComparisonLoading(true);
      try {
        const params = new URLSearchParams();
        if (useDateRange && startDate && endDate) {
          params.append('startDate', startDate);
          params.append('endDate', endDate);
        } else {
          if (financialYear !== 'all') {
            params.append('financialYear', financialYear);
          }
          if (selectedMonth !== null) {
            params.append('month', selectedMonth + 1);
          }
        }
        const response = await axios.get(`/api/dashboard/comparison-data?${params.toString()}`);
        if (response.data) {
          setComparisonData(response.data);
        } else {
          setComparisonData(null);
        }
      } catch (err) {
        console.error('Error fetching comparison data:', err);
        setComparisonData(null);
      } finally {
        setComparisonLoading(false);
      }
    };
    fetchComparisonData();
  }, [financialYear, selectedMonth, startDate, endDate, useDateRange]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get('/api/whatsapp/unread-count');
        setUnreadCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (orderNumber.length !== 10) {
      setSearchError('Please enter exactly 10 digits');
      return;
    }
    setIsSearchLoading(true);
    setSearchError('');
    try {
      if (selectedFormType === 'order') {
        const response = await axios.get(`/api/by-phone?phone=${orderNumber}`);
        if (response.data) {
          setShowOrderForm(true);
          setExistingOrderData(response.data.order || null);
        }
      } else {
        setShowOrderForm(true);
        setExistingOrderData(null);
      }
    } catch (error) {
      if (error.response?.status === 404 && selectedFormType === 'order') {
        setShowOrderForm(true);
        setExistingOrderData(null);
      } else {
        console.error('Search failed:', error);
        setSearchError(error.response?.data?.message || 'Failed to search. Please try again.');
      }
    } finally {
      setIsSearchLoading(false);
    }
  };

  const showDashboardCards = location.pathname === '/admin-dashboard';
  const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

  const pendingPayments = safeArray(chartData?.pendingPayments);
  const appointments = safeArray(chartData?.appointments);

  const getTotalOrdersCount = () => {
    if (!chartData) return 0;
    if (selectedMonth !== null) {
      return chartData?.weeklyOrders?.reduce((sum, w) => sum + (w.count || 0), 0) || 0;
    }
    return safeArray(chartData?.totalOrdersByMonth).reduce((a, b) => a + b, 0);
  };

  const handleChartClick = (chartType) => {
    if (chartType === 'pending-payment') {
      const queryParams = new URLSearchParams();
      if (financialYear !== 'all') {
        queryParams.append('financialYear', financialYear);
      } else {
        queryParams.append('financialYear', 'all');
      }
      if (selectedMonth !== null) {
        queryParams.append('month', selectedMonth + 1);
      }
      queryParams.append('filterType', 'pending');
      navigate(`/admin-dashboard/pending-payment${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
    } else if (chartType === 'completed-payment') {
      const queryParams = new URLSearchParams();
      if (financialYear !== 'all') {
        queryParams.append('financialYear', financialYear);
      } else {
        queryParams.append('financialYear', 'all');
      }
      if (selectedMonth !== null) {
        queryParams.append('month', selectedMonth + 1);
      }
      queryParams.append('filterType', 'completed');
      navigate(`/admin-dashboard/pending-payment${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
    } else if (chartType === 'pending-service') {
      const queryParams = new URLSearchParams();
      if (financialYear !== 'all') {
        queryParams.append('financialYear', financialYear);
      } else {
        queryParams.append('financialYear', 'all');
      }
      if (selectedMonth !== null) {
        queryParams.append('month', selectedMonth + 1);
      } else {
        queryParams.append('month', 'all');
      }
      navigate(`/admin-dashboard/pending-service${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
    } else if (chartType === 'revenue') {
      navigate('/admin-dashboard/view-orders');
    } else if (chartType === 'daily-report') {
      navigate('/admin-dashboard/daily-report');
    }
  };

  const handleCreateOrderClick = (e) => {
    if (e) e.preventDefault();
    setShowOrderForm(false);
    setOrderNumber('');
    navigate('create-order');
    handleMenuItemClick();
  };

  const handleClearFilters = () => {
    setFinancialYear('all');
    setSelectedMonth(null);
    setStartDate('');
    setEndDate('');
    setUseDateRange(false);
  };

  const getTimePeriodText = () => {
    if (useDateRange && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    if (selectedMonth !== null) {
      return `${monthLabels[selectedMonth]} ${financialYear !== 'all' ? `(FY ${financialYear})` : '(All Years)'}`;
    }
    return financialYear === 'all' ? 'All Financial Years' : `Financial Year ${financialYear}`;
  };

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      marginLeft: sidebarOpen ? '280px' : '0',
      padding: '20px',
      transition: 'margin-left 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
      overflowY: 'auto',
      backgroundColor: '#f0f2f5',
      backgroundImage: 'linear-gradient(to bottom right, #f0f2f5, #e6e9ed)',
      height: '100vh',
      position: 'relative',
    },
    whatsappButton: {
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      width: '60px',
      height: '60px',
      backgroundColor: '#25D366',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
      zIndex: 1000,
      transition: 'all 0.3s ease',
      border: 'none',
    },
    whatsappIcon: {
      fontSize: '32px',
      color: 'white',
    },
    unreadBadge: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      backgroundColor: '#FF3B30',
      color: 'white',
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    dashboardCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginTop: '20px',
      width: '100%',
      height: 'auto',
      minHeight: 'auto',
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#003366',
      padding: '20px',
      height: 'auto',
      minHeight: '350px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
    },
    cardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
    },
    revenueCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#003366',
      padding: '20px',
      height: 'auto',
      minHeight: '350px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative',
    },
    revenueAmount: {
      fontSize: '32px',
      color: '#003366',
      marginTop: '10px',
      fontWeight: 'bold',
    },
    revenueSubtext: {
      fontSize: '14px',
      color: '#666',
      marginTop: '5px',
    },
    growthBadge: {
      position: 'absolute',
      top: '15px',
      right: '15px',
      backgroundColor: '#e6f7ff',
      color: '#003366',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
    },
    revenueChart: {
      width: '100%',
      height: '180px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      marginTop: '10px',
    },
    number: {
      fontSize: '40px',
      color: '#002244',
      marginTop: '10px',
    },
    pieChart: {
      width: '100%',
      height: '180px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    yearSelectorWrapper: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      gap: '10px',
      flexWrap: 'wrap',
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    yearSelectorLabel: {
      fontWeight: 'bold',
      color: '#003366',
      fontSize: '16px',
    },
    yearSelector: {
      padding: '5px',
      fontSize: '14px',
      width: '120px',
      border: '1px solid #d9d9d9',
      borderRadius: '4px'
    },
    monthSelector: {
      padding: '5px',
      fontSize: '14px',
      width: '100px',
      border: '1px solid #d9d9d9',
      borderRadius: '4px'
    },
    dateInput: {
      padding: '5px',
      fontSize: '14px',
      width: '130px',
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      marginRight: '5px'
    },
    applyDateButton: {
      padding: '5px 10px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold',
      marginRight: '5px'
    },
    chartContainer: {
      width: '100%',
      height: '220px',
      position: 'relative',
    },
    clickableSection: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: '40px',
      left: 0,
      cursor: 'pointer',
    },
    phoneInputContainer: {
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    phoneInput: {
      padding: '8px',
      fontSize: '1rem',
      width: '200px',
      marginRight: '10px',
      border: '1px solid #ccc',
      borderRadius: '4px'
    },
    searchButton: {
      padding: '8px 16px',
      fontSize: '1rem',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    errorText: {
      color: 'red',
      marginTop: '8px'
    },
    formTypeContainer: {
      margin: '15px 0',
      display: 'flex',
      gap: '20px'
    },
    formTypeLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      cursor: 'pointer'
    },
    formTypeRadio: {
      marginRight: '5px'
    },
    timePeriodText: {
      fontSize: '14px',
      color: '#666',
      marginTop: '5px',
      fontStyle: 'italic',
      backgroundColor: '#f0f7ff',
      padding: '8px',
      borderRadius: '4px',
      marginBottom: '15px'
    },
    clearButton: {
      padding: '5px 10px',
      backgroundColor: '#f0f0f0',
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      color: '#003366'
    },
    noDataMessage: {
      height: '220px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#666',
      fontSize: '14px'
    },
    dailyActivitiesCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#003366',
      padding: '20px',
      height: 'auto',
      minHeight: '350px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative',
    },
    dailyActivitiesChart: {
      width: '100%',
      height: '220px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      marginTop: '10px',
    },
    totalStats: {
      display: 'flex',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: '10px',
      padding: '8px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
    },
    statItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    statValue: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#003366',
    },
    statLabel: {
      fontSize: '10px',
      color: '#666',
      marginTop: '2px',
    },
    dateDisplay: {
      fontSize: '11px',
      color: '#666',
      marginTop: '8px',
      fontStyle: 'italic'
    },
    mobileMenuButton: {
      position: 'fixed',
      top: '16px',
      left: '16px',
      zIndex: 100,
      width: '44px',
      height: '44px',
      background: '#0f172a',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: '#94a3b8',
      fontSize: '20px',
      transition: 'all 0.15s',
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    }
  };

  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    if (!location.pathname.includes('create-order')) {
      setShowOrderForm(false);
      setOrderNumber('');
      setExistingOrderData(null);
    }
  }, [location.pathname]);

  return (
    <div style={styles.container}>
      {window.innerWidth <= 768 && (
        <button
          style={styles.mobileMenuButton}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#818cf8';
            e.currentTarget.style.color = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      )}

      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div style={styles.content}>
        {location.pathname.includes('create-order') ? (
          <>
            {!showOrderForm ? (
              <div style={styles.phoneInputContainer}>
                <label htmlFor="order-number" style={{ display: 'block', marginBottom: '8px' }}>
                  Enter Phone Number
                </label>
                <input
                  id="order-number"
                  type="text"
                  value={orderNumber}
                  maxLength={10}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) {
                      setOrderNumber(value);
                      if (searchError) setSearchError('');
                    }
                  }}
                  placeholder="Enter 10-digit number"
                  style={styles.phoneInput}
                />

                <div style={styles.formTypeContainer}>
                  <label style={styles.formTypeLabel}>
                    <input
                      type="radio"
                      name="formType"
                      value="order"
                      checked={selectedFormType === 'order'}
                      onChange={() => setSelectedFormType('order')}
                      style={styles.formTypeRadio}
                    />
                    Order Form
                  </label>
                  <label style={styles.formTypeLabel}>
                    <input
                      type="radio"
                      name="formType"
                      value="digital"
                      checked={selectedFormType === 'digital'}
                      onChange={() => setSelectedFormType('digital')}
                      style={styles.formTypeRadio}
                    />
                    Digital Marketing Form
                  </label>
                </div>

                <button
                  onClick={handleSearch}
                  disabled={isSearchLoading || orderNumber.length !== 10}
                  style={styles.searchButton}
                >
                  {isSearchLoading ? 'Searching...' :
                    selectedFormType === 'order' ? 'Search Orders' : 'Create Digital Order'}
                </button>
                {searchError && (
                  <div style={styles.errorText}>
                    {searchError}
                  </div>
                )}
              </div>
            ) : (
              selectedFormType === 'order' ? (
                <OrderForm
                  orderNumber={orderNumber}
                  existingData={existingOrderData}
                  onBack={() => {
                    setShowOrderForm(false);
                    setOrderNumber('');
                    setExistingOrderData(null);
                  }}
                  onSuccess={() => {
                    setShowOrderForm(false);
                    setOrderNumber('');
                    setExistingOrderData(null);
                  }}
                  isAdmin={true}
                />
              ) : (
                <div>
                  <button
                    onClick={() => setShowOrderForm(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginBottom: '20px'
                    }}
                  >
                    Back
                  </button>
                  <DigitalMarketingOrderForm
                    isAdmin={true}
                    onSuccess={() => {
                      setShowOrderForm(false);
                      setOrderNumber('');
                    }}
                  />
                </div>
              )
            )}
          </>
        ) : (
          <>
            <Outlet />
            {showDashboardCards && (
              <>
                <div style={styles.yearSelectorWrapper}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label htmlFor="financial-year-select" style={styles.yearSelectorLabel}>
                      Financial Year:
                    </label>
                    <select
                      id="financial-year-select"
                      value={financialYear}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        setFinancialYear(selectedValue);
                        setSelectedMonth(null);
                        setUseDateRange(false);
                      }}
                      style={styles.yearSelector}
                      disabled={useDateRange}
                    >
                      {financialYears.map((fy) => (
                        <option key={fy} value={fy}>
                          {fy === 'all' ? 'ALL FINANCIAL YEARS' : fy}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="month-select" style={styles.yearSelectorLabel}>
                      Month:
                    </label>
                    <select
                      id="month-select"
                      value={selectedMonth !== null ? selectedMonth + 1 : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedMonth(value ? parseInt(value) - 1 : null);
                        setUseDateRange(false);
                      }}
                      style={styles.monthSelector}
                      disabled={useDateRange}
                    >
                      <option value="">All Months</option>
                      {monthLabels.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>

                    <label style={styles.yearSelectorLabel}>From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value && endDate) {
                          setUseDateRange(true);
                          setFinancialYear('all');
                          setSelectedMonth(null);
                        }
                      }}
                      style={styles.dateInput}
                    />
                    
                    <label style={styles.yearSelectorLabel}>To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        if (startDate && e.target.value) {
                          setUseDateRange(true);
                          setFinancialYear('all');
                          setSelectedMonth(null);
                        }
                      }}
                      style={styles.dateInput}
                    />

                    <button
                      onClick={handleClearFilters}
                      style={{
                        ...styles.clearButton,
                        marginTop: '-10px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e0e0e0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                <div style={styles.timePeriodText}>
                  Currently viewing: <strong>{getTimePeriodText()}</strong>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px', color: '#003366' }}>
                    Loading dashboard data...
                  </div>
                ) : !chartData ? (
                  <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px', color: '#ff4d4f' }}>
                    Error loading dashboard data. Please try again.
                  </div>
                ) : (
                  <div style={styles.dashboardCards}>
                    <div 
                      style={{
                        ...styles.card,
                        ...(hoveredCard === 'revenueOrders' ? styles.cardHover : {})
                      }}
                      onMouseEnter={() => setHoveredCard('revenueOrders')}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={(e) => {
                        if (e.target.tagName !== 'BUTTON') {
                          const queryParams = new URLSearchParams();
                          if (selectedMonth !== null) {
                            queryParams.append('month', selectedMonth + 1);
                          }
                          if (financialYear !== 'all') {
                            queryParams.append('financialYear', financialYear);
                          }
                          navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                        }
                      }}
                    >
                      <div>Revenue & Orders {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : financialYear === 'all' ? '(All Financial Years)' : '(Monthly)'}</div>
                      <div style={styles.chartContainer}>
                        <Bar
                          data={{
                            labels: selectedMonth !== null
                              ? chartData?.weeklyOrders?.map((_, i) => `Week ${i + 1}`) || ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']
                              : monthLabels,
                            datasets: [
                              {
                                label: 'Total Revenue',
                                data: selectedMonth !== null
                                  ? chartData?.weeklyOrders?.map(w => w.amount || 0) || []
                                  : safeArray(chartData?.amountByMonth),
                                backgroundColor: 'rgba(49, 122, 176, 0.7)',
                                borderColor: 'rgba(49, 122, 176, 1)',
                                borderWidth: 1,
                                borderRadius: 8,
                                yAxisID: 'y-revenue',
                              },
                              {
                                label: 'Total Orders',
                                data: selectedMonth !== null
                                  ? chartData?.weeklyOrders?.map(w => w.count) || []
                                  : safeArray(chartData?.totalOrdersByMonth),
                                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 1,
                                borderRadius: 8,
                                yAxisID: 'y-orders',
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: {
                                  usePointStyle: true,
                                  boxWidth: 10,
                                }
                              },
                              tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: '#317ab0',
                                borderWidth: 1,
                                cornerRadius: 8,
                                padding: 12,
                                callbacks: {
                                  label: (context) => {
                                    const label = context.dataset.label;
                                    const value = context.raw;
                                    if (label === 'Total Revenue') {
                                      if (value >= 10000000) {
                                        return `Revenue: ₹${(value / 10000000).toFixed(2)} Cr`;
                                      } else if (value >= 100000) {
                                        return `Revenue: ₹${(value / 100000).toFixed(2)} L`;
                                      } else {
                                        return `Revenue: ₹${value.toLocaleString('en-IN')}`;
                                      }
                                    } else {
                                      return `Orders: ${value}`;
                                    }
                                  }
                                }
                              }
                            },
                            onClick: (_, elements) => {
                              if (elements.length > 0) {
                                const queryParams = new URLSearchParams();
                                if (selectedMonth === null) {
                                  const clickedMonth = elements[0].index + 1;
                                  queryParams.append('month', clickedMonth);
                                  if (financialYear !== 'all') {
                                    queryParams.append('financialYear', financialYear);
                                  }
                                } else {
                                  queryParams.append('month', selectedMonth + 1);
                                  if (financialYear !== 'all') {
                                    queryParams.append('financialYear', financialYear);
                                  }
                                }
                                navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                              }
                            },
                            scales: {
                              x: {
                                grid: { display: true, color: 'rgba(49, 122, 176, 0.1)' },
                                ticks: { autoSkip: false, color: '#317ab0' }
                              },
                              'y-revenue': {
                                type: 'linear',
                                position: 'left',
                                beginAtZero: true,
                                grid: { color: 'rgba(49, 122, 176, 0.1)' },
                                title: {
                                  display: true,
                                  text: 'Revenue (₹)',
                                  color: '#317ab0',
                                },
                                ticks: {
                                  callback: function(value) {
                                    if (value >= 10000000) {
                                      return (value / 10000000).toFixed(1) + 'Cr';
                                    } else if (value >= 100000) {
                                      return (value / 100000).toFixed(1) + 'L';
                                    } else if (value >= 1000) {
                                      return (value / 1000).toFixed(1) + 'K';
                                    }
                                    return value;
                                  },
                                  color: '#317ab0'
                                }
                              },
                              'y-orders': {
                                type: 'linear',
                                position: 'right',
                                beginAtZero: true,
                                grid: { drawOnChartArea: false },
                                title: {
                                  display: true,
                                  text: 'Orders',
                                  color: '#36a2eb',
                                },
                                ticks: {
                                  stepSize: 1,
                                  color: '#36a2eb'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '15px', gap: '20px' }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={styles.number}>
                            {selectedMonth !== null 
                              ? (() => {
                                  const amount = chartData?.amountByMonth?.[selectedMonth] || 0;
                                  if (amount >= 10000000) {
                                    return (amount / 10000000).toFixed(2) + 'Cr';
                                  } else if (amount >= 100000) {
                                    return (amount / 100000).toFixed(2) + 'L';
                                  } else {
                                    return amount.toLocaleString('en-IN');
                                  }
                                })()
                              : (() => {
                                  const total = safeArray(chartData?.amountByMonth).reduce((sum, amount) => sum + amount, 0);
                                  if (total >= 10000000) {
                                    return (total / 10000000).toFixed(2) + 'Cr';
                                  } else if (total >= 100000) {
                                    return (total / 100000).toFixed(2) + 'L';
                                  } else {
                                    return total.toLocaleString('en-IN');
                                  }
                                })()
                            }
                          </div>
                          <div style={styles.revenueSubtext}>Total Revenue</div>
                        </div>
                        <div style={{ width: '1px', backgroundColor: '#e0e0e0' }} />
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={styles.number}>{getTotalOrdersCount()}</div>
                          <div style={styles.revenueSubtext}>Total Orders</div>
                        </div>
                      </div>
                      
                      {selectedMonth !== null && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMonth(null);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#317ab0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginTop: '10px',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                        >
                          View All Months
                        </button>
                      )}
                    </div>

                    <div 
                      style={{
                        ...styles.card,
                        ...(hoveredCard === 'payment' ? styles.cardHover : {})
                      }}
                      onMouseEnter={() => setHoveredCard('payment')}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div>Payment Status {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : financialYear === 'all' ? '(All Financial Years)' : ''}</div>
                      <div style={styles.pieChart}>
                        <Doughnut
                          data={{
                            labels: ['Paid', 'Pending'],
                            datasets: [
                              {
                                data: pendingPayments.length === 2 ? pendingPayments : [0, 0],
                                backgroundColor: ['#27ae60', '#e74c3c'],
                              },
                            ],
                          }}
                          options={{
                            onClick: (e, elements) => {
                              if (elements.length > 0) {
                                if (elements[0].index === 1) {
                                  handleChartClick('pending-payment');
                                } else if (elements[0].index === 0) {
                                  handleChartClick('completed-payment');
                                }
                              }
                            },
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginTop: '10px' }}>
                        <div 
                          style={{ textAlign: 'center', cursor: 'pointer' }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChartClick('completed-payment');
                          }}
                        >
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#27ae60' }}>{pendingPayments[0] || 0}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Paid</div>
                        </div>
                        <div 
                          style={{ textAlign: 'center', cursor: 'pointer' }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChartClick('pending-payment');
                          }}
                        >
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>{pendingPayments[1] || 0}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Pending</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#e74c3c', marginTop: '5px', fontWeight: 'bold' }}>
                        Pending Amount: ₹{(chartData?.pendingAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div 
                      style={{
                        ...styles.card,
                        ...(hoveredCard === 'service' ? styles.cardHover : {})
                      }}
                      onMouseEnter={() => setHoveredCard('service')}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => {
                        const queryParams = new URLSearchParams();
                        
                        if (financialYear !== 'all') {
                          queryParams.append('financialYear', financialYear);
                        } else {
                          queryParams.append('financialYear', 'all');
                        }
                        
                        if (selectedMonth !== null) {
                          queryParams.append('month', selectedMonth + 1);
                        } else {
                          queryParams.append('month', 'all');
                        }
                        
                        navigate(`/admin-dashboard/pending-service${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
                      }}
                    >
                      <div>
                        Service Status {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : financialYear === 'all' ? '(All Financial Years)' : ''}
                      </div>
                      <div style={styles.pieChart}>
                        {(() => {
                          const serviceData = [
                            chartData?.serviceStatus?.pending || 0,
                            chartData?.serviceStatus?.assigned || 0,
                            chartData?.serviceStatus?.updated || 0,
                            chartData?.serviceStatus?.completed || 0,
                            chartData?.serviceStatus?.designPending || 0,
                            chartData?.serviceStatus?.printing || 0,
                            chartData?.serviceStatus?.installationPending || 0,
                            chartData?.serviceStatus?.onboarding || 0
                          ];

                          const totalServices = serviceData.reduce((a, b) => a + b, 0);

                          const statusMap = [
                            { value: 'pending', label: 'Pending' },
                            { value: 'assigned to', label: 'Assigned' },
                            { value: 'updated', label: 'Updated' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'design pending', label: 'Design Pending' },
                            { value: 'printing', label: 'Printing' },
                            { value: 'installation pending', label: 'Installation Pending' },
                            { value: 'onboarding', label: 'Onboarding' }
                          ];

                          return (
                            <Doughnut
                              data={{
                                labels: [
                                  'Pending',
                                  'Assigned',
                                  'Updated',
                                  'Completed',
                                  'Design Pending',
                                  'Printing',
                                  'Installation Pending',
                                  'Onboarding'
                                ],
                                datasets: [
                                  {
                                    data: serviceData,
                                    backgroundColor: [
                                      '#e74c3c',
                                      '#3498db',
                                      '#9b59b6',
                                      '#2ecc71',
                                      '#e67e22',
                                      '#f39c12',
                                      '#34495e',
                                      '#1abc9c'
                                    ],
                                    borderColor: '#ffffff',
                                    borderWidth: 2,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '70%',
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    callbacks: {
                                      label: function (context) {
                                        const value = context.raw || 0;
                                        const percentage = totalServices > 0 ? ((value / totalServices) * 100).toFixed(1) : 0;
                                        return `${context.label}: ${value} (${percentage}%)`;
                                      }
                                    }
                                  },
                                  afterDraw: function (chart) {
                                    const width = chart.width;
                                    const height = chart.height;
                                    const ctx = chart.ctx;

                                    ctx.restore();

                                    if (totalServices > 0) {
                                      const completedCount = serviceData[3] + serviceData[1] + serviceData[2] + serviceData[7];
                                      const completedPercentage = ((completedCount / totalServices) * 100).toFixed(1);

                                      ctx.font = 'bold 20px Arial';
                                      ctx.textBaseline = 'middle';
                                      ctx.textAlign = 'center';
                                      ctx.fillStyle = '#2c3e50';
                                      ctx.fillText(`${completedPercentage}%`, width / 2, height / 2);
                                    }

                                    ctx.save();
                                  }
                                },
                                onClick: (event, elements) => {
                                  if (elements && elements.length > 0) {
                                    const clickedIndex = elements[0].index;
                                    const clickedStatus = statusMap[clickedIndex];
                                    
                                    const queryParams = new URLSearchParams();
                                    
                                    queryParams.append('status', clickedStatus.value);
                                    
                                    if (financialYear !== 'all') {
                                      queryParams.append('financialYear', financialYear);
                                    }
                                    
                                    if (selectedMonth !== null) {
                                      queryParams.append('month', (selectedMonth + 1).toString());
                                    }
                                    
                                    navigate(`/admin-dashboard/pending-service?${queryParams.toString()}`);
                                  }
                                }
                              }}
                            />
                          );
                        })()}
                      </div>
                      <div style={styles.number}>
                        {Object.entries(chartData?.serviceStatus || {})
                          .filter(([key]) => key !== 'completed')
                          .reduce((sum, [, value]) => sum + value, 0)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                        Total Services
                      </div>
                    </div>

                    <div 
                      style={{
                        ...styles.card,
                        ...(hoveredCard === 'appointments' ? styles.cardHover : {})
                      }}
                      onMouseEnter={() => setHoveredCard('appointments')}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => {
                        const queryParams = new URLSearchParams();
                        if (selectedMonth !== null) {
                          queryParams.append('month', selectedMonth + 1);
                        }
                        if (financialYear !== 'all') {
                          queryParams.append('financialYear', financialYear);
                        }
                        navigate(`/admin-dashboard/select-appointment${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
                      }}
                    >
                      <div>Appointments {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : financialYear === 'all' ? '(All Financial Years)' : ''}</div>
                      <div style={styles.pieChart}>
                        <PolarArea
                          data={{
                            labels: ['Done', 'Upcoming'],
                            datasets: [
                              {
                                data: appointments.length === 2 ? appointments : [0, 0],
                                backgroundColor: [' #27ae60', '#e74c3c'],
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'right' } },
                            onClick: (event, elements) => {
                              if (elements.length > 0) {
                                const queryParams = new URLSearchParams();
                                if (selectedMonth !== null) {
                                  queryParams.append('month', selectedMonth + 1);
                                }
                                if (financialYear !== 'all') {
                                  queryParams.append('financialYear', financialYear);
                                }
                                navigate(`/admin-dashboard/select-appointment${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
                              }
                            },
                          }}
                        />
                      </div>
                      <div style={styles.number}>{appointments[1] || 0}</div>
                    </div>

                    <div 
                      style={{
                        ...styles.card,
                        ...(hoveredCard === 'clientTypes' ? styles.cardHover : {})
                      }}
                      onMouseEnter={() => setHoveredCard('clientTypes')}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={(e) => {
                        if (e.target.tagName !== 'BUTTON') {
                          const queryParams = new URLSearchParams();
                          if (selectedMonth !== null) {
                            queryParams.append('month', selectedMonth + 1);
                          }
                          if (financialYear !== 'all') {
                            queryParams.append('financialYear', financialYear);
                          }
                          navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                        }
                      }}
                    >
                      <div>Client Overview {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : financialYear === 'all' ? '(All Financial Years)' : ''}</div>
                      <div style={styles.chartContainer}>
                        <Bar
                          data={{
                            labels: ['Retail', 'Renewal', 'Agent', 'Renewal-Agent'],
                            datasets: [
                              {
                                label: 'Orders',
                                data: [
                                  clientTypes.Retail?.count !== undefined ? clientTypes.Retail.count : (clientTypes.Retail || 0),
                                  clientTypes.Renewal?.count !== undefined ? clientTypes.Renewal.count : (clientTypes.Renewal || 0),
                                  clientTypes.Agent?.count !== undefined ? clientTypes.Agent.count : (clientTypes.Agent || 0),
                                  clientTypes['Renewal-Agent']?.count !== undefined ? clientTypes['Renewal-Agent'].count : (clientTypes['Renewal-Agent'] || 0),
                                ],
                                backgroundColor: ['#36A2EB', '#4BC0C0', '#FFCE56', '#9966FF'],
                              }
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    const label = context.label || '';
                                    const count = context.raw || 0;
                                    let amount = 0;
                                    
                                    if (label === 'Retail') amount = clientTypes.Retail?.amount || 0;
                                    else if (label === 'Renewal') amount = clientTypes.Renewal?.amount || 0;
                                    else if (label === 'Agent') amount = clientTypes.Agent?.amount || 0;
                                    else if (label === 'Renewal-Agent') amount = clientTypes['Renewal-Agent']?.amount || 0;
                                    
                                    return [
                                      `Orders: ${count}`,
                                      `Amount: ₹${amount.toLocaleString('en-IN')}`
                                    ];
                                  }
                                }
                              }
                            },
                            onClick: (event, elements) => {
                              if (elements && elements.length > 0) {
                                const clientTypesList = ['Retail', 'Renewal', 'Agent', 'Renewal-Agent'];
                                const selectedType = clientTypesList[elements[0].index];

                                const queryParams = new URLSearchParams();
                                queryParams.append('clientType', selectedType);

                                if (selectedMonth !== null) {
                                  queryParams.append('month', selectedMonth + 1);
                                }
                                if (financialYear !== 'all') {
                                  queryParams.append('financialYear', financialYear);
                                }

                                navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                              }
                            }
                          }}
                        />
                      </div>
                      <div style={styles.number}>
                        {(
                          (clientTypes.Retail?.count !== undefined ? clientTypes.Retail.count : (clientTypes.Retail || 0)) +
                          (clientTypes.Renewal?.count !== undefined ? clientTypes.Renewal.count : (clientTypes.Renewal || 0)) +
                          (clientTypes.Agent?.count !== undefined ? clientTypes.Agent.count : (clientTypes.Agent || 0)) +
                          (clientTypes['Renewal-Agent']?.count !== undefined ? clientTypes['Renewal-Agent'].count : (clientTypes['Renewal-Agent'] || 0))
                        )}
                      </div>
                    </div>

                    <div 
                      style={{
                        ...styles.card,
                        ...(hoveredCard === 'agentOrders' ? styles.cardHover : {})
                      }}
                      onMouseEnter={() => setHoveredCard('agentOrders')}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={(e) => {
                        if (e.target.tagName !== 'BUTTON') {
                          const queryParams = new URLSearchParams();
                          queryParams.append('clientType', 'Agent');
                          if (selectedMonth !== null) {
                            queryParams.append('month', selectedMonth + 1);
                          }
                          if (financialYear !== 'all') {
                            queryParams.append('financialYear', financialYear);
                          }
                          navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                        }
                      }}
                    >
                      <div>Agent Orders {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : financialYear === 'all' ? '(All Financial Years)' : '(Monthly)'}</div>
                      {loading ? (
                        <div style={styles.noDataMessage}>Loading agent data...</div>
                      ) : (
                        <>
                          <div style={styles.chartContainer}>
                            <Bar
                              data={{
                                labels: selectedMonth !== null
                                  ? ['Agent Orders']
                                  : monthLabels,
                                datasets: [
                                  {
                                    label: 'Agent Orders',
                                    data: selectedMonth !== null
                                      ? [clientTypes.Agent?.count || 0]
                                      : (() => {
                                          if (chartData?.agentOrdersByMonth && Array.isArray(chartData.agentOrdersByMonth)) {
                                            return chartData.agentOrdersByMonth;
                                          } else {
                                            const totalAgentOrders = clientTypes.Agent?.count || 0;
                                            return monthLabels.map((_, monthIndex) => {
                                              if (selectedMonth === null) {
                                                return 0;
                                              }
                                              return monthIndex === selectedMonth ? totalAgentOrders : 0;
                                            });
                                          }
                                        })(),
                                    backgroundColor: 'rgba(255, 206, 86, 0.7)',
                                    borderRadius: 8,
                                  }
                                ]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                                        const count = context.raw || 0;
                                        let amount = 0;
                                        if (chartData?.agentAmountByMonth && Array.isArray(chartData.agentAmountByMonth)) {
                                          amount = chartData.agentAmountByMonth[context.dataIndex] || 0;
                                        }
                                        return [
                                          `Orders: ${count}`,
                                          `Amount: ₹${amount.toLocaleString('en-IN')}`
                                        ];
                                      }
                                    }
                                  }
                                },
                                onClick: (_, elements) => {
                                  if (elements && elements.length > 0) {
                                    const queryParams = new URLSearchParams();
                                    queryParams.append('clientType', 'Agent');
                                    
                                    if (selectedMonth === null) {
                                      const clickedMonth = elements[0].index + 1;
                                      queryParams.append('month', clickedMonth);
                                    } else {
                                      queryParams.append('month', selectedMonth + 1);
                                    }
                                    if (financialYear !== 'all') {
                                      queryParams.append('financialYear', financialYear);
                                    }
                                    
                                    navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                                  }
                                },
                                scales: {
                                  x: {
                                    title: {
                                      display: selectedMonth === null,
                                      text: 'Month',
                                      font: { size: 10 }
                                    },
                                    ticks: {
                                      maxRotation: 45,
                                      minRotation: 45,
                                      autoSkip: true,
                                      font: { size: 9 }
                                    }
                                  },
                                  y: {
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Number of Orders',
                                      font: { size: 10 }
                                    },
                                    ticks: {
                                      stepSize: 1,
                                      font: { size: 9 }
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                          <div style={styles.number}>
                            {clientTypes.Agent?.count || 0}
                          </div>
                          {selectedMonth !== null && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMonth(null);
                              }}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#003366',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginTop: '10px',
                                fontSize: '11px'
                              }}
                            >
                              View All Months
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <div 
                      style={{
                        ...styles.card,
                        ...(hoveredCard === 'comparison' ? styles.cardHover : {}),
                        backgroundColor: '#ffffff',
                        padding: '16px'
                      }}
                      onMouseEnter={() => setHoveredCard('comparison')}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
                          📊 Last 3 Months Comparison
                        </div>

                        {comparisonData?.months && (
                          <div style={{
                            fontSize: '12px',
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '4px 10px',
                            borderRadius: '16px'
                          }}>
                            {comparisonData.months[0]} - {comparisonData.months[comparisonData.months.length - 1]}
                          </div>
                        )}
                      </div>

                      {comparisonLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                          Loading comparison data...
                        </div>
                      ) : !comparisonData || !comparisonData.months || comparisonData.months.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                          No comparison data available
                        </div>
                      ) : (
                        <>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '20px',
                            background: '#f8fafc',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            gap: '8px'
                          }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                                {comparisonData.ordersData.reduce((a, b) => a + b, 0)}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                Total Orders
                              </div>
                            </div>

                            <div style={{ width: '1px', background: '#e2e8f0' }} />

                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
                                {(() => {
                                  const total = comparisonData.amountData.reduce((a, b) => a + b, 0);
                                  if (total >= 10000000) {
                                    return `₹${(total / 10000000).toFixed(2)}Cr`;
                                  } else if (total >= 100000) {
                                    return `₹${(total / 100000).toFixed(2)}L`;
                                  } else {
                                    return `₹${(total / 1000).toFixed(1)}K`;
                                  }
                                })()}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                Total Revenue
                              </div>
                            </div>

                            <div style={{ width: '1px', background: '#e2e8f0' }} />

                            <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ fontSize: '18px', fontWeight: '700', color: '#d97706' }}>
                                {(comparisonData.ordersData.reduce((a, b) => a + b, 0) / 3).toFixed(1)}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                Monthly Avg
                              </div>
                            </div>
                          </div>

                          <div style={{ height: '160px', marginBottom: '16px' }}>
                            <Bar
                              data={{
                                labels: comparisonData.months,
                                datasets: [
                                  {
                                    label: 'Orders',
                                    data: comparisonData.ordersData,
                                    backgroundColor: '#3b82f6',
                                    borderRadius: 4,
                                    barPercentage: 0.6,
                                    categoryPercentage: 0.8,
                                    yAxisID: 'y-orders'
                                  },
                                  {
                                    label: 'Revenue',
                                    data: comparisonData.amountData,
                                    backgroundColor: '#f59e0b',
                                    borderRadius: 4,
                                    barPercentage: 0.6,
                                    categoryPercentage: 0.8,
                                    yAxisID: 'y-revenue'
                                  }
                                ]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'top',
                                    labels: {
                                      boxWidth: 10,
                                      font: { size: 10 }
                                    }
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: (context) => {
                                        const label = context.dataset.label;
                                        const value = context.raw;

                                        if (label === 'Revenue') {
                                          if (value >= 10000000) {
                                            return `Revenue: ₹${(value / 10000000).toFixed(2)} Cr`;
                                          } else if (value >= 100000) {
                                            return `Revenue: ₹${(value / 100000).toFixed(2)} L`;
                                          } else {
                                            return `Revenue: ₹${(value / 1000).toFixed(1)} K`;
                                          }
                                        }
                                        return `Orders: ${value}`;
                                      }
                                    }
                                  }
                                },
                                scales: {
                                  'y-orders': {
                                    type: 'linear',
                                    position: 'left',
                                    beginAtZero: true,
                                    grid: { color: '#e2e8f0', lineWidth: 0.5 },
                                    title: { 
                                      display: true, 
                                      text: 'Orders',
                                      font: { size: 9 }
                                    },
                                    ticks: {
                                      font: { size: 8 },
                                      stepSize: 1
                                    }
                                  },
                                  'y-revenue': {
                                    type: 'linear',
                                    position: 'right',
                                    beginAtZero: true,
                                    grid: { drawOnChartArea: false },
                                    title: { 
                                      display: true, 
                                      text: 'Revenue (₹)',
                                      font: { size: 9 }
                                    },
                                    ticks: {
                                      font: { size: 8 },
                                      callback: function(value) {
                                        if (value >= 10000000) {
                                          return (value / 10000000).toFixed(1) + 'Cr';
                                        } else if (value >= 100000) {
                                          return (value / 100000).toFixed(1) + 'L';
                                        } else if (value >= 1000) {
                                          return (value / 1000).toFixed(1) + 'K';
                                        }
                                        return value;
                                      }
                                    }
                                  },
                                  x: {
                                    grid: { display: false },
                                    ticks: {
                                      font: { size: 10, weight: '500' },
                                      color: '#334155'
                                    }
                                  }
                                },
                                onClick: (_, elements) => {
                                  if (elements.length > 0) {
                                    const index = elements[0].index;
                                    const month = comparisonData.rawData[index];
                                    const queryParams = new URLSearchParams();
                                    queryParams.append('month', month.month + 1);
                                    queryParams.append('year', month.year);
                                    if (financialYear !== 'all') {
                                      queryParams.append('financialYear', financialYear);
                                    }
                                    navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                                  }
                                }
                              }}
                            />
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${comparisonData.months.length}, 1fr)`,
                            gap: '10px',
                            marginBottom: '12px'
                          }}>
                            {comparisonData.rawData.map((month, index) => {
                              const prevMonth = index > 0 ? comparisonData.rawData[index - 1] : null;
                              const orderDiff = prevMonth ? month.orders - prevMonth.orders : 0;
                              const colors = ['#3b82f6', '#f59e0b', '#10b981'];

                              return (
                                <div
                                  key={index}
                                  onClick={() => {
                                    const queryParams = new URLSearchParams();
                                    queryParams.append('month', month.month + 1);
                                    queryParams.append('year', month.year);
                                    if (financialYear !== 'all') {
                                      queryParams.append('financialYear', financialYear);
                                    }
                                    navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                                  }}
                                  style={{
                                    background: index === 2 ? '#f0f9ff' : '#f8fafc',
                                    padding: '10px 4px',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    border: index === 2 ? `1px solid ${colors[index]}` : '1px solid #e2e8f0',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                                    {month.monthName}
                                  </div>

                                  <div style={{ fontSize: '18px', fontWeight: '700', color: colors[index] }}>
                                    {month.orders}
                                  </div>

                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {(() => {
                                      if (month.amount >= 10000000) {
                                        return `₹${(month.amount / 10000000).toFixed(2)}Cr`;
                                      } else if (month.amount >= 100000) {
                                        return `₹${(month.amount / 100000).toFixed(2)}L`;
                                      } else {
                                        return `₹${(month.amount / 1000).toFixed(1)}K`;
                                      }
                                    })()}
                                  </div>

                                  {index > 0 && (
                                    <div style={{
                                      fontSize: '10px',
                                      marginTop: '4px',
                                      padding: '2px 6px',
                                      borderRadius: '12px',
                                      display: 'inline-block',
                                      background: orderDiff > 0 ? '#dcfce7' : orderDiff < 0 ? '#fee2e2' : '#f1f5f9',
                                      color: orderDiff > 0 ? '#166534' : orderDiff < 0 ? '#991b1b' : '#475569',
                                      fontWeight: '500'
                                    }}>
                                      {orderDiff > 0 ? '↑' : orderDiff < 0 ? '↓' : '→'} {Math.abs(orderDiff)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {comparisonData.rawData.length === 3 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#f1f5f9',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              marginBottom: '8px'
                            }}>
                              <span style={{ fontSize: '12px', color: '#475569' }}>
                                Overall Growth:
                              </span>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: comparisonData.rawData[2].orders > comparisonData.rawData[0].orders ? '#059669' : '#dc2626'
                              }}>
                                {comparisonData.rawData[2].orders > comparisonData.rawData[0].orders ? '↑' : '↓'}
                                {Math.abs(((comparisonData.rawData[2].orders - comparisonData.rawData[0].orders) / comparisonData.rawData[0].orders * 100)).toFixed(1)}%
                              </span>
                            </div>
                          )}

                          <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                            Click any month card or bar for details
                          </div>
                        </>
                      )}
                    </div>

                    <div 
                      style={{
                        ...styles.card,
                        ...(hoveredCard === 'prospective' ? styles.cardHover : {})
                      }}
                      onMouseEnter={() => setHoveredCard('prospective')}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div>Prospective Clients {getTimePeriodText()}</div>
                      <div style={styles.pieChart}>
                        {prospectiveData ? (
                          <Doughnut
                            data={{
                              labels: Object.keys(prospectiveData).filter(key => key !== 'timePeriod'),
                              datasets: [{
                                data: Object.entries(prospectiveData)
                                  .filter(([key]) => key !== 'timePeriod')
                                  .map(([, value]) => value),
                                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { position: 'right' } },
                              onClick: (event, elements) => {
                                if (elements.length > 0) {
                                  const index = elements[0].index;
                                  const status = Object.keys(prospectiveData).filter(key => key !== 'timePeriod')[index];
                                  const queryParams = new URLSearchParams();
                                  queryParams.append('status', status);

                                  if (financialYear !== 'all') queryParams.append('financialYear', financialYear);
                                  if (selectedMonth !== null) queryParams.append('month', selectedMonth + 1);

                                  navigate(`/admin-dashboard/view-prospective?${queryParams.toString()}`);
                                }
                              },
                            }}
                          />
                        ) : (
                          <div style={styles.noDataMessage}>Loading prospective data...</div>
                        )}
                      </div>
                      <div style={styles.number}>
                        {prospectiveData ?
                          Object.entries(prospectiveData)
                            .filter(([key]) => key !== 'timePeriod')
                            .reduce((sum, [, value]) => sum + value, 0)
                          : 0}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <button
        style={styles.whatsappButton}
        onClick={() => setShowWhatsAppDashboard(true)}
      >
        <FaWhatsapp style={styles.whatsappIcon} />
        {unreadCount > 0 && (
          <div style={styles.unreadBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {showWhatsAppDashboard && (
        <WhatsAppDashboard
          onClose={() => setShowWhatsAppDashboard(false)}
          unreadCount={unreadCount}
          onMarkAsRead={() => setUnreadCount(0)}
        />
      )}
    </div>
  );
}

export default AdminDashboard;