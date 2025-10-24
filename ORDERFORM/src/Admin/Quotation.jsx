import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Configure axios base URL
const API_BASE_URL = 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const Quotation = () => {
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [requirements, setRequirements] = useState([]);
  const [showAddItems, setShowAddItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [terms, setTerms] = useState(`1) Payment should be Covered and Made to "GLOBAL MARKETING SOLUTIONS", AND BANK, BRANCH: Champagne, A/C: 9127000007166090, IFSCode:UTIB0001336`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedQuotation, setSavedQuotation] = useState(null);
  const [hoverStates, setHoverStates] = useState({
    addItem: false,
    submitButton: false,
    downloadButton: false,
    printButton: false,
    removeButtons: {}
  });
  const [showViewQuotations, setShowViewQuotations] = useState(false);
  const [allQuotations, setAllQuotations] = useState([]);

  // Tax options
  const taxOptions = [
    { value: 0, label: 'None', type: 'none' },
    { value: 0, label: 'Exempted', type: 'exempted' },
    { value: 0, label: 'GST@0%', type: 'gst' },
    { value: 0.1, label: 'GST@0.1%', type: 'gst' },
    { value: 0.25, label: 'GST@0.25%', type: 'gst' },
    { value: 1.5, label: 'GST@1.5%', type: 'gst' },
    { value: 3, label: 'GST@3%', type: 'gst' },
    { value: 5, label: 'GST@5%', type: 'gst' },
    { value: 6, label: 'GST@6%', type: 'gst' },
    { value: 13.8, label: 'GST@13.8%', type: 'gst' },
    { value: 18, label: 'GST@18%', type: 'gst' },
    { value: 14, label: 'GST@14% + Cess@12%', type: 'gst_with_cess' },
    { value: 28, label: 'GST@28% + Cess@5%', type: 'gst_with_cess' },
    { value: 40, label: 'GST@40%', type: 'gst' },
    { value: 28, label: 'GST@28% + Cess@36%', type: 'gst_with_cess' },
    { value: 28, label: 'GST@28% + Cess@60%', type: 'gst_with_cess' }
  ];

  // Header state
  const [quotationHeader, setQuotationHeader] = useState({
    quotationNo: '',
    validFor: '10',
    poNo: '',
    quotationDate: new Date().toISOString().split('T')[0],
    validityDate: ''
  });

  // Form state
  const [quotationData, setQuotationData] = useState({
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    taxableAmount: 0,
    totalAmount: 0,
    additionalCharges: 0,
    autoRoundOff: 0
  });

  // Calculate validity date based on quotation date and validFor days
  useEffect(() => {
    if (quotationHeader.quotationDate && quotationHeader.validFor) {
      const quotationDate = new Date(quotationHeader.quotationDate);
      const validityDate = new Date(quotationDate);
      validityDate.setDate(validityDate.getDate() + parseInt(quotationHeader.validFor));
      
      const formattedValidityDate = validityDate.toISOString().split('T')[0];
      setQuotationHeader(prev => ({ ...prev, validityDate: formattedValidityDate }));
    }
  }, [quotationHeader.quotationDate, quotationHeader.validFor]);

  // Set initial validity date and fetch next quotation number
  useEffect(() => {
    const today = new Date();
    const validityDate = new Date(today);
    validityDate.setDate(validityDate.getDate() + 10);
    
    setQuotationHeader(prev => ({
      ...prev,
      quotationDate: today.toISOString().split('T')[0],
      validityDate: validityDate.toISOString().split('T')[0]
    }));

    fetchNextQuotationNumber();
  }, []);

  // Fetch next quotation number
  const fetchNextQuotationNumber = async () => {
    try {
      const response = await api.get('/quotations/next-number');
      setQuotationHeader(prev => ({ ...prev, quotationNo: response.data.nextNumber }));
    } catch (error) {
      console.error('Error fetching next quotation number:', error);
      // Generate fallback number
      const fallbackNumber = `GMS${String(1).padStart(3, '0')}`;
      setQuotationHeader(prev => ({ ...prev, quotationNo: fallbackNumber }));
    }
  };

  // Fetch parties and requirements
  useEffect(() => {
    fetchParties();
    fetchRequirements();
  }, []);

  const fetchParties = async () => {
    try {
      const response = await api.get('/parties');
      setParties(response.data);
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const fetchRequirements = async () => {
    try {
      const response = await api.get('/requirements');
      setRequirements(response.data || []);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setRequirements([]);
    }
  };

  // Fetch all quotations
  const fetchAllQuotations = async () => {
    try {
      const response = await api.get('/quotations');
      setAllQuotations(response.data);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  // Calculate totals
  const calculateTotals = (itemsList) => {
    const subtotal = itemsList.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalDiscount = itemsList.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const totalTax = itemsList.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const taxableAmount = subtotal - totalDiscount;
    const totalAmount = taxableAmount + totalTax + quotationData.additionalCharges;

    setQuotationData(prev => ({
      ...prev,
      subtotal,
      discount: totalDiscount,
      tax: totalTax,
      taxableAmount,
      totalAmount
    }));
  };

  // Update item calculations
  const updateItemCalculations = (item) => {
    const quantity = item.quantity || 0;
    const price = item.price || 0;
    
    const discountAmount = item.discountType === 'percentage' 
      ? (quantity * price * (item.discount || 0) / 100)
      : (item.discount || 0);

    const taxableAmount = (quantity * price) - discountAmount;

    let taxAmount = 0;
    if (item.taxType === 'percentage') {
      taxAmount = taxableAmount * (item.tax || 0) / 100;
    } else {
      taxAmount = item.tax || 0;
    }

    const amount = taxableAmount + taxAmount;

    item.discountAmount = discountAmount;
    item.taxAmount = taxAmount;
    item.amount = amount;

    return item;
  };

  // Add item to quotation
  const addItemToQuotation = (requirement) => {
    const newItem = {
      id: Date.now(),
      name: requirement.itemName || requirement.name || 'Unnamed Item',
      description: '', // Initialize empty description
      quantity: 1,
      price: requirement.salesPrice || requirement.price || 0,
      discount: 0,
      discountType: 'percentage',
      tax: 1.5,
      taxType: 'percentage',
      discountAmount: 0,
      taxAmount: 0,
      amount: requirement.salesPrice || requirement.price || 0,
      unit: requirement.unit || 'PCS'
    };

    updateItemCalculations(newItem);

    const updatedItems = [...quotationData.items, newItem];
    setQuotationData(prev => ({ ...prev, items: updatedItems }));
    calculateTotals(updatedItems);
    setShowAddItems(false);
    setSearchTerm('');
  };

  // Update item in quotation
  const updateItem = (index, field, value) => {
    const updatedItems = [...quotationData.items];
    let item = updatedItems[index];
    
    if (typeof value === 'number' && isNaN(value)) {
      value = 0;
    }
    
    item[field] = value;
    item = updateItemCalculations(item);

    setQuotationData(prev => ({ ...prev, items: updatedItems }));
    calculateTotals(updatedItems);
  };

  // Remove item from quotation
  const removeItem = (index) => {
    const updatedItems = quotationData.items.filter((_, i) => i !== index);
    setQuotationData(prev => ({ ...prev, items: updatedItems }));
    calculateTotals(updatedItems);
  };

  // Add additional charge
  const addAdditionalCharge = () => {
    const newCharge = {
      id: Date.now(),
      description: '',
      amount: 0
    };
    setAdditionalCharges(prev => [...prev, newCharge]);
  };

  // Remove additional charge
  const removeAdditionalCharge = (index) => {
    const updatedCharges = additionalCharges.filter((_, i) => i !== index);
    setAdditionalCharges(updatedCharges);
    
    const totalAdditionalCharges = updatedCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
    setQuotationData(prev => ({ ...prev, additionalCharges: totalAdditionalCharges }));
    calculateTotals(quotationData.items);
  };

  // Update additional charge
  const updateAdditionalCharge = (index, field, value) => {
    const updatedCharges = [...additionalCharges];
    
    if (field === 'amount' && (isNaN(value) || value === '')) {
      value = 0;
    }
    
    updatedCharges[index][field] = value;
    setAdditionalCharges(updatedCharges);
    
    const totalAdditionalCharges = updatedCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
    setQuotationData(prev => ({ ...prev, additionalCharges: totalAdditionalCharges }));
    calculateTotals(quotationData.items);
  };

  // Submit quotation
  const submitQuotation = async () => {
    if (!selectedParty) {
      alert('Please select a party');
      return;
    }

    if (quotationData.items.length === 0) {
      alert('Please add at least one item to the quotation');
      return;
    }

    setIsSubmitting(true);

    const quotationPayload = {
      ...quotationHeader,
      partyId: selectedParty,
      partyDetails: parties.find(party => party._id === selectedParty),
      items: quotationData.items,
      additionalCharges,
      notes,
      terms,
      summary: {
        subtotal: quotationData.subtotal,
        discount: quotationData.discount,
        tax: quotationData.tax,
        taxableAmount: quotationData.taxableAmount,
        additionalCharges: quotationData.additionalCharges,
        totalAmount: quotationData.totalAmount,
        autoRoundOff: quotationData.autoRoundOff
      },
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    try {
      const response = await api.post('/quotations', quotationPayload);
      setSavedQuotation(response.data);
      setShowSuccessModal(true);
      console.log('Quotation saved:', response.data);
      
      // Reset form after successful submission
      setQuotationData({
        items: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        taxableAmount: 0,
        totalAmount: 0,
        additionalCharges: 0,
        autoRoundOff: 0
      });
      setAdditionalCharges([]);
      setSelectedParty('');
      setNotes('');
      fetchNextQuotationNumber(); // Get next quotation number
    } catch (error) {
      console.error('Error saving quotation:', error);
      alert(`Error saving quotation: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced PDF Download Function - FIXED VERSION
  const downloadPDF = () => {
    // Check if there are items to generate PDF
    if (quotationData.items.length === 0) {
      alert('Please add items to the quotation before downloading PDF');
      return;
    }

    if (!selectedParty) {
      alert('Please select a party before downloading PDF');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Company Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('GLOBAL MARKETING SOLUTIONS', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Quotation', 105, 30, { align: 'center' });
      
      // Add a line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 35, 196, 35);

      // Quotation Details
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      
      // Left side - Quotation details
      doc.text(`Quotation No: ${quotationHeader.quotationNo || 'N/A'}`, 14, 45);
      doc.text(`Date: ${quotationHeader.quotationDate || 'N/A'}`, 14, 52);
      doc.text(`Valid Until: ${quotationHeader.validityDate || 'N/A'}`, 14, 59);
      doc.text(`PO No: ${quotationHeader.poNo || 'N/A'}`, 14, 66);

      // Right side - Company details
      doc.text('GLOBAL MARKETING SOLUTIONS', 140, 45);
      doc.text('Champagne Branch', 140, 52);
      doc.text('A/C: 9127000007166090', 140, 59);
      doc.text('IFSC: UTIB0001336', 140, 66);

      // Party Details
      const party = parties.find(p => p._id === selectedParty);
      if (party) {
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        doc.text('Bill To:', 14, 80);
        doc.setFontSize(10);
        doc.text(party.partyName || '', 14, 87);
        if (party.billingAddress) {
          const addressLines = doc.splitTextToSize(party.billingAddress, 80);
          doc.text(addressLines, 14, 94);
        }
        if (party.gstin) {
          doc.text(`GSTIN: ${party.gstin}`, 14, 110);
        }
        if (party.mobileNumber) {
          doc.text(`Mobile: ${party.mobileNumber}`, 14, 117);
        }
      }

      // Items Table
      const tableColumn = [
        "Sr.No",
        "Item Description", 
        "Qty", 
        "Unit", 
        "Rate (₹)", 
        "Discount", 
        "Tax", 
        "Amount (₹)"
      ];
      
      const tableRows = quotationData.items.map((item, index) => [
        index + 1,
        item.name + (item.description ? `\n${item.description}` : ''),
        item.quantity,
        item.unit,
        item.price.toFixed(2),
        `${item.discount || 0}${item.discountType === 'percentage' ? '%' : '₹'}`,
        `${item.tax || 0}${item.taxType === 'percentage' ? '%' : '₹'}`,
        item.amount.toFixed(2)
      ]);

      doc.autoTable({
        startY: 125,
        head: [tableColumn],
        body: tableRows,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 50 },
          2: { cellWidth: 15 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 20 },
          7: { cellWidth: 25 }
        }
      });

      // Summary Section
      let finalY = doc.lastAutoTable.finalY + 10;
      
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      
      // Summary box
      doc.setFillColor(248, 249, 250);
      doc.rect(120, finalY, 75, 60, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(120, finalY, 75, 60);
      
      doc.text('SUMMARY', 125, finalY + 8);
      doc.text(`Subtotal: ₹${quotationData.subtotal.toFixed(2)}`, 125, finalY + 18);
      doc.text(`Discount: -₹${quotationData.discount.toFixed(2)}`, 125, finalY + 26);
      doc.text(`Tax: ₹${quotationData.tax.toFixed(2)}`, 125, finalY + 34);
      
      // Additional charges
      if (additionalCharges.length > 0) {
        additionalCharges.forEach((charge, index) => {
          if (charge.description && charge.amount) {
            doc.text(`${charge.description}: ₹${parseFloat(charge.amount).toFixed(2)}`, 125, finalY + 42 + (index * 8));
          }
        });
      }
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`Total: ₹${quotationData.totalAmount.toFixed(2)}`, 125, finalY + 50);
      doc.setFont(undefined, 'normal');

      // Terms and Conditions
      finalY += 70;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text('Terms & Conditions:', 14, finalY);
      
      if (terms) {
        const splitTerms = doc.splitTextToSize(terms, 180);
        doc.text(splitTerms, 14, finalY + 8);
      }

      // Notes
      if (notes) {
        finalY += (splitTerms ? splitTerms.length * 5 : 0) + 15;
        doc.text('Notes:', 14, finalY);
        const splitNotes = doc.splitTextToSize(notes, 180);
        doc.text(splitNotes, 14, finalY + 8);
      }

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' });
      doc.text('Authorized Signatory', 105, pageHeight - 10, { align: 'center' });

      // Save the PDF
      const fileName = `Quotation_${quotationHeader.quotationNo || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Print Quotation
  const printQuotation = () => {
    if (quotationData.items.length === 0) {
      alert('Please add items to the quotation before printing');
      return;
    }

    if (!selectedParty) {
      alert('Please select a party before printing');
      return;
    }

    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    const party = parties.find(p => p._id === selectedParty);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation ${quotationHeader.quotationNo}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .company-name { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2c3e50;
          }
          .quotation-title { 
            font-size: 18px; 
            color: #7f8c8d;
          }
          .details-section { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 20px;
          }
          .party-details, .quotation-details { 
            width: 48%; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
          }
          th { 
            background-color: #2c3e50; 
            color: white; 
            padding: 10px; 
            text-align: left;
          }
          td { 
            padding: 8px 10px; 
            border: 1px solid #ddd;
          }
          .summary { 
            float: right; 
            width: 300px; 
            border: 1px solid #ddd; 
            padding: 15px; 
            background-color: #f8f9fa;
          }
          .total { 
            font-weight: bold; 
            font-size: 16px; 
            border-top: 2px solid #2c3e50; 
            padding-top: 10px;
          }
          .footer { 
            margin-top: 50px; 
            text-align: center; 
            color: #7f8c8d;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">GLOBAL MARKETING SOLUTIONS</div>
          <div class="quotation-title">QUOTATION</div>
        </div>

        <div class="details-section">
          <div class="quotation-details">
            <strong>Quotation Details:</strong><br>
            Quotation No: ${quotationHeader.quotationNo || 'N/A'}<br>
            Date: ${quotationHeader.quotationDate || 'N/A'}<br>
            Valid Until: ${quotationHeader.validityDate || 'N/A'}<br>
            PO No: ${quotationHeader.poNo || 'N/A'}
          </div>
          <div class="party-details">
            <strong>Bill To:</strong><br>
            ${party ? `
              ${party.partyName || ''}<br>
              ${party.billingAddress || ''}<br>
              ${party.gstin ? 'GSTIN: ' + party.gstin : ''}<br>
              ${party.mobileNumber ? 'Mobile: ' + party.mobileNumber : ''}
            ` : 'No party selected'}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Item Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Rate (₹)</th>
              <th>Discount</th>
              <th>Tax</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${quotationData.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}${item.description ? '<br><small>' + item.description + '</small>' : ''}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.discount || 0}${item.discountType === 'percentage' ? '%' : '₹'}</td>
                <td>${item.tax || 0}${item.taxType === 'percentage' ? '%' : '₹'}</td>
                <td>${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <strong>SUMMARY</strong><br><br>
          Subtotal: ₹${quotationData.subtotal.toFixed(2)}<br>
          Discount: -₹${quotationData.discount.toFixed(2)}<br>
          Tax: ₹${quotationData.tax.toFixed(2)}<br>
          ${additionalCharges.map(charge => 
            charge.description && charge.amount ? 
            `${charge.description}: ₹${parseFloat(charge.amount).toFixed(2)}<br>` : ''
          ).join('')}
          <div class="total">Total: ₹${quotationData.totalAmount.toFixed(2)}</div>
        </div>

        <div style="clear: both;"></div>

        ${terms ? `
          <div style="margin-top: 30px;">
            <strong>Terms & Conditions:</strong><br>
            ${terms.replace(/\n/g, '<br>')}
          </div>
        ` : ''}

        ${notes ? `
          <div style="margin-top: 20px;">
            <strong>Notes:</strong><br>
            ${notes}
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Authorized Signatory<br>Global Marketing Solutions</p>
        </div>

        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; cursor: pointer;">
            Print Quotation
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Filter requirements based on search
  const filteredRequirements = requirements.filter(req => {
    if (!req) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (req.itemName?.toLowerCase().includes(searchLower)) ||
      (req.name?.toLowerCase().includes(searchLower)) ||
      (req.itemCode?.toLowerCase().includes(searchLower)) ||
      (req.code?.toLowerCase().includes(searchLower)) ||
      (req.description?.toLowerCase().includes(searchLower))
    );
  });

  // Get selected party details
  const selectedPartyDetails = parties.find(party => party._id === selectedParty);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header with View Quotations Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1 style={{ 
          color: '#2c3e50', 
          fontSize: '28px', 
          fontWeight: '700',
          margin: 0
        }}>
          Create Quotation
        </h1>
        
        <button 
          onClick={() => {
            setShowViewQuotations(true);
            fetchAllQuotations();
          }}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background-color 0.3s ease',
            boxShadow: '0 2px 4px rgba(52, 152, 219, 0.3)'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
        >
          View Quotations
        </button>
      </div>

      {/* Main Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef'
      }}>
        {/* Header Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          marginBottom: '0'
        }}>
          {/* Left Side - Bill To */}
          <div>
            <h2 style={{
              marginBottom: '16px',
              color: '#2c3e50',
              fontSize: '20px',
              fontWeight: '600',
              borderBottom: '2px solid #3498db',
              paddingBottom: '8px'
            }}>Bill To</h2>
            <select 
              value={selectedParty} 
              onChange={(e) => setSelectedParty(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
                transition: 'border-color 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
            >
              <option value="">+ Add Party</option>
              {parties.map(party => (
                <option key={party._id} value={party._id}>
                  {party.partyName} {party.partyType ? `(${party.partyType})` : ''}
                </option>
              ))}
            </select>

            {selectedPartyDetails && (
              <div style={{
                marginTop: '15px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                <div style={{ marginBottom: '8px' }}><strong>Party:</strong> {selectedPartyDetails.partyName}</div>
                {selectedPartyDetails.mobileNumber && (
                  <div style={{ marginBottom: '8px' }}><strong>Mobile:</strong> {selectedPartyDetails.mobileNumber}</div>
                )}
                {selectedPartyDetails.email && (
                  <div style={{ marginBottom: '8px' }}><strong>Email:</strong> {selectedPartyDetails.email}</div>
                )}
                {selectedPartyDetails.billingAddress && (
                  <div style={{ marginBottom: '8px' }}><strong>Address:</strong> {selectedPartyDetails.billingAddress}</div>
                )}
                {selectedPartyDetails.gstin && (
                  <div><strong>GSTIN:</strong> {selectedPartyDetails.gstin}</div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Improved Quotation Details */}
          <div>
            <h2 style={{
              marginBottom: '16px',
              color: '#2c3e50',
              fontSize: '20px',
              fontWeight: '600',
              borderBottom: '2px solid #3498db',
              paddingBottom: '8px'
            }}>Quotation Details</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Quotation No</label>
                <input
                  type="text"
                  value={quotationHeader.quotationNo}
                  readOnly
                  style={{
                    padding: '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#f8f9fa',
                    color: '#6c757d',
                    cursor: 'not-allowed',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Valid For (days)</label>
                <input
                  type="number"
                  value={quotationHeader.validFor}
                  onChange={(e) => setQuotationHeader(prev => ({...prev, validFor: e.target.value}))}
                  style={{
                    padding: '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    transition: 'border-color 0.3s ease',
                    outline: 'none',
                    width: '100%'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  min="1"
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>PO No</label>
                <input
                  type="text"
                  value={quotationHeader.poNo}
                  onChange={(e) => setQuotationHeader(prev => ({...prev, poNo: e.target.value}))}
                  style={{
                    padding: '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    transition: 'border-color 0.3s ease',
                    outline: 'none',
                    width: '100%'
                  }}
                  placeholder="Enter PO No"
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Quotation Date</label>
                <input
                  type="date"
                  value={quotationHeader.quotationDate}
                  onChange={(e) => setQuotationHeader(prev => ({...prev, quotationDate: e.target.value}))}
                  style={{
                    padding: '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    transition: 'border-color 0.3s ease',
                    outline: 'none',
                    width: '100%'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Validity Date</label>
                <input
                  type="date"
                  value={quotationHeader.validityDate}
                  readOnly
                  style={{
                    padding: '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#f8f9fa',
                    color: '#6c757d',
                    cursor: 'not-allowed',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Section Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef'
      }}>
        <div>
          <h2 style={{
            marginBottom: '16px',
            color: '#2c3e50',
            fontSize: '20px',
            fontWeight: '600',
            borderBottom: '2px solid #3498db',
            paddingBottom: '8px'
          }}>Items & Services</h2>
          
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr>
                <th style={{
                  border: '1px solid #dee2e6',
                  padding: '16px 12px',
                  textAlign: 'left',
                  backgroundColor: '#2c3e50',
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>NO</th>
                <th style={{
                  border: '1px solid #dee2e6',
                  padding: '16px 12px',
                  textAlign: 'left',
                  backgroundColor: '#2c3e50',
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>ITEMS/SERVICES</th>
                <th style={{
                  border: '1px solid #dee2e6',
                  padding: '16px 12px',
                  textAlign: 'left',
                  backgroundColor: '#2c3e50',
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>QTY</th>
                <th style={{
                  border: '1px solid #dee2e6',
                  padding: '16px 12px',
                  textAlign: 'left',
                  backgroundColor: '#2c3e50',
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>PRICE/ITEM (₹)</th>
                <th style={{
                  border: '1px solid #dee2e6',
                  padding: '16px 12px',
                  textAlign: 'left',
                  backgroundColor: '#2c3e50',
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>DISCOUNT</th>
                <th style={{
                  border: '1px solid #dee2e6',
                  padding: '16px 12px',
                  textAlign: 'left',
                  backgroundColor: '#2c3e50',
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>TAX</th>
                <th style={{
                  border: '1px solid #dee2e6',
                  padding: '16px 12px',
                  textAlign: 'left',
                  backgroundColor: '#2c3e50',
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>AMOUNT (₹)</th>
                <th style={{
                  border: '1px solid #dee2e6',
                  padding: '16px 12px',
                  textAlign: 'left',
                  backgroundColor: '#2c3e50',
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {quotationData.items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <tr>
                    <td style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}>{index + 1}</td>
                    <td style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}>
                      <div>
                        <strong>{item.name}</strong>
                        {item.description && <div style={{
                          fontSize: '12px',
                          color: '#6c757d',
                          marginTop: '4px',
                          fontStyle: 'italic'
                        }}>{item.description}</div>}
                      </div>
                    </td>
                    <td style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="1"
                        style={{
                          width: '80px',
                          padding: '8px',
                          border: '2px solid #e9ecef',
                          borderRadius: '4px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3498db'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                      />
                      <span style={{
                        marginLeft: '8px',
                        color: '#6c757d',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>{item.unit}</span>
                    </td>
                    <td style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}>
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        style={{
                          width: '80px',
                          padding: '8px',
                          border: '2px solid #e9ecef',
                          borderRadius: '4px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3498db'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                      />
                    </td>
                    <td style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <input
                          type="number"
                          value={item.discount || ''}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          style={{
                            width: '80px',
                            padding: '8px',
                            border: '2px solid #e9ecef',
                            borderRadius: '4px',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.3s ease'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#3498db'}
                          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                        />
                        <select
                          value={item.discountType}
                          onChange={(e) => updateItem(index, 'discountType', e.target.value)}
                          style={{
                            padding: '8px',
                            border: '2px solid #e9ecef',
                            borderRadius: '4px',
                            fontSize: '12px',
                            backgroundColor: 'white',
                            outline: 'none',
                            transition: 'border-color 0.3s ease'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#3498db'}
                          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">₹</option>
                        </select>
                      </div>
                    </td>
                    <td style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}>
                      <select
                        value={item.tax}
                        onChange={(e) => updateItem(index, 'tax', parseFloat(e.target.value) || 0)}
                        style={{
                          padding: '8px',
                          border: '2px solid #e9ecef',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: 'white',
                          outline: 'none',
                          transition: 'border-color 0.3s ease',
                          width: '100%'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3498db'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                      >
                        {taxOptions.map((option, idx) => (
                          <option key={idx} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}>₹{(item.amount || 0).toFixed(2)}</td>
                    <td style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}>
                      <button 
                        onClick={() => removeItem(index)}
                        style={{
                          backgroundColor: hoverStates.removeButtons[index] ? '#c0392b' : '#e74c3c',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'background-color 0.3s ease'
                        }}
                        onMouseEnter={() => setHoverStates(prev => ({
                          ...prev,
                          removeButtons: { ...prev.removeButtons, [index]: true }
                        }))}
                        onMouseLeave={() => setHoverStates(prev => ({
                          ...prev,
                          removeButtons: { ...prev.removeButtons, [index]: false }
                        }))}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  {/* Description Row */}
                  <tr>
                    <td colSpan="8" style={{
                      border: '1px solid #dee2e6',
                      padding: '12px',
                      backgroundColor: '#f8f9fa'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#2c3e50',
                          minWidth: '100px'
                        }}>Description:</span>
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Enter item description..."
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '2px solid #e9ecef',
                            borderRadius: '6px',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            transition: 'border-color 0.3s ease',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#3498db'}
                          onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                        />
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <button 
            onClick={() => setShowAddItems(true)}
            style={{
              backgroundColor: hoverStates.addItem ? '#219a52' : '#27ae60',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: hoverStates.addItem ? '0 4px 8px rgba(39, 174, 96, 0.4)' : '0 2px 4px rgba(39, 174, 96, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '10px',
              transform: hoverStates.addItem ? 'translateY(-1px)' : 'none'
            }}
            onMouseEnter={() => setHoverStates(prev => ({ ...prev, addItem: true }))}
            onMouseLeave={() => setHoverStates(prev => ({ ...prev, addItem: false }))}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Add Item
          </button>
        </div>
      </div>

      {/* Summary Section Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '40px',
          marginTop: '0'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{
              marginBottom: '16px',
              color: '#2c3e50',
              fontSize: '20px',
              fontWeight: '600',
              borderBottom: '2px solid #3498db',
              paddingBottom: '8px'
            }}>Additional Information</h2>
            
            <div style={{ margin: '0' }}>
              <h3 style={{
                marginBottom: '12px',
                color: '#34495e',
                fontSize: '16px',
                fontWeight: '600'
              }}>Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  minHeight: '100px'
                }}
                rows="3"
                placeholder="Add any additional notes here..."
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
            
            <button style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.3s ease',
              textAlign: 'left',
              width: '100%'
            }} onClick={addAdditionalCharge}>
              + Add Additional Charges
            </button>
            
            <div style={{ margin: '0' }}>
              <h3 style={{
                marginBottom: '12px',
                color: '#34495e',
                fontSize: '16px',
                fontWeight: '600'
              }}>Terms and Conditions</h3>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  minHeight: '120px'
                }}
                rows="4"
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
            
            <div style={{
              marginTop: '30px',
              fontWeight: '600',
              color: '#2c3e50',
              fontSize: '14px',
              textAlign: 'center',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px dashed #dee2e6'
            }}>
              Authorized signatory for Global Marketing Solutions
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{
              marginBottom: '12px',
              color: '#34495e',
              fontSize: '16px',
              fontWeight: '600'
            }}>Summary</h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              <span>SUBTOTAL</span>
              <span>₹{quotationData.subtotal.toFixed(2)}</span>
            </div>

            {/* Additional Charges */}
            {additionalCharges.map((charge, index) => (
              <div key={charge.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                gap: '12px',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  placeholder="Charge description"
                  value={charge.description}
                  onChange={(e) => updateAdditionalCharge(index, 'description', e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease',
                    flex: '2'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
                <input
                  type="number"
                  value={charge.amount || ''}
                  onChange={(e) => updateAdditionalCharge(index, 'amount', parseFloat(e.target.value) || 0)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease',
                    flex: '1'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
                <button 
                  onClick={() => removeAdditionalCharge(index)}
                  style={{
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'background-color 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c0392b'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#e74c3c'}
                >
                  ×
                </button>
              </div>
            ))}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              <span>Taxable Amount</span>
              <span>₹{quotationData.taxableAmount.toFixed(2)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              color: '#e74c3c',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              <span>Discount</span>
              <span>- ₹{quotationData.discount.toFixed(2)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              <span>Tax</span>
              <span>₹{quotationData.tax.toFixed(2)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px'
            }}>
              <span>Additional Charges</span>
              <span>₹{quotationData.additionalCharges.toFixed(2)}</span>
            </div>

            <div style={{
              fontWeight: '700',
              fontSize: '18px',
              color: '#2c3e50',
              borderTop: '2px solid #2c3e50',
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '16px 0'
            }}>
              <span>Total Amount</span>
              <span>₹{quotationData.totalAmount.toFixed(2)}</span>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '24px',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={submitQuotation}
                disabled={isSubmitting}
                style={{
                  backgroundColor: isSubmitting ? '#95a5a6' : (hoverStates.submitButton ? '#219a52' : '#27ae60'),
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(39, 174, 96, 0.3)',
                  minWidth: '200px',
                  transform: hoverStates.submitButton && !isSubmitting ? 'translateY(-2px)' : 'none'
                }}
                onMouseEnter={() => !isSubmitting && setHoverStates(prev => ({ ...prev, submitButton: true }))}
                onMouseLeave={() => setHoverStates(prev => ({ ...prev, submitButton: false }))}
              >
                {isSubmitting ? 'Saving...' : 'Save Quotation'}
              </button>
              
              <button 
                onClick={downloadPDF}
                style={{
                  backgroundColor: hoverStates.downloadButton ? '#2980b9' : '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(52, 152, 219, 0.3)',
                  minWidth: '200px',
                  transform: hoverStates.downloadButton ? 'translateY(-2px)' : 'none'
                }}
                onMouseEnter={() => setHoverStates(prev => ({ ...prev, downloadButton: true }))}
                onMouseLeave={() => setHoverStates(prev => ({ ...prev, downloadButton: false }))}
              >
                Download PDF
              </button>
              
              <button 
                onClick={printQuotation}
                style={{
                  backgroundColor: hoverStates.printButton ? '#8e44ad' : '#9b59b6',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(155, 89, 182, 0.3)',
                  minWidth: '200px',
                  transform: hoverStates.printButton ? 'translateY(-2px)' : 'none'
                }}
                onMouseEnter={() => setHoverStates(prev => ({ ...prev, printButton: true }))}
                onMouseLeave={() => setHoverStates(prev => ({ ...prev, printButton: false }))}
              >
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Items Modal */}
      {showAddItems && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '0',
            borderRadius: '12px',
            width: '95%',
            maxWidth: '1100px',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px', fontWeight: '600' }}>Add Items to Quotation</h2>
              <button 
                onClick={() => {
                  setShowAddItems(false);
                  setSearchTerm('');
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '24px', 
                  cursor: 'pointer',
                  color: '#6c757d',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>
            
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e9ecef'
            }}>
              <input
                type="text"
                placeholder="Search items by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>

            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr>
                    <th style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      backgroundColor: '#34495e',
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '13px',
                      position: 'sticky',
                      top: 0
                    }}>ITEM NAME</th>
                    <th style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      backgroundColor: '#34495e',
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '13px',
                      position: 'sticky',
                      top: 0
                    }}>ITEM CODE</th>
                    <th style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      backgroundColor: '#34495e',
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '13px',
                      position: 'sticky',
                      top: 0
                    }}>DESCRIPTION</th>
                    <th style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      backgroundColor: '#34495e',
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '13px',
                      position: 'sticky',
                      top: 0
                    }}>SALES PRICE (₹)</th>
                    <th style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      backgroundColor: '#34495e',
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '13px',
                      position: 'sticky',
                      top: 0
                    }}>CURRENT STOCK</th>
                    <th style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      backgroundColor: '#34495e',
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '13px',
                      position: 'sticky',
                      top: 0
                    }}>UNIT</th>
                    <th style={{
                      border: '1px solid #dee2e6',
                      padding: '14px 12px',
                      textAlign: 'left',
                      backgroundColor: '#34495e',
                      fontWeight: '600',
                      color: 'white',
                      fontSize: '13px',
                      position: 'sticky',
                      top: 0
                    }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.length > 0 ? (
                    filteredRequirements.map((req, index) => (
                      <tr key={req._id || index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>
                          <strong>{req.itemName || req.name || 'Unnamed Item'}</strong>
                        </td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>{req.itemCode || req.code || '-'}</td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>{req.description || '-'}</td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>₹{req.salesPrice || req.price || '0.00'}</td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>{req.currentStock || '0'}</td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>{req.unit || 'PCS'}</td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>
                          <button 
                            onClick={() => addItemToQuotation(req)}
                            style={{
                              backgroundColor: '#27ae60',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500',
                              transition: 'background-color 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#219a52'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#27ae60'}
                          >
                            Add to Quote
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ 
                        border: '1px solid #dee2e6',
                        padding: '12px',
                        textAlign: 'left',
                        fontSize: '13px',
                       
                      }} colSpan="7">
                        {requirements.length === 0 ? 
                          'No requirements found in the system. Please add some items first.' : 
                          'No items match your search. Try different keywords.'
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '20px 24px',
              borderTop: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <button 
                onClick={() => {
                  setShowAddItems(false);
                  setSearchTerm('');
                }}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowAddItems(false);
                  setSearchTerm('');
                }}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#27ae60',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px',
              color: 'white'
            }}>
              ✓
            </div>
            
            <h2 style={{
              margin: '0 0 15px 0',
              color: '#2c3e50',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Quotation Saved Successfully!
            </h2>
            
            <p style={{
              margin: '0 0 25px 0',
              color: '#7f8c8d',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              Your quotation <strong>{savedQuotation?.quotationNo}</strong> has been saved successfully.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={() => setShowSuccessModal(false)}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.3s ease',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
              >
                Continue
              </button>
              
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  downloadPDF();
                }}
                style={{
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.3s ease',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#219a52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#27ae60'}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Quotations Modal */}
      {showViewQuotations && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '0',
            borderRadius: '12px',
            width: '95%',
            maxWidth: '1200px',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px', fontWeight: '600' }}>All Quotations</h2>
              <button 
                onClick={() => setShowViewQuotations(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '24px', 
                  cursor: 'pointer',
                  color: '#6c757d',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>
            
            <div style={{
              maxHeight: '500px',
              overflowY: 'auto',
              padding: '20px'
            }}>
              {allQuotations.length > 0 ? (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>Quotation No</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>Party Name</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>Date</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>Total Amount</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>Status</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allQuotations.map((quotation, index) => (
                      <tr key={quotation._id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>
                          <strong>{quotation.quotationNo}</strong>
                        </td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>
                          {quotation.partyDetails?.partyName || quotation.partyId?.partyName || 'N/A'}
                        </td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>
                          {new Date(quotation.quotationDate).toLocaleDateString()}
                        </td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>
                          ₹{quotation.summary?.totalAmount?.toFixed(2) || '0.00'}
                        </td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: 
                              quotation.status === 'draft' ? '#f39c12' :
                              quotation.status === 'sent' ? '#3498db' :
                              quotation.status === 'accepted' ? '#27ae60' :
                              quotation.status === 'rejected' ? '#e74c3c' : '#95a5a6',
                            color: 'white'
                          }}>
                            {quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1)}
                          </span>
                        </td>
                        <td style={{
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '13px'
                        }}>
                          <button 
                            onClick={() => {
                              // Implement view/edit functionality here
                              alert(`View/Edit quotation: ${quotation.quotationNo}`);
                            }}
                            style={{
                              backgroundColor: '#3498db',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              marginRight: '8px'
                            }}
                          >
                            View
                          </button>
                          <button 
                            onClick={() => {
                              // Implement download functionality here
                              alert(`Download quotation: ${quotation.quotationNo}`);
                            }}
                            style={{
                              backgroundColor: '#27ae60',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6c757d',
                  fontSize: '16px'
                }}>
                  No quotations found. Create your first quotation to see it here.
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '20px 24px',
              borderTop: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <button 
                onClick={() => setShowViewQuotations(false)}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotation;