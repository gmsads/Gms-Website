/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun } from 'docx';
import jsPDF from 'jspdf';

function PendingPayment({ executiveFilter = null }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableContainerRef = useRef(null);
  const today = new Date();
  const searchTimeoutRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Get filter type from URL - determines if we show pending or completed
  const filterType = searchParams.get('filterType') || 'pending';

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentData, setPaymentData] = useState({
    date: today.toISOString().split('T')[0],
    amount: '',
    method: 'Cash',
    reference: '',
    note: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Settlement modal states
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementData, setSettlementData] = useState({
    date: today.toISOString().split('T')[0],
    type: 'Full Settlement',
    amount: '',
    reason: '',
    approvedBy: '',
    notes: ''
  });
  const [settlementLoading, setSettlementLoading] = useState(false);

  // Follow-up modal states
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    date: today.toISOString().split('T')[0],
    description: '',
    nextFollowUpDate: '',
    status: 'Pending'
  });
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // View follow-ups modal
  const [showViewFollowUpsModal, setShowViewFollowUpsModal] = useState(false);
  const [orderFollowUps, setOrderFollowUps] = useState([]);
  const [selectedOrderForView, setSelectedOrderForView] = useState(null);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  // View settlements modal
  const [showViewSettlementsModal, setShowViewSettlementsModal] = useState(false);
  const [orderSettlements, setOrderSettlements] = useState([]);
  const [selectedOrderForSettlementView, setSelectedOrderForSettlementView] = useState(null);
  const [loadingSettlements, setLoadingSettlements] = useState(false);

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [paymentResult, setPaymentResult] = useState({
    submittedAmount: 0,
    remainingBalance: 0,
    orderNo: ''
  });

  // Settlement success popup
  const [showSettlementSuccess, setShowSettlementSuccess] = useState(false);
  const [settlementResult, setSettlementResult] = useState({
    orderNo: '',
    type: '',
    amount: 0
  });

  // Follow-up success popup
  const [showFollowUpSuccess, setShowFollowUpSuccess] = useState(false);
  const [followUpResult, setFollowUpResult] = useState({
    orderNo: '',
    description: ''
  });

  // Filter states
  const [year, setYear] = useState(() => {
    const urlYear = searchParams.get('year');
    if (urlYear && urlYear !== 'undefined' && urlYear !== 'null' && urlYear !== 'all') {
      return urlYear;
    }
    return today.getFullYear().toString();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const urlMonth = searchParams.get('month');
    if (urlMonth && urlMonth !== 'undefined' && urlMonth !== 'null' && urlMonth !== 'all') {
      return urlMonth;
    }
    return 'all';
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const urlDate = searchParams.get('date');
    return urlDate || today.toISOString().split('T')[0];
  });
  const [useDateFilter, setUseDateFilter] = useState(() => {
    const urlDate = searchParams.get('date');
    const urlMonth = searchParams.get('month');
    return urlDate ? true : (urlMonth ? false : false);
  });
  const [useMonthYearFilter, setUseMonthYearFilter] = useState(() => {
    const urlDate = searchParams.get('date');
    return urlDate ? false : true;
  });

  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(filterType);
  const [exportLoading, setExportLoading] = useState(false);

  // Payment summary states
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [todayCollections, setTodayCollections] = useState(0);
  const [todayCollectionCount, setTodayCollectionCount] = useState(0);

  // Scroll position for fixed columns
  const [scrollPosition, setScrollPosition] = useState(0);

  const monthLabels = useMemo(() => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], []);

  // Generate year options
  const years = useMemo(() => {
    const currentYear = today.getFullYear();
    const yearsArray = ['all'];
    for (let y = 2020; y <= currentYear + 5; y++) {
      yearsArray.push(y.toString());
    }
    return [...new Set(yearsArray)];
  }, [today]);

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Memoized function to get delivery date
  const getDeliveryDate = useCallback((order) => {
    if (!order?.rows?.length) return 'N/A';
    const deliveryDates = order.rows
      .filter(row => row.deliveryDate)
      .map(row => new Date(row.deliveryDate))
      .sort((a, b) => a - b);
    if (deliveryDates.length === 0) return 'Not Set';
    return deliveryDates[0].toLocaleDateString();
  }, []);

  // Memoized function to get latest follow-up
  const getLatestFollowUp = useCallback((order) => {
    if (!order?.followUps?.length) return null;
    const sorted = [...order.followUps].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );
    return sorted[0];
  }, []);

  // Memoized function to get latest settlement
  const getLatestSettlement = useCallback((order) => {
    if (!order?.settlements?.length) return null;
    const sorted = [...order.settlements].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );
    return sorted[0];
  }, []);

  // Memoized function to format follow-up
  const formatFollowUp = useCallback((order) => {
    const latest = getLatestFollowUp(order);
    if (!latest) return 'No follow-up';
    const date = new Date(latest.date).toLocaleDateString();
    const description = latest.description.length > 30
      ? latest.description.substring(0, 30) + '...'
      : latest.description;
    return `${date}: ${description}`;
  }, [getLatestFollowUp]);

  // Memoized function to get follow-up status color
  const getFollowUpStatusColor = useCallback((status) => {
    const colors = {
      'Promise to Pay': '#27ae60',
      'Partial Payment': '#f39c12',
      'Not Reachable': '#e74c3c',
      'Call Back Later': '#3498db',
      'Resolved': '#2ecc71',
      'Follow-up Done': '#9b59b6'
    };
    return colors[status] || '#7f8c8d';
  }, []);

  // Memoized function to get settlement type color
  const getSettlementTypeColor = useCallback((type) => {
    const colors = {
      'Full Settlement': '#27ae60',
      'Partial Settlement': '#f39c12',
      'Write-off': '#e74c3c',
      'Discount': '#3498db',
      'Credit Note': '#9b59b6'
    };
    return colors[type] || '#7f8c8d';
  }, []);

  // Fetch ALL orders and apply filters client-side
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch ALL orders from the main endpoint
      const res = await axios.get('/api/orders/all');
      let allOrders = res.data;
      
      // Calculate advance and balance for each order
      allOrders = allOrders.map(order => {
        const orderTotal = order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0;
        const advance = order?.advance || 0;
        const balance = orderTotal - advance;
        return { ...order, orderTotal, advance, balance };
      });
      
      setOrders(allOrders);
      
      // Apply all filters client-side
      applyFilters(allOrders);
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      alert('Failed to fetch orders. Please try again.');
      setLoading(false);
    }
  };

  // Apply all filters client-side
  const applyFilters = useCallback((ordersData = orders) => {
    if (!ordersData.length) {
      setFilteredOrders([]);
      setLoading(false);
      return;
    }

    let result = [...ordersData];

    // Apply date filters based on orderDate
    if (useDateFilter && selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      result = result.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= filterDate && orderDate < nextDay;
      });
    } 
    // Apply month/year filters
    else if (useMonthYearFilter) {
      if (year !== 'all') {
        const targetYear = parseInt(year);
        
        result = result.filter(order => {
          try {
            const orderDate = new Date(order.orderDate);
            if (!orderDate || isNaN(orderDate.getTime())) return false;
            
            const orderYear = orderDate.getFullYear();
            
            if (orderYear !== targetYear) return false;
            
            if (selectedMonth !== 'all') {
              const orderMonth = orderDate.getMonth() + 1;
              const filterMonth = parseInt(selectedMonth);
              if (orderMonth !== filterMonth) return false;
            }
            
            return true;
          } catch (e) {
            console.error('Error processing date:', order.orderDate, e);
            return false;
          }
        });
      } else {
        if (selectedMonth !== 'all') {
          const filterMonth = parseInt(selectedMonth);
          
          result = result.filter(order => {
            try {
              const orderDate = new Date(order.orderDate);
              if (!orderDate || isNaN(orderDate.getTime())) return false;
              
              const orderMonth = orderDate.getMonth() + 1;
              return orderMonth === filterMonth;
            } catch (e) {
              return false;
            }
          });
        }
      }
    }

    // Apply filter type (pending/completed)
    if (filterType === 'pending') {
      result = result.filter(order => order.balance > 0);
    } else if (filterType === 'completed') {
      result = result.filter(order => order.balance <= 0);
    }

    // Apply executive filter if provided
    if (executiveFilter) {
      result = result.filter(order => 
        order.executive?.toLowerCase() === executiveFilter.toLowerCase()
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(order => {
        return (
          (order?.executive?.toLowerCase() || '').includes(term) ||
          (order?.business?.toLowerCase() || '').includes(term) ||
          (order?.contactPerson?.toLowerCase() || '').includes(term) ||
          (order?.phone?.toString() || '').includes(term) ||
          (order?.contactCode?.toLowerCase() || '').includes(term) ||
          (order?.orderNo?.toLowerCase() || '').includes(term) ||
          (order?.gstNo?.toLowerCase() || '').includes(term)
        );
      });
    }

    setFilteredOrders(result);
    calculatePaymentSummaries(result);
    setLoading(false);
  }, [orders, useDateFilter, selectedDate, useMonthYearFilter, year, selectedMonth, filterType, executiveFilter, searchTerm]);

  const calculatePaymentSummaries = (ordersData) => {
    let total = 0, received = 0, pending = 0, todayCollected = 0, todayCount = 0;

    ordersData.forEach(order => {
      const orderTotal = order?.orderTotal || 0;
      const advance = order?.advance || 0;
      const balance = order?.balance || 0;

      total += orderTotal;
      received += advance;
      pending += balance;

      if (order.rows?.length > 0) {
        const hasDeliveryToday = order.rows.some(row => {
          if (!row.deliveryDate) return false;
          return new Date(row.deliveryDate).toISOString().split('T')[0] === today.toISOString().split('T')[0];
        });
        
        if (hasDeliveryToday) {
          todayCollected += orderTotal;
          todayCount += 1;
        }
      }
    });

    setTotalPayments(total);
    setTotalReceived(received);
    setTotalPending(pending);
    setTodayCollections(todayCollected);
    setTodayCollectionCount(todayCount);
  };

  const fetchOrderFollowUps = async (orderId) => {
    setLoadingFollowUps(true);
    try {
      const res = await axios.get(`/api/orders/${orderId}/follow-ups`);
      setOrderFollowUps(res.data.followUps || []);
    } catch (err) {
      console.error('Error fetching follow-ups:', err);
      alert('Failed to load follow-ups');
    } finally {
      setLoadingFollowUps(false);
    }
  };

  const fetchOrderSettlements = async (orderId) => {
    setLoadingSettlements(true);
    try {
      const res = await axios.get(`/api/orders/${orderId}/settlements`);
      setOrderSettlements(res.data.settlements || []);
    } catch (err) {
      console.error('Error fetching settlements:', err);
      alert('Failed to load settlements');
    } finally {
      setLoadingSettlements(false);
    }
  };

  const handleBusinessClick = (businessName) => {
    if (!businessName || executiveFilter) return;
    navigate('/admin-dashboard/view-orders', {
      state: { businessFilter: businessName }
    });
  };

  const handleRecordPayment = (order) => {
    setCurrentOrder(order);
    setPaymentData(prev => ({
      ...prev,
      amount: order.balance > 0 ? order.balance.toString() : '',
    }));
    setShowPaymentModal(true);
  };

  const handleSettlement = (order) => {
    setCurrentOrder(order);
    setSettlementData({
      date: today.toISOString().split('T')[0],
      type: 'Full Settlement',
      amount: order.balance > 0 ? order.balance.toString() : '',
      reason: '',
      approvedBy: '',
      notes: ''
    });
    setShowSettlementModal(true);
  };

  const handleFollowUp = (order) => {
    setCurrentOrder(order);
    setFollowUpData({
      date: today.toISOString().split('T')[0],
      description: '',
      nextFollowUpDate: '',
      status: 'Pending'
    });
    setShowFollowUpModal(true);
  };

  const handleViewFollowUps = async (order) => {
    setSelectedOrderForView(order);
    setShowViewFollowUpsModal(true);
    await fetchOrderFollowUps(order._id);
  };

  const handleViewSettlements = async (order) => {
    setSelectedOrderForSettlementView(order);
    setShowViewSettlementsModal(true);
    await fetchOrderSettlements(order._id);
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  const handleSettlementChange = (e) => {
    const { name, value } = e.target;
    setSettlementData(prev => ({ ...prev, [name]: value }));
  };

  const handleFollowUpChange = (e) => {
    const { name, value } = e.target;
    setFollowUpData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrder) return;

    const paymentAmount = parseFloat(paymentData.amount);

    if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Please enter a valid payment amount greater than 0');
      return;
    }

    if (paymentAmount > parseFloat(currentOrder.balance)) {
      alert(`Payment amount cannot exceed current balance (₹${currentOrder.balance})`);
      return;
    }

    setPaymentLoading(true);
    try {
      await axios.post(`/api/orders/${currentOrder._id}/record-payment`, paymentData);

      const remainingBalance = parseFloat((currentOrder.balance - paymentAmount).toFixed(2));

      setPaymentResult({
        submittedAmount: paymentAmount,
        remainingBalance: remainingBalance,
        orderNo: currentOrder.orderNo
      });
      setShowSuccessPopup(true);
      setShowPaymentModal(false);
      await fetchOrders();

    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSettlementSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrder) return;

    const settlementAmount = parseFloat(settlementData.amount);

    if (!settlementAmount || isNaN(settlementAmount) || settlementAmount <= 0) {
      alert('Please enter a valid settlement amount greater than 0');
      return;
    }

    if (settlementAmount > parseFloat(currentOrder.balance)) {
      alert(`Settlement amount cannot exceed current balance (₹${currentOrder.balance})`);
      return;
    }

    if (settlementData.type === 'Full Settlement' && settlementAmount < parseFloat(currentOrder.balance)) {
      if (!window.confirm('This is marked as Full Settlement but amount is less than balance. Continue anyway?')) {
        return;
      }
    }

    setSettlementLoading(true);
    try {
      await axios.post(`/api/orders/${currentOrder._id}/record-settlement`, settlementData);

      setSettlementResult({
        orderNo: currentOrder.orderNo,
        type: settlementData.type,
        amount: settlementAmount
      });
      setShowSettlementSuccess(true);
      setShowSettlementModal(false);
      await fetchOrders();

    } catch (err) {
      console.error('Error recording settlement:', err);
      alert('Failed to record settlement. Please try again.');
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrder) return;

    if (!followUpData.description.trim()) {
      alert('Please enter a follow-up description');
      return;
    }

    setFollowUpLoading(true);
    try {
      await axios.post(`/api/orders/${currentOrder._id}/follow-up`, followUpData);

      setFollowUpResult({
        orderNo: currentOrder.orderNo,
        description: followUpData.description
      });
      setShowFollowUpSuccess(true);
      setShowFollowUpModal(false);
      await fetchOrders();

    } catch (err) {
      console.error('Error adding follow-up:', err);
      alert('Failed to add follow-up. Please try again.');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    setPaymentResult({ submittedAmount: 0, remainingBalance: 0, orderNo: '' });
  };

  const closeSettlementSuccess = () => {
    setShowSettlementSuccess(false);
    setSettlementResult({ orderNo: '', type: '', amount: 0 });
  };

  const closeFollowUpSuccess = () => {
    setShowFollowUpSuccess(false);
    setFollowUpResult({ orderNo: '', description: '' });
  };

  const clearDateFilter = () => {
    setSelectedDate(today.toISOString().split('T')[0]);
    setUseDateFilter(false);
    setUseMonthYearFilter(true);
    setYear('all');
    setSelectedMonth('all');
  };

  const clearMonthYearFilter = () => {
    setYear('all');
    setSelectedMonth('all');
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleFilterModeChange = (useDate) => {
    setUseDateFilter(useDate);
    setUseMonthYearFilter(!useDate);
    if (useDate) {
      setYear('all');
      setSelectedMonth('all');
    } else {
      setSelectedDate(today.toISOString().split('T')[0]);
    }
  };

  const resetToCurrentMonth = () => {
    const currentDate = new Date();
    setYear(currentDate.getFullYear().toString());
    setSelectedMonth((currentDate.getMonth() + 1).toString());
    setUseDateFilter(false);
    setUseMonthYearFilter(true);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const clearAllFilters = () => {
    setYear('all');
    setSelectedMonth('all');
    setUseDateFilter(false);
    setUseMonthYearFilter(true);
    setSearchTerm('');
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const getFilterDescription = useCallback(() => {
    let description = filterType === 'pending' ? 'Pending Payments' : 'Completed Payments';

    if (executiveFilter) description = `${executiveFilter}'s ${description}`;

    if (useDateFilter && selectedDate) {
      description += ` - Date: ${new Date(selectedDate).toLocaleDateString()}`;
    } else if (useMonthYearFilter) {
      if (selectedMonth !== 'all') {
        const monthIndex = parseInt(selectedMonth) - 1;
        description += ` - ${monthLabels[monthIndex]} ${year === 'all' ? 'All Years' : year}`;
      } else if (year !== 'all') {
        description += ` - Year ${year}`;
      } else {
        description += ` - All Time`;
      }
    }

    if (searchTerm) description += ` - Search: "${searchTerm}"`;

    return description;
  }, [executiveFilter, filterType, useDateFilter, selectedDate, useMonthYearFilter, selectedMonth, year, searchTerm, monthLabels]);

  const getFilterDisplayText = () => {
    let text = '';
    
    if (useDateFilter && selectedDate) {
      text = new Date(selectedDate).toLocaleDateString();
    } else if (useMonthYearFilter) {
      if (year === 'all' && selectedMonth === 'all') {
        text = 'All Time';
      } else if (year === 'all') {
        const monthIndex = parseInt(selectedMonth) - 1;
        text = `All Years, ${monthLabels[monthIndex]}`;
      } else if (selectedMonth === 'all') {
        text = `${year} - All Months`;
      } else {
        const monthIndex = parseInt(selectedMonth) - 1;
        text = `${monthLabels[monthIndex]} ${year}`;
      }
    }
    
    return text;
  };

  const handleExportToExcel = useCallback(() => {
    const exportData = filteredOrders.map((order, orderIndex) => {
      const latestFollowUp = getLatestFollowUp(order);
      return {
        'S.No': orderIndex + 1,
        'Executive': order?.executive || '',
        'Business': order?.business || '',
        'Customer': order?.contactPerson || '',
        'Contact': `${order?.contactCode || ''} ${order?.phone || ''}`.trim(),
        'Total': order?.orderTotal || 0,
        'Advance': order?.advance || 0,
        'Balance': order?.balance || 0,
        'Delivery Date': getDeliveryDate(order),
        'Order Date': order?.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
        'Latest Follow-up': latestFollowUp ? `${new Date(latestFollowUp.date).toLocaleDateString()}: ${latestFollowUp.description}` : 'No follow-up',
        'Follow-up Status': latestFollowUp?.status || 'N/A',
        'Next Follow-up': latestFollowUp?.nextFollowUpDate ? new Date(latestFollowUp.nextFollowUpDate).toLocaleDateString() : 'Not set',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');

    const fileName = `${filterType}_payments_report_${getFilterDescription().replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [filteredOrders, getLatestFollowUp, getDeliveryDate, getFilterDescription, filterType]);

  const handleExportToWord = async () => {
    setExportLoading(true);
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: getFilterDescription(),
              heading: "Heading1",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: `Generated on: ${new Date().toLocaleString()}` }),
            new Paragraph({ text: "" }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    "S.No", "Executive", "Business", "Customer", "Contact",
                    "Total", "Advance", "Balance", "Delivery Date", "Latest Follow-up"
                  ].map(header => new TableCell({ children: [new Paragraph(header)] }))
                }),
                ...filteredOrders.slice(0, 50).map((order, idx) => new TableRow({
                  children: [
                    (idx + 1).toString(), 
                    order.executive || '', 
                    order.business || '', 
                    order.contactPerson || '',
                    `${order.contactCode || ''} ${order.phone || ''}`.trim(),
                    `₹${order.orderTotal || 0}`,
                    `₹${order.advance || 0}`, 
                    `₹${order.balance || 0}`,
                    getDeliveryDate(order), 
                    formatFollowUp(order)
                  ].map(cell => new TableCell({ children: [new Paragraph(String(cell || ''))] }))
                }))
              ],
            })
          ]
        }]
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `payments_report_${Date.now()}.docx`);
    } catch (error) {
      console.error('Error exporting to Word:', error);
      alert('Failed to export to Word');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportToPDF = () => {
    setExportLoading(true);
    try {
      const doc = new jsPDF('landscape');
      let yPos = 20;
      
      doc.setFontSize(16);
      doc.text(getFilterDescription(), 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      const headers = ['S.No', 'Executive', 'Business', 'Customer', 'Total', 'Advance', 'Balance', 'Delivery Date'];
      const data = filteredOrders.slice(0, 20).map((order, idx) => [
        (idx + 1).toString(), 
        order.executive || '', 
        order.business || '', 
        order.contactPerson || '',
        `₹${order.orderTotal || 0}`,
        `₹${order.advance || 0}`, 
        `₹${order.balance || 0}`, 
        getDeliveryDate(order)
      ]);
      
      doc.autoTable({ head: [headers], body: data, startY: yPos });
      
      if (filteredOrders.length > 20) {
        doc.text(`* Showing first 20 of ${filteredOrders.length} records`, 14, doc.lastAutoTable.finalY + 10);
      }
      
      doc.save(`payments_report_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF');
    } finally {
      setExportLoading(false);
    }
  };

  // Fetch orders when component mounts
  useEffect(() => {
    fetchOrders();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    if (orders.length > 0) {
      applyFilters(orders);
    }
  }, [useDateFilter, selectedDate, useMonthYearFilter, year, selectedMonth, filterType, executiveFilter, searchTerm]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filterType) params.set('filterType', filterType);
    if (year && year !== 'all') params.set('year', year.toString());
    if (selectedMonth && selectedMonth !== 'all' && !useDateFilter) {
      params.set('month', selectedMonth.toString());
    }
    if (selectedDate && useDateFilter) params.set('date', selectedDate);
    if (executiveFilter) params.set('executive', executiveFilter);
    
    const currentParams = new URLSearchParams(window.location.search);
    if (params.toString() !== currentParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [filterType, year, selectedMonth, selectedDate, useDateFilter, executiveFilter]);

  // Handle scroll for fixed columns
  useEffect(() => {
    const handleScroll = () => {
      if (tableContainerRef.current) {
        setScrollPosition(tableContainerRef.current.scrollLeft);
      }
    };
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Responsive column widths
  const getColumnWidths = () => {
    if (isMobile) {
      return {
        sno: '50px',
        executive: '100px',
        business: '120px',
        customer: '100px',
        contact: '110px',
        total: '80px',
        advance: '80px',
        balance: '80px',
        deliveryDate: '100px',
        followUp: '140px',
        actions: '120px'
      };
    } else {
      return {
        sno: '60px',
        executive: '120px',
        business: '180px',
        customer: '150px',
        contact: '140px',
        total: '100px',
        advance: '100px',
        balance: '100px',
        deliveryDate: '120px',
        followUp: '200px',
        actions: '220px'
      };
    }
  };

  const columnWidths = getColumnWidths();

  // Calculate left positions for sticky columns
  const getLeftPosition = (columnIndex) => {
    const widths = {
      0: parseInt(columnWidths.sno),
      1: parseInt(columnWidths.executive),
      2: parseInt(columnWidths.business),
      3: parseInt(columnWidths.customer)
    };
    
    let left = 0;
    for (let i = 0; i < columnIndex; i++) {
      left += widths[i];
    }
    return left;
  };

  // Filter button styles
  const filterButtonStyle = (filterTypeValue) => ({
    padding: isMobile ? '6px 12px' : '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: isMobile ? '12px' : '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    backgroundColor: activeFilter === filterTypeValue ? '#3498db' : '#ecf0f1',
    color: activeFilter === filterTypeValue ? 'white' : '#2c3e50',
    flex: isMobile ? 1 : 'auto',
  });

  // Styles object (simplified - keeping essential styles)
  const styles = {
    container: {
      padding: isMobile ? '10px' : '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
    },
    title: {
      textAlign: 'center',
      margin: '0 0 20px 0',
      color: '#2c3e50',
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: '600',
    },
    summaryContainer: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? '10px' : '15px',
      marginBottom: '20px',
    },
    summaryBox: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: isMobile ? '10px' : '15px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    summaryLabel: {
      fontSize: isMobile ? '11px' : '14px',
      color: '#7f8c8d',
      fontWeight: '600',
      marginBottom: '5px',
    },
    summaryAmount: {
      fontSize: isMobile ? '16px' : '20px',
      fontWeight: 'bold',
    },
    summaryCount: {
      fontSize: isMobile ? '10px' : '12px',
      color: '#3498db',
      backgroundColor: '#ebf5fb',
      padding: '2px 6px',
      borderRadius: '12px',
      display: 'inline-block',
      marginTop: '5px',
    },
    filterContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '10px' : '15px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      padding: isMobile ? '12px' : '15px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    filterRow: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '10px' : '15px',
    },
    searchContainer: {
      display: 'flex',
      justifyContent: 'center',
      position: 'relative',
      width: '100%',
    },
    searchInput: {
      padding: isMobile ? '8px 12px' : '10px 15px',
      paddingRight: '40px',
      width: '100%',
      maxWidth: isMobile ? '100%' : '500px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: isMobile ? '14px' : '14px',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
    },
    searchClearButton: {
      position: 'absolute',
      right: isMobile ? '10px' : 'calc(50% - 250px)',
      background: 'none',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      color: '#7f8c8d',
      padding: '5px 10px',
    },
    filterModeContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? '10px' : '20px',
      marginBottom: '10px',
    },
    filterModeButton: {
      padding: isMobile ? '6px 12px' : '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '12px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      flex: isMobile ? 1 : 'auto',
    },
    dateFilterContainer: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: isMobile ? '10px' : '15px',
      flexWrap: 'wrap',
      padding: '10px',
      backgroundColor: '#f0f7ff',
      borderRadius: '4px',
    },
    dateInputWrapper: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      width: isMobile ? '100%' : 'auto',
    },
    dateInput: {
      padding: '8px 12px',
      paddingLeft: '35px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: isMobile ? '14px' : '14px',
      width: isMobile ? '100%' : '200px',
    },
    calendarIcon: {
      position: 'absolute',
      left: '10px',
      fontSize: '16px',
      color: '#3498db',
      pointerEvents: 'none',
    },
    yearMonthContainer: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '10px' : '15px',
      width: isMobile ? '100%' : 'auto',
    },
    selectWrapper: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '4px' : '8px',
      width: isMobile ? '100%' : 'auto',
    },
    filterLabel: {
      fontWeight: '600',
      color: '#2c3e50',
      fontSize: isMobile ? '12px' : '14px',
      minWidth: isMobile ? '100%' : 'auto',
    },
    filterSelect: {
      padding: isMobile ? '6px 10px' : '8px 12px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      backgroundColor: '#fff',
      fontSize: isMobile ? '14px' : '14px',
      cursor: 'pointer',
      width: isMobile ? '100%' : 'auto',
    },
    clearFilterButton: {
      padding: isMobile ? '6px 10px' : '8px 12px',
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '12px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: isMobile ? '100%' : 'auto',
    },
    currentMonthButton: {
      padding: isMobile ? '6px 10px' : '8px 12px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '12px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: isMobile ? '100%' : 'auto',
    },
    clearAllButton: {
      padding: isMobile ? '6px 10px' : '8px 12px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '12px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: isMobile ? '100%' : 'auto',
    },
    currentFilterInfo: {
      textAlign: 'center',
      padding: '8px',
      backgroundColor: '#e8f4fd',
      borderRadius: '4px',
      color: '#2c3e50',
      fontSize: isMobile ? '11px' : '14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px',
    },
    filterBadge: {
      backgroundColor: '#3498db',
      color: 'white',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
    },
    filterButtonsContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? '8px' : '10px',
      marginBottom: '15px',
      flexWrap: 'wrap',
    },
    loading: {
      textAlign: 'center',
      padding: '20px',
      color: '#7f8c8d',
      fontSize: isMobile ? '14px' : '16px',
    },
    noData: {
      textAlign: 'center',
      padding: '20px',
      color: '#7f8c8d',
      fontSize: isMobile ? '14px' : '16px',
    },
    tableWrapper: {
      position: 'relative',
      width: '100%',
      overflow: 'hidden',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      backgroundColor: '#fff',
    },
    tableContainer: {
      width: '100%',
      overflowX: 'auto',
      overflowY: 'auto',
      maxHeight: isMobile ? 'calc(100vh - 400px)' : '70vh',
      backgroundColor: '#fff',
      position: 'relative',
      border: '1px solid #ddd',
      WebkitOverflowScrolling: 'touch',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: isMobile ? '12px' : '14px',
      minWidth: isMobile ? '100%' : '1400px',
    },
    tableHeader: {
      backgroundColor: '#3498db',
      color: '#ffffff',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    },
    stickyHeader: (index, width, left) => ({
      padding: isMobile ? '8px 4px' : '12px 8px',
      textAlign: 'left',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      borderRight: '1px solid rgba(255,255,255,0.2)',
      position: isMobile ? 'relative' : 'sticky',
      left: isMobile ? '0' : `${left}px`,
      backgroundColor: '#3498db',
      zIndex: isMobile ? 10 : 100 + (index + 1) * 10,
      minWidth: width,
      width: width,
      boxShadow: isMobile ? 'none' : '2px 0 3px rgba(0,0,0,0.1)',
    }),
    regularHeader: (width) => ({
      padding: isMobile ? '8px 4px' : '12px 8px',
      textAlign: 'left',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      borderRight: '1px solid rgba(255,255,255,0.2)',
      minWidth: width,
      width: width,
    }),
    stickyCell: (index, width, left, backgroundColor) => ({
      padding: isMobile ? '8px 4px' : '12px 8px',
      borderBottom: '1px solid #eee',
      borderRight: '1px solid #eee',
      textAlign: 'left',
      position: isMobile ? 'relative' : 'sticky',
      left: isMobile ? '0' : `${left}px`,
      backgroundColor: backgroundColor,
      zIndex: isMobile ? 1 : 10 + (index + 1) * 10,
      minWidth: width,
      width: width,
      boxShadow: isMobile ? 'none' : '2px 0 3px rgba(0,0,0,0.1)',
      verticalAlign: 'top',
    }),
    regularTd: (width) => ({
      padding: isMobile ? '8px 4px' : '12px 8px',
      borderBottom: '1px solid #eee',
      borderRight: '1px solid #eee',
      textAlign: 'left',
      verticalAlign: 'top',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      minWidth: width,
      width: width,
    }),
    textCell: {
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
    },
    balanceCell: {
      color: '#e74c3c',
      fontWeight: '600',
    },
    completedCell: {
      color: '#27ae60',
      fontWeight: '600',
    },
    deliveryDateCell: {
      color: '#27ae60',
      fontWeight: '500',
    },
    followUpCell: {
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      color: '#f39c12',
      fontWeight: '500',
    },
    actionButtons: {
      display: 'flex',
      gap: isMobile ? '4px' : '5px',
      flexWrap: 'wrap',
    },
    payButton: {
      backgroundColor: '#9b59b6',
      color: 'white',
      border: 'none',
      padding: isMobile ? '4px 8px' : '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '10px' : '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    settlementButton: {
      backgroundColor: '#16a085',
      color: 'white',
      border: 'none',
      padding: isMobile ? '4px 8px' : '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '10px' : '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    followUpButton: {
      backgroundColor: '#f39c12',
      color: 'white',
      border: 'none',
      padding: isMobile ? '4px 8px' : '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '10px' : '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    viewButton: {
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      padding: isMobile ? '4px 8px' : '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '10px' : '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    viewSettlementButton: {
      backgroundColor: '#8e44ad',
      color: 'white',
      border: 'none',
      padding: isMobile ? '4px 8px' : '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '10px' : '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    completedBadge: {
      backgroundColor: '#2ecc71',
      color: 'white',
      padding: isMobile ? '4px 8px' : '6px 12px',
      borderRadius: '4px',
      fontSize: isMobile ? '10px' : '12px',
      fontWeight: '600',
      display: 'inline-block',
    },
    footerButtons: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'center',
      gap: isMobile ? '10px' : '15px',
      marginTop: '20px',
      flexWrap: 'wrap',
    },
    excelButton: {
      backgroundColor: '#16a085',
      color: 'white',
      border: 'none',
      padding: isMobile ? '10px 15px' : '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '14px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: isMobile ? '100%' : 'auto',
    },
    wordButton: {
      backgroundColor: '#2c5fa3',
      color: 'white',
      border: 'none',
      padding: isMobile ? '10px 15px' : '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '14px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: isMobile ? '100%' : 'auto',
    },
    pdfButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      padding: isMobile ? '10px 15px' : '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '14px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: isMobile ? '100%' : 'auto',
    },
    backButton: {
      backgroundColor: '#7f8c8d',
      color: 'white',
      border: 'none',
      padding: isMobile ? '10px 15px' : '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '14px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: isMobile ? '100%' : 'auto',
    },
    refreshButton: {
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      padding: isMobile ? '10px 15px' : '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '14px' : '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: isMobile ? '100%' : 'auto',
    },
    paymentModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    paymentModalContent: {
      backgroundColor: 'white',
      padding: isMobile ? '20px' : '25px',
      borderRadius: '8px',
      width: isMobile ? '95%' : '500px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    paymentModalTitle: {
      marginTop: 0,
      textAlign: 'center',
      color: '#2c3e50',
      fontSize: isMobile ? '18px' : '20px',
    },
    paymentFormGroup: {
      marginBottom: '15px',
    },
    paymentFormLabel: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '500',
      fontSize: isMobile ? '13px' : '14px',
    },
    paymentFormInput: {
      width: '100%',
      padding: isMobile ? '8px' : '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: isMobile ? '14px' : '14px',
    },
    paymentFormTextarea: {
      width: '100%',
      padding: isMobile ? '8px' : '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      minHeight: '60px',
      fontSize: isMobile ? '14px' : '14px',
    },
    paymentFormButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px',
    },
    paymentCancelButton: {
      padding: isMobile ? '8px 16px' : '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: isMobile ? '14px' : '14px',
    },
    paymentSubmitButton: {
      padding: isMobile ? '8px 16px' : '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: isMobile ? '14px' : '14px',
    },
    settlementModalContent: {
      backgroundColor: 'white',
      padding: isMobile ? '20px' : '25px',
      borderRadius: '8px',
      width: isMobile ? '95%' : '500px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
      borderTop: '4px solid #16a085',
    },
    followUpModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    followUpModalContent: {
      backgroundColor: 'white',
      padding: isMobile ? '20px' : '25px',
      borderRadius: '8px',
      width: isMobile ? '95%' : '600px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
      borderTop: '4px solid #f39c12',
    },
    viewFollowUpsModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    viewFollowUpsContent: {
      backgroundColor: 'white',
      padding: isMobile ? '20px' : '25px',
      borderRadius: '8px',
      width: isMobile ? '95%' : '700px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    followUpItem: {
      padding: isMobile ? '12px' : '15px',
      border: '1px solid #ecf0f1',
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f8f9fa',
    },
    followUpHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
      flexWrap: 'wrap',
      gap: '8px',
    },
    followUpDate: {
      fontWeight: 'bold',
      color: '#2c3e50',
      fontSize: isMobile ? '12px' : '13px',
    },
    followUpStatus: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      color: 'white',
    },
    followUpDescription: {
      margin: '10px 0',
      padding: '10px',
      backgroundColor: 'white',
      borderRadius: '4px',
      fontStyle: 'italic',
      fontSize: isMobile ? '13px' : '14px',
    },
    followUpNextDate: {
      fontSize: '11px',
      color: '#7f8c8d',
      marginTop: '5px',
    },
    settlementItem: {
      padding: isMobile ? '12px' : '15px',
      border: '1px solid #ecf0f1',
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f0f7f4',
    },
    settlementHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
      flexWrap: 'wrap',
      gap: '8px',
    },
    settlementType: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      color: 'white',
    },
    settlementAmount: {
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: 'bold',
      color: '#16a085',
      margin: '5px 0',
    },
    settlementReason: {
      margin: '5px 0',
      padding: '5px',
      backgroundColor: 'white',
      borderRadius: '4px',
      fontSize: isMobile ? '12px' : '13px',
    },
    businessNameStyle: {
      color: executiveFilter ? '#666666' : '#003366',
      cursor: executiveFilter ? 'default' : 'pointer',
      fontWeight: '500',
      textDecoration: executiveFilter ? 'none' : 'underline',
      transition: executiveFilter ? 'none' : 'all 0.2s ease',
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block',
    },
  };

  // Success popup styles
  const successPopupStyles = {
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    },
    content: {
      backgroundColor: 'white',
      padding: isMobile ? '20px' : '30px',
      borderRadius: '12px',
      width: isMobile ? '90%' : '400px',
      maxWidth: '90%',
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    },
    icon: {
      fontSize: isMobile ? '50px' : '60px',
      color: '#27ae60',
      marginBottom: '15px',
    },
    settlementIcon: {
      fontSize: isMobile ? '50px' : '60px',
      color: '#16a085',
      marginBottom: '15px',
    },
    followUpIcon: {
      fontSize: isMobile ? '50px' : '60px',
      color: '#f39c12',
      marginBottom: '15px',
    },
    title: {
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: 'bold',
      color: '#27ae60',
      marginBottom: '20px',
    },
    settlementTitle: {
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: 'bold',
      color: '#16a085',
      marginBottom: '20px',
    },
    followUpTitle: {
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: 'bold',
      color: '#f39c12',
      marginBottom: '20px',
    },
    message: {
      fontSize: isMobile ? '14px' : '16px',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    amount: {
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: 'bold',
      color: '#e74c3c',
      margin: '10px 0',
    },
    balance: {
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: 'bold',
      color: '#3498db',
      margin: '10px 0',
    },
    orderNo: {
      fontSize: isMobile ? '12px' : '14px',
      color: '#7f8c8d',
      marginBottom: '20px',
      fontStyle: 'italic',
    },
    description: {
      fontSize: isMobile ? '14px' : '16px',
      color: '#2c3e50',
      margin: '15px 0',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      fontStyle: 'italic',
    },
    button: {
      backgroundColor: '#27ae60',
      color: 'white',
      border: 'none',
      padding: isMobile ? '10px 20px' : '12px 30px',
      borderRadius: '6px',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px',
      transition: 'all 0.3s',
    },
    settlementButton: {
      backgroundColor: '#16a085',
      color: 'white',
      border: 'none',
      padding: isMobile ? '10px 20px' : '12px 30px',
      borderRadius: '6px',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px',
      transition: 'all 0.3s',
    },
    followUpButton: {
      backgroundColor: '#f39c12',
      color: 'white',
      border: 'none',
      padding: isMobile ? '10px 20px' : '12px 30px',
      borderRadius: '6px',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px',
      transition: 'all 0.3s',
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        {executiveFilter ? `${executiveFilter}'s ` : ''}
        {filterType === 'pending' ? 'Pending Payments' : 'Completed Payments'}
        {getFilterDisplayText() ? ` - ${getFilterDisplayText()}` : ''}
      </h2>

      {/* Summary Boxes */}
      <div style={styles.summaryContainer}>
        <div style={styles.summaryBox}>
          <div style={styles.summaryLabel}>Total Payments</div>
          <div style={{...styles.summaryAmount, color: '#2c3e50'}}>₹{totalPayments.toLocaleString()}</div>
          <div style={styles.summaryCount}>{filteredOrders.length} orders</div>
        </div>
        <div style={styles.summaryBox}>
          <div style={styles.summaryLabel}>Total Received</div>
          <div style={{...styles.summaryAmount, color: '#27ae60'}}>₹{totalReceived.toLocaleString()}</div>
          <div style={styles.summaryCount}>Advance payments</div>
        </div>
        <div style={styles.summaryBox}>
          <div style={styles.summaryLabel}>Total Pending</div>
          <div style={{...styles.summaryAmount, color: '#e74c3c'}}>₹{totalPending.toLocaleString()}</div>
          <div style={styles.summaryCount}>Balance amount</div>
        </div>
        <div style={styles.summaryBox}>
          <div style={styles.summaryLabel}>Today's Collections</div>
          <div style={{...styles.summaryAmount, color: '#f39c12'}}>₹{todayCollections.toLocaleString()}</div>
          <div style={styles.summaryCount}>{todayCollectionCount} orders</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={styles.filterButtonsContainer}>
        <button 
          style={filterButtonStyle('pending')} 
          onClick={() => {
            setActiveFilter('pending');
          }}
        >
          Pending
        </button>
        <button 
          style={filterButtonStyle('completed')} 
          onClick={() => {
            setActiveFilter('completed');
          }}
        >
          Completed
        </button>
      </div>

      {/* Filter Container */}
      <div style={styles.filterContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by executive, business, customer, phone, order no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              style={styles.searchClearButton}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        
        <div style={styles.filterModeContainer}>
          <button
            onClick={() => handleFilterModeChange(false)}
            style={{
              ...styles.filterModeButton,
              backgroundColor: !useDateFilter ? '#3498db' : '#ecf0f1',
              color: !useDateFilter ? 'white' : '#2c3e50',
            }}
          >
            Month/Year
          </button>
          <button
            onClick={() => handleFilterModeChange(true)}
            style={{
              ...styles.filterModeButton,
              backgroundColor: useDateFilter ? '#3498db' : '#ecf0f1',
              color: useDateFilter ? 'white' : '#2c3e50',
            }}
          >
            Date
          </button>
        </div>

        {useDateFilter ? (
          <div style={styles.dateFilterContainer}>
            <div style={styles.dateInputWrapper}>
              <span style={styles.calendarIcon}>📅</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <button onClick={clearDateFilter} style={styles.clearFilterButton}>
              Clear Date
            </button>
          </div>
        ) : (
          <div style={styles.yearMonthContainer}>
            <div style={styles.selectWrapper}>
              <label htmlFor="year-select" style={styles.filterLabel}>Year:</label>
              <select
                id="year-select"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={styles.filterSelect}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y === 'all' ? 'ALL YEARS' : y}</option>
                ))}
              </select>
            </div>
            
            <div style={styles.selectWrapper}>
              <label htmlFor="month-select" style={styles.filterLabel}>Month:</label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">ALL MONTHS</option>
                {monthLabels.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
            
            <button onClick={resetToCurrentMonth} style={styles.currentMonthButton}>
              Current Month
            </button>
          </div>
        )}
        
        <div style={styles.filterRow}>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            {(useDateFilter && selectedDate) || (!useDateFilter && (year !== 'all' || selectedMonth !== 'all')) && (
              <button onClick={() => {
                if (useDateFilter) clearDateFilter();
                else clearMonthYearFilter();
              }} style={styles.clearFilterButton}>
                Clear {useDateFilter ? 'Date' : 'Month/Year'}
              </button>
            )}
            
            {(year !== 'all' || selectedMonth !== 'all' || useDateFilter || searchTerm || filterType !== 'pending') && (
              <button onClick={clearAllFilters} style={styles.clearAllButton}>
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        <div style={styles.currentFilterInfo}>
          <span>
            Currently showing: <strong>{getFilterDisplayText() || 'All Time'}</strong>
            {searchTerm && <span> | Search: <strong>"{searchTerm}"</strong></span>}
          </span>
          <span style={styles.filterBadge}>
            {filteredOrders.length} orders
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableWrapper}>
        <div 
          ref={tableContainerRef}
          style={styles.tableContainer}
        >
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.stickyHeader(0, columnWidths.sno, getLeftPosition(0))}>S.No</th>
                <th style={styles.stickyHeader(1, columnWidths.executive, getLeftPosition(1))}>Executive</th>
                <th style={styles.stickyHeader(2, columnWidths.business, getLeftPosition(2))}>Business</th>
                <th style={styles.stickyHeader(3, columnWidths.customer, getLeftPosition(3))}>Customer</th>
                <th style={styles.regularHeader(columnWidths.contact)}>Contact</th>
                <th style={styles.regularHeader(columnWidths.total)}>Total</th>
                <th style={styles.regularHeader(columnWidths.advance)}>Advance</th>
                <th style={styles.regularHeader(columnWidths.balance)}>Balance</th>
                <th style={styles.regularHeader(columnWidths.deliveryDate)}>Delivery Date</th>
                <th style={styles.regularHeader(columnWidths.followUp)}>Follow-up</th>
                <th style={styles.regularHeader(columnWidths.actions)}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={styles.loading}>
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="11" style={styles.noData}>
                    No {filterType === 'pending' ? 'pending' : 'completed'} orders found
                    {searchTerm && ` matching "${searchTerm}"`}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const latestFollowUp = getLatestFollowUp(order);
                  const followUpCount = order.followUps?.length || 0;
                  const settlementCount = order.settlements?.length || 0;
                  const isCompleted = order.balance <= 0;
                  const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                  const orderTotal = order?.orderTotal || 0;

                  return (
                    <tr key={order?._id || index} style={{ backgroundColor: rowBgColor }}>
                      <td style={styles.stickyCell(0, columnWidths.sno, getLeftPosition(0), rowBgColor)}>
                        {index + 1}
                      </td>
                      <td style={styles.stickyCell(1, columnWidths.executive, getLeftPosition(1), rowBgColor)}>
                        <div style={styles.textCell}>{order?.executive || ''}</div>
                      </td>
                      <td style={styles.stickyCell(2, columnWidths.business, getLeftPosition(2), rowBgColor)}>
                        <span
                          style={styles.businessNameStyle}
                          onClick={() => handleBusinessClick(order?.business)}
                        >
                          {order?.business || ''}
                        </span>
                      </td>
                      <td style={styles.stickyCell(3, columnWidths.customer, getLeftPosition(3), rowBgColor)}>
                        <div style={styles.textCell}>{order?.contactPerson || ''}</div>
                      </td>
                      <td style={styles.regularTd(columnWidths.contact)}>
                        <div style={styles.textCell}>{order?.contactCode || ''} {order?.phone || ''}</div>
                      </td>
                      <td style={styles.regularTd(columnWidths.total)}>
                        ₹{orderTotal.toLocaleString()}
                      </td>
                      <td style={styles.regularTd(columnWidths.advance)}>
                        ₹{(order?.advance || 0).toLocaleString()}
                      </td>
                      <td style={{...styles.regularTd(columnWidths.balance), ...(order.balance > 0 ? styles.balanceCell : styles.completedCell)}}>
                        ₹{(order?.balance || 0).toLocaleString()}
                      </td>
                      <td style={{...styles.regularTd(columnWidths.deliveryDate), ...styles.deliveryDateCell}}>
                        {getDeliveryDate(order)}
                      </td>
                      <td
                        style={{...styles.regularTd(columnWidths.followUp), ...styles.followUpCell}}
                        onClick={() => followUpCount > 0 && handleViewFollowUps(order)}
                        title={latestFollowUp ? `Latest: ${latestFollowUp.description}\nStatus: ${latestFollowUp.status}\nClick to view all ${followUpCount} follow-ups` : 'No follow-ups'}
                      >
                        {latestFollowUp ? (
                          <span style={{ color: getFollowUpStatusColor(latestFollowUp.status) }}>
                            {formatFollowUp(order)}
                            {followUpCount > 1 && ` (+${followUpCount - 1})`}
                          </span>
                        ) : 'No follow-up'}
                      </td>
                      <td style={styles.regularTd(columnWidths.actions)}>
                        <div style={styles.actionButtons}>
                          {isCompleted ? (
                            <>
                              <span style={styles.completedBadge}>✓ Done</span>
                              {followUpCount > 0 && (
                                <button
                                  onClick={() => handleViewFollowUps(order)}
                                  style={styles.viewButton}
                                  title="View Follow-ups"
                                >
                                  F
                                </button>
                              )}
                              {settlementCount > 0 && (
                                <button
                                  onClick={() => handleViewSettlements(order)}
                                  style={styles.viewSettlementButton}
                                  title="View Settlements"
                                >
                                  S
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {filterType === 'pending' && order.balance > 0 && (
                                <>
                                  <button
                                    onClick={() => handleRecordPayment(order)}
                                    style={styles.payButton}
                                    title="Record Payment"
                                  >
                                    Pay
                                  </button>
                                  <button
                                    onClick={() => handleSettlement(order)}
                                    style={styles.settlementButton}
                                    title="Record Settlement"
                                  >
                                    Settle
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleFollowUp(order)}
                                style={styles.followUpButton}
                                title="Add Follow-up"
                              >
                                +F
                              </button>
                              {followUpCount > 0 && (
                                <button
                                  onClick={() => handleViewFollowUps(order)}
                                  style={styles.viewButton}
                                  title="View Follow-ups"
                                >
                                  F
                                </button>
                              )}
                              {settlementCount > 0 && (
                                <button
                                  onClick={() => handleViewSettlements(order)}
                                  style={styles.viewSettlementButton}
                                  title="View Settlements"
                                >
                                  S
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Buttons */}
      <div style={styles.footerButtons}>
        <button
          onClick={handleExportToExcel}
          style={styles.excelButton}
          disabled={exportLoading || filteredOrders.length === 0}
        >
          📊 Excel
        </button>
        <button
          onClick={handleExportToWord}
          style={styles.wordButton}
          disabled={exportLoading || filteredOrders.length === 0}
        >
          📄 Word
        </button>
        <button
          onClick={handleExportToPDF}
          style={styles.pdfButton}
          disabled={exportLoading || filteredOrders.length === 0}
        >
          📑 PDF
        </button>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Back
        </button>
        <button onClick={fetchOrders} style={styles.refreshButton}>
          🔄 Refresh
        </button>
        {(year !== 'all' || selectedMonth !== 'all' || useDateFilter || searchTerm || filterType !== 'pending') && (
          <button onClick={clearAllFilters} style={styles.clearAllButton}>
            Clear All
          </button>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && currentOrder && (
        <div style={styles.paymentModal}>
          <div style={styles.paymentModalContent}>
            <h3 style={styles.paymentModalTitle}>Record Payment</h3>

            <div style={styles.paymentFormGroup}>
              <label style={styles.paymentFormLabel}>Pending Amount</label>
              <input
                type="text"
                value={`₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'}`}
                readOnly
                style={{...styles.paymentFormInput, backgroundColor: '#f5f5f5', fontWeight: 'bold', color: currentOrder.balance > 0 ? '#e74c3c' : '#2ecc71'}}
              />
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Amount to Pay *</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handlePaymentChange}
                  placeholder={`Enter amount (max: ₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'})`}
                  style={styles.paymentFormInput}
                  required
                  min="0.01"
                  step="0.01"
                  max={currentOrder.balance || 0}
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Payment Date *</label>
                <input
                  type="date"
                  name="date"
                  value={paymentData.date}
                  onChange={handlePaymentChange}
                  style={styles.paymentFormInput}
                  required
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Payment Method *</label>
                <select
                  name="method"
                  value={paymentData.method}
                  onChange={handlePaymentChange}
                  style={styles.paymentFormInput}
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {['Cheque', 'Bank Transfer', 'UPI'].includes(paymentData.method) && (
                <div style={styles.paymentFormGroup}>
                  <label style={styles.paymentFormLabel}>
                    {paymentData.method === 'Cheque' ? 'Cheque Number' :
                     paymentData.method === 'UPI' ? 'UPI Reference' : 'Transaction ID'} *
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={paymentData.reference}
                    onChange={handlePaymentChange}
                    style={styles.paymentFormInput}
                    required
                  />
                </div>
              )}

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Notes</label>
                <textarea
                  name="note"
                  value={paymentData.note}
                  onChange={handlePaymentChange}
                  style={styles.paymentFormTextarea}
                  placeholder="Additional payment details"
                />
              </div>

              <div style={styles.paymentFormButtons}>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={styles.paymentCancelButton}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  style={{...styles.paymentSubmitButton, opacity: paymentLoading ? 0.7 : 1}}
                >
                  {paymentLoading ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettlementModal && currentOrder && (
        <div style={styles.paymentModal}>
          <div style={styles.settlementModalContent}>
            <h3 style={{...styles.paymentModalTitle, color: '#16a085'}}>Record Settlement</h3>

            <div style={styles.paymentFormGroup}>
              <label style={styles.paymentFormLabel}>Current Balance</label>
              <input
                type="text"
                value={`₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'}`}
                readOnly
                style={{...styles.paymentFormInput, backgroundColor: '#f5f5f5', fontWeight: 'bold', color: '#e74c3c'}}
              />
            </div>

            <form onSubmit={handleSettlementSubmit}>
              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Settlement Type *</label>
                <select
                  name="type"
                  value={settlementData.type}
                  onChange={handleSettlementChange}
                  style={styles.paymentFormInput}
                  required
                >
                  <option value="Full Settlement">Full Settlement</option>
                  <option value="Partial Settlement">Partial Settlement</option>
                  <option value="Write-off">Write-off</option>
                  <option value="Discount">Discount</option>
                  <option value="Credit Note">Credit Note</option>
                </select>
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Settlement Amount *</label>
                <input
                  type="number"
                  name="amount"
                  value={settlementData.amount}
                  onChange={handleSettlementChange}
                  style={styles.paymentFormInput}
                  required
                  min="0.01"
                  step="0.01"
                  max={currentOrder.balance || 0}
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Settlement Date *</label>
                <input
                  type="date"
                  name="date"
                  value={settlementData.date}
                  onChange={handleSettlementChange}
                  style={styles.paymentFormInput}
                  required
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Reason for Settlement *</label>
                <textarea
                  name="reason"
                  value={settlementData.reason}
                  onChange={handleSettlementChange}
                  style={styles.paymentFormTextarea}
                  placeholder="Explain the reason for settlement"
                  required
                  rows="3"
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Approved By *</label>
                <input
                  type="text"
                  name="approvedBy"
                  value={settlementData.approvedBy}
                  onChange={handleSettlementChange}
                  style={styles.paymentFormInput}
                  placeholder="Name of approver"
                  required
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Additional Notes</label>
                <textarea
                  name="notes"
                  value={settlementData.notes}
                  onChange={handleSettlementChange}
                  style={styles.paymentFormTextarea}
                  placeholder="Any additional notes"
                  rows="2"
                />
              </div>

              <div style={styles.paymentFormButtons}>
                <button type="button" onClick={() => setShowSettlementModal(false)} style={styles.paymentCancelButton}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settlementLoading}
                  style={{...styles.paymentSubmitButton, backgroundColor: '#16a085', opacity: settlementLoading ? 0.7 : 1}}
                >
                  {settlementLoading ? 'Processing...' : 'Record Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFollowUpModal && currentOrder && (
        <div style={styles.followUpModal}>
          <div style={styles.followUpModalContent}>
            <h3 style={{...styles.paymentModalTitle, color: '#f39c12'}}>
              Add Follow-up for {currentOrder.business}
            </h3>

            <form onSubmit={handleFollowUpSubmit}>
              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Follow-up Date *</label>
                <input
                  type="date"
                  name="date"
                  value={followUpData.date}
                  onChange={handleFollowUpChange}
                  style={styles.paymentFormInput}
                  required
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Description/Message *</label>
                <textarea
                  name="description"
                  value={followUpData.description}
                  onChange={handleFollowUpChange}
                  style={styles.paymentFormTextarea}
                  placeholder="What was discussed with the client? Any commitment for payment?"
                  required
                  rows="4"
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Next Follow-up Date</label>
                <input
                  type="date"
                  name="nextFollowUpDate"
                  value={followUpData.nextFollowUpDate}
                  onChange={handleFollowUpChange}
                  style={styles.paymentFormInput}
                />
                <small style={{ color: '#7f8c8d', fontSize: isMobile ? '11px' : '12px' }}>Leave blank if no next follow-up scheduled</small>
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Status</label>
                <select
                  name="status"
                  value={followUpData.status}
                  onChange={handleFollowUpChange}
                  style={styles.paymentFormInput}
                >
                  <option value="Pending">Pending</option>
                  <option value="Promise to Pay">Promise to Pay</option>
                  <option value="Partial Payment">Partial Payment</option>
                  <option value="Not Reachable">Not Reachable</option>
                  <option value="Call Back Later">Call Back Later</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div style={styles.paymentFormButtons}>
                <button type="button" onClick={() => setShowFollowUpModal(false)} style={styles.paymentCancelButton}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={followUpLoading}
                  style={{...styles.paymentSubmitButton, backgroundColor: '#f39c12', opacity: followUpLoading ? 0.7 : 1}}
                >
                  {followUpLoading ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Follow-ups Modal */}
      {showViewFollowUpsModal && selectedOrderForView && (
        <div style={styles.viewFollowUpsModal}>
          <div style={styles.viewFollowUpsContent}>
            <h3 style={styles.paymentModalTitle}>
              Follow-ups for {selectedOrderForView.business}
              {selectedOrderForView.orderNo && ` (${selectedOrderForView.orderNo})`}
            </h3>

            {loadingFollowUps ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
                Loading follow-ups...
              </div>
            ) : orderFollowUps.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '20px' }}>
                No follow-ups recorded for this order
              </p>
            ) : (
              <>
                {orderFollowUps.sort((a, b) => new Date(b.date) - new Date(a.date)).map((followUp, idx) => (
                  <div key={idx} style={styles.followUpItem}>
                    <div style={styles.followUpHeader}>
                      <span style={styles.followUpDate}>
                        {new Date(followUp.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span style={{...styles.followUpStatus, backgroundColor: getFollowUpStatusColor(followUp.status)}}>
                        {followUp.status}
                      </span>
                    </div>

                    <div style={styles.followUpDescription}>
                      "{followUp.description}"
                    </div>

                    {followUp.nextFollowUpDate && (
                      <div style={styles.followUpNextDate}>
                        Next Follow-up: {new Date(followUp.nextFollowUpDate).toLocaleDateString()}
                      </div>
                    )}

                    {followUp.createdBy && (
                      <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#95a5a6', marginTop: '5px' }}>
                        Added by: {followUp.createdBy}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowViewFollowUpsModal(false)}
                style={{...styles.paymentCancelButton, backgroundColor: '#3498db'}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Settlements Modal */}
      {showViewSettlementsModal && selectedOrderForSettlementView && (
        <div style={styles.viewFollowUpsModal}>
          <div style={styles.viewFollowUpsContent}>
            <h3 style={{...styles.paymentModalTitle, color: '#16a085'}}>
              Settlements for {selectedOrderForSettlementView.business}
              {selectedOrderForSettlementView.orderNo && ` (${selectedOrderForSettlementView.orderNo})`}
            </h3>

            {loadingSettlements ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
                Loading settlements...
              </div>
            ) : orderSettlements.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '20px' }}>
                No settlements recorded for this order
              </p>
            ) : (
              <>
                {orderSettlements.sort((a, b) => new Date(b.date) - new Date(a.date)).map((settlement, idx) => (
                  <div key={idx} style={styles.settlementItem}>
                    <div style={styles.settlementHeader}>
                      <span style={styles.followUpDate}>
                        {new Date(settlement.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span style={{...styles.settlementType, backgroundColor: getSettlementTypeColor(settlement.type)}}>
                        {settlement.type}
                      </span>
                    </div>

                    <div style={styles.settlementAmount}>
                      Amount: ₹{settlement.amount.toLocaleString()}
                    </div>

                    {settlement.reason && (
                      <div style={styles.settlementReason}>
                        <strong>Reason:</strong> {settlement.reason}
                      </div>
                    )}

                    {settlement.approvedBy && (
                      <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#7f8c8d', marginTop: '5px' }}>
                        Approved by: {settlement.approvedBy}
                      </div>
                    )}

                    {settlement.notes && (
                      <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#95a5a6', marginTop: '5px', fontStyle: 'italic' }}>
                        Notes: {settlement.notes}
                      </div>
                    )}

                    {settlement.createdBy && (
                      <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#95a5a6', marginTop: '5px' }}>
                        Recorded by: {settlement.createdBy}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowViewSettlementsModal(false)}
                style={{...styles.paymentCancelButton, backgroundColor: '#16a085'}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Popup */}
      {showSuccessPopup && (
        <div style={successPopupStyles.modal}>
          <div style={successPopupStyles.content}>
            <div style={successPopupStyles.icon}>✓</div>
            <h2 style={successPopupStyles.title}>Payment Successful!</h2>

            <p style={successPopupStyles.message}>
              Payment has been recorded successfully
            </p>

            <div style={successPopupStyles.amount}>
              Amount Paid: ₹{paymentResult.submittedAmount.toLocaleString()}
            </div>

            <div style={successPopupStyles.balance}>
              Remaining Balance: ₹{paymentResult.remainingBalance.toLocaleString()}
            </div>

            {paymentResult.orderNo && (
              <div style={successPopupStyles.orderNo}>
                Order: {paymentResult.orderNo}
              </div>
            )}

            <button
              onClick={closeSuccessPopup}
              style={successPopupStyles.button}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Settlement Success Popup */}
      {showSettlementSuccess && (
        <div style={successPopupStyles.modal}>
          <div style={successPopupStyles.content}>
            <div style={successPopupStyles.settlementIcon}>✓</div>
            <h2 style={successPopupStyles.settlementTitle}>Settlement Recorded!</h2>

            <p style={successPopupStyles.message}>
              Settlement has been recorded successfully
            </p>

            <div style={successPopupStyles.amount}>
              Type: {settlementResult.type}
            </div>

            <div style={successPopupStyles.balance}>
              Amount: ₹{settlementResult.amount.toLocaleString()}
            </div>

            {settlementResult.orderNo && (
              <div style={successPopupStyles.orderNo}>
                Order: {settlementResult.orderNo}
              </div>
            )}

            <button
              onClick={closeSettlementSuccess}
              style={successPopupStyles.settlementButton}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Follow-up Success Popup */}
      {showFollowUpSuccess && (
        <div style={successPopupStyles.modal}>
          <div style={successPopupStyles.content}>
            <div style={successPopupStyles.followUpIcon}>📝</div>
            <h2 style={successPopupStyles.followUpTitle}>Follow-up Added!</h2>

            <p style={successPopupStyles.message}>
              Follow-up has been recorded successfully
            </p>

            <div style={successPopupStyles.description}>
              "{followUpResult.description}"
            </div>

            {followUpResult.orderNo && (
              <div style={successPopupStyles.orderNo}>
                Order: {followUpResult.orderNo}
              </div>
            )}

            <button
              onClick={closeFollowUpSuccess}
              style={successPopupStyles.followUpButton}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PendingPayment;