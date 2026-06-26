import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';

const AdminLeadDistribution = () => {
  const [executives, setExecutives] = useState([]);
  const [selectedExecutives, setSelectedExecutives] = useState([]);
  const [fileData, setFileData] = useState([]);
  const [distributeMode, setDistributeMode] = useState('round_robin');
  const [singleExecutive, setSingleExecutive] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Database live overview state
  const [dbLeads, setDbLeads] = useState([]);
  const [filterExec, setFilterExec] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mobile screen detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchExecutives();
    fetchDatabaseLeads();
  }, []);

  const fetchExecutives = async () => {
    try {
      const res = await axios.get('/api/employees');
      const data = res.data || {};
      let activeExecs = [];
      Object.keys(data).forEach(role => {
        if (['Executive', 'FieldExecutive', 'Agent', 'Digital Marketing'].includes(role) || role.toLowerCase().includes('exec')) {
          data[role].forEach(emp => {
            if (emp && emp.name && emp.active !== false && !activeExecs.includes(emp.name)) {
              activeExecs.push(emp.name);
            }
          });
        }
      });
      if (activeExecs.length === 0) {
        activeExecs = ['Divya', 'Rahul', 'Pooja', 'Executive 1'];
      }
      setExecutives(activeExecs);
      setSelectedExecutives(activeExecs);
      if (activeExecs[0]) setSingleExecutive(activeExecs[0]);
    } catch (err) {
      console.error('Error fetching employees:', err);
      const fallback = ['Divya', 'Rahul', 'Pooja'];
      setExecutives(fallback);
      setSelectedExecutives(fallback);
      setSingleExecutive(fallback[0]);
    }
  };

  const fetchDatabaseLeads = async () => {
    try {
      const res = await axios.post('/api/leads', { filterStatus: 'all' });
      setDbLeads(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching database leads:', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          alert('No rows found in Excel sheet');
          return;
        }

        const today = new Date().toLocaleDateString('en-GB');

        const parsed = json.map((row) => {
          const name = row.Name || row.name || row.NAME || row['Customer Name'] || row['Client Name'] || 'Unknown Client';
          const phone = String(row.Phone || row.phone || row.PHONE || row['Phone Number'] || row['Contact'] || row['Mobile'] || '');
          const company = row.Company || row.company || row.COMPANY || row['Company Name'] || '';
          const email = row.Email || row.email || row.EMAIL || '';
          const notes = row.Notes || row.notes || row.NOTES || row['Remarks'] || '';

          return {
            Date: row.Date || today,
            name,
            phone,
            company,
            email,
            notes,
            source: 'Excel Bulk Import'
          };
        }).filter(r => r.phone && r.phone.trim() !== '');

        setFileData(parsed);
      } catch (err) {
        alert('Error parsing Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleToggleExec = (exec) => {
    setSelectedExecutives(prev => 
      prev.includes(exec) ? prev.filter(e => e !== exec) : [...prev, exec]
    );
  };

  const handleSelectAll = () => {
    if (selectedExecutives.length === executives.length) {
      setSelectedExecutives([]);
    } else {
      setSelectedExecutives([...executives]);
    }
  };

  const handleDistributeAndSubmit = async () => {
    if (fileData.length === 0) {
      alert('Please select and load an Excel sheet first');
      return;
    }

    if (distributeMode === 'round_robin' && selectedExecutives.length === 0) {
      alert('Please select at least one active executive for Round Robin distribution');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        leads: fileData,
        distributeMode,
        selectedExecutives: distributeMode === 'single' ? [singleExecutive] : selectedExecutives
      };

      const res = await axios.post('/api/leads/distribute', payload);
      alert(`Successfully imported and distributed ${res.data?.count || fileData.length} leads!`);
      setFileData([]);
      fetchDatabaseLeads();
    } catch (err) {
      alert('Error distributing leads: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await axios.delete(`/api/leads/${id}`);
      setDbLeads(prev => prev.filter(l => l._id !== id));
      alert('Lead deleted successfully');
    } catch (err) {
      alert('Error deleting lead: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL telecalling leads from database?')) return;
    try {
      await axios.delete('/api/leads/clear');
      setDbLeads([]);
      alert('All leads cleared successfully');
    } catch (err) {
      alert('Error clearing leads: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredDbLeads = dbLeads.filter(l => {
    const matchExec = filterExec ? (l.assigned_to === filterExec || l.employee_name === filterExec) : true;
    const matchStatus = filterStatus === 'all' ? true : (l.call_status === filterStatus || l.status === filterStatus);
    return matchExec && matchStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'sale': return '#28a745';
      case 'not_interested': return '#dc3545';
      case 'callback': return '#3182ce';
      case 'connected': return '#319795';
      case 'not_connected': return '#e53e3e';
      default: return '#718096';
    }
  };

  return (
    <div style={{ padding: isMobile ? '12px' : '25px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ color: '#1a202c', fontSize: isMobile ? '20px' : '26px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>📞</span> Telecalling Lead Distribution
        </h1>
        <p style={{ color: '#4a5568', fontSize: isMobile ? '13px' : '15px', marginBottom: '20px' }}>
          Import bulk Excel leads and distribute them automatically among telecalling executives.
        </p>

        {/* Upload & Distribution Panel */}
        <div style={{ background: '#fff', padding: isMobile ? '16px' : '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
          <h2 style={{ fontSize: isMobile ? '16px' : '18px', marginBottom: '16px', color: '#2d3748', borderBottom: '1px solid #edf2f7', paddingBottom: '10px' }}>
            1. Upload & Configure Distribution
          </h2>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '18px', marginBottom: '16px' }}>
            <div style={{ flex: 1, width: '100%' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: '#4a5568' }}>
                Select Excel Sheet (.xlsx / .csv)
              </label>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                style={{ display: 'block', width: '100%', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', padding: '10px', border: '2px dashed #cbd5e0', borderRadius: '8px', background: '#f7fafc', cursor: 'pointer', color: '#4a5568', fontSize: '12px', boxSizing: 'border-box' }}
              />
              {fileData.length > 0 && (
                <div style={{ marginTop: '8px', color: '#2b6cb0', fontWeight: '600', fontSize: '13px' }}>
                  ✅ Loaded {fileData.length} valid lead rows
                </div>
              )}
            </div>

            <div style={{ flex: 1, width: '100%' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: '#4a5568' }}>
                Distribution Method
              </label>
              <select 
                value={distributeMode}
                onChange={(e) => setDistributeMode(e.target.value)}
                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '14px', color: '#2d3748', background: '#fff', boxSizing: 'border-box' }}
              >
                <option value="round_robin">🔄 Round Robin (Distribute equally)</option>
                <option value="single">👤 Assign ALL leads to Single Executive</option>
                <option value="keep">📑 Keep As Is (Use employee name from sheet)</option>
              </select>
            </div>
          </div>

          {/* ULTRA COMPACT SCROLLABLE ACTIVE EXECUTIVES SELECTOR */}
          {distributeMode === 'round_robin' && (
            <div style={{ marginTop: '16px', border: '1px solid #cbd5e0', borderRadius: '8px', background: '#f7fafc', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: '600', fontSize: '13px', color: '#2d3748' }}>
                  🎯 Target Active Executives ({selectedExecutives.length}/{executives.length} selected)
                </span>
                <button 
                  type="button"
                  onClick={handleSelectAll}
                  style={{ background: 'none', border: 'none', color: '#3182ce', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}
                >
                  {selectedExecutives.length === executives.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ maxHeight: '110px', overflowY: 'auto', padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#fff' }}>
                {executives.map(exec => {
                  const isChecked = selectedExecutives.includes(exec);
                  return (
                    <label key={exec} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: isChecked ? '#ebf8ff' : '#f8f9fa', padding: '5px 10px', borderRadius: '6px', border: isChecked ? '1px solid #bee3f8' : '1px solid #e2e8f0', cursor: 'pointer', userSelect: 'none', fontSize: '12px', color: isChecked ? '#2b6cb0' : '#4a5568', fontWeight: isChecked ? '600' : '400', transition: 'all 0.15s' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => handleToggleExec(exec)}
                        style={{ accentColor: '#3182ce', margin: 0, cursor: 'pointer' }}
                      />
                      <span>{exec}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {distributeMode === 'single' && (
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: '#4a5568' }}>Select Target Executive</label>
              <select 
                value={singleExecutive} 
                onChange={(e) => setSingleExecutive(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '100%', maxWidth: '300px', color: '#2d3748', background: '#fff', fontSize: '14px' }}
              >
                {executives.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>
          )}

          {/* Preview View: Mobile Cards vs Desktop Table */}
          {fileData.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#4a5568' }}>Previewing First 5 Allocation Matches:</h3>
              
              {isMobile ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {fileData.slice(0, 5).map((row, i) => {
                    let target = distributeMode === 'round_robin' ? (selectedExecutives[i % selectedExecutives.length] || 'Unassigned') : (distributeMode === 'single' ? singleExecutive : 'From Sheet');
                    return (
                      <div key={i} style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                          <span>{row.name}</span>
                          <span style={{ color: '#2b6cb0' }}>🎯 {target}</span>
                        </div>
                        <div style={{ color: '#4a5568', fontFamily: 'monospace' }}>📞 {row.phone}</div>
                        {row.company && <div style={{ color: '#718096', fontSize: '12px', marginTop: '2px' }}>🏢 {row.company}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#edf2f7', textAlign: 'left', color: '#2d3748' }}>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Name</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Phone</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Company</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0' }}>Target Assignment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileData.slice(0, 5).map((row, i) => {
                        let target = distributeMode === 'round_robin' ? (selectedExecutives[i % selectedExecutives.length] || 'Unassigned') : (distributeMode === 'single' ? singleExecutive : 'From Sheet');
                        return (
                          <tr key={i}>
                            <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', color: '#2d3748' }}>{row.name}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', color: '#2d3748' }}>{row.phone}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', color: '#2d3748' }}>{row.company || '-'}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: '600', color: '#2b6cb0' }}>{target}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleDistributeAndSubmit}
              disabled={loading || fileData.length === 0}
              style={{
                width: isMobile ? '100%' : 'auto',
                background: fileData.length > 0 ? '#319795' : '#a0aec0',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '15px',
                cursor: fileData.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: fileData.length > 0 ? '0 4px 6px rgba(49, 151, 149, 0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Processing...' : `🚀 Distribute & Save ${fileData.length} Leads`}
            </button>
          </div>
        </div>

        {/* Live Database Overview Panel */}
        <div style={{ background: '#fff', padding: isMobile ? '16px' : '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
          
          {/* Header & Filter Bar */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '18px', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: isMobile ? '16px' : '18px', color: '#2d3748', margin: '0 0 4px' }}>
                2. Database Leads ({filteredDbLeads.length})
              </h2>
              <span style={{ fontSize: '12px', color: '#718096' }}>Live calling records in server database</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              <select value={filterExec} onChange={e => setFilterExec(e.target.value)} style={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', color: '#2d3748', background: '#fff', fontSize: '13px' }}>
                <option value="">All Execs</option>
                {executives.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>

              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0', color: '#2d3748', background: '#fff', fontSize: '13px' }}>
                <option value="all">All Outcomes</option>
                <option value="pending">Pending</option>
                <option value="connected">Connected</option>
                <option value="not_connected">Not Connected</option>
                <option value="callback">Callback</option>
                <option value="sale">Sale</option>
              </select>

              <button onClick={fetchDatabaseLeads} style={{ flex: isMobile ? '1 1 auto' : 'none', padding: '8px 12px', background: '#ebf8ff', color: '#3182ce', border: '1px solid #bee3f8', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>
                🔄 Refresh
              </button>

              {dbLeads.length > 0 && (
                <button onClick={handleClearAll} style={{ flex: isMobile ? '1 1 auto' : 'none', padding: '8px 12px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>
                  🗑️ Clear DB
                </button>
              )}
            </div>
          </div>

          {filteredDbLeads.length === 0 ? (
            <div style={{ padding: '40px 10px', textAlign: 'center', color: '#a0aec0', fontSize: '14px' }}>
              No telecalling leads found matching criteria.
            </div>
          ) : isMobile ? (
            /* MOBILE RESPONSIVE CARDS VIEW FOR DATABASE LEADS (NO TABLE) */
            <div style={{ display: 'grid', gap: '12px' }}>
              {filteredDbLeads.map(lead => {
                const statusCol = getStatusColor(lead.call_status || lead.status);
                return (
                  <div key={lead._id} style={{ padding: '14px', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: '#2d3748', fontSize: '15px' }}>{lead.name}</div>
                        <div style={{ fontSize: '13px', color: '#2b6cb0', fontFamily: 'monospace', fontWeight: '600' }}>📞 {lead.phone}</div>
                      </div>
                      <span style={{ color: statusCol, fontWeight: '700', fontSize: '11px', background: statusCol + '15', padding: '3px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                        {(lead.call_status || lead.status || 'pending').replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#4a5568', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                      <span>👤 <strong>{lead.assigned_to || lead.employee_name || 'Unassigned'}</strong></span>
                      <span>•</span>
                      <span>📅 {lead.Date}</span>
                      {lead.next_followup_date && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#3182ce' }}>🔄 Followup: {lead.next_followup_date}</span>
                        </>
                      )}
                    </div>

                    {lead.disposition_reason && (
                      <div style={{ fontSize: '12px', color: '#e53e3e', background: '#fff5f5', padding: '4px 8px', borderRadius: '4px' }}>
                        Remarks: {lead.disposition_reason}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #edf2f7', paddingTop: '8px' }}>
                      {lead.recording_url ? (
                        <audio controls preload="none" style={{ height: '30px', maxWidth: '160px' }} src={lead.recording_url} />
                      ) : <span style={{ fontSize: '12px', color: '#a0aec0' }}>No Audio</span>}

                      <button 
                        onClick={() => handleDeleteLead(lead._id)}
                        style={{ padding: '4px 10px', background: '#fff5f5', border: '1px solid #fed7d7', color: '#e53e3e', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DESKTOP TABLE VIEW */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f7fafc', textAlign: 'left', borderBottom: '2px solid #edf2f7', color: '#4a5568' }}>
                    <th style={{ padding: '12px' }}>Date</th>
                    <th style={{ padding: '12px' }}>Client Name</th>
                    <th style={{ padding: '12px' }}>Phone</th>
                    <th style={{ padding: '12px' }}>Assigned Executive</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Reschedule / Follow-up</th>
                    <th style={{ padding: '12px' }}>Recording</th>
                    <th style={{ padding: '12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDbLeads.map(lead => {
                    const statusColor = getStatusColor(lead.call_status || lead.status);
                    return (
                      <tr key={lead._id} style={{ borderBottom: '1px solid #edf2f7' }}>
                        <td style={{ padding: '12px', color: '#718096' }}>{lead.Date}</td>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#2d3748' }}>{lead.name}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#2b6cb0', fontWeight: '600' }}>{lead.phone}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: '#edf2f7', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#4a5568' }}>
                            {lead.assigned_to || lead.employee_name || 'Unassigned'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: statusColor, fontWeight: '600', textTransform: 'capitalize' }}>
                            {(lead.call_status || lead.status || 'pending').replace('_', ' ')}
                          </span>
                          {lead.disposition_reason && (
                            <div style={{ fontSize: '11px', color: '#a0aec0' }}>({lead.disposition_reason})</div>
                          )}
                        </td>
                        <td style={{ padding: '12px', color: '#4a5568' }}>
                          {lead.next_followup_date || '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {lead.recording_url ? (
                            <audio controls preload="none" style={{ height: '32px', width: '160px' }} src={lead.recording_url} />
                          ) : '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button onClick={() => handleDeleteLead(lead._id)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
                            ×
                          </button>
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
    </div>
  );
};

export default AdminLeadDistribution;
