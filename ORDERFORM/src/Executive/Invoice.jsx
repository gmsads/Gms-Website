import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import html2pdf from "html2pdf.js";

// Import your logo from assets (adjust the path as needed)
import companyLogo from "../assets/logo.png";

const Invoice = ({
  orderNumber,
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
  
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
  });

  const downloadPDF = () => {
    const invoice = invoiceRef.current;
    const options = {
      margin: 10,
      filename: `invoice-${orderNumber || "new"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    
    html2pdf().set(options).from(invoice).save();
  };

  const styles = {
    invoiceContainer: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      maxWidth: "210mm",
      minHeight: "297mm",
      margin: "0 auto",
      padding: "20mm",
      backgroundColor: "#fff",
      boxShadow: "0 0 20px rgba(0, 0, 0, 0.1)",
      color: "#333",
      position: "relative"
    },
    noPrint: {
      marginBottom: "20px",
      display: "flex",
      gap: "10px",
      justifyContent: "center",
      padding: "10px",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px"
    },
    backButton: {
      padding: "10px 20px",
      backgroundColor: "#6c757d",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "500",
      transition: "background-color 0.2s"
    },
    printButton: {
      padding: "10px 20px",
      backgroundColor: "#2c3e50",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "500",
      transition: "background-color 0.2s",
      margin: "0 5px"
    },
    downloadButton: {
      padding: "10px 20px",
      backgroundColor: "#28a745",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "500",
      transition: "background-color 0.2s",
      margin: "0 5px"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "20px"
    },
    logoContainer: {
      display: "flex",
      alignItems: "center",
      gap: "15px"
    },
    logo: {
      width: "80px",
      height: "80px",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
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
      fontSize: "24px",
      fontWeight: "bold",
      color: "#2c3e50",
      margin: "0"
    },
    companyTagline: {
      fontSize: "14px",
      color: "#7f8c8d",
      margin: "5px 0 0 0"
    },
    invoiceTitleContainer: {
      textAlign: "right"
    },
    invoiceTitle: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#2c3e50",
      margin: "0 0 5px 0"
    },
    invoiceNumber: {
      fontSize: "16px",
      color: "#7f8c8d",
      fontWeight: "500"
    },
    divider: {
      height: "2px",
      background: "linear-gradient(90deg, #2c3e50, #3498db, #2c3e50)",
      margin: "20px 0",
      borderRadius: "1px"
    },
    detailsContainer: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "30px"
    },
    billTo: {
      flex: "1"
    },
    sectionTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#2c3e50",
      margin: "0 0 10px 0",
      borderBottom: "2px solid #3498db",
      paddingBottom: "5px",
      width: "fit-content"
    },
    clientDetails: {
      lineHeight: "1.6"
    },
    clientName: {
      fontWeight: "600",
      fontSize: "18px",
      color: "#2c3e50",
      marginBottom: "5px"
    },
    invoiceDetails: {
      textAlign: "right"
    },
    detailRow: {
      marginBottom: "8px",
      display: "flex",
      justifyContent: "space-between",
      width: "300px"
    },
    detailLabel: {
      fontWeight: "600",
      color: "#2c3e50"
    },
    invoiceTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "30px",
      fontSize: "14px"
    },
    tableHeader: {
      backgroundColor: "#2c3e50",
      color: "white",
      padding: "12px",
      textAlign: "left",
      fontWeight: "600"
    },
    descriptionColumn: {
      width: "40%"
    },
    evenRow: {
      backgroundColor: "#f8f9fa"
    },
    oddRow: {
      backgroundColor: "white"
    },
    tableCell: {
      padding: "12px",
      borderBottom: "1px solid #e9ecef"
    },
    itemDescription: {
      fontWeight: "500"
    },
    itemDetails: {
      fontSize: "12px",
      color: "#6c757d",
      marginTop: "5px"
    },
    totalsContainer: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: "30px"
    },
    totals: {
      width: "300px"
    },
    totalRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "10px",
      padding: "5px 0"
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
      padding: "10px 0",
      margin: "10px 0"
    },
    grandTotalLabel: {
      fontWeight: "bold",
      fontSize: "16px",
      color: "#2c3e50"
    },
    grandTotalValue: {
      fontWeight: "bold",
      fontSize: "16px",
      color: "#2c3e50"
    },
    balanceDue: {
      padding: "10px 0",
      margin: "10px 0"
    },
    balanceLabel: {
      fontWeight: "bold",
      fontSize: "16px",
      color: "#e74c3c"
    },
    balanceValue: {
      fontWeight: "bold",
      fontSize: "16px",
      color: "#e74c3c"
    },
    paymentInfo: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "30px",
      gap: "30px"
    },
    paymentDetails: {
      flex: "1"
    },
    bankDetails: {
      lineHeight: "1.8",
      fontSize: "14px"
    },
    terms: {
      flex: "1"
    },
    termsList: {
      paddingLeft: "20px",
      fontSize: "14px",
      lineHeight: "1.6"
    },
    footer: {
      marginTop: "40px",
      paddingTop: "20px",
      borderTop: "1px solid #e9ecef",
      textAlign: "center"
    },
    footerContent: {
      lineHeight: "1.6"
    },
    contactInfo: {
      fontSize: "14px",
      color: "#6c757d",
      margin: "10px 0"
    },
    gstin: {
      fontWeight: "600",
      color: "#2c3e50"
    },
    signature: {
      marginTop: "60px",
      textAlign: "right"
    },
    signatureLine: {
      width: "200px",
      borderTop: "1px solid #2c3e50",
      marginLeft: "auto",
      marginBottom: "5px"
    },
    signatureLabel: {
      fontSize: "14px",
      color: "#6c757d"
    }
  };

  return (
    <div>
      <div style={styles.noPrint}>
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
            <div style={styles.invoiceNumber}>INV-{orderNumber || "NEW"}</div>
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
            <div style={styles.gstin}>GSTIN: 22AAAAA0000A1Z5</div>
          </div>
        </div>

       
      </div>
    </div>
  );
};

export default Invoice;