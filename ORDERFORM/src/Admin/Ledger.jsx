import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Ledger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [clientTimeline, setClientTimeline] = useState({});
  const [newPayments, setNewPayments] = useState({});
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePaymentRow, setActivePaymentRow] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Get the business from URL for back navigation
  const urlParams = new URLSearchParams(location.search);
  const businessFromUrl = urlParams.get('business');

  // Handle back to view orders
  const handleBackToViewOrders = () => {
    if (businessFromUrl) {
      navigate('/admin-dashboard/view-orders', {
        state: { businessFilter: decodeURIComponent(businessFromUrl) }
      });
    } else {
      navigate('/admin-dashboard/view-orders');
    }
  };

  // Fetch all orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();
        setAllOrders(data);

        const urlParams = new URLSearchParams(location.search);
        const businessFromUrl = urlParams.get('business');

        if (businessFromUrl) {
          const decodedBusiness = decodeURIComponent(businessFromUrl);
          setSearchTerm(decodedBusiness);
          performSearch(data, decodedBusiness);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        alert('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [location.search]);

  // Calculate total amount for an order
  const calculateTotal = (order) => {
    return order.rows?.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0) || 0;
  };

  // Calculate total advance for an order
  const calculateTotalAdvance = (order) => {
    return parseFloat(order.advance) || 0;
  };

  // Calculate total paid (advance + payment history)
  const calculateTotalPaid = (order) => {
    const advance = parseFloat(order.advance) || 0;
    const paymentHistoryTotal = order.paymentHistory?.reduce((sum, payment) => 
      sum + (parseFloat(payment.amount) || 0), 0) || 0;
    return advance + paymentHistoryTotal;
  };

  // Calculate current balance for an order
  const calculateCurrentBalance = (order) => {
    const total = calculateTotal(order);
    const paid = calculateTotalPaid(order);
    return total - paid;
  };

  // Validate and parse date safely
  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Format date safely for display
  const formatDateSafe = (dateString) => {
    const date = safeParseDate(dateString);
    return date ? date.toLocaleDateString() : 'Invalid Date';
  };

  // Format date for filename
  const formatDateForFilename = () => {
    const date = new Date();
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  // Calculate client summary totals
  const calculateClientSummary = (orders) => {
    let totalOrderAmount = 0;
    let totalAdvance = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    orders.forEach(order => {
      const orderTotal = calculateTotal(order);
      const orderAdvance = calculateTotalAdvance(order);
      const orderPaid = calculateTotalPaid(order);
      
      totalOrderAmount += orderTotal;
      totalAdvance += orderAdvance;
      totalPaid += orderPaid;
      totalBalance += (orderTotal - orderPaid);
    });

    return {
      totalOrderAmount,
      totalAdvance,
      totalPaid,
      totalBalance
    };
  };

  // Organize client data into timeline
  const organizeClientTimeline = (orders) => {
    const timeline = {};

    orders.forEach(order => {
      const business = order.business || 'Unknown Business';

      if (!timeline[business]) {
        timeline[business] = {
          clientInfo: {
            business: business,
            contactPerson: order.contactPerson,
            phone: order.phone,
            contactCode: order.contactCode,
            clientType: order.clientType,
            address: order.address || 'Hyd',
            gstin: order.gstin || 'N/A'
          },
          timeline: [],
          orders: []
        };
      }

      timeline[business].orders.push(order);

      const orderTotal = calculateTotal(order);
      const orderAdvance = calculateTotalAdvance(order);
      const orderPaid = calculateTotalPaid(order);
      const currentBalance = orderTotal - orderPaid;

      timeline[business].timeline.push({
        type: 'order',
        date: order.orderDate,
        orderNo: order.orderNo,
        requirements: order.rows || [],
        totalAmount: orderTotal,
        advance: orderAdvance,
        paid: orderPaid,
        balance: currentBalance,
        orderId: order._id,
        deliveryDate: order.deliveryDate,
        status: order.status
      });

      if (order.advance > 0) {
        timeline[business].timeline.push({
          type: 'advance_payment',
          date: order.advanceDate || order.orderDate,
          orderNo: order.orderNo,
          amount: order.advance,
          method: 'Advance',
          orderId: order._id
        });
      }

      if (order.paymentHistory && order.paymentHistory.length > 0) {
        order.paymentHistory.forEach(payment => {
          timeline[business].timeline.push({
            type: 'payment',
            date: payment.date,
            orderNo: order.orderNo,
            amount: payment.amount,
            method: payment.method,
            upiNumber: payment.upiNumber,
            chequeNumber: payment.chequeNumber,
            orderId: order._id
          });
        });
      }
    });

    Object.keys(timeline).forEach(business => {
      timeline[business].timeline.sort((a, b) => {
        const dateA = safeParseDate(a.date) || new Date(0);
        const dateB = safeParseDate(b.date) || new Date(0);
        return dateB - dateA;
      });
    });

    return timeline;
  };

  // Perform search
  const performSearch = (orders, term) => {
    const searchTerm = term.trim().toLowerCase();

    if (searchTerm.length < 1) {
      setFilteredOrders([]);
      setClientTimeline({});
      return;
    }

    const filtered = orders.filter(order => {
      const businessMatch = order.business?.toLowerCase().includes(searchTerm);
      const orderNoMatch = order.orderNo?.toLowerCase().includes(searchTerm);
      const clientTypeMatch = order.clientType?.toLowerCase().includes(searchTerm);
      const contactPersonMatch = order.contactPerson?.toLowerCase().includes(searchTerm);
      const phoneMatch = order.phone?.toLowerCase().includes(searchTerm);

      return businessMatch || orderNoMatch || clientTypeMatch || contactPersonMatch || phoneMatch;
    });

    setFilteredOrders(filtered);
    setClientTimeline(organizeClientTimeline(filtered));
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();

    if (searchTerm.trim().length < 1) {
      setFilteredOrders([]);
      setClientTimeline({});
      navigate('/admin-dashboard/ledger');
      return;
    }

    performSearch(allOrders, searchTerm);
    navigate(`/admin-dashboard/ledger?business=${encodeURIComponent(searchTerm)}`);
  };

  // Handle real-time search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim().length > 0) {
      performSearch(allOrders, value);
    } else {
      setFilteredOrders([]);
      setClientTimeline({});
    }
  };

  // Handle payment input changes
  const handlePaymentChange = (orderId, field, value) => {
    setNewPayments(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: value,
        date: field === 'date' ? value : (prev[orderId]?.date || new Date().toISOString().split('T')[0])
      }
    }));
  };

  // Toggle payment form
  const togglePaymentRow = (orderId) => {
    if (activePaymentRow === orderId) {
      setActivePaymentRow(null);
      setNewPayments(prev => ({ ...prev, [orderId]: {} }));
    } else {
      setActivePaymentRow(orderId);
      const order = allOrders.find(o => o._id === orderId);
      if (order) {
        const currentBalance = calculateCurrentBalance(order);
        setNewPayments(prev => ({
          ...prev,
          [orderId]: {
            amount: currentBalance,
            method: '',
            date: new Date().toISOString().split('T')[0]
          }
        }));
      }
    }
  };

  // Apply payment
  const applyPayment = async (orderId) => {
    const payment = newPayments[orderId];
    if (!payment?.amount || !payment.method) {
      alert("Please enter amount and select payment method");
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/add-payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payment.amount),
          method: payment.method,
          upiNumber: payment.upiNumber || undefined,
          chequeNumber: payment.chequeNumber || undefined,
          date: payment.date || new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error('Failed to update payment');

      const updatedOrder = await res.json();

      setPaymentSuccess({
        orderId,
        message: `Payment of ₹${payment.amount} added successfully!`,
        balance: updatedOrder.balance
      });

      setTimeout(() => setPaymentSuccess(null), 5000);

      const updateOrders = orders =>
        orders.map(order => (order._id === orderId ? updatedOrder : order));

      const updatedAllOrders = updateOrders(allOrders);
      const updatedFilteredOrders = updateOrders(filteredOrders);

      setFilteredOrders(updatedFilteredOrders);
      setAllOrders(updatedAllOrders);
      setClientTimeline(organizeClientTimeline(updatedFilteredOrders));

      setNewPayments(prev => ({ ...prev, [orderId]: {} }));
      setActivePaymentRow(null);

    } catch (err) {
      console.error('Payment update failed:', err);
      alert('Failed to update payment. Please try again later.');
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredOrders([]);
    setClientTimeline({});
    navigate('/admin-dashboard/ledger');
  };

  // Get date range
  const getDateRange = (timeline) => {
    if (timeline.length === 0) return { start: 'N/A', end: 'N/A' };

    const validDates = timeline
      .map(entry => safeParseDate(entry.date))
      .filter(date => date !== null);

    if (validDates.length === 0) return { start: 'N/A', end: 'N/A' };

    const startDate = new Date(Math.min(...validDates));
    const endDate = new Date(Math.max(...validDates));

    return {
      start: startDate.toLocaleDateString(),
      end: endDate.toLocaleDateString()
    };
  };

  // Format currency for PDF
  const formatCurrency = (amount) => {
    return '₹ ' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+(?!\d))/g, '$&,');
  };

  // PRINT FUNCTION
  const handlePrintClient = (business, clientData) => {
    const summary = calculateClientSummary(clientData.orders);
    const dateRange = getDateRange(clientData.timeline);

    const printWindow = window.open('', '_blank');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${business} - Ledger</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.5;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #003366; 
            padding-bottom: 20px; 
          }
          .header h1 { 
            color: #003366; 
            margin: 0; 
            font-size: 28px;
          }
          .header p { 
            color: #666; 
            margin: 5px 0 0; 
          }
          .client-info { 
            background: #f5f5f5; 
            padding: 20px; 
            border-radius: 5px; 
            margin-bottom: 25px; 
          }
          .client-info h2 { 
            color: #003366; 
            margin: 0 0 15px 0; 
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 15px; 
          }
          .info-item { 
            margin: 5px 0; 
          }
          .info-item strong { 
            color: #003366; 
            display: block;
            margin-bottom: 3px;
          }
          .summary { 
            background: #e3f2fd; 
            padding: 20px; 
            border-radius: 5px; 
            margin-bottom: 25px; 
            border: 1px solid #003366;
          }
          .summary h3 { 
            color: #003366; 
            margin: 0 0 15px 0; 
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px; 
            border-bottom: 1px solid #ccc; 
          }
          .summary-row:last-child { 
            border-bottom: none; 
          }
          .total { 
            font-weight: bold; 
            font-size: 18px; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            font-size: 14px;
          }
          th { 
            background: #003366; 
            color: white; 
            padding: 12px; 
            text-align: left; 
          }
          td { 
            padding: 10px; 
            border-bottom: 1px solid #ddd; 
            vertical-align: top;
          }
          .order-row { 
            background: #f8f9fa; 
          }
          .payment-row { 
            background: #f0fff0; 
          }
          .advance-row { 
            background: #fff3cd; 
          }
          .amount-positive { 
            color: #27ae60; 
            font-weight: bold; 
          }
          .amount-negative { 
            color: #e74c3c; 
            font-weight: bold; 
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 2px solid #ccc; 
            color: #666; 
            font-size: 12px; 
          }
          .requirements-list {
            list-style: none;
            margin: 0;
            padding: 0;
          }
          .requirements-list li {
            padding: 3px 0;
            border-bottom: 1px dashed #eee;
          }
          .text-right {
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMPLETE SALES LEDGER</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="client-info">
          <h2>${business}</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>Contact Person:</strong>
              ${clientData.clientInfo.contactPerson || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Phone:</strong>
              ${clientData.clientInfo.contactCode || '+91'} ${clientData.clientInfo.phone || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Client Type:</strong>
              ${clientData.clientInfo.clientType || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Address:</strong>
              ${clientData.clientInfo.address || 'Hyd'}
            </div>
            <div class="info-item">
              <strong>GSTIN:</strong>
              ${clientData.clientInfo.gstin || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Total Orders:</strong>
              ${clientData.orders.length}
            </div>
          </div>
        </div>

        <div class="summary">
          <h3>FINANCIAL SUMMARY</h3>
          <div class="summary-row">
            <span>Total Order Amount:</span>
            <span>${formatCurrency(summary.totalOrderAmount)}</span>
          </div>
          <div class="summary-row">
            <span>Total Advance:</span>
            <span style="color: #f39c12;">${formatCurrency(summary.totalAdvance)}</span>
          </div>
          <div class="summary-row">
            <span>Total Paid:</span>
            <span style="color: #27ae60;">${formatCurrency(summary.totalPaid)}</span>
          </div>
          <div class="summary-row total">
            <span>Outstanding Balance:</span>
            <span style="color: ${summary.totalBalance > 0 ? '#e74c3c' : '#27ae60'};">
              ${formatCurrency(summary.totalBalance)}
            </span>
          </div>
          <div class="summary-row">
            <span>Transaction Period:</span>
            <span>${dateRange.start} - ${dateRange.end}</span>
          </div>
        </div>

        <h3 style="color: #003366; margin-bottom: 15px;">TRANSACTION HISTORY</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Order No</th>
              <th>Description</th>
              <th class="text-right">Amount (₹)</th>
              <th>Method</th>
              <th class="text-right">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
    `;

    let tableRows = '';
    clientData.timeline.forEach((entry) => {
      const order = clientData.orders.find(o => o._id === entry.orderId);
      const currentBalance = order ? calculateCurrentBalance(order) : 0;
      
      let description = '';
      if (entry.type === 'order') {
        description = '<ul class="requirements-list">';
        entry.requirements.forEach(req => {
          description += `<li>${req.requirement} - ${req.quantity} × ₹${req.rate} = ₹${req.total}</li>`;
        });
        description += '</ul>';
      } else if (entry.type === 'advance_payment') {
        description = 'Advance Payment';
      } else {
        description = 'Payment Received';
        if (entry.upiNumber) description += ` (UPI: ${entry.upiNumber})`;
        if (entry.chequeNumber) description += ` (Cheque: ${entry.chequeNumber})`;
      }

      const rowClass = entry.type === 'order' ? 'order-row' : 
                      entry.type === 'advance_payment' ? 'advance-row' : 'payment-row';

      tableRows += `
        <tr class="${rowClass}">
          <td>${formatDateSafe(entry.date)}</td>
          <td><strong>${entry.orderNo}</strong></td>
          <td>${description}</td>
          <td class="text-right">${formatCurrency(entry.totalAmount || entry.amount || 0)}</td>
          <td>${entry.method || '-'}</td>
          <td class="text-right ${currentBalance > 0 ? 'amount-negative' : 'amount-positive'}">${formatCurrency(currentBalance)}</td>
        </tr>
      `;
    });

    const printFooter = `
          </tbody>
        </table>
        <div class="footer">
          <p>This is a computer generated statement - Valid without signature</p>
          <p>Generated from Admin Dashboard on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent + tableRows + printFooter);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

 // PDF DOWNLOAD FUNCTION - FINAL FIXED VERSION
const handleDownloadClientPDF = (business, clientData) => {

  try {

    // ===== SUMMARY DATA =====
    const summary = calculateClientSummary(clientData.orders);
    const dateRange = getDateRange(clientData.timeline);

    // ===== CURRENCY FORMAT =====
    const formatCurrency = (amount) => {
      return `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    };

    // ===== CREATE PDF =====
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // ===== TITLE =====
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.setFont(undefined, "bold");
    doc.text("COMPLETE SALES LEDGER", 148, 15, { align: "center" });

    // ===== GENERATED DATE =====
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.setFont(undefined, "normal");
    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      148,
      22,
      { align: "center" }
    );

    // ===== CLIENT NAME =====
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.setFont(undefined, "bold");
    doc.text(business, 14, 32);

    // ===== CLIENT DETAILS =====
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.setFont(undefined, "normal");

    const leftDetails = [
      `Contact: ${clientData.clientInfo.contactPerson || "N/A"}`,
      `Phone: ${clientData.clientInfo.contactCode || "+91"} ${clientData.clientInfo.phone || "N/A"}`,
      `Type: ${clientData.clientInfo.clientType || "N/A"}`
    ];

    const rightDetails = [
      `Address: ${clientData.clientInfo.address || "Hyd"}`,
      `GSTIN: ${clientData.clientInfo.gstin || "N/A"}`,
      `Orders: ${clientData.orders.length}`
    ];

    let yStart = 38;

    leftDetails.forEach((text, i) => {
      doc.text(text, 14, yStart + (i * 5));
    });

    rightDetails.forEach((text, i) => {
      doc.text(text, 140, yStart + (i * 5));
    });

    // ===== FINANCIAL SUMMARY BOX =====
    let summaryY = 58;

    doc.setFillColor(235, 242, 250);
    doc.rect(14, summaryY - 6, 268, 34, "F");

    doc.setFontSize(10);
    doc.setTextColor(0, 51, 102);
    doc.setFont(undefined, "bold");
    doc.text("FINANCIAL SUMMARY", 14, summaryY);

    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.setFont(undefined, "normal");

    const leftSummary = [
      { label: "Total Order Amount:", value: formatCurrency(summary.totalOrderAmount) },
      { label: "Total Advance:", value: formatCurrency(summary.totalAdvance) },
      { label: "Total Paid:", value: formatCurrency(summary.totalPaid) }
    ];

    const rightSummary = [
      { label: "Outstanding Balance:", value: formatCurrency(summary.totalBalance) },
      { label: "Period:", value: `${dateRange.start} - ${dateRange.end}` }
    ];

    let sY = summaryY + 6;

    leftSummary.forEach((item, i) => {
      doc.text(item.label, 20, sY + (i * 6));
      doc.text(item.value, 110, sY + (i * 6), { align: "right" });
    });

    rightSummary.forEach((item, i) => {
      doc.text(item.label, 150, sY + (i * 6));
      doc.text(item.value, 260, sY + (i * 6), { align: "right" });
    });

    // ===== TRANSACTION TITLE =====
    let tableStart = 100;

    doc.setFontSize(10);
    doc.setTextColor(0, 51, 102);
    doc.setFont(undefined, "bold");
    doc.text("TRANSACTION HISTORY", 14, tableStart);

    tableStart += 4;

    // ===== PREPARE TABLE DATA =====
    const tableData = clientData.timeline.map((entry) => {

      const order = clientData.orders.find(o => o._id === entry.orderId);
      const currentBalance = order ? calculateCurrentBalance(order) : 0;

      let description = "";

      if (entry.type === "order") {
        description = entry.requirements
          .map(req => `${req.quantity} x ${req.requirement}`)
          .join(", ");
      }
      else if (entry.type === "advance_payment") {
        description = "ADVANCE PAYMENT";
      }
      else {
        description = "PAYMENT RECEIVED";
      }

      return [
        formatDateSafe(entry.date),
        entry.orderNo,
        description,
        formatCurrency(entry.totalAmount || entry.amount || 0),
        entry.method ? entry.method.toUpperCase() : "-",
        formatCurrency(currentBalance)
      ];

    });

    // ===== CREATE TABLE =====
    autoTable(doc, {

      startY: tableStart,

      head: [
        ["DATE", "ORDER NO", "DESCRIPTION", "AMOUNT", "METHOD", "BALANCE"]
      ],

      body: tableData,

      theme: "grid",

      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak"
      },

      headStyles: {
        fillColor: [0, 51, 102],
        textColor: 255,
        fontStyle: "bold",
        halign: "center"
      },

      columnStyles: {
        0: { cellWidth: 28, halign: "center" }, // DATE
        1: { cellWidth: 30, halign: "center" }, // ORDER
        2: { cellWidth: 95, halign: "left" },   // DESCRIPTION
        3: { cellWidth: 32, halign: "right" },  // AMOUNT
        4: { cellWidth: 30, halign: "center" }, // METHOD
        5: { cellWidth: 32, halign: "right" }   // BALANCE
      },

      margin: { left: 14, right: 14 },

      didDrawPage: function () {

        const pageCount = doc.internal.getNumberOfPages();

        doc.setFontSize(7);
        doc.setTextColor(120);

        doc.text(
          "This is a computer generated statement - Valid without signature",
          148,
          200,
          { align: "center" }
        );

        doc.text(
          `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
          148,
          205,
          { align: "center" }
        );

      }

    });

    // ===== SAVE FILE =====
    const filename =
      `${business.replace(/[^a-zA-Z0-9]/g, "_")}_ledger_${Date.now()}.pdf`;

    doc.save(filename);

  }
  catch (error) {

    console.error("PDF generation error:", error);

    alert("Failed to generate PDF: " + error.message);

  }

};
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading ledger data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header with Back Button */}
      <div style={styles.headerWithBack}>
        <button
          onClick={handleBackToViewOrders}
          style={styles.backButton}
        >
          ← Back to Orders
        </button>
        <h2 style={styles.title}>Client Transaction Timeline</h2>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by Business, Order No, Client Type, Contact Person or Phone..."
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              style={styles.clearButton}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <button type="submit" style={styles.searchButton}>
          Search Ledger
        </button>
      </form>

      {/* Results Count */}
      {filteredOrders.length > 0 && (
        <div style={styles.resultsCount}>
          Found {filteredOrders.length} order(s) matching "{searchTerm}"
        </div>
      )}

      {/* No Results Message */}
      {Object.keys(clientTimeline).length === 0 && searchTerm && (
        <div style={styles.noResults}>
          <p>No orders found matching "{searchTerm}"</p>
          <button onClick={clearSearch} style={styles.clearSearchButton}>
            Clear Search
          </button>
        </div>
      )}

      {Object.keys(clientTimeline).length === 0 && !searchTerm && (
        <p style={styles.initialMessage}>
          Enter a business name, order number, or contact details to search the ledger.
        </p>
      )}

      {/* Client Timeline Display */}
      {Object.entries(clientTimeline).map(([business, clientData]) => {
        const summary = calculateClientSummary(clientData.orders);
        const dateRange = getDateRange(clientData.timeline);

        return (
          <div key={business} style={styles.clientSection}>
            {/* Client Header */}
            <div style={styles.clientHeader}>
              <h3 style={styles.businessName}>{business}</h3>
              <div style={styles.clientInfo}>
                <p><strong>Contact:</strong> {clientData.clientInfo.contactPerson || 'N/A'}</p>
                <p><strong>Phone:</strong> {clientData.clientInfo.contactCode || '+91'} {clientData.clientInfo.phone || 'N/A'}</p>
                <p><strong>Type:</strong> {clientData.clientInfo.clientType || 'N/A'}</p>
              </div>
            </div>

            {/* Header Content with Client Summary */}
            <div style={styles.headerContent}>
              <div style={styles.addressSection}>
                <p style={styles.toText}>To,</p>
                <p style={styles.companyName}>{business}</p>
                <p style={styles.location}>Hyd</p>
              </div>

              <div style={styles.dateAmountSection}>
                <p style={styles.dateRange}>
                  {dateRange.start} - {dateRange.end}
                </p>
                <div style={styles.summaryContainer}>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Total Order Amount:</span>
                    <span style={styles.summaryValue}>₹{summary.totalOrderAmount.toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Total Advance:</span>
                    <span style={{...styles.summaryValue, color: '#f39c12'}}>₹{summary.totalAdvance.toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Total Paid:</span>
                    <span style={{...styles.summaryValue, color: '#27ae60'}}>₹{summary.totalPaid.toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Total Balance:</span>
                    <span style={{
                      ...styles.summaryValue,
                      color: summary.totalBalance > 0 ? '#e74c3c' : '#27ae60',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>
                      ₹{summary.totalBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Table */}
            <div style={styles.timelineContainer}>
              <table style={styles.timelineTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Date</th>
                    <th style={styles.tableHeader}>Order No</th>
                    <th style={styles.tableHeader}>Requirements</th>
                    <th style={styles.tableHeader}>Amount</th>
                    <th style={styles.tableHeader}>Payment Method</th>
                    <th style={styles.tableHeader}>Balance</th>
                    <th style={styles.tableHeader}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clientData.timeline.map((entry, index) => {
                    const order = clientData.orders.find(o => o._id === entry.orderId);
                    const currentBalance = order ? calculateCurrentBalance(order) : 0;
                    const isPaymentRowActive = activePaymentRow === entry.orderId && entry.type === 'order';

                    return (
                      <React.Fragment key={index}>
                        <tr style={
                          entry.type === 'order' ? styles.orderRow :
                          entry.type === 'advance_payment' ? styles.advanceRow :
                          styles.paymentRow
                        }>
                          <td style={styles.tableCell}>{formatDateSafe(entry.date)}</td>
                          <td style={styles.tableCell}><strong>{entry.orderNo}</strong></td>
                          <td style={styles.tableCell}>
                            {entry.type === 'order' ? (
                              <div style={styles.requirementsList}>
                                {entry.requirements.map((req, idx) => (
                                  <div key={idx} style={styles.requirementItem}>
                                    {req.requirement} - {req.quantity} × ₹{req.rate} = ₹{req.total}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              entry.type === 'advance_payment' ? 'Advance Payment' : 'Payment Received'
                            )}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              fontWeight: '600',
                              color: entry.type === 'order' ? '#003366' : '#27ae60'
                            }}>
                              ₹{(entry.totalAmount || entry.amount || 0).toFixed(2)}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            {entry.method || '-'}
                            {entry.upiNumber && ` (${entry.upiNumber})`}
                            {entry.chequeNumber && ` (Cheque #${entry.chequeNumber})`}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              color: currentBalance > 0 ? '#e74c3c' : '#27ae60',
                              fontWeight: '600'
                            }}>
                              ₹{currentBalance.toFixed(2)}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            {entry.type === 'order' && currentBalance > 0 && (
                              <button
                                style={isPaymentRowActive ? styles.cancelButton : styles.payButton}
                                onClick={() => togglePaymentRow(entry.orderId)}
                              >
                                {isPaymentRowActive ? 'Cancel' : 'Record Payment'}
                              </button>
                            )}
                          </td>
                        </tr>

                        {isPaymentRowActive && (
                          <tr>
                            <td colSpan="7" style={styles.paymentFormCell}>
                              <div style={styles.paymentForm}>
                                <div style={styles.paymentFormHeader}>
                                  <span style={styles.paymentFormTitle}>
                                    Record Payment for Order {entry.orderNo}
                                  </span>
                                  <button 
                                    style={styles.closeFormButton}
                                    onClick={() => togglePaymentRow(entry.orderId)}
                                  >
                                    ×
                                  </button>
                                </div>
                                <div style={styles.paymentFormContent}>
                                  <div style={styles.orderSummary}>
                                    <span>Order Total: ₹{entry.totalAmount.toFixed(2)}</span>
                                    <span style={{
                                      marginLeft: '20px',
                                      color: currentBalance > 0 ? '#e74c3c' : '#27ae60',
                                      fontWeight: 'bold'
                                    }}>
                                      Balance: ₹{currentBalance.toFixed(2)}
                                    </span>
                                  </div>
                                  <div style={styles.inputGroup}>
                                    <input
                                      type="number"
                                      placeholder="Amount"
                                      value={newPayments[entry.orderId]?.amount || currentBalance}
                                      onChange={e => handlePaymentChange(entry.orderId, 'amount', e.target.value)}
                                      style={styles.inputSmall}
                                      min="0.01"
                                      step="0.01"
                                      max={currentBalance}
                                    />
                                    <select
                                      value={newPayments[entry.orderId]?.method || ''}
                                      onChange={e => handlePaymentChange(entry.orderId, 'method', e.target.value)}
                                      style={styles.inputSmall}
                                      required
                                    >
                                      <option value="">Select Method</option>
                                      <option value="Cash">Cash</option>
                                      <option value="UPI">UPI</option>
                                      <option value="Cheque">Cheque</option>
                                    </select>

                                    <input
                                      type="date"
                                      value={newPayments[entry.orderId]?.date || new Date().toISOString().split('T')[0]}
                                      onChange={e => handlePaymentChange(entry.orderId, 'date', e.target.value)}
                                      style={styles.inputSmall}
                                    />

                                    {newPayments[entry.orderId]?.method === 'UPI' && (
                                      <select
                                        value={newPayments[entry.orderId]?.upiNumber || ''}
                                        onChange={e => handlePaymentChange(entry.orderId, 'upiNumber', e.target.value)}
                                        style={styles.inputSmall}
                                        required
                                      >
                                        <option value="">Select UPI Number</option>
                                        <option value="9985330008@Chary">9985330008@Chary</option>
                                        <option value="9985330004@Swathi">9985330004@Swathi</option>
                                        <option value="924642893@VenkatGupta">924642893@VenkatGupta</option>
                                      </select>
                                    )}

                                    {newPayments[entry.orderId]?.method === 'Cheque' && (
                                      <input
                                        type="text"
                                        placeholder="Cheque Number"
                                        maxLength={6}
                                        value={newPayments[entry.orderId]?.chequeNumber || ''}
                                        onChange={e => handlePaymentChange(entry.orderId, 'chequeNumber', e.target.value)}
                                        style={styles.inputSmall}
                                        required
                                      />
                                    )}

                                    <button
                                      onClick={() => applyPayment(entry.orderId)}
                                      style={styles.addButton}
                                      disabled={!newPayments[entry.orderId]?.amount || !newPayments[entry.orderId]?.method}
                                    >
                                      Add Payment
                                    </button>
                                  </div>

                                  {paymentSuccess?.orderId === entry.orderId && (
                                    <div style={styles.successMessage}>
                                      <div>
                                        {paymentSuccess.message} Remaining balance: ₹{paymentSuccess.balance?.toFixed(2) || '0.00'}
                                      </div>
                                      <button
                                        style={styles.closeButton}
                                        onClick={() => setPaymentSuccess(null)}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Download and Print Buttons */}
            <div style={styles.exportButtonsContainer}>
              <button
                onClick={() => handlePrintClient(business, clientData)}
                style={styles.printButton}
              >
                🖨️ Print Ledger
              </button>
              <button
                onClick={() => handleDownloadClientPDF(business, clientData)}
                style={styles.downloadButton}
              >
                📥 Download PDF
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  headerWithBack: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px',
  },
  backButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  title: {
    textAlign: 'center',
    color: '#003366',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    flex: 1,
  },
  exportButtonsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderTop: '2px solid #dee2e6',
  },
  printButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  downloadButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  container: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
  },
  loadingText: {
    fontSize: '18px',
    color: '#666',
  },
  searchForm: {
    marginBottom: '30px',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '10px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 15px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  },
  clearButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: '#ccc',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    width: '100%',
    backgroundColor: '#003366',
    color: '#fff',
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
  resultsCount: {
    backgroundColor: '#e3f2fd',
    padding: '10px 15px',
    borderRadius: '6px',
    marginBottom: '20px',
    color: '#003366',
    fontWeight: '500',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  clearSearchButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  initialMessage: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: '40px',
  },
  clientSection: {
    marginBottom: '40px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  clientHeader: {
    backgroundColor: '#003366',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  businessName: {
    margin: '0 0 10px 0',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  clientInfo: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    fontSize: '14px',
  },
  headerContent: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  addressSection: {
    flex: '1',
    minWidth: '200px',
  },
  toText: {
    margin: '0 0 5px 0',
    fontSize: '14px',
    color: '#666',
  },
  companyName: {
    margin: '0 0 5px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#003366',
  },
  location: {
    margin: '0',
    fontSize: '14px',
    color: '#666',
  },
  dateAmountSection: {
    textAlign: 'right',
    flex: '1',
    minWidth: '300px',
  },
  dateRange: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#666',
  },
  summaryContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px dashed #dee2e6',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#666',
  },
  summaryValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#003366',
  },
  timelineContainer: {
    overflowX: 'auto',
  },
  timelineTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    color: '#003366',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '2px solid #dee2e6',
    whiteSpace: 'nowrap',
  },
  tableCell: {
    padding: '12px 15px',
    borderBottom: '1px solid #dee2e6',
    verticalAlign: 'top',
  },
  orderRow: {
    backgroundColor: '#f8f9fa',
    borderLeft: '4px solid #003366',
  },
  paymentRow: {
    backgroundColor: '#f0fff0',
    borderLeft: '4px solid #28a745',
  },
  advanceRow: {
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ffc107',
  },
  requirementsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  requirementItem: {
    padding: '4px 0',
    borderBottom: '1px dashed #eee',
    fontSize: '13px',
  },
  payButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  paymentFormCell: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
  },
  paymentForm: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  paymentFormHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  paymentFormTitle: {
    color: '#003366',
    fontSize: '16px',
    fontWeight: '600',
  },
  closeFormButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '0 5px',
  },
  paymentFormContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  orderSummary: {
    padding: '10px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  inputSmall: {
    flex: '1 1 150px',
    padding: '8px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    minWidth: '120px',
  },
  addButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    minWidth: '120px',
  },
  successMessage: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '10px 15px',
    borderRadius: '4px',
    margin: '10px 0',
    border: '1px solid #c3e6cb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#155724',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold',
    padding: '0 5px',
  },
};

export default Ledger;