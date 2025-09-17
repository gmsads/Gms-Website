import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import Invoice from "./Invoice";
import Select from 'react-select'; // Import React-Select

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
  // eslint-disable-next-line no-unused-vars
  const [showAdvanceWarning, setShowAdvanceWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(true);
  const [targetChanged, setTargetChanged] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [sortedExecutives, setSortedExecutives] = useState([]);
  const [saleClosedByExecutives, setSaleClosedByExecutives] = useState([]);
  const [selectedExecutive, setSelectedExecutive] = useState(
    existingData?.executive ||
    (isAdmin ? "" : localStorage.getItem("userName") || "")
  );
  const [business, setBusiness] = useState(routerLocation.state?.businessName || "");
  const [contactPerson, setContactPerson] = useState(routerLocation.state?.customerName || "");
  const [clientLocation, setClientLocation] = useState(existingData?.location || "");
  const [saleClosedBy, setSaleClosedBy] = useState(existingData?.saleClosedBy || "");
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
  const [splitCommission, setSplitCommission] = useState(false);
  const [commissionSplitInfo, setCommissionSplitInfo] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [advanceError, setAdvanceError] = useState(""); // NEW: For advance validation
  const printRef = useRef();
  const invoiceRef = useRef();

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
      gstIncluded: false,
    };
  }

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

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `
      @page { size: auto; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      }
    `,
  });

  const handleInvoicePrint = useReactToPrint({
    content: () => invoiceRef.current,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
      }
    `,
  });

  const generateInvoice = () => {
    setShowInvoice(true);
  };

  // Function to reset form for new order
  const resetFormForNewOrder = () => {
    setSelectedExecutive(isAdmin ? "" : localStorage.getItem("userName") || "");
    setBusiness(routerLocation.state?.businessName || "");
    setContactPerson(routerLocation.state?.customerName || "");
    setClientLocation("");
    setSaleClosedBy("");
    setContactNumber(`+91 ${routerLocation.state?.phoneNumber || orderNumber}`);
    setOrderDate(new Date().toISOString().split("T")[0]);
    setAdvanceDate(new Date().toISOString().split("T")[0]);
    setClientType("");
    setTarget("");
    setDiscount(0);
    setRows([getEmptyRow()]);
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
    setSplitCommission(false);
    setCommissionSplitInfo(null);
    setAdvanceError(""); // NEW: Reset advance error
    setIsCreatingNew(true);
    if (onNewOrder) onNewOrder();
  };

  // NEW: Function to validate if advance is at least 50%
  // eslint-disable-next-line no-unused-vars
  const validateAdvance = (advanceAmount, totalAmount) => {
    const advanceNum = parseFloat(advanceAmount) || 0;
    const totalNum = parseFloat(totalAmount) || 0;

    if (totalNum === 0) return true; // No validation needed if total is 0

    const percentage = (advanceNum / totalNum) * 100;
    return percentage >= 50;
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingExecutives(true);
        const requirementsRes = await axios.get("/api/requirements");
        setRequirements([...requirementsRes.data].sort((a, b) => a.name.localeCompare(b.name)));

        // Fetch executives for sale closed by dropdown
        const execsRes = await axios.get("/api/executives");
        const sortedExecs = [...execsRes.data].sort((a, b) => a.name.localeCompare(b.name));
        setSaleClosedByExecutives(sortedExecs);

        if (isAdmin) {
          setSortedExecutives(sortedExecs);
        }

        await fetchTargetForDate(orderDate);

        if (existingData?.executive && !isCreatingNew) {
          setSelectedExecutive(existingData.executive);
        }

        if (routerLocation.state?.phoneNumber) {
          checkIfExistingClient(routerLocation.state.phoneNumber);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoadingExecutives(false);
      }
    };

    // Only populate with existing data if we're not creating a new order
    if (existingData && !isCreatingNew) {
      setSelectedExecutive(existingData.executive || (isAdmin ? "" : localStorage.getItem("userName") || ""));
      setBusiness(existingData.business || "");
      setContactPerson(existingData.contactPerson || "");
      setClientLocation(existingData.location || "");
      setSaleClosedBy(existingData.saleClosedBy || "");
      setContactNumber(`${existingData.contactCode || "+91"} ${existingData.phone || ""}`);
      setOrderDate(existingData.orderDate || new Date().toISOString().split("T")[0]);
      setClientType(existingData.clientType || "");
      setTarget(existingData.target || "");
      setDiscount(existingData.discount || 0);

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
          gstIncluded: row.gstIncluded || false,
        })));
        setTotal(existingData.total || 0);
        setDiscountedTotal(existingData.total - (existingData.discount || 0));
      }

      setAdvanceDate(existingData.advanceDate || new Date().toISOString().split("T")[0]);
      setPaymentDate(existingData.paymentDate || "");
      setAdvance(existingData.advance?.toString() || "");
      setBalance(existingData.balance?.toString() || "");
    }

    fetchInitialData();
  }, [existingData, orderNumber, isAdmin, executives, routerLocation.state, isCreatingNew]);

  // Check if commission should be split
  useEffect(() => {
    if (selectedExecutive && saleClosedBy) {
      const shouldSplit = selectedExecutive !== saleClosedBy;
      setSplitCommission(shouldSplit);

      if (shouldSplit) {
        const halfAmount = (parseFloat(discountedTotal) / 2).toFixed(2);
        setCommissionSplitInfo({
          executive1: selectedExecutive,
          executive2: saleClosedBy,
          amount1: halfAmount,
          amount2: halfAmount
        });
      } else {
        setCommissionSplitInfo(null);
      }
    }
  }, [selectedExecutive, saleClosedBy, discountedTotal]);

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

    // MODIFIED: Validate advance payment is at least 50% ONLY for non-admin users
    const advanceNum = parseFloat(advance) || 0;
    const totalNum = parseFloat(total) || 0;

    if (totalNum > 0 && !isAdmin) { // Only validate for non-admin users
      const advancePercentage = (advanceNum / totalNum) * 100;

      if (advancePercentage < 50) {
        setAdvanceError("Advance payment must be at least 50% of the total amount");
        return;
      } else {
        setAdvanceError("");
      }
    }


    setIsSubmitting(true);
    try {
      const phone = contactNumber.replace(/\D/g, "").slice(-10);
      if (phone.length !== 10) throw new Error("Please enter a valid 10-digit phone number");

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

      // Check if commission should be split (only if saleClosedBy is selected AND different from executive)
      const shouldSplitCommission = saleClosedBy && selectedExecutive !== saleClosedBy;

      // Use full amounts if no split, half amounts if split
      const finalTotal = shouldSplitCommission ? (parseFloat(total) / 2).toFixed(2) : parseFloat(total).toFixed(2);
      const finalDiscountedTotal = shouldSplitCommission ? (parseFloat(discountedTotal) / 2).toFixed(2) : parseFloat(discountedTotal).toFixed(2);
      const finalAdvance = shouldSplitCommission ? (parseFloat(advance) / 2).toFixed(2) : parseFloat(advance).toFixed(2);
      const finalBalance = shouldSplitCommission ? (parseFloat(balance) / 2).toFixed(2) : parseFloat(balance).toFixed(2);
      const finalDiscount = shouldSplitCommission ? (parseFloat(discount) / 2).toFixed(2) : parseFloat(discount).toFixed(2);

      // Base order data
      const mainOrderData = {
        executive: selectedExecutive,
        business,
        contactPerson,
        location: clientLocation,
        saleClosedBy: saleClosedBy || selectedExecutive, // Use executive name if saleClosedBy is empty
        contactCode: "+91",
        phone,
        orderDate,
        target,
        clientType: clientType || "New",
        rows: rows.map((row) => {
          const isTimeBased = isTimeBasedRequirement(row.requirement);
          const rowTotal = shouldSplitCommission ? (parseFloat(row.total) / 2).toFixed(2) : parseFloat(row.total).toFixed(2);

          return {
            requirement: row.requirement === "other" ? row.customRequirement : row.requirement,
            description: row.description,
            quantity: parseInt(row.quantity) || 0,
            rate: parseFloat(row.rate) || 0,
            days: isTimeBased ? parseInt(row.days) || 1 : undefined,
            startDate: isTimeBased ? row.startDate : undefined,
            endDate: isTimeBased ? row.endDate : undefined,
            total: rowTotal,
            deliveryDate: row.deliveryDate,
            customRequirement: row.requirement === "other" ? row.customRequirement : undefined,
            gstIncluded: row.gstIncluded || false,
          };
        }),
        advanceDate,
        paymentDate,
        paymentMethod: paymentMethodStr,
        advance: finalAdvance,
        balance: finalBalance,
        total: finalTotal,
        discount: finalDiscount,
        discountedTotal: finalDiscountedTotal,
        chequeNumber,
        chequeImage,
        designStatus: design === "no" ? "pending" : "provided",
        commissionSplit: shouldSplitCommission ? {
          executive1: selectedExecutive,
          executive2: saleClosedBy,
          amount1: finalDiscountedTotal,
          amount2: finalDiscountedTotal,
          split: true
        } : {
          executive: selectedExecutive,
          amount: parseFloat(discountedTotal),
          split: false
        }
      };

      // If commission is split, mark the main order
      if (shouldSplitCommission) {
        mainOrderData.isCommissionSplit = true;
        mainOrderData.splitDetails = {
          partnerExecutive: saleClosedBy,
          splitPercentage: 50
        };
      }

      setIsSubmittingDesign(true);
      await axios.post("/api/design-requests", designRequestData);
      setIsSubmittingDesign(false);

      // Submit the main order - check if we're updating existing or creating new
      const orderResponse = (existingData && !isCreatingNew)
        ? await axios.put(`/api/orders/${existingData._id}`, mainOrderData)
        : await axios.post("/api/submit", mainOrderData);

      // If commission is split, create a duplicate entry for the sale closed by executive
      if (shouldSplitCommission) {
        const duplicateOrderData = {
          ...mainOrderData,
          executive: saleClosedBy, // Change executive to sale closed by
          isCommissionSplit: true,
          originalOrderId: orderResponse.data._id, // Reference to original order
          splitDetails: {
            partnerExecutive: selectedExecutive,
            splitPercentage: 50
          }
        };

        // Create duplicate order for the sale closed by executive
        await axios.post("/api/submit", duplicateOrderData);
      }

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setIsSubmitting(false);
        setIsCreatingNew(false); // Reset the flag after successful submission
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

  const handleAddRow = () => setRows((prev) => [...prev, getEmptyRow()]);

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

    // MODIFIED: Only validate advance payment for non-admin users
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
      setAdvanceError(""); // Clear any existing errors for admin
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

  return (
    <div id="print-area" ref={printRef}>
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-checkmark">✓</div>
            <h2>Order {existingData && !isCreatingNew ? "Updated" : "Submitted"} Successfully!</h2>
          </div>
        </div>
      )}

      {existingData && !isCreatingNew && (
        <div className="existing-order-notice">
          <p>Loaded existing order from {new Date(existingData.orderDate).toLocaleDateString()}</p>
          <button onClick={resetFormForNewOrder}>
            Create New Order Instead
          </button>
        </div>
      )}

      <div className="form-header">
        <h2 className="subtitle">ORDER FORM</h2>
        <div className="print-actions">
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
            Client Type:
            <select value={clientType} onChange={(e) => setClientType(e.target.value)}>
              <option value="">Select</option>
              <option value="Retail">Retail</option>
              <option value="Renewal">Renewal</option>
              <option value="Agent">Agent</option>
              <option value="Renwal-Agent">Renewal-Agent</option>
              <option value="Corporate">Corporate</option>
              <option value="Walk-In">Walk-In</option>
            </select>
          </label>

          <label>
            Business Name:
            <input
              type="text"
              value={business}
              onChange={(e) => setBusiness(capitalizeFirst(e.target.value))}
              placeholder="Enter business name"
            />
          </label>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label>
                Contact Person:
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(capitalizeFirst(e.target.value))}
                  placeholder="Contact person name"
                />
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <label>
                Location:
                <input
                  type="text"
                  value={clientLocation}
                  onChange={(e) => setClientLocation(e.target.value)}
                  placeholder="Enter location"
                />
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <label>
                Sale Closed By:
                <select
                  value={saleClosedBy}
                  onChange={(e) => setSaleClosedBy(e.target.value)}
                >
                  <option value="">Select Executive</option>
                  {saleClosedByExecutives.map((exec) => (
                    <option key={exec._id} value={exec.name}>{exec.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Commission Split Information */}
          {splitCommission && commissionSplitInfo && (
            <div style={{
              backgroundColor: '#e8f5e8',
              border: '1px solid #4caf50',
              borderRadius: '6px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Commission Split (50/50)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <strong>{commissionSplitInfo.executive1}:</strong> ₹{commissionSplitInfo.amount1}
                </div>
                <div>
                  <strong>{commissionSplitInfo.executive2}:</strong> ₹{commissionSplitInfo.amount2}
                </div>
              </div>
            </div>
          )}

          <div className="design-status-container" style={{ marginBottom: "16px" }}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ display: "block", fontSize: "16px", fontWeight: "500", color: "#333", marginBottom: "8px" }}>
                Design Status:
              </legend>
              <div style={{ display: "flex", gap: "24px", fontSize: "15px", alignItems: "center" }}>
                <label htmlFor="design-provided" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    id="design-provided"
                    name="designStatus"
                    value="yes"
                    checked={design === "yes"}
                    onChange={(e) => setDesign(e.target.value)}
                    style={{ width: "16px", height: "16px", accentColor: "#4CAF50", cursor: "pointer" }}
                  />
                  <span style={{ color: design === "yes" ? "#4CAF50" : "#555", fontWeight: design === "yes" ? "600" : "400" }}>
                    Design Provided
                  </span>
                </label>
                <label htmlFor="design-needed" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    id="design-needed"
                    name="designStatus"
                    value="no"
                    checked={design === "no"}
                    onChange={(e) => setDesign(e.target.value)}
                    style={{ width: "16px", height: "16px", accentColor: "#FF5722", cursor: "pointer" }}
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
            <input type="date" value={orderDate} onChange={handleOrderDateChange} />
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
              onChange={handleContactNumberChange}
              placeholder="+91 9876543210"
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
                      isSearchable={true} // Enable search functionality
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

        {total > 0 && !isAdmin && (
          <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            <strong>Advance Payment:</strong> {((parseFloat(advance) || 0) / parseFloat(total) * 100).toFixed(1)}% of total
            {((parseFloat(advance) || 0) / parseFloat(total) * 100) < 50 ? (
              <span style={{ color: "red", marginLeft: "10px" }}>❌ Minimum 50% required</span>
            ) : (
              <span style={{ color: "green", marginLeft: "10px" }}>✅ Minimum requirement met</span>
            )}
          </div>
        )}

        {total > 0 && isAdmin && (
          <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "4px" }}>
            <strong>Advance Payment:</strong> {((parseFloat(advance) || 0) / parseFloat(total) * 100).toFixed(1)}% of total
            <span style={{ color: "blue", marginLeft: "10px" }}>ℹ️ Admin override enabled</span>
          </div>
        )}
      </div>

      <div className="payment-method-section">
        <label>Payment Method:</label>
        <div className="payment-options">
          {["Cash", "UPI", "Cheque", "Bank Transfer", "Others", "PO"].map((method) => (
            <label key={method} style={{ marginRight: "15px" }}>
              <input
                type="checkbox"
                checked={paymentMethods.includes(method)}
                onChange={() => handlePaymentMethodChange(method)}
                style={{ marginRight: "5px" }}
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

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Back to Search
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!isAdmin && advanceError)} // Only disable for non-admin with advance error
          className="btn btn-primary"
        >
          {isSubmitting ? "Submitting..." : (existingData && !isCreatingNew) ? "Update Order" : "Submit Order"}
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
          z-index: 1000;
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
        .warning-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .warning-modal {
          background: white;
          padding: 30px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          max-width: 400px;
        }
        .warning-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        .existing-order-notice {
          background-color: #e3f2fd;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          border-left: 4px solid #2196F3;
        }
        .existing-order-notice button {
          margin-top: 10px;
          padding: 8px 16px;
          background-color: #ff9800;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
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
          width: 100%;
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
        }
      `}</style>
    </div>
  );
}

export default OrderForm;