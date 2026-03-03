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

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [paymentResult, setPaymentResult] = useState({
    submittedAmount: 0,
    remainingBalance: 0,
    orderNo: ''
  });

  // Follow-up success popup
  const [showFollowUpSuccess, setShowFollowUpSuccess] = useState(false);
  const [followUpResult, setFollowUpResult] = useState({
    orderNo: '',
    description: ''
  });

  // Filter states - Initialize from URL params with current month as default
  const [year, setYear] = useState(() => {
    const urlYear = searchParams.get('year');
    return urlYear ? parseInt(urlYear) : today.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const urlMonth = searchParams.get('month');
    // Default to current month
    return urlMonth ? parseInt(urlMonth) - 1 : today.getMonth();
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const urlDate = searchParams.get('date');
    return urlDate || today.toISOString().split('T')[0];
  });
  const [useDateFilter, setUseDateFilter] = useState(() => {
    const urlDate = searchParams.get('date');
    return urlDate ? true : false;
  });
  const [useMonthYearFilter, setUseMonthYearFilter] = useState(() => {
    const urlDate = searchParams.get('date');
    return urlDate ? false : true;
  });

  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
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
    const yearsArray = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      yearsArray.push(y);
    }
    return yearsArray;
  }, [today]);

  // Memoized function to check if order has delivery today
  const hasDeliveryToday = useCallback((order) => {
    if (!order?.rows?.length) return false;

    const todayString = today.toISOString().split('T')[0];

    return order.rows.some(row => {
      if (!row.deliveryDate) return false;
      const deliveryDateString = new Date(row.deliveryDate).toISOString().split('T')[0];
      return deliveryDateString === todayString;
    });
  }, [today]);

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

  // Fetch orders with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);

    return () => clearTimeout(timer);
  }, [year, selectedMonth, selectedDate, useDateFilter, activeFilter, executiveFilter, searchTerm]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (year) params.set('year', year.toString());
    if (selectedMonth !== null && !useDateFilter) {
      params.set('month', (selectedMonth + 1).toString());
    }
    if (selectedDate && useDateFilter) params.set('date', selectedDate);

    const currentParams = new URLSearchParams(window.location.search);
    if (params.toString() !== currentParams.toString()) {
      setSearchParams(params);
    }
  }, [year, selectedMonth, selectedDate, useDateFilter, setSearchParams]);

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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (executiveFilter) params.append('executive', executiveFilter);
      if (activeFilter) params.append('filterType', activeFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      if (useDateFilter && selectedDate) {
        params.append('date', selectedDate);
      } else if (useMonthYearFilter) {
        if (year) params.append('year', year.toString());
        if (selectedMonth !== null) params.append('month', (selectedMonth + 1).toString());
      }

      const res = await axios.get('/api/orders/payments-dashboard?' + params.toString(), {
        timeout: 10000 // 10 second timeout
      });
      
      const fetchedOrders = res.data;
      setOrders(fetchedOrders);
      
      // Apply client-side filtering
      let displayOrders = [...fetchedOrders];
      
      if (activeFilter === 'today') {
        displayOrders = displayOrders.filter(order => hasDeliveryToday(order));
      } else if (activeFilter === 'other') {
        displayOrders = displayOrders.filter(order => !hasDeliveryToday(order) && order.balance > 0);
      } else if (activeFilter === 'completed') {
        displayOrders = displayOrders.filter(order => order.balance <= 0);
      }
      
      // Apply search filter if needed
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        displayOrders = displayOrders.filter(order => 
          order.executive?.toLowerCase().includes(term) ||
          order.business?.toLowerCase().includes(term) ||
          order.contactPerson?.toLowerCase().includes(term) ||
          order.phone?.includes(term) ||
          order.orderNo?.toLowerCase().includes(term)
        );
      }
      
      setFilteredOrders(displayOrders);
      calculatePaymentSummaries(displayOrders);
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (err.code === 'ECONNABORTED') {
        alert('Request timed out. Please try again.');
      } else {
        alert('Failed to fetch orders. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentSummaries = (ordersData) => {
    let total = 0, received = 0, pending = 0, todayCollected = 0, todayCount = 0;

    const todayString = today.toISOString().split('T')[0];

    ordersData.forEach(order => {
      const orderTotal = order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0;
      const advance = order?.advance || 0;
      const balance = order?.balance || 0;

      total += orderTotal;
      received += advance;
      pending += balance;

      if (order.rows?.length > 0) {
        const hasDeliveryToday = order.rows.some(row => {
          if (!row.deliveryDate) return false;
          return new Date(row.deliveryDate).toISOString().split('T')[0] === todayString;
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

  const handleFollowUp = (order) => {
    setCurrentOrder(order);
    setFollowUpData(prev => ({
      ...prev,
      date: today.toISOString().split('T')[0],
      description: '',
      nextFollowUpDate: '',
      status: 'Pending'
    }));
    setShowFollowUpModal(true);
  };

  const handleViewFollowUps = async (order) => {
    setSelectedOrderForView(order);
    setShowViewFollowUpsModal(true);
    await fetchOrderFollowUps(order._id);
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
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

  const closeFollowUpSuccess = () => {
    setShowFollowUpSuccess(false);
    setFollowUpResult({ orderNo: '', description: '' });
  };

  const clearDateFilter = () => {
    setSelectedDate(today.toISOString().split('T')[0]);
    setUseDateFilter(false);
    setUseMonthYearFilter(true);
  };

  const clearMonthYearFilter = () => {
    setSelectedMonth(today.getMonth());
    setYear(today.getFullYear());
  };

  const handleFilterModeChange = (useDate) => {
    setUseDateFilter(useDate);
    setUseMonthYearFilter(!useDate);
  };

  const getFilterDescription = useCallback(() => {
    let description = '';

    if (executiveFilter) description += `${executiveFilter}'s `;

    if (activeFilter === 'today') description += "Today's Collections";
    else if (activeFilter === 'other') description += "Other Pending Orders";
    else if (activeFilter === 'completed') description += "Completed Payments";
    else description += "All Orders";

    if (useDateFilter && selectedDate) {
      description += ` - Date: ${new Date(selectedDate).toLocaleDateString()}`;
    } else if (useMonthYearFilter) {
      if (selectedMonth !== null) {
        description += ` - ${monthLabels[selectedMonth]} ${year}`;
      } else {
        description += ` - Year ${year}`;
      }
    }

    if (searchTerm) description += ` - Search: "${searchTerm}"`;

    return description;
  }, [executiveFilter, activeFilter, useDateFilter, selectedDate, useMonthYearFilter, selectedMonth, year, searchTerm, monthLabels]);

  const handleExportToExcel = useCallback(() => {
    const exportData = filteredOrders.map((order, orderIndex) => {
      const latestFollowUp = getLatestFollowUp(order);
      return {
        'S.No': orderIndex + 1,
        'Executive': order?.executive || '',
        'Business': order?.business || '',
        'Customer': order?.contactPerson || '',
        'Contact': `${order?.contactCode || ''} ${order?.phone || ''}`.trim(),
        'Total': order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0,
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

    const fileName = `payments_report_${getFilterDescription().replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [filteredOrders, getLatestFollowUp, getDeliveryDate, getFilterDescription]);

  const handleExportToWord = async () => {
    setExportLoading(true);
    try {
      const tableHeaders = [
        'S.No', 'Executive', 'Business', 'Customer', 'Contact', 'Total', 'Advance', 'Balance', 
        'Delivery Date', 'Latest Follow-up', 'Status', 'Next Follow-up'
      ];

      const tableRows = filteredOrders.map((order, index) => {
        const latestFollowUp = getLatestFollowUp(order);
        return [
          (index + 1).toString(),
          order?.executive || '',
          order?.business || '',
          order?.contactPerson || '',
          `${order?.contactCode || ''} ${order?.phone || ''}`.trim(),
          `₹${(order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0).toLocaleString()}`,
          `₹${(order?.advance || 0).toLocaleString()}`,
          `₹${(order?.balance || 0).toLocaleString()}`,
          getDeliveryDate(order),
          latestFollowUp ? `${new Date(latestFollowUp.date).toLocaleDateString()}: ${latestFollowUp.description}` : 'No follow-up',
          latestFollowUp?.status || 'N/A',
          latestFollowUp?.nextFollowUpDate ? new Date(latestFollowUp.nextFollowUpDate).toLocaleDateString() : 'Not set'
        ];
      });

      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: tableHeaders.map(header =>
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: header, bold: true })],
                  alignment: AlignmentType.CENTER,
                })],
                shading: { fill: "4472C4" },
              })
            ),
          }),
          ...tableRows.map(row =>
            new TableRow({
              children: row.map(cell =>
                new TableCell({
                  children: [new Paragraph({ text: cell })],
                })
              ),
            })
          ),
        ],
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Payments Report", bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Filter: ${getFilterDescription()}`, bold: true, size: 24 })],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Generated on: ${today.toLocaleDateString()}`, size: 20 })],
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Total Orders: ${filteredOrders.length} | Total Amount: ₹${totalPayments.toLocaleString()} | Received: ₹${totalReceived.toLocaleString()} | Pending: ₹${totalPending.toLocaleString()}`, bold: true, size: 22 })],
              spacing: { after: 400 },
            }),
            table,
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `payments_report_${getFilterDescription().replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Error generating Word document. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportToPDF = () => {
    setExportLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text('Payments Report', 150, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(100);

      const filterDesc = `Filter: ${getFilterDescription()}`;
      const generatedOn = `Generated on: ${today.toLocaleDateString()}`;
      const summary = `Total Orders: ${filteredOrders.length} | Total: ₹${totalPayments.toLocaleString()} | Received: ₹${totalReceived.toLocaleString()} | Pending: ₹${totalPending.toLocaleString()}`;

      doc.text(filterDesc, 14, 25);
      doc.text(generatedOn, 14, 32);
      doc.text(summary, 14, 39);

      const headers = ['S.No', 'Executive', 'Business', 'Customer', 'Balance', 'Delivery Date', 'Follow-up'];
      const columnWidths = [15, 30, 40, 35, 25, 30, 55];
      const startX = 10;
      let startY = 50;

      doc.setFillColor(68, 114, 196);
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');

      let currentX = startX;
      headers.forEach((header, index) => {
        doc.rect(currentX, startY, columnWidths[index], 6, 'F');
        doc.text(header, currentX + 2, startY + 4);
        currentX += columnWidths[index];
      });

      doc.setTextColor(0);
      doc.setFont(undefined, 'normal');
      startY += 6;

      filteredOrders.forEach((order, index) => {
        if (startY > 190) {
          doc.addPage();
          startY = 20;
          doc.setFillColor(68, 114, 196);
          doc.setTextColor(255);
          doc.setFont(undefined, 'bold');
          currentX = startX;
          headers.forEach((header, idx) => {
            doc.rect(currentX, startY, columnWidths[idx], 6, 'F');
            doc.text(header, currentX + 2, startY + 4);
            currentX += columnWidths[idx];
          });
          doc.setTextColor(0);
          doc.setFont(undefined, 'normal');
          startY += 6;
        }

        const latestFollowUp = getLatestFollowUp(order);
        const followUpText = latestFollowUp
          ? `${new Date(latestFollowUp.date).toLocaleDateString()}: ${latestFollowUp.description.substring(0, 30)}`
          : 'No follow-up';

        const rowData = [
          (index + 1).toString(),
          order?.executive?.substring(0, 12) || '',
          order?.business?.substring(0, 15) || '',
          order?.contactPerson?.substring(0, 12) || '',
          `₹${(order?.balance || 0).toLocaleString()}`,
          getDeliveryDate(order).substring(0, 10),
          followUpText
        ];

        currentX = startX;
        rowData.forEach((cell, cellIndex) => {
          doc.text(cell, currentX + 2, startY + 4);
          currentX += columnWidths[cellIndex];
        });

        doc.setDrawColor(200, 200, 200);
        doc.line(startX, startY + 6, startX + columnWidths.reduce((a, b) => a + b, 0), startY + 6);

        startY += 6;
      });

      const fileName = `payments_report_${getFilterDescription().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try exporting to Excel or Word instead.');
    } finally {
      setExportLoading(false);
    }
  };

  // Filter button styles
  const filterButtonStyle = (filterType) => ({
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    backgroundColor: activeFilter === filterType ? '#3498db' : '#ecf0f1',
    color: activeFilter === filterType ? 'white' : '#2c3e50',
  });

  // Fixed column styles
  const getFixedColumnStyle = useCallback((columnIndex) => {
    const leftPositions = [0, 60, 220, 380];
    
    const baseStyle = {
      position: 'sticky',
      backgroundColor: '#ffffff',
      zIndex: 5,
    };

    if (columnIndex <= 3) {
      baseStyle.left = leftPositions[columnIndex];
      baseStyle.borderRight = '2px solid #e0e0e0';
      if (scrollPosition > 5 && columnIndex === 3) {
        baseStyle.boxShadow = '5px 0 10px -5px rgba(0,0,0,0.1)';
      }
    }

    return baseStyle;
  }, [scrollPosition]);

  const getFixedHeaderStyle = useCallback((columnIndex) => {
    const leftPositions = [0, 60, 220, 380];
    
    const baseStyle = {
      position: 'sticky',
      backgroundColor: '#3498db',
      color: '#ffffff',
      zIndex: 10,
    };

    if (columnIndex <= 3) {
      baseStyle.left = leftPositions[columnIndex];
      baseStyle.borderRight = '2px solid #2980b9';
    }

    return baseStyle;
  }, []);

  // Business name style
  const businessNameStyle = {
    color: executiveFilter ? '#666666' : '#003366',
    cursor: executiveFilter ? 'default' : 'pointer',
    fontWeight: '500',
    textDecoration: executiveFilter ? 'none' : 'underline',
    transition: executiveFilter ? 'none' : 'all 0.2s ease',
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'inline-block',
  };

  // Styles object (keep all your existing styles)
  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '100%',
      overflowX: 'auto',
    },
    title: {
      textAlign: 'center',
      margin: '0 0 20px 0',
      color: '#2c3e50',
      fontSize: '24px',
      fontWeight: '600',
    },
    summaryContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
    },
    summaryBox: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    summaryLabel: {
      fontSize: '14px',
      color: '#7f8c8d',
      fontWeight: '600',
      marginBottom: '5px',
    },
    summaryAmount: {
      fontSize: '20px',
      fontWeight: 'bold',
    },
    summaryCount: {
      fontSize: '12px',
      color: '#3498db',
      backgroundColor: '#ebf5fb',
      padding: '4px 8px',
      borderRadius: '12px',
      display: 'inline-block',
      marginTop: '5px',
    },
    filterContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    searchContainer: {
      display: 'flex',
      justifyContent: 'center',
    },
    searchInput: {
      padding: '10px 15px',
      width: '100%',
      maxWidth: '500px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '14px',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
    },
    filterModeContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '20px',
      marginBottom: '10px',
    },
    filterModeButton: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    dateFilterContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap',
      padding: '10px',
      backgroundColor: '#f0f7ff',
      borderRadius: '4px',
    },
    dateInputWrapper: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
    },
    dateInput: {
      padding: '8px 12px 8px 36px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '14px',
      width: '200px',
    },
    calendarIcon: {
      position: 'absolute',
      left: '10px',
      fontSize: '16px',
      color: '#3498db',
      pointerEvents: 'none',
    },
    filterLabel: {
      fontWeight: '600',
      color: '#2c3e50',
      fontSize: '14px',
    },
    clearFilterButton: {
      padding: '8px 12px',
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    yearMonthContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap',
      padding: '10px',
      backgroundColor: '#f0f7ff',
      borderRadius: '4px',
    },
    selectWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    filterSelect: {
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      backgroundColor: '#fff',
      fontSize: '14px',
      cursor: 'pointer',
    },
    filterButtonsContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '15px',
      flexWrap: 'wrap',
    },
    loading: {
      textAlign: 'center',
      padding: '20px',
      color: '#7f8c8d',
      fontSize: '16px',
    },
    noData: {
      textAlign: 'center',
      padding: '20px',
      color: '#7f8c8d',
      fontSize: '16px',
    },
    tableContainer: {
      width: '100%',
      overflowX: 'auto',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      position: 'relative',
      maxHeight: '70vh',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      borderSpacing: 0,
    },
    tableHeader: {
      backgroundColor: '#3498db',
      color: '#ffffff',
    },
    th: {
      padding: '12px 8px',
      textAlign: 'left',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '10px 8px',
      borderBottom: '1px solid #ecf0f1',
      whiteSpace: 'nowrap',
    },
    evenRow: {
      backgroundColor: '#ffffff',
    },
    oddRow: {
      backgroundColor: '#f8f9fa',
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
      gap: '5px',
    },
    payButton: {
      backgroundColor: '#9b59b6',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    followUpButton: {
      backgroundColor: '#f39c12',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    viewButton: {
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    footerButtons: {
      display: 'flex',
      justifyContent: 'center',
      gap: '15px',
      marginTop: '20px',
      flexWrap: 'wrap',
    },
    excelButton: {
      backgroundColor: '#16a085',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    wordButton: {
      backgroundColor: '#2c5fa3',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    pdfButton: {
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
    },
    backButton: {
      backgroundColor: '#7f8c8d',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
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
      padding: '25px',
      borderRadius: '8px',
      width: '500px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    paymentModalTitle: {
      marginTop: 0,
      textAlign: 'center',
      color: '#2c3e50',
    },
    paymentFormGroup: {
      marginBottom: '15px',
    },
    paymentFormLabel: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '500',
    },
    paymentFormInput: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
    },
    paymentFormTextarea: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      minHeight: '60px',
    },
    paymentFormButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px',
    },
    paymentCancelButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    paymentSubmitButton: {
      padding: '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
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
      padding: '25px',
      borderRadius: '8px',
      width: '600px',
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
      padding: '25px',
      borderRadius: '8px',
      width: '700px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    followUpItem: {
      padding: '15px',
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
    },
    followUpDate: {
      fontWeight: 'bold',
      color: '#2c3e50',
    },
    followUpStatus: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      color: 'white',
    },
    followUpDescription: {
      margin: '10px 0',
      padding: '10px',
      backgroundColor: 'white',
      borderRadius: '4px',
      fontStyle: 'italic',
    },
    followUpNextDate: {
      fontSize: '12px',
      color: '#7f8c8d',
      marginTop: '5px',
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
      padding: '30px',
      borderRadius: '12px',
      width: '400px',
      maxWidth: '90%',
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    },
    icon: {
      fontSize: '60px',
      color: '#27ae60',
      marginBottom: '15px',
    },
    followUpIcon: {
      fontSize: '60px',
      color: '#f39c12',
      marginBottom: '15px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#27ae60',
      marginBottom: '20px',
    },
    followUpTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#f39c12',
      marginBottom: '20px',
    },
    message: {
      fontSize: '16px',
      color: '#2c3e50',
      marginBottom: '10px',
    },
    amount: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#e74c3c',
      margin: '10px 0',
    },
    balance: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#3498db',
      margin: '10px 0',
    },
    orderNo: {
      fontSize: '14px',
      color: '#7f8c8d',
      marginBottom: '20px',
      fontStyle: 'italic',
    },
    description: {
      fontSize: '16px',
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
      padding: '12px 30px',
      borderRadius: '6px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px',
      transition: 'all 0.3s',
    },
    followUpButton: {
      backgroundColor: '#f39c12',
      color: 'white',
      border: 'none',
      padding: '12px 30px',
      borderRadius: '6px',
      fontSize: '16px',
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
        Payments Dashboard
        {useDateFilter && selectedDate && ` - ${new Date(selectedDate).toLocaleDateString()}`}
        {!useDateFilter && selectedMonth !== null && ` - ${monthLabels[selectedMonth]} ${year}`}
        {!useDateFilter && selectedMonth === null && ` - Year ${year}`}
      </h2>

      {/* Filter Buttons */}
      <div style={styles.filterButtonsContainer}>
        <button style={filterButtonStyle('all')} onClick={() => setActiveFilter('all')}>
          All Orders
        </button>
        <button style={filterButtonStyle('today')} onClick={() => setActiveFilter('today')}>
          Today's Collections
        </button>
        <button style={filterButtonStyle('other')} onClick={() => setActiveFilter('other')}>
          Other Pending
        </button>
        <button style={{
          ...filterButtonStyle('completed'),
          backgroundColor: activeFilter === 'completed' ? '#27ae60' : '#ecf0f1',
          color: activeFilter === 'completed' ? 'white' : '#2c3e50',
        }} onClick={() => setActiveFilter('completed')}>
          Payment Completed
        </button>
      </div>

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

      {/* Filter Container */}
      <div style={styles.filterContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Filter Mode Selection */}
        <div style={styles.filterModeContainer}>
          <button
            style={{
              ...styles.filterModeButton,
              backgroundColor: useMonthYearFilter ? '#3498db' : '#ecf0f1',
              color: useMonthYearFilter ? 'white' : '#2c3e50',
            }}
            onClick={() => handleFilterModeChange(false)}
          >
            Month/Year Filter
          </button>
          <button
            style={{
              ...styles.filterModeButton,
              backgroundColor: useDateFilter ? '#3498db' : '#ecf0f1',
              color: useDateFilter ? 'white' : '#2c3e50',
            }}
            onClick={() => handleFilterModeChange(true)}
          >
            Single Date Filter
          </button>
        </div>

        {/* Single Date Filter with Calendar Icon */}
        {useDateFilter && (
          <div style={styles.dateFilterContainer}>
            <div>
              <label style={styles.filterLabel}>Select Date: </label>
              <div style={styles.dateInputWrapper}>
                <span style={styles.calendarIcon}></span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            </div>
            {selectedDate && (
              <button onClick={clearDateFilter} style={styles.clearFilterButton}>
                Reset to Month/Year
              </button>
            )}
          </div>
        )}

        {/* Month/Year Filters */}
        {useMonthYearFilter && (
          <div style={styles.yearMonthContainer}>
            <div style={styles.selectWrapper}>
              <label htmlFor="year-select" style={styles.filterLabel}>Year:</label>
              <select
                id="year-select"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={styles.filterSelect}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={styles.selectWrapper}>
              <label htmlFor="month-select" style={styles.filterLabel}>Month:</label>
              <select
                id="month-select"
                value={selectedMonth !== null ? selectedMonth + 1 : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedMonth(value ? parseInt(value) - 1 : null);
                }}
                style={styles.filterSelect}
              >
                <option value="">All Months</option>
                {monthLabels.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>

            {selectedMonth !== null && selectedMonth !== today.getMonth() && (
              <button onClick={clearMonthYearFilter} style={styles.clearFilterButton}>
                Reset to Current Month
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={styles.loading}>Loading payments data...</div>
      ) : (
        <div 
          ref={tableContainerRef}
          className="table-scroll-container" 
          style={styles.tableContainer}
        >
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={{...styles.th, ...getFixedHeaderStyle(0), width: '50px'}}>S.No</th>
                <th style={{...styles.th, ...getFixedHeaderStyle(1), width: '100px'}}>Executive</th>
                <th style={{...styles.th, ...getFixedHeaderStyle(2), width: '150px'}}>Business</th>
                <th style={{...styles.th, ...getFixedHeaderStyle(3), width: '150px'}}>Customer</th>
                <th style={{...styles.th, width: '120px'}}>Contact</th>
                <th style={{...styles.th, width: '100px'}}>Total</th>
                <th style={{...styles.th, width: '100px'}}>Advance</th>
                <th style={{...styles.th, width: '100px'}}>Balance</th>
                <th style={{...styles.th, width: '120px'}}>Delivery Date</th>
                <th style={{...styles.th, width: '200px'}}>Follow-up</th>
                <th style={{...styles.th, width: '150px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="11" style={styles.noData}>
                    No orders found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const latestFollowUp = getLatestFollowUp(order);
                  const followUpCount = order.followUps?.length || 0;

                  return (
                    <tr key={order?._id || index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                      <td style={{...styles.td, ...getFixedColumnStyle(0)}}>{index + 1}</td>
                      <td style={{...styles.td, ...getFixedColumnStyle(1)}}>{order?.executive || ''}</td>
                      <td style={{...styles.td, ...getFixedColumnStyle(2)}}>
                        <span
                          style={businessNameStyle}
                          onClick={() => handleBusinessClick(order?.business)}
                          onMouseEnter={(e) => {
                            if (!executiveFilter) {
                              e.target.style.color = '#0056b3';
                              e.target.style.backgroundColor = '#e3f2fd';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!executiveFilter) {
                              e.target.style.color = '#003366';
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {order?.business || ''}
                        </span>
                      </td>
                      <td style={{...styles.td, ...getFixedColumnStyle(3)}}>{order?.contactPerson || ''}</td>
                      <td style={styles.td}>{order?.contactCode || ''} {order?.phone || ''}</td>
                      <td style={styles.td}>₹{(order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0)?.toLocaleString() || '0')}</td>
                      <td style={styles.td}>₹{(order?.advance || 0).toLocaleString()}</td>
                      <td style={{...styles.td, ...(order.balance > 0 ? styles.balanceCell : styles.completedCell)}}>
                        ₹{(order?.balance || 0).toLocaleString()}
                      </td>
                      <td style={{...styles.td, ...styles.deliveryDateCell}}>
                        {getDeliveryDate(order)}
                      </td>
                      <td
                        style={{...styles.td, ...styles.followUpCell}}
                        onClick={() => followUpCount > 0 && handleViewFollowUps(order)}
                        title={latestFollowUp ? `Latest: ${latestFollowUp.description}\nClick to view all ${followUpCount} follow-ups` : 'No follow-ups'}
                      >
                        {latestFollowUp ? (
                          <span style={{ color: getFollowUpStatusColor(latestFollowUp.status) }}>
                            {formatFollowUp(order)}
                            {followUpCount > 1 && ` (+${followUpCount - 1})`}
                          </span>
                        ) : 'No follow-up'}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          {order.balance > 0 && (
                            <button
                              onClick={() => handleRecordPayment(order)}
                              style={styles.payButton}
                              title="Record Payment"
                            >
                              Pay
                            </button>
                          )}
                          <button
                            onClick={() => handleFollowUp(order)}
                            style={styles.followUpButton}
                            title="Add Follow-up"
                          >
                            Follow-up
                          </button>
                          {followUpCount > 0 && (
                            <button
                              onClick={() => handleViewFollowUps(order)}
                              style={styles.viewButton}
                              title="View Follow-ups"
                            >
                              View
                            </button>
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
      )}

      <div style={styles.footerButtons}>
        <button
          onClick={handleExportToExcel}
          style={styles.excelButton}
          disabled={exportLoading || filteredOrders.length === 0}
        >
          {exportLoading ? 'Exporting...' : 'Export to Excel'}
        </button>
        <button
          onClick={handleExportToWord}
          style={styles.wordButton}
          disabled={exportLoading || filteredOrders.length === 0}
        >
          {exportLoading ? 'Exporting...' : 'Export to Word'}
        </button>
        <button
          onClick={handleExportToPDF}
          style={styles.pdfButton}
          disabled={exportLoading || filteredOrders.length === 0}
        >
          {exportLoading ? 'Exporting...' : 'Export to PDF'}
        </button>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          Back
        </button>
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
                  placeholder={`Enter amount (max: ₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'}`}
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
                <small style={{ color: '#7f8c8d' }}>Leave blank if no next follow-up scheduled</small>
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
                      <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '5px' }}>
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
              onMouseOver={(e) => e.target.style.backgroundColor = '#219a52'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
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
              onMouseOver={(e) => e.target.style.backgroundColor = '#e67e22'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f39c12'}
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