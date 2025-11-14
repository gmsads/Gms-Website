// Import React and necessary hooks from React library
import React, { useState, useEffect } from 'react';
// Import axios for making HTTP requests to the backend API
import axios from 'axios';
// Import jsPDF for generating PDF documents
import jsPDF from 'jspdf';
// Import html2canvas for converting HTML content to canvas/images
import html2canvas from 'html2canvas';

// Configure the base URL for API requests
const API_BASE_URL = '/api';
// Create an axios instance with custom configuration
const api = axios.create({
  baseURL: API_BASE_URL, // Set base URL for all requests
  timeout: 10000, // Set timeout to 10 seconds
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
    addItem: false, // Hover state for add item button
    submitButton: false, // Hover state for submit button
    downloadButton: false, // Hover state for download button
    printButton: false, // Hover state for print button
    removeButtons: {} // Hover states for remove buttons (dynamic)
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
  // State for company logo - using your specific image
  const [companyLogo] = useState('/images/Logo GMS.png');

  // Tax options configuration with rates and labels - Only GST 18%
  const taxOptions = [
    { value: 18, label: 'GST@18%', type: 'gst' }
  ];

  // State for quotation header information
  const [quotationHeader, setQuotationHeader] = useState({
    quotationNo: '', // Quotation number
    validFor: '10', // Validity period in days
    poNo: '', // Purchase order number
    quotationDate: new Date().toISOString().split('T')[0], // Current date
    validityDate: '' // Calculated validity date
  });

  // State for quotation data and calculations
  const [quotationData, setQuotationData] = useState({
    items: [], // Array of quotation items
    subtotal: 0, // Total before discounts and taxes
    discount: 0, // Total discount amount
    tax: 0, // Total tax amount
    taxableAmount: 0, // Amount subject to tax
    totalAmount: 0, // Final total amount
    additionalCharges: 0, // Sum of additional charges
    autoRoundOff: 0 // Auto round off amount
  });

  // Effect to handle window resize and detect mobile devices
  useEffect(() => {
    // Function to handle window resize
    const handleResize = () => {
      // Check if window width is less than 768px (mobile)
      setIsMobile(window.innerWidth < 768);
    };

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    // Cleanup: remove event listener when component unmounts
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array means this runs only on mount/unmount

  // Effect to calculate validity date based on quotation date and validity period
  useEffect(() => {
    // Check if both quotation date and validity period are available
    if (quotationHeader.quotationDate && quotationHeader.validFor) {
      // Create Date object from quotation date
      const quotationDate = new Date(quotationHeader.quotationDate);
      // Create new Date object for validity date
      const validityDate = new Date(quotationDate);
      // Add validity period days to the quotation date
      validityDate.setDate(validityDate.getDate() + parseInt(quotationHeader.validFor));
      
      // Format validity date as YYYY-MM-DD
      const formattedValidityDate = validityDate.toISOString().split('T')[0];
      // Update quotation header with calculated validity date
      setQuotationHeader(prev => ({ ...prev, validityDate: formattedValidityDate }));
    }
  }, [quotationHeader.quotationDate, quotationHeader.validFor]); // Run when these values change

  // Effect to initialize quotation dates and fetch next quotation number
  useEffect(() => {
    // Get current date
    const today = new Date();
    // Create validity date (10 days from today)
    const validityDate = new Date(today);
    validityDate.setDate(validityDate.getDate() + 10);
    
    // Set initial quotation header values
    setQuotationHeader(prev => ({
      ...prev,
      quotationDate: today.toISOString().split('T')[0], // Today's date
      validityDate: validityDate.toISOString().split('T')[0] // Validity date
    }));

    // Fetch next available quotation number
    fetchNextQuotationNumber();
  }, []); // Run only once when component mounts

  // Function to fetch next quotation number from API
  const fetchNextQuotationNumber = async () => {
    try {
      // Make API request to get next quotation number
      const response = await api.get('/quotations/next-number');
      // Update quotation header with new number
      setQuotationHeader(prev => ({ ...prev, quotationNo: response.data.nextNumber }));
    } catch (error) {
      // Log error if API call fails
      console.error('Error fetching next quotation number:', error);
      // Generate fallback quotation number
      const fallbackNumber = `GMS${String(1).padStart(3, '0')}`;
      // Use fallback number
      setQuotationHeader(prev => ({ ...prev, quotationNo: fallbackNumber }));
    }
  };

  // Effect to fetch parties and requirements when component mounts
  useEffect(() => {
    fetchParties(); // Fetch parties list
    fetchRequirements(); // Fetch requirements/items list
  }, []); // Run only once when component mounts

  // Function to fetch parties from API
  const fetchParties = async () => {
    try {
      // Make API request to get parties
      const response = await api.get('/parties');
      // Update parties state with response data
      setParties(response.data);
    } catch (error) {
      // Log error if API call fails
      console.error('Error fetching parties:', error);
    }
  };

  // Function to fetch requirements/items from API
  const fetchRequirements = async () => {
    try {
      // Make API request to get requirements
      const response = await api.get('/requirements');
      // Update requirements state with response data (or empty array if null)
      setRequirements(response.data || []);
    } catch (error) {
      // Log error if API call fails
      console.error('Error fetching requirements:', error);
      // Set empty array if error occurs
      setRequirements([]);
    }
  };

  // Function to fetch all quotations from API
  const fetchAllQuotations = async () => {
    try {
      // Make API request to get all quotations
      const response = await api.get('/quotations');
      // Update allQuotations state with response data
      setAllQuotations(response.data);
    } catch (error) {
      // Log error if API call fails
      console.error('Error fetching quotations:', error);
    }
  };

  // Function to calculate totals based on items and charges
  const calculateTotals = (itemsList) => {
    // Calculate subtotal (sum of quantity * price for all items)
    const subtotal = itemsList.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    // Calculate total discount amount
    const totalDiscount = itemsList.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    // Calculate total tax amount
    const totalTax = itemsList.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    // Calculate taxable amount (subtotal - discount)
    const taxableAmount = subtotal - totalDiscount;
    // Calculate total amount (taxable + tax + additional charges)
    const totalAmount = taxableAmount + totalTax + quotationData.additionalCharges;

    // Update quotation data with calculated values
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
    // Get quantity and price (default to 0 if undefined)
    const quantity = item.quantity || 0;
    const price = item.price || 0;
    
    // Calculate discount amount based on discount type
    const discountAmount = item.discountType === 'percentage' 
      ? (quantity * price * (item.discount || 0) / 100) // Percentage discount
      : (item.discount || 0); // Fixed amount discount

    // Calculate taxable amount (after discount)
    const taxableAmount = (quantity * price) - discountAmount;

    // Calculate tax amount based on tax type
    let taxAmount = 0;
    if (item.taxType === 'percentage') {
      taxAmount = taxableAmount * (item.tax || 0) / 100; // Percentage tax
    } else {
      taxAmount = item.tax || 0; // Fixed tax amount
    }

    // Calculate final amount (taxable amount + tax)
    const amount = taxableAmount + taxAmount;

    // Update item with calculated values
    item.discountAmount = discountAmount;
    item.taxAmount = taxAmount;
    item.amount = amount;

    // Return updated item
    return item;
  };

  // Function to add item to quotation from requirements
  const addItemToQuotation = (requirement) => {
    // Create new item object
    const newItem = {
      id: Date.now(), // Unique ID using timestamp
      name: requirement.itemName || requirement.name || 'Unnamed Item', // Item name
      description: '', // Initialize empty description
      quantity: 1, // Default quantity
      price: requirement.salesPrice || requirement.price || 0, // Item price
      discount: 0, // Default discount
      discountType: 'percentage', // Default discount type
      tax: 18, // Default tax set to 18% GST
      taxType: 'percentage', // Default tax type
      discountAmount: 0, // Initialize discount amount
      taxAmount: 0, // Initialize tax amount
      amount: requirement.salesPrice || requirement.price || 0, // Initial amount
      unit: requirement.unit || 'PCS' // Unit of measurement
    };

    // Calculate item amounts
    updateItemCalculations(newItem);

    // Add new item to quotation items array
    const updatedItems = [...quotationData.items, newItem];
    // Update quotation data with new items array
    setQuotationData(prev => ({ ...prev, items: updatedItems }));
    // Recalculate totals with new items
    calculateTotals(updatedItems);
    // Close add items modal
    setShowAddItems(false);
    // Clear search term
    setSearchTerm('');
  };

  // Function to update item field value
  const updateItem = (index, field, value) => {
    // Create copy of current items array
    const updatedItems = [...quotationData.items];
    // Get the item to update
    let item = updatedItems[index];
    
    // Handle NaN values for numbers
    if (typeof value === 'number' && isNaN(value)) {
      value = 0; // Set to 0 if NaN
    }
    
    // Update the specific field
    item[field] = value;
    // Recalculate item amounts
    item = updateItemCalculations(item);

    // Update quotation data with modified items
    setQuotationData(prev => ({ ...prev, items: updatedItems }));
    // Recalculate totals
    calculateTotals(updatedItems);
  };

  // Function to remove item from quotation
  const removeItem = (index) => {
    // Filter out the item at specified index
    const updatedItems = quotationData.items.filter((_, i) => i !== index);
    // Update quotation data with filtered items
    setQuotationData(prev => ({ ...prev, items: updatedItems }));
    // Recalculate totals
    calculateTotals(updatedItems);
  };

  // Function to add additional charge row
  const addAdditionalCharge = () => {
    // Create new charge object
    const newCharge = {
      id: Date.now(), // Unique ID
      description: '', // Empty description
      amount: 0 // Zero amount
    };
    // Add new charge to additional charges array
    setAdditionalCharges(prev => [...prev, newCharge]);
  };

  // Function to remove additional charge
  const removeAdditionalCharge = (index) => {
    // Filter out the charge at specified index
    const updatedCharges = additionalCharges.filter((_, i) => i !== index);
    // Update additional charges state
    setAdditionalCharges(updatedCharges);
    
    // Calculate total of remaining additional charges
    const totalAdditionalCharges = updatedCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
    // Update quotation data with new additional charges total
    setQuotationData(prev => ({ ...prev, additionalCharges: totalAdditionalCharges }));
    // Recalculate totals
    calculateTotals(quotationData.items);
  };

  // Function to update additional charge field
  const updateAdditionalCharge = (index, field, value) => {
    // Create copy of current additional charges
    const updatedCharges = [...additionalCharges];
    
    // Handle invalid amount values
    if (field === 'amount' && (isNaN(value) || value === '')) {
      value = 0; // Set to 0 if invalid
    }
    
    // Update the specific field
    updatedCharges[index][field] = value;
    // Update additional charges state
    setAdditionalCharges(updatedCharges);
    
    // Calculate total of all additional charges
    const totalAdditionalCharges = updatedCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
    // Update quotation data with new total
    setQuotationData(prev => ({ ...prev, additionalCharges: totalAdditionalCharges }));
    // Recalculate totals
    calculateTotals(quotationData.items);
  };

  // Function to submit quotation to backend
  const submitQuotation = async () => {
    // Validate that a party is selected
    if (!selectedParty) {
      alert('Please select a party');
      return; // Stop execution if no party selected
    }

    // Validate that at least one item is added
    if (quotationData.items.length === 0) {
      alert('Please add at least one item to the quotation');
      return; // Stop execution if no items
    }

    // Set submitting state to true (shows loading)
    setIsSubmitting(true);

    // Prepare quotation data for API
    const quotationPayload = {
      ...quotationHeader, // Spread quotation header fields
      partyId: selectedParty, // Selected party ID
      partyDetails: parties.find(party => party._id === selectedParty), // Party details
      items: quotationData.items, // Quotation items
      additionalCharges, // Additional charges
      notes, // Notes
      terms, // Terms and conditions
      summary: { // Calculated summary
        subtotal: quotationData.subtotal,
        discount: quotationData.discount,
        tax: quotationData.tax,
        taxableAmount: quotationData.taxableAmount,
        additionalCharges: quotationData.additionalCharges,
        totalAmount: quotationData.totalAmount,
        autoRoundOff: quotationData.autoRoundOff
      },
      status: 'draft', // Default status
      createdAt: new Date().toISOString() // Current timestamp
    };

    try {
      // Make API request to save quotation
      const response = await api.post('/quotations', quotationPayload);
      // Store saved quotation
      setSavedQuotation(response.data);
      // Show success modal
      setShowSuccessModal(true);
      // Log success
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
      // Log error and show alert
      console.error('Error saving quotation:', error);
      alert(`Error saving quotation: ${error.response?.data?.message || error.message}`);
    } finally {
      // Reset submitting state regardless of success/failure
      setIsSubmitting(false);
    }
  };

  // Function to download current quotation as PDF
  const downloadPDF = async () => {
    // Validate that items are added and party is selected
    if (quotationData.items.length === 0 || !selectedParty) {
      alert('Please add items and select a party before downloading PDF');
      return; // Stop execution if validation fails
    }

    try {
      // Create a div element for PDF content
      const printContent = document.createElement('div');
      // Apply styles for PDF printing
      printContent.style.cssText = `
        width: 210mm;
        min-height: 297mm;
        padding: 15mm;
        background: white;
        color: black;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      `;

      // Find selected party details
      const party = parties.find(p => p._id === selectedParty);
      
      // Create HTML content for PDF with your specific image as logo
      printContent.innerHTML = `
        <!-- Header section with your logo and title -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; border-bottom: 2px solid #3498db; padding-bottom: 15px;">
          <!-- Logo section with your image -->
          <div style="flex: 1;">
            <div style="display: flex; align-items: center;">
              <img src="${companyLogo}" alt="Company Logo" style="height: 80px; width: auto; margin-right: 15px; border-radius: 8px;" />
              <div>
                <h1 style="margin: 0; color: #2c3e50; font-size: 24px; font-weight: bold;">GLOBAL MARKETING SOLUTIONS</h1>
                <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">One Stop Solution For Your Problem</p>
              </div>
            </div>
          </div>
          <!-- Title section -->
          <div style="text-align: center; flex: 1;">
            <h2 style="margin: 5px 0 0 0; color: #2c3e50; font-size: 28px; font-weight: bold;">QUOTATION</h2>
          </div>
          <!-- Empty section for layout balance -->
          <div style="flex: 1; text-align: right;">
          </div>
        </div>
        
        <!-- Quotation details section -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
          <!-- Left side: Quotation information -->
          <div style="flex: 1;">
            <p style="margin: 5px 0; font-size: 14px;"><strong>Quotation No:</strong> ${quotationHeader.quotationNo}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${quotationHeader.quotationDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Valid Until:</strong> ${quotationHeader.validityDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>PO No:</strong> ${quotationHeader.poNo || 'N/A'}</p>
          </div>
          <!-- Right side: Company bank details -->
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
            ${quotationData.items.map((item, index) => `
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
              <span>₹${quotationData.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; color: #e74c3c; font-size: 13px;">
              <span>Discount:</span>
              <span>-₹${quotationData.discount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px;">
              <span>Tax (18% GST):</span>
              <span>₹${quotationData.tax.toFixed(2)}</span>
            </div>
            ${additionalCharges.map(charge => charge.amount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px;">
                <span>${charge.description}:</span>
                <span>₹${parseFloat(charge.amount).toFixed(2)}</span>
              </div>
            ` : '').join('')}
            <hr style="border-top: 2px solid #2c3e50; margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #2c3e50;">
              <span>Total Amount:</span>
              <span>₹${quotationData.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <!-- Terms and conditions section -->
        ${terms ? `
          <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #3498db; padding-bottom: 5px; font-size: 16px;">Terms & Conditions:</h3>
            <p style="font-size: 12px; line-height: 1.5;">${terms.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}
        
        <!-- Notes section -->
        ${notes ? `
          <div style="margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #2c3e50; margin-bottom: 8px; font-size: 14px;">Notes:</h3>
            <p style="font-size: 12px;">${notes}</p>
          </div>
        ` : ''}
        
        <!-- Footer section -->
        <div style="margin-top: 40px; text-align: center; color: #7f8c8d; padding-top: 15px; border-top: 2px solid #3498db;">
          <p style="font-size: 14px; margin-bottom: 8px;">Thank you for your business!</p>
          <p style="font-size: 12px;"><strong>Authorized Signatory</strong><br>Global Marketing Solutions</p>
          <div style="margin-top: 15px; font-size: 10px; color: #95a5a6;">
            <p>GLOBAL MARKETING SOLUTIONS • Champagne Branch</p>
            <p>Phone: +91 XXXXX XXXXX • Email: info@globalmarketingsolutions.com</p>
          </div>
        </div>
      `;

      // Add the content to document body temporarily
      document.body.appendChild(printContent);
      
      // Convert HTML content to canvas
      const canvas = await html2canvas(printContent, {
        scale: 2, // High resolution for better print quality
        useCORS: true, // Allow cross-origin images
        logging: false, // Disable console logging
        allowTaint: true // Allow tainted images
      });
      
      // Remove temporary element from document
      document.body.removeChild(printContent);
      
      // Convert canvas to image data URL
      const imgData = canvas.toDataURL('image/png');
      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // Calculate height to maintain aspect ratio
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      // Download PDF with quotation number in filename
      pdf.save(`quotation_${quotationHeader.quotationNo}.pdf`);
      
    } catch (error) {
      // Log error and show alert
      console.error('PDF Generation Error:', error);
      alert('Error creating PDF. Please try again.');
    }
  };

  // Function to download specific quotation as PDF
  const downloadQuotationPDF = async (quotation) => {
    try {
      // Create div element for PDF content
      const printContent = document.createElement('div');
      // Apply PDF styles
      printContent.style.cssText = `
        width: 210mm;
        min-height: 297mm;
        padding: 15mm;
        background: white;
        color: black;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
      `;

      // Get party details from quotation
      const party = quotation.partyDetails || quotation.partyId;
      
      // Create HTML content with your specific image as logo
      printContent.innerHTML = `
        <!-- Header with your logo -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; border-bottom: 2px solid #3498db; padding-bottom: 15px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center;">
              <img src="${companyLogo}" alt="Company Logo" style="height: 80px; width: auto; margin-right: 15px; border-radius: 8px;" />
              <div>
                <h1 style="margin: 0; color: #2c3e50; font-size: 24px; font-weight: bold;">GLOBAL MARKETING SOLUTIONS</h1>
                <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">One Stop Solution For Your Problem</p>
              </div>
            </div>
          </div>
          <div style="text-align: center; flex: 1;">
            <h2 style="margin: 5px 0 0 0; color: #2c3e50; font-size: 28px; font-weight: bold;">QUOTATION</h2>
          </div>
          <div style="flex: 1; text-align: right;">
          </div>
        </div>
        
        <!-- Quotation details -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
          <div style="flex: 1;">
            <p style="margin: 5px 0; font-size: 14px;"><strong>Quotation No:</strong> ${quotation.quotationNo}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${quotation.quotationDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Valid Until:</strong> ${quotation.validityDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>PO No:</strong> ${quotation.poNo || 'N/A'}</p>
          </div>
          <div style="flex: 1; text-align: right;">
            <p style="margin: 5px 0; font-size: 14px;"><strong>GLOBAL MARKETING SOLUTIONS</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">Champagne Branch</p>
            <p style="margin: 5px 0; font-size: 14px;">A/C: 9127000007166090</p>
            <p style="margin: 5px 0; font-size: 14px;">IFSC: UTIB0001336</p>
          </div>
        </div>
        
        <!-- Party details -->
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
            ${quotation.items.map((item, index) => `
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
              <span>₹${quotation.summary?.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; color: #e74c3c; font-size: 13px;">
              <span>Discount:</span>
              <span>-₹${quotation.summary?.discount?.toFixed(2) || '0.00'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px;">
              <span>Tax (18% GST):</span>
              <span>₹${quotation.summary?.tax?.toFixed(2) || '0.00'}</span>
            </div>
            ${quotation.additionalCharges?.map(charge => charge.amount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px;">
                <span>${charge.description}:</span>
                <span>₹${parseFloat(charge.amount).toFixed(2)}</span>
              </div>
            ` : '').join('')}
            <hr style="border-top: 2px solid #2c3e50; margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #2c3e50;">
              <span>Total Amount:</span>
              <span>₹${quotation.summary?.totalAmount?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>
        
        <!-- Terms and conditions -->
        ${quotation.terms ? `
          <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #3498db; padding-bottom: 5px; font-size: 16px;">Terms & Conditions:</h3>
            <p style="font-size: 12px; line-height: 1.5;">${quotation.terms.replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}
        
        <!-- Notes -->
        ${quotation.notes ? `
          <div style="margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <h3 style="color: #2c3e50; margin-bottom: 8px; font-size: 14px;">Notes:</h3>
            <p style="font-size: 12px;">${quotation.notes}</p>
          </div>
        ` : ''}
        
        <!-- Footer -->
        <div style="margin-top: 40px; text-align: center; color: #7f8c8d; padding-top: 15px; border-top: 2px solid #3498db;">
          <p style="font-size: 14px; margin-bottom: 8px;">Thank you for your business!</p>
          <p style="font-size: 12px;"><strong>Authorized Signatory</strong><br>Global Marketing Solutions</p>
          <div style="margin-top: 15px; font-size: 10px; color: #95a5a6;">
            <p>GLOBAL MARKETING SOLUTIONS • Champagne Branch</p>
            <p>Phone: +91 XXXXX XXXXX • Email: info@globalmarketingsolutions.com</p>
          </div>
        </div>
      `;

      // Add to document and convert to PDF
      document.body.appendChild(printContent);
      
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      document.body.removeChild(printContent);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`quotation_${quotation.quotationNo}.pdf`);
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error creating PDF. Please try again.');
    }
  };

  // Function to view quotation details
  const viewQuotation = (quotation) => {
    // Set selected quotation
    setSelectedQuotation(quotation);
    // Show quotation details modal
    setShowQuotationDetails(true);
  };

  // Function to print quotation
  const printQuotation = () => {
    // Validate that items are added
    if (quotationData.items.length === 0) {
      alert('Please add items to the quotation before printing');
      return;
    }

    // Validate that party is selected
    if (!selectedParty) {
      alert('Please select a party before printing');
      return;
    }

    // Create new window for printing
    const printWindow = window.open('', '_blank');
    // Find selected party details
    const party = parties.find(p => p._id === selectedParty);
    
    // Write HTML content to print window with your logo
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation ${quotationHeader.quotationNo}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 15px; 
            color: #333;
            font-size: 12px;
          }
          .header { 
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #3498db; 
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .logo-container {
            flex: 1;
            display: flex;
            align-items: center;
          }
          .logo {
            height: 70px;
            width: auto;
            margin-right: 12px;
            border-radius: 6px;
          }
          .company-info {
            flex: 1;
          }
          .company-name { 
            font-size: 20px; 
            font-weight: bold; 
            color: #2c3e50;
            margin: 0;
          }
          .company-tagline {
            font-size: 12px;
            color: #7f8c8d;
            margin: 3px 0 0 0;
          }
          .title-container {
            text-align: center;
            flex: 1;
          }
          .quotation-title { 
            font-size: 24px; 
            color: #2c3e50;
            font-weight: bold;
            margin: 0;
          }
          .details-section { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 15px;
          }
          .party-details, .quotation-details { 
            width: 48%; 
          }
          .party-details {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e9ecef;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
            font-size: 11px;
          }
          th { 
            background-color: #2c3e50; 
            color: white; 
            padding: 8px; 
            text-align: left;
            border: 1px solid #ddd;
          }
          td { 
            padding: 6px; 
            border: 1px solid #ddd;
          }
          .summary { 
            float: right; 
            width: 280px; 
            border: 2px solid #3498db; 
            padding: 15px; 
            background-color: #f8f9fa;
            border-radius: 6px;
            font-size: 11px;
          }
          .total { 
            font-weight: bold; 
            font-size: 14px; 
            border-top: 2px solid #2c3e50; 
            padding-top: 8px;
            color: #2c3e50;
          }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            color: #7f8c8d;
            padding-top: 12px;
            border-top: 2px solid #3498db;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <!-- Header with your logo -->
        <div class="header">
          <div class="logo-container">
            <img src="${companyLogo}" alt="Company Logo" class="logo" />
            <div class="company-info">
              <h1 class="company-name">GLOBAL MARKETING SOLUTIONS</h1>
              <p class="company-tagline">One Stop Solution For Your Problem</p>
            </div>
          </div>
          <div class="title-container">
            <div class="quotation-title">QUOTATION</div>
          </div>
          <div style="flex: 1;">
            <!-- Empty for balance -->
          </div>
        </div>

        <!-- Quotation and party details -->
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

        <!-- Items table -->
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Rate (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${quotationData.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}${item.description ? '<br><small style="color: #666;">' + item.description + '</small>' : ''}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Summary section -->
        <div class="summary">
          <strong style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; display: block; margin-bottom: 12px;">SUMMARY</strong>
          Subtotal: ₹${quotationData.subtotal.toFixed(2)}<br>
          Discount: -₹${quotationData.discount.toFixed(2)}<br>
          Tax (18% GST): ₹${quotationData.tax.toFixed(2)}<br>
          ${additionalCharges.map(charge => 
            charge.description && charge.amount ? 
            `${charge.description}: ₹${parseFloat(charge.amount).toFixed(2)}<br>` : ''
          ).join('')}
          <div class="total">Total Amount: ₹${quotationData.totalAmount.toFixed(2)}</div>
        </div>

        <div style="clear: both;"></div>

        <!-- Terms and conditions -->
        ${terms ? `
          <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;">
            <strong>Terms & Conditions:</strong><br>
            ${terms.replace(/\n/g, '<br>')}
          </div>
        ` : ''}

        <!-- Notes -->
        ${notes ? `
          <div style="margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;">
            <strong>Notes:</strong><br>
            ${notes}
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <p>Thank you for your business!</p>
          <p><strong>Authorized Signatory</strong><br>Global Marketing Solutions</p>
          <div style="margin-top: 15px;">
            <p>GLOBAL MARKETING SOLUTIONS • Champagne Branch</p>
            <p>Phone: +91 XXXXX XXXXX • Email: info@globalmarketingsolutions.com</p>
          </div>
        </div>

        <!-- Print buttons (hidden when printing) -->
        <div class="no-print" style="margin-top: 15px; text-align: center;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #3498db; color: white; border: none; cursor: pointer; font-size: 11px;">
            Print Quotation
          </button>
          <button onclick="window.close()" style="padding: 8px 16px; background: #95a5a6; color: white; border: none; cursor: pointer; margin-left: 8px; font-size: 11px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `);
    
    // Close the document writing
    printWindow.document.close();
  };

  // Filter requirements based on search term
  const filteredRequirements = requirements.filter(req => {
    // Skip if requirement is null/undefined
    if (!req) return false;
    
    // Convert search term to lowercase for case-insensitive search
    const searchLower = searchTerm.toLowerCase();
    // Check if search term matches any of these fields
    return (
      (req.itemName?.toLowerCase().includes(searchLower)) || // Item name
      (req.name?.toLowerCase().includes(searchLower)) || // Alternative name field
      (req.itemCode?.toLowerCase().includes(searchLower)) || // Item code
      (req.code?.toLowerCase().includes(searchLower)) || // Alternative code field
      (req.description?.toLowerCase().includes(searchLower)) // Description
    );
  });

  // Get selected party details for display
  const selectedPartyDetails = parties.find(party => party._id === selectedParty);

  // Mobile responsive styles
  const containerStyle = {
    maxWidth: '1200px', // Maximum width for large screens
    margin: '0 auto', // Center the container
    padding: isMobile ? '10px' : '20px', // Responsive padding
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", // Font stack
    backgroundColor: '#f8f9fa', // Light background color
    minHeight: '100vh', // Full viewport height
    fontSize: isMobile ? '14px' : '16px' // Responsive font size
  };

  // Card style for consistent UI elements
  const cardStyle = {
    backgroundColor: 'white', // White background
    borderRadius: isMobile ? '8px' : '12px', // Responsive border radius
    padding: isMobile ? '16px' : '24px', // Responsive padding
    marginBottom: isMobile ? '16px' : '24px', // Responsive margin
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)', // Subtle shadow
    border: '1px solid #e9ecef' // Light border
  };

  // Reusable button style function
  const buttonStyle = (color, ) => ({
    backgroundColor: color, // Base color
    color: 'white', // Text color
    border: 'none', // No border
    padding: isMobile ? '10px 16px' : '14px 28px', // Responsive padding
    borderRadius: isMobile ? '6px' : '8px', // Responsive border radius
    cursor: 'pointer', // Pointer cursor on hover
    fontSize: isMobile ? '13px' : '15px', // Responsive font size
    fontWeight: '600', // Bold text
    transition: 'all 0.3s ease', // Smooth transitions
    width: isMobile ? '100%' : 'auto', // Full width on mobile
    marginBottom: isMobile ? '8px' : '0' // Margin on mobile
  });

  // Main component return (JSX)
  return (
    <div style={containerStyle}>
      {/* Header section with title and view quotations button */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row', // Column on mobile, row on desktop
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: '20px',
        gap: isMobile ? '12px' : '0'
      }}>
        {/* Main title */}
        <h1 style={{ 
          color: '#2c3e50', 
          fontSize: isMobile ? '22px' : '28px', 
          fontWeight: '700',
          margin: 0,
          textAlign: isMobile ? 'center' : 'left'
        }}>
          Create Quotation
        </h1>
        
        {/* View quotations button */}
        <button 
          onClick={() => {
            setShowViewQuotations(true); // Show quotations modal
            fetchAllQuotations(); // Fetch quotations data
          }}
          style={buttonStyle('#3498db', '#2980b9')} // Blue button
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'} // Hover effect
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'} // Reset on leave
        >
          View Quotations
        </button>
      </div>

      {/* Main quotation form card */}
      <div style={cardStyle}>
        {/* Header section with Bill To and Quotation Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', // Single column on mobile
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
            
            {/* Party selection dropdown */}
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
              onFocus={(e) => e.target.style.borderColor = '#3498db'} // Focus effect
              onBlur={(e) => e.target.style.borderColor = '#e9ecef'} // Blur effect
            >
              <option value="">+ Add Party</option>
              {parties.map(party => (
                <option key={party._id} value={party._id}>
                  {party.partyName} {party.partyType ? `(${party.partyType})` : ''}
                </option>
              ))}
            </select>

            {/* Display selected party details */}
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
            
            {/* Quotation details grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', // Responsive grid
              gap: isMobile ? '12px' : '16px'
            }}>
              {/* Quotation Number */}
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
                  readOnly // Read-only as it's auto-generated
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
              
              {/* Validity Period */}
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
                  min="1" // Minimum 1 day
                />
              </div>
              
              {/* PO Number */}
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
              
              {/* Quotation Date */}
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
              
              {/* Validity Date (auto-calculated) */}
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
                  readOnly // Read-only as it's auto-calculated
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

      {/* Items Section Card */}
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
                  {/* Item header with name and remove button */}
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
                  
                  {/* Item details grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div>Qty: {item.quantity} {item.unit}</div>
                    <div>Price: ₹{item.price.toFixed(2)}</div>
                    <div>Discount: {item.discount || 0}{item.discountType === 'percentage' ? '%' : '₹'}</div>
                    <div>Tax: {item.tax || 0}%</div>
                    <div style={{ gridColumn: '1 / -1', fontWeight: 'bold', marginTop: '8px' }}>
                      Amount: ₹{(item.amount || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  {/* Description input */}
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
            /* Desktop table view */
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
                    {/* Main item row */}
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
          )}

          {/* Add Item Button */}
          <button 
            onClick={() => setShowAddItems(true)}
            style={{
              ...buttonStyle('#27ae60', '#219a52'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px'
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
      <div style={cardStyle}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 400px', // Responsive layout
          gap: isMobile ? '20px' : '40px',
          marginTop: '0'
        }}>
          {/* Left side - Additional Information */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{
              marginBottom: '16px',
              color: '#2c3e50',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              borderBottom: '2px solid #3498db',
              paddingBottom: '8px'
            }}>Additional Information</h2>
            
            {/* Notes section */}
            <div style={{ margin: '0' }}>
              <h3 style={{
                marginBottom: '12px',
                color: '#34495e',
                fontSize: isMobile ? '15px' : '16px',
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
                  fontSize: isMobile ? '13px' : '14px',
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
            
            {/* Add Additional Charges button */}
            <button 
              onClick={addAdditionalCharge}
              style={buttonStyle('#6c757d', '#5a6268')}
            >
              + Add Additional Charges
            </button>
            
            {/* Terms and Conditions section */}
            <div style={{ margin: '0' }}>
              <h3 style={{
                marginBottom: '12px',
                color: '#34495e',
                fontSize: isMobile ? '15px' : '16px',
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
                  fontSize: isMobile ? '13px' : '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  minHeight: '120px'
                }}
                rows="4"
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
            
            {/* Authorized signatory note */}
            <div style={{
              marginTop: '30px',
              fontWeight: '600',
              color: '#2c3e50',
              fontSize: isMobile ? '13px' : '14px',
              textAlign: 'center',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px dashed #dee2e6'
            }}>
              Authorized signatory for Global Marketing Solutions
            </div>
          </div>

          {/* Right side - Summary Panel */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: isMobile ? '16px' : '24px',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{
              marginBottom: '12px',
              color: '#34495e',
              fontSize: isMobile ? '15px' : '16px',
              fontWeight: '600'
            }}>Summary</h3>
            
            {/* Subtotal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              fontSize: isMobile ? '13px' : '14px'
            }}>
              <span>SUBTOTAL</span>
              <span>₹{quotationData.subtotal.toFixed(2)}</span>
            </div>

            {/* Additional Charges */}
            {additionalCharges.map((charge, index) => (
              <div key={charge.id} style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                padding: '10px 0',
                gap: '8px',
                alignItems: isMobile ? 'stretch' : 'center'
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
                    fontSize: isMobile ? '13px' : '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease',
                    flex: isMobile ? 'none' : '2'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={charge.amount || ''}
                    onChange={(e) => updateAdditionalCharge(index, 'amount', parseFloat(e.target.value) || 0)}
                    style={{
                      padding: '8px 12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '4px',
                      fontSize: isMobile ? '13px' : '14px',
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
                      transition: 'background-color 0.3s ease',
                      minWidth: '32px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#c0392b'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#e74c3c'}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            {/* Taxable Amount */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              fontSize: isMobile ? '13px' : '14px'
            }}>
              <span>Taxable Amount</span>
              <span>₹{quotationData.taxableAmount.toFixed(2)}</span>
            </div>

            {/* Discount */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              color: '#e74c3c',
              fontWeight: '500',
              fontSize: isMobile ? '13px' : '14px'
            }}>
              <span>Discount</span>
              <span>- ₹{quotationData.discount.toFixed(2)}</span>
            </div>

            {/* Tax */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              fontSize: isMobile ? '13px' : '14px'
            }}>
              <span>Tax (18% GST)</span>
              <span>₹{quotationData.tax.toFixed(2)}</span>
            </div>

            {/* Additional Charges Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #dee2e6',
              fontSize: isMobile ? '13px' : '14px'
            }}>
              <span>Additional Charges</span>
              <span>₹{quotationData.additionalCharges.toFixed(2)}</span>
            </div>

            {/* Total Amount */}
            <div style={{
              fontWeight: '700',
              fontSize: isMobile ? '16px' : '18px',
              color: '#2c3e50',
              borderTop: '2px solid #2c3e50',
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '16px 0'
            }}>
              <span>Total Amount</span>
              <span>₹${quotationData.totalAmount.toFixed(2)}</span>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '24px',
              flexWrap: 'wrap'
            }}>
              {/* Save Quotation Button */}
              <button 
                onClick={submitQuotation}
                disabled={isSubmitting}
                style={{
                  ...buttonStyle(isSubmitting ? '#95a5a6' : '#27ae60', '#219a52'),
                  opacity: isSubmitting ? 0.7 : 1
                }}
                onMouseEnter={(e) => !isSubmitting && (e.target.style.backgroundColor = '#219a52')}
                onMouseLeave={(e) => !isSubmitting && (e.target.style.backgroundColor = '#27ae60')}
              >
                {isSubmitting ? 'Saving...' : 'Save Quotation'}
              </button>
              
              {/* Download PDF Button */}
              <button 
                onClick={downloadPDF}
                style={buttonStyle('#3498db', '#2980b9')}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
              >
                Download PDF
              </button>
              
              {/* Print Button */}
              <button 
                onClick={printQuotation}
                style={buttonStyle('#9b59b6', '#8e44ad')}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#8e44ad'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#9b59b6'}
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
          padding: isMobile ? '10px' : '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '0',
            borderRadius: '12px',
            width: '95%',
            maxWidth: isMobile ? '100%' : '1100px',
            maxHeight: isMobile ? '90vh' : '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '16px' : '24px',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <h2 style={{ 
                margin: 0, 
                color: '#2c3e50', 
                fontSize: isMobile ? '18px' : '20px', 
                fontWeight: '600' 
              }}>Add Items to Quotation</h2>
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
            
            {/* Search Input */}
            <div style={{
              padding: isMobile ? '16px' : '20px 24px',
              borderBottom: '1px solid #e9ecef'
            }}>
              <input
                type="text"
                placeholder="Search items by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px 12px' : '12px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: isMobile ? '13px' : '14px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>

            {/* Items List */}
            <div style={{
              maxHeight: isMobile ? '300px' : '400px',
              overflowY: 'auto'
            }}>
              {isMobile ? (
                /* Mobile list view for items */
                <div style={{ padding: '16px' }}>
                  {filteredRequirements.length > 0 ? (
                    filteredRequirements.map((req, index) => (
                      <div key={req._id || index} style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '12px',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ fontSize: '14px' }}>{req.itemName || req.name || 'Unnamed Item'}</strong>
                          {req.itemCode && (
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>Code: {req.itemCode}</div>
                          )}
                        </div>
                        {req.description && (
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                            {req.description}
                          </div>
                        )}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '8px', 
                          fontSize: '12px',
                          marginBottom: '12px'
                        }}>
                          <div>Price: ₹${req.salesPrice || req.price || '0.00'}</div>
                          <div>Stock: ${req.currentStock || '0'}</div>
                          <div>Unit: ${req.unit || 'PCS'}</div>
                        </div>
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
                            width: '100%'
                          }}
                        >
                          Add to Quote
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#6c757d',
                      fontSize: '14px'
                    }}>
                      {requirements.length === 0 ? 
                        'No requirements found in the system. Please add some items first.' : 
                        'No items match your search. Try different keywords.'
                      }
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop table view */
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
                      }}>ITEM NAME</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>ITEM CODE</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>DESCRIPTION</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>SALES PRICE (₹)</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>CURRENT STOCK</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
                      }}>UNIT</th>
                      <th style={{
                        border: '1px solid #dee2e6',
                        padding: '14px 12px',
                        textAlign: 'left',
                        backgroundColor: '#34495e',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '13px'
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
                            <strong>${req.itemName || req.name || 'Unnamed Item'}</strong>
                          </td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>${req.itemCode || req.code || '-'}</td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>${req.description || '-'}</td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>₹${req.salesPrice || req.price || '0.00'}</td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>${req.currentStock || '0'}</td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>${req.unit || 'PCS'}</td>
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
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: isMobile ? '16px' : '20px 24px',
              borderTop: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <button 
                onClick={() => {
                  setShowAddItems(false);
                  setSearchTerm('');
                }}
                style={buttonStyle('#6c757d', '#5a6268')}
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
                style={buttonStyle('#3498db', '#2980b9')}
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
          padding: isMobile ? '10px' : '20px'
        }}>
          <div style={{
            background: 'white',
            padding: isMobile ? '20px' : '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: isMobile ? '100%' : '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            {/* Success Icon */}
            <div style={{
              width: isMobile ? '50px' : '60px',
              height: isMobile ? '50px' : '60px',
              backgroundColor: '#27ae60',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: isMobile ? '24px' : '30px',
              color: 'white'
            }}>
              ✓
            </div>
            
            {/* Success Message */}
            <h2 style={{
              margin: '0 0 15px 0',
              color: '#2c3e50',
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: '600'
            }}>
              Quotation Saved Successfully!
            </h2>
            
            <p style={{
              margin: '0 0 25px 0',
              color: '#7f8c8d',
              fontSize: isMobile ? '14px' : '16px',
              lineHeight: '1.5'
            }}>
              Your quotation <strong>${savedQuotation?.quotationNo}</strong> has been saved successfully.
            </p>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={() => setShowSuccessModal(false)}
                style={buttonStyle('#3498db', '#2980b9')}
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
                style={buttonStyle('#27ae60', '#219a52')}
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
          padding: isMobile ? '10px' : '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '0',
            borderRadius: '12px',
            width: '95%',
            maxWidth: isMobile ? '100%' : '1200px',
            maxHeight: isMobile ? '90vh' : '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '16px' : '24px',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <h2 style={{ 
                margin: 0, 
                color: '#2c3e50', 
                fontSize: isMobile ? '18px' : '20px', 
                fontWeight: '600' 
              }}>All Quotations</h2>
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
            
            {/* Quotations List */}
            <div style={{
              maxHeight: isMobile ? '400px' : '500px',
              overflowY: 'auto',
              padding: isMobile ? '12px' : '20px'
            }}>
              {allQuotations.length > 0 ? (
                isMobile ? (
                  /* Mobile list view for quotations */
                  <div>
                    {allQuotations.map((quotation, index) => (
                      <div key={quotation._id} style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '12px',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                      }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ fontSize: '14px' }}>${quotation.quotationNo}</strong>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            ${quotation.partyDetails?.partyName || quotation.partyId?.partyName || 'N/A'}
                          </div>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '8px', 
                          fontSize: '12px',
                          marginBottom: '12px'
                        }}>
                          <div>Date: ${new Date(quotation.quotationDate).toLocaleDateString()}</div>
                          <div>Total: ₹${quotation.summary?.totalAmount?.toFixed(2) || '0.00'}</div>
                          <div>
                            Status: <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: 
                                quotation.status === 'draft' ? '#f39c12' :
                                quotation.status === 'sent' ? '#3498db' :
                                quotation.status === 'accepted' ? '#27ae60' :
                                quotation.status === 'rejected' ? '#e74c3c' : '#95a5a6',
                              color: 'white'
                            }}>
                              ${quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => viewQuotation(quotation)}
                            style={{
                              backgroundColor: '#3498db',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              flex: 1
                            }}
                          >
                            View
                          </button>
                          <button 
                            onClick={() => downloadQuotationPDF(quotation)}
                            style={{
                              backgroundColor: '#27ae60',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              flex: 1
                            }}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Desktop table view */
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
                            <strong>${quotation.quotationNo}</strong>
                          </td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>
                            ${quotation.partyDetails?.partyName || quotation.partyId?.partyName || 'N/A'}
                          </td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>
                            ${new Date(quotation.quotationDate).toLocaleDateString()}
                          </td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>
                            ₹${quotation.summary?.totalAmount?.toFixed(2) || '0.00'}
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
                              ${quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1)}
                            </span>
                          </td>
                          <td style={{
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}>
                            <button 
                              onClick={() => viewQuotation(quotation)}
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
                              onClick={() => downloadQuotationPDF(quotation)}
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
                )
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6c757d',
                  fontSize: isMobile ? '14px' : '16px'
                }}>
                  No quotations found. Create your first quotation to see it here.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: isMobile ? '16px' : '20px 24px',
              borderTop: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <button 
                onClick={() => setShowViewQuotations(false)}
                style={buttonStyle('#3498db', '#2980b9')}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Details Modal */}
      {showQuotationDetails && selectedQuotation && (
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
          padding: isMobile ? '10px' : '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '0',
            borderRadius: '12px',
            width: '95%',
            maxWidth: isMobile ? '100%' : '900px',
            maxHeight: isMobile ? '90vh' : '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: isMobile ? '16px' : '24px',
              borderBottom: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <h2 style={{ 
                margin: 0, 
                color: '#2c3e50', 
                fontSize: isMobile ? '18px' : '20px', 
                fontWeight: '600' 
              }}>Quotation Details - {selectedQuotation.quotationNo}</h2>
              <button 
                onClick={() => setShowQuotationDetails(false)}
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
            
            {/* Quotation Details Content */}
            <div style={{
              maxHeight: isMobile ? '400px' : '500px',
              overflowY: 'auto',
              padding: isMobile ? '16px' : '24px'
            }}>
              {/* Quotation Header Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '20px',
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '16px' }}>Quotation Information</h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <div><strong>Quotation No:</strong> {selectedQuotation.quotationNo}</div>
                    <div><strong>Date:</strong> {selectedQuotation.quotationDate}</div>
                    <div><strong>Valid Until:</strong> {selectedQuotation.validityDate}</div>
                    <div><strong>PO No:</strong> {selectedQuotation.poNo || 'N/A'}</div>
                    <div><strong>Status:</strong> 
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: 
                          selectedQuotation.status === 'draft' ? '#f39c12' :
                          selectedQuotation.status === 'sent' ? '#3498db' :
                          selectedQuotation.status === 'accepted' ? '#27ae60' :
                          selectedQuotation.status === 'rejected' ? '#e74c3c' : '#95a5a6',
                        color: 'white',
                        marginLeft: '8px'
                      }}>
                        {selectedQuotation.status?.charAt(0).toUpperCase() + selectedQuotation.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '16px' }}>Party Information</h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <div><strong>Party:</strong> {selectedQuotation.partyDetails?.partyName || selectedQuotation.partyId?.partyName || 'N/A'}</div>
                    {selectedQuotation.partyDetails?.mobileNumber && (
                      <div><strong>Mobile:</strong> {selectedQuotation.partyDetails.mobileNumber}</div>
                    )}
                    {selectedQuotation.partyDetails?.billingAddress && (
                      <div><strong>Address:</strong> {selectedQuotation.partyDetails.billingAddress}</div>
                    )}
                    {selectedQuotation.partyDetails?.gstin && (
                      <div><strong>GSTIN:</strong> {selectedQuotation.partyDetails.gstin}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <h3 style={{ margin: '0 0 16px 0', color: '#2c3e50', fontSize: '16px' }}>Items</h3>
              <div style={{
                overflowX: 'auto',
                marginBottom: '24px'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Item Name</th>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Unit</th>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right' }}>Price (₹)</th>
                      <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuotation.items.map((item, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                          <div><strong>{item.name}</strong></div>
                          {item.description && (
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{item.description}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{item.unit}</td>
                        <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                        <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'right' }}>₹{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Section */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                marginBottom: '24px'
              }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#2c3e50', fontSize: '16px' }}>Summary</h3>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>₹{selectedQuotation.summary?.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                    <span>Discount:</span>
                    <span>-₹{selectedQuotation.summary?.discount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax (18% GST):</span>
                    <span>₹{selectedQuotation.summary?.tax?.toFixed(2) || '0.00'}</span>
                  </div>
                  {selectedQuotation.additionalCharges?.map((charge, index) => (
                    charge.amount > 0 && (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{charge.description}:</span>
                        <span>₹{parseFloat(charge.amount).toFixed(2)}</span>
                      </div>
                    )
                  ))}
                  <hr style={{ border: 'none', borderTop: '2px solid #2c3e50', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: '#2c3e50' }}>
                    <span>Total Amount:</span>
                    <span>₹{selectedQuotation.summary?.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              {selectedQuotation.notes && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '16px' }}>Notes</h3>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                    fontSize: '14px'
                  }}>
                    {selectedQuotation.notes}
                  </div>
                </div>
              )}

              {selectedQuotation.terms && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '16px' }}>Terms & Conditions</h3>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                    fontSize: '14px',
                    whiteSpace: 'pre-line'
                  }}>
                    {selectedQuotation.terms}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: isMobile ? '16px' : '20px 24px',
              borderTop: '1px solid #e9ecef',
              backgroundColor: '#f8f9fa'
            }}>
              <button 
                onClick={() => setShowQuotationDetails(false)}
                style={buttonStyle('#6c757d', '#5a6268')}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Close
              </button>
              <button 
                onClick={() => downloadQuotationPDF(selectedQuotation)}
                style={buttonStyle('#27ae60', '#219a52')}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#219a52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#27ae60'}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export the component as default
export default Quotation;