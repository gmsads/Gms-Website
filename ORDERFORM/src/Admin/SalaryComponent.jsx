// Import React and necessary hooks
import React, { useState, useEffect } from 'react';

// Define the main SalaryComponent function component
const SalaryComponent = ({ employees }) => {
  // State for storing all salary data keyed by employee ID
  const [salaries, setSalaries] = useState({});
  
  // State for basic salary input value
  const [basicSalary, setBasicSalary] = useState('');
  
  // State for selected employee
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // Loading state for API calls
  const [loading, setLoading] = useState(false);
  
  // Message state for user feedback
  const [message, setMessage] = useState({ show: false, text: '', type: '' });
  
  // Currently selected month for payments (format: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState('');
  
  // Currently selected year for filtering
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Filtered list of active employees
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  
  // Available months that have payment records
  const [availableMonths, setAvailableMonths] = useState([]);

  // State to control salary form visibility
  const [showSalaryForm, setShowSalaryForm] = useState(false);

  // State for payment amount input
  const [paymentAmount, setPaymentAmount] = useState('');

  // State to track which employee is being paid
  const [payingEmployee, setPayingEmployee] = useState(null);

  // Payment history view state
  const [viewPaymentHistory, setViewPaymentHistory] = useState(null);

  // Month selection dialog state
  const [selectingMonthFor, setSelectingMonthFor] = useState(null);

  // Function to show user messages with auto-hide
  const showMessage = (text, type) => {
    setMessage({ show: true, text, type });
    setTimeout(() => setMessage({ show: false, text: '', type: '' }), 5000);
  };

  // Fetch all data when employees are available
  useEffect(() => {
    if (employees && employees.length > 0) {
      fetchSalaries();
      fetchAvailableMonths();
    }
  }, [employees]);

  // Filter employees to show only active ones
  useEffect(() => {
    if (employees) {
      setFilteredEmployees(employees.filter(emp => emp.active));
    }
  }, [employees]);

  // Function to fetch all salary data from API
  const fetchSalaries = async () => {
    try {
      setLoading(true);
      console.log('Fetching salaries from API...');
      
      const response = await fetch('/api/salaries');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      
      if (data && data.length > 0) {
        const salaryMap = {};
        
        data.forEach(salary => {
          // Handle different possible structures of employeeId
          let employeeId = null;
          
          if (salary.employeeId && typeof salary.employeeId === 'object' && salary.employeeId._id) {
            employeeId = salary.employeeId._id;
          } else if (salary.employeeId && typeof salary.employeeId === 'string') {
            employeeId = salary.employeeId;
          }
          
          if (employeeId) {
            salaryMap[employeeId] = {
              ...salary,
              employeeId: employeeId,
              _id: salary._id
            };
          }
        });
        
        setSalaries(salaryMap);
        console.log('Salaries updated from API:', salaryMap);
      } else {
        console.log('No salary data from API');
        setSalaries({});
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
      showMessage('Failed to load salary data. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch available months with payments from API
  const fetchAvailableMonths = async () => {
    try {
      console.log('Fetching available months from API...');
      
      const response = await fetch('/api/salaries/months/available');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Available months from API:', data);
      
      if (data && data.length > 0) {
        setAvailableMonths(data);
      } else {
        setAvailableMonths([]);
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
    }
  };

  // Function to handle basic salary setting/updating
  const handleBasicSalarySubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee || !basicSalary) {
      showMessage('Please select an employee and enter basic salary', 'error');
      return;
    }

    if (basicSalary <= 0) {
      showMessage('Please enter a valid positive basic salary', 'error');
      return;
    }

    const selectedEmp = employees.find(emp => emp._id === selectedEmployee);
    if (!selectedEmp) {
      showMessage('Selected employee not found', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employeeId: selectedEmp._id,
        employeeName: selectedEmp.name,
        basicSalary: Number(basicSalary)
      };

      console.log('Saving salary payload:', payload);

      const response = await fetch('/api/salaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save salary details');
      }

      const savedSalary = await response.json();
      console.log('Saved salary response:', savedSalary);
      
      showMessage('Basic salary saved successfully', 'success');

      // Refresh salaries from API to get updated data
      await fetchSalaries();
      
      // Clear form
      setBasicSalary('');
      setSelectedEmployee('');
      setShowSalaryForm(false);
      
    } catch (error) {
      console.error('Error saving salary:', error);
      showMessage(error.message || 'Failed to save salary details. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle payment for an employee
  const handlePayment = async (employeeId, month) => {
    if (!paymentAmount || paymentAmount <= 0) {
      showMessage('Please enter a valid payment amount', 'error');
      return;
    }

    const salary = salaries[employeeId];
    if (!salary) {
      showMessage('Basic salary not set for this employee. Please set basic salary first.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/salaries/${employeeId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: month,
          amount: Number(paymentAmount)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record payment');
      }

      showMessage(`Payment of ₹${paymentAmount} recorded for ${getEmployeeName(employeeId)} - ${formatMonth(month)}`, 'success');
      
      // Refresh data from API
      await fetchSalaries();
      await fetchAvailableMonths();
      
      // Close dialogs
      setPaymentAmount('');
      setPayingEmployee(null);
      setSelectingMonthFor(null);
      
    } catch (error) {
      console.error('Error recording payment:', error);
      showMessage(error.message || 'Failed to record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to open payment dialog for an employee for a specific month
  const openMonthPaymentDialog = (employeeId, month) => {
    const salary = salaries[employeeId];
    if (salary) {
      setPayingEmployee(employeeId);
      setSelectedMonth(month);
      const existingPayment = getPaymentForMonth(salary, month);
      setPaymentAmount(existingPayment ? existingPayment.amount.toString() : (salary.basicSalary?.toString() || ''));
    } else {
      showMessage('Please set basic salary first', 'error');
    }
  };

  // Function to close payment dialog
  const closePaymentDialog = () => {
    setPayingEmployee(null);
    setPaymentAmount('');
    setSelectingMonthFor(null);
  };

  // Function to view payment history
  const viewEmployeePaymentHistory = (employeeId) => {
    setViewPaymentHistory(employeeId);
  };

  // Function to close payment history view
  const closePaymentHistory = () => {
    setViewPaymentHistory(null);
  };

  // Function to open month selection dialog
  const openMonthSelectionDialog = (employeeId) => {
    const salary = salaries[employeeId];
    if (!salary) {
      showMessage('Please set basic salary first', 'error');
      return;
    }
    setSelectingMonthFor(employeeId);
    setPaymentAmount('');
  };

  // Function to close month selection dialog
  const closeMonthSelectionDialog = () => {
    setSelectingMonthFor(null);
    setPaymentAmount('');
  };

  // Helper function to get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Helper function to get salary data for an employee
  const getSalaryForEmployee = (employeeId) => {
    return salaries[employeeId] || null;
  };

  // Helper function to get employee name by ID
  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    return employee ? employee.name : 'Unknown';
  };

  // Helper function to format month string (YYYY-MM) to readable format
  const formatMonth = (monthString) => {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // Helper function to get all months in a given year
  const getMonthsInYear = (year) => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(`${year}-${String(i).padStart(2, '0')}`);
    }
    return months;
  };

  // Helper function to get payment for a specific month
  const getPaymentForMonth = (salary, month) => {
    if (!salary || !salary.paymentHistory) return null;
    return salary.paymentHistory.find(payment => payment.month === month);
  };

  // Helper function to get available years (past 2 years to future 1 year)
  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  // Helper function to calculate total paid for an employee (only from monthly payments)
  const calculateTotalPaid = (salary) => {
    if (!salary || !salary.paymentHistory) return 0;
    return salary.paymentHistory.reduce((total, payment) => total + payment.amount, 0);
  };

  // Helper function to calculate total paid in selected year
  const calculateTotalPaidInYear = (salary) => {
    if (!salary || !salary.paymentHistory) return 0;
    return salary.paymentHistory
      .filter(payment => payment.month.startsWith(selectedYear.toString()))
      .reduce((total, payment) => total + payment.amount, 0);
  };

  // Handler for year change in dropdown
  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Calculate dashboard stats
  const getDashboardStats = () => {
    const currentMonth = getCurrentMonth();
    
    // Total active employees
    const totalEmployees = filteredEmployees.length;
    
    // Employees with salary configured
    const employeesWithSalary = filteredEmployees.filter(emp => salaries[emp._id]?.basicSalary).length;
    
    // Total paid this year
    const totalPaidThisYear = Object.values(salaries).reduce((total, salary) => 
      total + calculateTotalPaidInYear(salary), 0
    );
    
    // Payments made this month
    const currentMonthPayments = Object.values(salaries).reduce((total, salary) => {
      if (salary?.paymentHistory) {
        const payment = salary.paymentHistory.find(p => p.month === currentMonth);
        return total + (payment ? payment.amount : 0);
      }
      return total;
    }, 0);
    
    return {
      totalEmployees,
      employeesWithSalary,
      totalPaidThisYear,
      currentMonthPayments
    };
  };

  const stats = getDashboardStats();

  // Main component render method
  return (
    <div className="salary-component">
      {/* Header section with title and action buttons */}
      <div className="header-section">
        <div className="header-title">
          <h1>Salary Management System</h1>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowSalaryForm(!showSalaryForm)}
          >
            {showSalaryForm ? '✕ Close Form' : '➕ Set Basic Salary'}
          </button>
        </div>
      </div>
      
      {/* Message display for user feedback */}
      {message.show && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalEmployees}</h3>
            <p>Active Employees</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{stats.employeesWithSalary}</h3>
            <p>Salaries Configured</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>₹{stats.totalPaidThisYear.toLocaleString()}</h3>
            <p>Total Paid ({selectedYear})</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>₹{stats.currentMonthPayments.toLocaleString()}</h3>
            <p>Paid This Month</p>
          </div>
        </div>
      </div>

      {/* Year Selection Card */}
      <div className="card year-selection-card">
        <div className="card-header">
          <h3>Select Year for Overview</h3>
          <p className="card-subtitle">Change year to view different periods</p>
        </div>
        <div className="card-body">
          <div className="year-selection">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="year-select"
            >
              {getYears().map(year => (
                <option key={year} value={year}>
                  {year} {year === new Date().getFullYear() && '(Current)'}
                </option>
              ))}
            </select>
            <div className="year-info">
              <span className="current-year">Viewing: {selectedYear}</span>
              <span className="total-months">12 months displayed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Salary Setup Form */}
      {showSalaryForm && (
        <div className="card salary-form-card">
          <div className="card-header">
            <h3>Set / Update Basic Salary</h3>
            <p className="card-subtitle">Set basic salary once per employee. Update only when there's a salary hike.</p>
          </div>
          <div className="card-body">
            <form onSubmit={handleBasicSalarySubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Select Employee *</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    required
                    className="form-control"
                  >
                    <option value="">Select an employee</option>
                    {filteredEmployees.map(employee => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name} - {employee.role} {salaries[employee._id] ? '(Salary: ₹' + salaries[employee._id].basicSalary + ')' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Basic Salary (₹) *</label>
                  <input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    placeholder="Enter basic salary amount"
                    required
                    min="0"
                    step="100"
                    className="form-control"
                  />
                  <small className="form-text">This will be the standard salary for this employee</small>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn btn-success">
                  {loading ? '⏳ Saving...' : '💾 Save Basic Salary'}
                </button>
                <button type="button" onClick={() => setShowSalaryForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Dialog for Specific Month */}
      {payingEmployee && selectedMonth && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Set Monthly Payment</h3>
              <button onClick={closePaymentDialog} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <div className="payment-summary">
                <div className="summary-item">
                  <span>Employee:</span>
                  <strong>{getEmployeeName(payingEmployee)}</strong>
                </div>
                <div className="summary-item">
                  <span>Month:</span>
                  <strong>{formatMonth(selectedMonth)}</strong>
                </div>
                <div className="summary-item">
                  <span>Basic Salary:</span>
                  <strong>₹{salaries[payingEmployee]?.basicSalary?.toLocaleString() || '0'}</strong>
                </div>
              </div>
              
              <div className="form-group">
                <label>Payment Amount for {formatMonth(selectedMonth)} (₹) *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  required
                  min="0"
                  className="form-control"
                />
                <small className="form-text">Enter the actual amount to be paid for this month</small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => handlePayment(payingEmployee, selectedMonth)}
                disabled={loading || !paymentAmount}
                className="btn btn-primary"
              >
                {loading ? 'Processing...' : '✅ Save Payment'}
              </button>
              <button 
                onClick={closePaymentDialog}
                disabled={loading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {viewPaymentHistory && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Payment History - {getEmployeeName(viewPaymentHistory)}</h3>
              <button onClick={closePaymentHistory} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <div className="employee-summary">
                <p><strong>Basic Salary:</strong> ₹{salaries[viewPaymentHistory]?.basicSalary?.toLocaleString() || '0'}</p>
                <p><strong>Total Paid (All Time):</strong> ₹{calculateTotalPaid(salaries[viewPaymentHistory]).toLocaleString()}</p>
                <p><strong>Total Paid ({selectedYear}):</strong> ₹{calculateTotalPaidInYear(salaries[viewPaymentHistory]).toLocaleString()}</p>
              </div>
              
              <div className="payment-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Amount Paid</th>
                      <th>Status</th>
                      <th>Payment Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries[viewPaymentHistory]?.paymentHistory?.sort((a, b) => b.month.localeCompare(a.month)).map((payment, index) => (
                      <tr key={index}>
                        <td>{formatMonth(payment.month)}</td>
                        <td>₹{payment.amount.toLocaleString()}</td>
                        <td>
                          <span className={`status-badge ${payment.month === getCurrentMonth() ? 'current' : 'paid'}`}>
                            {payment.month === getCurrentMonth() ? 'Current' : 'Paid'}
                          </span>
                        </td>
                        <td>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'Not recorded'}</td>
                        <td>
                          <button 
                            onClick={() => {
                              closePaymentHistory();
                              openMonthPaymentDialog(viewPaymentHistory, payment.month);
                            }}
                            className="btn-edit-payment"
                            title="Edit payment"
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!salaries[viewPaymentHistory]?.paymentHistory || salaries[viewPaymentHistory].paymentHistory.length === 0) && (
                      <tr>
                        <td colSpan="5" className="empty-state">No payment records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closePaymentHistory} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Month Selection Dialog for Quick Payment */}
      {selectingMonthFor && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Select Month for Payment</h3>
              <button onClick={closeMonthSelectionDialog} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <div className="employee-info">
                <h4>{getEmployeeName(selectingMonthFor)}</h4>
                <p className="text-muted">Basic Salary: ₹{salaries[selectingMonthFor]?.basicSalary?.toLocaleString() || '0'}</p>
                <p className="text-muted">Select a month to set payment</p>
              </div>
              
              <div className="month-grid">
                {getMonthsInYear(selectedYear).map(month => {
                  const payment = getPaymentForMonth(salaries[selectingMonthFor], month);
                  return (
                    <button
                      key={month}
                      onClick={() => {
                        closeMonthSelectionDialog();
                        openMonthPaymentDialog(selectingMonthFor, month);
                      }}
                      className={`month-btn ${month === getCurrentMonth() ? 'current' : ''} ${payment ? 'has-payment' : ''}`}
                    >
                      {formatMonth(month)}
                      {month === getCurrentMonth() && ' ★'}
                      {payment && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeMonthSelectionDialog} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary List Table */}
      <div className="card salary-table-card">
        <div className="card-header">
          <div className="table-header">
            <h3>Monthly Salary Overview - {selectedYear}</h3>
            <div className="table-legend">
              <div className="legend-item">
                <span className="legend-color paid"></span>
                <span>Paid</span>
              </div>
              <div className="legend-item">
                <span className="legend-color pending"></span>
                <span>Pending</span>
              </div>
              <div className="legend-item">
                <span className="legend-color future"></span>
                <span>Future</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading salary data...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="empty-state">
              <p>No active employees found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="salary-table">
                <thead>
                  <tr>
                    <th>Employee Details</th>
                    {getMonthsInYear(selectedYear).map(month => (
                      <th key={month} className={month === getCurrentMonth() ? 'current-month' : ''}>
                        {formatMonth(month)}
                        {month === getCurrentMonth() && ' ★'}
                      </th>
                    ))}
                    <th>Total Paid ({selectedYear})</th>
                    <th>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(employee => {
                    const salary = getSalaryForEmployee(employee._id);
                    const totalPaidThisYear = salary ? calculateTotalPaidInYear(salary) : 0;
                    const hasSalary = !!salary;
                    
                    return (
                      <tr key={employee._id}>
                        <td className="employee-details">
                          <div className="employee-name">{employee.name}</div>
                          <div className="employee-role">{employee.role}</div>
                          {hasSalary && (
                            <div className="employee-salary">₹{salary.basicSalary?.toLocaleString() || '0'}</div>
                          )}
                          {!hasSalary && (
                            <button 
                              onClick={() => {
                                setSelectedEmployee(employee._id);
                                setShowSalaryForm(true);
                              }}
                              className="btn-set-salary-sm"
                            >
                              Set Salary
                            </button>
                          )}
                        </td>
                        
                        {getMonthsInYear(selectedYear).map(month => {
                          const payment = getPaymentForMonth(salary, month);
                          const isFutureMonth = month > getCurrentMonth();
                          const isPastMonth = month < getCurrentMonth();
                          
                          let cellClass = 'payment-cell';
                          if (hasSalary) cellClass += ' clickable';
                          if (payment) cellClass += ' paid';
                          if (!payment && isPastMonth && hasSalary) cellClass += ' pending';
                          if (isFutureMonth) cellClass += ' future';
                          if (month === getCurrentMonth()) cellClass += ' current';
                          
                          return (
                            <td 
                              key={month} 
                              className={cellClass}
                              onClick={() => {
                                if (hasSalary) {
                                  openMonthPaymentDialog(employee._id, month);
                                } else {
                                  showMessage('Please set basic salary first', 'error');
                                }
                              }}
                              title={hasSalary ? `Click to set payment for ${formatMonth(month)}` : 'Set basic salary first'}
                            >
                              {payment ? (
                                <div className="paid-amount">
                                  ₹{payment.amount.toLocaleString()}
                                </div>
                              ) : (
                                <div className="no-payment">
                                  {isFutureMonth ? 'Future' : hasSalary ? 'Set' : '—'}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        
                        <td className="total-paid-cell">
                          {hasSalary ? (
                            <>
                              <div className="total-amount">₹{totalPaidThisYear.toLocaleString()}</div>
                              <button 
                                onClick={() => viewEmployeePaymentHistory(employee._id)}
                                className="btn-view-history"
                                title="View payment history"
                              >
                                📊
                              </button>
                            </>
                          ) : (
                            <div className="total-amount">—</div>
                          )}
                        </td>
                        
                        <td className="quick-actions-cell">
                          <div className="quick-actions">
                            <button 
                              onClick={() => openMonthSelectionDialog(employee._id)}
                              disabled={!hasSalary}
                              className="btn-quick-pay"
                              title="Quick payment for any month"
                            >
                              💸 Quick Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Component Styles */}
      <style jsx>{`
        .salary-component {
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
          background: #f8f9fa;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        /* Header Styles */
        .header-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
        }
        
        .header-title h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        
        .header-actions .btn-primary {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 16px;
        }
        
        .header-actions .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.2);
        }
        
        /* Dashboard Stats */
        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .stat-icon {
          font-size: 32px;
        }
        
        .stat-content h3 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #2d3748;
        }
        
        .stat-content p {
          margin: 4px 0 0;
          color: #718096;
          font-size: 14px;
        }
        
        /* Year Selection Card */
        .year-selection-card {
          margin-bottom: 24px;
        }
        
        .year-selection {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .year-select {
          padding: 12px 20px;
          border: 2px solid #667eea;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #2d3748;
          background: white;
          cursor: pointer;
          min-width: 180px;
        }
        
        .year-select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .year-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .current-year {
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
        }
        
        .total-months {
          font-size: 14px;
          color: #718096;
        }
        
        /* Card Styles */
        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
          overflow: hidden;
        }
        
        .card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
        }
        
        .card-header h3 {
          margin: 0;
          color: #2d3748;
          font-size: 20px;
          font-weight: 600;
        }
        
        .card-subtitle {
          margin: 8px 0 0;
          color: #718096;
          font-size: 14px;
        }
        
        .card-body {
          padding: 24px;
        }
        
        /* Form Styles */
        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 16px;
        }
        
        .form-group {
          flex: 1;
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #4a5568;
        }
        
        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.3s ease;
        }
        
        .form-control:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-text {
          display: block;
          margin-top: 6px;
          color: #718096;
          font-size: 14px;
        }
        
        /* Button Styles */
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .btn-success {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
        }
        
        .btn-success:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
        }
        
        .btn-secondary {
          background: #718096;
          color: white;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background: #4a5568;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        
        .btn-set-salary-sm {
          background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
          color: #212529;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 12px;
          margin-top: 8px;
          transition: all 0.3s ease;
        }
        
        .btn-set-salary-sm:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(255, 193, 7, 0.3);
        }
        
        /* Month Grid for Selection */
        .month-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 20px;
        }
        
        .month-btn {
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #4a5568;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
        }
        
        .month-btn:hover {
          border-color: #667eea;
          background: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .month-btn.current {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
        }
        
        .month-btn.has-payment {
          border-color: #48bb78;
          background: rgba(72, 187, 120, 0.1);
        }
        
        /* Table Styles */
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .table-legend {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #718096;
        }
        
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }
        
        .legend-color.paid {
          background-color: #e6f2ff;
        }
        
        .legend-color.pending {
          background-color: #fff3cd;
        }
        
        .legend-color.future {
          background-color: #e9ecef;
        }
        
        .table-responsive {
          overflow-x: auto;
        }
        
        .salary-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }
        
        .salary-table th {
          padding: 16px 12px;
          text-align: center;
          background: #4a5568;
          color: white;
          font-weight: 600;
          font-size: 13px;
          border-right: 1px solid #718096;
          white-space: nowrap;
        }
        
        .salary-table th:first-child {
          text-align: left;
        }
        
        .salary-table th.current-month {
          background: #2d3748;
          position: relative;
        }
        
        .salary-table th.current-month::after {
          content: '★';
          position: absolute;
          top: 4px;
          right: 4px;
          color: #ffd700;
          font-size: 12px;
        }
        
        .salary-table td {
          padding: 12px;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }
        
        .salary-table tr:hover {
          background-color: #f8fafc;
        }
        
        .employee-details {
          text-align: left;
          min-width: 200px;
        }
        
        .employee-name {
          font-weight: 600;
          color: #2d3748;
          font-size: 16px;
        }
        
        .employee-role {
          font-size: 13px;
          color: #718096;
          margin-top: 4px;
        }
        
        .employee-salary {
          font-size: 14px;
          color: #48bb78;
          font-weight: 600;
          margin-top: 4px;
        }
        
        .payment-cell {
          min-width: 100px;
          height: 60px;
          transition: all 0.3s ease;
        }
        
        .payment-cell.clickable {
          cursor: pointer;
        }
        
        .payment-cell.clickable:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          z-index: 1;
          position: relative;
          background-color: #f0f4f8;
        }
        
        .payment-cell.paid {
          background-color: #e6f2ff;
          color: #004085;
        }
        
        .payment-cell.pending {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .payment-cell.future {
          background-color: #e9ecef;
          color: #6c757d;
        }
        
        .payment-cell.current {
          border: 2px solid #007bff;
        }
        
        .paid-amount {
          font-weight: 600;
          font-size: 14px;
        }
        
        .no-payment {
          color: #a0aec0;
          font-size: 13px;
          font-weight: 500;
        }
        
        .total-paid-cell {
          min-width: 120px;
          font-weight: 600;
          color: #48bb78;
        }
        
        .total-amount {
          font-size: 16px;
          margin-bottom: 4px;
        }
        
        .btn-view-history {
          background: none;
          border: none;
          color: #718096;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        
        .btn-view-history:hover {
          background: #edf2f7;
          color: #4a5568;
        }
        
        .quick-actions-cell {
          min-width: 120px;
        }
        
        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .btn-quick-pay {
          background: linear-gradient(135deg, #4da6ff 0%, #3385d6 100%);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          width: 100%;
          transition: all 0.3s ease;
        }
        
        .btn-quick-pay:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(77, 166, 255, 0.3);
        }
        
        .btn-quick-pay:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        
        .modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          min-width: 500px;
          max-width: 600px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        
        .modal-lg {
          min-width: 800px;
          max-width: 900px;
        }
        
        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-header h3 {
          margin: 0;
          color: #2d3748;
          font-size: 20px;
          font-weight: 600;
        }
        
        .btn-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #718096;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        
        .btn-close:hover {
          background: #f8f9fa;
          color: #4a5568;
        }
        
        .modal-body {
          padding: 24px;
          flex: 1;
          overflow-y: auto;
        }
        
        .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        /* Payment Summary */
        .payment-summary {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 15px;
        }
        
        .summary-item:last-child {
          margin-bottom: 0;
        }
        
        .summary-item span {
          color: #718096;
        }
        
        .summary-item strong {
          color: #2d3748;
        }
        
        /* Employee Summary */
        .employee-summary {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .employee-summary p {
          margin: 0;
          color: #2d3748;
        }
        
        .employee-info {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .employee-info h4 {
          margin: 0 0 8px;
          color: #2d3748;
          font-size: 18px;
        }
        
        .text-muted {
          color: #718096;
          font-size: 14px;
          margin: 4px 0;
        }
        
        /* Payment History Table */
        .payment-history-table {
          margin-top: 20px;
        }
        
        .payment-history-table table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .payment-history-table th {
          padding: 12px 16px;
          text-align: left;
          background: #f8f9fa;
          font-weight: 600;
          color: #4a5568;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .payment-history-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .btn-edit-payment {
          background: none;
          border: 1px solid #667eea;
          color: #667eea;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn-edit-payment:hover {
          background: #667eea;
          color: white;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-badge.paid {
          background: #e6f2ff;
          color: #004085;
        }
        
        .status-badge.current {
          background: #d4edda;
          color: #155724;
        }
        
        /* Alert Styles */
        .alert {
          padding: 16px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .alert-success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .alert-error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .alert-warning {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }
        
        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Empty State */
        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #718096;
        }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
          .form-row {
            flex-direction: column;
            gap: 16px;
          }
          
          .dashboard-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .month-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .header-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .header-actions .btn-primary {
            width: 100%;
          }
          
          .dashboard-stats {
            grid-template-columns: 1fr;
          }
          
          .modal {
            min-width: 90%;
            margin: 20px;
          }
          
          .modal-lg {
            min-width: 90%;
          }
          
          .table-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .table-legend {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .year-selection {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .month-grid {
            grid-template-columns: 1fr;
          }
          
          .salary-table th,
          .salary-table td {
            padding: 12px 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

// Export the component as default for use in other files
export default SalaryComponent;