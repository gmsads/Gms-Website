import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Invoice from "./Invoice";
import Select from 'react-select';

function OrderForm({
  orderNumber,
  existingData,
  onNewOrder,
  onBack,
  onSuccess,
  isAdmin,
  executives,
}) {
  const routerLocation = useLocation();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAdvanceApprovalModal, setShowAdvanceApprovalModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(true);
  const [targetChanged, setTargetChanged] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [sortedExecutives, setSortedExecutives] = useState([]);
  const [selectedExecutive, setSelectedExecutive] = useState(
    existingData?.executive ||
    (isAdmin ? "" : localStorage.getItem("userName") || "")
  );
  const [business, setBusiness] = useState(routerLocation.state?.businessName || "");
  const [contactPerson, setContactPerson] = useState(routerLocation.state?.customerName || "");
  const [clientLocation, setClientLocation] = useState(existingData?.location || "");
  const [isNewFromExisting, setIsNewFromExisting] = useState(false);

  // Lead Source states
  const [leadSources] = useState([
    'India Mart',
    'Just Dial',
    'Meta (Facebook/Instagram)',
    'Google Ads',
    'Website',
    'Referral',
    'Walk-in',
    'Newspaper',
    'Other Specify'
  ]);
  const [leadSource, setLeadSource] = useState(existingData?.leadSource || '');
  const [otherLeadSource, setOtherLeadSource] = useState(existingData?.otherLeadSource || '');

  const [contactNumber, setContactNumber] = useState(
    existingData
      ? `${existingData.contactCode || "+91"} ${existingData.phone || ""}`
      : `+91 ${routerLocation.state?.phoneNumber || orderNumber || ""}`
  );
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [clientType, setClientType] = useState("");
  const [target, setTarget] = useState("");
  const [rows, setRows] = useState([getEmptyRow()]);
  const [total, setTotal] = useState(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [advance, setAdvance] = useState("");
  const [balance, setBalance] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountedTotal, setDiscountedTotal] = useState(0);
  const [upiOptions, setUpiOptions] = useState([]);
  const [selectedUpi, setSelectedUpi] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeImage, setChequeImage] = useState(null);
  const [design, setDesign] = useState("");
  const [loadingExecutives, setLoadingExecutives] = useState(false);
  const [bankName, setBankName] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [otherMethod, setOtherMethod] = useState("");
  const [, setIsSubmittingDesign] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [, setPoDocument] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [advanceError, setAdvanceError] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [hasAdvanceApproval, setHasAdvanceApproval] = useState(false);
  const [approvalRequested, setApprovalRequested] = useState(false);

  const printRef = useRef();
  const invoiceRef = useRef();
  const approvalPollingRef = useRef(null);

  function getEmptyRow() {
    const delivery = new Date(orderDate);
    delivery.setDate(delivery.getDate() + 3);
    return {
      requirement: "",
      customRequirement: "",
      description: "",
      quantity: "",
      rate: "",
      days: "",
      startDate: orderDate,
      endDate: delivery.toISOString().split("T")[0],
      total: "0.00",
      deliveryDate: delivery.toISOString().split("T")[0],
      gstIncluded: true,
    };
  }

  // Handle lead source change
  const handleLeadSourceChange = (value) => {
    setLeadSource(value);
    if (value !== 'Other Specify') {
      setOtherLeadSource('');
    }
  };

  const sendWhatsAppMessage = (phoneNumber, orderData) => {
    try {
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const finalNumber = cleanNumber.slice(-10);

      if (finalNumber.length !== 10) {
        throw new Error('Invalid phone number');
      }

      let paymentMethodDisplay = "Not specified";
      if (orderData.paymentMethods && orderData.paymentMethods.length > 0) {
        if (typeof orderData.paymentMethods === 'string') {
          paymentMethodDisplay = orderData.paymentMethods;
        } else if (Array.isArray(orderData.paymentMethods)) {
          paymentMethodDisplay = orderData.paymentMethods.join(', ');
        }
      }

      const message = `🎉 *Order Confirmation* 🎉

Dear ${orderData.contactPerson},

Your order has been successfully placed with *Global Marketing Solutions*!

*Order Details:*
🏢 *Business:* ${orderData.business}
📋 *Order Number:* ${orderData.orderNumber}
👤 *Contact Person:* ${orderData.contactPerson}
📅 *Order Date:* ${new Date(orderData.orderDate).toLocaleDateString()}
📍 *Location:* ${orderData.location || 'Not specified'}

*Requirements:*
${orderData.requirements}

*Payment Summary:*
💰 *Total Amount:* ₹${orderData.total}
💳 *Advance Paid:* ₹${orderData.advance}
⚖️ *Balance:* ₹${orderData.balance}
💳 *Payment Method:* ${paymentMethodDisplay}
${orderData.advanceDate ? `📅 *Advance Date:* ${new Date(orderData.advanceDate).toLocaleDateString()}` : ''}
${orderData.paymentDate ? `📅 *Payment Date:* ${new Date(orderData.paymentDate).toLocaleDateString()}` : ''}

*Additional Details:*
${orderData.chequeNumber ? `🏦 *Cheque Number:* ${orderData.chequeNumber}` : ''}
${orderData.upiId ? `📱 *UPI ID:* ${orderData.upiId}` : ''}
${orderData.bankName ? `🏛️ *Bank Name:* ${orderData.bankName}` : ''}
${orderData.transactionRef ? `🔗 *Transaction Ref:* ${orderData.transactionRef}` : ''}
${orderData.poNumber ? `📄 *PO Number:* ${orderData.poNumber}` : ''}

Thank you for your business! We'll keep you updated on your order status.

For any queries, please contact us.

Best regards,
Global Marketing Solutions Team`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/91${finalNumber}?text=${encodedMessage}`;

      window.open(whatsappUrl, '_blank');

      setWhatsappSent(true);
      return { success: true, message: 'WhatsApp opened successfully' };
    } catch (error) {
      console.error('WhatsApp error:', error);
      return { success: false, message: error.message };
    }
  };

  useEffect(() => {
    const currentUser = localStorage.getItem("userName") || "Admin";
    setCreatedBy(currentUser);
  }, []);

  const handleBusinessChange = (value) => {
    const uppercaseValue = value.toUpperCase();
    if (validateBusinessName(uppercaseValue) || uppercaseValue === "") {
      setBusiness(uppercaseValue);
    }
  };

  const checkAdvanceApproval = async () => {
    try {
      const response = await axios.get(
        `/api/advance-approval-requests/check/${selectedExecutive}`,
        { params: { business, contactPerson } }
      );

      const previousApprovalStatus = hasAdvanceApproval;
      const newApprovalStatus = response.data.hasApproval;

      setHasAdvanceApproval(newApprovalStatus);

      if (!previousApprovalStatus && newApprovalStatus && approvalRequested) {
        alert("🎉 Your advance approval request has been approved! You can now submit the order.");

        if (approvalPollingRef.current) {
          clearInterval(approvalPollingRef.current);
          approvalPollingRef.current = null;
        }
      }
    } catch (error) {
      console.error("Error checking advance approval:", error);
    }
  };

  useEffect(() => {
    if (!isAdmin && business && contactPerson) {
      checkAdvanceApproval();
    }
  }, [business, contactPerson, isAdmin]);

  useEffect(() => {
    if (approvalRequested && !hasAdvanceApproval && !isAdmin && business && contactPerson) {
      approvalPollingRef.current = setInterval(async () => {
        await checkAdvanceApproval();
      }, 5000);

      return () => {
        if (approvalPollingRef.current) {
          clearInterval(approvalPollingRef.current);
          approvalPollingRef.current = null;
        }
      };
    } else {
      if (approvalPollingRef.current) {
        clearInterval(approvalPollingRef.current);
        approvalPollingRef.current = null;
      }
    }
  }, [approvalRequested, hasAdvanceApproval, isAdmin, business, contactPerson]);

  const isTimeBasedRequirement = (requirementName) => {
    return requirementName === "Mobile Vans" || requirementName === "Try Cycles";
  };

  const calculateDeliveryDate = (baseDate, days = 3) => {
    const delivery = new Date(baseDate);
    delivery.setDate(delivery.getDate() + days);
    return delivery.toISOString().split("T")[0];
  };

  const calculateRowTotal = (row) => {
    const qty = parseFloat(row.quantity) || 0;
    const rate = parseFloat(row.rate) || 0;
    const days = isTimeBasedRequirement(row.requirement) ? parseInt(row.days) || 1 : 1;

    let baseAmount = isTimeBasedRequirement(row.requirement) ? qty * rate * days : qty * rate;
    return row.gstIncluded ? (baseAmount * 1.18).toFixed(2) : baseAmount.toFixed(2);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) {
      alert("No content available for printing");
      return;
    }

    const printWindow = window.open('', '_blank');
    const printStyles = `
      <style>
        body { 
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          background: white;
        }
        .no-print { display: none !important; }
        .print-actions { display: none !important; }
        .form-actions { display: none !important; }
        .existing-order-notice { display: none !important; }
        .success-modal-overlay { display: none !important; }
        .created-by-info { 
          background-color: #f0f8ff; 
          padding: 8px; 
          border-radius: 4px; 
          margin-bottom: 10px;
          border-left: 4px solid #2196F3;
        }
        @media print {
          body { margin: 0; padding: 10mm; }
        }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Form - ${business || "New Order"}</title>
          ${printStyles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    }, 500);
  };

  const handleInvoicePrint = () => {
    const invoiceContent = invoiceRef.current;
    if (!invoiceContent) {
      alert("No invoice content available for printing");
      return;
    }

    const printWindow = window.open('', '_blank');
    const printStyles = `
      <style>
        body { 
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20mm;
          color: #333;
          background: white;
        }
        .no-print { display: none !important; }
        @media print {
          body { margin: 0; padding: 0; }
        }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice</title>
          ${printStyles}
        </head>
        <body>
          ${invoiceContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    }, 500);
  };

  const generateInvoice = () => {
    setShowInvoice(true);
  };

  // Modify the createNewOrderFromExisting function
  const createNewOrderFromExisting = () => {
    // Determine the new order type based on existing order type
    let newClientType = "";
    if (existingData?.clientType) {
      switch (existingData.clientType) {
        case "Retail":
          newClientType = "Renewal";
          break;
        case "Agent":
          newClientType = "Renewal-Agent";
          break;
        case "Renewal":
        case "Renewal-Agent":
        case "Corporate":
        case "Walk-In":
          newClientType = existingData.clientType;
          break;
        default:
          newClientType = "";
      }
    }

    // Set mode to "new from existing"
    setIsNewFromExisting(true);

    // Keep these fields from existing order (these will be read-only)
    setBusiness((existingData?.business || "").toUpperCase());
    setContactPerson(existingData?.contactPerson || "");
    setContactNumber(`${existingData?.contactCode || "+91"} ${existingData?.phone || ""}`);
    setClientType(newClientType);

    // Reset ALL other fields for new order
    setSelectedExecutive(isAdmin ? "" : localStorage.getItem("userName") || "");
    setClientLocation("");
    setLeadSource("");
    setOtherLeadSource("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setAdvanceDate(new Date().toISOString().split("T")[0]);
    setTarget("");
    setDiscount(0);
    setRows([{
      ...getEmptyRow(),
      gstIncluded: true
    }]);
    setTotal(0);
    setDiscountedTotal(0);
    setAdvance("");
    setBalance(0);
    setPaymentMethods([]);
    setSelectedUpi("");
    setChequeNumber("");
    setChequeImage(null);
    setDesign("");
    setBankName("");
    setTransactionRef("");
    setOtherMethod("");
    setPoNumber("");
    setPoDocument(null);
    setAdvanceError("");
    setWhatsappSent(false);
    setHasAdvanceApproval(false);
    setApprovalRequested(false);
    setApprovalReason("");

    if (approvalPollingRef.current) {
      clearInterval(approvalPollingRef.current);
      approvalPollingRef.current = null;
    }

    setIsCreatingNew(true);

    if (onNewOrder) onNewOrder();
  };

  const submitAdvanceApprovalRequest = async () => {
    if (!approvalReason.trim()) {
      alert("Please provide a reason for low advance payment");
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const advanceNum = parseFloat(advance) || 0;
      const totalNum = parseFloat(total) || 0;
      const advancePercentage = (advanceNum / totalNum) * 100;

      const requestData = {
        executive: selectedExecutive,
        business,
        contactPerson,
        contactNumber,
        totalAmount: totalNum,
        advanceAmount: advanceNum,
        advancePercentage: advancePercentage.toFixed(1),
        reason: approvalReason,
        orderData: {
          clientLocation,
          orderDate,
          clientType,
          target,
          rows: rows.map(row => ({
            requirement: row.requirement === "other" ? row.customRequirement : row.requirement,
            description: row.description,
            quantity: row.quantity,
            rate: row.rate,
            total: row.total,
            gstIncluded: row.gstIncluded
          })),
          discount,
          paymentMethods
        }
      };

      await axios.post("/api/advance-approval-requests", requestData);

      setShowAdvanceApprovalModal(false);
      setApprovalRequested(true);
      setApprovalReason("");

      alert("Advance approval request submitted! The system will automatically check for approval every 5 seconds. You'll be notified when approved.");
    } catch (error) {
      console.error("Error submitting approval request:", error);
      alert("Failed to submit approval request. Please try again.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };
  useEffect(() => {
    const fetchAllExecutives = async () => {
      try {
        setLoadingExecutives(true);

        // Fetch regular executives
        console.log("Fetching executives from /api/executives...");
        const execsRes = await axios.get("/api/executives");
        console.log("Executives received:", execsRes.data);

        const regularExecs = [...execsRes.data].sort((a, b) => a.name.localeCompare(b.name));

        // Fetch field executives
        let fieldExecutives = [];
        try {
          const fieldExecsRes = await axios.get("/api/field-executive/admin/executives");
          fieldExecutives = fieldExecsRes.data.map(name => ({ name, _id: name, type: 'field' }));
        } catch (err) {
          console.log("Field executives endpoint not available");
        }

        // Fetch service executives
        let serviceExecutives = [];
        try {
          const serviceExecsRes = await axios.get("/api/service-executives");
          serviceExecutives = serviceExecsRes.data.map(exec => ({
            name: exec.name,
            _id: exec._id,
            type: 'service'
          }));
        } catch (err) {
          console.log("Service executives endpoint not available");
        }

        // Combine all executives and remove duplicates
        const allExecutives = [
          ...regularExecs,
          ...fieldExecutives,
          ...serviceExecutives
        ].filter((exec, index, self) =>
          index === self.findIndex(e => e.name === exec.name)
        ).sort((a, b) => a.name.localeCompare(b.name));

        console.log("All executives combined:", allExecutives);
        setSortedExecutives(allExecutives);

        // If there's an existing executive, select it
        if (existingData?.executive && !isCreatingNew) {
          setSelectedExecutive(existingData.executive);
        }

      } catch (error) {
        console.error("Error fetching executives:", error);
        // Try fallback to just regular executives
        try {
          const fallbackRes = await axios.get("/api/executives");
          setSortedExecutives(fallbackRes.data);
        } catch (fallbackErr) {
          console.error("Fallback also failed:", fallbackErr);
        }
      } finally {
        setLoadingExecutives(false);
      }
    };

    fetchAllExecutives();
  }, [existingData, isAdmin, isCreatingNew]);
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const requirementsRes = await axios.get("/api/requirements");
        setRequirements([...requirementsRes.data].sort((a, b) => a.name.localeCompare(b.name)));

        await fetchTargetForDate(orderDate);

        if (routerLocation.state?.phoneNumber) {
          checkIfExistingClient(routerLocation.state.phoneNumber);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    if (existingData && !isCreatingNew) {
      setSelectedExecutive(existingData.executive || (isAdmin ? "" : localStorage.getItem("userName") || ""));
      setBusiness((existingData.business || "").toUpperCase());
      setContactPerson(existingData.contactPerson || "");
      setClientLocation(existingData.location || "");
      setLeadSource(existingData.leadSource || ''); // Set lead source
      setOtherLeadSource(existingData.otherLeadSource || ''); // Set other lead source
      setContactNumber(`${existingData.contactCode || "+91"} ${existingData.phone || ""}`);
      setOrderDate(existingData.orderDate || new Date().toISOString().split("T")[0]);
      setClientType(existingData.clientType || "");
      setTarget(existingData.target || "");
      setDiscount(existingData.discount || 0);
      setCreatedBy(existingData.createdBy || "Admin");

      if (existingData.rows && existingData.rows.length > 0) {
        setRows(existingData.rows.map((row) => ({
          requirement: row.customRequirement ? "other" : row.requirement,
          customRequirement: row.customRequirement || "",
          description: row.description,
          quantity: row.quantity.toString(),
          rate: row.rate.toString(),
          days: row.days?.toString() || "",
          startDate: row.startDate || row.deliveryDate,
          endDate: row.endDate || calculateDeliveryDate(row.deliveryDate),
          total: row.total.toString(),
          deliveryDate: row.deliveryDate,
          gstIncluded: row.gstIncluded !== undefined ? row.gstIncluded : true,
        })));
        setTotal(existingData.total || 0);
        setDiscountedTotal(existingData.total - (existingData.discount || 0));
      }

      setAdvanceDate(existingData.advanceDate || new Date().toISOString().split("T")[0]);
      setPaymentDate(existingData.paymentDate || "");
      setAdvance(existingData.advance?.toString() || "");
      setBalance(existingData.balance?.toString() || "");

      if (existingData.paymentMethods) {
        const methods = typeof existingData.paymentMethods === 'string'
          ? existingData.paymentMethods.split(' + ')
          : existingData.paymentMethods;
        setPaymentMethods(methods);
      }

      setDesign(existingData.designStatus === "provided" ? "yes" : "no");
    }

    fetchInitialData();
  }, [existingData, orderNumber, isAdmin, executives, routerLocation.state, isCreatingNew]);

  // REMOVED: useEffect for splitCommission that was using saleClosedBy

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!business || !contactPerson || !contactNumber) {
      alert("Please fill all required fields");
      return;
    }
    if (isAdmin && !selectedExecutive) {
      alert("Please select an executive");
      return;
    }

    // Validate lead source if selected
    if (leadSource === 'Other Specify' && !otherLeadSource.trim()) {
      alert("Please specify the lead source");
      return;
    }

    const advanceNum = parseFloat(advance) || 0;
    const totalNum = parseFloat(total) || 0;
    const advancePercentage = (advanceNum / totalNum) * 100;

    if (totalNum > 0 && !isAdmin && advancePercentage < 50 && !hasAdvanceApproval) {
      setShowAdvanceApprovalModal(true);
      return;
    }

    await submitOrder();
  };

  // In OrderForm.js - submitOrder function

  const submitOrder = async () => {
    setIsSubmitting(true);
    try {
      const phone = contactNumber.replace(/\D/g, "").slice(-10);
      if (phone.length !== 10) throw new Error("Please enter a valid 10-digit phone number");

      const totalNum = parseFloat(total) || 0;
      const advanceNum = parseFloat(advance) || 0;

      // Determine final lead source value
      const finalLeadSource = leadSource === 'Other Specify'
        ? otherLeadSource
        : leadSource;

      const designRequestData = {
        executive: selectedExecutive,
        businessName: business,
        contactPerson: contactPerson,
        phoneNumber: phone,
        requirements: rows
          .filter((row) => row.requirement)
          .map((row) => row.requirement === "other" ? row.customRequirement : row.requirement)
          .join(", "),
        status: "pending",
        requestDate: new Date().toISOString(),
      };

      let paymentMethodStr = paymentMethods.includes("UPI") && selectedUpi
        ? paymentMethods.map((m) => m === "UPI" ? `UPI - ${selectedUpi}` : m).join(" + ")
        : paymentMethods.join(" + ");

      const finalCreatedBy = isAdmin ? createdBy : (existingData?.createdBy || selectedExecutive);

      // FIX: Create requirement details array for each row
      const requirementDetails = rows
        .filter((row) => row.requirement)
        .map((row) => {
          const requirementName = row.requirement === "other" ? row.customRequirement : row.requirement;
          const quantity = row.quantity ? parseFloat(row.quantity) : 0;
          const rate = row.rate ? parseFloat(row.rate) : 0;
          const rowTotal = row.total ? parseFloat(row.total) : 0;

          return {
            name: requirementName,
            quantity: quantity,
            rate: rate,
            total: rowTotal,
            description: row.description || "",
            days: row.days || "",
            deliveryDate: row.deliveryDate || "",
            gstIncluded: row.gstIncluded,
            assignedExecutive: row.assignedExecutive || null,
            status: row.status || "Pending",
            remark: row.remark || ""
          };
        });

      // Create a summary string for backward compatibility
      const allRequirements = requirementDetails
        .map(req => `${req.quantity} x ${req.name}`)
        .join(", ");

      const allDescriptions = requirementDetails
        .map(req => `${req.description}${req.days ? ` (${req.days} days)` : ''}`)
        .filter(desc => desc.trim())
        .join(" | ");

      // FIX: Store EACH ROW SEPARATELY in the rows array, not just one aggregated row
      const mainOrderData = {
        executive: selectedExecutive,
        business,
        contactPerson,
        location: clientLocation,
        leadSource: finalLeadSource,
        otherLeadSource: otherLeadSource,
        contactCode: "+91",
        phone,
        orderDate,
        target,
        clientType: clientType || "New",

        // FIX: Store each requirement as a separate row in the rows array
        rows: rows
          .filter((row) => row.requirement) // Only include rows with requirements
          .map((row) => ({
            requirement: row.requirement === "other" ? row.customRequirement : row.requirement,
            customRequirement: row.customRequirement || "",
            description: row.description || "",
            quantity: parseFloat(row.quantity) || 0,
            rate: parseFloat(row.rate) || 0,
            days: row.days ? parseInt(row.days) : 0,
            startDate: row.startDate || null,
            endDate: row.endDate || null,
            total: parseFloat(row.total) || 0,
            deliveryDate: row.deliveryDate || null,
            gstIncluded: row.gstIncluded !== undefined ? row.gstIncluded : true,
            assignedExecutive: row.assignedExecutive || null,
            remark: row.remark || "",
            isCompleted: row.isCompleted || false,
            status: row.status || "Pending"
          })),

        // Store requirement details for reference (optional)
        requirementDetails: requirementDetails,

        advanceDate,
        paymentDate,
        paymentMethods: paymentMethodStr,
        advance: advanceNum.toFixed(2),
        balance: (totalNum - advanceNum - (parseFloat(discount) || 0)).toFixed(2),
        total: totalNum.toFixed(2),
        discount: (parseFloat(discount) || 0).toFixed(2),
        discountedTotal: (totalNum - (parseFloat(discount) || 0)).toFixed(2),
        chequeNumber,
        chequeImage,
        designStatus: design === "no" ? "pending" : "provided",
        createdBy: finalCreatedBy,

        // Keep original rows for backward compatibility
        originalRows: rows.map(row => ({
          requirement: row.requirement === "other" ? row.customRequirement : row.requirement,
          description: row.description,
          quantity: row.quantity,
          rate: row.rate,
          days: row.days,
          total: row.total,
          deliveryDate: row.deliveryDate,
          gstIncluded: row.gstIncluded
        }))
      };

      console.log('Final order data being submitted:', mainOrderData);
      console.log('Rows count:', mainOrderData.rows.length);
      console.log('First row quantity:', mainOrderData.rows[0]?.quantity);

      setIsSubmittingDesign(true);
      await axios.post("/api/design-requests", designRequestData);
      setIsSubmittingDesign(false);

      const orderResponse = (existingData && !isCreatingNew)
        ? await axios.put(`/api/orders/${existingData._id}`, mainOrderData)
        : await axios.post("/api/submit", mainOrderData);

      const orderDataForWhatsApp = {
        business: business,
        contactPerson: contactPerson,
        orderNumber: orderResponse.data.orderNumber || `ORD-${Date.now()}`,
        requirements: allRequirements,
        requirementDetails: requirementDetails,
        total: discountedTotal,
        advance: advance,
        balance: balance,
        orderDate: orderDate,
        location: clientLocation,
        paymentMethods: paymentMethodStr,
        advanceDate: advanceDate,
        paymentDate: paymentDate,
        chequeNumber: chequeNumber,
        upiId: selectedUpi,
        bankName: bankName,
        transactionRef: transactionRef,
        poNumber: poNumber
      };

      sendWhatsAppMessage(contactNumber, orderDataForWhatsApp);

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setIsSubmitting(false);
        setIsCreatingNew(false);
        if (onSuccess) onSuccess(orderResponse.data);
      }, 2000);
    } catch (err) {
      console.error("Submission error:", err);
      alert(`Submission failed: ${err.response?.data?.message || err.message}`);
      setIsSubmitting(false);
    }
  };
  const fetchTargetForDate = async (dateString) => {
    if (!dateString || !selectedExecutive) return;
    setLoadingTarget(true);
    try {
      const date = new Date(dateString);
      const response = await axios.get(`/api/targets/${selectedExecutive}/${date.getFullYear()}/${date.getMonth() + 1}`);
      setTarget(response.data?.targetAmount || "0");
      setTargetChanged(true);
    } catch (error) {
      console.error("Target fetch error:", error);
      setTarget("0");
    } finally {
      setLoadingTarget(false);
      setTimeout(() => setTargetChanged(false), 1500);
    }
  };

  const handleOrderDateChange = (e) => {
    const newDate = e.target.value;
    setOrderDate(newDate);
    fetchTargetForDate(newDate);
    setRows((prevRows) => prevRows.map((row) => ({
      ...row,
      startDate: newDate,
      endDate: calculateDeliveryDate(newDate, row.days || 3),
      deliveryDate: calculateDeliveryDate(newDate, row.days || 3),
    })));
  };

  const checkIfExistingClient = async (number) => {
    try {
      const res = await axios.get(`/api/check-client?phone=${number}`);
      if (res.data.exists && !clientType) setClientType("Renewal");
    } catch (error) {
      console.error("Client check error:", error);
    }
  };

  const handleAddRow = () => setRows((prev) => [...prev, {
    ...getEmptyRow(),
    gstIncluded: true
  }]);

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    const isTimeBased = isTimeBasedRequirement(updatedRows[index].requirement);

    if (field === "quantity") updatedRows[index][field] = value.replace(/\D/g, "");
    else if (field === "rate") updatedRows[index][field] = value.replace(/[^\d.]/g, "").replace(/^(\d*\.?)|(\..*)/g, "$1$2");
    else if (field === "days") {
      updatedRows[index][field] = value.replace(/\D/g, "");
      if (isTimeBased) updatedRows[index].endDate = calculateDeliveryDate(updatedRows[index].startDate, parseInt(value) || 1);
    }
    else if (field === "startDate") {
      updatedRows[index][field] = value;
      if (isTimeBased) updatedRows[index].endDate = calculateDeliveryDate(value, parseInt(updatedRows[index].days) || 1);
    }
    else if (field === "gstIncluded") updatedRows[index][field] = value;
    else updatedRows[index][field] = value;

    updatedRows[index].total = calculateRowTotal(updatedRows[index]);
    setRows(updatedRows);

    const orderTotal = updatedRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
    setTotal(orderTotal.toFixed(2));
    setDiscountedTotal((orderTotal - parseFloat(discount) || 0).toFixed(2));
    updateBalance(orderTotal, advance);
  };

  const updateBalance = (orderTotal, advanceAmount) => {
    const adv = parseFloat(advanceAmount) || 0;
    const tot = parseFloat(orderTotal) - (parseFloat(discount) || 0);
    setBalance((tot - adv).toFixed(2));
  };

  const handleAdvanceChange = (value) => {
    const cleanedValue = value.replace(/[^\d.]/g, "").replace(/^(\d*\.?)|(\..*)/g, "$1$2");
    setAdvance(cleanedValue);
    updateBalance(total, cleanedValue);

    const advanceNum = parseFloat(cleanedValue) || 0;
    const totalNum = parseFloat(total) || 0;

    if (totalNum > 0 && !isAdmin) {
      const advancePercentage = (advanceNum / totalNum) * 100;

      if (advancePercentage < 50) {
        setAdvanceError("Advance payment must be at least 50% of the total amount");
      } else {
        setAdvanceError("");
      }
    } else {
      setAdvanceError("");
    }
  };

  const handleDiscountChange = (value) => {
    const cleanedValue = value.replace(/[^\d.]/g, "").replace(/^(\d*\.?)|(\..*)/g, "$1$2");
    setDiscount(cleanedValue);
    const discounted = parseFloat(total) - (parseFloat(cleanedValue)) || 0;
    setDiscountedTotal(discounted.toFixed(2));
    updateBalance(total, advance);
  };

  const handlePaymentMethodChange = async (method) => {
    if (paymentMethods.includes(method)) {
      setPaymentMethods(paymentMethods.filter((m) => m !== method));
      if (method === "UPI") setSelectedUpi("");
    } else {
      setPaymentMethods([...paymentMethods, method]);
      if (method === "UPI") {
        try {
          const res = await axios.get("/api/upi-numbers");
          setUpiOptions(res.data);
        } catch (err) {
          console.error("UPI fetch error:", err);
        }
      }
    }
  };

  const handleContactNumberChange = (e) => {
    const value = e.target.value;
    if (/^[+\d\s]*$/.test(value)) {
      setContactNumber(value);
      const phoneDigits = value.replace(/\D/g, "").substring(value.startsWith("+") ? 1 : 0);
      if (phoneDigits.length === 10) checkIfExistingClient(phoneDigits);
    }
  };

  const capitalizeFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  const validateLocation = (value) => {
    return /^[a-zA-Z\s\-.,()]*$/.test(value);
  };

  const validateContactPerson = (value) => {
    return /^[a-zA-Z\s]*$/.test(value);
  };

  const validateBusinessName = (value) => {
    return /^[A-Z0-9\s\-.,&()]*$/.test(value);
  };

  const validateContactNumber = (value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length <= 10;
  };

  const renderAdvanceValidation = () => {
    const advanceNum = parseFloat(advance) || 0;
    const totalNum = parseFloat(total) || 0;
    const advancePercentage = totalNum > 0 ? (advanceNum / totalNum) * 100 : 0;

    if (totalNum > 0 && !isAdmin) {
      return (
        <div style={{
          marginTop: "10px",
          padding: "10px",
          backgroundColor: advancePercentage < 50 ? "#fff3cd" : "#d4edda",
          borderRadius: "4px",
          border: `1px solid ${advancePercentage < 50 ? "#ffeaa7" : "#c3e6cb"}`
        }}>
          <strong>Advance Payment:</strong> {advancePercentage.toFixed(1)}% of total

          {advancePercentage < 50 ? (
            <div>
              <span style={{ color: "#856404", marginLeft: "10px" }}>
                ❌ Minimum 50% required
              </span>
              {!hasAdvanceApproval && !approvalRequested && (
                <div style={{ marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowAdvanceApprovalModal(true)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    📨 Request Approval for Low Advance
                  </button>
                </div>
              )}
              {approvalRequested && !hasAdvanceApproval && (
                <div style={{ marginTop: "8px", color: "#856404" }}>
                  <div>⏳ Approval request submitted - Waiting for admin approval</div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    🔄 Auto-checking every 5 seconds...
                  </div>
                </div>
              )}
              {hasAdvanceApproval && (
                <div style={{ marginTop: "8px", color: "#155724" }}>
                  ✅ Approved by admin - You can now submit this order
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: "#155724", marginLeft: "10px" }}>
              ✅ Minimum requirement met
            </span>
          )}
        </div>
      );
    }

    if (totalNum > 0 && isAdmin) {
      return (
        <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#d1ecf1", borderRadius: "4px" }}>
          <strong>Advance Payment:</strong> {advancePercentage.toFixed(1)}% of total
          <span style={{ color: "#0c5460", marginLeft: "10px" }}>ℹ️ Admin override enabled</span>
        </div>
      );
    }

    return null;
  };

  if (showInvoice) {
    return (
      <div ref={invoiceRef}>
        <Invoice
          orderNumber={orderNumber}
          business={business}
          contactPerson={contactPerson}
          clientLocation={clientLocation}
          contactNumber={contactNumber}
          selectedExecutive={selectedExecutive}
          orderDate={orderDate}
          rows={rows}
          total={total}
          discount={discount}
          discountedTotal={discountedTotal}
          advance={advance}
          balance={balance}
          onClose={() => setShowInvoice(false)}
          onPrint={handleInvoicePrint}
        />
      </div>
    );
  }

  // If viewing existing order, show clean document view
  if (existingData && !isCreatingNew) {
    return (
      <div id="print-area" ref={printRef} style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: 'white',
        fontSize: '14px'
      }}>
        {/* Header Section */}
        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #2196F3',
          borderBottom: '2px solid #2196F3'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 5px 0', color: '#1976d2', fontSize: '18px' }}>📋 ORDER DETAILS</h1>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Order Date</div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {new Date(existingData.orderDate).toLocaleDateString()}
                  </div>
                </div>
                {existingData.orderNumber && (
                  <div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Order Number</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1976d2' }}>
                      #{existingData.orderNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={createNewOrderFromExisting}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }}
              >
                📝 Create New Order
              </button>
              <button
                onClick={handlePrint}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }}
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '6px',
          marginBottom: '15px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{
            margin: '0 0 10px 0',
            color: '#333',
            fontSize: '16px',
            borderBottom: '1px solid #4CAF50',
            paddingBottom: '5px'
          }}>
            Customer Information
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Business Name</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                {existingData.business?.toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Contact Person</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                {existingData.contactPerson}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Contact Number</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                {existingData.contactCode || '+91'} {existingData.phone}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Location</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                {existingData.location}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Executive</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                {existingData.executive}
              </div>
            </div>
            {/* REMOVED: Sale Closed By display section */}

            {/* Lead Source display */}
            {existingData.leadSource && (
              <div>
                <div style={{ color: '#666', fontSize: '12px' }}>Lead Source</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#FF9800' }}>
                  {existingData.leadSource}
                  {existingData.otherLeadSource && ` (${existingData.otherLeadSource})`}
                </div>
              </div>
            )}
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Order Type</div>
              <div style={{
                fontWeight: 'bold',
                fontSize: '14px',
                color: existingData.clientType === 'Renewal' ? '#4CAF50' : '#2196F3'
              }}>
                {existingData.clientType}
              </div>
            </div>
            {isAdmin && existingData.createdBy && (
              <div>
                <div style={{ color: '#666', fontSize: '12px' }}>Created By</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#FF9800' }}>
                  {existingData.createdBy}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Requirements Table */}
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '6px',
          marginBottom: '15px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{
            margin: '0 0 10px 0',
            color: '#333',
            fontSize: '16px',
            borderBottom: '1px solid #4CAF50',
            paddingBottom: '5px'
          }}>
            Order Requirements
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              minWidth: '600px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#2196F3', color: 'white' }}>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Requirement</th>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                  <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>Rate (₹)</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>Total (₹)</th>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Delivery</th>
                  <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>GST</th>
                </tr>
              </thead>
              <tbody>
                {existingData.rows && existingData.rows.map((row, index) => {
                  const gstIncluded = row.gstIncluded !== undefined ? row.gstIncluded : true;
                  return (
                    <tr key={index} style={{
                      backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                      borderBottom: '1px solid #eee'
                    }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd', verticalAlign: 'top' }}>
                        {row.customRequirement || row.requirement}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', verticalAlign: 'top' }}>
                        {row.description}
                      </td>
                      <td style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        verticalAlign: 'top'
                      }}>
                        {row.quantity}
                      </td>
                      <td style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        textAlign: 'right',
                        verticalAlign: 'top'
                      }}>
                        ₹{parseFloat(row.rate).toFixed(2)}
                      </td>
                      <td style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        verticalAlign: 'top'
                      }}>
                        ₹{parseFloat(row.total).toFixed(2)}
                      </td>
                      <td style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        verticalAlign: 'top'
                      }}>
                        {new Date(row.deliveryDate).toLocaleDateString()}
                      </td>
                      <td style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        verticalAlign: 'top',
                        color: gstIncluded ? '#4CAF50' : '#999'
                      }}>
                        {gstIncluded ? '✓' : '✗'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '6px',
          marginBottom: '15px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{
            margin: '0 0 10px 0',
            color: '#333',
            fontSize: '16px',
            borderBottom: '1px solid #4CAF50',
            paddingBottom: '5px'
          }}>
            Payment Summary
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '15px'
          }}>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Total Amount</div>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#333' }}>
                ₹{parseFloat(existingData.total).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Discount</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#4CAF50' }}>
                ₹{parseFloat(existingData.discount || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Final Amount</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#2196F3' }}>
                ₹{(parseFloat(existingData.total) - parseFloat(existingData.discount || 0)).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Advance Paid</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#FF9800' }}>
                ₹{parseFloat(existingData.advance || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Balance</div>
              <div style={{
                fontWeight: 'bold',
                fontSize: '16px',
                color: existingData.balance > 0 ? '#F44336' : '#4CAF50'
              }}>
                ₹{parseFloat(existingData.balance || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '12px' }}>Advance Date</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                {existingData.advanceDate ? new Date(existingData.advanceDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ color: '#666', fontSize: '12px', marginBottom: '3px' }}>Payment Method</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
              {existingData.paymentMethods || 'Not specified'}
            </div>
          </div>

          {/* Additional Payment Details */}
          {(existingData.chequeNumber || existingData.poNumber || existingData.bankName) && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '13px' }}>Additional Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                {existingData.chequeNumber && (
                  <div>
                    <div style={{ color: '#666', fontSize: '11px' }}>Cheque Number</div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{existingData.chequeNumber}</div>
                  </div>
                )}
                {existingData.poNumber && (
                  <div>
                    <div style={{ color: '#666', fontSize: '11px' }}>PO Number</div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{existingData.poNumber}</div>
                  </div>
                )}
                {existingData.bankName && (
                  <div>
                    <div style={{ color: '#666', fontSize: '11px' }}>Bank Name</div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{existingData.bankName}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Design Status */}
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '1px solid #ddd',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: '0 0 10px 0',
            color: '#333',
            fontSize: '16px',
            borderBottom: '1px solid #4CAF50',
            paddingBottom: '5px'
          }}>
            Design Status
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: existingData.designStatus === 'provided' ? '#4CAF50' : '#FF9800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {existingData.designStatus === 'provided' ? '✓' : '!'}
            </div>
            <span style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: existingData.designStatus === 'provided' ? '#4CAF50' : '#FF9800'
            }}>
              {existingData.designStatus === 'provided' ? 'Design Provided' : 'Design Pending'}
            </span>
          </div>
          {existingData.designStatus !== 'provided' && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#FFF8E1',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#E65100'
            }}>
              This order requires design work. The design team has been notified.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          marginTop: '20px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              minWidth: '120px'
            }}
          >
            ← Back to Search
          </button>
          <button
            onClick={createNewOrderFromExisting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              minWidth: '120px'
            }}
          >
            📝 Create New Order
          </button>
          <button
            onClick={generateInvoice}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              minWidth: '120px'
            }}
          >
            🧾 Generate Invoice
          </button>
        </div>

        <style>{`
          @media print {
            button {
              display: none !important;
            }
            #print-area {
              padding: 10px !important;
              margin: 0 !important;
              font-size: 12px !important;
            }
            h1, h2, h3 {
              font-size: 14px !important;
              margin: 5px 0 !important;
            }
            table {
              font-size: 10px !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // Regular editable form for new orders
  return (
    <div id="print-area" ref={printRef}>
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-checkmark">✓</div>
            <h2>Order {existingData && !isCreatingNew ? "Updated" : "Submitted"} Successfully!</h2>
            {whatsappSent && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#e8f5e8',
                borderRadius: '4px',
                border: '1px solid #4caf50'
              }}>
                <p style={{ margin: 0, color: '#2e7d32' }}>
                  ✅ WhatsApp message has been sent to the customer!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advance Approval Modal */}
      {showAdvanceApprovalModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <h3>Request Advance Payment Approval</h3>
            <p>
              Your advance payment is less than 50% of the total amount.
              Please provide a reason for the low advance payment to request admin approval.
            </p>

            <div style={{ margin: "15px 0", padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>Order Details:</strong>
              <div>Business: {business}</div>
              <div>Contact: {contactPerson}</div>
              <div>Total Amount: ₹{total}</div>
              <div>Advance Paid: ₹{advance} ({((parseFloat(advance) || 0) / parseFloat(total) * 100).toFixed(1)}%)</div>
            </div>

            <label style={{ display: 'block', marginBottom: '15px' }}>
              Reason for Low Advance:
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Please explain why the advance payment is less than 50%..."
                rows="4"
                style={{ width: "100%", marginTop: "8px", padding: "8px", border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </label>

            <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAdvanceApprovalModal(false);
                  setApprovalReason("");
                }}
                className="btn btn-secondary"
                style={{
                  padding: '8px 16px',
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
                onClick={submitAdvanceApprovalRequest}
                disabled={isSubmittingApproval || !approvalReason.trim()}
                className="btn btn-primary"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSubmittingApproval ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingApproval || !approvalReason.trim() ? 0.6 : 1
                }}
              >
                {isSubmittingApproval ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-header">
        <h2 className="subtitle">ORDER FORM</h2>
        <div className="print-actions no-print">
          <button onClick={handlePrint} className="btn btn-print">
            Print Order
          </button>
          <button onClick={generateInvoice} className="btn btn-invoice">
            Generate Invoice
          </button>
        </div>
      </div>

      <div className="form-top">
        <div className="left">
          <label>
            Executive Name:
            {isAdmin ? (
              loadingExecutives ? (
                <input type="text" value="Loading executives..." readOnly />
              ) : (
                <select
                  value={selectedExecutive}
                  onChange={(e) => {
                    setSelectedExecutive(e.target.value);
                    fetchTargetForDate(orderDate);
                  }}
                  required
                >
                  <option value="">Select Executive</option>
                  {sortedExecutives.map((exec) => (
                    <option key={exec._id} value={exec.name}>{exec.name}</option>
                  ))}
                </select>
              )
            ) : (
              <input type="text" value={selectedExecutive} readOnly />
            )}
          </label>
          <label>
            Order Type:
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
              disabled={isNewFromExisting}  // Make it disabled/read-only
              style={{ backgroundColor: isNewFromExisting ? '#f5f5f5' : 'white' }}
            >
              <option value="">Select</option>
              <option value="Retail">Retail</option>
              <option value="Renewal">Renewal</option>
              <option value="Agent">Agent</option>
              <option value="Renewal-Agent">Renewal-Agent</option>
              <option value="Corporate">Corporate</option>
              <option value="Walk-In">Walk-In</option>
            </select>
          </label>

          <label>
            Business Name:
            <input
              type="text"
              value={business}
              onChange={(e) => handleBusinessChange(e.target.value)}
              placeholder="ENTER BUSINESS NAME"
              style={{ textTransform: 'uppercase' }}
              readOnly={isNewFromExisting}  // Make it read-only
              className={isNewFromExisting ? "readonly-field" : ""}
            />
          </label>

          {/* Contact Person field - make it read-only when in new from existing mode */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label>
              Contact Person:
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => {
                  if (validateContactPerson(e.target.value) || e.target.value === "") {
                    setContactPerson(capitalizeFirst(e.target.value));
                  }
                }}
                placeholder="Contact person name"
                readOnly={isNewFromExisting}  // Make it read-only
                className={isNewFromExisting ? "readonly-field" : ""}
              />
            </label>
          </div>

          {/* UPDATED SECTION: Removed Sale Closed By field */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>

              {/* Contact Number field - make it read-only */}
              <label>
                Contact Number:
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => {
                    if (validateContactNumber(e.target.value) || e.target.value === "") {
                      handleContactNumberChange(e);
                    }
                  }}
                  placeholder="+91 9876543210"
                  maxLength="14"
                  readOnly={isNewFromExisting}  // Make it read-only
                  className={isNewFromExisting ? "readonly-field" : ""}
                />
              </label>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label>
                Location:
                <input
                  type="text"
                  value={clientLocation}
                  onChange={(e) => {
                    if (validateLocation(e.target.value) || e.target.value === "") {
                      setClientLocation(e.target.value);
                    }
                  }}
                  placeholder="Enter location"
                />
              </label>
            </div>
            {/* Lead Source Field */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label>
                Lead Source:
                <select
                  value={leadSource}
                  onChange={(e) => handleLeadSourceChange(e.target.value)}
                >
                  <option value="">Select Lead Source</option>
                  {leadSources.map((source, index) => (
                    <option key={index} value={source}>{source}</option>
                  ))}
                </select>
                {leadSource === 'Other Specify' && (
                  <input
                    type="text"
                    value={otherLeadSource}
                    onChange={(e) => setOtherLeadSource(e.target.value)}
                    placeholder="Please specify lead source"
                    style={{ marginTop: '8px', width: '100%' }}
                    required
                  />
                )}
              </label>
            </div>
          </div>


          <div className="design-status-container" style={{ marginBottom: "16px" }}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ display: "block", fontSize: "16px", fontWeight: "500", color: "#333", marginBottom: "8px" }}>
                Design Status:
              </legend>
              <div style={{ display: "flex", gap: "24px", fontSize: "15px", alignItems: "center" }}>
                <label htmlFor="design-provided" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: 'pointer' }}>
                  <input
                    type="radio"
                    id="design-provided"
                    name="designStatus"
                    value="yes"
                    checked={design === "yes"}
                    onChange={(e) => setDesign(e.target.value)}
                    style={{ width: "16px", height: "16px", accentColor: "#4CAF50", cursor: 'pointer' }}
                  />
                  <span style={{ color: design === "yes" ? "#4CAF50" : "#555", fontWeight: design === "yes" ? "600" : "400" }}>
                    Design Provided
                  </span>
                </label>
                <label htmlFor="design-needed" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: 'pointer' }}>
                  <input
                    type="radio"
                    id="design-needed"
                    name="designStatus"
                    value="no"
                    checked={design === "no"}
                    onChange={(e) => setDesign(e.target.value)}
                    style={{ width: "16px", height: "16px", accentColor: "#FF5722", cursor: 'pointer' }}
                  />
                  <span style={{ color: design === "no" ? "#FF5722" : "#555", fontWeight: design === "no" ? "600" : "400" }}>
                    Need Design
                  </span>
                </label>
              </div>
            </fieldset>
            {design === "no" && (
              <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#FFF8E1", borderRadius: "6px", borderLeft: "4px solid #FFC107", fontSize: "14px" }}>
                <p style={{ margin: 0, color: "#E65100" }}>This request will be sent to the design team for processing.</p>
              </div>
            )}
          </div>
        </div>

        <div className="right">
          <label>
            Order Date:
            <input
              type="date"
              value={orderDate}
              onChange={handleOrderDateChange}
            />
          </label>

          <label>
            Target:
            <input
              type="number"
              value={loadingTarget ? "Loading..." : target}
              readOnly
              className={`read-only-input ${targetChanged ? "target-change-animation" : ""}`}
            />
          </label>

          <label>
            Contact Number:
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => {
                if (validateContactNumber(e.target.value) || e.target.value === "") {
                  handleContactNumberChange(e);
                }
              }}
              placeholder="+91 9876543210"
              maxLength="14"
            />
          </label>
        </div>
      </div>

      <div className="rows-section">
        <table>
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate (₹)</th>
              <th>Days</th>
              <th>GST 18%</th>
              <th>Total (₹)</th>
              <th>Delivery Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isTimeBased = isTimeBasedRequirement(row.requirement);
              return (
                <tr key={index}>
                  <td>
                    <Select
                      options={[
                        { value: '', label: 'Select Requirement' },
                        ...requirements.map(req => ({ value: req.name, label: req.name })),
                        { value: 'other', label: 'Other (Specify)' }
                      ]}
                      value={row.requirement ? { value: row.requirement, label: row.requirement } : null}
                      onChange={(selectedOption) => {
                        const value = selectedOption ? selectedOption.value : '';
                        handleRowChange(index, "requirement", value);
                        if (value !== "other") handleRowChange(index, "customRequirement", "");
                      }}
                      isSearchable={true}
                      placeholder="Search requirement..."
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '32px',
                          fontSize: '14px',
                        }),
                        menu: (base) => ({
                          ...base,
                          fontSize: '14px',
                        }),
                      }}
                    />
                    {row.requirement === "other" && (
                      <input
                        type="text"
                        value={row.customRequirement || ""}
                        onChange={(e) => handleRowChange(index, "customRequirement", e.target.value)}
                        placeholder="Enter custom requirement"
                        style={{ marginTop: "5px", width: "100%" }}
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handleRowChange(index, "description", capitalizeFirst(e.target.value))}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.quantity}
                      onChange={(e) => handleRowChange(index, "quantity", e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.rate}
                      onChange={(e) => handleRowChange(index, "rate", e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    {isTimeBased ? (
                      <input
                        type="text"
                        value={row.days}
                        onChange={(e) => handleRowChange(index, "days", e.target.value)}
                        placeholder="1"
                      />
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.gstIncluded}
                      onChange={(e) => handleRowChange(index, "gstIncluded", e.target.checked)}
                    />
                  </td>
                  <td>₹{row.total}</td>
                  <td>
                    {isTimeBased ? (
                      <>
                        <div>Start Date:</div>
                        <input
                          type="date"
                          value={row.startDate}
                          onChange={(e) => handleRowChange(index, "startDate", e.target.value)}
                        />
                        <div>End Date:</div>
                        <input type="date" value={row.endDate} readOnly />
                      </>
                    ) : (
                      <input
                        type="date"
                        value={row.deliveryDate}
                        onChange={(e) => handleRowChange(index, "deliveryDate", e.target.value)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={handleAddRow}>+ ADD ITEM</button>
      </div>

      <div className="payment-section">
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label>
              Advance Date:
              <input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
              />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <label>
              Payment Date:
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label>
              Advance (₹):
              <input
                type="text"
                value={advance}
                onChange={(e) => handleAdvanceChange(e.target.value)}
                placeholder="0.00"
                className={advanceError ? "error-input" : ""}
              />
              {advanceError && (
                <div className="error-message" style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>
                  {advanceError}
                </div>
              )}
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <label>
              Balance (₹):
              <input type="text" value={balance} readOnly />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <label>
              Total (₹):
              <input type="text" value={total} readOnly />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <label>
              Discount (₹):
              <input
                type="text"
                value={discount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <label>
              Final Amount (₹):
              <input type="text" value={discountedTotal} readOnly />
            </label>
          </div>
        </div>

        {renderAdvanceValidation()}
      </div>

      <div className="payment-method-section">
        <label>Payment Method:</label>
        <div className="payment-options">
          {["Cash", "UPI", "Cheque", "Bank Transfer", "Others", "PO"].map((method) => (
            <label key={method} style={{ marginRight: "15px", cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={paymentMethods.includes(method)}
                onChange={() => handlePaymentMethodChange(method)}
                style={{ marginRight: "5px", cursor: 'pointer' }}
              />
              {method}
            </label>
          ))}
        </div>

        {paymentMethods.includes("UPI") && (
          <div className="upi-section" style={{ marginTop: "10px" }}>
            <label>
              UPI ID:
              <select
                value={selectedUpi}
                onChange={(e) => setSelectedUpi(e.target.value)}
                style={{ marginLeft: "10px" }}
              >
                <option value="">Select UPI</option>
                {upiOptions.map((upi) => (
                  <option key={upi} value={upi}>{upi}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {paymentMethods.includes("Cheque") && (
          <div className="cheque-section" style={{ marginTop: "10px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label>
                Cheque Number:
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d{0,6}$/.test(value)) setChequeNumber(value);
                  }}
                  maxLength="6"
                  style={{ marginLeft: "10px" }}
                />
              </label>
            </div>
            <div>
              <label>
                Cheque Image:
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setChequeImage(e.target.files[0])}
                  style={{ marginLeft: "10px" }}
                />
              </label>
            </div>
          </div>
        )}

        {paymentMethods.includes("PO") && (
          <div className="po-section" style={{ marginTop: "10px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label>
                PO Number:
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  style={{ marginLeft: "10px" }}
                />
              </label>
            </div>
            <div>
              <label>
                PO Document:
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setPoDocument(e.target.files[0])}
                  style={{ marginLeft: "10px" }}
                />
              </label>
            </div>
          </div>
        )}

        {paymentMethods.includes("Bank Transfer") && (
          <div className="bank-transfer-section" style={{ marginTop: "10px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label>
                Bank Name:
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  style={{ marginLeft: "10px" }}
                />
              </label>
            </div>
            <div>
              <label>
                Transaction Reference:
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  style={{ marginLeft: "10px" }}
                />
              </label>
            </div>
          </div>
        )}

        {paymentMethods.includes("Others") && (
          <div className="other-method-section" style={{ marginTop: "10px" }}>
            <label>
              Specify Method:
              <input
                type="text"
                value={otherMethod}
                onChange={(e) => setOtherMethod(e.target.value)}
                style={{ marginLeft: "10px" }}
              />
            </label>
          </div>
        )}
      </div>

      <div className="form-actions no-print">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Back to Search
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!isAdmin && advanceError && !hasAdvanceApproval)}
          className="btn btn-primary"
        >
          {isSubmitting ? "Submitting..." : "Submit Order"}
        </button>
      </div>

      <style>{`
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .print-actions {
          display: flex;
          gap: 10px;
        }
        .btn-print, .btn-invoice {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-print {
          background-color: #4CAF50;
          color: white;
        }
        .btn-invoice {
          background-color: #2196F3;
          color: white;
        }
        .success-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          zIndex: 1000;
        }
        .success-modal {
          background: white;
          padding: 30px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .success-checkmark {
          font-size: 48px;
          color: #4CAF50;
          margin-bottom: 15px;
        }
        .form-top {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        .left, .right {
          flex: 1;
          min-width: 300px;
        }
        label {
          display: block;
          margin-bottom: 15px;
        }
        input, select {
          width: '100%';
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-top: 5px;
        }
        .error-input {
          border-color: red;
          background-color: #fff0f0;
        }
        .rows-section table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .rows-section th, .rows-section td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .rows-section th {
          background-color: navyblue;
          color: white;
        }
        .rows-section button {
          padding: 8px 16px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }
        .payment-section, .payment-method-section {
          margin-bottom: 20px;
        }
        .payment-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }
        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .btn-secondary {
          background-color: #f44336;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-primary {
          background-color: #4CAF50;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-primary:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        .target-change-animation {
          animation: targetChange 1.5s ease;
        }

        .readonly-field {
  background-color: #f5f5f5;
  color: #666;
  cursor: not-allowed;
  border-color: #ddd;
}

select:disabled {
  background-color: #f5f5f5;
  color: #666;
  cursor: not-allowed;
}
        .no-print {
          /* This class hides elements during printing */
        }
        @keyframes targetChange {
          0% { background-color: #ffffcc; }
          100% { background-color: transparent; }
        }
        @media (max-width: 768px) {
          .form-top {
            flex-direction: column;
          }
          .payment-section > div {
            flex-direction: column;
          }
          .left > div {
            flex-direction: column;
          }
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .form-actions {
            display: none !important;
          }
          .print-actions {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default OrderForm;