import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';


const ActivityChart = () => {
  const today = new Date();


  const [executiveNames, setExecutiveNames] = useState([]);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [completedTasks, setCompletedTasks] = useState(0);
  const [target, setTarget] = useState(100);

  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [assignTarget, setAssignTarget] = useState('');
  const [assignMonth, setAssignMonth] = useState(today.getMonth() + 1);
  const [assignYear, setAssignYear] = useState(today.getFullYear());

  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedExecutives, setSelectedExecutives] = useState([]);

  useEffect(() => {
    const fetchExecutives = async () => {
      try {
        const res = await axios.get('/api/executives');
        setExecutiveNames(res.data);
      } catch (err) {
        console.error('Error fetching executives:', err);
      }
    };
    fetchExecutives();
  }, []);

  const handleExecutiveChange = async (e) => {
    const name = e.target.value;
    setSelectedExecutive(name);
    await fetchExecutiveOrders(name, selectedYear, selectedMonth);
  };

  const handleDateChange = async (day, month, year) => {
    setSelectedDay(day);
    setSelectedMonth(month);
    setSelectedYear(year);
    if (selectedExecutive) {
      await fetchExecutiveOrders(selectedExecutive, year, month);
    }
  };

  const fetchExecutiveOrders = async (name, year, month) => {
  try {
    const res = await axios.get('/api/orders');
    const orders = res.data;

    const selectedMonthStr = `${year}-${String(month).padStart(2, '0')}`;

    const filtered = orders.filter(order => {
      // Check for invalid or missing orderDate
      if (!order.orderDate || isNaN(new Date(order.orderDate))) {
        console.warn("Invalid orderDate found:", order.orderDate, "in order:", order);
        return false;
      }

      const orderDate = format(new Date(order.orderDate), 'yyyy-MM');
      return order.executive === name && orderDate === selectedMonthStr;
    });

    let sum = 0;
    filtered.forEach(order => {
      if (Array.isArray(order.rows)) {
        order.rows.forEach(item => {
          sum += parseFloat(item.total);
        });
      }
    });

    const executiveTarget = filtered.length > 0 ? filtered[0].target : 100;
    setTarget(executiveTarget);
    setCompletedTasks(sum);
  } catch (err) {
    console.error('Error fetching orders:', err);
  }
};


  const handleExecutiveSelection = (executive) => {
    setSelectedExecutives(prev => {
      if (prev.includes(executive)) {
        return prev.filter(e => e !== executive);
      } else {
        return [...prev, executive];
      }
    });
  };

 const handleAssignTarget = async () => {
  // Validate inputs
  if (!assignTarget || isNaN(assignTarget)) {
    alert('Please enter a valid target amount');
    return;
  }

  if (!assignMonth || !assignYear) {
    alert('Please select month and year');
    return;
  }

  // Determine which executives to assign to
  let executivesToAssign = [];
  if (assignToAll) {
    executivesToAssign = executiveNames.map(exec => exec.name);
  } else {
    if (selectedExecutives.length === 0) {
      alert('Please select at least one executive');
      return;
    }
    executivesToAssign = selectedExecutives;
  }

  try {
    // Assign targets to each executive individually
    const assignmentPromises = executivesToAssign.map(async (executiveName) => {
      await axios.post('/api/targets', {
        executiveName,  // Send one executive at a time
        year: assignYear,
        month: assignMonth,
        targetAmount: Number(assignTarget)
      });
    });

    // Wait for all assignments to complete
    await Promise.all(assignmentPromises);

    // Show success message
    setPopupMessage(
      `Target of ₹${assignTarget} assigned to ${executivesToAssign.length} 
      executive(s) for ${months[assignMonth - 1]} ${assignYear}`
    );
    setShowPopup(true);

    // Hide popup after 2.5 seconds
    setTimeout(() => {
      setShowPopup(false);
      // Refresh data if viewing the same period
      if (selectedExecutive && assignMonth === selectedMonth && assignYear === selectedYear) {
        fetchExecutiveOrders(selectedExecutive, assignYear, assignMonth);
      }
    }, 2500);

    // Reset form
    setAssignTarget('');
    setSelectedExecutives([]);

  } catch (error) {
    console.error('Error assigning targets:', error);
    alert(`Failed to assign targets: ${error.response?.data?.error || error.message}`);
  }
};

  const completionPercentage = (completedTasks / target) * 100;

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);

  return (
    <div className="activity-chart-container">
      <div className="top-bar">
        <select
          onChange={handleExecutiveChange}
          value={selectedExecutive}
          className="executive-select"
        >
          <option value="">--Select Executive--</option>
          {executiveNames.map((exec, index) => (
            <option key={index} value={exec.name}>{exec.name}</option>
          ))}
        </select>

        <div className="date-picker-group">
          <select value={selectedDay} onChange={(e) => handleDateChange(Number(e.target.value), selectedMonth, selectedYear)}>
            {days.map(day => <option key={day} value={day}>{day}</option>)}
          </select>

          <select value={selectedMonth} onChange={(e) => handleDateChange(selectedDay, Number(e.target.value), selectedYear)}>
            {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>

          <select value={selectedYear} onChange={(e) => handleDateChange(selectedDay, selectedMonth, Number(e.target.value))}>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
      </div>

      <div className="cards-container">
        <div className="chart-container">
          <h3 className="chart-heading">Executive Target Report</h3>
          <div
            className="chart"
            style={{
              background: `conic-gradient(
                #4caf50 ${completionPercentage}%,
                #f44336 ${completionPercentage}% 100%
              )`,
            }}
          >
            <div className="chart-inner">
              <div className="completed-text">₹{completedTasks}</div>
              <div className="target-text">of ₹{target}</div>
            </div>
          </div>
        </div>

        <div className="assign-target-section">
          <h3>Assign Targets</h3>
          <div className="assign-form">
            <input
              type="number"
              placeholder="Enter Target Amount"
              value={assignTarget}
              onChange={(e) => setAssignTarget(e.target.value)}
            />

            <select value={assignMonth} onChange={(e) => setAssignMonth(Number(e.target.value))}>
              {months.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>

            <select value={assignYear} onChange={(e) => setAssignYear(Number(e.target.value))}>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <div className="assign-mode-toggle">
              <label>
                <input
                  type="radio"
                  checked={assignToAll}
                  onChange={() => setAssignToAll(true)}
                />
                Assign to All Executives
              </label>
              <label>
                <input
                  type="radio"
                  checked={!assignToAll}
                  onChange={() => setAssignToAll(false)}
                />
                Assign to Selected Executives
              </label>
            </div>

            {!assignToAll && (
              <div className="executive-selection">
                <h4>Select Executives:</h4>
                {executiveNames.map((exec, index) => (
                  <label key={index} className="executive-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedExecutives.includes(exec.name)}
                      onChange={() => handleExecutiveSelection(exec.name)}
                    />
                    {exec.name}
                  </label>
                ))}
              </div>
            )}

            <button onClick={handleAssignTarget}>
              {assignToAll ? 'Assign to All Executives' : 'Assign to Selected Executives'}
            </button>
          </div>
        </div>
      </div>

      {showPopup && (
        <div className="popup">
          <div className="popup-content">
            <p>{popupMessage}</p>
          </div>
        </div>
      )}

      <style >{`
        .activity-chart-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
        }

        .top-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
          width: 100%;
        }

        .executive-select {
          padding: 8px;
          font-size: 16px;
          border-radius: 8px;
          border: 1px solid #ddd;
          min-width: 250px;
        }

        .date-picker-group {
          display: flex;
          gap: 10px;
        }

        .date-picker-group select {
          padding: 6px;
          font-size: 14px;
          border-radius: 6px;
          border: 1px solid #ccc;
        }

        .cards-container {
          display: flex;
          justify-content: center;
          gap: 30px;
          width: 100%;
          flex-wrap: wrap;
        }

        .chart-container {
          width: 350px;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          text-align: center;
          background: white;
        }

        .chart {
          width: 300px;
          height: 300px;
          border-radius: 50%;
          position: relative;
          margin: auto;
        }

        .chart-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .completed-text {
          font-size: 20px;
          font-weight: bold;
        }

        .target-text {
          font-size: 14px;
          color: #555;
        }

        .assign-target-section {
          width: 350px;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          background: white;
        }

        .assign-target-section h3 {
          margin-bottom: 15px;
          text-align: center;
        }

        .assign-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .assign-form select,
        .assign-form input,
        .assign-form button {
          padding: 8px;
          font-size: 14px;
          border-radius: 6px;
          border: 1px solid #ccc;
        }

        .assign-form button {
          background-color: #4caf50;
          color: white;
          cursor: pointer;
          margin-top: 10px;
          border: none;
          padding: 10px;
          font-size: 16px;
        }

        .assign-form button:hover {
          background-color: #45a049;
        }

        .assign-mode-toggle {
          display: flex;
          gap: 15px;
          margin: 10px 0;
          justify-content: center;
        }
        
        .assign-mode-toggle label {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }
        
        .executive-selection {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 10px;
        }
        
        .executive-checkbox {
          display: flex;
          align-items: center;
          gap: 5px;
          margin: 5px 0;
          padding: 5px;
          cursor: pointer;
        }
        
        .executive-checkbox:hover {
          background-color: #f5f5f5;
        }

        .popup {
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

        .popup-content {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          max-width: 80%;
          text-align: center;
        }

        @media (max-width: 768px) {
          .cards-container {
            flex-direction: column;
            align-items: center;
          }
          
          .chart {
            width: 250px;
            height: 250px;
          }
        }

        @media (max-width: 480px) {
          .date-picker-group {
            flex-direction: column;
          }

          .chart-container,
          .assign-target-section {
            width: 100%;
            max-width: 320px;
          }

          .chart {
            width: 200px;
            height: 200px;
          }

          .assign-mode-toggle {
            flex-direction: column;
            gap: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default ActivityChart;