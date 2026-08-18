import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Streamlined API service communicating with live Express / MongoDB backend
const apiService = {
  async fetchLeads(executiveName = '') {
    try {
      const execUser = executiveName || localStorage.getItem('userName') || 'Executive';
      const response = await axios.post('/api/leads/executive', { executiveName: execUser });
      return { data: response.data?.data || [], error: null };
    } catch (error) {
      console.error('Error fetching assigned leads:', error);
      return { data: [], error: error.message };
    }
  },

  async createLead(lead) {
    try {
      const currentUser = localStorage.getItem('userName') || 'Executive';
      const payload = {
        ...lead,
        assigned_to: currentUser,
        employee_name: currentUser,
        created_by: currentUser,
        call_status: 'pending'
      };
      const response = await axios.post('/api/leads/create', payload);
      return { data: response.data?.data || payload, error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  async updateLead(leadId, updates) {
    try {
      const response = await axios.put(`/api/leads/${leadId}`, updates);
      return { data: response.data?.data || updates, error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  async createCallLog(log) {
    try {
      const response = await axios.post('/api/call-logs', log);
      return { data: response.data, error: null };
    } catch (error) {
      return { error: error.message };
    }
  }
};

const TeleCRM = () => {
  const executiveName = localStorage.getItem('userName') || 'Executive';
  const executivePhone = localStorage.getItem('userPhone') || '';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('all');

  // Call & Recording State
  const [activeCall, setActiveCall] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Disposition Modal State
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [dispositionOutcome, setDispositionOutcome] = useState('callback'); // callback, sale, not_interested
  const [dispositionReason, setDispositionReason] = useState('Ringing - No Response');
  const [nextFollowup, setNextFollowup] = useState('');
  const [dispositionNotes, setDispositionNotes] = useState('');

  // Create Lead Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', company: '', email: '', notes: '' });
  const [createLoading, setCreateLoading] = useState(false);

  // Responsive screen tracking
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadAssignedLeads();
    
    // Default next followup to tomorrow
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    setNextFollowup(tom.toISOString().split('T')[0]);
  }, []);

  // Timer interval for active call
  useEffect(() => {
    let interval = null;
    if (activeCall) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const loadAssignedLeads = async () => {
    setLoading(true);
    const res = await apiService.fetchLeads(executiveName);
    setLeads(res.data || []);
    setLoading(false);
  };

  // Start Call & Automatic Recording
  const handleStartCall = async (lead) => {
    if (activeCall) {
      alert('A call is already in progress!');
      return;
    }

    setActiveCall(lead);
    setCallTimer(0);
    setRecordedAudioUrl('');

    // Request Mic & Start Recording FIRST before mobile OS switches apps
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Create local preview URL immediately
          const localUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(localUrl);

          // Attempt background upload to server
          const formData = new FormData();
          formData.append('file', audioBlob, `call_${executiveName}_${Date.now()}.webm`);
          try {
            const upRes = await axios.post('/api/upload', formData);
            if (upRes.data?.url) setRecordedAudioUrl(upRes.data.url);
          } catch (err) {
            console.log('Audio server upload fallback to blob URL:', err);
          }

          // Release microphone track
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start(1000); // Flush chunks every 1 second
        setIsRecording(true);
      } catch (err) {
        console.warn('Microphone permission denied or unavailable:', err);
        setIsRecording(false);
      }
    }

    // Delay dialer launch slightly to guarantee mobile browser initializes recording stream
    setTimeout(() => {
      window.location.href = `tel:${lead.phone}`;
    }, 600);
  };

  // End Call & Open Outcome Modal
  const handleEndCall = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setShowDispositionModal(true);
  };

  // Submit Disposition
  const handleSubmitDisposition = async () => {
    if (!activeCall) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const finalOutcome = isConnected ? dispositionOutcome : 'not_connected';
    const isFollowUpOutcome = finalOutcome === 'callback' || finalOutcome === 'not_connected';
    const followupTarget = isFollowUpOutcome ? (isConnected ? nextFollowup : (nextFollowup || tomorrowStr)) : '';

    const updates = {
      call_status: finalOutcome,
      status: finalOutcome === 'sale' ? 'sale' : (finalOutcome === 'not_interested' ? 'not_interested' : 'pending'),
      disposition_reason: isConnected ? '' : dispositionReason,
      next_followup_date: followupTarget,
      notes: dispositionNotes || `Call ${isConnected ? 'Connected' : 'Not Connected'}`,
      last_call_result: finalOutcome,
      total_call_duration: (activeCall.total_call_duration || 0) + callTimer,
      recording_url: recordedAudioUrl || activeCall.recording_url || ''
    };

    await apiService.updateLead(activeCall._id, updates);
    await apiService.createCallLog({
      lead_id: activeCall._id,
      executive_name: executiveName,
      executive_phone: executivePhone || 'N/A',
      client_phone: activeCall.phone,
      call_status: finalOutcome,
      call_duration: callTimer,
      notes: dispositionNotes || `Outcome: ${finalOutcome}`,
      recording_url: recordedAudioUrl || ''
    });

    // Reset Call State
    setShowDispositionModal(false);
    setActiveCall(null);
    setCallTimer(0);
    setRecordedAudioUrl('');
    setDispositionNotes('');
    
    // Refresh Queue
    loadAssignedLeads();
    alert('Call outcome saved! Rescheduled items will re-appear on their due dates.');
  };

  // Manual Lead Creation
  const handleCreateLeadSubmit = async (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) {
      alert('Name and Phone Number are required!');
      return;
    }
    setCreateLoading(true);
    await apiService.createLead(newLead);
    setNewLead({ name: '', phone: '', company: '', email: '', notes: '' });
    setShowCreateModal(false);
    setCreateLoading(false);
    loadAssignedLeads();
    alert('New lead added to your calling queue!');
  };

  // Helper formatting
  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Filtering leads queue
  const filteredLeads = leads.filter(l => {
    const matchQuery = l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone?.includes(searchQuery);
    const matchFilter = filterOutcome === 'all' ? true : (l.call_status === filterOutcome || l.status === filterOutcome);
    return matchQuery && matchFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'sale': return '#28a745';
      case 'not_interested': return '#dc3545';
      case 'callback': return '#ffc107';
      case 'connected': return '#17a2b8';
      case 'not_connected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ padding: isMobile ? '10px' : '25px', backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
        
        {/* Welcome Card */}
        <div style={{ backgroundColor: 'white', padding: isMobile ? '16px' : '25px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '19px' : '26px', fontWeight: '700', margin: '0 0 4px', color: '#2c3e50' }}>
              👋 Welcome, {executiveName}
            </h1>
            <p style={{ margin: 0, color: '#666', fontSize: isMobile ? '12px' : '14px' }}>
              Assigned Telecalling Leads Queue & Call Recorder
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            <div style={{ backgroundColor: '#f8f9fa', padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>{leads.length}</div>
              <div style={{ fontSize: '10px', color: '#777', textTransform: 'uppercase' }}>Active Leads</div>
            </div>

            <button 
              onClick={() => setShowCreateModal(true)}
              style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(52, 152, 219, 0.3)', whiteSpace: 'nowrap' }}
            >
              + Create Lead
            </button>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div style={{ backgroundColor: 'white', padding: isMobile ? '14px' : '18px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%' }}>
          <input 
            type="text" 
            placeholder="🔍 Search name or phone number..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', flex: isMobile ? 'none' : '1 1 250px', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
            <select 
              value={filterOutcome} 
              onChange={e => setFilterOutcome(e.target.value)}
              style={{ flex: isMobile ? '1 1 calc(65% - 4px)' : 'none', minWidth: '130px', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', outline: 'none', backgroundColor: 'white', color: '#2c3e50', boxSizing: 'border-box' }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Calls</option>
              <option value="callback">Follow-ups Today</option>
              <option value="not_connected">Not Connected</option>
            </select>

            <button 
              onClick={loadAssignedLeads}
              style={{ flex: isMobile ? '1 1 calc(35% - 4px)' : 'none', padding: '10px 12px', backgroundColor: '#ebf8ff', border: '1px solid #bee3f8', color: '#3182ce', borderRadius: '4px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box', whiteSpace: 'nowrap' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Leads List View (Responsive Mobile Cards vs Desktop Table) */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>Loading assigned leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '50px 15px', textAlign: 'center', borderRadius: '8px', border: '1px solid #e0e0e0', color: '#666', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 6px', color: '#2c3e50' }}>No Leads in Queue</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>You have caught up with all assigned calls today! Click "+ Create Lead" if you acquired a lead manually.</p>
          </div>
        ) : isMobile ? (
          /* Mobile Cards Layout */
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredLeads.map(lead => {
              const statusCol = getStatusColor(lead.call_status || lead.status);
              return (
                <div key={lead._id} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#2c3e50', wordBreak: 'break-word' }}>{lead.name}</h3>
                      <div style={{ fontSize: '12px', color: '#777' }}>{lead.company || 'Private Client'}</div>
                    </div>
                    <span style={{ color: statusCol, fontSize: '11px', fontWeight: '700', backgroundColor: statusCol + '15', padding: '3px 8px', borderRadius: '4px', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      {(lead.call_status || lead.status || 'pending').replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '15px', color: '#3498db', fontWeight: '700', fontFamily: 'monospace' }}>
                    📞 {lead.phone}
                  </div>

                  {lead.notes && (
                    <div style={{ fontSize: '12px', color: '#555', backgroundColor: '#f8f9fa', padding: '6px 10px', borderRadius: '4px', border: '1px solid #eee', wordBreak: 'break-word' }}>
                      📝 {lead.notes}
                    </div>
                  )}

                  {['callback', 'followup', 'follow-up'].includes((lead.call_status || lead.status || '').toLowerCase()) && lead.next_followup_date && (
                    <div style={{ fontSize: '12px', color: '#e67e22', fontWeight: '600' }}>
                      🔄 Follow-up: {lead.next_followup_date}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#888' }}>📅 {lead.Date}</span>

                    <button 
                      onClick={() => handleStartCall(lead)}
                      disabled={activeCall !== null}
                      style={{ backgroundColor: activeCall ? '#6c757d' : '#28a745', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '4px', fontWeight: '600', fontSize: '13px', cursor: activeCall ? 'not-allowed' : 'pointer', boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)', whiteSpace: 'nowrap' }}
                    >
                      📞 Call Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Table Layout */
          <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', color: '#2c3e50', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '14px 18px' }}>Date</th>
                  <th style={{ padding: '14px 18px' }}>Client Details</th>
                  <th style={{ padding: '14px 18px' }}>Phone Number</th>
                  <th style={{ padding: '14px 18px' }}>Current Status</th>
                  <th style={{ padding: '14px 18px' }}>Follow-up Date</th>
                  <th style={{ padding: '14px 18px' }}>Last Audio</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => {
                  const statusCol = getStatusColor(lead.call_status || lead.status);
                  return (
                    <tr key={lead._id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '14px 18px', color: '#666' }}>{lead.Date}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '600', color: '#2c3e50' }}>{lead.name}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>{lead.company || lead.email || 'Private Client'}</div>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#3498db', fontWeight: '600' }}>{lead.phone}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ color: statusCol, fontWeight: '600', backgroundColor: statusCol + '15', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', textTransform: 'capitalize' }}>
                          {(lead.call_status || lead.status || 'pending').replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#555' }}>
                        {['callback', 'followup', 'follow-up'].includes((lead.call_status || lead.status || '').toLowerCase()) && lead.next_followup_date ? lead.next_followup_date : '-'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {lead.recording_url ? (
                          <audio controls preload="none" style={{ height: '32px', width: '160px' }} src={lead.recording_url} />
                        ) : '-'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleStartCall(lead)}
                          disabled={activeCall !== null}
                          style={{ backgroundColor: activeCall ? '#6c757d' : '#28a745', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '4px', fontWeight: '600', fontSize: '13px', cursor: activeCall ? 'not-allowed' : 'pointer' }}
                        >
                          📞 Call Now
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

      {/* ACTIVE CALL BANNER MODAL */}
      {activeCall && (
        <div style={{ position: 'fixed', bottom: isMobile ? '10px' : '30px', right: isMobile ? '10px' : '30px', left: isMobile ? '10px' : 'auto', width: isMobile ? 'calc(100% - 20px)' : '380px', backgroundColor: 'white', border: '2px solid #3498db', borderRadius: '12px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 1000, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📱</span>
              <div>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Active Call</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#2c3e50' }}>{activeCall.name}</div>
              </div>
            </div>
            <div style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: '700', color: '#3498db', backgroundColor: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}>
              {formatTimer(callTimer)}
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#666', marginBottom: '14px', wordBreak: 'break-word' }}>
            Calling: <strong style={{ color: '#2c3e50' }}>{activeCall.phone}</strong>
          </div>

          {/* Recording indicator */}
          <div style={{ backgroundColor: isRecording ? '#fff5f5' : '#f8f9fa', border: isRecording ? '1px solid #fed7d7' : '1px solid #ddd', padding: '8px 12px', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isRecording ? '#e53e3e' : '#6c757d' }}></span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: isRecording ? '#e53e3e' : '#666' }}>
              {isRecording ? '🔴 Recording Mic Audio...' : '⏹ Mic Idle'}
            </span>
          </div>

          <button 
            onClick={handleEndCall}
            style={{ width: '100%', padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(220, 53, 69, 0.3)' }}
          >
            ⏹ End Call & Enter Outcome
          </button>
        </div>
      )}

      {/* POST-CALL DISPOSITION MODAL */}
      {showDispositionModal && activeCall && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', zIndex: 1100 }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '500px', borderRadius: '12px', border: '1px solid #ddd', padding: isMobile ? '16px' : '28px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
              📋 Call Outcome Disposition
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#666', wordBreak: 'break-word' }}>
              Record outcome for <strong>{activeCall.name} ({activeCall.phone})</strong>
            </p>

            {/* Step 1: Connected vs Not Connected */}
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '6px' }}>
              Was the call connected to the client?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <button 
                type="button"
                onClick={() => setIsConnected(true)}
                style={{ padding: '10px', borderRadius: '6px', border: isConnected ? '2px solid #28a745' : '1px solid #ddd', backgroundColor: isConnected ? '#d4edda' : '#f8f9fa', color: isConnected ? '#155724' : '#666', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                ✅ Connected
              </button>
              <button 
                type="button"
                onClick={() => setIsConnected(false)}
                style={{ padding: '10px', borderRadius: '6px', border: !isConnected ? '2px solid #dc3545' : '1px solid #ddd', backgroundColor: !isConnected ? '#f8d7da' : '#f8f9fa', color: !isConnected ? '#721c24' : '#666', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                ❌ Not Connected
              </button>
            </div>

            {/* Connected Fields */}
            {isConnected ? (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>
                    Result Outcome
                  </label>
                  <select 
                    value={dispositionOutcome}
                    onChange={e => setDispositionOutcome(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', backgroundColor: 'white', boxSizing: 'border-box' }}
                  >
                    <option value="callback">🔄 Next Follow-up / Interested</option>
                    <option value="sale">🎉 Closed Sale / Order Taken</option>
                    <option value="not_interested">🚫 Not Interested</option>
                  </select>
                </div>

                {dispositionOutcome === 'callback' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>
                      Next Follow-up Date
                    </label>
                    <input 
                      type="date"
                      value={nextFollowup}
                      onChange={e => setNextFollowup(e.target.value)}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </>
            ) : (
              /* Not Connected Fields */
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>
                    Reason Not Connected
                  </label>
                  <select 
                    value={dispositionReason}
                    onChange={e => setDispositionReason(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', backgroundColor: 'white', boxSizing: 'border-box' }}
                  >
                    <option value="Ringing - No Response">🔔 Ringing - No Response</option>
                    <option value="Busy / On Another Call">📱 Busy / On Another Call</option>
                    <option value="Switched Off / Unreachable">🔌 Switched Off / Unreachable</option>
                    <option value="Call Cut / Disconnected">✂️ Call Cut / Disconnected</option>
                    <option value="Invalid Number">🚫 Invalid Number</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>
                    Reschedule Call For Date
                  </label>
                  <input 
                    type="date"
                    value={nextFollowup}
                    onChange={e => setNextFollowup(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </>
            )}

            {/* Notes Textarea */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>
                Conversation Notes & Remarks
              </label>
              <textarea 
                rows="3"
                placeholder={isConnected ? "What did the client say? Specific requirements..." : "Add any remark..."}
                value={dispositionNotes}
                onChange={e => setDispositionNotes(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Automatic Recording Confirmation Status */}
            <div style={{ marginBottom: '16px', backgroundColor: recordedAudioUrl ? '#d4edda' : '#e8f4fd', padding: '12px', borderRadius: '6px', border: recordedAudioUrl ? '1px solid #c3e6cb' : '1px solid #b8daff', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: recordedAudioUrl ? '#155724' : '#004085' }}>
                {recordedAudioUrl ? "🎙️ Call Audio Automatically Recorded & Ready" : "🎙️ Audio Captured Automatically via CRM"}
              </div>
            </div>

            <button 
              onClick={handleSubmitDisposition}
              style={{ width: '100%', padding: '12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(52, 152, 219, 0.3)', boxSizing: 'border-box' }}
            >
              Save Outcome
            </button>
          </div>
        </div>
      )}

      {/* CREATE NEW LEAD MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', zIndex: 1100 }}>
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '450px', borderRadius: '12px', border: '1px solid #ddd', padding: isMobile ? '16px' : '28px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>+ Add Manual Lead</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateLeadSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>Client Name *</label>
                <input required type="text" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} placeholder="e.g. Rajesh Kumar" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>Phone Number *</label>
                <input required type="tel" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} placeholder="10-digit number" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>Company / City</label>
                <input type="text" value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} placeholder="Optional" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>Requirement Notes</label>
                <textarea rows="2" value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} placeholder="Source or specific interest..." style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <button disabled={createLoading} type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(40, 167, 69, 0.3)', boxSizing: 'border-box' }}>
                {createLoading ? 'Adding...' : 'Save Lead to My Queue'}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default TeleCRM;