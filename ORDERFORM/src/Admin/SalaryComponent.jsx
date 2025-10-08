import React, { useState, useEffect } from 'react';

const SalaryComponent = ({ employees }) => {
  const [salaries, setSalaries] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ show: false, text: '', type: '' });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  useEffect(() => {
    fetchSalaries();
  }, []);

  useEffect(() => {
    // Filter active employees
    setFilteredEmployees(employees.filter(emp => emp.active));
  }, [employees]);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/salaries');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched salary data:', data);
        
        const salaryMap = {};
        let skippedRecords = 0;
        
        data.forEach(salary => {
          // Handle cases where employeeId might be null or undefined
          if (!salary.employeeId) {
            console.warn('Skipping salary record with null employeeId:', salary);
            skippedRecords++;
            return;
          }
          
          // Handle both populated and non-populated employeeId
          let employeeId;
          if (typeof salary.employeeId === 'object' && salary.employeeId._id) {
            employeeId = salary.employeeId._id;
          } else if (typeof salary.employeeId === 'string') {
            employeeId = salary.employeeId;
          } else {
            console.warn('Skipping salary record with invalid employeeId format:', salary);
            skippedRecords++;
            return;
          }
          
          // Only add if the employee exists and is active
          const employeeExists = employees.some(emp => emp._id === employeeId && emp.active);
          if (employeeExists) {
            salaryMap[employeeId] = {
              ...salary,
              employeeId: employeeId // Normalize the employeeId
            };
          } else {
            console.warn('Skipping salary record for inactive or non-existent employee:', salary);
            skippedRecords++;
          }
        });
        
        setSalaries(salaryMap);
        
        if (skippedRecords > 0) {
          showMessage(`Loaded salary data (${skippedRecords} invalid records skipped)`, 'warning');
        } else {
          showMessage('Salary data loaded successfully', 'success');
        }
      } else {
        console.error('Failed to fetch salaries:', response.status);
        showMessage('Failed to load salary data', 'error');
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
      showMessage('Failed to load salary data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ show: true, text, type });
    setTimeout(() => setMessage({ show: false, text: '', type: '' }), 5000);
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee || !basicSalary) {
      showMessage('Please select an employee and enter basic salary', 'error');
      return;
    }

    setLoading(true);
    try {
      const employee = employees.find(emp => emp._id === selectedEmployee);
      if (!employee) {
        showMessage('Employee not found', 'error');
        return;
      }

      const response = await fetch('/api/salaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          basicSalary: Number(basicSalary),
        }),
      });

      if (response.ok) {
        const savedSalary = await response.json();
        showMessage('Salary details saved successfully', 'success');
        
        // Update the salaries state with the new/updated salary
        setSalaries(prev => ({
          ...prev,
          [selectedEmployee]: savedSalary
        }));
        
        setBasicSalary('');
        setSelectedEmployee('');
      } else {
        const errorData = await response.json();
        showMessage(errorData.message || 'Failed to save salary details', 'error');
      }
    } catch (error) {
      console.error('Error saving salary:', error);
      showMessage('Failed to save salary details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (employeeId, amount = null) => {
    if (!selectedMonth) {
      showMessage('Please select a month first', 'error');
      return;
    }

    try {
      const salary = salaries[employeeId];
      if (!salary) {
        showMessage('Salary not set for this employee', 'error');
        return;
      }

      const paymentAmount = amount || salary.basicSalary;

      const response = await fetch(`/api/salaries/${employeeId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: selectedMonth,
          amount: paymentAmount,
          year: selectedYear
        }),
      });

      if (response.ok) {
        const updatedSalary = await response.json();
        showMessage('Payment recorded successfully', 'success');
        
        // Update the specific salary in state
        setSalaries(prev => ({
          ...prev,
          [employeeId]: updatedSalary
        }));
      } else {
        const errorData = await response.json();
        showMessage(errorData.message || 'Failed to record payment', 'error');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      showMessage('Failed to record payment', 'error');
    }
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const getSalaryForEmployee = (employeeId) => {
    // Check if we have a salary record for this employee
    const salary = salaries[employeeId];
    
    // If we have a record but it's an object with employeeId property, 
    // make sure we're comparing the right ID
    if (salary) {
      // Handle both populated and non-populated employeeId in the salary record
      const salaryEmployeeId = (salary.employeeId && salary.employeeId._id) 
        ? salary.employeeId._id 
        : salary.employeeId;
      
      if (salaryEmployeeId === employeeId) {
        return salary;
      }
    }
    
    return null;
  };

  const formatMonth = (monthString) => {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const getMonthsInYear = (year) => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(`${year}-${String(i).padStart(2, '0')}`);
    }
    return months;
  };

  const getPaymentForMonth = (salary, month) => {
    if (!salary || !salary.paymentHistory) return null;
    return salary.paymentHistory.find(payment => payment.month === month);
  };

  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  const calculateTotalPaid = (salary) => {
    if (!salary || !salary.paymentHistory) return 0;
    return salary.paymentHistory.reduce((total, payment) => total + payment.amount, 0);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMonth(''); // Reset month when year changes
  };

  // Debug function to check state
  const debugSalaries = () => {
    console.log('Current salaries state:', salaries);
    console.log('Employees:', employees);
    console.log('Filtered employees:', filteredEmployees);
  };

  return (
    <div className="salary-component">
      <h2>Salary Management</h2>
      
      {message.show && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <button onClick={debugSalaries} style={{marginBottom: '20px'}}>
        Debug Salaries
      </button>

      <div className="salary-form">
        <h3>Assign/Update Basic Salary</h3>
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
              placeholder="Enter basic salary"
              required
              min="0"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : selectedEmployee && salaries[selectedEmployee] ? 'Update Salary' : 'Set Salary'}
          </button>
        </form>
      </div>

      <div className="payment-controls">
        <h3>Record Monthly Payments</h3>
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
                <option key={month} value={month} disabled={month > getCurrentMonth()}>
                  {formatMonth(month)} {month > getCurrentMonth() ? '(Future)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="salary-list">
        <h3>Employee Salary Overview - {selectedYear}</h3>
        
        {loading ? (
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
                  {getMonthsInYear(selectedYear).map(month => (
                    <th key={month}>{formatMonth(month)}</th>
                  ))}
                  <th>Total Paid</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(employee => {
                  const salary = getSalaryForEmployee(employee._id);
                  const totalPaid = calculateTotalPaid(salary);
                  
                  return (
                    <tr key={employee._id}>
                      <td>{employee.name}</td>
                      <td>{employee.role}</td>
                      <td className="salary-amount">
                        {salary ? `₹${salary.basicSalary.toLocaleString()}` : 'Not set'}
                      </td>
                      
                      {getMonthsInYear(selectedYear).map(month => {
                        const payment = getPaymentForMonth(salary, month);
                        return (
                          <td key={month} className={`payment-cell ${payment ? 'paid' : 'pending'}`}>
                            {payment ? `₹${payment.amount.toLocaleString()}` : '-'}
                          </td>
                        );
                      })}
                      
                      <td className="total-paid">₹{totalPaid.toLocaleString()}</td>
                      
                      <td className="action-buttons">
                        <button 
                          onClick={() => {
                            setSelectedEmployee(employee._id);
                            setBasicSalary(salary?.basicSalary || '');
                          }}
                          className="edit-btn"
                        >
                          Edit
                        </button>
                        {salary && (
                          <button 
                            onClick={() => handleAddPayment(employee._id)}
                            disabled={!selectedMonth}
                            className="add-payment-btn"
                          >
                            Pay
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

      <style>{`
        .salary-component {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          overflow-x: auto;
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
        
        .salary-form, .payment-controls {
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
        
        .edit-btn {
          background-color: #6c757d;
        }
        
        .edit-btn:hover {
          background-color: #5a6268;
        }
        
        .add-payment-btn {
          background-color: #28a745;
        }
        
        .add-payment-btn:hover {
          background-color: #218838;
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
          background-color: #218838;
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
        }
        
        .payment-cell {
          text-align: center;
          font-size: 13px;
        }
        
        .payment-cell.paid {
          background-color: #d4edda;
          color: #155724;
          font-weight: 500;
        }
        
        .payment-cell.pending {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .total-paid {
          font-weight: 600;
          color: #28a745;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
          white-space: nowrap;
        }
        
        .action-buttons button {
          padding: 6px 10px;
          font-size: 12px;
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
        }
      `}</style>
    </div>
  );
};

export default SalaryComponent;