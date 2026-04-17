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
  const [error, setError] = useState(null);

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
        setError(null);
        const response = await fetch('/api/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();
        console.log('Fetched orders:', data.length);
        
        const processedOrders = data.map(order => ({
          ...order,
          advance: order.advance || 0,
          balance: order.balance || 0,
          paymentHistory: order.paymentHistory || [],
          rows: order.rows || []
        }));
        
        setAllOrders(processedOrders);

        const urlParams = new URLSearchParams(location.search);
        const businessFromUrl = urlParams.get('business');

        if (businessFromUrl) {
          const decodedBusiness = decodeURIComponent(businessFromUrl);
          setSearchTerm(decodedBusiness);
          performSearch(processedOrders, decodedBusiness);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        alert('Failed to load orders: ' + err.message);
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

  // Calculate total paid (advance is the total paid amount)
  const calculateTotalPaid = (order) => {
    return parseFloat(order.advance) || 0;
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
    let totalPaid = 0;
    let totalBalance = 0;

    orders.forEach(order => {
      const orderTotal = calculateTotal(order);
      const orderPaid = calculateTotalPaid(order);
      
      totalOrderAmount += orderTotal;
      totalPaid += orderPaid;
      totalBalance += (orderTotal - orderPaid);
    });

    return {
      totalOrderAmount,
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
      const orderPaid = calculateTotalPaid(order);
      const currentBalance = orderTotal - orderPaid;

      timeline[business].timeline.push({
        type: 'order',
        date: order.orderDate,
        orderNo: order.orderNo,
        requirements: order.rows || [],
        totalAmount: orderTotal,
        paid: orderPaid,
        balance: currentBalance,
        orderId: order._id,
        deliveryDate: order.deliveryDate,
        status: order.status
      });

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
            utrNumber: payment.utrNumber,
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

  // Get payment method display text with numbers
  const getPaymentMethodDisplay = (entry) => {
    if (entry.type !== 'payment') return entry.method || '-';
    
    let display = entry.method || '-';
    if (entry.chequeNumber) {
      display = `Cheque (${entry.chequeNumber})`;
    } else if (entry.upiNumber) {
      display = `UPI (${entry.upiNumber})`;
    } else if (entry.utrNumber) {
      display = `Bank Transfer (UTR: ${entry.utrNumber})`;
    }
    return display;
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
      const order = allOrders.find(o => o._id === orderId) || 
                   filteredOrders.find(o => o._id === orderId);
      
      if (order) {
        const currentBalance = calculateCurrentBalance(order);
        setNewPayments(prev => ({
          ...prev,
          [orderId]: {
            amount: currentBalance > 0 ? currentBalance.toString() : '',
            method: '',
            date: new Date().toISOString().split('T')[0],
            utrNumber: '',
            chequeNumber: '',
            upiNumber: ''
          }
        }));
      }
    }
  };

  // Apply payment with bank transfer support
  const applyPayment = async (orderId) => {
    const payment = newPayments[orderId];
    
    if (!payment?.amount || !payment?.method) {
      alert("Please enter amount and select payment method");
      return;
    }

    const amount = parseFloat(payment.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // Validate specific fields based on method
    if (payment.method === 'Bank Transfer' && (!payment.utrNumber || payment.utrNumber.trim() === '')) {
      alert("Please enter UTR number for Bank Transfer");
      return;
    }
    
    if (payment.method === 'Cheque' && (!payment.chequeNumber || payment.chequeNumber.trim() === '')) {
      alert("Please enter Cheque number");
      return;
    }
    
    if (payment.method === 'UPI' && (!payment.upiNumber || payment.upiNumber.trim() === '')) {
      alert("Please select UPI number");
      return;
    }

    const currentOrder = allOrders.find(o => o._id === orderId) || 
                         filteredOrders.find(o => o._id === orderId);
    
    if (!currentOrder) {
      alert("Order not found");
      return;
    }

    const currentBalance = calculateCurrentBalance(currentOrder);

    if (amount > currentBalance + 0.01) {
      alert(`Payment amount (₹${amount}) exceeds remaining balance (₹${currentBalance.toFixed(2)})`);
      return;
    }

    try {
      const payload = {
        amount: amount,
        method: payment.method,
        upiNumber: payment.upiNumber || '',
        chequeNumber: payment.chequeNumber || '',
        utrNumber: payment.utrNumber || '',
        date: payment.date || new Date().toISOString().split('T')[0],
        note: `Payment recorded from Ledger on ${new Date().toLocaleString()}`
      };
      
      console.log('Sending payment:', payload);
      
      const res = await fetch(`/api/orders/${orderId}/record-payment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', responseText);
        throw new Error(`Server returned invalid response`);
      }

      if (!res.ok || !responseData.success) {
        throw new Error(responseData.error || responseData.message || 'Failed to record payment');
      }

      const updatedOrder = responseData.order;
      
      // Update the order in allOrders state
      const updateOrderInList = (orders) => {
        return orders.map(order => 
          order._id === orderId 
            ? { ...order, advance: updatedOrder.advance, balance: updatedOrder.balance, paymentHistory: updatedOrder.paymentHistory }
            : order
        );
      };
      
      setAllOrders(prev => updateOrderInList(prev));
      setFilteredOrders(prev => updateOrderInList(prev));
      
      // Refresh the timeline with updated data
      const updatedFilteredOrders = updateOrderInList(filteredOrders);
      setClientTimeline(organizeClientTimeline(updatedFilteredOrders));
      
      setPaymentSuccess({
        orderId,
        message: `Payment of ₹${amount} added successfully!`,
        balance: updatedOrder.balance
      });

      setTimeout(() => setPaymentSuccess(null), 3000);
      
      // Clear payment form
      setNewPayments(prev => ({ ...prev, [orderId]: {} }));
      setActivePaymentRow(null);
      
      // Force a refresh of the orders
      const refreshResponse = await fetch('/api/orders');
      if (refreshResponse.ok) {
        const freshData = await refreshResponse.json();
        const processedFreshData = freshData.map(order => ({
          ...order,
          advance: order.advance || 0,
          balance: order.balance || 0,
          paymentHistory: order.paymentHistory || [],
          rows: order.rows || []
        }));
        setAllOrders(processedFreshData);
        if (searchTerm) {
          performSearch(processedFreshData, searchTerm);
        }
      }

    } catch (err) {
      console.error('Payment failed:', err);
      alert(`Failed to record payment: ${err.message}`);
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
  
  const formatCurrency = (amount) => {
    return 'Rs. ' + parseFloat(amount || 0)
      .toFixed(2)
      .replace(/\d(?=(\d{3})+(?!\d))/g, '$&,');
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
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #003366; padding-bottom: 20px; }
          .header h1 { color: #003366; margin: 0; font-size: 28px; }
          .client-info { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 25px; }
          .client-info h2 { color: #003366; margin: 0 0 15px 0; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary { background: #e3f2fd; padding: 20px; border-radius: 5px; margin-bottom: 25px; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #ccc; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #003366; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          .order-row { background: #f8f9fa; }
          .payment-row { background: #f0fff0; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #ccc; }
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
            <div><strong>Contact:</strong> ${clientData.clientInfo.contactPerson || 'N/A'}</div>
            <div><strong>Phone:</strong> ${clientData.clientInfo.contactCode || '+91'} ${clientData.clientInfo.phone || 'N/A'}</div>
            <div><strong>Type:</strong> ${clientData.clientInfo.clientType || 'N/A'}</div>
          </div>
        </div>
        <div class="summary">
          <div class="summary-row"><span>Total Order Amount:</span><span>${formatCurrency(summary.totalOrderAmount)}</span></div>
          <div class="summary-row"><span>Total Paid:</span><span>${formatCurrency(summary.totalPaid)}</span></div>
          <div class="summary-row"><span>Outstanding Balance:</span><span>${formatCurrency(summary.totalBalance)}</span></div>
        </div>
        <h3>TRANSACTION HISTORY</h3>
         <table>
          <thead><tr><th>Date</th><th>Order No</th><th>Description</th><th>Amount</th><th>Method</th><th>Balance</th></tr></thead>
          <tbody>
    `;

    let tableRows = '';
    let runningBalance = 0;
    
    clientData.timeline.forEach((entry) => {
      let description = '';
      let methodDisplay = '';
      
      if (entry.type === 'order') {
        description = entry.requirements.map(req => `${req.requirement} - ${req.quantity}×₹${req.rate}`).join(', ');
        runningBalance = entry.balance;
        methodDisplay = '-';
      } else {
        description = 'Payment Received';
        methodDisplay = entry.method || '-';
        if (entry.chequeNumber) {
          methodDisplay = `Cheque (${entry.chequeNumber})`;
        } else if (entry.upiNumber) {
          methodDisplay = `UPI (${entry.upiNumber})`;
        } else if (entry.utrNumber) {
          methodDisplay = `Bank Transfer (UTR: ${entry.utrNumber})`;
        }
        runningBalance -= entry.amount;
      }

      tableRows += `
        <tr class="${entry.type === 'order' ? 'order-row' : 'payment-row'}">
          <td>${formatDateSafe(entry.date)}</td>
          <td><strong>${entry.orderNo}</strong></td>
          <td>${description}</td>
          <td>${formatCurrency(entry.totalAmount || entry.amount || 0)}</td>
          <td>${methodDisplay}</td>
          <td>${formatCurrency(runningBalance)}</td>
        </tr>
      `;
    });

    printWindow.document.write(printContent + tableRows + '</tbody></table><div class="footer"><p>Generated from Admin Dashboard</p></div></body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // PDF DOWNLOAD FUNCTION
  const handleDownloadClientPDF = (business, clientData) => {
    try {
      const summary = calculateClientSummary(clientData.orders);
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 102);
      doc.text('COMPLETE SALES LEDGER', 148, 15, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 148, 22, { align: 'center' });

      doc.setFontSize(12);
      doc.text(business, 14, 30);
      
      let yPos = 40;
      doc.setFontSize(9);
      doc.text(`Contact: ${clientData.clientInfo.contactPerson || 'N/A'}`, 14, yPos);
      doc.text(`Phone: ${clientData.clientInfo.contactCode || '+91'} ${clientData.clientInfo.phone || 'N/A'}`, 14, yPos + 5);
      doc.text(`Type: ${clientData.clientInfo.clientType || 'N/A'}`, 14, yPos + 10);

      yPos = 60;
      doc.setFillColor(240, 248, 255);
      doc.rect(14, yPos - 4, 268, 30, 'F');
      doc.setFontSize(10);
      doc.text('FINANCIAL SUMMARY', 14, yPos);
      
      yPos += 6;
      doc.setFontSize(9);
      doc.text(`Total Order Amount: ${formatCurrency(summary.totalOrderAmount)}`, 20, yPos);
      doc.text(`Total Paid: ${formatCurrency(summary.totalPaid)}`, 20, yPos + 5);
      doc.text(`Outstanding Balance: ${formatCurrency(summary.totalBalance)}`, 20, yPos + 10);

      yPos = 105;
      doc.setFontSize(10);
      doc.text('TRANSACTION HISTORY', 14, yPos);
      
      const tableData = clientData.timeline.map(entry => {
        let description = '';
        let methodDisplay = '';
        
        if (entry.type === 'order') {
          description = entry.requirements.map(req => `${req.quantity}×${req.requirement}`).join(', ');
          if (description.length > 50) description = description.substring(0, 47) + '...';
          methodDisplay = '-';
        } else {
          description = 'PAYMENT RECEIVED';
          methodDisplay = entry.method || '-';
          if (entry.chequeNumber) {
            methodDisplay = `Cheque (${entry.chequeNumber})`;
          } else if (entry.upiNumber) {
            methodDisplay = `UPI (${entry.upiNumber})`;
          } else if (entry.utrNumber) {
            methodDisplay = `Bank Transfer (UTR: ${entry.utrNumber})`;
          }
        }
        
        return [
          formatDateSafe(entry.date),
          entry.orderNo,
          description,
          formatCurrency(entry.totalAmount || entry.amount || 0),
          methodDisplay,
          formatCurrency(entry.type === 'order' ? entry.balance : 0)
        ];
      });

      autoTable(doc, {
        startY: yPos + 4,
        head: [['DATE', 'ORDER NO', 'DESCRIPTION', 'AMOUNT', 'METHOD', 'BALANCE']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 28 },
          2: { cellWidth: 95 },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 40 },
          5: { cellWidth: 35, halign: 'right' }
        }
      });

      const filename = `${business.replace(/[^a-zA-Z0-9]/g, '_')}_ledger_${formatDateForFilename()}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('PDF error:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };

  if (loading) {
    return <div style={styles.loadingContainer}><div style={styles.loadingText}>Loading ledger data...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerWithBack}>
        <button onClick={handleBackToViewOrders} style={styles.backButton}>← Back to Orders</button>
        <h2 style={styles.title}>Client Transaction Timeline</h2>
      </div>

      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchContainer}>
          <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search by Business, Order No, Client Type, Contact Person or Phone..." style={styles.searchInput} />
          {searchTerm && <button type="button" onClick={clearSearch} style={styles.clearButton}>×</button>}
        </div>
        <button type="submit" style={styles.searchButton}>Search Ledger</button>
      </form>

      {filteredOrders.length > 0 && <div style={styles.resultsCount}>Found {filteredOrders.length} order(s) matching "{searchTerm}"</div>}
      {Object.keys(clientTimeline).length === 0 && searchTerm && <div style={styles.noResults}><p>No orders found matching "{searchTerm}"</p><button onClick={clearSearch} style={styles.clearSearchButton}>Clear Search</button></div>}
      {Object.keys(clientTimeline).length === 0 && !searchTerm && <p style={styles.initialMessage}>Enter a business name, order number, or contact details to search the ledger.</p>}

      {Object.entries(clientTimeline).map(([business, clientData]) => {
        const summary = calculateClientSummary(clientData.orders);
        const dateRange = getDateRange(clientData.timeline);

        return (
          <div key={business} style={styles.clientSection}>
            <div style={styles.clientHeader}>
              <h3 style={styles.businessName}>{business}</h3>
              <div style={styles.clientInfo}>
                <p><strong>Contact:</strong> {clientData.clientInfo.contactPerson || 'N/A'}</p>
                <p><strong>Phone:</strong> {clientData.clientInfo.contactCode || '+91'} {clientData.clientInfo.phone || 'N/A'}</p>
                <p><strong>Type:</strong> {clientData.clientInfo.clientType || 'N/A'}</p>
              </div>
            </div>

            <div style={styles.headerContent}>
              <div style={styles.addressSection}>
                <p style={styles.toText}>To,</p>
                <p style={styles.companyName}>{business}</p>
                <p style={styles.location}>Hyd</p>
              </div>
              <div style={styles.dateAmountSection}>
                <p style={styles.dateRange}>{dateRange.start} - {dateRange.end}</p>
                <div style={styles.summaryContainer}>
                  <div style={styles.summaryRow}><span>Total Order Amount:</span><span>₹{summary.totalOrderAmount.toFixed(2)}</span></div>
                  <div style={styles.summaryRow}><span>Total Paid:</span><span style={{color: '#27ae60'}}>₹{summary.totalPaid.toFixed(2)}</span></div>
                  <div style={styles.summaryRow}><span>Total Balance:</span><span style={{color: summary.totalBalance > 0 ? '#e74c3c' : '#27ae60', fontWeight: 'bold'}}>₹{summary.totalBalance.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            <div style={styles.timelineContainer}>
              <table style={styles.timelineTable}>
                <thead><tr><th>Date</th><th>Order No</th><th>Requirements</th><th>Amount</th><th>Payment Method</th><th>Balance</th><th>Action</th></tr></thead>
                <tbody>
                  {clientData.timeline.map((entry, index) => {
                    const order = clientData.orders.find(o => o._id === entry.orderId);
                    const currentBalance = order ? calculateCurrentBalance(order) : 0;
                    const isPaymentRowActive = activePaymentRow === entry.orderId && entry.type === 'order';
                    const methodDisplay = getPaymentMethodDisplay(entry);

                    return (
                      <React.Fragment key={index}>
                        <tr style={entry.type === 'order' ? styles.orderRow : styles.paymentRow}>
                          <td style={styles.tableCell}>{formatDateSafe(entry.date)}</td>
                          <td style={styles.tableCell}><strong>{entry.orderNo}</strong></td>
                          <td style={styles.tableCell}>
                            {entry.type === 'order' ? (
                              <div>
                                {entry.requirements.map((req, idx) => (
                                  <div key={idx}>{req.requirement} - {req.quantity} × ₹{req.rate} = ₹{req.total}</div>
                                ))}
                              </div>
                            ) : (
                              <div>Payment Received</div>
                            )}
                          </td>
                          <td style={styles.tableCell}>₹{(entry.totalAmount || entry.amount || 0).toFixed(2)}</td>
                          <td style={styles.tableCell}>
                            <span style={{
                              fontWeight: entry.type === 'payment' ? '500' : 'normal',
                              color: entry.chequeNumber ? '#1565C0' : (entry.utrNumber ? '#00695C' : (entry.upiNumber ? '#6A1B9A' : 'inherit'))
                            }}>
                              {methodDisplay}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{color: currentBalance > 0 ? '#e74c3c' : '#27ae60', fontWeight: '600'}}>
                              ₹{currentBalance.toFixed(2)}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            {entry.type === 'order' && currentBalance > 0 && (
                              <button style={isPaymentRowActive ? styles.cancelButton : styles.payButton} onClick={() => togglePaymentRow(entry.orderId)}>
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
                                  <span>Record Payment for Order {entry.orderNo}</span>
                                  <button onClick={() => togglePaymentRow(entry.orderId)} style={styles.closeFormButton}>×</button>
                                </div>
                                <div style={styles.orderSummary}>
                                  <span>Order Total: ₹{entry.totalAmount.toFixed(2)}</span>
                                  <span style={{marginLeft: '20px', color: currentBalance > 0 ? '#e74c3c' : '#27ae60'}}>Balance: ₹{currentBalance.toFixed(2)}</span>
                                </div>
                                <div style={styles.inputGroup}>
                                  <input type="number" step="0.01" min="0.01" max={currentBalance} placeholder="Amount" value={newPayments[entry.orderId]?.amount || ''} onChange={(e) => handlePaymentChange(entry.orderId, 'amount', e.target.value)} style={styles.inputSmall} />
                                  
                                  <select value={newPayments[entry.orderId]?.method || ''} onChange={e => handlePaymentChange(entry.orderId, 'method', e.target.value)} style={styles.inputSmall} required>
                                    <option value="">Select Method</option>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                  </select>
                                  
                                  <input type="date" value={newPayments[entry.orderId]?.date || new Date().toISOString().split('T')[0]} onChange={e => handlePaymentChange(entry.orderId, 'date', e.target.value)} style={styles.inputSmall} />
                                  
                                  {newPayments[entry.orderId]?.method === 'UPI' && (
                                    <select value={newPayments[entry.orderId]?.upiNumber || ''} onChange={e => handlePaymentChange(entry.orderId, 'upiNumber', e.target.value)} style={styles.inputSmall}>
                                      <option value="">Select UPI Number</option>
                                      <option value="9985330008@Chary">9985330008@Chary</option>
                                      <option value="9985330004@Swathi">9985330004@Swathi</option>
                                      <option value="924642893@VenkatGupta">924642893@VenkatGupta</option>
                                    </select>
                                  )}
                                  
                                  {newPayments[entry.orderId]?.method === 'Cheque' && (
                                    <input type="text" placeholder="Cheque Number *" maxLength="6" value={newPayments[entry.orderId]?.chequeNumber || ''} onChange={e => handlePaymentChange(entry.orderId, 'chequeNumber', e.target.value)} style={styles.inputSmall} required />
                                  )}
                                  
                                  {newPayments[entry.orderId]?.method === 'Bank Transfer' && (
                                    <input type="text" placeholder="UTR Number *" value={newPayments[entry.orderId]?.utrNumber || ''} onChange={e => handlePaymentChange(entry.orderId, 'utrNumber', e.target.value)} style={styles.inputSmall} required />
                                  )}
                                  
                                  <button onClick={() => applyPayment(entry.orderId)} style={styles.addButton} 
                                    disabled={
                                      !newPayments[entry.orderId]?.amount || 
                                      !newPayments[entry.orderId]?.method ||
                                      (newPayments[entry.orderId]?.method === 'Bank Transfer' && !newPayments[entry.orderId]?.utrNumber) ||
                                      (newPayments[entry.orderId]?.method === 'Cheque' && !newPayments[entry.orderId]?.chequeNumber) ||
                                      (newPayments[entry.orderId]?.method === 'UPI' && !newPayments[entry.orderId]?.upiNumber)
                                    }>
                                    Add Payment
                                  </button>
                                </div>
                                {paymentSuccess?.orderId === entry.orderId && <div style={styles.successMessage}>{paymentSuccess.message} Remaining balance: ₹{paymentSuccess.balance?.toFixed(2) || '0.00'}</div>}
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

            <div style={styles.exportButtonsContainer}>
              <button onClick={() => handlePrintClient(business, clientData)} style={styles.printButton}>🖨️ Print Ledger</button>
              <button onClick={() => handleDownloadClientPDF(business, clientData)} style={styles.downloadButton}>📥 Download PDF</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  headerWithBack: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  backButton: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  title: { textAlign: 'center', color: '#003366', fontSize: '28px', fontWeight: 'bold', margin: 0, flex: 1 },
  exportButtonsContainer: { display: 'flex', justifyContent: 'flex-end', gap: '15px', padding: '20px', backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6' },
  printButton: { backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  downloadButton: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  container: { maxWidth: '1400px', margin: '30px auto', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' },
  loadingText: { fontSize: '18px', color: '#666' },
  searchForm: { marginBottom: '30px' },
  searchContainer: { position: 'relative', marginBottom: '10px' },
  searchInput: { width: '100%', padding: '12px 40px 12px 15px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  clearButton: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#ccc', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '16px' },
  searchButton: { width: '100%', backgroundColor: '#003366', color: '#fff', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '16px' },
  resultsCount: { backgroundColor: '#e3f2fd', padding: '10px 15px', borderRadius: '6px', marginBottom: '20px', color: '#003366', fontWeight: '500' },
  noResults: { textAlign: 'center', padding: '40px', color: '#666' },
  clearSearchButton: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' },
  initialMessage: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: '40px' },
  clientSection: { marginBottom: '40px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' },
  clientHeader: { backgroundColor: '#003366', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  businessName: { margin: '0 0 10px 0', fontSize: '24px', fontWeight: 'bold' },
  clientInfo: { display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px' },
  headerContent: { padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  addressSection: { flex: '1', minWidth: '200px' },
  toText: { margin: '0 0 5px 0', fontSize: '14px', color: '#666' },
  companyName: { margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold', color: '#003366' },
  location: { margin: '0', fontSize: '14px', color: '#666' },
  dateAmountSection: { textAlign: 'right', flex: '1', minWidth: '300px' },
  dateRange: { margin: '0 0 10px 0', fontSize: '14px', color: '#666' },
  summaryContainer: { display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed #dee2e6' },
  timelineContainer: { overflowX: 'auto' },
  timelineTable: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' },
  tableHeader: { backgroundColor: '#f8f9fa', color: '#003366', padding: '12px 15px', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' },
  tableCell: { padding: '12px 15px', borderBottom: '1px solid #dee2e6', verticalAlign: 'top' },
  orderRow: { backgroundColor: '#f8f9fa', borderLeft: '4px solid #003366' },
  paymentRow: { backgroundColor: '#f0fff0', borderLeft: '4px solid #28a745' },
  payButton: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  cancelButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  paymentFormCell: { padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' },
  paymentForm: { backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  paymentFormHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', color: '#003366', fontSize: '16px', fontWeight: '600' },
  closeFormButton: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' },
  orderSummary: { padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '14px', fontWeight: '500', marginBottom: '15px' },
  inputGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  inputSmall: { flex: '1 1 150px', padding: '8px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '120px' },
  addButton: { backgroundColor: '#28a745', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', minWidth: '120px' },
  successMessage: { backgroundColor: '#d4edda', color: '#155724', padding: '10px 15px', borderRadius: '4px', marginTop: '15px', border: '1px solid #c3e6cb' }
};

export default Ledger;