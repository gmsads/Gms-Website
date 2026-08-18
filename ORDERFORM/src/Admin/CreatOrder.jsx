import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../Executive/order.css';

function CreateOrder() {
  // Form states
  const [requirements, setRequirements] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [business, setBusiness] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [advanceDate, setAdvanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [clientType, setClientType] = useState('');
  const [rows, setRows] = useState([getEmptyRow()]);

  // Payment states
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [advance, setAdvance] = useState('');
  const [balance, setBalance] = useState('');
  const [total, setTotal] = useState('');
  const [upiOptions, setUpiOptions] = useState([]);
  const [selectedUpi, setSelectedUpi] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeImage, setChequeImage] = useState(null);

  // Target states
  const [target, setTarget] = useState('');
  const [isTargetSetForMonth, setIsTargetSetForMonth] = useState(false);
  const [currentTargetMonth, setCurrentTargetMonth] = useState('');

  // Initialize empty row
  function getEmptyRow() {
    const delivery = new Date(orderDate);
    delivery.setDate(delivery.getDate() + 3);
    return {
      requirement: '',
      description: '',
      quantity: '',
      rate: '',
      total: '',
      deliveryDate: delivery.toISOString().split('T')[0],
    };
  }

  // Fetch requirements and executives on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reqRes, execRes] = await Promise.all([
          axios.get('/api/requirements'),
          axios.get('/api/executives')
        ]);
        setRequirements(reqRes.data);
        setExecutives(execRes.data);
        if (execRes.data.length > 0) {
          setSelectedExecutive(execRes.data[0]._id); // Set first executive as default
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };
    fetchData();
  }, []);

  // Check target when order date or executive changes
  const checkTargetForMonth = async (dateString, executiveId) => {
    if (!executiveId) return;
    
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthYearKey = `${month}-${year}`;

    // Skip if we're already checking this month
    if (currentTargetMonth === monthYearKey) return;

    try {
      const res = await axios.get(`/api/get-target/${executiveId}/${month}/${year}`);
      if (res.data.target) {
        setTarget(res.data.target);
        setIsTargetSetForMonth(true);
      } else {
        setTarget('');
        setIsTargetSetForMonth(false);
      }
      setCurrentTargetMonth(monthYearKey);
    } catch (error) {
      console.error('Error fetching target:', error);
      setTarget('');
      setIsTargetSetForMonth(false);
    }
  };

  // Handle order date change
  const handleOrderDateChange = (e) => {
    const newDate = e.target.value;
    setOrderDate(newDate);
    checkTargetForMonth(newDate, selectedExecutive);

    // Update delivery dates for all rows
    setRows(prevRows =>
      prevRows.map(row => ({
        ...row,
        deliveryDate: calculateDeliveryDate(newDate)
      }))
    );
  };

  // Handle executive change
  const handleExecutiveChange = (e) => {
    const executiveId = e.target.value;
    setSelectedExecutive(executiveId);
    checkTargetForMonth(orderDate, executiveId);
  };

  // Calculate delivery date (3 days after order date)
  const calculateDeliveryDate = (baseDate) => {
    const delivery = new Date(baseDate);
    delivery.setDate(delivery.getDate() + 3);
    return delivery.toISOString().split('T')[0];
  };

  // Check if client exists
  const checkIfExistingClient = async (number) => {
    try {
      const res = await axios.get(`/api/check-client?phone=${number}`);
      if (res.data.exists) setClientType('Renewal');
    } catch (error) {
      console.error('Error checking client:', error);
    }
  };

  // Add new row
  const handleAddRow = () => {
    setRows(prev => [...prev, getEmptyRow()]);
  };

  // Handle row data changes
  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    // Calculate row total
    const qty = parseFloat(updated[index].quantity) || 0;
    const rate = parseFloat(updated[index].rate) || 0;
    updated[index].total = qty * rate;
    setRows(updated);

    // Calculate order total and balance
    const totalAmount = updated.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
    setTotal(totalAmount);
    updateBalance(totalAmount, advance);
  };

  // Update balance when advance or total changes
  const updateBalance = (orderTotal, advanceAmount) => {
    const adv = parseFloat(advanceAmount) || 0;
    const tot = parseFloat(orderTotal) || 0;
    setBalance(tot - adv);
  };

  // Handle advance payment change
  const handleAdvanceChange = (value) => {
    setAdvance(value);
    updateBalance(total, value);
  };

  // Handle payment method change
  const handlePaymentMethodChange = async (method) => {
    setPaymentMethod(method);
    if (method === 'UPI') {
      try {
        const res = await axios.get('/api/upi-numbers');
        setUpiOptions(res.data);
        setSelectedUpi('');
      } catch (err) {
        console.error('Error fetching UPI numbers:', err);
      }
    } else {
      setUpiOptions([]);
      setSelectedUpi('');
    }
  };

  // Submit target for the month
  const handleTargetSubmit = async () => {
    if (!target || isNaN(target)) {
      alert('Please enter a valid target number');
      return;
    }

    const date = new Date(orderDate);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    try {
      await axios.post('/api/set-target', {
        executive: selectedExecutive,
        target,
        month,
        year
      });
      setIsTargetSetForMonth(true);
      setCurrentTargetMonth(`${month}-${year}`);
      alert('Target set successfully for this month!');
    } catch (error) {
      console.error('Error setting target:', error);
      alert('Failed to set target');
    }
  };

  // Submit order
  const handleSubmit = async () => {
    const selectedExec = executives.find(e => e._id === selectedExecutive);
    const execName = selectedExec ? selectedExec.name : '';

    const orderData = {
      executive: execName,
      executiveId: selectedExecutive,
      business,
      contactPerson,
      contactCode: countryCode,
      phone,
      orderDate,
      target,
      clientType,
      rows: rows.map(row => ({
        requirement: row.requirement,
        description: row.description,
        quantity: row.quantity,
        rate: row.rate,
        total: row.total,
        deliveryDate: row.deliveryDate,
      })),
      advanceDate,
      paymentDate,
      paymentMethod: paymentMethod === 'UPI' ? `UPI - ${selectedUpi}` : paymentMethod,
      advance,
      balance,
      total,
      chequeNumber,
      chequeImage,
    };

    try {
      await axios.post('/api/submit', orderData);
      alert('Order submitted successfully!');
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to submit order.');
    }
  };

  // Print order
  const handlePrint = () => {
    const printContents = document.getElementById('print-area').innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="form-container">
      <div id="print-area">
        <h2 className="subtitle">ORDER FORM</h2>

        <div className="form-top">
          <div className="left">
            <label>Executive Name:
              <select 
                value={selectedExecutive} 
                onChange={handleExecutiveChange}
              >
                {executives.map(exec => (
                  <option key={exec._id} value={exec._id}>
                    {exec.name}
                  </option>
                ))}
              </select>
            </label>
            <label>Client Type:
              <select value={clientType} onChange={(e) => setClientType(e.target.value)}>
                <option value="">Select</option>
                <option value="New">New</option>
                <option value="Renewal">Renewal</option>
                <option value="Agent">Agent</option>
              </select>
            </label>
            <label>Business Name:
              <input type="text" value={business} onChange={(e) => setBusiness(e.target.value)} />
            </label>
            <label>Contact Person Name:
              <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </label>
          </div>

          <div className="right">
            <label>Order Date:
              <input
                type="date"
                value={orderDate}
                onChange={handleOrderDateChange}
              />
            </label>

            {isTargetSetForMonth ? (
              <div className="target-info">
                <label>Monthly Target:
                  <input
                    type="text"
                    value={target}
                    readOnly
                  />
                </label>
                <small>Target for {new Date(orderDate).toLocaleString('default', { month: 'long', year: 'numeric' })}</small>
              </div>
            ) : (
              <div className="target-input">
                <label>Set Monthly Target:
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Enter target amount"
                  />
                </label>
                <button onClick={handleTargetSubmit}>Set Target</button>
                <small>For {new Date(orderDate).toLocaleString('default', { month: 'long', year: 'numeric' })}</small>
              </div>
            )}

            <label>Contact Number:
              <div className="contact-inputs">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                  <option value="+91">IN (+91)</option>
                  <option value="+1">US (+1)</option>
                  <option value="+44">UK (+44)</option>
                  <option value="+971">UAE (+971)</option>
                  <option value="other">Other</option>
                </select>
                {countryCode === 'other' && (
                  <input
                    type="text"
                    placeholder="Code"
                    maxLength={5}
                    onChange={(e) => setCountryCode(e.target.value)}
                  />
                )}
                <input
                  type="text"
                  placeholder="Number"
                  value={phone}
                  maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d{0,10}$/.test(val)) {
                      setPhone(val);
                      if (val.length === 10) checkIfExistingClient(val);
                    }
                  }}
                />
              </div>
            </label>
          </div>
        </div>

        {/* Rest of the component remains the same */}
        <div className="rows-section">
          <table>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Total</th>
                <th>Delivery Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={row.requirement}
                      onChange={(e) => handleRowChange(index, 'requirement', e.target.value)}
                    >
                      <option value="">Select Requirement</option>
                      {requirements.map((req) => (
                        <option key={req._id} value={req.name}>
                          {req.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={row.rate}
                      onChange={(e) => handleRowChange(index, 'rate', e.target.value)}
                    />
                  </td>
                  <td>{row.total}</td>
                  <td>
                    <input
                      type="date"
                      value={row.deliveryDate}
                      onChange={(e) => handleRowChange(index, 'deliveryDate', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleAddRow}>+ Add Row</button>
        </div>

        <div className="summary-section">
          <div className="left-side">
            <label>Advance Date:
              <input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
              />
            </label>
            <label>Payment Date:
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </label>
          </div>

          <div className="right-side">
            <label>Advance:
              <input
                type="number"
                value={advance}
                onChange={(e) => handleAdvanceChange(e.target.value)}
              />
            </label>
            <label>Balance:
              <input type="number" value={balance} readOnly />
            </label>
          </div>
        </div>

        <div className="payment-method-section">
          <label>Payment Method:</label>
          <div className="payment-method-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={paymentMethod === 'Cash'}
                onChange={() => handlePaymentMethodChange('Cash')}
              />
              Cash
            </label>
            <label>
              <input
                type="checkbox"
                checked={paymentMethod === 'UPI'}
                onChange={() => handlePaymentMethodChange('UPI')}
              />
              UPI
            </label>
            <label>
              <input
                type="checkbox"
                checked={paymentMethod === 'Cheque'}
                onChange={() => handlePaymentMethodChange('Cheque')}
              />
              Cheque
            </label>
          </div>

          {paymentMethod === 'UPI' && (
            <div>
              <label>UPI ID:
                <select
                  value={selectedUpi}
                  onChange={(e) => setSelectedUpi(e.target.value)}
                >
                  <option value="">Select</option>
                  {upiOptions.map((upi) => (
                    <option key={upi} value={upi}>
                      {upi}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {paymentMethod === 'Cheque' && (
            <div>
              <label>Cheque Number:
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                />
              </label>
              <label>Upload Cheque Image:
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setChequeImage(e.target.files[0])}
                />
              </label>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button onClick={handleSubmit}>Submit Order</button>
          <button onClick={handlePrint}>Print Order</button>
        </div>
      </div>
    </div>
  );
}

export default CreateOrder;