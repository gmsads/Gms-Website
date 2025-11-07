import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// Backend API service functions
const apiService = {
  // Lead operations
  async fetchLeads(filterStatus = 'all', month = '', year = '') {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filterStatus, month, year }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching leads:', error);
      return { data: [], error: error.message };
    }
  },

  async createLead(lead) {
    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lead),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating lead:', error);
      return { error: error.message };
    }
  },

  async updateLead(leadId, updates) {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating lead:', error);
      return { error: error.message };
    }
  },

  async bulkInsertLeads(leads) {
    try {
      const response = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error bulk inserting leads:', error);
      return { error: error.message };
    }
  },

  // Call log operations
  async createCallLog(callLog) {
    try {
      const response = await fetch('/api/call-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callLog),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating call log:', error);
      return { error: error.message };
    }
  },

  async fetchCallLogs() {
    try {
      const response = await fetch('/api/call-logs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching call logs:', error);
      return { data: [], error: error.message };
    }
  }
};

function TeleCRM() {
  const [leads, setLeads] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executiveName, setExecutiveName] = useState('');
  const [executivePhone, setExecutivePhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [callResult, setCallResult] = useState('completed');
  const [callDuration, setCallDuration] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [showImportResults, setShowImportResults] = useState(false);

  // Generate months and years for filters
  const months = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = [
    { value: '', label: 'All Years' },
    { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() },
    { value: currentYear.toString(), label: currentYear.toString() },
    { value: (currentYear + 1).toString(), label: (currentYear + 1).toString() }
  ];

  useEffect(() => {
    fetchLeads();
    fetchCallLogs();
  }, [filterStatus, monthFilter, yearFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const result = await apiService.fetchLeads(filterStatus, monthFilter, yearFilter);
      if (result.error) {
        alert('Error fetching leads: ' + result.error);
      } else {
        setLeads(result.data || []);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  const fetchCallLogs = async () => {
    try {
      const result = await apiService.fetchCallLogs();
      if (result.error) {
        console.error('Error fetching call logs:', result.error);
      } else {
        setCallLogs(result.data || []);
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  };

  // Check if a lead already exists (by phone number)
  const checkExistingLead = (phone) => {
    return leads.find(lead => lead.phone === phone);
  };

  // Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    // Check if it's already in DD/MM/YYYY format
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${day}/${month}/${year}`;
      }
    }
    
    // Handle ISO date strings
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB'); // This gives DD/MM/YYYY format
    }
    
    return dateString;
  } catch (error) {
    return dateString;
  }
};

// Import leads from Excel
const handleImportFromExcel = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!executiveName.trim()) {
    alert('Please enter your name before importing leads');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert('No data found in Excel file');
        return;
      }

      setLoading(true);

      // Process Excel data - flexible column names
      const leadsToInsert = [];
      const duplicateLeads = [];
      const newLeads = [];

      // Get today's date in DD/MM/YYYY format for default
      const today = new Date();
      const defaultDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

      for (const row of jsonData) {
        // Handle different column name variations
        const name = row.Name || row.name || row.NAME || row['Customer Name'] || row['Client Name'] || 'Unknown';
        const phone = String(row.Phone || row.phone || row.PHONE || row['Phone Number'] || row['Contact'] || row['Mobile'] || '');
        const company = row.Company || row.company || row.COMPANY || row['Company Name'] || row['Business'] || '';
        const email = row.Email || row.email || row.EMAIL || row['Email Address'] || '';
        
        // SIMPLE FIX: ALWAYS use today's date, ignore whatever is in Excel
        let date = defaultDate;

        // Validate required fields
        if (!name || name === 'Unknown') {
          throw new Error(`Row ${jsonData.indexOf(row) + 2}: Name is required`);
        }
        if (!phone) {
          throw new Error(`Row ${jsonData.indexOf(row) + 2}: Phone number is required`);
        }

        const leadData = {
          Date: date,
          name: name,
          phone: phone,
          email: email,
          company: company,
          source: 'Excel Import',
          employee_name: executiveName,
          status: 'pending',
          notes: '',
        };

        // Check if lead already exists
        const existingLead = checkExistingLead(phone);
        if (existingLead) {
          duplicateLeads.push({
            ...leadData,
            existingData: existingLead
          });
        } else {
          newLeads.push(leadData);
          leadsToInsert.push(leadData);
        }
      }

      console.log('New leads to insert:', newLeads.length);
      console.log('Duplicate leads found:', duplicateLeads.length);

      let result;
      if (leadsToInsert.length > 0) {
        // Send to backend for storage
        result = await apiService.bulkInsertLeads(leadsToInsert);
        console.log('Backend response:', result);
      }

      // Show import results
      setImportResults({
        total: jsonData.length,
        inserted: leadsToInsert.length,
        duplicates: duplicateLeads.length,
        duplicateLeads: duplicateLeads,
        newLeads: newLeads
      });
      setShowImportResults(true);

      if (result && result.error) {
        alert('Error importing leads: ' + result.error);
      } else {
        if (leadsToInsert.length > 0) {
          fetchLeads(); // Refresh the leads list
        }
      }
      
      e.target.value = '';
    } catch (err) {
      alert('Error reading file: ' + err.message);
    }
    setLoading(false);
  };
  reader.readAsArrayBuffer(file);
};

// Helper function to validate date format
const isValidDate = (dateString) => {
  // Check if it's in DD/MM/YYYY format
  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const parts = dateString.split('/');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  // Check the ranges
  if (year < 1000 || year > 3000 || month === 0 || month > 12) return false;
  
  const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Adjust for leap years
  if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) {
    monthLength[1] = 29;
  }
  
  // Check the day range
  return day > 0 && day <= monthLength[month - 1];
};

  const handleCallClick = (lead) => {
    if (!executivePhone.trim()) {
      alert('Please enter your phone number first');
      return;
    }
    setSelectedLead(lead);
    setShowCallModal(true);
  };

  const handleInitiateCall = async () => {
    if (!selectedLead) return;

    try {
      // Log the call initiation
      const callLogResult = await apiService.createCallLog({
        lead_id: selectedLead._id,
        executive_name: executiveName,
        executive_phone: executivePhone,
        client_phone: selectedLead.phone,
        call_status: 'initiated',
        notes: `Call initiated from ${executiveName} (${executivePhone}) to ${selectedLead.name}`
      });

      if (callLogResult.error) {
        console.error('Error creating call log:', callLogResult.error);
      }

      // Update lead with call timestamp
      const updateResult = await apiService.updateLead(selectedLead._id, {
        called_at: new Date().toISOString(),
      });

      if (updateResult.error) {
        console.error('Error updating lead:', updateResult.error);
      }

      // Initiate phone call
      window.location.href = `tel:${selectedLead.phone}`;

      setShowCallModal(false);
      setTimeout(() => {
        fetchLeads();
        fetchCallLogs();
      }, 1000);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEndCall = async () => {
    if (!selectedLead) return;

    try {
      const duration = callDuration ? parseInt(callDuration) : 0;

      // Log the call completion
      const callLogResult = await apiService.createCallLog({
        lead_id: selectedLead._id,
        executive_name: executiveName,
        executive_phone: executivePhone,
        client_phone: selectedLead.phone,
        call_status: callResult,
        call_duration: duration,
        notes: `Call ${callResult}. Duration: ${duration} seconds`
      });

      if (callLogResult.error) {
        console.error('Error creating call log:', callLogResult.error);
      }

      const statusMap = {
        'completed': 'pending',
        'sale': 'sale',
        'not_interested': 'not_interested',
        'callback': 'callback',
        'no_answer': 'no_answer'
      };

      // Update lead status
      const updateResult = await apiService.updateLead(selectedLead._id, {
        status: statusMap[callResult] || 'pending',
      });

      if (updateResult.error) {
        alert('Error updating status: ' + updateResult.error);
      }

      setShowCallModal(false);
      setCallResult('completed');
      setCallDuration('');
      setSelectedLead(null);

      fetchLeads();
      fetchCallLogs();
      
      alert(`Call completed! Status updated to: ${callResult}`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    setLoading(true);
    const result = await apiService.updateLead(leadId, {
      status: newStatus,
    });

    if (result.error) {
      alert('Error updating status: ' + result.error);
    } else {
      fetchLeads();
    }
    setLoading(false);
  };

  const handleNotesChange = async (leadId, notes) => {
    const result = await apiService.updateLead(leadId, {
      notes: notes,
    });

    if (result.error) {
      console.error('Error updating notes:', result.error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffa500',
      sale: '#28a745',
      not_interested: '#dc3545',
      callback: '#17a2b8',
      no_answer: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const getRowStyle = (lead, index) => {
    const baseStyle = {
      backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
    };

    // Check if this is a recently imported lead (within last 5 minutes)
    if (lead.createdAt) {
      const createdTime = new Date(lead.createdAt).getTime();
      const currentTime = new Date().getTime();
      const fiveMinutesAgo = currentTime - (5 * 60 * 1000);
      
      if (createdTime > fiveMinutesAgo) {
        return {
          ...baseStyle,
          backgroundColor: '#e8f5e8',
          borderLeft: '4px solid #28a745'
        };
      }
    }

    return baseStyle;
  };

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    },
    header: {
      backgroundColor: '#2c3e50',
      color: 'white',
      padding: '30px',
      borderRadius: '8px',
      marginBottom: '30px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    title: {
      margin: '0 0 10px 0',
      fontSize: '32px',
      fontWeight: 'bold'
    },
    subtitle: {
      margin: '0',
      fontSize: '16px',
      opacity: '0.9'
    },
    controlPanel: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      marginBottom: '25px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      alignItems: 'end'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#333'
    },
    input: {
      padding: '10px',
      fontSize: '14px',
      border: '2px solid #ddd',
      borderRadius: '5px',
      outline: 'none',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    select: {
      padding: '10px',
      fontSize: '14px',
      border: '2px solid #ddd',
      borderRadius: '5px',
      outline: 'none',
      cursor: 'pointer',
      backgroundColor: 'white',
      boxSizing: 'border-box'
    },
    button: {
      padding: '12px 20px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      transition: 'background-color 0.3s',
      boxSizing: 'border-box'
    },
    buttonGreen: {
      padding: '12px 20px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      transition: 'background-color 0.3s',
      boxSizing: 'border-box'
    },
    buttonBlue: {
      padding: '12px 20px',
      backgroundColor: '#2980b9',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      transition: 'background-color 0.3s',
      boxSizing: 'border-box'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '15px',
      marginBottom: '25px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: 'bold',
      margin: '0 0 5px 0'
    },
    statLabel: {
      fontSize: '13px',
      color: '#666',
      margin: '0'
    },
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'auto',
      marginBottom: '20px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      backgroundColor: '#34495e',
      color: 'white',
      padding: '12px 8px',
      textAlign: 'left',
      fontWeight: 'bold',
      position: 'sticky',
      top: '0',
      zIndex: '10'
    },
    td: {
      padding: '10px 8px',
      borderBottom: '1px solid #eee'
    },
    callButton: {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '8px 12px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold',
      transition: 'background-color 0.3s',
      whiteSpace: 'nowrap'
    },
    statusSelect: {
      padding: '6px 8px',
      borderRadius: '5px',
      border: '2px solid #ddd',
      fontSize: '12px',
      fontWeight: 'bold',
      cursor: 'pointer',
      outline: 'none',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    notesInput: {
      width: '100%',
      padding: '6px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '12px',
      resize: 'vertical',
      minHeight: '35px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif'
    },
    modal: {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000'
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '15px',
      color: '#2c3e50'
    },
    modalInfo: {
      backgroundColor: '#f0f8ff',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '2px solid #007bff'
    },
    modalInfoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontSize: '14px'
    },
    modalButtonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      fontSize: '18px',
      color: '#666'
    },
    noData: {
      textAlign: 'center',
      padding: '40px',
      fontSize: '16px',
      color: '#999'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      color: 'white'
    },
    newBadge: {
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: '8px',
      fontSize: '10px',
      fontWeight: 'bold',
      backgroundColor: '#28a745',
      color: 'white',
      marginLeft: '5px'
    },
    filterSection: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    },
    importResults: {
      marginTop: '10px',
      padding: '15px',
      borderRadius: '5px',
      backgroundColor: '#e7f3ff',
      border: '1px solid #007bff'
    },
    duplicateRow: {
      backgroundColor: '#fff3cd !important',
      borderLeft: '4px solid #ffc107'
    }
  };

  const stats = {
    total: leads.length,
    pending: leads.filter(l => l.status === 'pending').length,
    sale: leads.filter(l => l.status === 'sale').length,
    notInterested: leads.filter(l => l.status === 'not_interested').length,
    callback: leads.filter(l => l.status === 'callback').length,
    noAnswer: leads.filter(l => l.status === 'no_answer').length
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📞 Tele CRM System</h1>
        <p style={styles.subtitle}>Connect your sales team to leads and track call responses</p>
      </div>

      <div style={styles.controlPanel}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Executive Name</label>
          <input
            type="text"
            value={executiveName}
            onChange={(e) => setExecutiveName(e.target.value)}
            placeholder="Your name"
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Your Phone Number</label>
          <input
            type="tel"
            value={executivePhone}
            onChange={(e) => setExecutivePhone(e.target.value)}
            placeholder="e.g., 8019771538"
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Import Excel Data</label>
          <button
            onClick={() => document.getElementById('importExcelInput').click()}
            style={styles.buttonBlue}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2471a3'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2980b9'}
          >
            Import from Excel
          </button>
          
          {/* Hidden file input */}
          <input
            id="importExcelInput"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleImportFromExcel}
            style={{ display: 'none' }}
          />
          
          <small style={{color: '#666', marginTop: '5px', display: 'block'}}>
            Supported columns: Name, Phone, Company, Email, Date
          </small>

          {importResults && (
            <div style={styles.importResults}>
              <strong>Last Import Results:</strong><br />
              ✅ New: {importResults.inserted} | ⚠️ Duplicates: {importResults.duplicates} | 📊 Total: {importResults.total}
              {importResults.duplicates > 0 && (
                <button 
                  onClick={() => setShowImportResults(true)}
                  style={{...styles.button, padding: '5px 10px', fontSize: '12px', marginLeft: '10px'}}
                >
                  View Details
                </button>
              )}
            </div>
          )}
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Leads</option>
            <option value="pending">Pending</option>
            <option value="sale">Sale</option>
            <option value="not_interested">Not Interested</option>
            <option value="callback">Callback</option>
            <option value="no_answer">No Answer</option>
          </select>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Date Filters</label>
          <div style={styles.filterSection}>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={styles.select}
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={styles.select}
            >
              {years.map(year => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h2 style={{...styles.statNumber, color: '#2c3e50'}}>{stats.total}</h2>
          <p style={styles.statLabel}>Total Leads</p>
        </div>
        <div style={styles.statCard}>
          <h2 style={{...styles.statNumber, color: '#ffa500'}}>{stats.pending}</h2>
          <p style={styles.statLabel}>Pending</p>
        </div>
        <div style={styles.statCard}>
          <h2 style={{...styles.statNumber, color: '#28a745'}}>{stats.sale}</h2>
          <p style={styles.statLabel}>Sales</p>
        </div>
        <div style={styles.statCard}>
          <h2 style={{...styles.statNumber, color: '#dc3545'}}>{stats.notInterested}</h2>
          <p style={styles.statLabel}>Not Interested</p>
        </div>
        <div style={styles.statCard}>
          <h2 style={{...styles.statNumber, color: '#17a2b8'}}>{stats.callback}</h2>
          <p style={styles.statLabel}>Callback</p>
        </div>
        <div style={styles.statCard}>
          <h2 style={{...styles.statNumber, color: '#6c757d'}}>{stats.noAnswer}</h2>
          <p style={styles.statLabel}>No Answer</p>
        </div>
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : leads.length === 0 ? (
          <div style={styles.noData}>
            No leads found. Import an Excel file to get started!
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Company</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Notes</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr
                  key={lead._id}
                  style={getRowStyle(lead, index)}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = getRowStyle(lead, index).backgroundColor}
                >
                  <td style={styles.td}>
                    {formatDate(lead.Date)}
                    {lead.createdAt && new Date(lead.createdAt).getTime() > (new Date().getTime() - (5 * 60 * 1000)) && (
                      <span style={styles.newBadge}>NEW</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <strong>{lead.name}</strong>
                  </td>
                  <td style={styles.td}>
                    <span style={{...styles.badge, backgroundColor: '#007bff'}}>
                      {lead.phone}
                    </span>
                  </td>
                  <td style={styles.td}>{lead.email || '-'}</td>
                  <td style={styles.td}>{lead.company || '-'}</td>
                  <td style={styles.td}>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                      style={{
                        ...styles.statusSelect,
                        borderColor: getStatusColor(lead.status),
                        color: getStatusColor(lead.status)
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="sale">Sale</option>
                      <option value="not_interested">Not Interested</option>
                      <option value="callback">Callback</option>
                      <option value="no_answer">No Answer</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <textarea
                      defaultValue={lead.notes || ''}
                      onBlur={(e) => handleNotesChange(lead._id, e.target.value)}
                      placeholder="Add notes..."
                      style={styles.notesInput}
                    />
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleCallClick(lead)}
                      style={styles.callButton}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                    >
                      📞 Call
                    </button>
                  </td>
                  <td style={styles.td}>
                    <small style={{color: '#666'}}>
                      {lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : 
                       lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCallModal && selectedLead && (
        <div style={styles.modal} onClick={() => setShowCallModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📞 Call Information</h2>

            <div style={styles.modalInfo}>
              <div style={styles.modalInfoRow}>
                <strong>Sales Executive:</strong>
                <span>{executiveName}</span>
              </div>
              <div style={styles.modalInfoRow}>
                <strong>Your Phone:</strong>
                <span style={{color: '#007bff', fontWeight: 'bold'}}>{executivePhone}</span>
              </div>
              <div style={styles.modalInfoRow}>
                <strong>Client Name:</strong>
                <span>{selectedLead.name}</span>
              </div>
              <div style={styles.modalInfoRow}>
                <strong>Client Phone:</strong>
                <span style={{color: '#28a745', fontWeight: 'bold'}}>{selectedLead.phone}</span>
              </div>
              <div style={styles.modalInfoRow}>
                <strong>Company:</strong>
                <span>{selectedLead.company || 'N/A'}</span>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Call Result</label>
              <select
                value={callResult}
                onChange={(e) => setCallResult(e.target.value)}
                style={styles.select}
              >
                <option value="completed">Completed</option>
                <option value="sale">Sale</option>
                <option value="not_interested">Not Interested</option>
                <option value="callback">Callback Required</option>
                <option value="no_answer">No Answer</option>
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Call Duration (seconds)</label>
              <input
                type="number"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                placeholder="e.g., 120"
                style={styles.input}
              />
            </div>

            <div style={styles.modalButtonGroup}>
              <button
                onClick={handleInitiateCall}
                style={{...styles.button, flex: 1, backgroundColor: '#28a745'}}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
              >
                📞 Start Call
              </button>
              <button
                onClick={handleEndCall}
                style={{...styles.button, flex: 1}}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
              >
                ✓ End Call
              </button>
              <button
                onClick={() => setShowCallModal(false)}
                style={{...styles.button, flex: 1, backgroundColor: '#6c757d'}}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportResults && importResults && (
        <div style={styles.modal} onClick={() => setShowImportResults(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📊 Import Results</h2>
            
            <div style={styles.modalInfo}>
              <div style={styles.modalInfoRow}>
                <strong>Total Records:</strong>
                <span>{importResults.total}</span>
              </div>
              <div style={styles.modalInfoRow}>
                <strong>New Leads Added:</strong>
                <span style={{color: '#28a745', fontWeight: 'bold'}}>{importResults.inserted}</span>
              </div>
              <div style={styles.modalInfoRow}>
                <strong>Duplicate Leads Found:</strong>
                <span style={{color: '#ffc107', fontWeight: 'bold'}}>{importResults.duplicates}</span>
              </div>
            </div>

            {importResults.duplicates > 0 && (
              <div>
                <h3 style={{margin: '15px 0 10px 0', fontSize: '16px', color: '#ffc107'}}>
                  ⚠️ Duplicate Leads (Already Exist):
                </h3>
                <div style={{maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '5px', padding: '10px'}}>
                  {importResults.duplicateLeads.map((dup, index) => (
                    <div key={index} style={{padding: '5px 0', borderBottom: '1px solid #eee', fontSize: '12px'}}>
                      <strong>{dup.name}</strong> - {dup.phone} ({dup.company})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.modalButtonGroup}>
              <button
                onClick={() => setShowImportResults(false)}
                style={{...styles.button, flex: 1}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeleCRM;