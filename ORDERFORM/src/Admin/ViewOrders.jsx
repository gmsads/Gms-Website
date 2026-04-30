// Import necessary React hooks and external libraries
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Main ViewOrders component function
function ViewOrders() {
  // ===== 1. ALL STATE VARIABLES FIRST =====
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [requirementFilter, setRequirementFilter] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [executiveName, setExecutiveName] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'Cash',
    reference: '',
    note: ''
  });
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [yearFilter, setYearFilter] = useState(() => {
    const currentDate = new Date();
    return currentDate.getFullYear().toString();
  });
  const [monthFilter, setMonthFilter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [clientTypeFilter, setClientTypeFilter] = useState(null);
  const [appliedExecutiveFilters, setAppliedExecutiveFilters] = useState({
    executive: '',
    executiveType: '',
    executiveName: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadSourceFilter, setLeadSourceFilter] = useState(null);
  const [showLeadSourceFilter, setShowLeadSourceFilter] = useState(false);
  const leadSourceFilterRef = useRef(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [currentViewMonth, setCurrentViewMonth] = useState(null);
  const [currentViewYear, setCurrentViewYear] = useState(() => {
    const currentDate = new Date();
    return currentDate.getFullYear();
  });
  const [monthFilterInfo, setMonthFilterInfo] = useState({
    monthCount: 0,
    monthName: '',
    weekCount: 0
  });

  // ===== 2. CALENDAR MONTH HELPER FUNCTIONS =====
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get calendar year from date
  const getCalendarYearFromDate = (date) => {
    return date.getFullYear();
  };

  // Get calendar month from date (1-12 where 1=Jan)
  const getCalendarMonthFromDate = (date) => {
    return date.getMonth() + 1;
  };

  // Get calendar month name from date
  const getCalendarMonthName = (date) => {
    return monthLabels[date.getMonth()];
  };

  // ===== 3. CONSTANTS =====
  const leadSources = [
    'India Mart',
    'Just Dial',
    'Meta (Facebook/Instagram)',
    'Google Ads',
    'Website',
    'Referral',
    'Walk-in',
    'Other Specify'
  ];

  const upiOptions = [
    '9985330008@Chary',
    '9985330004@Swathi',
    'globalmarketingsolutions@idbi',
    '9985403636@Vinay'
  ];

  const location = useLocation();
  const navigate = useNavigate();

  const API_BASE_URL = '/api';
  const API_ENDPOINTS = {
    ORDERS: `${API_BASE_URL}/orders`,
    GET_ORDER: (id) => `${API_BASE_URL}/orders/${id}`,
    UPDATE_ORDER: (id) => `${API_BASE_URL}/orders/${id}`,
    DELETE_ORDER: (id) => `${API_BASE_URL}/orders/${id}`,
    RECORD_PAYMENT: (id) => `${API_BASE_URL}/orders/${id}/record-payment`,
    GET_PAYMENTS: (id) => `${API_BASE_URL}/orders/${id}`,
    IMPORT_ORDERS: `${API_BASE_URL}/orders/import`,
    TRASH_ORDERS: `${API_BASE_URL}/orders/trash`,
    RESTORE_ORDER: (id) => `${API_BASE_URL}/orders/${id}/restore`,
    PERMANENT_DELETE_ORDER: (id) => `${API_BASE_URL}/orders/${id}/permanent`
  };

  const COMPANY_GST = '36AAQFG7654Q2ZB';

  const responsiveStyles = `
    @media (max-width: 1024px) {
      .sticky-column {
        position: static !important;
        left: auto !important;
        z-index: auto !important;
      }
    }
    
    @media print {
      .no-print {
        display: none !important;
      }
      .print-only {
        display: block !important;
      }
      .print-header {
        text-align: center;
        margin-bottom: 20px;
        padding: 10px;
        border-bottom: 2px solid #000;
      }
      .print-footer {
        margin-top: 30px;
        text-align: center;
        font-size: 12px;
        color: #666;
      }
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      .print-table th,
      .print-table td {
        border: 1px solid #000;
        padding: 8px;
        text-align: left;
      }
      .print-table th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
      .print-summary {
        margin: 20px 0;
        padding: 10px;
        border: 1px solid #000;
      }
      .print-signature {
        margin-top: 50px;
        display: flex;
        justify-content: space-between;
      }
    }
  `;

  // ===== 4. HELPER FUNCTIONS =====
  const shouldShowSummaryCards = () => {
    const rolesThatCanSeeCards = ['Admin', 'Account', 'Service Executive'];
    return rolesThatCanSeeCards.includes(userRole);
  };

  const shouldSeeOnlyOwnOrders = () => {
    const rolesThatCanSeeAll = ['Admin', 'Account', 'Service Executive'];
    return !rolesThatCanSeeAll.includes(userRole);
  };

  const canDeleteOrders = () => {
    return userRole === 'Admin';
  };

  const canExportToExcel = () => {
    const rolesThatCanExport = ['Admin', 'Account', 'Service Executive', 'Executive'];
    return rolesThatCanExport.includes(userRole);
  };

  const canImportFromExcel = () => {
    const rolesThatCanImport = ['Admin', 'Account', 'Service Executive', 'Executive'];
    return rolesThatCanImport.includes(userRole);
  };

  // ===== 5. DATE FORMATTING FUNCTIONS =====
  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          return dateString;
        }
        if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  const formatDateForAPI = (dateString) => {
    if (!dateString) return '';

    try {
      if (typeof dateString === 'string' && dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
          return dateString;
        }
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';

    try {
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }

      if (typeof dateString === 'string' && dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // ===== 6. PRINT FUNCTION =====
  const handlePrintOrder = (order) => {
    const orderTotal = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
    const advancePaid = parseFloat(order.advance) || 0;
    const paymentHistoryTotal = order.paymentHistory ?
      order.paymentHistory.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0) : 0;
    const totalPaid = advancePaid + paymentHistoryTotal;
    const balanceDue = orderTotal - advancePaid;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    const baseUrl = window.location.origin;
    const logoPath = `${baseUrl}/assets/logo1.png`;
    const signaturePath = `${baseUrl}/assets/sign.png`;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order #${order.orderNo}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.3;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 15px;
            background: #fff;
          }
          
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }

          .logo {
            width: 70px;
            height: 70px;
          }

          .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .company-info {
            text-align: right;
          }

          .company-name {
            font-size: 22px;
            font-weight: bold;
            color: #000;
            margin-bottom: 3px;
          }

          .gst-info {
            font-size: 11px;
            color: #555;
          }

          .order-number {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
          }
          
          .customer-details {
            margin-bottom: 12px;
            padding: 8px;
            background: #f9f9f9;
            border: 1px solid #ddd;
          }
          
          .details-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
          
          .detail-item {
            font-size: 11px;
          }
          
          .detail-item strong {
            display: block;
            color: #666;
            font-size: 9px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          
          .detail-item span {
            font-size: 11px;
            font-weight: 500;
          }
          
          .order-items {
            margin-bottom: 12px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          
          .items-table th {
            background: #333;
            color: #fff;
            font-weight: bold;
            padding: 6px 4px;
            text-align: left;
            font-size: 10px;
          }
          
          .items-table td {
            padding: 5px 4px;
            border: 1px solid #ddd;
            font-size: 10px;
          }
          
          .items-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .financial-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          
          .summary-box, .payment-box {
            border: 1px solid #ddd;
            padding: 8px;
          }
          
          .summary-box h3, .payment-box h3 {
            font-size: 12px;
            margin-bottom: 8px;
            padding-bottom: 3px;
            border-bottom: 1px solid #333;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11px;
          }
          
          .summary-row.total {
            font-weight: bold;
            border-top: 1px solid #333;
            margin-top: 5px;
            padding-top: 5px;
          }
          
          .summary-row.balance {
            font-weight: bold;
            color: #d32f2f;
          }
          
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          
          .payment-table th {
            background: #f0f0f0;
            padding: 4px;
            text-align: left;
            font-size: 9px;
          }
          
          .payment-table td {
            padding: 3px 4px;
            border: 1px solid #eee;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 8px;
          }
          
          .signature-block {
            text-align: center;
            width: 200px;
          }
          
          .signature-image {
            height: 35px;
            margin-bottom: 3px;
          }
          
          .signature-image img {
            height: 100%;
            width: auto;
          }
          
          .signature-line {
            margin-top: 3px;
            border-top: 1px solid #333;
            padding-top: 3px;
          }
          
          .signature-label {
            font-size: 9px;
            color: #666;
          }
          
          .print-footer {
            margin-top: 10px;
            text-align: center;
            font-size: 8px;
            color: #999;
          }
          
          @media print {
            body {
              padding: 10px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="${logoPath}" alt="Global Marketing Solution Logo" onerror="this.style.display='none'">
          </div>
          <div class="company-info">
            <div class="company-name">GLOBAL MARKETING SOLUTION</div>
            <div class="gst-info">GST: 36AAQFG7654Q2ZB</div>
            <div style="font-size: 10px; color: #666;">Order #${order.orderNo}</div>
          </div>
        </div>
        
        <div class="customer-details">
          <div class="details-grid">
            <div class="detail-item">
              <strong>Client Type:</strong>
              <span>${order.clientType === 'Renewal' ? 'Renewal Client' : 'New Client'}</span>
            </div>
            <div class="detail-item">
              <strong>Business Name:</strong>
              <span>${order.business || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <strong>Contact Person:</strong>
              <span>${order.contactPerson || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <strong>Address:</strong>
              <span>${order.location || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <strong>Ph No:</strong>
              <span>${order.contactCode || ''} ${order.phone || ''}</span>
            </div>
            <div class="detail-item">
              <strong>Alt. Ph No:</strong>
              <span>${order.alternatePhone || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <strong>Email:</strong>
              <span>${order.email || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <strong>Executive:</strong>
              <span>${order.executive || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div class="customer-details" style="margin-bottom: 10px;">
          <div class="details-grid">
            <div class="detail-item">
              <strong>Order No:</strong>
              <span>${order.orderNo}</span>
            </div>
            <div class="detail-item">
              <strong>Order Date:</strong>
              <span>${formatDate(order.orderDate)}</span>
            </div>
            <div class="detail-item">
              <strong>Advance Date:</strong>
              <span>${formatDate(order.advanceDate) || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <strong>Advance Amt:</strong>
              <span>₹${(parseFloat(order.advance) || 0).toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <strong>Payment Mode:</strong>
              <span>${order.paymentMethods ? order.paymentMethods.join(', ') : 'N/A'}</span>
            </div>
            <div class="detail-item">
              <strong>Delivery Date:</strong>
              <span>${formatDate(order.rows[0]?.deliveryDate) || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <strong>Balance Amt:</strong>
              <span>₹${balanceDue.toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <strong>GST Number:</strong>
              <span>${order.gstNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div class="order-items">
          <table class="items-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Product Description</th>
                <th>Quantity</th>
                <th>Price / Piece</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.rows.map((row, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${row.description || ''} ${row.requirement ? `(${row.requirement})` : ''}</td>
                  <td style="text-align: right;">${row.quantity || 0}</td>
                  <td style="text-align: right;">${parseFloat(row.rate || 0).toFixed(2)}</td>
                  <td style="text-align: right;">${parseFloat(row.total || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 10px; font-size: 10px;">
          <strong>Design:</strong> Y / N
        </div>
        
        <div class="financial-section">
          <div class="summary-box">
            <h3>Summary</h3>
            <div class="summary-row">
              <span>Order Total:</span>
              <span>₹${orderTotal.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Discount:</span>
              <span>₹${(parseFloat(order.discount) || 0).toFixed(2)}</span>
            </div>
            <div class="summary-row total">
              <span>Final Amount:</span>
              <span>₹${(parseFloat(order.discountedTotal) || orderTotal).toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Advance Paid:</span>
              <span>₹${(parseFloat(order.advance) || 0).toFixed(2)}</span>
            </div>
            <div class="summary-row balance">
              <span>Balance Due:</span>
              <span>₹${balanceDue.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="payment-box">
            <h3>Payment History</h3>
            ${order.paymentHistory && order.paymentHistory.length > 0 ? `
              <table class="payment-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.paymentHistory.map(payment => `
                    <tr>
                      <td>${formatDate(payment.date)}</td>
                      <td style="text-align: right;">${parseFloat(payment.amount || 0).toFixed(2)}</td>
                      <td>${payment.method}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p style="font-size: 10px; color: #999;">No payment history</p>'}
          </div>
        </div>
        
        <div style="margin-bottom: 10px; font-size: 10px; color: #666;">
          <strong>Note:</strong> Delivery date minimum 3 working from Advance Date.
        </div>
        
        <div class="signature-section">
          <div class="signature-block">
            <div class="signature-image">
              <img src="" alt="Customer Signature" onerror="this.style.display='none'">
            </div>
            <div class="signature-line"></div>
            <div class="signature-label">Customer Signature</div>
          </div>
          <div class="signature-block">
            <div class="signature-image">
              <img src="${signaturePath}" alt="Authorized Signature" onerror="this.style.display='none'">
            </div>
            <div class="signature-line"></div>
            <div class="signature-label">Authorized Signature</div>
          </div>
        </div>
        
        <div class="print-footer">
          Generated on: ${new Date().toLocaleDateString()}
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 100);
          };
        </script>
      </body>
      </html>
    `);
    iframeDoc.close();

    iframe.contentWindow.onafterprint = function () {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 100);
    };

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 10000);
  };

  // ===== 7. HELPER FUNCTION FOR TIME PERIOD TEXT =====
  const getTimePeriodText = () => {
    if (useDateRange && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    if (monthFilter !== null) {
      return `${monthLabels[monthFilter - 1]} ${yearFilter !== 'all' ? yearFilter : ''}`;
    }
    return yearFilter === 'all' ? 'All Years' : `Year ${yearFilter}`;
  };

  // ===== 8. NAVIGATION FUNCTION =====
  const navigateToMonth = (direction) => {
    let newMonth = currentViewMonth;
    let newYear = parseInt(yearFilter);

    if (direction === 'next') {
      if (newMonth === 12) {
        newMonth = 1;
        newYear = newYear + 1;
      } else {
        newMonth = newMonth + 1;
      }
    } else if (direction === 'prev') {
      if (newMonth === 1) {
        newMonth = 12;
        newYear = newYear - 1;
      } else {
        newMonth = newMonth - 1;
      }
    }

    const params = new URLSearchParams();
    params.set('month', newMonth);
    params.set('year', newYear);

    params.delete('clientType');
    params.delete('executive');
    params.delete('executiveType');
    params.delete('executiveName');
    params.delete('week');
    params.delete('monthCount');
    params.delete('monthName');
    params.delete('weekCount');
    params.delete('leadSource');
    params.delete('startDate');
    params.delete('endDate');
    params.delete('requirement');

    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
  };

  // ===== 9. FILTER ORDERS FUNCTION =====
  const filterOrdersBySearchTerm = (order) => {
    if (!searchTerm || searchTerm.trim() === '') {
      return true;
    }

    const term = searchTerm.toLowerCase().trim();

    const mainFields = [
      order.executive || '',
      order.business || '',
      order.contactPerson || '',
      order.location || '',
      order.leadSource || '',
      order.otherLeadSource || '',
      `${order.contactCode || ''} ${order.phone || ''}`,
      order.orderNo || '',
      order.orderDate || '',
      order.clientType || '',
      order.discount || '',
      order.discountedTotal || '',
      order.advance || '',
      order.balance || '',
      order.advanceDate || '',
      order.paymentDate || '',
      order.paymentMethod || '',
      order.chequeNumber || '',
      order.createdBy || '',
      order.gstNumber || ''  // ADDED: GST Number to search
    ];

    const rowFields = order.rows.flatMap(row => [
      row.description || '',
      row.requirement || '',
      row.customRequirement || '',
      row.quantity || '',
      row.rate || '',
      row.total || '',
      row.deliveryDate || '',
      row.assignedExecutive || '',
      row.status || '',
      row.remark || ''
    ]);

    const allFields = [...mainFields, ...rowFields];

    return allFields.some(field => 
      String(field).toLowerCase().includes(term)
    );
  };

  // ===== 10. GROUP ORDERS FUNCTION =====
  const groupOrdersByMonth = (ordersToGroup) => {
    const grouped = {};

    ordersToGroup.forEach(order => {
      try {
        let orderDate;
        if (order.orderDate) {
          if (typeof order.orderDate === 'string') {
            if (order.orderDate.includes('-')) {
              const parts = order.orderDate.split('-');
              if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                orderDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              } else {
                orderDate = new Date(order.orderDate);
              }
            } else {
              orderDate = new Date(order.orderDate);
            }
          } else {
            orderDate = order.orderDate;
          }
        } else if (order.createdAt) {
          orderDate = new Date(order.createdAt);
        } else {
          return;
        }

        if (!orderDate || isNaN(orderDate.getTime())) return;

        const year = getCalendarYearFromDate(orderDate);
        const month = getCalendarMonthFromDate(orderDate);
        
        if (!useDateRange) {
          if (yearFilter !== 'all' && year !== parseInt(yearFilter)) return;
          if (monthFilter !== null && month !== monthFilter) return;
        } else if (useDateRange && startDate && endDate) {
          const orderDateStr = orderDate.toISOString().split('T')[0];
          if (orderDateStr < startDate || orderDateStr > endDate) return;
        }

        const monthYearKey = `${year}-${month.toString().padStart(2, '0')}`;

        if (!grouped[monthYearKey]) {
          const monthName = monthLabels[month - 1];
          grouped[monthYearKey] = {
            name: `${monthName} ${year}`,
            orders: [],
            totals: {
              amount: 0,
              received: 0,
              balance: 0
            }
          };
        }

        let orderAmount = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
        const orderAdvance = parseFloat(order.advance) || 0;
        let paymentHistoryTotal = 0;

        if (order.paymentHistory && Array.isArray(order.paymentHistory)) {
          paymentHistoryTotal = order.paymentHistory.reduce((sum, payment) =>
            sum + (parseFloat(payment.amount) || 0), 0);
        }

        const orderReceived = orderAdvance + paymentHistoryTotal;
        const orderBalance = orderAmount - orderReceived;

        grouped[monthYearKey].totals.amount += orderAmount;
        grouped[monthYearKey].totals.received += orderReceived;
        grouped[monthYearKey].totals.balance += orderBalance;
        grouped[monthYearKey].orders.push(order);
      } catch (err) {
        console.error('Error grouping order:', order._id, err);
      }
    });

    return grouped;
  };

  // ===== 11. CALCULATE TOTALS FUNCTION =====
  const calculateTotals = () => {
    let totalAmount = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    filteredOrders.forEach(order => {
      const orderTotal = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      totalAmount += orderTotal;

      const advanceReceived = parseFloat(order.advance) || 0;
      
      let paymentHistoryTotal = 0;
      if (order.paymentHistory && Array.isArray(order.paymentHistory)) {
        paymentHistoryTotal = order.paymentHistory.reduce((sum, payment) =>
          sum + (parseFloat(payment.amount) || 0), 0);
      }

      const received = advanceReceived + paymentHistoryTotal;
      totalReceived += received;
      
      const orderBalance = orderTotal - received;
      totalBalance += orderBalance;
    });

    return {
      totalAmount: totalAmount.toFixed(2),
      totalReceived: totalReceived.toFixed(2),
      totalBalance: totalBalance.toFixed(2)
    };
  };

  const { totalAmount, totalReceived, totalBalance } = calculateTotals();

  // ===== 12. USER INFO FUNCTION =====
  const getUserInfo = () => {
    try {
      const role = localStorage.getItem('role') || '';
      const name = localStorage.getItem('name') || localStorage.getItem('userName') || '';

      console.log('User info from localStorage:', { role, name });

      setUserRole(role);
      setExecutiveName(name);

      return { role, name };
    } catch (error) {
      console.error('Error getting user info from localStorage:', error);
      return { role: '', name: '' };
    }
  };

  // ===== 13. FETCH ORDERS FUNCTION =====
  const fetchOrders = async (role, name, month = null, year = null, clientType = null, executive = null, executiveNameParam = null, leadSource = null, useDateRangeFlag = false, startDateParam = null, endDateParam = null) => {
    setLoading(true);
    setError(null);
    try {
      let url = API_ENDPOINTS.ORDERS;
      const queryParams = new URLSearchParams();

      console.log('🔍 fetchOrders called with:', { month, year, useDateRangeFlag, startDateParam, endDateParam, executive, executiveNameParam });

      // Date range filter takes precedence
      if (useDateRangeFlag && startDateParam && endDateParam) {
        queryParams.append('startDate', startDateParam);
        queryParams.append('endDate', endDateParam);
        console.log('📅 Using date range filter');
      } 
      // Month and year filter
      else if (month !== null && month !== undefined && year && year !== 'all') {
        queryParams.append('month', month.toString());
        queryParams.append('year', year);
        console.log('📅 Filtering by month and year:', { month, year });
      }
      // Year only filter
      else if (year && year !== 'all') {
        queryParams.append('year', year);
        console.log('📅 Filtering by year only:', year);
      }

      // Executive filter from URL (coming from Performance page)
      if (executiveNameParam && executiveNameParam !== 'undefined' && executiveNameParam !== 'null') {
        queryParams.append('executive', decodeURIComponent(executiveNameParam));
        console.log('👤 Filtering by executive from URL:', decodeURIComponent(executiveNameParam));
      }
      // Executive filter for non-admin users
      else {
        const rolesThatCanSeeAll = ['Admin', 'Account', 'Service Executive'];
        const shouldFilter = role && !rolesThatCanSeeAll.includes(role) && name;
        if (shouldFilter) {
          queryParams.append('executive', name);
          console.log('👤 Filtering by executive (self):', name);
        }
      }

      // Additional filters
      if (clientType && clientType !== 'undefined' && clientType !== 'null') {
        queryParams.append('clientType', clientType);
      }
      if (executive && executive !== 'undefined' && executive !== 'null') {
        queryParams.append('executive', executive);
      }
      if (leadSource && leadSource !== 'undefined' && leadSource !== 'null') {
        queryParams.append('leadSource', leadSource);
      }

      const fullUrl = `${url}?${queryParams.toString()}`;
      console.log('📡 API Call URL:', fullUrl);

      const res = await axios.get(fullUrl);
      console.log('📦 Orders received:', res.data.length);
      console.log('📦 Sample order dates:', res.data.slice(0, 3).map(o => o.orderDate));

      const sortedOrders = res.data.sort((a, b) => {
        const dateA = new Date(a.orderDate || 0);
        const dateB = new Date(b.orderDate || 0);
        return dateB - dateA;
      });

      setOrders(sortedOrders);
      
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setError('Failed to fetch orders. Please try again.');
      toast.error('Failed to fetch orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ===== 14. Handle URL parameters =====
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    const yearFromUrl = params.get('year');
    const monthFromUrl = params.get('month');
    const clientTypeFromUrl = params.get('clientType');
    const leadSourceFromUrl = params.get('leadSource');
    const executiveFromUrl = params.get('executive');
    const executiveTypeFromUrl = params.get('executiveType');
    const executiveNameFromUrl = params.get('executiveName');
    const requirement = params.get('requirement');
    const startDateParam = params.get('startDate');
    const endDateParam = params.get('endDate');
    const fromDashboard = params.get('fromDashboard');

    console.log('🔍 ViewOrders received URL params:', {
      yearFromUrl,
      monthFromUrl,
      clientTypeFromUrl,
      leadSourceFromUrl,
      executiveFromUrl,
      executiveTypeFromUrl,
      executiveNameFromUrl,
      requirement,
      startDateParam,
      endDateParam,
      fromDashboard
    });
    
    // Handle executive filter from URL
    if (executiveNameFromUrl && executiveNameFromUrl !== 'undefined' && executiveNameFromUrl !== 'null') {
      const decodedExecutiveName = decodeURIComponent(executiveNameFromUrl);
      console.log('👤 Setting executive filter from URL:', decodedExecutiveName);
      setAppliedExecutiveFilters({
        executive: executiveFromUrl || '',
        executiveType: executiveTypeFromUrl || '',
        executiveName: decodedExecutiveName
      });
    } else {
      setAppliedExecutiveFilters({
        executive: '',
        executiveType: '',
        executiveName: ''
      });
    }
    
    // Handle requirement filter
    if (requirement && requirement !== 'undefined' && requirement !== 'null') {
      setRequirementFilter(requirement);
      setSearchTerm(requirement);
    } else {
      setRequirementFilter(null);
    }
    
    // Handle date range filter
    if (startDateParam && endDateParam && startDateParam !== 'undefined' && endDateParam !== 'undefined') {
      console.log('📅 Using date range filter');
      setStartDate(startDateParam);
      setEndDate(endDateParam);
      setUseDateRange(true);
      setMonthFilter(null);
      setCurrentViewMonth(null);
      setYearFilter('all');
    } 
    // Handle month + year filter
    else if (monthFromUrl && monthFromUrl !== 'undefined' && monthFromUrl !== 'null' && 
             yearFromUrl && yearFromUrl !== 'undefined' && yearFromUrl !== 'null' && yearFromUrl !== 'all') {
      const monthNum = parseInt(monthFromUrl);
      const yearNum = yearFromUrl;
      
      console.log(`📅 Setting SPECIFIC month+year filter: ${monthNum}/${yearNum}`);
      
      setMonthFilter(monthNum);
      setCurrentViewMonth(monthNum);
      setYearFilter(yearNum);
      setCurrentViewYear(parseInt(yearNum));
      setUseDateRange(false);
      setStartDate('');
      setEndDate('');
    }
    // Handle year only filter
    else if (yearFromUrl && yearFromUrl !== 'undefined' && yearFromUrl !== 'null' && yearFromUrl !== 'all') {
      console.log(`📅 Setting year only filter: ${yearFromUrl}`);
      setYearFilter(yearFromUrl);
      setCurrentViewYear(parseInt(yearFromUrl));
      setMonthFilter(null);
      setCurrentViewMonth(null);
      setUseDateRange(false);
      setStartDate('');
      setEndDate('');
    }
    // Handle month only filter
    else if (monthFromUrl && monthFromUrl !== 'undefined' && monthFromUrl !== 'null') {
      console.log(`📅 Setting month only filter: ${monthFromUrl} (using current year)`);
      const currentYear = new Date().getFullYear().toString();
      setMonthFilter(parseInt(monthFromUrl));
      setCurrentViewMonth(parseInt(monthFromUrl));
      setYearFilter(currentYear);
      setCurrentViewYear(currentYear);
      setUseDateRange(false);
      setStartDate('');
      setEndDate('');
    }
    // Default: no date filters
    else {
      console.log('📅 No date filters applied, showing all orders');
      setMonthFilter(null);
      setCurrentViewMonth(null);
      setYearFilter('all');
      setCurrentViewYear(new Date().getFullYear());
      setUseDateRange(false);
      setStartDate('');
      setEndDate('');
    }
    
    // Set client type filter
    if (clientTypeFromUrl && clientTypeFromUrl !== 'undefined' && clientTypeFromUrl !== 'null') {
      setClientTypeFilter(clientTypeFromUrl);
    } else {
      setClientTypeFilter(null);
    }
    
    // Set lead source filter
    if (leadSourceFromUrl && leadSourceFromUrl !== 'undefined' && leadSourceFromUrl !== 'null') {
      setLeadSourceFilter(leadSourceFromUrl);
    } else {
      setLeadSourceFilter(null);
    }
    
    // Fetch orders with the filters
    const { role, name } = getUserInfo();
    
    const isDateRange = !!(startDateParam && endDateParam && startDateParam !== 'undefined' && endDateParam !== 'undefined');
    
    let fetchMonth = null;
    let fetchYear = 'all';
    
    if (isDateRange) {
      fetchMonth = null;
      fetchYear = 'all';
    } else if (monthFromUrl && monthFromUrl !== 'undefined' && monthFromUrl !== 'null' && 
               yearFromUrl && yearFromUrl !== 'undefined' && yearFromUrl !== 'null' && yearFromUrl !== 'all') {
      fetchMonth = parseInt(monthFromUrl);
      fetchYear = yearFromUrl;
    } else if (yearFromUrl && yearFromUrl !== 'undefined' && yearFromUrl !== 'null' && yearFromUrl !== 'all') {
      fetchMonth = null;
      fetchYear = yearFromUrl;
    } else if (monthFromUrl && monthFromUrl !== 'undefined' && monthFromUrl !== 'null') {
      fetchMonth = parseInt(monthFromUrl);
      fetchYear = new Date().getFullYear().toString();
    }
    
    console.log('📡 Calling fetchOrders with:', {
      month: fetchMonth,
      year: fetchYear,
      clientType: clientTypeFromUrl,
      executive: executiveFromUrl,
      executiveName: executiveNameFromUrl,
      leadSource: leadSourceFromUrl,
      isDateRange,
      startDate: startDateParam,
      endDate: endDateParam
    });
    
    fetchOrders(
      role, 
      name, 
      fetchMonth, 
      fetchYear, 
      clientTypeFromUrl, 
      executiveFromUrl, 
      executiveNameFromUrl, 
      leadSourceFromUrl,
      isDateRange,
      startDateParam,
      endDateParam
    );
    
  }, [location.search]);

  // ===== 15. CAPTURE REQUIREMENT FILTER FROM URL =====
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requirement = params.get('requirement');
    if (requirement) {
      setRequirementFilter(requirement);
      setSearchTerm(requirement);
      console.log('🎯 Filtering by requirement:', requirement);
    } else {
      setRequirementFilter(null);
    }
  }, [location.search]);

  // ===== 16. APPLY FILTERS EFFECT =====
  useEffect(() => {
    if (!orders.length) {
      setFilteredOrders([]);
      setGroupedOrders({});
      return;
    }

    let visibilityFiltered = orders;
    if (shouldSeeOnlyOwnOrders()) {
      visibilityFiltered = orders.filter(order => order.executive === executiveName);
    }

    let filtered = visibilityFiltered;

    if (clientTypeFilter) {
      filtered = filtered.filter(order => order.clientType === clientTypeFilter);
    }

    if (leadSourceFilter) {
      filtered = filtered.filter(order => order.leadSource === leadSourceFilter);
    }

    if (appliedExecutiveFilters.executiveName) {
      filtered = filtered.filter(order => order.executive === appliedExecutiveFilters.executiveName);
      console.log('👤 Filtering by executive name:', appliedExecutiveFilters.executiveName, 'Found orders:', filtered.length);
    }

    if (!useDateRange) {
      filtered = filtered.filter(order => {
        try {
          let orderDate;
          if (order.orderDate) {
            if (typeof order.orderDate === 'string') {
              if (order.orderDate.includes('-')) {
                const parts = order.orderDate.split('-');
                if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                  orderDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                  orderDate = new Date(order.orderDate);
                }
              } else {
                orderDate = new Date(order.orderDate);
              }
            } else {
              orderDate = order.orderDate;
            }
          } else if (order.createdAt) {
            orderDate = new Date(order.createdAt);
          } else {
            return false;
          }

          if (!orderDate || isNaN(orderDate.getTime())) return false;

          const year = getCalendarYearFromDate(orderDate);
          const month = getCalendarMonthFromDate(orderDate);

          if (yearFilter !== 'all' && year !== parseInt(yearFilter)) {
            return false;
          }

          if (monthFilter !== null && month !== monthFilter) {
            return false;
          }

          return true;
        } catch (err) {
          console.error('Error filtering order by date:', order._id, err);
          return false;
        }
      });
    } else if (useDateRange && startDate && endDate) {
      filtered = filtered.filter(order => {
        try {
          let orderDate;
          if (order.orderDate) {
            if (typeof order.orderDate === 'string') {
              if (order.orderDate.includes('-')) {
                const parts = order.orderDate.split('-');
                if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                  orderDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                  orderDate = new Date(order.orderDate);
                }
              } else {
                orderDate = new Date(order.orderDate);
              }
            } else {
              orderDate = order.orderDate;
            }
          } else if (order.createdAt) {
            orderDate = new Date(order.createdAt);
          } else {
            return false;
          }

          if (!orderDate || isNaN(orderDate.getTime())) return false;

          const orderDateStr = orderDate.toISOString().split('T')[0];
          return orderDateStr >= startDate && orderDateStr <= endDate;
        } catch (err) {
          console.error('Error filtering order by date range:', order._id, err);
          return false;
        }
      });
    }

    if (searchTerm && searchTerm.trim() !== '') {
      filtered = filtered.filter(order => filterOrdersBySearchTerm(order));
    }

    setFilteredOrders(filtered);
    setGroupedOrders(groupOrdersByMonth(filtered));
    console.log('📊 Filtered orders count:', filtered.length);

  }, [orders, searchTerm, clientTypeFilter, leadSourceFilter, appliedExecutiveFilters, executiveName, yearFilter, monthFilter, useDateRange, startDate, endDate]);

  // ===== 17. LEAD SOURCE FILTER HANDLER =====
  const handleLeadSourceFilterSelect = (source) => {
    const params = new URLSearchParams(location.search);

    if (source) {
      params.set('leadSource', source);
      setLeadSourceFilter(source);
    } else {
      params.delete('leadSource');
      setLeadSourceFilter(null);
    }

    params.delete('month');
    params.delete('year');
    params.delete('clientType');
    params.delete('executive');
    params.delete('executiveType');
    params.delete('executiveName');
    params.delete('week');
    params.delete('monthCount');
    params.delete('monthName');
    params.delete('weekCount');
    params.delete('startDate');
    params.delete('endDate');
    params.delete('requirement');

    navigate(`/admin-dashboard/view-orders?${params.toString()}`);

    setShowLeadSourceFilter(false);

    const { role, name } = getUserInfo();
    const month = params.get('month');
    const yearParam = params.get('year');
    const clientType = params.get('clientType');
    const executive = params.get('executive');
    const executiveNameParam = params.get('executiveName');
    fetchOrders(role, name, month, yearParam, clientType, executive, executiveNameParam, source);
  };

  // ===== 18. YEAR CHANGE HANDLER =====
  const handleYearChange = (e) => {
    const newYear = e.target.value;
    console.log('📅 Year changed to:', newYear);
    
    setYearFilter(newYear);
    setUseDateRange(false);
    setStartDate('');
    setEndDate('');

    const params = new URLSearchParams(location.search);
    
    if (newYear !== 'all') {
      params.set('year', newYear);
      if (monthFilter) {
        params.set('month', monthFilter.toString());
        console.log('📅 Keeping month filter:', monthFilter);
      }
    } else {
      params.delete('year');
      params.delete('month');
      setMonthFilter(null);
      setCurrentViewMonth(null);
    }
    
    params.delete('startDate');
    params.delete('endDate');
    params.delete('requirement');
    
    console.log('🔄 Navigating to URL:', `/admin-dashboard/view-orders?${params.toString()}`);
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);

    const { role, name } = getUserInfo();
    const clientType = params.get('clientType');
    const executive = params.get('executive');
    const executiveNameParam = params.get('executiveName');
    const leadSource = params.get('leadSource');
    const yearParam = params.get('year');
    const monthParam = params.get('month');
    
    fetchOrders(role, name, monthParam ? parseInt(monthParam) : null, yearParam, clientType, executive, executiveNameParam, leadSource);
  };

  // ===== 19. MONTH CHANGE HANDLER =====
  const handleMonthChange = (e) => {
    const newMonth = e.target.value ? parseInt(e.target.value) : null;
    
    console.log('📅 Month changed to:', newMonth);
    
    setMonthFilter(newMonth);
    setCurrentViewMonth(newMonth);
    setUseDateRange(false);
    setStartDate('');
    setEndDate('');

    const params = new URLSearchParams(location.search);
    
    if (newMonth) {
      params.set('month', newMonth.toString());
      let yearToUse = yearFilter;
      if (yearFilter === 'all') {
        yearToUse = new Date().getFullYear().toString();
        setYearFilter(yearToUse);
      }
      params.set('year', yearToUse);
      console.log('📅 Setting both month and year:', { month: newMonth, year: yearToUse });
    } else {
      params.delete('month');
    }
    
    params.delete('startDate');
    params.delete('endDate');
    params.delete('requirement');
    
    console.log('🔄 Navigating to URL:', `/admin-dashboard/view-orders?${params.toString()}`);
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);

    const { role, name } = getUserInfo();
    const clientType = params.get('clientType');
    const executive = params.get('executive');
    const executiveNameParam = params.get('executiveName');
    const leadSource = params.get('leadSource');
    const yearParam = params.get('year');
    const monthParam = newMonth;
    
    console.log('📡 Calling fetchOrders with:', { month: monthParam, year: yearParam });
    fetchOrders(role, name, monthParam, yearParam, clientType, executive, executiveNameParam, leadSource);
  };

  // ===== 20. CLEAR FILTERS FUNCTION =====
  const clearAllFilters = () => {
    setMonthFilter(null);
    setYearFilter('all');
    setCurrentViewMonth(null);
    setClientTypeFilter(null);
    setLeadSourceFilter(null);
    setAppliedExecutiveFilters({
      executive: '',
      executiveType: '',
      executiveName: ''
    });
    setMonthFilterInfo({ monthCount: 0, monthName: '', weekCount: 0 });
    setSearchTerm('');
    setRequirementFilter(null);
    setShowLeadSourceFilter(false);
    setStartDate('');
    setEndDate('');
    setUseDateRange(false);
    
    navigate('/admin-dashboard/view-orders');
  };

  const clearClientTypeFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('clientType');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
    setClientTypeFilter(null);
  };

  const clearMonthFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('month');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
    setMonthFilter(null);
    setCurrentViewMonth(null);
    setMonthFilterInfo({ monthCount: 0, monthName: '', weekCount: 0 });
  };

  const clearExecutiveFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('executive');
    params.delete('executiveType');
    params.delete('executiveName');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
    setAppliedExecutiveFilters({
      executive: '',
      executiveType: '',
      executiveName: ''
    });
  };

  const clearLeadSourceFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('leadSource');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
    setLeadSourceFilter(null);
    setShowLeadSourceFilter(false);

    const { role, name } = getUserInfo();
    const month = params.get('month');
    const year = params.get('year');
    const clientType = params.get('clientType');
    const executive = params.get('executive');
    const executiveNameParam = params.get('executiveName');
    fetchOrders(role, name, month, year, clientType, executive, executiveNameParam, null);
  };

  const clearSearchFilter = () => {
    setSearchTerm('');
    setRequirementFilter(null);
    const params = new URLSearchParams(location.search);
    params.delete('requirement');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
  };

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
    setUseDateRange(false);
    const params = new URLSearchParams(location.search);
    params.delete('startDate');
    params.delete('endDate');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
    
    const { role, name } = getUserInfo();
    const month = params.get('month');
    const year = params.get('year');
    const clientType = params.get('clientType');
    const executive = params.get('executive');
    const executiveNameParam = params.get('executiveName');
    const leadSource = params.get('leadSource');
    fetchOrders(role, name, month, year, clientType, executive, executiveNameParam, leadSource);
  };

  // ===== 21. EDIT FUNCTIONS =====
  const handleEdit = (order) => {
    if (shouldSeeOnlyOwnOrders() && order.executive !== executiveName) {
      toast.error('You can only edit your own orders');
      return;
    }

    const totalAmount = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
    
    setEditingOrder({
      ...order,
      orderDate: formatDateForInput(order.orderDate),
      advanceDate: formatDateForInput(order.advanceDate),
      paymentDate: formatDateForInput(order.paymentDate),
      advance: order.advance || 0,
      balance: order.balance || 0,
      discountedTotal: order.discountedTotal || totalAmount,
      discount: order.discount || 0,
      gstNumber: order.gstNumber || '',
      rows: order.rows.map(row => ({
        ...row,
        deliveryDate: formatDateForInput(row.deliveryDate),
        startDate: formatDateForInput(row.startDate),
        endDate: formatDateForInput(row.endDate)
      }))
    });
    setShowModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingOrder(prev => ({ ...prev, [name]: value }));
  };

  const handleEditRowChange = (index, field, value) => {
    const updatedRows = [...editingOrder.rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };

    if (field === 'rate' || field === 'quantity') {
      const quantity = parseFloat(updatedRows[index].quantity) || 0;
      const rate = parseFloat(updatedRows[index].rate) || 0;
      updatedRows[index].total = (quantity * rate).toFixed(2);
      
      const newTotalAmount = updatedRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      const newDiscountedTotal = newTotalAmount - (parseFloat(editingOrder.discount) || 0);
      const newBalance = newDiscountedTotal - (parseFloat(editingOrder.advance) || 0);
      
      setEditingOrder(prev => ({
        ...prev,
        rows: updatedRows,
        discountedTotal: newDiscountedTotal < 0 ? 0 : newDiscountedTotal,
        balance: newBalance < 0 ? 0 : newBalance
      }));
    } else {
      setEditingOrder(prev => ({ ...prev, rows: updatedRows }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        ...editingOrder,
        discount: parseFloat(editingOrder.discount) || 0,
        advance: parseFloat(editingOrder.advance) || 0,
        balance: parseFloat(editingOrder.balance) || 0,
        discountedTotal: parseFloat(editingOrder.discountedTotal) || 0,
        gstNumber: editingOrder.gstNumber || '',
        rows: editingOrder.rows.map(row => ({
          ...row,
          quantity: parseFloat(row.quantity) || 0,
          rate: parseFloat(row.rate) || 0,
          total: parseFloat(row.total) || 0
        }))
      };
      
      await axios.put(API_ENDPOINTS.UPDATE_ORDER(editingOrder._id), updateData);
      setShowModal(false);

      const { role, name } = getUserInfo();
      const params = new URLSearchParams(location.search);
      const month = params.get('month');
      const year = params.get('year');
      const clientType = params.get('clientType');
      const executive = params.get('executive');
      const executiveNameParam = params.get('executiveName');
      const leadSource = params.get('leadSource');
      fetchOrders(role, name, month, year, clientType, executive, executiveNameParam, leadSource);

      toast.success('Order updated successfully!');
    } catch (err) {
      console.error('Update failed:', err);
      toast.error(err.response?.data?.message || 'Failed to update order');
    }
  };

  // ===== 22. DELETE FUNCTIONS =====
  const confirmDelete = (orderId) => {
    const orderToDeleteObj = orders.find(order => order._id === orderId);
    if (shouldSeeOnlyOwnOrders() && orderToDeleteObj && orderToDeleteObj.executive !== executiveName) {
      toast.error('You can only delete your own orders');
      return;
    }

    console.log('Confirming delete for order:', orderId);
    setOrderToDelete(orderId);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      if (!orderToDelete) {
        toast.error('No order selected for deletion');
        return;
      }

      console.log('Attempting to delete order:', orderToDelete);

      const response = await axios.delete(API_ENDPOINTS.DELETE_ORDER(orderToDelete), {
        data: {
          deletedBy: userRole === 'Admin' ? 'Admin' : executiveName,
          reason: 'Deleted from view orders page'
        }
      });

      console.log('Delete successful:', response.data);

      setShowDeleteModal(false);
      setOrderToDelete(null);

      const { role, name } = getUserInfo();
      const params = new URLSearchParams(location.search);
      const month = params.get('month');
      const year = params.get('year');
      const clientType = params.get('clientType');
      const executive = params.get('executive');
      const executiveNameParam = params.get('executiveName');
      const leadSource = params.get('leadSource');
      fetchOrders(role, name, month, year, clientType, executive, executiveNameParam, leadSource);

      toast.success('Order moved to trash successfully!');
    } catch (err) {
      console.error('Delete error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      let errorMessage = 'Failed to delete order';
      if (err.response?.status === 404) {
        errorMessage = 'Order not found or already deleted';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    }
  };

  // ===== 23. PAYMENT FUNCTIONS =====
  const handleRecordPayment = async (order) => {
    if (shouldSeeOnlyOwnOrders() && order.executive !== executiveName) {
      toast.error('You can only record payments for your own orders');
      return;
    }

    try {
      setPaymentLoading(true);
      setCurrentOrder(order);

      const totalAmount = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      const finalAmount = parseFloat(order.discountedTotal) || totalAmount;
      const advancePaid = parseFloat(order.advance) || 0;
      
      let paymentHistoryTotal = 0;
      if (order.paymentHistory && Array.isArray(order.paymentHistory)) {
        paymentHistoryTotal = order.paymentHistory.reduce((sum, payment) => 
          sum + (parseFloat(payment.amount) || 0), 0);
      }
      
      const totalPaid = advancePaid + paymentHistoryTotal;
      const actualBalance = finalAmount - totalPaid;

      console.log('Payment setup:', {
        totalAmount,
        finalAmount,
        advancePaid,
        paymentHistoryTotal,
        totalPaid,
        actualBalance,
        orderBalance: order.balance
      });

      const payments = [];

      if (advancePaid > 0) {
        payments.push({
          date: order.advanceDate || order.orderDate,
          amount: advancePaid,
          method: 'Advance',
          reference: '',
          note: 'Initial advance payment'
        });
      }

      if (order.paymentHistory && order.paymentHistory.length > 0) {
        payments.push(...order.paymentHistory);
      }

      setPaymentHistory(payments);

      setPaymentData({
        date: new Date().toISOString().split('T')[0],
        amount: actualBalance > 0 ? actualBalance.toString() : '',
        method: 'Cash',
        reference: '',
        note: ''
      });

      setShowPaymentsModal(true);
    } catch (err) {
      console.error('Error in handleRecordPayment:', err);
      toast.error('Failed to load payment details. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleViewPayments = async (order) => {
    try {
      setPaymentLoading(true);
      setCurrentOrder(order);

      const totalAmount = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      const finalAmount = parseFloat(order.discountedTotal) || totalAmount;
      const advancePaid = parseFloat(order.advance) || 0;
      
      let paymentHistoryTotal = 0;
      if (order.paymentHistory && Array.isArray(order.paymentHistory)) {
        paymentHistoryTotal = order.paymentHistory.reduce((sum, payment) => 
          sum + (parseFloat(payment.amount) || 0), 0);
      }
      
      const totalPaid = advancePaid + paymentHistoryTotal;
      const actualBalance = finalAmount - advancePaid;

      const updatedOrder = {
        ...order,
        balance: actualBalance
      };
      
      setCurrentOrder(updatedOrder);

      const payments = [];

      if (advancePaid > 0) {
        payments.push({
          date: order.advanceDate || order.orderDate,
          amount: advancePaid,
          method: 'Advance',
          reference: '',
          note: 'Initial advance payment'
        });
      }

      if (order.paymentHistory && order.paymentHistory.length > 0) {
        payments.push(...order.paymentHistory);
      }

      setPaymentHistory(payments);

      setPaymentData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        method: 'Cash',
        reference: '',
        note: ''
      });

      setShowPaymentsModal(true);
    } catch (err) {
      console.error('Error in handleViewPayments:', err);
      toast.error('Failed to load payment details. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrintPaymentHistory = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment History - ${currentOrder.orderNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .order-info { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
          .order-info h3 { margin-top: 0; }
          .payment-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .payment-table th, .payment-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .payment-table th { background-color: #f2f2f2; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #e8f5e8; }
          .no-print { display: none; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment History</h1>
          <h2>Order: ${currentOrder.orderNo}</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="order-info">
          <h3>Order Summary</h3>
          <p><strong>Customer:</strong> ${currentOrder.contactPerson}</p>
          <p><strong>Business:</strong> ${currentOrder.business}</p>
          <p><strong>Location:</strong> ${currentOrder.location}</p>
          <p><strong>Lead Source:</strong> ${currentOrder.leadSource || 'Not specified'}${currentOrder.otherLeadSource ? ` (${currentOrder.otherLeadSource})` : ''}</p>
          <p><strong>GST Number:</strong> ${currentOrder.gstNumber || 'N/A'}</p>
          <p><strong>Total Amount:</strong> ₹${currentOrder.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0).toFixed(2)}</p>
          <p><strong>Discount:</strong> ₹${parseFloat(currentOrder.discount || 0).toFixed(2)}</p>
          <p><strong>Final Amount:</strong> ₹${parseFloat(currentOrder.discountedTotal || 0).toFixed(2)}</p>
          <p><strong>Current Balance:</strong> ₹${parseFloat(currentOrder.balance || 0).toFixed(2)}</p>
        </div>
        
        <h3>Payment History</h3>
        <table class="payment-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount (₹)</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${paymentHistory.map((payment) => `
               <tr>
                <td>${formatDate(payment.date)}</td>
                <td style="text-align: right;">${parseFloat(payment.amount || 0).toLocaleString('en-IN')}</td>
                <td>${payment.method}</td>
                <td>${payment.reference || '-'}</td>
                <td>${payment.note || '-'}</td>
                </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5"><strong>Total Paid: ₹${paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0).toLocaleString('en-IN')}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrder) {
      toast.error('No order selected for payment');
      return;
    }

    try {
      const paymentAmount = parseFloat(paymentData.amount);

      if (!paymentAmount || isNaN(paymentAmount)) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      if (paymentAmount <= 0) {
        toast.error('Payment amount must be greater than 0');
        return;
      }

      if (paymentAmount > parseFloat(currentOrder.balance)) {
        toast.error(`Payment amount (₹${paymentAmount}) cannot exceed current balance (₹${currentOrder.balance})`);
        return;
      }

      const paymentPayload = {
        date: paymentData.date,
        amount: paymentAmount,
        method: paymentData.method,
        reference: paymentData.reference,
        note: paymentData.note
      };

      await axios.post(
        API_ENDPOINTS.RECORD_PAYMENT(currentOrder._id),
        paymentPayload
      );

      toast.success('Payment recorded successfully!');

      const { role, name } = getUserInfo();
      const params = new URLSearchParams(location.search);
      const month = params.get('month');
      const year = params.get('year');
      const clientType = params.get('clientType');
      const executive = params.get('executive');
      const executiveNameParam = params.get('executiveName');
      const leadSource = params.get('leadSource');
      fetchOrders(role, name, month, year, clientType, executive, executiveNameParam, leadSource);

      setShowPaymentsModal(false);
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

 // ===== 24. EXPORT/IMPORT FUNCTIONS =====
const handleExportToExcel = () => {
  let ordersToExport = filteredOrders;
  if (shouldSeeOnlyOwnOrders()) {
    ordersToExport = filteredOrders.filter(order => order.executive === executiveName);
  }

  // ✅ CRITICAL FIX: Sort orders from OLDEST to NEWEST for Excel export
  const sortedOrdersForExport = [...ordersToExport].sort((a, b) => {
    const dateA = new Date(a.orderDate || 0);
    const dateB = new Date(b.orderDate || 0);
    return dateA - dateB; // Ascending order (oldest first)
  });

  console.log('📊 Exporting orders:', {
    displayCount: ordersToExport.length,
    exportCount: sortedOrdersForExport.length,
    firstOrder: sortedOrdersForExport[0]?.orderDate,
    lastOrder: sortedOrdersForExport[sortedOrdersForExport.length - 1]?.orderDate
  });

  const flattenedOrders = sortedOrdersForExport.flatMap(order =>
    order.rows.map(row => ({
      'S.No': sortedOrdersForExport.indexOf(order) + 1,
      'Executive': order.executive,
      'Business': order.business,
      'Customer': order.contactPerson,
      'Location': order.location,
      'Lead Source': order.leadSource || '',
      'Other Lead Source': order.otherLeadSource || '',
      'Contact': `${order.contactCode} ${order.phone}`,
      'Order No': order.orderNo,
      'Order Date': formatDate(order.orderDate),
      'Client Type': order.clientType,
      'GST Number': order.gstNumber || '',
      'Description': row.description,
      'Requirement': row.requirement,
      'Custom Requirement': row.customRequirement,
      'Qty': row.quantity,
      'Rate': row.rate,
      'Total': row.total,
      'Discount': order.discount,
      'Final Amount': order.discountedTotal,
      'Delivery Date': formatDate(row.deliveryDate),
      'Service Assigned': row.assignedExecutive || 'Not Assigned',
      'Status': row.status,
      'Remark': row.remark,
      'Is Completed': row.isCompleted ? 'Yes' : 'No',
      'Advance': order.advance,
      'Balance': order.balance,
      'Advance Date': formatDate(order.advanceDate),
      'Payment Date': formatDate(order.paymentDate),
      'Payment Method': order.paymentMethod,
      'Cheque Number': order.chequeNumber,
      'Created By': order.createdBy || order.executive,
      'Payments': order.paymentHistory ?
        order.paymentHistory.map(p => `${formatDate(p.date)}: ₹${p.amount} (${p.method})`).join('; ') : ''
    }))
  );

  const worksheet = XLSX.utils.json_to_sheet(flattenedOrders);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  let filename;
  if (shouldSeeOnlyOwnOrders()) {
    filename = `my_orders_${yearFilter}_${executiveName}_export.xlsx`;
  } else if (appliedExecutiveFilters.executiveName) {
    filename = `orders_${appliedExecutiveFilters.executiveName}_${yearFilter}_export.xlsx`;
  } else {
    filename = `orders_${yearFilter}_export.xlsx`;
  }

  XLSX.writeFile(workbook, filename);
  toast.success(`Excel file "${filename}" downloaded successfully! (Sorted from oldest to newest)`);
};

  const handleImportFromExcel = async (e) => {
    if (!canImportFromExcel()) {
      toast.error('You do not have permission to import orders');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    if (shouldSeeOnlyOwnOrders()) {
      const confirmed = window.confirm(
        `You are about to import orders. These orders will be assigned to you (${executiveName}). Continue?`
      );
      if (!confirmed) {
        e.target.value = '';
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const ordersToImport = jsonData.map(item => {
          const baseOrder = {
            business: item['Business'],
            contactPerson: item['Customer'],
            location: item['Location'],
            leadSource: item['Lead Source'] || '',
            otherLeadSource: item['Other Lead Source'] || '',
            contactCode: item['Contact']?.split(' ')[0] || '+91',
            phone: item['Contact']?.split(' ')[1] || '',
            orderNo: item['Order No'] || `ORDER-${Math.random().toString(36).substr(2, 8)}`,
            orderDate: item['Order Date'],
            clientType: item['Client Type'],
            gstNumber: item['GST Number'] || '',
            rows: [{
              description: item['Description'],
              requirement: item['Requirement'],
              customRequirement: item['Custom Requirement'],
              quantity: item['Qty'],
              rate: item['Rate'],
              total: item['Total'] || (item['Qty'] * item['Rate']).toFixed(2),
              deliveryDate: item['Delivery Date'],
              assignedExecutive: item['Service Assigned'],
              status: item['Status'],
              remark: item['Remark'],
              isCompleted: item['Is Completed'] === 'Yes'
            }],
            discount: item['Discount'] || 0,
            discountedTotal: item['Final Amount'] || 0,
            advance: item['Advance'] || 0,
            balance: item['Balance'] || 0,
            advanceDate: item['Advance Date'],
            paymentDate: item['Payment Date'],
            paymentMethod: item['Payment Method'] || 'Cash',
            chequeNumber: item['Cheque Number'] || '',
            createdBy: item['Created By'] || item['Executive']
          };

          if (shouldSeeOnlyOwnOrders()) {
            return {
              ...baseOrder,
              executive: executiveName,
              createdBy: executiveName
            };
          }

          return {
            ...baseOrder,
            executive: item['Executive'] || baseOrder.createdBy,
            createdBy: item['Created By'] || item['Executive'] || 'Admin'
          };
        });

        await axios.post(API_ENDPOINTS.IMPORT_ORDERS, ordersToImport);

        const { role, name } = getUserInfo();
        const params = new URLSearchParams(location.search);
        const month = params.get('month');
        const year = params.get('year');
        const clientType = params.get('clientType');
        const executive = params.get('executive');
        const executiveNameParam = params.get('executiveName');
        const leadSource = params.get('leadSource');
        fetchOrders(role, name, month, year, clientType, executive, executiveNameParam, leadSource);

        toast.success(`Successfully imported ${ordersToImport.length} orders!`);

        document.getElementById('importExcelInput').value = '';
      } catch (err) {
        console.error('Error importing orders:', err);
        toast.error('Failed to import orders. Please check the file format.');
        document.getElementById('importExcelInput').value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ===== 25. LOADING STATE =====
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>Loading orders...</div>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // ===== 26. ERROR STATE =====
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f9f9f9',
        flexDirection: 'column'
      }}>
        <div style={{
          backgroundColor: '#ffebee',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#c62828' }}>Error Loading Orders</h2>
          <p style={{ margin: '15px 0', color: '#333' }}>{error}</p>
          <button
            onClick={() => {
              const { role, name } = getUserInfo();
              const params = new URLSearchParams(location.search);
              const month = params.get('month');
              const year = params.get('year');
              const clientType = params.get('clientType');
              const executive = params.get('executive');
              const executiveNameParam = params.get('executiveName');
              const leadSource = params.get('leadSource');
              fetchOrders(role, name, month, year, clientType, executive, executiveNameParam, leadSource);
            }}
            style={{
              backgroundColor: '#1565c0',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ===== 27. MAIN RENDER =====
  return (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <style>{responsiveStyles}</style>

      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }} />

      <div style={{
        backgroundColor: appliedExecutiveFilters.executiveName ? '#fff3cd' :
          shouldSeeOnlyOwnOrders() ? '#e3f2fd' : '#f3e5f5',
        padding: '10px 15px',
        borderRadius: '6px',
        marginBottom: '20px',
        border: `2px solid ${appliedExecutiveFilters.executiveName ? '#ffc107' :
          shouldSeeOnlyOwnOrders() ? '#2196f3' : '#9c27b0'
          }`,
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        {appliedExecutiveFilters.executiveName
          ? `🔍 Viewing Orders for: ${appliedExecutiveFilters.executiveName}`
          : shouldSeeOnlyOwnOrders()
            ? `👤 Viewing Your Orders Only - ${executiveName || 'User'} (${userRole || 'User'})`
            : `👑 Viewing All Orders - ${userRole || 'Admin'} Role`
        }
      </div>

      {/* Summary Cards */}
      {shouldShowSummaryCards() && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: '1px solid rgba(52, 152, 219, 0.3)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>
              Total Amount ({getTimePeriodText()})
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>₹{totalAmount}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {filteredOrders.length} orders
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: '1px solid rgba(39, 174, 96, 0.3)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>
              Total Received ({getTimePeriodText()})
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>₹{totalReceived}</div>
          </div>

          <div style={{
            backgroundColor: totalBalance > 0 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(39, 174, 96, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: `1px solid ${totalBalance > 0 ? 'rgba(231, 76, 60, 0.3)' : 'rgba(39, 174, 96, 0.3)'}`,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>
              Total Balance ({getTimePeriodText()})
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: totalBalance > 0 ? '#e74c3c' : '#27ae60'
            }}>
              ₹{totalBalance}
            </div>
          </div>
        </div>
      )}

      {/* FILTER SECTION */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        backgroundColor: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        {/* Left side - Year Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Year:</label>
          <select
            value={yearFilter}
            onChange={handleYearChange}
            disabled={useDateRange}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #218c74',
              backgroundColor: useDateRange ? '#f0f0f0' : 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#218c74',
              minWidth: '100px',
              cursor: useDateRange ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="all">All Years</option>
            <option value="2023">2023</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
          </select>

          {/* Month Selector */}
          <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Month:</label>
          <select
            value={monthFilter || ''}
            onChange={handleMonthChange}
            disabled={useDateRange}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #218c74',
              backgroundColor: useDateRange ? '#f0f0f0' : 'white',
              fontSize: '14px',
              minWidth: '90px',
              cursor: useDateRange ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">All Months</option>
            {monthLabels.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>

        {/* Middle - Date Range Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value && endDate) {
                setUseDateRange(true);
                setMonthFilter(null);
                setCurrentViewMonth(null);
                setClientTypeFilter(null);
                setLeadSourceFilter(null);
                setYearFilter('all');
                setRequirementFilter(null);
                setSearchTerm('');
                
                const params = new URLSearchParams(location.search);
                params.set('startDate', e.target.value);
                params.set('endDate', endDate);
                params.delete('month');
                params.delete('year');
                params.delete('requirement');
                navigate(`/admin-dashboard/view-orders?${params.toString()}`);
                
                const { role, name } = getUserInfo();
                fetchOrders(role, name, null, 'all', null, null, null, null, true, e.target.value, endDate);
              }
            }}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '13px',
              width: '140px'
            }}
          />
          
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>To:</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (startDate && e.target.value) {
                setUseDateRange(true);
                setMonthFilter(null);
                setCurrentViewMonth(null);
                setClientTypeFilter(null);
                setLeadSourceFilter(null);
                setYearFilter('all');
                setRequirementFilter(null);
                setSearchTerm('');
                
                const params = new URLSearchParams(location.search);
                params.set('startDate', startDate);
                params.set('endDate', e.target.value);
                params.delete('month');
                params.delete('year');
                params.delete('requirement');
                navigate(`/admin-dashboard/view-orders?${params.toString()}`);
                
                const { role, name } = getUserInfo();
                fetchOrders(role, name, null, 'all', null, null, null, null, true, startDate, e.target.value);
              }
            }}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '13px',
              width: '140px'
            }}
          />
        </div>

        {/* Right side - Status and Clear Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '4px 12px',
            backgroundColor: useDateRange ? '#e3f2fd' : (monthFilter ? '#e8f5e8' : '#f3e5f5'),
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '13px',
            color: useDateRange ? '#1976d2' : (monthFilter ? '#218c74' : '#9c27b0'),
            whiteSpace: 'nowrap'
          }}>
            {useDateRange ? (
              <>📅 {startDate ? new Date(startDate).toLocaleDateString().slice(0,5) : ''} - {endDate ? new Date(endDate).toLocaleDateString().slice(0,5) : ''}</>
            ) : monthFilter ? (
              <>📊 {monthLabels[monthFilter - 1]} {yearFilter !== 'all' ? yearFilter : ''}</>
            ) : (
              <>📊 Year: {yearFilter === 'all' ? 'All' : yearFilter}</>
            )}
          </div>

          {useDateRange && (
            <button
              onClick={clearDateRange}
              style={{
                padding: '4px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              Clear ×
            </button>
          )}

          {(monthFilter || yearFilter !== 'all') && !useDateRange && (
            <button
              onClick={clearAllFilters}
              style={{
                padding: '4px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      {currentViewMonth && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #1976d2',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => navigateToMonth('prev')}
              style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ← Prev
            </button>

            <select
              value={currentViewMonth}
              onChange={(e) => {
                const newMonth = parseInt(e.target.value);
                const params = new URLSearchParams();
                params.set('month', newMonth);
                params.set('year', yearFilter);
                params.delete('clientType');
                params.delete('executive');
                params.delete('executiveType');
                params.delete('executiveName');
                params.delete('week');
                params.delete('monthCount');
                params.delete('monthName');
                params.delete('weekCount');
                params.delete('leadSource');
                params.delete('startDate');
                params.delete('endDate');
                params.delete('requirement');

                navigate(`/admin-dashboard/view-orders?${params.toString()}`);
                
                const { role, name } = getUserInfo();
                fetchOrders(role, name, newMonth, yearFilter, null, null, null, null);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #1976d2',
                backgroundColor: 'white',
                fontSize: '14px'
              }}
            >
              {monthLabels.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>

            <button
              onClick={() => navigateToMonth('next')}
              style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Next →
            </button>
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <h3 style={{ margin: 0, color: '#1976d2' }}>
              {monthLabels[currentViewMonth - 1]} {yearFilter !== 'all' ? yearFilter : ''}
            </h3>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
              {groupedOrders[`${yearFilter !== 'all' ? yearFilter : ''}-${currentViewMonth.toString().padStart(2, '0')}`]?.orders?.length || 0} orders
            </p>
          </div>

          <button
            onClick={clearAllFilters}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            View All Orders
          </button>
        </div>
      )}

      {/* Active Filters Display */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '20px',
        backgroundColor: '#e3f2fd',
        padding: '15px',
        borderRadius: '8px'
      }}>
        {(monthFilter || clientTypeFilter || appliedExecutiveFilters.executiveName || leadSourceFilter || searchTerm || requirementFilter) && (
          <h3 style={{ margin: '0 0 10px 0' }}>Active Filters:</h3>
        )}

        {appliedExecutiveFilters.executiveName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fff3cd',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ffc107'
          }}>
            <span>
              <strong>👤 Executive:</strong> {appliedExecutiveFilters.executiveName}
              {appliedExecutiveFilters.executiveType && ` (${appliedExecutiveFilters.executiveType})`}
            </span>
            <button
              onClick={clearExecutiveFilter}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Filter
            </button>
          </div>
        )}

        {requirementFilter && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#e8f5e9',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #4caf50'
          }}>
            <span>
              <strong>📦 Product/Requirement:</strong> {requirementFilter}
            </span>
            <button
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.delete('requirement');
                navigate(`/admin-dashboard/view-orders?${params.toString()}`);
                setRequirementFilter(null);
                setSearchTerm('');
              }}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Filter
            </button>
          </div>
        )}

        {monthFilter && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>
            <span>
              <strong>Month:</strong> {monthLabels[monthFilter - 1]} {yearFilter !== 'all' ? yearFilter : ''}
            </span>
            <button
              onClick={clearMonthFilter}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}

        {clientTypeFilter && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>
            <span>
              <strong>Client Type:</strong> {clientTypeFilter}
            </span>
            <button
              onClick={clearClientTypeFilter}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}

        {leadSourceFilter && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#e8f5e9',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #4caf50'
          }}>
            <span>
              <strong>📋 Lead Source:</strong> {leadSourceFilter}
            </span>
            <button
              onClick={clearLeadSourceFilter}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Filter
            </button>
          </div>
        )}

        {searchTerm && !requirementFilter && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>
            <span>
              <strong>Search:</strong> "{searchTerm}"
            </span>
            <button
              onClick={clearSearchFilter}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}

        {(monthFilter || clientTypeFilter || appliedExecutiveFilters.executiveName || leadSourceFilter || searchTerm || requirementFilter) && (
          <button
            onClick={clearAllFilters}
            style={{
              alignSelf: 'flex-end',
              backgroundColor: '#003366',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Search and Export Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <input
            type="text"
            placeholder="Search orders by executive, business, customer, phone, requirement, GST number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px 15px',
              width: '100%',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          />
          {searchTerm && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Searching in executive, business, customer, phone, order no, requirements, GST number...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }} ref={leadSourceFilterRef}>
            <button
              onClick={() => setShowLeadSourceFilter(!showLeadSourceFilter)}
              style={{
                backgroundColor: leadSourceFilter ? '#4caf50' : '#9c27b0',
                color: 'white',
                padding: '8px 12px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '130px'
              }}
            >
              <span>📋</span>
              {leadSourceFilter ? `${leadSourceFilter}` : 'Lead Source'}
              {leadSourceFilter && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLeadSourceFilterSelect(null);
                  }}
                  style={{
                    marginLeft: '6px',
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </span>
              )}
            </button>

            {showLeadSourceFilter && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'white',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
                minWidth: '200px',
                marginTop: '5px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  backgroundColor: '#f9f9f9',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  Filter by Lead Source
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <button
                    onClick={() => handleLeadSourceFilterSelect(null)}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      border: 'none',
                      backgroundColor: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#666',
                      borderBottom: '1px solid #eee'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    All Lead Sources
                  </button>

                  {leadSources.map((source, index) => (
                    <button
                      key={index}
                      onClick={() => handleLeadSourceFilterSelect(source)}
                      style={{
                        width: '100%',
                        padding: '10px 15px',
                        border: 'none',
                        backgroundColor: leadSourceFilter === source ? '#e8f5e9' : 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: leadSourceFilter === source ? '#2e7d32' : '#333',
                        borderBottom: '1px solid #eee',
                        fontWeight: leadSourceFilter === source ? 'bold' : 'normal'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = leadSourceFilter === source ? '#e8f5e9' : 'white'}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canExportToExcel() && (
            <button
              onClick={handleExportToExcel}
              disabled={filteredOrders.length === 0}
              style={{
                backgroundColor: filteredOrders.length === 0 ? '#ccc' : '#16a085',
                color: 'white',
                padding: '12px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: filteredOrders.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Export to Excel ({filteredOrders.length} orders)
            </button>
          )}

          {canImportFromExcel() && (
            <button
              onClick={() => document.getElementById('importExcelInput').click()}
              style={{
                backgroundColor: '#2980b9',
                color: 'white',
                padding: '12px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Import from Excel
            </button>
          )}

          <input
            id="importExcelInput"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleImportFromExcel}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Grouped Orders by Month */}
      {Object.entries(groupedOrders).length > 0 ? (
        Object.entries(groupedOrders)
          .sort(([keyA], [keyB]) => {
            const [yearA, monthA] = keyA.split('-');
            const [yearB, monthB] = keyB.split('-');
            if (yearA !== yearB) return yearB.localeCompare(yearA);
            return parseInt(monthB) - parseInt(monthA);
          })
          .map(([monthYearKey, group]) => (
            <div key={monthYearKey} style={{ marginBottom: '30px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#218c74',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px 8px 0 0',
                marginBottom: '2px'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{group.name}</h3>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Amount</div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>₹{group.totals.amount.toLocaleString('en-IN')}</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Received</div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#ffeb3b' }}>
                      ₹{group.totals.received.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Balance</div>
                    <div style={{
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: group.totals.balance > 0 ? '#ffeb3b' : 'white'
                    }}>
                      ₹{group.totals.balance.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px' }}>
                  {group.orders.length} orders
                </div>
              </div>

              <div style={{ overflowX: 'auto', height: '500px', position: 'relative' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                  <thead style={{ backgroundColor: '#218c74', color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th className="sticky-column" style={{
                        padding: '12px 8px',
                        fontSize: '14px',
                        textAlign: 'center',
                        backgroundColor: '#218c74',
                        position: 'sticky',
                        left: 0,
                        zIndex: 11,
                        minWidth: '50px'
                      }}>S.No</th>

                      <th className="sticky-column" style={{
                        padding: '12px 8px',
                        fontSize: '14px',
                        textAlign: 'center',
                        backgroundColor: '#218c74',
                        position: 'sticky',
                        left: '50px',
                        zIndex: 11,
                        minWidth: '100px'
                      }}>Executive</th>

                      <th className="sticky-column" style={{
                        padding: '12px 8px',
                        fontSize: '14px',
                        textAlign: 'center',
                        backgroundColor: '#218c74',
                        position: 'sticky',
                        left: '150px',
                        zIndex: 11,
                        minWidth: '150px'
                      }}>Business</th>

                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>Customer</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Location</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>Lead Source</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>Contact</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Order No</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Order Date</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Client Type</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>GST Number</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '250px' }}>Requirement</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>Quantity</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '150px' }}>Rate</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Total</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '80px' }}>Discount</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Final Amount</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Delivery Date</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>Service Assigned</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Status</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>Created By</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Advance</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Balance</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Advance Date</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '100px' }}>Payment Date</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>Payment Method</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '120px' }}>Cheque Number</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74', minWidth: '200px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.orders.map((order, orderIndex) => {
                      const hasMultipleRows = order.rows && order.rows.length > 1;
                      
                      if (hasMultipleRows) {
                        const combinedRequirements = order.rows
                          .map(row => {
                            const req = row.customRequirement || row.requirement || '';
                            const isTimeBased = row.days && row.days > 0;
                            return isTimeBased ? `${req} (${row.days} days)` : req;
                          })
                          .filter(req => req)
                          .join(', ');
                        
                        const combinedQuantities = order.rows
                          .map(row => row.quantity || 0)
                          .join(', ');
                        
                        const combinedRates = order.rows
                          .map(row => `₹${parseFloat(row.rate || 0).toFixed(2)}`)
                          .join(', ');
                        
                        const combinedTotal = order.rows
                          .reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0)
                          .toFixed(2);
                        
                        const deliveryDates = order.rows
                          .filter(row => row.deliveryDate)
                          .map(row => new Date(row.deliveryDate))
                          .sort((a, b) => a - b);
                        
                        const earliestDeliveryDate = deliveryDates.length > 0 
                          ? formatDate(deliveryDates[0].toISOString().split('T')[0])
                          : 'N/A';
                        
                        const assignedExecutives = [...new Set(
                          order.rows
                            .map(row => row.assignedExecutive)
                            .filter(exec => exec)
                        )].join(', ');
                        
                        const statuses = [...new Set(
                          order.rows
                            .map(row => row.status)
                            .filter(status => status)
                        )].join(', ');
                        
                        const isRequirementMatch = requirementFilter && combinedRequirements.toLowerCase().includes(requirementFilter.toLowerCase());
                        const rowBgColor = isRequirementMatch ? '#fff9c4' : (orderIndex % 2 === 0 ? '#fdfdfd' : '#f5f9fa');
                        
                        return (
                          <tr key={order._id} style={{ backgroundColor: rowBgColor, borderBottom: '1px solid #eee' }}>
                            <td className="sticky-column" style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                              position: 'sticky',
                              left: 0,
                              backgroundColor: rowBgColor,
                              zIndex: 9,
                              minWidth: '50px'
                            }}>{orderIndex + 1}</td>

                            <td className="sticky-column" style={{
                              padding: '10px 8px',
                              position: 'sticky',
                              left: '50px',
                              backgroundColor: rowBgColor,
                              zIndex: 9,
                              minWidth: '100px'
                            }}>{order.executive}</td>

                            <td className="sticky-column" style={{
                              padding: '10px 8px',
                              position: 'sticky',
                              left: '150px',
                              backgroundColor: rowBgColor,
                              zIndex: 9,
                              minWidth: '150px'
                            }}>
                              {userRole === 'Admin' ? (
                                <button
                                  onClick={() => navigate(`/admin-dashboard/ledger?business=${encodeURIComponent(order.business)}`)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#003366',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    fontSize: 'inherit',
                                    fontFamily: 'inherit',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s ease',
                                    fontWeight: '500',
                                    textAlign: 'left'
                                  }}
                                  onMouseOver={(e) => {
                                    e.target.style.backgroundColor = '#e3f2fd';
                                    e.target.style.color = '#003366';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.color = '#003366';
                                  }}
                                >
                                  {order.business}
                                </button>
                              ) : (
                                <span style={{ color: '#003366', fontWeight: '500' }}>
                                  {order.business}
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '10px 8px', minWidth: '120px' }}>{order.contactPerson}</td>
                            <td style={{ padding: '10px 8px', minWidth: '100px' }}>{order.location}</td>

                            <td style={{ padding: '10px 8px', minWidth: '120px' }}>
                              <span style={{
                                backgroundColor: order.leadSource ? '#e3f2fd' : '#f5f5f5',
                                color: order.leadSource ? '#1976d2' : '#666',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: order.leadSource ? '500' : 'normal',
                                display: 'inline-block',
                                minWidth: '100px'
                              }}>
                                {order.leadSource || 'Not specified'}
                                {order.otherLeadSource && order.leadSource === 'Other Specify' && (
                                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                    ({order.otherLeadSource})
                                  </div>
                                )}
                              </span>
                            </td>
                            
                            <td style={{ padding: '10px 8px', minWidth: '120px' }}>{order.contactCode} {order.phone}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{order.orderNo}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{formatDate(order.orderDate)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{order.clientType}</td>
                            
                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '120px' }}>
                              <span style={{
                                backgroundColor: order.gstNumber ? '#e8f5e9' : '#f5f5f5',
                                color: order.gstNumber ? '#2e7d32' : '#999',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: order.gstNumber ? '500' : 'normal',
                                display: 'inline-block'
                              }}>
                                {order.gstNumber || '-'}
                              </span>
                            </td>

                            <td style={{ padding: '10px 8px', minWidth: '250px', fontWeight: '500', color: '#1976d2' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>{combinedRequirements}</span>
                                {order.rows.some(row => row.description) && (
                                  <small style={{ color: '#666', fontSize: '11px', fontStyle: 'italic' }}>
                                    {order.rows.map(row => row.description).filter(d => d).join(' | ')}
                                  </small>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'right', minWidth: '120px', fontWeight: '500' }}>
                              {combinedQuantities}
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'right', minWidth: '150px' }}>
                              {combinedRates}
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', minWidth: '100px', color: '#27ae60' }}>
                              ₹{combinedTotal}
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'right', color: '#e67e22', minWidth: '80px' }}>{order.discount}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#27ae60', minWidth: '100px' }}>{order.discountedTotal}</td>

                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>
                              {earliestDeliveryDate}
                              {deliveryDates.length > 1 && (
                                <span style={{ fontSize: '10px', color: '#666', display: 'block' }}>
                                  +{deliveryDates.length - 1} more
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'left', minWidth: '120px' }}>
                              {assignedExecutives ? (
                                <span style={{
                                  backgroundColor: '#e3f2fd',
                                  color: '#1565c0',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  display: 'inline-block'
                                }}>
                                  {assignedExecutives}
                                </span>
                              ) : (
                                <span style={{
                                  backgroundColor: '#fff3e0',
                                  color: '#e65100',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  display: 'inline-block'
                                }}>
                                  Not Assigned
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>
                              <span style={{
                                backgroundColor: statuses.includes('Completed') ? '#d4edda' :
                                  statuses.includes('In Progress') ? '#fff3cd' :
                                  statuses.includes('Pending') ? '#f8d7da' : '#e2e3e5',
                                color: statuses.includes('Completed') ? '#155724' :
                                  statuses.includes('In Progress') ? '#856404' :
                                  statuses.includes('Pending') ? '#721c24' : '#383d41',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                display: 'inline-block',
                                minWidth: '80px'
                              }}>
                                {statuses || 'Not Set'}
                              </span>
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '120px' }}>
                              {order.createdBy && order.createdBy !== order.executive ? (
                                <span style={{
                                  backgroundColor: '#e8f5e8',
                                  color: '#2e7d32',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                  display: 'inline-block'
                                }}>
                                  Admin: {order.createdBy}
                                </span>
                              ) : (
                                <span style={{ color: '#666', fontSize: '12px' }}>
                                  {order.executive}
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '10px 8px', textAlign: 'right', minWidth: '100px' }}>{order.advance}</td>
                            <td style={{
                              padding: '10px 8px',
                              textAlign: 'right',
                              fontWeight: 'bold',
                              color: order.balance > 0 ? '#e74c3c' : '#2ecc71',
                              minWidth: '100px'
                            }}>
                              {order.balance}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{formatDate(order.advanceDate)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{formatDate(order.paymentDate)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '120px' }}>
                              {order.paymentMethods && order.paymentMethods.length > 0
                                ? order.paymentMethods.join(', ')
                                : 'Not specified'}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '120px' }}>{order.chequeNumber}</td>

                            <td style={{
                              padding: '10px 8px',
                              display: 'flex',
                              gap: '8px',
                              justifyContent: 'center',
                              flexWrap: 'wrap',
                              minWidth: '200px'
                            }}>
                              <button
                                onClick={() => handlePrintOrder(order)}
                                style={{
                                  backgroundColor: '#9c27b0',
                                  color: 'white',
                                  padding: '6px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🖨️ Print
                              </button>

                              <button
                                onClick={() => handleViewPayments(order)}
                                disabled={paymentLoading}
                                style={{
                                  backgroundColor: '#3498db',
                                  color: 'white',
                                  padding: '6px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {paymentLoading ? 'Loading...' : 'View Payments'}
                              </button>

                              {order.balance > 0 && (
                                <button
                                  onClick={() => handleRecordPayment(order)}
                                  disabled={paymentLoading}
                                  style={{
                                    backgroundColor: paymentLoading ? '#bdc3c7' : '#9b59b6',
                                    color: 'white',
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {paymentLoading ? 'Loading...' : 'Record Payment'}
                                </button>
                              )}

                              <button
                                onClick={() => handleEdit(order)}
                                style={{
                                  backgroundColor: '#f39c12',
                                  color: 'white',
                                  padding: '6px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Edit
                              </button>

                              {canDeleteOrders() && (
                                <button
                                  onClick={() => confirmDelete(order._id)}
                                  style={{
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      } else {
                        return order.rows.map((row, rowIndex) => {
                          const requirementText = row.customRequirement || row.requirement || '';
                          const isRequirementMatch = requirementFilter && requirementText.toLowerCase().includes(requirementFilter.toLowerCase());
                          const rowBgColor = isRequirementMatch ? '#fff9c4' : ((orderIndex + rowIndex) % 2 === 0 ? '#fdfdfd' : '#f5f9fa');

                          return (
                            <tr
                              key={`${order._id}-${rowIndex}`}
                              style={{
                                backgroundColor: rowBgColor,
                                borderBottom: '1px solid #eee'
                              }}
                            >
                              <td className="sticky-column" style={{
                                padding: '10px 8px',
                                textAlign: 'center',
                                position: 'sticky',
                                left: 0,
                                backgroundColor: rowBgColor,
                                zIndex: 9,
                                minWidth: '50px'
                              }}>{orderIndex + 1}</td>

                              <td className="sticky-column" style={{
                                padding: '10px 8px',
                                position: 'sticky',
                                left: '50px',
                                backgroundColor: rowBgColor,
                                zIndex: 9,
                                minWidth: '100px'
                              }}>{order.executive}</td>

                              <td className="sticky-column" style={{
                                padding: '10px 8px',
                                position: 'sticky',
                                left: '150px',
                                backgroundColor: rowBgColor,
                                zIndex: 9,
                                minWidth: '150px'
                              }}>
                                {userRole === 'Admin' ? (
                                  <button
                                    onClick={() => navigate(`/admin-dashboard/ledger?business=${encodeURIComponent(order.business)}`)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#003366',
                                      cursor: 'pointer',
                                      padding: '4px 8px',
                                      fontSize: 'inherit',
                                      fontFamily: 'inherit',
                                      borderRadius: '4px',
                                      transition: 'all 0.2s ease',
                                      fontWeight: '500',
                                      textAlign: 'left'
                                    }}
                                    onMouseOver={(e) => {
                                      e.target.style.backgroundColor = '#e3f2fd';
                                      e.target.style.color = '#003366';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = 'transparent';
                                      e.target.style.color = '#003366';
                                    }}
                                  >
                                    {order.business}
                                  </button>
                                ) : (
                                  <span style={{ color: '#003366', fontWeight: '500' }}>
                                    {order.business}
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '10px 8px', minWidth: '120px' }}>{order.contactPerson}</td>
                              <td style={{ padding: '10px 8px', minWidth: '100px' }}>{order.location}</td>

                              <td style={{ padding: '10px 8px', minWidth: '120px' }}>
                                <span style={{
                                  backgroundColor: order.leadSource ? '#e3f2fd' : '#f5f5f5',
                                  color: order.leadSource ? '#1976d2' : '#666',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: order.leadSource ? '500' : 'normal',
                                  display: 'inline-block',
                                  minWidth: '100px'
                                }}>
                                  {order.leadSource || 'Not specified'}
                                  {order.otherLeadSource && order.leadSource === 'Other Specify' && (
                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                      ({order.otherLeadSource})
                                    </div>
                                  )}
                                </span>
                              </td>
                              
                              <td style={{ padding: '10px 8px', minWidth: '120px' }}>{order.contactCode} {order.phone}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{order.orderNo}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{formatDate(order.orderDate)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{order.clientType}</td>
                              
                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '120px' }}>
                                <span style={{
                                  backgroundColor: order.gstNumber ? '#e8f5e9' : '#f5f5f5',
                                  color: order.gstNumber ? '#2e7d32' : '#999',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: order.gstNumber ? '500' : 'normal',
                                  display: 'inline-block'
                                }}>
                                  {order.gstNumber || '-'}
                                </span>
                              </td>

                              <td style={{ padding: '10px 8px', minWidth: '250px' }}>
                                <div>
                                  <div style={{ marginBottom: '0', padding: '0', fontWeight: '500', color: '#1976d2' }}>
                                    {row.customRequirement || row.requirement || ''}
                                    {row.days && row.days > 0 && <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>({row.days} days)</span>}
                                  </div>
                                  {row.description && (
                                    <small style={{ color: '#666', fontSize: '11px', fontStyle: 'italic' }}>
                                      {row.description}
                                    </small>
                                  )}
                                </div>
                              </td>

                              <td style={{ padding: '10px 8px', textAlign: 'right', minWidth: '120px', fontWeight: '500' }}>
                                {row.quantity || 0}
                              </td>

                              <td style={{ padding: '10px 8px', textAlign: 'right', minWidth: '150px' }}>
                                ₹{parseFloat(row.rate || 0).toFixed(2)}
                              </td>

                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', minWidth: '100px', color: '#27ae60' }}>
                                ₹{parseFloat(row.total || 0).toFixed(2)}
                              </td>

                              <td style={{ padding: '10px 8px', textAlign: 'right', color: '#e67e22', minWidth: '80px' }}>{order.discount}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#27ae60', minWidth: '100px' }}>{order.discountedTotal}</td>

                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>
                                {formatDate(row.deliveryDate)}
                              </td>

                              <td style={{ padding: '10px 8px', textAlign: 'left', minWidth: '120px' }}>
                                {row.assignedExecutive ? (
                                  <span style={{
                                    backgroundColor: '#e3f2fd',
                                    color: '#1565c0',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    display: 'inline-block'
                                  }}>
                                    {row.assignedExecutive}
                                  </span>
                                ) : (
                                  <span style={{
                                    backgroundColor: '#fff3e0',
                                    color: '#e65100',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    display: 'inline-block'
                                  }}>
                                    Not Assigned
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>
                                <span style={{
                                  backgroundColor: row.status === 'Completed' ? '#d4edda' :
                                    row.status === 'In Progress' ? '#fff3cd' :
                                    row.status === 'Pending' ? '#f8d7da' : '#e2e3e5',
                                  color: row.status === 'Completed' ? '#155724' :
                                    row.status === 'In Progress' ? '#856404' :
                                    row.status === 'Pending' ? '#721c24' : '#383d41',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  display: 'inline-block',
                                  minWidth: '80px'
                                }}>
                                  {row.status || 'Not Set'}
                                </span>
                              </td>

                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '120px' }}>
                                {order.createdBy && order.createdBy !== order.executive ? (
                                  <span style={{
                                    backgroundColor: '#e8f5e8',
                                    color: '#2e7d32',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    display: 'inline-block'
                                  }}>
                                    Admin: {order.createdBy}
                                  </span>
                                ) : (
                                  <span style={{ color: '#666', fontSize: '12px' }}>
                                    {order.executive}
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '10px 8px', textAlign: 'right', minWidth: '100px' }}>{order.advance}</td>
                              <td style={{
                                padding: '10px 8px',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                color: order.balance > 0 ? '#e74c3c' : '#2ecc71',
                                minWidth: '100px'
                              }}>
                                {order.balance}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{formatDate(order.advanceDate)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '100px' }}>{formatDate(order.paymentDate)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '120px' }}>
                                {order.paymentMethods && order.paymentMethods.length > 0
                                  ? order.paymentMethods.join(', ')
                                  : 'Not specified'}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', minWidth: '120px' }}>{order.chequeNumber}</td>

                              <td style={{
                                padding: '10px 8px',
                                display: 'flex',
                                gap: '8px',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                minWidth: '200px'
                              }}>
                                <button
                                  onClick={() => handlePrintOrder(order)}
                                  style={{
                                    backgroundColor: '#9c27b0',
                                    color: 'white',
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  🖨️ Print
                                </button>

                                <button
                                  onClick={() => handleViewPayments(order)}
                                  disabled={paymentLoading}
                                  style={{
                                    backgroundColor: '#3498db',
                                    color: 'white',
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {paymentLoading ? 'Loading...' : 'View Payments'}
                                </button>

                                {order.balance > 0 && (
                                  <button
                                    onClick={() => handleRecordPayment(order)}
                                    disabled={paymentLoading}
                                    style={{
                                      backgroundColor: paymentLoading ? '#bdc3c7' : '#9b59b6',
                                      color: 'white',
                                      padding: '6px 12px',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {paymentLoading ? 'Loading...' : 'Record Payment'}
                                  </button>
                                )}

                                <button
                                  onClick={() => handleEdit(order)}
                                  style={{
                                    backgroundColor: '#f39c12',
                                    color: 'white',
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Edit
                                </button>

                                {canDeleteOrders() && (
                                  <button
                                    onClick={() => confirmDelete(order._id)}
                                    style={{
                                      backgroundColor: '#e74c3c',
                                      color: 'white',
                                      padding: '6px 12px',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      }
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#666' }}>No orders found</h3>
          <p style={{ color: '#999' }}>
            {requirementFilter && `for requirement: "${requirementFilter}"`}
            {requirementFilter && (appliedExecutiveFilters.executiveName || monthFilter || clientTypeFilter || leadSourceFilter) && ' and '}
            {appliedExecutiveFilters.executiveName && `for executive: ${appliedExecutiveFilters.executiveName}`}
            {appliedExecutiveFilters.executiveName && (monthFilter || clientTypeFilter || leadSourceFilter) && ' and '}
            {monthFilter && `in ${monthLabels[monthFilter - 1]}`}
            {monthFilter && (clientTypeFilter || leadSourceFilter) && ' and '}
            {clientTypeFilter && `with client type: ${clientTypeFilter}`}
            {clientTypeFilter && leadSourceFilter && ' and '}
            {leadSourceFilter && `with lead source: ${leadSourceFilter}`}
            {searchTerm && !requirementFilter && ` matching "${searchTerm}"`}
          </p>
          <p style={{ color: '#999' }}>Try adjusting your filters or importing orders</p>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentsModal && currentOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            width: '500px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>
              {paymentData.amount ? 'Record Payment' : 'Payment History'}
            </h2>

            <div style={{ marginBottom: '20px', border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
              <h3 style={{ marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                Order Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <strong>Order No:</strong> {currentOrder.orderNo}
                </div>
                <div>
                  <strong>Customer:</strong> {currentOrder.contactPerson}
                </div>
                <div>
                  <strong>Location:</strong> {currentOrder.location}
                </div>
                <div>
                  <strong>Lead Source:</strong> {currentOrder.leadSource || 'Not specified'}
                  {currentOrder.otherLeadSource && currentOrder.leadSource === 'Other Specify' && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                      ({currentOrder.otherLeadSource})
                    </div>
                  )}
                </div>
                <div>
                  <strong>GST Number:</strong> {currentOrder.gstNumber || 'N/A'}
                </div>
                <div>
                  <strong>Created By:</strong> {currentOrder.createdBy || currentOrder.executive}
                </div>
                <div>
                  <strong>Total Amount:</strong> ₹{currentOrder.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0).toFixed(2)}
                </div>
                <div>
                  <strong>Discount:</strong> ₹{parseFloat(currentOrder.discount || 0).toFixed(2)}
                </div>
                <div>
                  <strong>Final Amount:</strong> ₹{parseFloat(currentOrder.discountedTotal || 0).toFixed(2)}
                </div>
                <div>
                  <strong>Advance Paid:</strong> ₹{parseFloat(currentOrder.advance || 0).toFixed(2)}
                </div>
                <div>
                  <strong>Current Balance:</strong>
                  <span style={{ color: currentOrder.balance > 0 ? '#e74c3c' : '#2ecc71', fontWeight: 'bold' }}>
                    ₹{parseFloat(currentOrder.balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {paymentHistory.length > 0 && (
              <div style={{ marginBottom: '20px', border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
                <h3 style={{ marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                  Payment History
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Method</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Reference</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{formatDate(payment.date)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px' }}>{payment.method}</td>
                        <td style={{ padding: '8px' }}>{payment.reference || '-'}</td>
                        <td style={{ padding: '8px' }}>{payment.note || '-'}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: '8px' }}>Total Paid:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        ₹{paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '8px' }} colSpan="3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {paymentData.amount && (
              <form onSubmit={handlePaymentSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Pending Amount</label>
                  <input
                    type="text"
                    value={`₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'}`}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#f5f5f5',
                      fontWeight: 'bold',
                      color: currentOrder.balance > 0 ? '#e74c3c' : '#2ecc71',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Amount to Pay *</label>
                  <input
                    type="number"
                    name="amount"
                    value={paymentData.amount}
                    onChange={handlePaymentChange}
                    placeholder={`Enter amount (max: ₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'})`}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                    required
                    min="0.01"
                    step="0.01"
                    max={currentOrder.balance || 0}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Payment Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={paymentData.date}
                    onChange={handlePaymentChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Payment Method *</label>
                  <select
                    name="method"
                    value={paymentData.method}
                    onChange={handlePaymentChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {paymentData.method === 'UPI' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>UPI ID *</label>
                    <select
                      name="reference"
                      value={paymentData.reference}
                      onChange={handlePaymentChange}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      required
                    >
                      <option value="">-- Select UPI ID --</option>
                      <option value="9985330008@Chary">9985330008@Chary</option>
                      <option value="9985330004@Swathi">9985330004@Swathi</option>
                      <option value="globalmarketingsolutions@idbi">globalmarketingsolutions@idbi</option>
                      <option value="9985403636@Vinay">9985403636@Vinay</option>
                    </select>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                      📱 Select UPI ID for payment collection
                    </div>
                  </div>
                )}
                
                {paymentData.method === 'Cheque' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Cheque Number *</label>
                    <input
                      type="text"
                      name="reference"
                      value={paymentData.reference}
                      onChange={handlePaymentChange}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                      required
                    />
                  </div>
                )}

                {paymentData.method === 'Bank Transfer' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Transaction ID / UTR Number *</label>
                    <input
                      type="text"
                      name="reference"
                      value={paymentData.reference}
                      onChange={handlePaymentChange}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                      required
                      placeholder="Enter UTR/Transaction ID"
                    />
                  </div>
                )}

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Notes</label>
                  <textarea
                    name="note"
                    value={paymentData.note}
                    onChange={handlePaymentChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      minHeight: '60px'
                    }}
                    placeholder="Additional payment details"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPaymentsModal(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            )}

            {!paymentData.amount && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentsModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrintPaymentHistory}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Print Payment History
                </button>
                {currentOrder.balance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentData(prev => ({
                        ...prev,
                        amount: currentOrder.balance > 0 ? currentOrder.balance.toString() : ''
                      }));
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#9b59b6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Record New Payment
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showModal && editingOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <form onSubmit={handleEditSubmit} style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            minWidth: '700px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Edit Order</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Business</label>
                <input
                  name="business"
                  value={editingOrder.business}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Contact Person</label>
                <input
                  name="contactPerson"
                  value={editingOrder.contactPerson}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Location</label>
                <input
                  name="location"
                  value={editingOrder.location}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Lead Source</label>
                <select
                  name="leadSource"
                  value={editingOrder.leadSource || ''}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Select Lead Source</option>
                  {leadSources.map((source, index) => (
                    <option key={index} value={source}>{source}</option>
                  ))}
                </select>
                {editingOrder.leadSource === 'Other Specify' && (
                  <input
                    type="text"
                    name="otherLeadSource"
                    value={editingOrder.otherLeadSource || ''}
                    onChange={handleEditChange}
                    placeholder="Please specify lead source"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      marginTop: '5px'
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Contact Code</label>
                <input
                  name="contactCode"
                  value={editingOrder.contactCode}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Phone</label>
                <input
                  name="phone"
                  value={editingOrder.phone}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Order No</label>
                <input
                  name="orderNo"
                  value={editingOrder.orderNo}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Order Date</label>
                <input
                  name="orderDate"
                  type="date"
                  value={editingOrder.orderDate}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

     
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>GST Number</label>
                <input
                  name="gstNumber"
                  value={editingOrder.gstNumber || ''}
                  onChange={handleEditChange}
                  placeholder="Enter GST number (optional)"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Created By</label>
                <input
                  name="createdBy"
                  value={editingOrder.createdBy || editingOrder.executive}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    backgroundColor: '#f5f5f5'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Discount (₹)
                </label>
                <input
                  name="discount"
                  type="number"
                  step="0.01"
                  value={editingOrder.discount}
                  onChange={(e) => {
                    const discount = parseFloat(e.target.value) || 0;
                    const totalAmount = editingOrder.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
                    const discountedTotal = totalAmount - discount;
                    setEditingOrder(prev => ({ 
                      ...prev, 
                      discount: discount,
                      discountedTotal: discountedTotal < 0 ? 0 : discountedTotal
                    }));
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Final Amount (₹)
                </label>
                <input
                  name="discountedTotal"
                  type="number"
                  step="0.01"
                  value={editingOrder.discountedTotal}
                  onChange={(e) => {
                    const newFinalAmount = parseFloat(e.target.value) || 0;
                    const totalAmount = editingOrder.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
                    const newDiscount = totalAmount - newFinalAmount;
                    setEditingOrder(prev => ({ 
                      ...prev, 
                      discountedTotal: newFinalAmount,
                      discount: newDiscount < 0 ? 0 : newDiscount
                    }));
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <small style={{ color: '#666', fontSize: '11px' }}>
                  Total from items: ₹{editingOrder.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0).toFixed(2)}
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Advance Paid (₹)
                </label>
                <input
                  name="advance"
                  type="number"
                  step="0.01"
                  value={editingOrder.advance}
                  onChange={(e) => {
                    const advance = parseFloat(e.target.value) || 0;
                    const finalAmount = parseFloat(editingOrder.discountedTotal) || 0;
                    const newBalance = finalAmount - advance;
                    setEditingOrder(prev => ({ 
                      ...prev, 
                      advance: advance,
                      balance: newBalance < 0 ? 0 : newBalance
                    }));
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Balance (₹)
                </label>
                <input
                  name="balance"
                  type="number"
                  step="0.01"
                  value={editingOrder.balance}
                  onChange={(e) => {
                    const balance = parseFloat(e.target.value) || 0;
                    const finalAmount = parseFloat(editingOrder.discountedTotal) || 0;
                    const newAdvance = finalAmount - balance;
                    setEditingOrder(prev => ({ 
                      ...prev, 
                      balance: balance,
                      advance: newAdvance < 0 ? 0 : newAdvance
                    }));
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ccc',
                    backgroundColor: '#fff3e0',
                    fontWeight: 'bold'
                  }}
                />
                <small style={{ color: '#e74c3c', fontSize: '11px' }}>
                  Warning: Manually editing balance may affect payment history
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Advance Date</label>
                <input
                  name="advanceDate"
                  type="date"
                  value={editingOrder.advanceDate}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Payment Date</label>
                <input
                  name="paymentDate"
                  type="date"
                  value={editingOrder.paymentDate}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Payment Method</label>
                <select
                  name="paymentMethods"
                  value={editingOrder.paymentMethods && editingOrder.paymentMethods[0] || ''}
                  onChange={(e) => {
                    const methods = e.target.value ? [e.target.value] : [];
                    setEditingOrder(prev => ({ ...prev, paymentMethods: methods }));
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Select Payment Method</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Cheque/Reference Number</label>
                <input
                  name="chequeNumber"
                  value={editingOrder.chequeNumber || ''}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <h3 style={{ marginBottom: '15px' }}>Order Items</h3>
            {editingOrder.rows.map((row, index) => (
              <div key={index} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                gap: '15px',
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                  <input
                    value={row.description}
                    onChange={(e) => handleEditRowChange(index, 'description', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Requirement</label>
                  <input
                    value={row.requirement}
                    onChange={(e) => handleEditRowChange(index, 'requirement', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Custom Requirement</label>
                  <input
                    value={row.customRequirement}
                    onChange={(e) => handleEditRowChange(index, 'customRequirement', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Quantity</label>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => handleEditRowChange(index, 'quantity', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Rate</label>
                  <input
                    type="number"
                    value={row.rate}
                    onChange={(e) => handleEditRowChange(index, 'rate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Delivery Date</label>
                  <input
                    type="date"
                    value={row.deliveryDate}
                    onChange={(e) => handleEditRowChange(index, 'deliveryDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Start Date</label>
                  <input
                    type="date"
                    value={row.startDate}
                    onChange={(e) => handleEditRowChange(index, 'startDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>End Date</label>
                  <input
                    type="date"
                    value={row.endDate}
                    onChange={(e) => handleEditRowChange(index, 'endDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Service Assigned To</label>
                  <input
                    value={row.assignedExecutive}
                    onChange={(e) => handleEditRowChange(index, 'assignedExecutive', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    placeholder="Enter service executive name"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Status</label>
                  <select
                    value={row.status}
                    onChange={(e) => handleEditRowChange(index, 'status', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="">Select Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Remark</label>
                  <input
                    value={row.remark}
                    onChange={(e) => handleEditRowChange(index, 'remark', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ marginBottom: '5px' }}>Is Completed:</label>
                  <input
                    type="checkbox"
                    checked={row.isCompleted || false}
                    onChange={(e) => handleEditRowChange(index, 'isCompleted', e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, color: '#e74c3c' }}>Confirm Deletion</h3>
            <p style={{ margin: '20px 0', fontSize: '16px' }}>
              Are you sure you want to delete this order?
            </p>
            <p style={{ margin: '10px 0', fontSize: '14px', color: '#666' }}>
              This will move the order to trash. You can restore it from trash if needed.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setOrderToDelete(null);
                }}
                style={{
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewOrders;