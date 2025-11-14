import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun } from 'docx';
import jsPDF from 'jspdf';

function PendingPayment({ executiveFilter = null }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'Cash',
    reference: '',
    note: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [paymentResult, setPaymentResult] = useState({
    submittedAmount: 0,
    remainingBalance: 0,
    orderNo: ''
  });

  // Filter states
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'today', 'other'
  const [exportLoading, setExportLoading] = useState(false);
  
  // NEW STATE: Reminder notification
  const [showReminder, setShowReminder] = useState(false);
  
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Generate year options
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }

  useEffect(() => {
    // Check for filter parameters from navigation
    if (location.state?.filterType) {
      if (location.state.filterType === 'today-delivery') {
        setActiveFilter('today');
      } else if (location.state.filterType === 'exclude-today') {
        setActiveFilter('other');
      }
    }
    fetchOrders();
  }, [location, executiveFilter]);

  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, year, selectedMonth, searchTerm, activeFilter]);

  // NEW EFFECT: Show reminder when component mounts and when filtered orders change
  useEffect(() => {
    if (filteredOrders.length > 0 && totalPendingAmount > 0) {
      showReminderNotification();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/orders', {
        params: {
          _: new Date().getTime() // Cache buster
        }
      });
      
      // Filter orders by executive if executiveFilter is provided
      let filteredData = res.data;
      if (executiveFilter) {
        filteredData = filteredData.filter(order => 
          order?.executive?.toLowerCase() === executiveFilter.toLowerCase()
        );
      }
      
      // Sort orders by orderDate descending (newest first) and then by createdAt descending
      const sortedOrders = filteredData
        .filter(order => order && order.balance > 0)
        .sort((a, b) => {
          // First sort by orderDate (newest first)
          const dateA = new Date(a.orderDate || a.createdAt || 0);
          const dateB = new Date(b.orderDate || b.createdAt || 0);
          if (dateB - dateA !== 0) {
            return dateB - dateA;
          }
          // If orderDate is same, sort by createdAt (newest first)
          const createdA = new Date(a.createdAt || 0);
          const createdB = new Date(b.createdAt || 0);
          return createdB - createdA;
        });
      setOrders(sortedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!orders.length) return;

    let result = [...orders];

    // Apply active filter (today/other)
    if (activeFilter === 'today') {
      result = result.filter(order => hasTodayDelivery(order));
    } else if (activeFilter === 'other') {
      result = result.filter(order => !hasTodayDelivery(order));
    }
    // If activeFilter is 'all', show all pending payments

    // Filter by year and month if they have orderDate
    result = result.filter(order => {
      if (!order.orderDate) return true;
      
      const orderDate = new Date(order.orderDate);
      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth();
      
      // Check year filter
      if (orderYear !== year) {
        return false;
      }
      
      // Check month filter if selected
      if (selectedMonth !== null && orderMonth !== selectedMonth) {
        return false;
      }
      
      return true;
    });

    // Apply search term filter if exists
    if (searchTerm) {
      result = result.filter(order => {
        const valuesToSearch = [
          order.executive,
          order.business,
          order.contactPerson,
          `${order.contactCode || ''} ${order.phone || ''}`,
          order.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0,
          order.advance,
          order.balance,
        ];

        return valuesToSearch.some(val =>
          String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Maintain the sorted order (newest first)
    setFilteredOrders(result);
  };

  // NEW FUNCTION: Show reminder notification
  const showReminderNotification = () => {
    setShowReminder(true);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowReminder(false);
    }, 5000);
  };

  // Function to check if order has delivery date today
  const hasTodayDelivery = (order) => {
    if (!order.rows || !order.rows.length) return false;
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Check if any row has delivery date today
    return order.rows.some(row => {
      if (!row.deliveryDate) return false;
      const deliveryDate = new Date(row.deliveryDate);
      const deliveryDateString = deliveryDate.toISOString().split('T')[0];
      return deliveryDateString === todayString;
    });
  };

  // Function to get delivery date from order rows
  const getDeliveryDate = (order) => {
    if (!order.rows || !order.rows.length) return 'N/A';
    
    // Find the earliest delivery date from all rows
    const deliveryDates = order.rows
      .filter(row => row.deliveryDate)
      .map(row => new Date(row.deliveryDate))
      .sort((a, b) => a - b);
    
    if (deliveryDates.length === 0) return 'Not Set';
    
    return deliveryDates[0].toLocaleDateString();
  };

  // UPDATED FUNCTION: Handle business name click - only for admin, not for executives
  const handleBusinessClick = (businessName) => {
    if (!businessName) return;
    
    // If executiveFilter exists (meaning we're in executive view), don't navigate
    if (executiveFilter) {
      return; // Disable for executives
    }
    
    // Navigate to ViewOrders with business filter (admin only)
    navigate('/admin-dashboard/view-orders', {
      state: {
        businessFilter: businessName
      }
    });
  };

  const handleRecordPayment = (order) => {
    setCurrentOrder(order);
    setPaymentData({
      date: new Date().toISOString().split('T')[0],
      amount: order.balance > 0 ? order.balance.toString() : '',
      method: 'Cash',
      reference: '',
      note: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrder) return;

    setPaymentLoading(true);
    try {
      const paymentAmount = parseFloat(paymentData.amount);
      
      if (!paymentAmount || isNaN(paymentAmount)) {
        alert('Please enter a valid payment amount');
        return;
      }

      if (paymentAmount <= 0) {
        alert('Payment amount must be greater than 0');
        return;
      }

      if (paymentAmount > parseFloat(currentOrder.balance)) {
        alert(`Payment amount (₹${paymentAmount}) cannot exceed current balance (₹${currentOrder.balance})`);
        return;
      }

      const paymentPayload = {
        date: paymentData.date,
        amount: paymentAmount,
        method: paymentData.method,
        reference: paymentData.reference,
        note: paymentData.note
      };

      const response = await axios.post(`/api/orders/${currentOrder._id}/record-payment`, paymentPayload);
      
      // Calculate remaining balance
      const remainingBalance = parseFloat((currentOrder.balance - paymentAmount).toFixed(2));
      
      // Show success popup with payment details
      setPaymentResult({
        submittedAmount: paymentAmount,
        remainingBalance: remainingBalance,
        orderNo: currentOrder.orderNo
      });
      setShowSuccessPopup(true);
      
      // Close payment modal
      setShowPaymentModal(false);
      
      // Refresh the orders list
      await fetchOrders();
      
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    setPaymentResult({
      submittedAmount: 0,
      remainingBalance: 0,
      orderNo: ''
    });
  };

  // Get current filter description for export files
  const getFilterDescription = () => {
    let description = '';
    
    if (executiveFilter) {
      description += `${executiveFilter}'s `;
    }
    
    if (activeFilter === 'today') {
      description += "Today's Delivery Orders";
    } else if (activeFilter === 'other') {
      description += "Other Pending Orders";
    } else {
      description += "All Pending Orders";
    }
    
    if (selectedMonth !== null) {
      description += ` - ${monthLabels[selectedMonth]} ${year}`;
    } else if (year !== new Date().getFullYear()) {
      description += ` - Year ${year}`;
    }
    
    if (searchTerm) {
      description += ` - Search: "${searchTerm}"`;
    }
    
    return description;
  };

  const handleExportToExcel = () => {
    const exportData = filteredOrders.map((order, orderIndex) => ({
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
      'Created Date': order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
    }));
  
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PendingPayments');
    
    const fileName = `pending_payments_${getFilterDescription().replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportToWord = async () => {
    setExportLoading(true);
    try {
      // Table headers
      const tableHeaders = [
        'S.No',
        'Executive',
        'Business',
        'Customer',
        'Contact',
        'Total',
        'Advance',
        'Balance',
        'Delivery Date',
        'Order Date'
      ];

      // Table rows
      const tableRows = filteredOrders.map((order, index) => [
        (index + 1).toString(),
        order?.executive || '',
        order?.business || '',
        order?.contactPerson || '',
        `${order?.contactCode || ''} ${order?.phone || ''}`.trim(),
        `₹${(order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0).toLocaleString()}`,
        `₹${(order?.advance || 0).toLocaleString()}`,
        `₹${(order?.balance || 0).toLocaleString()}`,
        getDeliveryDate(order),
        order?.orderDate ? new Date(order.orderDate).toLocaleDateString() : ''
      ]);

      // Create table
      const table = new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          // Header row
          new TableRow({
            children: tableHeaders.map(header => 
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: header, bold: true })],
                  alignment: AlignmentType.CENTER,
                })],
                shading: {
                  fill: "4472C4",
                },
              })
            ),
          }),
          // Data rows
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

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Pending Payments Report", bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Filter: ${getFilterDescription()}`, bold: true, size: 24 })],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Generated on: ${new Date().toLocaleDateString()}`, size: 20 })],
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Total Orders: ${filteredOrders.length} | Total Pending Amount: ₹${totalPendingAmount.toLocaleString()}`, bold: true, size: 22 })],
              spacing: { after: 400 },
            }),
            table,
          ],
        }],
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const fileName = `pending_payments_${getFilterDescription().replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
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
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text('Pending Payments Report', 105, 15, { align: 'center' });
      
      // Filter info
      doc.setFontSize(10);
      doc.setTextColor(100);
      
      const filterDesc = `Filter: ${getFilterDescription()}`;
      const generatedOn = `Generated on: ${new Date().toLocaleDateString()}`;
      const summary = `Total Orders: ${filteredOrders.length} | Total Pending Amount: ₹${totalPendingAmount.toLocaleString()}`;
      
      doc.text(filterDesc, 14, 25);
      doc.text(generatedOn, 14, 32);
      doc.text(summary, 14, 39);
      
      // Create table manually
      const headers = ['S.No', 'Executive', 'Business', 'Customer', 'Contact', 'Total', 'Advance', 'Balance', 'Delivery Date'];
      const columnWidths = [15, 25, 30, 25, 30, 25, 25, 25, 25];
      const startX = 10;
      let startY = 50;
      
      // Table header
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
      
      // Table rows
      doc.setTextColor(0);
      doc.setFont(undefined, 'normal');
      startY += 6;
      
      filteredOrders.forEach((order, index) => {
        if (startY > 270) { // Add new page if running out of space
          doc.addPage();
          startY = 20;
        }
        
        const rowData = [
          (index + 1).toString(),
          order?.executive?.substring(0, 12) || '',
          order?.business?.substring(0, 15) || '',
          order?.contactPerson?.substring(0, 12) || '',
          `${order?.contactCode || ''} ${order?.phone || ''}`.trim().substring(0, 15),
          `₹${(order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0).toLocaleString()}`,
          `₹${(order?.advance || 0).toLocaleString()}`,
          `₹${(order?.balance || 0).toLocaleString()}`,
          getDeliveryDate(order).substring(0, 10)
        ];
        
        currentX = startX;
        rowData.forEach((cell, cellIndex) => {
          doc.text(cell, currentX + 2, startY + 4);
          currentX += columnWidths[cellIndex];
        });
        
        // Add horizontal line
        doc.setDrawColor(200, 200, 200);
        doc.line(startX, startY + 6, startX + columnWidths.reduce((a, b) => a + b, 0), startY + 6);
        
        startY += 6;
      });
      
      const fileName = `pending_payments_${getFilterDescription().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Ultra simple fallback
      try {
        const doc = new jsPDF();
        doc.text('Pending Payments Report', 20, 20);
        doc.text(`Filter: ${getFilterDescription()}`, 20, 30);
        doc.text(`Total Orders: ${filteredOrders.length}`, 20, 40);
        doc.text(`Total Pending Amount: ₹${totalPendingAmount.toLocaleString()}`, 20, 50);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 60);
        
        let yPos = 80;
        filteredOrders.forEach((order, index) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${index + 1}. ${order?.business || 'N/A'} - ₹${order?.balance || 0}`, 20, yPos);
          yPos += 10;
        });
        
        const fileName = `pending_payments_${getFilterDescription().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        doc.save(fileName);
      } catch (fallbackError) {
        console.error('Fallback PDF generation failed:', fallbackError);
        alert('Error generating PDF. Please try exporting to Excel or Word instead.');
      }
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate total pending amount with null checks
  const totalPendingAmount = filteredOrders.reduce((sum, order) => sum + (order?.balance || 0), 0);

  // NEW STYLES: Reminder notification styles
  const reminderStyles = {
    modal: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 3000,
      maxWidth: '350px',
      animation: 'slideInRight 0.3s ease-out',
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    amount: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '8px',
    },
    details: {
      fontSize: '14px',
      opacity: 0.9,
      marginBottom: '5px',
    },
    closeButton: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'none',
      border: 'none',
      color: 'white',
      fontSize: '18px',
      cursor: 'pointer',
      fontWeight: 'bold',
    },
    icon: {
      fontSize: '20px',
    }
  };

  // Add CSS animation
  const animationStyle = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;

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

  // UPDATED STYLE: Business name clickable style - different for admin vs executives
  const businessNameStyle = {
    color: executiveFilter ? '#666666' : '#003366', // Gray for executives, blue for admin
    cursor: executiveFilter ? 'default' : 'pointer', // Default cursor for executives
    fontWeight: '500',
    textDecoration: executiveFilter ? 'none' : 'underline', // No underline for executives
    transition: executiveFilter ? 'none' : 'all 0.2s ease', // No transition for executives
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'inline-block',
  };

  // Updated styles with export buttons
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
    summaryBox: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: '12px',
      margin: '0 auto 20px auto',
      maxWidth: '400px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    summaryContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: '14px',
      color: '#7f8c8d',
      fontWeight: '600',
    },
    summaryAmount: {
      fontSize: '18px',
      color: '#e74c3c',
      fontWeight: 'bold',
    },
    summaryCount: {
      fontSize: '14px',
      color: '#3498db',
      backgroundColor: '#ebf5fb',
      padding: '4px 8px',
      borderRadius: '12px',
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
    yearMonthContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap',
    },
    selectWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    filterLabel: {
      fontWeight: '600',
      color: '#2c3e50',
      fontSize: '14px',
    },
    filterSelect: {
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      backgroundColor: '#fff',
      fontSize: '14px',
      cursor: 'pointer',
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
    filterButtonsContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '15px',
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
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: '#ffffff',
      fontSize: '14px',
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
    deliveryDateCell: {
      color: '#27ae60',
      fontWeight: '500',
    },
    payButton: {
      backgroundColor: '#9b59b6',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
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
    // Payment modal styles
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
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#27ae60',
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
  };

  return (
    <div style={styles.container}>
      {/* Add CSS animation */}
      <style>{animationStyle}</style>
      
      <h2 style={styles.title}>
        {executiveFilter ? `${executiveFilter}'s Pending Payments` : 'Pending Payments'}
      </h2>

      {/* NEW: Reminder Notification */}
      {showReminder && filteredOrders.length > 0 && (
        <div style={reminderStyles.modal}>
          <button 
            style={reminderStyles.closeButton}
            onClick={() => setShowReminder(false)}
          >
            ×
          </button>
          <div style={reminderStyles.title}>
            <span style={reminderStyles.icon}>💰</span>
            Pending Payments Reminder
          </div>
          <div style={reminderStyles.amount}>
            ₹{totalPendingAmount.toLocaleString()}
          </div>
          <div style={reminderStyles.details}>
            Total Orders: {filteredOrders.length}
          </div>
          <div style={reminderStyles.details}>
            Filter: {activeFilter === 'today' ? "Today's Delivery" : 
                    activeFilter === 'other' ? "Other Pending" : "All Pending"}
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div style={styles.filterButtonsContainer}>
        <button 
          style={filterButtonStyle('all')}
          onClick={() => setActiveFilter('all')}
        >
          All Pending Payments
        </button>
        <button 
          style={filterButtonStyle('today')}
          onClick={() => setActiveFilter('today')}
        >
          Today's Delivery
        </button>
        <button 
          style={filterButtonStyle('other')}
          onClick={() => setActiveFilter('other')}
        >
          Other Pending
        </button>
      </div>

      {/* Compact Summary Box */}
      <div style={styles.summaryBox}>
        <div style={styles.summaryContent}>
          <span style={styles.summaryLabel}>
            {activeFilter === 'today' ? "Today's Delivery Pending" : 
             activeFilter === 'other' ? "Other Pending Payments" : "Total Pending"}:
          </span>
          <span style={styles.summaryAmount}>₹{totalPendingAmount.toLocaleString()}</span>
          <span style={styles.summaryCount}>{filteredOrders.length} orders</span>
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
        
        <div style={styles.yearMonthContainer}>
          <div style={styles.selectWrapper}>
            <label htmlFor="year-select" style={styles.filterLabel}>
              Year:
            </label>
            <select
              id="year-select"
              value={year}
              onChange={(e) => {
                setYear(parseInt(e.target.value));
                setSelectedMonth(null);
              }}
              style={styles.filterSelect}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.selectWrapper}>
            <label htmlFor="month-select" style={styles.filterLabel}>
              Month:
            </label>
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
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          
          {selectedMonth !== null && (
            <button 
              onClick={() => setSelectedMonth(null)}
              style={styles.clearFilterButton}
            >
              Clear Month Filter
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading pending payments...</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                {['S.I', 'Executive', 'Business', 'Customer', 'Contact', 'Total', 'Advance', 'Balance', 'Delivery Date', 'Action'].map((header) => (
                  <th key={header} style={styles.th}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" style={styles.noData}>
                    No pending payments found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => (
                  <tr key={order?._id || index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>{order?.executive || ''}</td>
                    {/* UPDATED: Make business name clickable only for admin */}
                    <td style={styles.td}>
                      <span
                        style={businessNameStyle}
                        onClick={() => handleBusinessClick(order?.business)}
                        onMouseEnter={(e) => {
                          if (!executiveFilter) { // Only for admin
                            e.target.style.color = '#0056b3';
                            e.target.style.backgroundColor = '#e3f2fd';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!executiveFilter) { // Only for admin
                            e.target.style.color = '#003366';
                            e.target.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {order?.business || ''}
                      </span>
                    </td>
                    <td style={styles.td}>{order?.contactPerson || ''}</td>
                    <td style={styles.td}>{order?.contactCode || ''} {order?.phone || ''}</td>
                    <td style={styles.td}>₹{(order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0)?.toLocaleString() || '0')}</td>
                    <td style={styles.td}>₹{(order?.advance || 0).toLocaleString()}</td>
                    <td style={{...styles.td, ...styles.balanceCell}}>₹{(order?.balance || 0).toLocaleString()}</td>
                    <td style={{...styles.td, ...styles.deliveryDateCell}}>
                      {getDeliveryDate(order)}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleRecordPayment(order)}
                        style={styles.payButton}
                        disabled={order?.balance <= 0}
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
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
                style={{
                  ...styles.paymentFormInput,
                  backgroundColor: '#f5f5f5',
                  fontWeight: 'bold',
                  color: currentOrder.balance > 0 ? '#e74c3c' : '#2ecc71',
                }}
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
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={styles.paymentCancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  style={{
                    ...styles.paymentSubmitButton,
                    opacity: paymentLoading ? 0.7 : 1
                  }}
                >
                  {paymentLoading ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Popup */}
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
    </div>
  );
}

export default PendingPayment;