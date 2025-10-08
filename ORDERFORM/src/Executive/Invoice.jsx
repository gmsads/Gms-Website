import React, { useRef, useState, useEffect } from "react";
import html2pdf from "html2pdf.js";
import axios from "axios"; // Add at top
// Import your logo from assets (adjust the path as needed)
import companyLogo from "../assets/logo.png";

const Invoice = ({
  business,
  contactPerson,
  clientLocation,
  contactNumber,
  selectedExecutive,
  orderDate,
  rows,
  total,
  discount,
  discountedTotal,
  advance,
  balance,
  onClose,
}) => {
  const invoiceRef = useRef();
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Generate invoice number on component mount
  useEffect(() => {
    generateInvoiceNumber();
  }, []);

  const generateInvoiceNumber = () => {
    // Get the last invoice number from localStorage or start from 0
    const lastInvoiceNumber = parseInt(localStorage.getItem('lastInvoiceNumber') || '0');
    const formattedNumber = `GMS ${lastInvoiceNumber.toString().padStart(3, '0')}`;
    setInvoiceNumber(formattedNumber);
  };

  const incrementInvoiceNumber = () => {
    const lastInvoiceNumber = parseInt(localStorage.getItem('lastInvoiceNumber') || '0');
    const newInvoiceNumber = lastInvoiceNumber + 1;
    
    // Update localStorage with the new invoice number
    localStorage.setItem('lastInvoiceNumber', newInvoiceNumber.toString());
    
    // Format the invoice number as GMS 001, GMS 002, etc.
    const formattedNumber = `GMS ${newInvoiceNumber.toString().padStart(3, '0')}`;
    setInvoiceNumber(formattedNumber);
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) {
      console.error("No content to print");
      alert("No content available for printing");
      return;
    }

    const printWindow = window.open('', '_blank');
    const printStyles = `
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 10mm;
          color: #333;
          background: white;
          font-size: 12px;
        }
        .invoice-container {
          max-width: 190mm;
          margin: 0 auto;
          min-height: 277mm;
        }
        .no-print { display: none !important; }
        table { 
          width: 100%; 
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 11px;
        }
        th { 
          background-color: #2c3e50; 
          color: white; 
          padding: 8px; 
          text-align: left; 
          font-weight: 600;
          font-size: 11px;
        }
        td { 
          padding: 8px; 
          border-bottom: 1px solid #e9ecef;
          font-size: 11px;
        }
        .even-row { background-color: #f8f9fa; }
        .odd-row { background-color: white; }
        .totals { width: 250px; margin-left: auto; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; }
        .grand-total { border-top: 2px solid #2c3e50; border-bottom: 2px solid #2c3e50; padding: 8px 0; margin: 8px 0; }
        .balance-due { padding: 8px 0; margin: 8px 0; }
        .payment-info { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 15px; 
          gap: 20px;
          font-size: 11px;
        }
        .footer { margin-top: 20px; font-size: 11px; }
        .signature { margin-top: 30px; font-size: 11px; }
        
        /* Compact styles for single page */
        .header { margin-bottom: 15px; }
        .logo { width: 60px; height: 60px; }
        .company-name { font-size: 20px; }
        .invoice-title { font-size: 22px; margin-bottom: 3px; }
        .invoice-number { font-size: 14px; }
        .divider { margin: 15px 0; }
        .details-container { margin-bottom: 20px; }
        .section-title { font-size: 14px; margin-bottom: 8px; }
        .client-name { font-size: 16px; margin-bottom: 3px; }
        
        @media print {
          body { 
            margin: 0; 
            padding: 10mm;
            font-size: 12px;
          }
          .no-print { display: none !important; }
          .invoice-container { 
            max-width: 190mm;
            min-height: 277mm;
          }
        }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice-${invoiceNumber}</title>
          ${printStyles}
        </head>
        <body>
          <div class="invoice-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
const downloadPDF = async () => {
  const invoice = invoiceRef.current;
  if (!invoice) {
    alert("No content available for PDF generation");
    return;
  }

  try {
    // Generate PDF blob without auto-downloading
    const options = {
      margin: 8,
      filename: `invoice-${invoiceNumber}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    const pdf = await html2pdf().set(options).from(invoice).toPdf().get("pdf");
    const blob = pdf.output("blob");

    // Upload PDF to backend
    const formData = new FormData();
    formData.append("file", blob, `invoice-${invoiceNumber}.pdf`);

    // Use dynamic backend URL
    const backendURL =
      import.meta.env.VITE_API_URL || window.location.origin; // default to current domain
    const res = await axios.post(`${backendURL}/api/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const fileUrl = res.data.url;

    // Increment invoice number after successful upload
    incrementInvoiceNumber();

    // Format WhatsApp number (India)
    let phone = contactNumber.replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;

    // WhatsApp message
    const message = `Hello ${contactPerson || business},\nHere is your invoice: ${fileUrl}`;
    const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp chat
    window.open(whatsappURL, "_blank");

    alert("Invoice uploaded successfully! WhatsApp will open now.");
  } catch (error) {
    console.error("Error generating/sending PDF:", error);
    alert("Error sending invoice. Please try again.");
  }
};

  // Compact styles for single page
  const styles = {
    invoiceContainer: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      maxWidth: "190mm",
      minHeight: "277mm",
      margin: "0 auto",
      padding: "15mm",
      backgroundColor: "#fff",
      boxShadow: "0 0 20px rgba(0, 0, 0, 0.1)",
      color: "#333",
      position: "relative",
      fontSize: "12px"
    },
    noPrint: {
      marginBottom: "15px",
      display: "flex",
      gap: "8px",
      justifyContent: "center",
      padding: "8px",
      backgroundColor: "#f8f9fa",
      borderRadius: "6px"
    },
    backButton: {
      padding: "8px 16px",
      backgroundColor: "#6c757d",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "12px"
    },
    printButton: {
      padding: "8px 16px",
      backgroundColor: "#2c3e50",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "12px",
      margin: "0 4px"
    },
    downloadButton: {
      padding: "8px 16px",
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "12px",
      margin: "0 4px"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "15px"
    },
    logoContainer: {
      display: "flex",
      alignItems: "center",
      gap: "12px"
    },
    logo: {
      width: "60px",
      height: "60px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      overflow: "hidden"
    },
    logoImg: {
      width: "100%",
      height: "100%",
      objectFit: "contain"
    },
    companyInfo: {
      display: "flex",
      flexDirection: "column"
    },
    companyName: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#2c3e50",
      margin: "0"
    },
    companyTagline: {
      fontSize: "12px",
      color: "#7f8c8d",
      margin: "3px 0 0 0"
    },
    invoiceTitleContainer: {
      textAlign: "right"
    },
    invoiceTitle: {
      fontSize: "22px",
      fontWeight: "bold",
      color: "#2c3e50",
      margin: "0 0 3px 0"
    },
    invoiceNumber: {
      fontSize: "14px",
      color: "#7f8c8d",
      fontWeight: "500"
    },
    divider: {
      height: "2px",
      background: "linear-gradient(90deg, #2c3e50, #3498db, #2c3e50)",
      margin: "15px 0",
      borderRadius: "1px"
    },
    detailsContainer: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "20px"
    },
    billTo: {
      flex: "1"
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#2c3e50",
      margin: "0 0 8px 0",
      borderBottom: "2px solid #3498db",
      paddingBottom: "3px",
      width: "fit-content"
    },
    clientDetails: {
      lineHeight: "1.5",
      fontSize: "12px"
    },
    clientName: {
      fontWeight: "600",
      fontSize: "16px",
      color: "#2c3e50",
      marginBottom: "3px"
    },
    invoiceDetails: {
      textAlign: "right",
      fontSize: "12px"
    },
    detailRow: {
      marginBottom: "6px",
      display: "flex",
      justifyContent: "space-between",
      width: "250px"
    },
    detailLabel: {
      fontWeight: "600",
      color: "#2c3e50"
    },
    invoiceTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "20px",
      fontSize: "11px"
    },
    tableHeader: {
      backgroundColor: "#2c3e50",
      color: "white",
      padding: "8px",
      textAlign: "left",
      fontWeight: "600",
      fontSize: "11px"
    },
    descriptionColumn: {
      width: "35%"
    },
    evenRow: {
      backgroundColor: "#f8f9fa"
    },
    oddRow: {
      backgroundColor: "white"
    },
    tableCell: {
      padding: "8px",
      borderBottom: "1px solid #e9ecef",
      fontSize: "11px"
    },
    itemDescription: {
      fontWeight: "500",
      fontSize: "11px"
    },
    itemDetails: {
      fontSize: "10px",
      color: "#6c757d",
      marginTop: "3px"
    },
    totalsContainer: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: "20px"
    },
    totals: {
      width: "250px"
    },
    totalRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "8px",
      padding: "4px 0",
      fontSize: "11px"
    },
    totalLabel: {
      fontWeight: "500"
    },
    totalValue: {
      fontWeight: "500"
    },
    discountValue: {
      color: "#e74c3c"
    },
    grandTotal: {
      borderTop: "2px solid #2c3e50",
      borderBottom: "2px solid #2c3e50",
      padding: "8px 0",
      margin: "8px 0"
    },
    grandTotalLabel: {
      fontWeight: "bold",
      fontSize: "14px",
      color: "#2c3e50"
    },
    grandTotalValue: {
      fontWeight: "bold",
      fontSize: "14px",
      color: "#2c3e50"
    },
    balanceDue: {
      padding: "8px 0",
      margin: "8px 0"
    },
    balanceLabel: {
      fontWeight: "bold",
      fontSize: "14px",
      color: "#e74c3c"
    },
    balanceValue: {
      fontWeight: "bold",
      fontSize: "14px",
      color: "#e74c3c"
    },
    paymentInfo: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "20px",
      gap: "20px",
      fontSize: "11px"
    },
    paymentDetails: {
      flex: "1"
    },
    bankDetails: {
      lineHeight: "1.6",
      fontSize: "11px"
    },
    terms: {
      flex: "1"
    },
    termsList: {
      paddingLeft: "15px",
      fontSize: "11px",
      lineHeight: "1.5",
      margin: 0
    },
    footer: {
      marginTop: "20px",
      paddingTop: "15px",
      borderTop: "1px solid #e9ecef",
      textAlign: "center",
      fontSize: "11px"
    },
    footerContent: {
      lineHeight: "1.5"
    },
    contactInfo: {
      fontSize: "11px",
      color: "#6c757d",
      margin: "8px 0"
    },
    signature: {
      marginTop: "30px",
      textAlign: "right",
      fontSize: "11px"
    },
    signatureLine: {
      width: "150px",
      borderTop: "1px solid #2c3e50",
      marginLeft: "auto",
      marginBottom: "3px"
    },
    signatureLabel: {
      fontSize: "11px",
      color: "#6c757d"
    }
  };

  return (
    <div>
      <div style={styles.noPrint} className="no-print">
        <button onClick={onClose} style={styles.backButton}>
          <i className="fas fa-arrow-left"></i> Back to Form
        </button>
        <button onClick={handlePrint} style={styles.printButton}>
          <i className="fas fa-print"></i> Print Invoice
        </button>
        <button onClick={downloadPDF} style={styles.downloadButton}>
          <i className="fas fa-download"></i> Download PDF
        </button>
      </div>

      <div ref={invoiceRef} style={styles.invoiceContainer}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <div style={styles.logo}>
              <img src={companyLogo} alt="Company Logo" style={styles.logoImg} />
            </div>
            <div style={styles.companyInfo}>
              <div style={styles.companyName}>GMS ADVERTISING</div>
              <div style={styles.companyTagline}>One Stop Solution For Your Problem</div>
            </div>
          </div>
          <div style={styles.invoiceTitleContainer}>
            <h1 style={styles.invoiceTitle}>TAX INVOICE</h1>
            <div style={styles.invoiceNumber}>{invoiceNumber}</div>
          </div>
        </div>

        <div style={styles.divider}></div>

        <div style={styles.detailsContainer}>
          <div style={styles.billTo}>
            <h3 style={styles.sectionTitle}>Bill To:</h3>
            <div style={styles.clientDetails}>
              <div style={styles.clientName}>{business}</div>
              <div>{contactPerson}</div>
              <div>{clientLocation}</div>
              <div>{contactNumber}</div>
            </div>
          </div>
          
          <div style={styles.invoiceDetails}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Invoice Date:</span>
              <span>{new Date(orderDate).toLocaleDateString()}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Executive:</span>
              <span>{selectedExecutive}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Payment Terms:</span>
              <span>Net 15 Days</span>
            </div>
          </div>
        </div>

        <table style={styles.invoiceTable}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>#</th>
              <th style={{...styles.tableHeader, ...styles.descriptionColumn}}>Description</th>
              <th style={styles.tableHeader}>Qty</th>
              <th style={styles.tableHeader}>Rate (₹)</th>
              <th style={styles.tableHeader}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                <td style={styles.tableCell}>{index + 1}</td>
                <td style={styles.tableCell}>
                  <div style={styles.itemDescription}>
                    {row.requirement === "other" ? row.customRequirement : row.requirement}
                    {row.description && <div style={styles.itemDetails}>{row.description}</div>}
                    {(row.requirement === "Mobile Vans" || row.requirement === "Try Cycles") && 
                      <div style={styles.itemDetails}>({row.days} days)</div>}
                  </div>
                </td>
                <td style={styles.tableCell}>{row.quantity}</td>
                <td style={styles.tableCell}>₹{parseFloat(row.rate).toLocaleString('en-IN')}</td>
                <td style={styles.tableCell}>₹{parseFloat(row.total).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.totalsContainer}>
          <div style={styles.totals}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Subtotal:</span>
              <span style={styles.totalValue}>₹{parseFloat(total).toLocaleString('en-IN')}</span>
            </div>
            {discount > 0 && (
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Discount:</span>
                <span style={{...styles.totalValue, ...styles.discountValue}}>-₹{parseFloat(discount).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Tax (18% GST):</span>
              <span style={styles.totalValue}>₹{(parseFloat(total) * 0.18).toLocaleString('en-IN')}</span>
            </div>
            <div style={{...styles.totalRow, ...styles.grandTotal}}>
              <span style={styles.grandTotalLabel}>Total Amount:</span>
              <span style={styles.grandTotalValue}>₹{parseFloat(discountedTotal).toLocaleString('en-IN')}</span>
            </div>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Advance Paid:</span>
              <span style={styles.totalValue}>₹{parseFloat(advance || "0").toLocaleString('en-IN')}</span>
            </div>
            <div style={{...styles.totalRow, ...styles.balanceDue}}>
              <span style={styles.balanceLabel}>Balance Due:</span>
              <span style={styles.balanceValue}>₹{parseFloat(balance).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div style={styles.paymentInfo}>
          <div style={styles.paymentDetails}>
            <h3 style={styles.sectionTitle}>Payment Information</h3>
            <div style={styles.bankDetails}>
              <div>Account Name: GMS Advertising</div>
              <div>Bank: State Bank of India</div>
              <div>Account No: 123456789012</div>
              <div>IFSC Code: SBIN0001234</div>
              <div>UPI ID: gmsads@upi</div>
            </div>
          </div>
          <div style={styles.terms}>
            <h3 style={styles.sectionTitle}>Terms & Conditions</h3>
            <ul style={styles.termsList}>
              <li>Payment due within 15 days of invoice date</li>
              <li>1.5% monthly interest on late payments</li>
              <li>All designs are property of GMS Advertising until paid in full</li>
            </ul>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.footerContent}>
            <div>Thank you for your business!</div>
            <div style={styles.contactInfo}>
              <div>GMS Advertising • 123 Business Street, City - 560001</div>
              <div>Phone: +91 9876543210 • Email: info@gmsads.com • Website: www.gmsads.com</div>
            </div>
          </div>
        </div>

        <div style={styles.signature}>
          <div style={styles.signatureLine}></div>
          <div style={styles.signatureLabel}>Authorized Signature</div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;