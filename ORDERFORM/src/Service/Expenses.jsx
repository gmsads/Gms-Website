import React, { useState } from 'react';

export default function ExpensesForm({ onSaved }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'out',
    amount: '',
    category: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successPopup, setSuccessPopup] = useState(false);

  const styles = {
    container: { maxWidth: 700, margin: '20px auto', padding: 18, border: '1px solid #e3e3e3', borderRadius: 8, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    row: { display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' },
    label: { width: 140, fontSize: 14, fontWeight: 'bold' },
    input: { flex: 1, padding: '8px 10px', fontSize: 14, borderRadius: 4, border: '1px solid #ccc' },
    select: { flex: 1, padding: '8px 10px', fontSize: 14, borderRadius: 4, border: '1px solid #ccc', fontWeight: 'bold' },
    textarea: { width: '100%', padding: 10, fontSize: 14, borderRadius: 4, border: '1px solid #ccc' },
    btn: { padding: '10px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    primary: { background: '#1976d2', color: '#fff' },
    danger: { background: '#e53935', color: '#fff' },
    popup: {
      position: 'center',
      top: 20,
      right: 20,
      background: '#4caf50',
      color: '#fff',
      padding: '16px 20px', // bigger padding
      fontSize: '18px', // bigger text
      fontWeight: 'bold', // stronger emphasis
      borderRadius: 5,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-out'
    }
    
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.date || !form.amount || Number.isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Please enter a valid date and positive amount.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount)
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Show popup
      setSuccessPopup(true);
      setTimeout(() => setSuccessPopup(false), 5000); // hide after 3s

      setForm(prev => ({ ...prev, amount: '', category: '', description: '' }));
      if (onSaved) onSaved(data);
    } catch (err) {
      console.error(err);
      setError(typeof err === 'string' ? err : (err.message || 'Failed to save entry'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {successPopup && <div style={styles.popup}>✅ Entry saved successfully!</div>}

      <div style={styles.container}>
        <h3 style={{ marginTop: 0 }}>Add Income / Expense</h3>
        {error && <div style={{ color: '#b00020', marginBottom: 8 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          
          <div style={styles.row}>
            <div style={styles.label}>Date</div>
            <input type="date" name="date" value={form.date} onChange={handleChange} style={styles.input} />
          </div>

          <div style={styles.row}>
            <div style={styles.label}>Transaction Type</div>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              style={{
                ...styles.select,
                color: form.type === 'in' ? 'green' : 'red'
              }}
            >
              <option value="in" style={{ color: 'green' }}>Income (Profit)</option>
              <option value="out" style={{ color: 'red' }}>Expense (Loss)</option>
            </select>
          </div>

          <div style={styles.row}>
            <div style={styles.label}>Amount</div>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.label}>Category</div>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. Travel, Supplies"
              style={styles.input}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 'bold' }}>Description</div>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              style={styles.textarea}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ ...styles.btn, ...styles.primary }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
            <button
              type="button"
              style={{ ...styles.btn, ...styles.danger }}
              onClick={() => setForm({
                date: new Date().toISOString().slice(0, 10),
                type: 'out',
                amount: '',
                category: '',
                description: ''
              })}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
