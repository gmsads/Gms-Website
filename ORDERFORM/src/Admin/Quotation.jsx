// Import React and necessary hooks from React library
import React, { useState, useEffect } from 'react';
// Import axios for making HTTP requests to the backend API
import axios from 'axios';
// Import jsPDF for generating PDF documents
import jsPDF from 'jspdf';
// Import html2canvas for converting HTML content to canvas/images
import html2canvas from 'html2canvas';
// Import your logo and signature from assets folder
import companyLogo from '../assets/logo-1.png';
import companySignature from '../assets/sign.png';

// Configure the base URL for API requests
const API_BASE_URL = '/api';
// Create an axios instance with custom configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Main Quotation component function
const Quotation = () => {
  // State for storing list of parties/customers
  const [parties, setParties] = useState([]);
  // State for currently selected party ID
  const [selectedParty, setSelectedParty] = useState('');
  // State for storing product/service requirements/items
  const [requirements, setRequirements] = useState([]);
  // State to control visibility of "Add Items" modal
  const [showAddItems, setShowAddItems] = useState(false);
  // State for search term when filtering items
  const [searchTerm, setSearchTerm] = useState('');
  // State for additional notes on the quotation
  const [notes, setNotes] = useState('');
  // State for additional charges (shipping, taxes, etc.)
  const [additionalCharges, setAdditionalCharges] = useState([]);
  // State for terms and conditions
  const [terms, setTerms] = useState(`1) Payment should be Covered and Made to "GLOBAL MARKETING SOLUTIONS", AND BANK, BRANCH: Champagne, A/C: 9127000007166090, IFSCode:UTIB0001336`);
  // State to track if quotation is being submitted
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State to control success modal visibility
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // State to store saved quotation data
  const [savedQuotation, setSavedQuotation] = useState(null);
  // State for hover effects on buttons
  const [hoverStates, setHoverStates] = useState({
    addItem: false,
    submitButton: false,
    downloadButton: false,
    printButton: false,
    removeButtons: {}
  });
  // State to control visibility of "View Quotations" modal
  const [showViewQuotations, setShowViewQuotations] = useState(false);
  // State to store all quotations from the database
  const [allQuotations, setAllQuotations] = useState([]);
  // State to detect if user is on mobile device
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // State for selected quotation details
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  // State to control visibility of quotation details modal
  const [showQuotationDetails, setShowQuotationDetails] = useState(false);
  
  // State to check if images are loaded
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [signatureLoaded, setSignatureLoaded] = useState(false);
  // State for logo URL
  const [logoUrl, setLogoUrl] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(null);

  // Tax options configuration with rates and labels - Only GST 18%
  const taxOptions = [
    { value: 18, label: 'GST@18%', type: 'gst' }
  ];

  // State for quotation header information
  const [quotationHeader, setQuotationHeader] = useState({
    quotationNo: '',
    validFor: '10',
    poNo: '',
    quotationDate: new Date().toISOString().split('T')[0],
    validityDate: ''
  });

  // State for quotation data and calculations
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

  // Effect to preload images and convert to data URLs
  useEffect(() => {
    const preloadImages = async () => {
      try {
        // Preload logo
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = companyLogo;
        logoImg.onload = () => {
          console.log('Logo loaded successfully');
          setLogoLoaded(true);
          const canvas = document.createElement('canvas');
          canvas.width = logoImg.naturalWidth;
          canvas.height = logoImg.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(logoImg, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          setLogoUrl(dataUrl);
        };
        logoImg.onerror = () => {
          console.error('Failed to load logo');
          setLogoLoaded(false);
        };

        // Preload signature
        const signatureImg = new Image();
        signatureImg.crossOrigin = 'anonymous';
        signatureImg.src = companySignature;
        signatureImg.onload = () => {
          console.log('Signature loaded successfully');
          setSignatureLoaded(true);
          const canvas = document.createElement('canvas');
          canvas.width = signatureImg.naturalWidth;
          canvas.height = signatureImg.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(signatureImg, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          setSignatureUrl(dataUrl);
        };
        signatureImg.onerror = () => {
          console.error('Failed to load signature');
          setSignatureLoaded(false);
        };
      } catch (error) {
        console.error('Error preloading images:', error);
      }
    };

    preloadImages();
  }, []);

  // Effect to handle window resize and detect mobile devices
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to calculate validity date based on quotation date and validity period
  useEffect(() => {
    if (quotationHeader.quotationDate && quotationHeader.validFor) {
      const quotationDate = new Date(quotationHeader.quotationDate);
      const validityDate = new Date(quotationDate);
      validityDate.setDate(validityDate.getDate() + parseInt(quotationHeader.validFor));
      
      const formattedValidityDate = validityDate.toISOString().split('T')[0];
      setQuotationHeader(prev => ({ ...prev, validityDate: formattedValidityDate }));
    }
  }, [quotationHeader.quotationDate, quotationHeader.validFor]);

  // Effect to initialize quotation dates and fetch next quotation number
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

  // Function to fetch next quotation number from API
  const fetchNextQuotationNumber = async () => {
    try {
      const response = await api.get('/quotations/next-number');
      setQuotationHeader(prev => ({ ...prev, quotationNo: response.data.nextNumber }));
    } catch (error) {
      console.error('Error fetching next quotation number:', error);
      const fallbackNumber = `GMS${String(1).padStart(3, '0')}`;
      setQuotationHeader(prev => ({ ...prev, quotationNo: fallbackNumber }));
    }
  };

  // Function to fetch parties from API
  const fetchParties = async () => {
    try {
      const response = await api.get('/parties');
      setParties(response.data);
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  // Function to fetch requirements/items from API
  const fetchRequirements = async () => {
    try {
      const response = await api.get('/requirements');
      setRequirements(response.data || []);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setRequirements([]);
    }
  };

  // Effect to fetch parties and requirements when component mounts
  useEffect(() => {
    fetchParties();
    fetchRequirements();
  }, []);

  // Function to fetch all quotations from API
  const fetchAllQuotations = async () => {
    try {
      const response = await api.get('/quotations');
      setAllQuotations(response.data);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  // Function to calculate totals based on items and charges
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

  // Function to update item calculations (discount, tax, amount)
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

  // Function to add item to quotation from requirements
  const addItemToQuotation = (requirement) => {
    const newItem = {
      id: Date.now(),
      name: requirement.itemName || requirement.name || 'Unnamed Item',
      description: '',
      quantity: 1,
      price: requirement.salesPrice || requirement.price || 0,
      discount: 0,
      discountType: 'percentage',
      tax: 18,
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

  // Function to update item field value
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

  // Function to remove item from quotation
  const removeItem = (index) => {
    const updatedItems = quotationData.items.filter((_, i) => i !== index);
    setQuotationData(prev => ({ ...prev, items: updatedItems }));
    calculateTotals(updatedItems);
  };

  // Function to add additional charge row
  const addAdditionalCharge = () => {
    const newCharge = {
      id: Date.now(),
      description: '',
      amount: 0
    };
    setAdditionalCharges(prev => [...prev, newCharge]);
  };

  // Function to remove additional charge
  const removeAdditionalCharge = (index) => {
    const updatedCharges = additionalCharges.filter((_, i) => i !== index);
    setAdditionalCharges(updatedCharges);
    
    const totalAdditionalCharges = updatedCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
    setQuotationData(prev => ({ ...prev, additionalCharges: totalAdditionalCharges }));
    calculateTotals(quotationData.items);
  };

  // Function to update additional charge field
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

  // Function to submit quotation to backend
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
      
      // Reset form
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
      fetchNextQuotationNumber();
    } catch (error) {
      console.error('Error saving quotation:', error);
      alert(`Error saving quotation: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to convert imported image to base64 for PDF
  const convertImageToBase64 = (imgElement) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgElement.naturalWidth;
      canvas.height = imgElement.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElement, 0, 0);
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };

  // Function to download current quotation as PDF
  const downloadPDF = async () => {
    if (quotationData.items.length === 0 || !selectedParty) {
      alert('Please add items and select a party before downloading PDF');
      return;
    }

    try {
      const logoBase64 = logoUrl || '';
      const signatureBase64 = signatureUrl || '';

      const printContent = document.createElement('div');
      printContent.style.cssText = `
        width: 210mm;
        min-height: 297mm;
        padding: 15mm;
        background: white;
        color: black;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      `;

      const party = parties.find(p => p._id === selectedParty);
      
      const logoFallback = `<div style="height: 80px; width: 80px; background: #2c3e50; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: bold; font-size: 14px;">GMS</div>`;
      const signatureFallback = `<div style="height: 60px; display: flex; align-items: center; justify-content: center; color: #2c3e50; font-style: italic;">Signature</div>`;

      printContent.innerHTML = generateQuotationHTML(quotationHeader, party, quotationData.items, additionalCharges, notes, terms, logoBase64, signatureBase64);

      document.body.appendChild(printContent);
      
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(printContent);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`quotation_${quotationHeader.quotationNo}.pdf`);
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error creating PDF. Please try again.');
    }
  };

  // Function to generate quotation HTML for both PDF and View
  const generateQuotationHTML = (header, party, items, charges, notesText, termsText, logoBase64, signatureBase64) => {
    const logoFallback = `<div style="height: 80px; width: 80px; background: #2c3e50; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: bold; font-size: 14px;">GMS</div>`;
    const signatureFallback = `<div style="height: 60px; display: flex; align-items: center; justify-content: center; color: #2c3e50; font-style: italic;">Signature</div>`;

    return `
      <div style="font-family: Arial, sans-serif;">
        <!-- Header section -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; border-bottom: 2px solid #3498db; padding-bottom: 15px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center;">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Company Logo" style="height: 80px; width: auto; margin-right: 15px; border-radius: 8px; max-width: 150px; object-fit: contain;" />` : logoFallback}
              <div>
                <h1 style="margin: 0; color: #2c3e50; font-size: 24px; font-weight: bold;">GLOBAL MARKETING SOLUTIONS</h1>
                <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">One Stop Solution For Your Problem</p>
              </div>
            </div>
          </div>
          <div style="text-align: center; flex: 1;">
            <h2 style="margin: 5px 0 0 0; color: #2c3e50; font-size: 28px; font-weight: bold;">QUOTATION</h2>
          </div>
          <div style="flex: 1; text-align: right;"></div>
        </div>
        
        <!-- Quotation details section -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
          <div style="flex: 1;">
            <p style="margin: 5px 0; font-size: 14px;"><strong>Quotation No:</strong> ${header.quotationNo}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${header.quotationDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Valid Until:</strong> ${header.validityDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>PO No:</strong> ${header.poNo || 'N/A'}</p>
          </div>
          <div style="flex: 1; text-align: right;">
            <p style="margin: 5px 0; font-size: 14px;"><strong>GLOBAL MARKETING SOLUTIONS</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">Champagne Branch</p>
            <p style="margin: 5px 0; font-size: 14px;">A/C: 9127000007166090</p>
            <p style="margin: 5px 0; font-size: 14px;">IFSC: UTIB0001336</p>
          </div>
        </div>
        
        <!-- Party details section -->
        ${party ? `
          <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #3498db; padding-bottom: 5px; font-size: 16px;">Bill To:</h3>
            <p style="margin: 4px 0; font-size: 14px;"><strong>${party.partyName}</strong></p>
            ${party.mobileNumber ? `<p style="margin: 4px 0; font-size: 14px;">Mobile: ${party.mobileNumber}</p>` : ''}
            ${party.billingAddress ? `<p style="margin: 4px 0; font-size: 14px;">${party.billingAddress}</p>` : ''}
            ${party.gstin ? `<p style="margin: 4px 0; font-size: 14px;">GSTIN: ${party.gstin}</p>` : ''}
          </div>
        ` : ''}
        
        <!-- Items table -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px;">
          <thead>
            <tr style="background-color: #2c3e50; color: white;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px;">#</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px;">Item Description</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Qty</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 12px;">Unit</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px;">Price (₹)</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right; font-size: 12px;">Amount (₹)</th>
             </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">${index + 1}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">
                  <strong>${item.name}</strong>
                  ${item.description ? `<br><small style="color: #666; font-size: 11px;">${item.description}</small>` : ''}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">${item.quantity}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">${item.unit}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 12px;">₹${item.price.toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 12px;">₹${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <!-- Summary section -->
        <div style="display: flex; justify-content: flex-end; margin-top: 25px;">
          <div style="background: #f8f9fa; padding: 20px; border: 2px solid #3498db; border-radius: 8px; width: 300px;">
            <h3 style="margin-top: 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; font-size: 16px;">SUMMARY</h3>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px;">
              <span>Subtotal:</span>
              <span>₹${items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; color: #e74c3c; font-size: 13px;">
              <span>Discount:</span>
              <span>-₹${items.reduce((sum, item) => sum + (item.discountAmount || 0), 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px;">
              <span>Tax (18% GST):</span>
              <span>₹${items.reduce((sum, item) => sum + (item.taxAmount || 0), 0).toFixed(2)}</span>
            </div>
            ${charges.map(charge => charge.amount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px;">
                <span>${charge.description}:</span>
                <span>₹${parseFloat(charge.amount).toFixed(2)}</span>
              </div>
            ` : '').join('')}
            <hr style="border-top: 2px solid #2c3e50; margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #2c3e50;">
              <span>Total Amount:</span>
              <span>₹${(items.reduce((sum, item) => sum + (item.quantity * item.price), 0) - 
                items.reduce((sum, item) => sum + (item.discountAmount || 0), 0) + 
                items.reduce((sum, item) => sum + (item.taxAmount || 0), 0) + 
                charges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <!-- Terms and conditions section -->
        ${termsText ? `
          <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #3498db; padding-bottom: 5px; font-size: 16px;">Terms & Conditions:</h3>
            <p style="font-size: 12px; line-height: 1.5;">${termsText.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}
        
        <!-- Notes section -->
        ${notesText ? `
          <div style="margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #2c3e50; margin-bottom: 8px; font-size: 14px;">Notes:</h3>
            <p style="font-size: 12px;">${notesText}</p>
          </div>
        ` : ''}
        
        <!-- Footer section with signature -->
        <div style="margin-top: 40px; padding-top: 15px; border-top: 2px solid #3498db;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="text-align: center; flex: 1;">
              <p style="font-size: 14px; margin-bottom: 8px;">Thank you for your business!</p>
              <p style="font-size: 12px;"><strong>Authorized Signatory</strong><br>Global Marketing Solutions</p>
            </div>
            <div style="flex: 1; text-align: center;">
              ${signatureBase64 ? `<img src="${signatureBase64}" alt="Signature" style="max-height: 60px; max-width: 200px; object-fit: contain;" />` : signatureFallback}
            </div>
            <div style="flex: 1; text-align: right;">
              <div style="font-size: 10px; color: #95a5a6;">
                <p>GLOBAL MARKETING SOLUTIONS</p>
                <p>Champagne Branch</p>
                <p>Phone: +91 XXXXX XXXXX</p>
                <p>Email: info@globalmarketingsolutions.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Function to download specific quotation as PDF
  const downloadQuotationPDF = async (quotation) => {
    try {
      const logoBase64 = logoUrl || '';
      const signatureBase64 = signatureUrl || '';

      const printContent = document.createElement('div');
      printContent.style.cssText = `
        width: 210mm;
        min-height: 297mm;
        padding: 15mm;
        background: white;
        color: black;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      `;

      const party = quotation.partyDetails || quotation.partyId;
      
      printContent.innerHTML = generateQuotationHTML(
        quotation, 
        party, 
        quotation.items, 
        quotation.additionalCharges || [], 
        quotation.notes || '', 
        quotation.terms || '', 
        logoBase64, 
        signatureBase64
      );

      document.body.appendChild(printContent);
      
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(printContent);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`quotation_${quotation.quotationNo}.pdf`);
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error creating PDF. Please try again.');
    }
  };

  // Function to view quotation details in professional format
  const viewQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    setShowQuotationDetails(true);
  };

  // Function to print quotation
  const printQuotation = () => {
    if (quotationData.items.length === 0) {
      alert('Please add items to the quotation before printing');
      return;
    }

    if (!selectedParty) {
      alert('Please select a party before printing');
      return;
    }

    const printWindow = window.open('', '_blank');
    const party = parties.find(p => p._id === selectedParty);
    
    const logoDataUrl = logoUrl || '';
    const signatureDataUrl = signatureUrl || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation ${quotationHeader.quotationNo}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            color: #333;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${generateQuotationHTML(quotationHeader, party, quotationData.items, additionalCharges, notes, terms, logoDataUrl, signatureDataUrl)}
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; cursor: pointer; margin-right: 10px;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Filter requirements based on search term
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

  // Get selected party details for display
  const selectedPartyDetails = parties.find(party => party._id === selectedParty);

  // Mobile responsive styles
  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: isMobile ? '10px' : '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    fontSize: isMobile ? '14px' : '16px'
  };

  // Card style for consistent UI elements
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: isMobile ? '8px' : '12px',
    padding: isMobile ? '16px' : '24px',
    marginBottom: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    border: '1px solid #e9ecef'
  };

  // Reusable button style function
  const buttonStyle = (color) => ({
    backgroundColor: color,
    color: 'white',
    border: 'none',
    padding: isMobile ? '10px 16px' : '14px 28px',
    borderRadius: isMobile ? '6px' : '8px',
    cursor: 'pointer',
    fontSize: isMobile ? '13px' : '15px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    width: isMobile ? '100%' : 'auto',
    marginBottom: isMobile ? '8px' : '0'
  });

  // Main component return (JSX)
  return (
    <div style={containerStyle}>
      {/* Header section with title and view quotations button */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: '20px',
        gap: isMobile ? '12px' : '0'
      }}>
        {/* Company Logo and Title Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flex: 1
        }}>
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Company Logo" 
              style={{
                height: isMobile ? '50px' : '70px',
                width: 'auto',
                borderRadius: '8px',
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{
              height: isMobile ? '50px' : '70px',
              width: isMobile ? '50px' : '70px',
              background: '#2c3e50',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: isMobile ? '12px' : '14px'
            }}>
              GMS
            </div>
          )}
          <div>
            <h1 style={{ 
              color: '#2c3e50', 
              fontSize: isMobile ? '18px' : '22px', 
              fontWeight: '700',
              margin: 0
            }}>
              GLOBAL MARKETING SOLUTIONS
            </h1>
            <p style={{
              margin: '4px 0 0 0',
              color: '#7f8c8d',
              fontSize: isMobile ? '11px' : '13px'
            }}>
              One Stop Solution For Your Problem
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setShowViewQuotations(true);
            fetchAllQuotations();
          }}
          style={buttonStyle('#3498db')}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
        >
          View Quotations
        </button>
      </div>

      {/* Rest of the form - keeping the same as before */}
      {/* Main quotation form card */}
      <div style={cardStyle}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '20px' : '30px',
          marginBottom: '0'
        }}>
          {/* Left side - Bill To section */}
          <div>
            <h2 style={{
              marginBottom: '16px',
              color: '#2c3e50',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              borderBottom: '2px solid #3498db',
              paddingBottom: '8px'
            }}>Bill To</h2>
            
            <select 
              value={selectedParty} 
              onChange={(e) => setSelectedParty(e.target.value)}
              style={{
                width: '100%',
                padding: isMobile ? '10px 12px' : '12px 16px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: isMobile ? '13px' : '14px',
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
                fontSize: isMobile ? '13px' : '14px',
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

          {/* Right side - Quotation Details section */}
          <div>
            <h2 style={{
              marginBottom: '16px',
              color: '#2c3e50',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              borderBottom: '2px solid #3498db',
              paddingBottom: '8px'
            }}>Quotation Details</h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: isMobile ? '12px' : '16px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: isMobile ? '12px' : '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Quotation No</label>
                <input
                  type="text"
                  value={quotationHeader.quotationNo}
                  readOnly
                  style={{
                    padding: isMobile ? '8px 10px' : '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: isMobile ? '13px' : '14px',
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
                  fontSize: isMobile ? '12px' : '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Valid For (days)</label>
                <input
                  type="number"
                  value={quotationHeader.validFor}
                  onChange={(e) => setQuotationHeader(prev => ({...prev, validFor: e.target.value}))}
                  style={{
                    padding: isMobile ? '8px 10px' : '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: isMobile ? '13px' : '14px',
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
                  fontSize: isMobile ? '12px' : '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>PO No</label>
                <input
                  type="text"
                  value={quotationHeader.poNo}
                  onChange={(e) => setQuotationHeader(prev => ({...prev, poNo: e.target.value}))}
                  style={{
                    padding: isMobile ? '8px 10px' : '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: isMobile ? '13px' : '14px',
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
                  fontSize: isMobile ? '12px' : '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Quotation Date</label>
                <input
                  type="date"
                  value={quotationHeader.quotationDate}
                  onChange={(e) => setQuotationHeader(prev => ({...prev, quotationDate: e.target.value}))}
                  style={{
                    padding: isMobile ? '8px 10px' : '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: isMobile ? '13px' : '14px',
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
                  fontSize: isMobile ? '12px' : '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Validity Date</label>
                <input
                  type="date"
                  value={quotationHeader.validityDate}
                  readOnly
                  style={{
                    padding: isMobile ? '8px 10px' : '10px 12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: isMobile ? '13px' : '14px',
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

      {/* Items Section Card - Keeping the same as before */}
      <div style={cardStyle}>
        <div>
          <h2 style={{
            marginBottom: '16px',
            color: '#2c3e50',
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '600',
            borderBottom: '2px solid #3498db',
            paddingBottom: '8px'
          }}>Items & Services</h2>
          
          {/* Mobile-friendly items list */}
          {isMobile ? (
            <div style={{ marginBottom: '20px' }}>
              {quotationData.items.map((item, index) => (
                <div key={item.id} style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{item.name}</strong>
                      {item.description && (
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => removeItem(index)}
                      style={{
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div>Qty: {item.quantity} {item.unit}</div>
                    <div>Price: ₹{item.price.toFixed(2)}</div>
                    <div>Discount: {item.discount || 0}{item.discountType === 'percentage' ? '%' : '₹'}</div>
                    <div>Tax: {item.tax || 0}%</div>
                    <div style={{ gridColumn: '1 / -1', fontWeight: 'bold', marginTop: '8px' }}>
                      Amount: ₹{(item.amount || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Add description..."
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
                  <th style={{ border: '1px solid #dee2e6', padding: '16px 12px', textAlign: 'left', backgroundColor: '#2c3e50', fontWeight: '600', color: 'white', fontSize: '14px' }}>NO</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '16px 12px', textAlign: 'left', backgroundColor: '#2c3e50', fontWeight: '600', color: 'white', fontSize: '14px' }}>ITEMS/SERVICES</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '16px 12px', textAlign: 'left', backgroundColor: '#2c3e50', fontWeight: '600', color: 'white', fontSize: '14px' }}>QTY</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '16px 12px', textAlign: 'left', backgroundColor: '#2c3e50', fontWeight: '600', color: 'white', fontSize: '14px' }}>PRICE/ITEM (₹)</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '16px 12px', textAlign: 'left', backgroundColor: '#2c3e50', fontWeight: '600', color: 'white', fontSize: '14px' }}>DISCOUNT</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '16px 12px', textAlign: 'left', backgroundColor: '#2c3e50', fontWeight: '600', color: 'white', fontSize: '14px' }}>TAX</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '16px 12px', textAlign: 'left', backgroundColor: '#2c3e50', fontWeight: '600', color: 'white', fontSize: '14px' }}>AMOUNT (₹)</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '16px 12px', textAlign: 'left', backgroundColor: '#2c3e50', fontWeight: '600', color: 'white', fontSize: '14px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {quotationData.items.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>{index + 1}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>
                        <div>
                          <strong>{item.name}</strong>
                          {item.description && <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px', fontStyle: 'italic' }}>{item.description}</div>}
                        </div>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>
                        <input type="number" value={item.quantity || ''} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} min="1" style={{ width: '80px', padding: '8px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
                        <span style={{ marginLeft: '8px', color: '#6c757d', fontSize: '12px', fontWeight: '500' }}>{item.unit}</span>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>
                        <input type="number" value={item.price || ''} onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '8px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="number" value={item.discount || ''} onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '8px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
                          <select value={item.discountType} onChange={(e) => updateItem(index, 'discountType', e.target.value)} style={{ padding: '8px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef' }>
                            <option value="percentage">%</option>
                            <option value="fixed">₹</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>
                        <select value={item.tax} onChange={(e) => updateItem(index, 'tax', parseFloat(e.target.value) || 0)} style={{ padding: '8px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: '12px', backgroundColor: 'white', outline: 'none', width: '100%' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef' }>
                          {taxOptions.map((option, idx) => (<option key={idx} value={option.value}>{option.label}</option>))}
                        </select>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>₹{(item.amount || 0).toFixed(2)}</td>
                      <td style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>
                        <button onClick={() => removeItem(index)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>Remove</button>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="8" style={{ border: '1px solid #dee2e6', padding: '12px', backgroundColor: '#f8f9fa' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50', minWidth: '100px' }}>Description:</span>
                          <input type="text" value={item.description || ''} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Enter item description..." style={{ flex: 1, padding: '10px 12px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '14px', backgroundColor: 'white', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          <button onClick={() => setShowAddItems(true)} style={{ ...buttonStyle('#27ae60'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '18px' }}>+</span> Add Item
          </button>
        </div>
      </div>

      {/* Summary Section Card - Keeping the same as before */}
      <div style={cardStyle}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 400px',
          gap: isMobile ? '20px' : '40px',
          marginTop: '0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ marginBottom: '16px', color: '#2c3e50', fontSize: isMobile ? '18px' : '20px', fontWeight: '600', borderBottom: '2px solid #3498db', paddingBottom: '8px' }}>Additional Information</h2>
            
            <div style={{ margin: '0' }}>
              <h3 style={{ marginBottom: '12px', color: '#34495e', fontSize: isMobile ? '15px' : '16px', fontWeight: '600' }}>Notes</h3>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #e9ecef', borderRadius: '6px', resize: 'vertical', fontFamily: 'inherit', fontSize: isMobile ? '13px' : '14px', outline: 'none', minHeight: '100px' }} rows="3" placeholder="Add any additional notes here..." onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
            </div>
            
            <button onClick={addAdditionalCharge} style={buttonStyle('#6c757d')}>+ Add Additional Charges</button>
            
            <div style={{ margin: '0' }}>
              <h3 style={{ marginBottom: '12px', color: '#34495e', fontSize: isMobile ? '15px' : '16px', fontWeight: '600' }}>Terms and Conditions</h3>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #e9ecef', borderRadius: '6px', resize: 'vertical', fontFamily: 'inherit', fontSize: isMobile ? '13px' : '14px', outline: 'none', minHeight: '120px' }} rows="4" onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
            </div>
            
            <div style={{ marginTop: '30px', fontWeight: '600', color: '#2c3e50', fontSize: isMobile ? '13px' : '14px', textAlign: 'center', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px dashed #dee2e6' }}>
              Authorized signatory for Global Marketing Solutions
            </div>
          </div>

          <div style={{ backgroundColor: '#f8f9fa', padding: isMobile ? '16px' : '24px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <h3 style={{ marginBottom: '12px', color: '#34495e', fontSize: isMobile ? '15px' : '16px', fontWeight: '600' }}>Summary</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #dee2e6', fontSize: isMobile ? '13px' : '14px' }}>
              <span>SUBTOTAL</span>
              <span>₹{quotationData.subtotal.toFixed(2)}</span>
            </div>

            {additionalCharges.map((charge, index) => (
              <div key={charge.id} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', padding: '10px 0', gap: '8px', alignItems: isMobile ? 'stretch' : 'center' }}>
                <input type="text" placeholder="Charge description" value={charge.description} onChange={(e) => updateAdditionalCharge(index, 'description', e.target.value)} style={{ padding: '8px 12px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: isMobile ? '13px' : '14px', outline: 'none', flex: isMobile ? 'none' : '2' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" value={charge.amount || ''} onChange={(e) => updateAdditionalCharge(index, 'amount', parseFloat(e.target.value) || 0)} style={{ padding: '8px 12px', border: '2px solid #e9ecef', borderRadius: '4px', fontSize: isMobile ? '13px' : '14px', outline: 'none', flex: '1' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
                  <button onClick={() => removeAdditionalCharge(index)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #dee2e6', fontSize: isMobile ? '13px' : '14px' }}>
              <span>Taxable Amount</span>
              <span>₹{quotationData.taxableAmount.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #dee2e6', color: '#e74c3c', fontWeight: '500', fontSize: isMobile ? '13px' : '14px' }}>
              <span>Discount</span>
              <span>- ₹{quotationData.discount.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #dee2e6', fontSize: isMobile ? '13px' : '14px' }}>
              <span>Tax (18% GST)</span>
              <span>₹{quotationData.tax.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #dee2e6', fontSize: isMobile ? '13px' : '14px' }}>
              <span>Additional Charges</span>
              <span>₹{quotationData.additionalCharges.toFixed(2)}</span>
            </div>

            <div style={{ fontWeight: '700', fontSize: isMobile ? '16px' : '18px', color: '#2c3e50', borderTop: '2px solid #2c3e50', marginTop: '12px', display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
              <span>Total Amount</span>
              <span>₹{quotationData.totalAmount.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
              <button onClick={submitQuotation} disabled={isSubmitting} style={{ ...buttonStyle(isSubmitting ? '#95a5a6' : '#27ae60'), opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Saving...' : 'Save Quotation'}</button>
              <button onClick={downloadPDF} style={buttonStyle('#3498db')}>Download PDF</button>
              <button onClick={printQuotation} style={buttonStyle('#9b59b6')}>Print</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Items Modal - Keeping the same */}
      {showAddItems && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '10px' : '20px' }}>
          <div style={{ background: 'white', padding: '0', borderRadius: '12px', width: '95%', maxWidth: isMobile ? '100%' : '1100px', maxHeight: isMobile ? '90vh' : '85vh', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '16px' : '24px', borderBottom: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: isMobile ? '18px' : '20px', fontWeight: '600' }}>Add Items to Quotation</h2>
              <button onClick={() => { setShowAddItems(false); setSearchTerm(''); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6c757d', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            
            <div style={{ padding: isMobile ? '16px' : '20px 24px', borderBottom: '1px solid #e9ecef' }}>
              <input type="text" placeholder="Search items by name, code, or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: isMobile ? '10px 12px' : '12px 16px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: isMobile ? '13px' : '14px', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#3498db'} onBlur={(e) => e.target.style.borderColor = '#e9ecef'} />
            </div>

            <div style={{ maxHeight: isMobile ? '300px' : '400px', overflowY: 'auto' }}>
              {isMobile ? (
                <div style={{ padding: '16px' }}>
                  {filteredRequirements.length > 0 ? (
                    filteredRequirements.map((req, index) => (
                      <div key={req._id || index} style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '12px', marginBottom: '12px', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <div style={{ marginBottom: '8px' }}><strong style={{ fontSize: '14px' }}>{req.itemName || req.name || 'Unnamed Item'}</strong>{req.itemCode && <div style={{ fontSize: '12px', color: '#6c757d' }}>Code: {req.itemCode}</div>}</div>
                        {req.description && <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{req.description}</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '12px' }}>
                          <div>Price: ₹{req.salesPrice || req.price || '0.00'}</div>
                          <div>Stock: {req.currentStock || '0'}</div>
                          <div>Unit: {req.unit || 'PCS'}</div>
                        </div>
                        <button onClick={() => addItemToQuotation(req)} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', width: '100%' }}>Add to Quote</button>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d', fontSize: '14px' }}>
                      {requirements.length === 0 ? 'No requirements found in the system. Please add some items first.' : 'No items match your search. Try different keywords.'}
                    </div>
                  )}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>ITEM NAME</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>ITEM CODE</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>DESCRIPTION</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>SALES PRICE (₹)</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>CURRENT STOCK</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>UNIT</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequirements.length > 0 ? (
                      filteredRequirements.map((req, index) => (
                        <tr key={req._id || index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}><strong>{req.itemName || req.name || 'Unnamed Item'}</strong></td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>{req.itemCode || req.code || '-'}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>{req.description || '-'}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>₹{req.salesPrice || req.price || '0.00'}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>{req.currentStock || '0'}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>{req.unit || 'PCS'}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>
                            <button onClick={() => addItemToQuotation(req)} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>Add to Quote</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="7" style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>{requirements.length === 0 ? 'No requirements found in the system. Please add some items first.' : 'No items match your search. Try different keywords.'}</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: isMobile ? '16px' : '20px 24px', borderTop: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
              <button onClick={() => { setShowAddItems(false); setSearchTerm(''); }} style={buttonStyle('#6c757d')}>Cancel</button>
              <button onClick={() => { setShowAddItems(false); setSearchTerm(''); }} style={buttonStyle('#3498db')}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal - Keeping the same */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '10px' : '20px' }}>
          <div style={{ background: 'white', padding: isMobile ? '20px' : '30px', borderRadius: '12px', width: '90%', maxWidth: isMobile ? '100%' : '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ width: isMobile ? '50px' : '60px', height: isMobile ? '50px' : '60px', backgroundColor: '#27ae60', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: isMobile ? '24px' : '30px', color: 'white' }}>✓</div>
            <h2 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: isMobile ? '20px' : '24px', fontWeight: '600' }}>Quotation Saved Successfully!</h2>
            <p style={{ margin: '0 0 25px 0', color: '#7f8c8d', fontSize: isMobile ? '14px' : '16px', lineHeight: '1.5' }}>Your quotation <strong>{savedQuotation?.quotationNo}</strong> has been saved successfully.</p>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShowSuccessModal(false)} style={buttonStyle('#3498db')}>Continue</button>
              <button onClick={() => { setShowSuccessModal(false); downloadPDF(); }} style={buttonStyle('#27ae60')}>Download PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* View Quotations Modal */}
      {showViewQuotations && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '10px' : '20px' }}>
          <div style={{ background: 'white', padding: '0', borderRadius: '12px', width: '95%', maxWidth: isMobile ? '100%' : '1200px', maxHeight: isMobile ? '90vh' : '85vh', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '16px' : '24px', borderBottom: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: isMobile ? '18px' : '20px', fontWeight: '600' }}>All Quotations</h2>
              <button onClick={() => setShowViewQuotations(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6c757d', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            
            <div style={{ maxHeight: isMobile ? '400px' : '500px', overflowY: 'auto', padding: isMobile ? '12px' : '20px' }}>
              {allQuotations.length > 0 ? (
                isMobile ? (
                  <div>
                    {allQuotations.map((quotation, index) => (
                      <div key={quotation._id} style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '12px', marginBottom: '12px', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ fontSize: '14px' }}>{quotation.quotationNo}</strong>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>{quotation.partyDetails?.partyName || quotation.partyId?.partyName || 'N/A'}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '12px' }}>
                          <div>Date: {new Date(quotation.quotationDate).toLocaleDateString()}</div>
                          <div>Total: ₹{quotation.summary?.totalAmount?.toFixed(2) || '0.00'}</div>
                          <div>Status: <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '500', backgroundColor: quotation.status === 'draft' ? '#f39c12' : quotation.status === 'sent' ? '#3498db' : quotation.status === 'accepted' ? '#27ae60' : quotation.status === 'rejected' ? '#e74c3c' : '#95a5a6', color: 'white' }}>{quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1)}</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => viewQuotation(quotation)} style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', flex: 1 }}>View</button>
                          <button onClick={() => downloadQuotationPDF(quotation)} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', flex: 1 }}>Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>Quotation No</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>Party Name</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>Date</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>Total Amount</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>Status</th>
                        <th style={{ border: '1px solid #dee2e6', padding: '14px 12px', textAlign: 'left', backgroundColor: '#34495e', fontWeight: '600', color: 'white', fontSize: '13px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allQuotations.map((quotation, index) => (
                        <tr key={quotation._id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}><strong>{quotation.quotationNo}</strong></td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>{quotation.partyDetails?.partyName || quotation.partyId?.partyName || 'N/A'}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>{new Date(quotation.quotationDate).toLocaleDateString()}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>₹{quotation.summary?.totalAmount?.toFixed(2) || '0.00'}</td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: quotation.status === 'draft' ? '#f39c12' : quotation.status === 'sent' ? '#3498db' : quotation.status === 'accepted' ? '#27ae60' : quotation.status === 'rejected' ? '#e74c3c' : '#95a5a6', color: 'white' }}>{quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1)}</span>
                          </td>
                          <td style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left', fontSize: '13px' }}>
                            <button onClick={() => viewQuotation(quotation)} style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '8px' }}>View</button>
                            <button onClick={() => downloadQuotationPDF(quotation)} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Download</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d', fontSize: isMobile ? '14px' : '16px' }}>No quotations found. Create your first quotation to see it here.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: isMobile ? '16px' : '20px 24px', borderTop: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
              <button onClick={() => setShowViewQuotations(false)} style={buttonStyle('#3498db')}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Details Modal - Professional Layout with Logo and Signature */}
      {showQuotationDetails && selectedQuotation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: isMobile ? '10px' : '20px' }}>
          <div style={{ background: 'white', padding: '0', borderRadius: '12px', width: '95%', maxWidth: isMobile ? '100%' : '1100px', maxHeight: isMobile ? '90vh' : '85vh', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '16px' : '24px', borderBottom: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: isMobile ? '18px' : '20px', fontWeight: '600' }}>Quotation Details - {selectedQuotation.quotationNo}</h2>
              <button onClick={() => setShowQuotationDetails(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6c757d', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            
            <div style={{ maxHeight: isMobile ? '400px' : '500px', overflowY: 'auto', padding: isMobile ? '16px' : '24px' }}>
              {/* Professional Quotation Layout */}
              {(() => {
                const party = selectedQuotation.partyDetails || selectedQuotation.partyId;
                const logoDataUrl = logoUrl || '';
                const signatureDataUrl = signatureUrl || '';
                const logoFallback = '<div style="height: 70px; width: 70px; background: #2c3e50; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: bold; font-size: 12px;">GMS</div>';
                const signatureFallback = '<div style="height: 50px; display: flex; align-items: center; justify-content: center; color: #2c3e50; font-style: italic;">Signature</div>';
                
                return (
                  <div style={{ fontFamily: 'Arial, sans-serif' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', borderBottom: '2px solid #3498db', paddingBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {logoDataUrl ? 
                            <img src={logoDataUrl} alt="Company Logo" style={{ height: '70px', width: 'auto', marginRight: '15px', borderRadius: '6px', maxWidth: '120px', objectFit: 'contain' }} /> : 
                            <div dangerouslySetInnerHTML={{ __html: logoFallback }} />
                          }
                          <div>
                            <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '20px', fontWeight: 'bold' }}>GLOBAL MARKETING SOLUTIONS</h1>
                            <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '12px' }}>One Stop Solution For Your Problem</p>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '24px', fontWeight: 'bold' }}>QUOTATION</h2>
                      </div>
                      <div style={{ flex: 1 }}></div>
                    </div>
                    
                    {/* Quotation and Party Details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Quotation No:</strong> {selectedQuotation.quotationNo}</p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Date:</strong> {selectedQuotation.quotationDate}</p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Valid Until:</strong> {selectedQuotation.validityDate}</p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>PO No:</strong> {selectedQuotation.poNo || 'N/A'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>GLOBAL MARKETING SOLUTIONS</strong></p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}>Champagne Branch</p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}>A/C: 9127000007166090</p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}>IFSC: UTIB0001336</p>
                      </div>
                    </div>
                    
                    {/* Party Details */}
                    {party && (
                      <div style={{ marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <h3 style={{ color: '#2c3e50', marginBottom: '8px', borderBottom: '1px solid #3498db', paddingBottom: '5px', fontSize: '14px' }}>Bill To:</h3>
                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>{party.partyName}</strong></p>
                        {party.mobileNumber && <p style={{ margin: '4px 0', fontSize: '13px' }}>Mobile: {party.mobileNumber}</p>}
                        {party.billingAddress && <p style={{ margin: '4px 0', fontSize: '13px' }}>{party.billingAddress}</p>}
                        {party.gstin && <p style={{ margin: '4px 0', fontSize: '13px' }}>GSTIN: {party.gstin}</p>}
                      </div>
                    )}
                    
                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '15px 0', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>#</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Item Description</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Unit</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Price (₹)</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuotation.items.map((item, index) => (
                          <tr key={index}>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                              <strong>{item.name}</strong>
                              {item.description && <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{item.description}</div>}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{item.unit}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>₹{item.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Summary */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <div style={{ background: '#f8f9fa', padding: '15px', border: '2px solid #3498db', borderRadius: '6px', width: '280px' }}>
                        <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '8px', fontSize: '14px' }}>SUMMARY</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', fontSize: '12px' }}>
                          <span>Subtotal:</span>
                          <span>₹{selectedQuotation.summary?.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', color: '#e74c3c', fontSize: '12px' }}>
                          <span>Discount:</span>
                          <span>-₹{selectedQuotation.summary?.discount?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', fontSize: '12px' }}>
                          <span>Tax (18% GST):</span>
                          <span>₹{selectedQuotation.summary?.tax?.toFixed(2) || '0.00'}</span>
                        </div>
                        {selectedQuotation.additionalCharges?.map((charge, idx) => charge.amount > 0 && (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', fontSize: '12px' }}>
                            <span>{charge.description}:</span>
                            <span>₹{parseFloat(charge.amount).toFixed(2)}</span>
                          </div>
                        ))}
                        <hr style={{ borderTop: '2px solid #2c3e50', margin: '12px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', color: '#2c3e50' }}>
                          <span>Total Amount:</span>
                          <span>₹{selectedQuotation.summary?.totalAmount?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Terms */}
                    {selectedQuotation.terms && (
                      <div style={{ marginTop: '25px', padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <h3 style={{ color: '#2c3e50', marginBottom: '8px', borderBottom: '1px solid #3498db', paddingBottom: '5px', fontSize: '14px' }}>Terms & Conditions:</h3>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{selectedQuotation.terms}</p>
                      </div>
                    )}
                    
                    {/* Notes */}
                    {selectedQuotation.notes && (
                      <div style={{ marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                        <h3 style={{ color: '#2c3e50', marginBottom: '6px', fontSize: '13px' }}>Notes:</h3>
                        <p style={{ fontSize: '12px' }}>{selectedQuotation.notes}</p>
                      </div>
                    )}
                    
                    {/* Footer with Signature */}
                    <div style={{ marginTop: '35px', paddingTop: '12px', borderTop: '2px solid #3498db' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <p style={{ fontSize: '12px', marginBottom: '6px' }}>Thank you for your business!</p>
                          <p style={{ fontSize: '11px' }}><strong>Authorized Signatory</strong><br />Global Marketing Solutions</p>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          {signatureDataUrl ? 
                            <img src={signatureDataUrl} alt="Signature" style={{ maxHeight: '50px', maxWidth: '150px', objectFit: 'contain' }} /> : 
                            <div dangerouslySetInnerHTML={{ __html: signatureFallback }} />
                          }
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: '9px', color: '#95a5a6' }}>
                            <p>GLOBAL MARKETING SOLUTIONS</p>
                            <p>Champagne Branch</p>
                            <p>Phone: +91 XXXXX XXXXX</p>
                            <p>Email: info@globalmarketingsolutions.com</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: isMobile ? '16px' : '20px 24px', borderTop: '1px solid #e9ecef', backgroundColor: '#f8f9fa' }}>
              <button onClick={() => setShowQuotationDetails(false)} style={buttonStyle('#6c757d')}>Close</button>
              <button onClick={() => downloadQuotationPDF(selectedQuotation)} style={buttonStyle('#27ae60')}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotation;