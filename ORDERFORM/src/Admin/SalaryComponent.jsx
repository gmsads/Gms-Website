// Import React and necessary hooks
import React, { useState, useEffect } from 'react';

// Define the main SalaryComponent function component
const SalaryComponent = ({ employees }) => {
  // State for storing all salary data keyed by employee ID
  const [salaries, setSalaries] = useState({});
  
  // State for currently selected employee in the form
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // State for basic salary input value
  const [basicSalary, setBasicSalary] = useState('');
  
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
  
  // Flag to track if data has been loaded from API
  const [dataLoaded, setDataLoaded] = useState(false);

  // State to control salary form visibility
  const [showSalaryForm, setShowSalaryForm] = useState(false);

  // State for payment amount input
  const [paymentAmount, setPaymentAmount] = useState('');

  // State to track which employee is being paid
  const [payingEmployee, setPayingEmployee] = useState(null);

  // State for editing salary (both basic and monthly)
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editBasicSalary, setEditBasicSalary] = useState('');
  const [selectedEditMonth, setSelectedEditMonth] = useState('');
  const [editMonthlySalary, setEditMonthlySalary] = useState('');
  const [editType, setEditType] = useState('basic'); // 'basic' or 'monthly'

  // useEffect hook to load data from localStorage when component mounts
  useEffect(() => {
    // Log loading process for debugging
    console.log('Loading from localStorage...');
    
    // Get saved salaries from localStorage
    const savedSalaries = localStorage.getItem('salariesData');
    
    // Get saved available months from localStorage
    const savedAvailableMonths = localStorage.getItem('availableMonths');
    
    // Log retrieved data for debugging
    console.log('Saved salaries from localStorage:', savedSalaries);
    console.log('Saved months from localStorage:', savedAvailableMonths);
    
    // If saved salaries exist and are valid, parse and set them
    if (savedSalaries && savedSalaries !== '{}' && savedSalaries !== 'null') {
      try {
        // Parse the JSON string to JavaScript object
        const parsedSalaries = JSON.parse(savedSalaries);
        console.log('Parsed salaries:', parsedSalaries);
        
        // Only set salaries if parsed data has content
        if (Object.keys(parsedSalaries).length > 0) {
          setSalaries(parsedSalaries);
          console.log('Salaries set from localStorage');
        }
      } catch (error) {
        // Handle JSON parsing errors
        console.error('Error parsing saved salaries:', error);
        
        // Remove corrupted data from localStorage
        localStorage.removeItem('salariesData');
      }
    }
    
    // If saved months exist and are valid, parse and set them
    if (savedAvailableMonths && savedAvailableMonths !== '[]' && savedAvailableMonths !== 'null') {
      try {
        // Parse the JSON string to JavaScript array
        const parsedMonths = JSON.parse(savedAvailableMonths);
        console.log('Parsed months:', parsedMonths);
        
        // Only set months if parsed data has content
        if (parsedMonths.length > 0) {
          setAvailableMonths(parsedMonths);
          console.log('Months set from localStorage');
        }
      } catch (error) {
        // Handle JSON parsing errors
        console.error('Error parsing saved months:', error);
        
        // Remove corrupted data from localStorage
        localStorage.removeItem('availableMonths');
      }
    }
    
    // Mark data as initially loaded from localStorage
    setDataLoaded(true);
    
  }, []);

  // useEffect hook to fetch data from API when employees are available
  useEffect(() => {
    // Only proceed if employees data is available
    if (employees && employees.length > 0) {
      // Determine if we should fetch from API (no localStorage data)
      const shouldFetchFromAPI = 
        Object.keys(salaries).length === 0 || // No salary data
        availableMonths.length === 0 || // No month data
        !dataLoaded; // Data not loaded yet
      
      if (shouldFetchFromAPI) {
        console.log('Fetching from API...');
        fetchSalaries(); // Fetch salary data from API
        fetchAvailableMonths(); // Fetch available months from API
      } else {
        console.log('Using localStorage data, skipping API fetch');
      }
    }
  }, [employees, dataLoaded]);

  // useEffect hook to filter employees to show only active ones
  useEffect(() => {
    // Only proceed if employees data is available
    if (employees) {
      // Filter employees where active is true
      setFilteredEmployees(employees.filter(emp => emp.active));
    }
  }, [employees]);

  // useEffect hook to save salaries to localStorage whenever salaries state changes
  useEffect(() => {
    // Only save if there are salaries to save
    if (Object.keys(salaries).length > 0) {
      console.log('Saving salaries to localStorage:', salaries);
      
      // Convert salaries object to JSON string and save to localStorage
      localStorage.setItem('salariesData', JSON.stringify(salaries));
    }
  }, [salaries]);

  // useEffect hook to save available months to localStorage whenever availableMonths changes
  useEffect(() => {
    // Only save if there are months to save
    if (availableMonths.length > 0) {
      console.log('Saving months to localStorage:', availableMonths);
      
      // Convert availableMonths array to JSON string and save to localStorage
      localStorage.setItem('availableMonths', JSON.stringify(availableMonths));
    }
  }, [availableMonths]);

  // Function to fetch all salary data from API
  const fetchSalaries = async () => {
    try {
      setLoading(true); // Start loading
      console.log('Making API call to /api/salaries');
      
      // Make API call to get all salaries
      const response = await fetch('/api/salaries');
      
      // Check if response is successful (status code 200-299)
      if (response.ok) {
        const data = await response.json(); // Parse response data as JSON
        console.log('API response data:', data);
        
        const salaryMap = {}; // Create a map to organize salaries by employee ID
        let hasValidData = false; // Flag to track if we got valid data
        
        // Process each salary record from API response
        data.forEach(salary => {
          let employeeId = null; // Initialize employeeId variable
          
          // Handle different formats of employeeId (object or string)
          if (salary.employeeId && typeof salary.employeeId === 'object' && salary.employeeId._id) {
            employeeId = salary.employeeId._id; // Extract ID from object
          } else if (salary.employeeId && typeof salary.employeeId === 'string') {
            employeeId = salary.employeeId; // Use string directly
          }
          
          // Only add to map if employee exists in our employees list
          if (employeeId && employees.some(emp => emp._id === employeeId)) {
            salaryMap[employeeId] = {
              ...salary, // Spread existing salary data
              employeeId: employeeId // Ensure consistent employeeId format
            };
            hasValidData = true; // Mark that we have valid data
          }
        });
        
        console.log('Processed salary map:', salaryMap);
        console.log('Has valid data:', hasValidData);
        
        // Only update state if we got valid data
        if (hasValidData) {
          setSalaries(salaryMap); // Update salaries state
          console.log('Salaries updated from API');
        } else {
          console.log('No valid salary data from API, keeping localStorage data');
        }
        
        setDataLoaded(true); // Mark data as loaded
      } else {
        // Handle API response errors
        console.error('API response not OK:', response.status);
        showMessage('Failed to load salary data from server', 'error');
        setDataLoaded(true); // Still mark as loaded to prevent retries
      }
    } catch (error) {
      // Handle network errors
      console.error('Error fetching salaries:', error);
      showMessage('Failed to connect to server. Using cached data.', 'warning');
      setDataLoaded(true); // Still mark as loaded to prevent retries
    } finally {
      setLoading(false); // Stop loading regardless of outcome
    }
  };

  // Function to fetch available months with payments from API
  const fetchAvailableMonths = async () => {
    try {
      console.log('Making API call to /api/salaries/months/available');
      
      // Make API call to get available months
      const response = await fetch('/api/salaries/months/available');
      
      // Check if response is successful
      if (response.ok) {
        const data = await response.json(); // Parse response data
        console.log('Available months from API:', data);
        
        // Only update if we got valid data
        if (data && data.length > 0) {
          setAvailableMonths(data); // Update available months state
          console.log('Available months updated from API');
        } else {
          console.log('No available months from API, keeping existing data');
        }
      } else {
        console.error('Failed to fetch available months:', response.status);
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
    }
  };

  // Function to show user messages with auto-hide
  const showMessage = (text, type) => {
    setMessage({ show: true, text, type }); // Show message
    
    // Auto-hide message after 5 seconds
    setTimeout(() => setMessage({ show: false, text: '', type: '' }), 5000);
  };

  // Function to handle basic salary editing
  const handleBasicSalaryEdit = async (employeeId) => {
    // Validate that basic salary is provided
    if (!editBasicSalary || editBasicSalary <= 0) {
      showMessage('Please enter a valid basic salary', 'error');
      return;
    }

    // Find the employee object to get the name
    const employee = employees.find(emp => emp._id === employeeId);
    
    // Validate that employee was found
    if (!employee) {
      showMessage('Employee not found', 'error');
      return;
    }

    setLoading(true); // Start loading
    try {
      // Check if this is an update or create operation
      const existingSalary = salaries[employeeId];
      const isUpdate = !!existingSalary;

      // Make API call to save/update salary
      const response = await fetch('/api/salaries', {
        method: 'POST', // HTTP POST method
        headers: {
          'Content-Type': 'application/json', // Set content type to JSON
        },
        body: JSON.stringify({
          employeeId: employeeId,
          employeeName: employee.name, // Include employee name in request
          basicSalary: Number(editBasicSalary), // Convert string to number
          // Include existing data if updating to preserve payment history
          ...(isUpdate && {
            paymentHistory: existingSalary.paymentHistory || [],
            allowances: existingSalary.allowances || {},
            deductions: existingSalary.deductions || {}
          })
        }),
      });

      // Check if response is successful
      if (response.ok) {
        const savedSalary = await response.json(); // Parse response data
        
        // Show appropriate success message
        if (isUpdate) {
          showMessage('Basic salary updated successfully', 'success');
        } else {
          showMessage('Basic salary set successfully', 'success');
        }
        
        // Update both state and localStorage with new salary data
        const updatedSalaries = {
          ...salaries, // Spread existing salaries
          [employeeId]: { // Update specific employee
            ...savedSalary, // Spread saved data from API
            employeeId: employeeId, // Ensure consistent ID format
            // Preserve payment history if it exists in the current state but not in response
            paymentHistory: savedSalary.paymentHistory || existingSalary?.paymentHistory || []
          }
        };
        setSalaries(updatedSalaries); // Update React state
        localStorage.setItem('salariesData', JSON.stringify(updatedSalaries)); // Update localStorage
        
        // Reset editing state
        setEditingEmployee(null);
        setEditBasicSalary('');
        setEditType('basic');
        setShowSalaryForm(false);
      } else {
        const errorData = await response.json(); // Parse error response
        showMessage(errorData.message || 'Failed to save basic salary', 'error'); // Show error message
      }
    } catch (error) {
      console.error('Error saving basic salary:', error); // Log error to console
      showMessage('Failed to save basic salary', 'error'); // Show error message
    } finally {
      setLoading(false); // Stop loading regardless of outcome
    }
  };

  // Function to handle monthly salary editing
  const handleMonthlySalaryEdit = async (employeeId) => {
    // Validate that month and amount are provided
    if (!selectedEditMonth) {
      showMessage('Please select a month', 'error');
      return;
    }

    if (!editMonthlySalary || editMonthlySalary <= 0) {
      showMessage('Please enter a valid monthly salary amount', 'error');
      return;
    }

    setLoading(true); // Start loading
    try {
      const salary = salaries[employeeId];
      const existingPayment = salary?.paymentHistory?.find(p => p.month === selectedEditMonth);

      let response;
      
      if (existingPayment) {
        // Update existing payment
        response = await fetch(`/api/salaries/${employeeId}/payments/${selectedEditMonth}`, {
          method: 'PUT', // HTTP PUT method for updates
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Number(editMonthlySalary),
          }),
        });
      } else {
        // Create new payment
        response = await fetch(`/api/salaries/${employeeId}/payments`, {
          method: 'POST', // HTTP POST method
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            month: selectedEditMonth,
            amount: Number(editMonthlySalary),
          }),
        });
      }

      // Check if response is successful
      if (response.ok) {
        const updatedSalary = await response.json(); // Parse response data
        showMessage(`Salary for ${formatMonth(selectedEditMonth)} set to ₹${editMonthlySalary}`, 'success'); // Show success message
        
        // Update both state and localStorage with updated salary data
        const updatedSalaries = {
          ...salaries, // Spread existing salaries
          [employeeId]: { // Update specific employee
            ...updatedSalary, // Spread updated data from API
            employeeId: employeeId // Ensure consistent ID format
          }
        };
        setSalaries(updatedSalaries); // Update React state
        localStorage.setItem('salariesData', JSON.stringify(updatedSalaries)); // Update localStorage
        
        // Update available months if this month is new
        if (!availableMonths.includes(selectedEditMonth)) {
          const newAvailableMonths = [...availableMonths, selectedEditMonth].sort().reverse(); // Add and sort
          setAvailableMonths(newAvailableMonths); // Update React state
          localStorage.setItem('availableMonths', JSON.stringify(newAvailableMonths)); // Update localStorage
        }
        
        // Reset editing state
        setSelectedEditMonth('');
        setEditMonthlySalary('');
        setEditingEmployee(null);
        setEditType('basic');
      } else {
        const errorData = await response.json(); // Parse error response
        showMessage(errorData.message || 'Failed to save monthly salary', 'error'); // Show error message
      }
    } catch (error) {
      console.error('Error saving monthly salary:', error); // Log error to console
      showMessage('Failed to save monthly salary', 'error'); // Show error message
    } finally {
      setLoading(false); // Stop loading regardless of outcome
    }
  };

  // Function to start basic salary editing
  const startBasicSalaryEdit = (employeeId, currentSalary = '') => {
    setEditingEmployee(employeeId);
    setEditBasicSalary(currentSalary.toString());
    setSelectedEditMonth('');
    setEditMonthlySalary('');
    setEditType('basic');
  };

  // Function to start monthly salary editing
  const startMonthlySalaryEdit = (employeeId) => {
    setEditingEmployee(employeeId);
    setEditBasicSalary('');
    setSelectedEditMonth('');
    setEditMonthlySalary('');
    setEditType('monthly');
  };

  // Function to cancel salary editing
  const cancelSalaryEdit = () => {
    setEditingEmployee(null);
    setEditBasicSalary('');
    setSelectedEditMonth('');
    setEditMonthlySalary('');
    setEditType('basic');
    setShowSalaryForm(false);
  };

  // Function to handle payment for an employee
  const handlePayment = async (employeeId) => {
    // Validate that a month is selected
    if (!selectedMonth) {
      showMessage('Please select a month first', 'error');
      return;
    }

    // Validate payment amount
    if (!paymentAmount || paymentAmount <= 0) {
      showMessage('Please enter a valid payment amount', 'error');
      return;
    }

    try {
      const salary = salaries[employeeId]; // Get employee's salary data from state
      
      // Validate that salary exists for this employee
      if (!salary) {
        showMessage('Salary not set for this employee. Please set basic salary first.', 'error');
        return;
      }

      setLoading(true); // Start loading

      // Make API call to record payment
      const response = await fetch(`/api/salaries/${employeeId}/payments`, {
        method: 'POST', // HTTP POST method
        headers: {
          'Content-Type': 'application/json', // Set content type to JSON
        },
        body: JSON.stringify({
          month: selectedMonth,
          amount: Number(paymentAmount) // Convert string to number
        }),
      });

      // Check if response is successful
      if (response.ok) {
        const updatedSalary = await response.json(); // Parse response data
        showMessage(`Payment of ₹${paymentAmount} recorded for ${getEmployeeName(employeeId)} - ${formatMonth(selectedMonth)}`, 'success'); // Show success message
        
        // Update both state and localStorage with updated salary data
        const updatedSalaries = {
          ...salaries, // Spread existing salaries
          [employeeId]: { // Update specific employee
            ...updatedSalary, // Spread updated data from API
            employeeId: employeeId // Ensure consistent ID format
          }
        };
        setSalaries(updatedSalaries); // Update React state
        localStorage.setItem('salariesData', JSON.stringify(updatedSalaries)); // Update localStorage
        
        // Update available months if this month is new
        if (!availableMonths.includes(selectedMonth)) {
          const newAvailableMonths = [...availableMonths, selectedMonth].sort().reverse(); // Add and sort
          setAvailableMonths(newAvailableMonths); // Update React state
          localStorage.setItem('availableMonths', JSON.stringify(newAvailableMonths)); // Update localStorage
        }
        
        // Reset payment amount and close payment dialog
        setPaymentAmount('');
        setPayingEmployee(null);
      } else {
        const errorData = await response.json(); // Parse error response
        showMessage(errorData.message || 'Failed to record payment', 'error'); // Show error message
      }
    } catch (error) {
      console.error('Error recording payment:', error); // Log error to console
      showMessage('Failed to record payment', 'error'); // Show error message
    } finally {
      setLoading(false); // Stop loading regardless of outcome
    }
  };

  // Function to open payment dialog for an employee
  const openPaymentDialog = (employeeId) => {
    const salary = salaries[employeeId];
    if (salary) {
      setPayingEmployee(employeeId);
      // Pre-fill with basic salary as default
      setPaymentAmount(salary.basicSalary || '');
    }
  };

  // Function to close payment dialog
  const closePaymentDialog = () => {
    setPayingEmployee(null);
    setPaymentAmount('');
  };

  // Function to handle basic salary form submission
  const handleSaveSalary = async (e) => {
    e.preventDefault();

    if (!selectedEmployee || !basicSalary) {
      showMessage('Please select an employee and enter basic salary', 'error');
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
        employeeRole: selectedEmp.role,
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

      console.log('Response status:', response.status);

      if (response.ok) {
        const savedSalary = await response.json();
        console.log('Saved salary response:', savedSalary);
        showMessage('Salary details saved successfully', 'success');

        setSalaries(prev => ({
          ...prev,
          [selectedEmp._id]: {
            ...savedSalary,
            employeeId: selectedEmp._id,
            employeeName: selectedEmp.name,
            employeeRole: selectedEmp.role,
            paymentHistory: savedSalary.paymentHistory || []
          }
        }));

        setBasicSalary('');
        setSelectedEmployee('');
        setShowSalaryForm(false);
      } else {
        const errorText = await response.text();
        console.error('Server error details:', errorText);

        let errorMessage = 'Failed to save salary details';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }

        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Network error saving salary:', error);
      showMessage('Failed to save salary details. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date(); // Get current date
    const year = now.getFullYear(); // Get current year
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Get current month (0-11, so +1) and pad with zero
    return `${year}-${month}`; // Return in YYYY-MM format
  };

  // Helper function to get salary data for an employee
  const getSalaryForEmployee = (employeeId) => {
    return salaries[employeeId] || null; // Return salary or null if not found
  };

  // Helper function to get employee name by ID
  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId); // Find employee in employees array
    return employee ? employee.name : 'Unknown'; // Return name or 'Unknown' if not found
  };

  // Helper function to format month string (YYYY-MM) to readable format
  const formatMonth = (monthString) => {
    const [year, month] = monthString.split('-'); // Split into year and month parts
    const date = new Date(year, month - 1); // Create date object (month is 0-indexed in JavaScript)
    return date.toLocaleString('default', { month: 'long', year: 'numeric' }); // Format as "January 2024"
  };

  // Helper function to get all months in a given year
  const getMonthsInYear = (year) => {
    const months = []; // Initialize empty array
    // Generate all months for the year (01 to 12)
    for (let i = 1; i <= 12; i++) {
      months.push(`${year}-${String(i).padStart(2, '0')}`); // Add month in YYYY-MM format
    }
    return months; // Return array of months
  };

  // Helper function to get payment for a specific month
  const getPaymentForMonth = (salary, month) => {
    if (!salary || !salary.paymentHistory) return null; // Return null if no salary or payment history
    return salary.paymentHistory.find(payment => payment.month === month); // Find matching payment
  };

  // Helper function to get available years (past 2 years to future 1 year)
  const getYears = () => {
    const currentYear = new Date().getFullYear(); // Get current year
    const years = []; // Initialize empty array
    // Generate years from 2 years ago to 1 year in future
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i); // Add year to array
    }
    return years; // Return array of years
  };

  // Helper function to calculate total paid for an employee
  const calculateTotalPaid = (salary) => {
    if (!salary || !salary.paymentHistory) return 0; // Return 0 if no salary or payment history
    return salary.paymentHistory.reduce((total, payment) => total + payment.amount, 0); // Sum all payment amounts
  };

  // Handler for year change in dropdown
  const handleYearChange = (year) => {
    setSelectedYear(year); // Update selected year state
    setSelectedMonth(''); // Clear selected month when year changes
  };

  // Main component render method
  return (
    <div className="salary-component">
      {/* Header section with title and action buttons */}
      <div className="header-section">
        <h2>Salary Management</h2>
        <div className="header-buttons">
          <button
            className={`toggle-form-btn ${showSalaryForm ? 'active' : ''}`}
            onClick={() => setShowSalaryForm(!showSalaryForm)}
          >
            {showSalaryForm ? '✕ Cancel' : '+ Set Salary'}
          </button>
        </div>
      </div>
      
      {/* Message display for user feedback */}
      {message.show && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Debug information display */}
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
        Data Status: {dataLoaded ? 'Loaded' : 'Loading'} | 
        Salaries: {Object.keys(salaries).length} | 
        Months: {availableMonths.length}
      </div>

      {/* Basic Salary Setup - Collapsible */}
      {showSalaryForm && (
        <div className="salary-form">
          <h3>Set Basic Salary</h3>
          <form onSubmit={handleSaveSalary}>
            <div className="form-group">
              <label>Select Employee *</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                required
              >
                <option value="">Select an employee</option>
                {filteredEmployees.map(employee => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name} - {employee.role}
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
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="save-btn">
                {loading ? 'Saving...' : 'Set Salary'}
              </button>
              <button type="button" onClick={() => setShowSalaryForm(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Controls Section */}
      <div className="payment-controls">
        <h3>Record Monthly Payments</h3>

        {/* Year and Month Selection */}
        <div className="form-row">
          <div className="form-group">
            <label>Select Year</label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
            >
              {getYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Select a month</option>
              {getMonthsInYear(selectedYear).map(month => (
                <option key={month} value={month}>
                  {formatMonth(month)} 
                  {month === getCurrentMonth() && ' (Current)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Month Information Display */}
        {selectedMonth && (
          <div className="selected-month-info">
            <strong>Selected: {formatMonth(selectedMonth)}</strong>
            {selectedMonth > getCurrentMonth() && <span className="future-warning"> - Future Month</span>}
            {selectedMonth < getCurrentMonth() && <span className="past-info"> - Past Month</span>}
            {selectedMonth === getCurrentMonth() && <span className="current-info"> - Current Month</span>}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      {payingEmployee && (
        <div className="payment-dialog-overlay">
          <div className="payment-dialog">
            <h3>Enter Salary Payment</h3>
            <div className="payment-details">
              <p><strong>Employee:</strong> {getEmployeeName(payingEmployee)}</p>
              <p><strong>Month:</strong> {formatMonth(selectedMonth)}</p>
              <p><strong>Basic Salary:</strong> ₹{salaries[payingEmployee]?.basicSalary?.toLocaleString() || '0'}</p>
            </div>
            <div className="form-group">
              <label>Payment Amount (₹) *</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
                required
                min="0"
              />
            </div>
            <div className="dialog-buttons">
              <button 
                onClick={() => handlePayment(payingEmployee)}
                disabled={loading || !paymentAmount}
                className="confirm-pay-btn"
              >
                {loading ? 'Processing...' : 'Confirm Payment'}
              </button>
              <button 
                onClick={closePaymentDialog}
                disabled={loading}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Dialog */}
      {editingEmployee && (
        <div className="payment-dialog-overlay">
          <div className="payment-dialog edit-salary-dialog">
            <h3>Edit Salary Details</h3>
            <div className="payment-details">
              <p><strong>Employee:</strong> {getEmployeeName(editingEmployee)}</p>
              <p><strong>Current Basic Salary:</strong> ₹{salaries[editingEmployee]?.basicSalary?.toLocaleString() || '0'}</p>
            </div>
            
            {/* Edit Type Selection */}
            <div className="form-group">
              <label>What do you want to edit?</label>
              <div className="edit-type-buttons">
                <button 
                  type="button"
                  onClick={() => startBasicSalaryEdit(editingEmployee, salaries[editingEmployee]?.basicSalary || '')}
                  className={`edit-type-btn ${editType === 'basic' ? 'active' : ''}`}
                >
                  Basic Salary
                </button>
                <button 
                  type="button"
                  onClick={() => startMonthlySalaryEdit(editingEmployee)}
                  className={`edit-type-btn ${editType === 'monthly' ? 'active' : ''}`}
                >
                  Monthly Salary
                </button>
              </div>
            </div>

            {/* Basic Salary Section */}
            {editType === 'basic' && (
              <div className="basic-salary-section">
                <div className="form-group">
                  <label>Basic Salary (₹) *</label>
                  <p className="field-description">This is the standard monthly salary amount</p>
                  <input
                    type="number"
                    value={editBasicSalary}
                    onChange={(e) => setEditBasicSalary(e.target.value)}
                    placeholder="Enter basic salary amount"
                    required
                    min="0"
                    step="100"
                  />
                </div>
                <div className="dialog-buttons">
                  <button 
                    onClick={() => handleBasicSalaryEdit(editingEmployee)}
                    disabled={loading || !editBasicSalary}
                    className="confirm-pay-btn"
                  >
                    {loading ? 'Saving...' : 'Save Basic Salary'}
                  </button>
                  <button 
                    onClick={cancelSalaryEdit}
                    disabled={loading}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Monthly Salary Section */}
            {editType === 'monthly' && (
              <div className="monthly-salary-section">
                <div className="form-group">
                  <label>Select Month *</label>
                  <select
                    value={selectedEditMonth}
                    onChange={(e) => {
                      setSelectedEditMonth(e.target.value);
                      const salary = salaries[editingEmployee];
                      const payment = getPaymentForMonth(salary, e.target.value);
                      setEditMonthlySalary(payment ? payment.amount.toString() : '');
                    }}
                    required
                  >
                    <option value="">Select a month</option>
                    {getMonthsInYear(selectedYear).map(month => (
                      <option key={month} value={month}>
                        {formatMonth(month)} 
                        {month === getCurrentMonth() && ' (Current)'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEditMonth && (
                  <div className="form-group">
                    <label>Salary Amount for {formatMonth(selectedEditMonth)} (₹) *</label>
                    <p className="field-description">Enter the actual salary amount paid for this specific month</p>
                    <input
                      type="number"
                      value={editMonthlySalary}
                      onChange={(e) => setEditMonthlySalary(e.target.value)}
                      placeholder="Enter salary amount for this month"
                      required
                      min="0"
                    />
                    <div className="current-payment-info">
                      {getPaymentForMonth(salaries[editingEmployee], selectedEditMonth) ? (
                        <span>Current: ₹{getPaymentForMonth(salaries[editingEmployee], selectedEditMonth)?.amount.toLocaleString()}</span>
                      ) : (
                        <span>No salary recorded for this month yet</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="dialog-buttons">
                  <button 
                    onClick={() => handleMonthlySalaryEdit(editingEmployee)}
                    disabled={loading || !editMonthlySalary || !selectedEditMonth}
                    className="confirm-pay-btn"
                  >
                    {loading ? 'Saving...' : 'Save Monthly Salary'}
                  </button>
                  <button 
                    onClick={cancelSalaryEdit}
                    disabled={loading}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salary List Table */}
      <div className="salary-list">
        <h3>Employee Salary Overview - {selectedYear}</h3>
        
        {/* Loading State */}
        {loading && !dataLoaded ? (
          <div className="loading">Loading salary data...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="no-data">No active employees found.</div>
        ) : (
          <div className="salary-table-container">
            <table className="salary-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Basic Salary</th>
                  {/* Month columns for the selected year */}
                  {getMonthsInYear(selectedYear).map(month => (
                    <th key={month}>
                      {formatMonth(month)}
                      {month === getCurrentMonth() && ' ★'} {/* Star for current month */}
                    </th>
                  ))}
                  <th>Total Paid</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Map through each employee to create table rows */}
                {filteredEmployees.map(employee => {
                  const salary = getSalaryForEmployee(employee._id);
                  const totalPaid = calculateTotalPaid(salary);
                  
                  return (
                    <tr key={employee._id}>
                      <td>{employee.name}</td>
                      <td>{employee.role}</td>
                      
                      {/* Basic Salary Cell */}
                      <td className="salary-amount">
                        {salary ? `₹${salary.basicSalary?.toLocaleString() || '0'}` : 'Not set'}
                      </td>
                      
                      {/* Payment cells for each month */}
                      {getMonthsInYear(selectedYear).map(month => {
                        const payment = getPaymentForMonth(salary, month);
                        const isCurrentMonth = month === getCurrentMonth();
                        const isFutureMonth = month > getCurrentMonth();
                        const isPastMonth = month < getCurrentMonth();
                        
                        return (
                          <td 
                            key={month} 
                            className={`payment-cell ${payment ? 'paid' : 'pending'} ${
                              isCurrentMonth ? 'current-month' : ''
                            } ${isFutureMonth ? 'future-month' : ''} ${isPastMonth ? 'past-month' : ''}`}
                          >
                            {payment ? `₹${payment.amount.toLocaleString()}` : '-'}
                            {isCurrentMonth && !payment && <span className="current-indicator">★</span>}
                          </td>
                        );
                      })}
                      
                      <td className="total-paid">₹{totalPaid.toLocaleString()}</td>
                      
                      <td className="action-buttons">
                        {/* Edit Salary Button */}
                        <button 
                          onClick={() => startBasicSalaryEdit(employee._id, salary?.basicSalary || '')}
                          className="edit-salary-btn"
                        >
                          {salary ? 'Edit Salary' : 'Set Salary'}
                        </button>
                        
                        {/* Pay Salary button (only if salary is set) */}
                        {salary && (
                          <button 
                            onClick={() => openPaymentDialog(employee._id)}
                            disabled={!selectedMonth}
                            className="pay-salary-btn"
                          >
                            Pay Salary
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Component Styles using styled-jsx */}
      <style jsx>{`
        .salary-component {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .header-buttons {
          display: flex;
          gap: 10px;
        }
        
        .toggle-form-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
        }
        
        .toggle-form-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }
        
        .toggle-form-btn.active {
          background: linear-gradient(135deg, #f56565 0%, #ed8936 100%);
        }
        
        .salary-form {
          background: white;
          padding: 28px;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .salary-form h3 {
          margin: 0 0 24px 0;
          color: #1e293b;
          font-size: 20px;
          font-weight: 600;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        
        .save-btn {
          padding: 12px 32px;
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(72, 187, 120, 0.3);
        }
        
        .cancel-btn {
          padding: 12px 24px;
          background: #64748b;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .cancel-btn:hover {
          background: #475569;
        }
        
        .message {
          padding: 10px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .message.warning {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }
        
        .payment-controls {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .form-row {
          display: flex;
          gap: 20px;
        }
        
        .form-group {
          margin-bottom: 15px;
          flex: 1;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }
        
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
          font-size: 14px;
        }
        
        .field-description {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
          margin-bottom: 8px;
          font-style: italic;
        }
        
        .selected-month-info {
          padding: 10px;
          background: #e7f3ff;
          border-radius: 4px;
          margin: 10px 0;
          border-left: 4px solid #007bff;
        }
        
        .future-warning {
          color: #856404;
          font-weight: bold;
        }
        
        .past-info {
          color: #0c5460;
          font-weight: bold;
        }
        
        .current-info {
          color: #155724;
          font-weight: bold;
        }
        
        button {
          padding: 10px 16px;
          background-color: #003366;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        button:hover {
          background-color: #002244;
        }
        
        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .edit-salary-btn {
          background-color: #ffc107;
          color: #212529;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .edit-salary-btn:hover {
          background-color: #e0a800;
        }
        
        .pay-salary-btn {
          background-color: #4da6ff;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .pay-salary-btn:hover {
          background-color: #3385d6;
        }
        
        .payment-dialog-overlay {
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
        }
        
        .payment-dialog {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          min-width: 400px;
          max-width: 500px;
        }
        
        .edit-salary-dialog {
          min-width: 450px;
          max-width: 500px;
        }
        
        .payment-details {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .payment-details p {
          margin: 5px 0;
        }
        
        .dialog-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }
        
        .confirm-pay-btn {
          background-color: #4da6ff;
          font-weight: bold;
        }
        
        .confirm-pay-btn:hover {
          background-color: #3385d6;
        }
        
        .cancel-btn {
          background-color: #6c757d;
        }
        
        .edit-type-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .edit-type-btn {
          flex: 1;
          background-color: #e9ecef;
          color: #495057;
          border: 2px solid #dee2e6;
          padding: 12px;
          font-weight: 500;
        }
        
        .edit-type-btn:hover {
          background-color: #dae0e5;
          border-color: #ced4da;
        }
        
        .edit-type-btn.active {
          background-color: #4da6ff;
          color: white;
          border-color: #4da6ff;
        }
        
        .monthly-salary-section {
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        
        .basic-salary-section {
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        
        .current-payment-info {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
          font-style: italic;
        }
        
        .salary-table-container {
          overflow-x: auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .salary-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }
        
        .salary-table th,
        .salary-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        .salary-table th {
          background-color: #4da6ff;
          color: white;
          font-weight: bold;
          position: sticky;
          top: 0;
          white-space: nowrap;
        }
        
        .salary-table tr:hover {
          background-color: #f8f9fa;
        }
        
        .salary-amount {
          font-weight: 600;
          color: #2c5aa0;
          min-width: 150px;
        }
        
        .payment-cell {
          text-align: center;
          font-size: 13px;
          position: relative;
          min-width: 120px;
        }
        
        .payment-cell.paid {
          background-color: #e6f2ff;
          color: #004085;
          font-weight: 500;
        }
        
        .payment-cell.pending {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .payment-cell.current-month {
          border: 2px solid #007bff;
        }
        
        .payment-cell.future-month {
          background-color: #e9ecef;
          color: #6c757d;
        }
        
        .payment-cell.past-month {
          background-color: #f8f9fa;
        }
        
        .current-indicator {
          color: #007bff;
          font-weight: bold;
          font-size: 10px;
        }
        
        .total-paid {
          font-weight: 600;
          color: #4da6ff;
        }
        
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
          white-space: nowrap;
          min-width: 150px;
        }
        
        .loading, .no-data {
          padding: 20px;
          text-align: center;
          background: white;
          border-radius: 8px;
          color: #666;
        }
        
        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
            gap: 0;
          }
          
          .salary-component {
            padding: 10px;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .header-section {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
          
          .header-buttons {
            flex-direction: column;
            width: 100%;
          }
          
          .payment-dialog {
            min-width: 90%;
            margin: 20px;
          }
          
          .edit-salary-dialog {
            min-width: 90%;
          }
          
          .dialog-buttons {
            flex-direction: column;
          }
          
          .edit-type-buttons {
            flex-direction: column;
          }
          
          .salary-form {
            padding: 20px;
          }
          
          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

// Export the component as default for use in other files
export default SalaryComponent;