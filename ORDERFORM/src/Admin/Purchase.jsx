import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const Purchase = () => {
  const [formData, setFormData] = useState({
    businessName: '',
    date: new Date(),
    item: '',
    quantity: '',
    rate: '',
    amount: '',
    remarks: '',
    paymentMethod: 'cash'
  });

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
  const [filterBusiness, setFilterBusiness] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  // Payment methods
  const paymentMethods = ['cash', 'upi', 'bank transfer'];

  // Calculate amount when quantity or rate changes
  useEffect(() => {
    if (formData.quantity && formData.rate) {
      const calculatedAmount = parseFloat(formData.quantity) * parseFloat(formData.rate);
      setFormData(prev => ({
        ...prev,
        amount: calculatedAmount.toFixed(2)
      }));
    } else if (formData.amount && formData.rate && !formData.quantity) {
      const calculatedQuantity = parseFloat(formData.amount) / parseFloat(formData.rate);
      setFormData(prev => ({
        ...prev,
        quantity: calculatedQuantity.toFixed(2)
      }));
    }
  }, [formData.quantity, formData.rate, formData.amount]);

  // Fetch all purchases
  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/purchases');
      setPurchases(response.data);
      calculateTotal(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      alert('Failed to load purchase records');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total amount
  const calculateTotal = (data) => {
    const total = data.reduce((sum, purchase) => {
      return sum + parseFloat(purchase.amount || 0);
    }, 0);
    setTotalAmount(total);
  };

  // Filter purchases
  const filteredPurchases = purchases.filter(purchase => {
    const matchesDate = filterDate ? 
      new Date(purchase.date).toDateString() === filterDate.toDateString() : 
      true;
    
    const matchesBusiness = filterBusiness ?
      purchase.businessName.toLowerCase().includes(filterBusiness.toLowerCase()) :
      true;
    
    return matchesDate && matchesBusiness;
  });

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.businessName.trim()) {
      alert('Please enter business name');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter valid amount');
      return;
    }

    setSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        date: formData.date.toISOString().split('T')[0],
        amount: parseFloat(formData.amount),
        rate: formData.rate ? parseFloat(formData.rate) : null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null
      };

      if (editMode && editId) {
        // Update existing purchase
        await axios.put(`/api/purchases/${editId}`, payload);
        alert('Purchase updated successfully!');
      } else {
        // Create new purchase
        await axios.post('/api/purchases', payload);
        alert('Purchase saved successfully!');
      }

      // Reset form
      setFormData({
        businessName: '',
        date: new Date(),
        item: '',
        quantity: '',
        rate: '',
        amount: '',
        remarks: '',
        paymentMethod: 'cash'
      });
      setEditMode(false);
      setEditId(null);
      
      // Refresh purchases list
      fetchPurchases();
      
    } catch (error) {
      console.error('Error saving purchase:', error);
      alert(error.response?.data?.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle edit
  const handleEdit = (purchase) => {
    setFormData({
      businessName: purchase.businessName,
      date: new Date(purchase.date),
      item: purchase.item || '',
      quantity: purchase.quantity?.toString() || '',
      rate: purchase.rate?.toString() || '',
      amount: purchase.amount?.toString() || '',
      remarks: purchase.remarks || '',
      paymentMethod: purchase.paymentMethod || 'cash'
    });
    setEditMode(true);
    setEditId(purchase._id || purchase.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase record?')) {
      return;
    }

    try {
      await axios.delete(`/api/purchases/${id}`);
      alert('Purchase deleted successfully!');
      fetchPurchases();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert('Failed to delete purchase');
    }
  };

  // Load purchases on component mount
  useEffect(() => {
    fetchPurchases();
  }, []);

  // Calculate filtered total
  useEffect(() => {
    calculateTotal(filteredPurchases);
  }, [filteredPurchases]);

  // Reset filters
  const resetFilters = () => {
    setFilterDate(null);
    setFilterBusiness('');
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Business Name', 'Item', 'Quantity', 'Rate', 'Amount', 'Payment Method', 'Remarks'];
    const csvData = [
      headers,
      ...filteredPurchases.map(purchase => [
        new Date(purchase.date).toLocaleDateString('en-IN'),
        purchase.businessName,
        purchase.item || '',
        purchase.quantity || '',
        purchase.rate || '',
        purchase.amount,
        purchase.paymentMethod.toUpperCase(),
        purchase.remarks || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(','));

    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchases_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Styles
  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      backgroundColor: '#003366',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '30px',
      textAlign: 'center'
    },
    formContainer: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      marginBottom: '30px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '20px'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '600',
      color: '#333'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px'
    },
    submitButton: {
      padding: '12px 30px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      flex: 1
    },
    cancelButton: {
      padding: '12px 30px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      flex: 1
    },
    filterContainer: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    filterGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '15px'
    },
    filterButtonGroup: {
      display: 'flex',
      gap: '10px'
    },
    filterButton: {
      padding: '8px 16px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    resetButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    exportButton: {
      padding: '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginLeft: 'auto'
    },
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      marginTop: '20px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      backgroundColor: '#003366',
      color: 'white',
      textAlign: 'left',
      padding: '12px 15px',
      borderBottom: '1px solid #ddd'
    },
    tableCell: {
      padding: '12px 15px',
      borderBottom: '1px solid #ddd',
      textAlign: 'left'
    },
    tableRow: {
      '&:hover': {
        backgroundColor: '#f5f5f5'
      }
    },
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    editButton: {
      padding: '5px 10px',
      backgroundColor: '#ffc107',
      color: '#212529',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    deleteButton: {
      padding: '5px 10px',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    totalSection: {
      backgroundColor: '#e9ecef',
      padding: '15px',
      marginTop: '20px',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    totalAmount: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#003366'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      color: '#666'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: '#666'
    },
    requiredStar: {
      color: '#dc3545',
      marginLeft: '3px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2>Purchase Records</h2>
        <p>Add and manage your business purchases</p>
      </div>

      {/* Purchase Form */}
      <div style={styles.formContainer}>
        <h3 style={{ marginBottom: '20px', color: '#003366' }}>
          {editMode ? 'Edit Purchase Record' : 'Add New Purchase'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            {/* Business Name */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Business Name <span style={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter business/vendor name"
                style={styles.input}
                required
              />
            </div>

            {/* Date */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Date <span style={styles.requiredStar}>*</span>
              </label>
              <DatePicker
                selected={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
                style={styles.input}
                className="datepicker-input"
              />
            </div>

            {/* Item */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Item/Description</label>
              <input
                type="text"
                name="item"
                value={formData.item}
                onChange={handleChange}
                placeholder="What was purchased"
                style={styles.input}
              />
            </div>

            {/* Quantity */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Quantity"
                step="0.01"
                min="0"
                style={styles.input}
              />
            </div>

            {/* Rate */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Rate (₹)</label>
              <input
                type="number"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                placeholder="Rate per unit"
                step="0.01"
                min="0"
                style={styles.input}
              />
            </div>

            {/* Amount */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Amount (₹) <span style={styles.requiredStar}>*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Total amount"
                step="0.01"
                min="0"
                style={styles.input}
                required
              />
            </div>

            {/* Payment Method */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Method</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                style={styles.select}
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>
                    {method.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Additional notes"
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Form Buttons */}
          <div style={styles.buttonGroup}>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editMode ? 'Update Purchase' : 'Save Purchase'}
            </button>
            
            {editMode && (
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => {
                  setEditMode(false);
                  setEditId(null);
                  setFormData({
                    businessName: '',
                    date: new Date(),
                    item: '',
                    quantity: '',
                    rate: '',
                    amount: '',
                    remarks: '',
                    paymentMethod: 'cash'
                  });
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Filters */}
      <div style={styles.filterContainer}>
        <h4 style={{ marginBottom: '15px', color: '#003366' }}>Filter Purchases</h4>
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.label}>Filter by Date</label>
            <DatePicker
              selected={filterDate}
              onChange={setFilterDate}
              dateFormat="dd/MM/yyyy"
              placeholderText="Select date to filter"
              isClearable
              style={styles.input}
              className="datepicker-input"
            />
          </div>
          <div>
            <label style={styles.label}>Filter by Business</label>
            <input
              type="text"
              value={filterBusiness}
              onChange={(e) => setFilterBusiness(e.target.value)}
              placeholder="Search business name"
              style={styles.input}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={styles.filterButtonGroup}>
            <button
              style={styles.filterButton}
              onClick={() => {
                // Filter is already applied through state
              }}
            >
              Apply Filters
            </button>
            <button
              style={styles.resetButton}
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
          
          <button
            style={styles.exportButton}
            onClick={exportToCSV}
            disabled={filteredPurchases.length === 0}
          >
            Export to CSV
          </button>
        </div>
      </div>

      {/* Purchase List */}
      <div style={styles.tableContainer}>
        <div style={{ padding: '20px', borderBottom: '1px solid #ddd' }}>
          <h4 style={{ margin: 0, color: '#003366' }}>
            Purchase Records ({filteredPurchases.length})
          </h4>
        </div>
        
        {loading ? (
          <div style={styles.loading}>Loading purchases...</div>
        ) : filteredPurchases.length === 0 ? (
          <div style={styles.emptyState}>
            {purchases.length === 0 ? 'No purchase records found' : 'No purchases match the filters'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Date</th>
                    <th style={styles.tableHeader}>Business Name</th>
                    <th style={styles.tableHeader}>Item</th>
                    <th style={styles.tableHeader}>Qty</th>
                    <th style={styles.tableHeader}>Rate</th>
                    <th style={styles.tableHeader}>Amount</th>
                    <th style={styles.tableHeader}>Payment</th>
                    <th style={styles.tableHeader}>Remarks</th>
                    <th style={styles.tableHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((purchase, index) => (
                    <tr key={purchase._id || purchase.id || index} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        {new Date(purchase.date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={styles.tableCell}>{purchase.businessName}</td>
                      <td style={styles.tableCell}>{purchase.item || '-'}</td>
                      <td style={styles.tableCell}>{purchase.quantity || '-'}</td>
                      <td style={styles.tableCell}>
                        {purchase.rate ? `₹${parseFloat(purchase.rate).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ ...styles.tableCell, fontWeight: 'bold' }}>
                        ₹{parseFloat(purchase.amount).toFixed(2)}
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: 
                            purchase.paymentMethod === 'cash' ? '#d4edda' :
                            purchase.paymentMethod === 'upi' ? '#cce5ff' :
                            '#fff3cd',
                          color: 
                            purchase.paymentMethod === 'cash' ? '#155724' :
                            purchase.paymentMethod === 'upi' ? '#004085' :
                            '#856404'
                        }}>
                          {purchase.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {purchase.remarks || '-'}
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionButtons}>
                          <button
                            style={styles.editButton}
                            onClick={() => handleEdit(purchase)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.deleteButton}
                            onClick={() => handleDelete(purchase._id || purchase.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Amount */}
            <div style={styles.totalSection}>
              <div>
                <strong>Total Purchases:</strong> {filteredPurchases.length} records
              </div>
              <div style={styles.totalAmount}>
                Total Amount: ₹{totalAmount.toFixed(2)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Purchase;