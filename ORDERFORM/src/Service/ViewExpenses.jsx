import React, { useEffect, useState } from 'react';

export default function ViewExpenses() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const styles = {
    container: { maxWidth: 1200, margin: '18px auto', padding: 18, border: '1px solid #e6e6e6', borderRadius: 8, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 },
    btn: { padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    table: { width: '100%', minWidth: '900px', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px 10px', borderBottom: '2px solid #ddd', background:"blue" },
    td: { padding: '12px 10px', borderBottom: '1px solid #f2f2f2' },
    summaryContainer: { display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '12px 16px', background: '#f8f8f8', borderRadius: 6 },
    summaryItem: { fontWeight: 'bold', fontSize: 16 }
  };

  const monthNames = [
    { num: 1, name: 'January' }, { num: 2, name: 'February' }, { num: 3, name: 'March' },
    { num: 4, name: 'April' }, { num: 5, name: 'May' }, { num: 6, name: 'June' },
    { num: 7, name: 'July' }, { num: 8, name: 'August' }, { num: 9, name: 'September' },
    { num: 10, name: 'October' }, { num: 11, name: 'November' }, { num: 12, name: 'December' }
  ];

  const yearOptions = [];
  for (let y = 2020; y <= today.getFullYear() + 2; y++) {
    yearOptions.push(y);
  }

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function fetchExpenses() {
    setLoading(true);
    setError('');
    try {
      const monthStr = String(month).padStart(2, '0');
      const res = await fetch(`/api/expenses?month=${year}-${monthStr}`);
      if (!res.ok) throw new Error('No data found for this period.');
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setExpenses([]);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(d) {
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString();
  }

  function calculateTotals() {
    const income = expenses
      .filter(e => e.type === 'in')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const expensesTotal = expenses
      .filter(e => e.type === 'out')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const net = income - expensesTotal;
    
    return {
      income,
      expensesTotal,
      net,
      isProfit: net >= 0
    };
  }

  function downloadCSV() {
    if (!expenses.length) return;
    const headers = ['Date', 'Type', 'Amount', 'Category', 'Description'];
    const rows = expenses.map(e => [e.date, e.type, e.amount, e.category || '', (e.description || '').replace(/\n/g, ' ')]);
    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = calculateTotals();

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {monthNames.map(m => <option key={m.num} value={m.num}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchExpenses} style={{ ...styles.btn, background: '#1976d2', color: '#fff' }}>{loading ? 'Loading...' : 'Refresh'}</button>
          <button onClick={downloadCSV} style={{ ...styles.btn, background: '#2e7d32', color: '#fff' }}>Download CSV</button>
        </div>
      </div>

      {error && <div style={{ color: '#b00020', marginBottom: 8 }}>{error}</div>}

      <div style={styles.summaryContainer}>
        <div style={{ ...styles.summaryItem, color: 'green' }}>
          Total Income: ₹ {totals.income.toFixed(2)}
        </div>
        <div style={{ ...styles.summaryItem, color: 'red' }}>
          Total Expenses: ₹ {totals.expensesTotal.toFixed(2)}
        </div>
        <div style={{ ...styles.summaryItem, color: totals.isProfit ? 'green' : 'red' }}>
          Net: ₹ {Math.abs(totals.net).toFixed(2)} ({totals.isProfit ? 'Profit' : 'Loss'})
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 18 }}>No records found.</td></tr>
            )}
            {expenses.map((e) => (
              <tr key={e._id || `${e.date}-${Math.random()}`}>
                <td style={styles.td}>{formatDate(e.date)}</td>
                <td style={styles.td}>{e.type === 'in' ? 'Income' : 'Expense'}</td>
                <td style={styles.td}>{e.category}</td>
                <td style={styles.td}>{e.description}</td>
                <td style={{ ...styles.td, color: e.type === 'in' ? 'green' : 'red', fontWeight: 'bold' }}>
                  {e.type === 'in' ? '+' : '-'}₹{Number(e.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}