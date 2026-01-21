import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// Mock API service with localStorage for persistence
const apiService = {
  // Campaign operations
  async fetchCampaigns() {
    try {
      const campaigns = JSON.parse(localStorage.getItem('telecrm_campaigns') || '[]');
      return { data: campaigns, error: null };
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return { data: [], error: error.message };
    }
  },

  async createCampaign(campaign) {
    try {
      const campaigns = JSON.parse(localStorage.getItem('telecrm_campaigns') || '[]');
      const newCampaign = {
        ...campaign,
        _id: 'campaign_' + Date.now(),
        createdAt: new Date().toISOString(),
        leadsCount: 0,
        salesCount: 0
      };
      campaigns.push(newCampaign);
      localStorage.setItem('telecrm_campaigns', JSON.stringify(campaigns));
      return { data: newCampaign, error: null };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return { error: error.message };
    }
  },

  async updateCampaign(campaignId, updates) {
    try {
      const campaigns = JSON.parse(localStorage.getItem('telecrm_campaigns') || '[]');
      const index = campaigns.findIndex(c => c._id === campaignId);
      if (index !== -1) {
        campaigns[index] = { ...campaigns[index], ...updates };
        localStorage.setItem('telecrm_campaigns', JSON.stringify(campaigns));
        return { data: campaigns[index], error: null };
      }
      return { error: 'Campaign not found' };
    } catch (error) {
      console.error('Error updating campaign:', error);
      return { error: error.message };
    }
  },

  // Lead operations
  async fetchLeads(filterStatus = 'all', month = '', year = '', campaignId = '') {
    try {
      const leads = JSON.parse(localStorage.getItem('telecrm_leads') || '[]');

      let filteredLeads = leads;

      // Filter by campaign
      if (campaignId) {
        filteredLeads = filteredLeads.filter(lead => lead.campaign_id === campaignId);
      }

      // Filter by status
      if (filterStatus !== 'all') {
        filteredLeads = filteredLeads.filter(lead => lead.status === filterStatus);
      }

      // Filter by month/year
      if (month || year) {
        filteredLeads = filteredLeads.filter(lead => {
          if (!lead.Date) return true;

          const dateParts = lead.Date.split('/');
          if (dateParts.length !== 3) return true;

          const leadMonth = dateParts[1];
          const leadYear = dateParts[2];

          if (month && leadMonth !== month) return false;
          if (year && leadYear !== year) return false;

          return true;
        });
      }

      return { data: filteredLeads, error: null };
    } catch (error) {
      console.error('Error fetching leads:', error);
      return { data: [], error: error.message };
    }
  },

  async createLead(lead) {
    try {
      const leads = JSON.parse(localStorage.getItem('telecrm_leads') || '[]');
      const newLead = {
        ...lead,
        _id: 'lead_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        last_call_result: '',
        total_call_duration: 0
      };
      leads.push(newLead);
      localStorage.setItem('telecrm_leads', JSON.stringify(leads));

      // Update campaign stats
      if (lead.campaign_id) {
        const campaigns = JSON.parse(localStorage.getItem('telecrm_campaigns') || '[]');
        const campaignIndex = campaigns.findIndex(c => c._id === lead.campaign_id);
        if (campaignIndex !== -1) {
          campaigns[campaignIndex].leadsCount = (campaigns[campaignIndex].leadsCount || 0) + 1;
          localStorage.setItem('telecrm_campaigns', JSON.stringify(campaigns));
        }
      }

      return { data: newLead, error: null };
    } catch (error) {
      console.error('Error creating lead:', error);
      return { error: error.message };
    }
  },

  async updateLead(leadId, updates) {
    try {
      const leads = JSON.parse(localStorage.getItem('telecrm_leads') || '[]');
      const index = leads.findIndex(l => l._id === leadId);
      if (index !== -1) {
        const oldStatus = leads[index].status;
        leads[index] = {
          ...leads[index],
          ...updates,
          updatedAt: new Date().toISOString(),
          last_called_at: new Date().toISOString()
        };

        // Update total call duration
        if (updates.call_end_duration) {
          leads[index].total_call_duration = (leads[index].total_call_duration || 0) + updates.call_end_duration;
        }

        // Update last call result
        if (updates.status) {
          leads[index].last_call_result = updates.status;
        }

        // Update campaign stats if status changed to sale
        if (updates.status === 'sale' && oldStatus !== 'sale' && leads[index].campaign_id) {
          const campaigns = JSON.parse(localStorage.getItem('telecrm_campaigns') || '[]');
          const campaignIndex = campaigns.findIndex(c => c._id === leads[index].campaign_id);
          if (campaignIndex !== -1) {
            campaigns[campaignIndex].salesCount = (campaigns[campaignIndex].salesCount || 0) + 1;
            localStorage.setItem('telecrm_campaigns', JSON.stringify(campaigns));
          }
        }

        localStorage.setItem('telecrm_leads', JSON.stringify(leads));
        return { data: leads[index], error: null };
      }
      return { error: 'Lead not found' };
    } catch (error) {
      console.error('Error updating lead:', error);
      return { error: error.message };
    }
  },

  async bulkInsertLeads(leads) {
    try {
      const existingLeads = JSON.parse(localStorage.getItem('telecrm_leads') || '[]');
      const newLeads = leads.map(lead => ({
        ...lead,
        _id: 'lead_' + Date.now() + Math.random(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        last_call_result: '',
        total_call_duration: 0
      }));

      const allLeads = [...existingLeads, ...newLeads];
      localStorage.setItem('telecrm_leads', JSON.stringify(allLeads));

      // Update campaign stats
      const campaignId = leads[0]?.campaign_id;
      if (campaignId) {
        const campaigns = JSON.parse(localStorage.getItem('telecrm_campaigns') || '[]');
        const campaignIndex = campaigns.findIndex(c => c._id === campaignId);
        if (campaignIndex !== -1) {
          campaigns[campaignIndex].leadsCount = (campaigns[campaignIndex].leadsCount || 0) + leads.length;
          localStorage.setItem('telecrm_campaigns', JSON.stringify(campaigns));
        }
      }

      return { data: newLeads, error: null };
    } catch (error) {
      console.error('Error bulk inserting leads:', error);
      return { error: error.message };
    }
  },

  // Call log operations
  async createCallLog(callLog) {
    try {
      const callLogs = JSON.parse(localStorage.getItem('telecrm_calllogs') || '[]');
      const newCallLog = {
        ...callLog,
        _id: 'calllog_' + Date.now(),
        createdAt: new Date().toISOString()
      };
      callLogs.push(newCallLog);
      localStorage.setItem('telecrm_calllogs', JSON.stringify(callLogs));
      return { data: newCallLog, error: null };
    } catch (error) {
      console.error('Error creating call log:', error);
      return { error: error.message };
    }
  },

  async fetchCallLogs() {
    try {
      const callLogs = JSON.parse(localStorage.getItem('telecrm_calllogs') || '[]');
      return { data: callLogs, error: null };
    } catch (error) {
      console.error('Error fetching call logs:', error);
      return { data: [], error: error.message };
    }
  },

  // Break system operations
  async startBreak(executiveName, executivePhone, breakType, reason = '') {
    try {
      const breaks = JSON.parse(localStorage.getItem('telecrm_breaks') || '[]');
      const newBreak = {
        _id: 'break_' + Date.now(),
        executive_name: executiveName,
        executive_phone: executivePhone,
        break_type: breakType,
        reason: reason,
        start_time: new Date().toISOString(),
        end_time: null,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      breaks.push(newBreak);
      localStorage.setItem('telecrm_breaks', JSON.stringify(breaks));
      
      // Update executive status
      await this.updateExecutiveStatus(executiveName, executivePhone, 'on_break');
      
      return { data: newBreak, error: null };
    } catch (error) {
      console.error('Error starting break:', error);
      return { error: error.message };
    }
  },

  async endBreak(breakId) {
    try {
      const breaks = JSON.parse(localStorage.getItem('telecrm_breaks') || '[]');
      const index = breaks.findIndex(b => b._id === breakId);
      if (index !== -1) {
        const breakRecord = breaks[index];
        breaks[index] = {
          ...breakRecord,
          end_time: new Date().toISOString(),
          status: 'ended',
          duration: Math.floor((new Date() - new Date(breakRecord.start_time)) / 1000)
        };
        localStorage.setItem('telecrm_breaks', JSON.stringify(breaks));
        
        // Update executive status
        await this.updateExecutiveStatus(
          breakRecord.executive_name, 
          breakRecord.executive_phone, 
          'active'
        );
        
        return { data: breaks[index], error: null };
      }
      return { error: 'Break not found' };
    } catch (error) {
      console.error('Error ending break:', error);
      return { error: error.message };
    }
  },

  async fetchBreaks(executiveName = '', date = '', status = '') {
    try {
      const breaks = JSON.parse(localStorage.getItem('telecrm_breaks') || '[]');
      
      let filteredBreaks = breaks;
      
      if (executiveName) {
        filteredBreaks = filteredBreaks.filter(b => 
          b.executive_name?.toLowerCase().includes(executiveName.toLowerCase())
        );
      }
      
      if (date) {
        filteredBreaks = filteredBreaks.filter(b => 
          b.createdAt?.includes(date)
        );
      }
      
      if (status) {
        filteredBreaks = filteredBreaks.filter(b => b.status === status);
      }
      
      // Calculate duration for active breaks
      filteredBreaks = filteredBreaks.map(breakRecord => {
        if (breakRecord.status === 'active' && breakRecord.start_time) {
          const duration = Math.floor((new Date() - new Date(breakRecord.start_time)) / 1000);
          return { ...breakRecord, duration };
        }
        return breakRecord;
      });
      
      return { data: filteredBreaks, error: null };
    } catch (error) {
      console.error('Error fetching breaks:', error);
      return { data: [], error: error.message };
    }
  },

  async updateExecutiveStatus(executiveName, executivePhone, status) {
    try {
      const executives = JSON.parse(localStorage.getItem('telecrm_executives') || '[]');
      const index = executives.findIndex(e => 
        e.name === executiveName && e.phone === executivePhone
      );
      
      if (index !== -1) {
        executives[index] = {
          ...executives[index],
          status: status,
          last_updated: new Date().toISOString()
        };
      } else {
        executives.push({
          name: executiveName,
          phone: executivePhone,
          status: status,
          last_updated: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
      
      localStorage.setItem('telecrm_executives', JSON.stringify(executives));
      return { data: executives[index] || executives[executives.length - 1], error: null };
    } catch (error) {
      console.error('Error updating executive status:', error);
      return { error: error.message };
    }
  },

  async fetchExecutiveStatus(executiveName = '') {
    try {
      const executives = JSON.parse(localStorage.getItem('telecrm_executives') || '[]');
      
      if (executiveName) {
        const executive = executives.find(e => 
          e.name?.toLowerCase().includes(executiveName.toLowerCase())
        );
        return { data: executive || null, error: null };
      }
      
      return { data: executives, error: null };
    } catch (error) {
      console.error('Error fetching executive status:', error);
      return { data: [], error: error.message };
    }
  },

  async fetchNextLead(campaignId, executiveName) {
    try {
      const leads = JSON.parse(localStorage.getItem('telecrm_leads') || '[]');
      
      // Filter leads by campaign and pending status
      const pendingLeads = leads.filter(lead => 
        lead.campaign_id === campaignId && 
        lead.status === 'pending' &&
        (!lead.assigned_to || lead.assigned_to === executiveName)
      );
      
      // Sort by creation date (oldest first)
      pendingLeads.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Get the next lead
      const nextLead = pendingLeads[0];
      
      if (nextLead) {
        // Mark as assigned
        const leadIndex = leads.findIndex(l => l._id === nextLead._id);
        if (leadIndex !== -1) {
          leads[leadIndex] = {
            ...leads[leadIndex],
            assigned_to: executiveName,
            assigned_at: new Date().toISOString()
          };
          localStorage.setItem('telecrm_leads', JSON.stringify(leads));
        }
      }
      
      return { data: nextLead || null, error: null };
    } catch (error) {
      console.error('Error fetching next lead:', error);
      return { error: error.message };
    }
  }
};

// Initialize sample data if empty
const initializeSampleData = () => {
  if (!localStorage.getItem('telecrm_campaigns')) {
    const sampleCampaigns = [
      {
        _id: 'campaign_1',
        name: 'Facebook Ads Campaign',
        description: 'Social media leads from Facebook',
        status: 'active',
        createdAt: new Date().toISOString(),
        leadsCount: 25,
        salesCount: 5
      },
      {
        _id: 'campaign_2',
        name: 'Google Search Leads',
        description: 'Organic search traffic leads',
        status: 'active',
        createdAt: new Date().toISOString(),
        leadsCount: 18,
        salesCount: 3
      },
      {
        _id: 'campaign_3',
        name: 'Email Marketing',
        description: 'Newsletter subscription leads',
        status: 'paused',
        createdAt: new Date().toISOString(),
        leadsCount: 12,
        salesCount: 2
      }
    ];
    localStorage.setItem('telecrm_campaigns', JSON.stringify(sampleCampaigns));
  }

  if (!localStorage.getItem('telecrm_leads')) {
    const sampleLeads = [
      {
        _id: 'lead_1',
        Date: '15/01/2026',
        name: 'John Smith',
        phone: '9876543210',
        email: 'john@example.com',
        company: 'Tech Corp',
        source: 'Facebook',
        campaign_id: 'campaign_1',
        campaign_name: 'Facebook Ads Campaign',
        employee_name: 'Divya',
        status: 'pending',
        notes: 'Interested in product demo',
        last_call_result: '',
        total_call_duration: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: 'lead_2',
        Date: '14/01/2026',
        name: 'Sarah Johnson',
        phone: '8765432109',
        email: 'sarah@example.com',
        company: 'Marketing Inc',
        source: 'Google',
        campaign_id: 'campaign_2',
        campaign_name: 'Google Search Leads',
        employee_name: 'Divya',
        status: 'sale',
        last_call_result: 'sale',
        total_call_duration: 180,
        notes: 'Purchased premium package',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        call_end_duration: 180,
        last_called_at: new Date().toISOString()
      }
    ];
    localStorage.setItem('telecrm_leads', JSON.stringify(sampleLeads));
  }
};

// Break System Component
const BreakSystem = ({ executiveName, executivePhone, onBreakStatusChange }) => {
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakType, setBreakType] = useState('short');
  const [breakReason, setBreakReason] = useState('');
  const [activeBreak, setActiveBreak] = useState(null);
  const [breakDuration, setBreakDuration] = useState(0);
  const [executiveStatus, setExecutiveStatus] = useState('active');

  useEffect(() => {
    checkExecutiveStatus();
    fetchActiveBreak();
  }, [executiveName, executivePhone]);

  useEffect(() => {
    let interval;
    if (activeBreak && activeBreak.status === 'active') {
      interval = setInterval(() => {
        const duration = Math.floor((new Date() - new Date(activeBreak.start_time)) / 1000);
        setBreakDuration(duration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeBreak]);

  const checkExecutiveStatus = async () => {
    if (!executiveName || !executivePhone) return;
    
    const result = await apiService.fetchExecutiveStatus(executiveName);
    if (result.data) {
      setExecutiveStatus(result.data.status || 'active');
      onBreakStatusChange?.(result.data.status || 'active');
    }
  };

  const fetchActiveBreak = async () => {
    if (!executiveName || !executivePhone) return;
    
    const result = await apiService.fetchBreaks(executiveName, '', 'active');
    if (result.data && result.data.length > 0) {
      setActiveBreak(result.data[0]);
      const duration = Math.floor((new Date() - new Date(result.data[0].start_time)) / 1000);
      setBreakDuration(duration);
    }
  };

  const handleStartBreak = async () => {
    if (!executiveName || !executivePhone) {
      alert('Please enter your name and phone number first');
      return;
    }

    if (breakType === 'custom' && !breakReason.trim()) {
      alert('Please specify the reason for your break');
      return;
    }

    const result = await apiService.startBreak(
      executiveName, 
      executivePhone, 
      breakType,
      breakReason
    );

    if (result.error) {
      alert('Error starting break: ' + result.error);
    } else {
      setActiveBreak(result.data);
      setBreakDuration(0);
      setShowBreakModal(false);
      setBreakType('short');
      setBreakReason('');
      setExecutiveStatus('on_break');
      onBreakStatusChange?.('on_break');
      alert('Break started successfully!');
    }
  };

  const handleEndBreak = async () => {
    if (!activeBreak) return;

    const result = await apiService.endBreak(activeBreak._id);
    if (result.error) {
      alert('Error ending break: ' + result.error);
    } else {
      setActiveBreak(null);
      setBreakDuration(0);
      setExecutiveStatus('active');
      onBreakStatusChange?.('active');
      alert('Break ended successfully!');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Break Status Banner */}
      {activeBreak && executiveStatus === 'on_break' && (
        <div style={{
          backgroundColor: '#ffc107',
          color: '#856404',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '5px' }}>
              ⏸️ On Break
            </div>
            <div style={{ fontSize: '14px' }}>
              Type: <span style={{ fontWeight: '500' }}>{activeBreak.break_type}</span>
              {activeBreak.reason && ` • Reason: ${activeBreak.reason}`}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
              Duration: {formatDuration(breakDuration)}
            </div>
          </div>
          <button
            onClick={handleEndBreak}
            style={{
              padding: '8px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            End Break
          </button>
        </div>
      )}

      {/* Break Button */}
      {!activeBreak && executiveStatus === 'active' && (
        <button
          onClick={() => setShowBreakModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ffc107',
            color: '#856404',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⏸️ Take a Break
        </button>
      )}

      {/* Break Modal */}
      {showBreakModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>
              Take a Break
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>Break Type *</label>
              <select
                value={breakType}
                onChange={(e) => setBreakType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="short">Short Break (5-10 mins)</option>
                <option value="lunch">Lunch Break (30-60 mins)</option>
                <option value="meeting">Meeting</option>
                <option value="training">Training</option>
                <option value="custom">Custom Break</option>
              </select>
            </div>

            {breakType === 'custom' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>Reason *</label>
                <input
                  type="text"
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  placeholder="Specify reason for break"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowBreakModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartBreak}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffc107',
                  color: '#856404',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Start Break
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Auto Call System Component
const AutoCallSystem = ({
  executiveName,
  executivePhone,
  selectedCampaign,
  onCallInitiated,
  isOnBreak
}) => {
  const [autoCallEnabled, setAutoCallEnabled] = useState(false);
  const [nextLead, setNextLead] = useState(null);
  const [callInterval, setCallInterval] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (autoCallEnabled && !isOnBreak && selectedCampaign) {
      fetchNextLeadForAutoCall();
    } else {
      setNextLead(null);
    }
  }, [autoCallEnabled, selectedCampaign, isOnBreak]);

  const fetchNextLeadForAutoCall = async () => {
    if (!executiveName || !selectedCampaign || isOnBreak) return;

    setIsLoading(true);
    const result = await apiService.fetchNextLead(selectedCampaign, executiveName);
    
    if (result.error) {
      console.error('Error fetching next lead:', result.error);
      setNextLead(null);
      if (autoCallEnabled) {
        setTimeout(fetchNextLeadForAutoCall, 10000);
      }
    } else {
      setNextLead(result.data);
      
      if (result.data && autoCallEnabled) {
        setTimeout(() => {
          initiateAutoCall(result.data);
        }, callInterval * 1000);
      }
    }
    setIsLoading(false);
  };

  const initiateAutoCall = (lead) => {
    if (!lead || isOnBreak) return;

    window.location.href = `tel:${lead.phone}`;
    onCallInitiated?.(lead);
    
    setTimeout(() => {
      if (autoCallEnabled) {
        fetchNextLeadForAutoCall();
      }
    }, 5000);
  };

  const handleToggleAutoCall = () => {
    if (!executiveName || !executivePhone) {
      alert('Please enter your name and phone number first');
      return;
    }

    if (!selectedCampaign) {
      alert('Please select a campaign first');
      return;
    }

    if (isOnBreak) {
      alert('You cannot start auto-call while on break');
      return;
    }

    if (autoCallEnabled) {
      setAutoCallEnabled(false);
      setNextLead(null);
      alert('Auto-call system stopped');
    } else {
      setAutoCallEnabled(true);
      alert('Auto-call system started. Next lead will be called automatically.');
    }
  };

  const handleManualNextCall = () => {
    if (!autoCallEnabled) {
      alert('Please enable auto-call system first');
      return;
    }

    if (isOnBreak) {
      alert('You cannot make calls while on break');
      return;
    }

    fetchNextLeadForAutoCall();
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h4 style={{ margin: 0, color: '#2c3e50' }}>Auto Call System</h4>
        <button
          onClick={handleToggleAutoCall}
          disabled={isOnBreak}
          style={{
            padding: '8px 20px',
            backgroundColor: autoCallEnabled ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isOnBreak ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: isOnBreak ? 0.6 : 1
          }}
        >
          {autoCallEnabled ? '⏹️ Stop Auto Call' : '▶️ Start Auto Call'}
        </button>
      </div>

      {isOnBreak && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ Auto-call system paused while on break
        </div>
      )}

      {autoCallEnabled && (
        <>
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#666'
            }}>
              Call Interval (seconds)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={callInterval}
              onChange={(e) => setCallInterval(parseInt(e.target.value) || 30)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {nextLead ? (
            <div style={{
              backgroundColor: '#e7f3ff',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '15px'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Next Lead:
              </div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#2c3e50' }}>
                {nextLead.name}
              </div>
              <div style={{ fontSize: '14px', color: '#3498db', marginBottom: '10px' }}>
                {nextLead.phone}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Calling in: {callInterval} seconds
              </div>
            </div>
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Searching for next lead...
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              No pending leads found for auto-call
            </div>
          )}

          <button
            onClick={handleManualNextCall}
            disabled={isLoading || isOnBreak}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading || isOnBreak ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isLoading || isOnBreak ? 0.6 : 1
            }}
          >
            {isLoading ? 'Loading...' : 'Call Next Lead Now'}
          </button>
        </>
      )}

      {!autoCallEnabled && !isOnBreak && (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          Enable auto-call to automatically call leads one by one
        </div>
      )}
    </div>
  );
};

function TeleCRM() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    status: 'active'
  });
  const [hidePaused, setHidePaused] = useState(false);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executiveName, setExecutiveName] = useState('');
  const [executivePhone, setExecutivePhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [callResult, setCallResult] = useState('completed');
  const [callDuration, setCallDuration] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [showImportResults, setShowImportResults] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLead, setNewLead] = useState({
    Date: '',
    name: '',
    phone: '',
    email: '',
    company: '',
    source: 'Manual',
    campaign_id: '',
    status: 'pending',
    notes: ''
  });
  const [activeCall, setActiveCall] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [showCampaigns, setShowCampaigns] = useState(true);
  const [viewMode, setViewMode] = useState('campaigns');
  const [callInProgress, setCallInProgress] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [showAutoCallSystem, setShowAutoCallSystem] = useState(false);

  // Generate months and years for filters
  const months = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = [
    { value: '', label: 'All Years' },
    { value: currentYear.toString(), label: currentYear.toString() },
    { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() }
  ];

  // Timer for active call
  useEffect(() => {
    let interval;
    if (callInProgress && callStartTime) {
      interval = setInterval(() => {
        const seconds = Math.floor((new Date() - callStartTime) / 1000);
        setCallTimer(seconds);
        setCallDuration(seconds.toString());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callInProgress, callStartTime]);

  useEffect(() => {
    initializeSampleData();
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchLeads();
    }
  }, [filterStatus, monthFilter, yearFilter, selectedCampaign]);

  // Set default date for new lead
  useEffect(() => {
    const today = new Date();
    const defaultDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    setNewLead(prev => ({ ...prev, Date: defaultDate }));

    // Auto-select first active campaign if available
    if (campaigns.length > 0 && !selectedCampaign) {
      const activeCampaign = campaigns.find(c => c.status === 'active');
      if (activeCampaign) {
        setSelectedCampaign(activeCampaign._id);
        setNewLead(prev => ({ ...prev, campaign_id: activeCampaign._id }));
      }
    }
  }, [campaigns]);

  const fetchCampaigns = async () => {
    try {
      const result = await apiService.fetchCampaigns();
      if (result.error) {
        console.error('Error fetching campaigns:', result.error);
      } else {
        setCampaigns(result.data || []);
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  };

  const fetchLeads = async () => {
    if (!selectedCampaign) return;

    setLoading(true);
    try {
      const result = await apiService.fetchLeads(filterStatus, monthFilter, yearFilter, selectedCampaign);
      if (result.error) {
        console.error('Error fetching leads:', result.error);
      } else {
        setLeads(result.data || []);
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
    setLoading(false);
  };

  // Check if a lead already exists
  const checkExistingLead = (phone) => {
    return leads.find(lead => lead.phone === phone && lead.campaign_id === selectedCampaign);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      if (typeof dateString === 'string' && dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${day}/${month}/${year}`;
        }
      }
      return dateString;
    } catch (error) {
      return dateString;
    }
  };

  // Create new campaign
  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      alert('Campaign name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.createCampaign(newCampaign);

      if (result.error) {
        alert('Error creating campaign: ' + result.error);
      } else {
        alert('Campaign created successfully!');
        setShowCreateCampaign(false);
        setNewCampaign({
          name: '',
          description: '',
          status: 'active'
        });
        fetchCampaigns();

        // Auto-select the newly created campaign
        if (result.data && result.data._id) {
          setSelectedCampaign(result.data._id);
          setNewLead(prev => ({ ...prev, campaign_id: result.data._id }));
        }
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  // Toggle campaign status
  const handleToggleCampaign = async (campaignId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const result = await apiService.updateCampaign(campaignId, { status: newStatus });

    if (result.error) {
      alert('Error updating campaign: ' + result.error);
    } else {
      fetchCampaigns();
      if (selectedCampaign === campaignId && newStatus === 'paused') {
        setSelectedCampaign('');
      }
    }
  };

  // Import leads from Excel
  const handleImportFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!executiveName.trim()) {
      alert('Please enter your name before importing leads');
      e.target.value = '';
      return;
    }

    if (!selectedCampaign) {
      alert('Please select a campaign before importing leads');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert('No data found in Excel file');
          return;
        }

        setLoading(true);

        const leadsToInsert = [];
        const duplicateLeads = [];

        // Get today's date in DD/MM/YYYY format for default
        const today = new Date();
        const defaultDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        // Get selected campaign name
        const selectedCampaignData = campaigns.find(c => c._id === selectedCampaign);
        const campaignName = selectedCampaignData ? selectedCampaignData.name : 'Imported Campaign';

        for (const row of jsonData) {
          const name = row.Name || row.name || row.NAME || row['Customer Name'] || row['Client Name'] || 'Unknown';
          const phone = String(row.Phone || row.phone || row.PHONE || row['Phone Number'] || row['Contact'] || row['Mobile'] || '');
          const company = row.Company || row.company || row.COMPANY || row['Company Name'] || row['Business'] || '';
          const email = row.Email || row.email || row.EMAIL || row['Email Address'] || '';

          let date = defaultDate;
          if (row.Date && isValidDate(row.Date)) {
            date = formatDate(row.Date);
          }

          if (!name || name === 'Unknown') {
            throw new Error(`Row ${jsonData.indexOf(row) + 2}: Name is required`);
          }
          if (!phone) {
            throw new Error(`Row ${jsonData.indexOf(row) + 2}: Phone number is required`);
          }

          const leadData = {
            Date: date,
            name: name,
            phone: phone,
            email: email,
            company: company,
            source: 'Excel Import',
            campaign_id: selectedCampaign,
            campaign_name: campaignName,
            employee_name: executiveName,
            status: 'pending',
            notes: '',
            last_call_result: '',
            total_call_duration: 0
          };

          const existingLead = checkExistingLead(phone);
          if (existingLead) {
            duplicateLeads.push(leadData);
          } else {
            leadsToInsert.push(leadData);
          }
        }

        let result;
        if (leadsToInsert.length > 0) {
          result = await apiService.bulkInsertLeads(leadsToInsert);
        }

        setImportResults({
          total: jsonData.length,
          inserted: leadsToInsert.length,
          duplicates: duplicateLeads.length,
          duplicateLeads: duplicateLeads,
          campaign: campaignName
        });
        setShowImportResults(true);

        if (result && result.error) {
          alert('Error importing leads: ' + result.error);
        } else {
          if (leadsToInsert.length > 0) {
            fetchLeads();
          }
        }

        e.target.value = '';
      } catch (err) {
        alert('Error reading file: ' + err.message);
      }
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Helper function to validate date format
  const isValidDate = (dateString) => {
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!dateRegex.test(dateString)) return false;

    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (year < 1000 || year > 3000 || month === 0 || month > 12) return false;

    const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) {
      monthLength[1] = 29;
    }

    return day > 0 && day <= monthLength[month - 1];
  };

  // Add manual lead
  const handleAddLead = async () => {
    if (!newLead.name || !newLead.phone) {
      alert('Name and Phone are required fields');
      return;
    }

    if (!isValidDate(newLead.Date)) {
      alert('Please enter a valid date in DD/MM/YYYY format');
      return;
    }

    if (!newLead.campaign_id) {
      alert('Please select a campaign');
      return;
    }

    setLoading(true);
    try {
      const selectedCampaignData = campaigns.find(c => c._id === newLead.campaign_id);
      const campaignName = selectedCampaignData ? selectedCampaignData.name : '';

      const leadData = {
        ...newLead,
        campaign_name: campaignName,
        employee_name: executiveName,
        last_call_result: '',
        total_call_duration: 0
      };

      const result = await apiService.createLead(leadData);

      if (result.error) {
        alert('Error creating lead: ' + result.error);
      } else {
        alert('Lead added successfully!');
        setShowAddLeadModal(false);
        setNewLead({
          Date: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
          name: '',
          phone: '',
          email: '',
          company: '',
          source: 'Manual',
          campaign_id: selectedCampaign,
          status: 'pending',
          notes: ''
        });
        fetchLeads();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleCallClick = (lead) => {
    if (!executivePhone.trim()) {
      alert('Please enter your phone number first');
      return;
    }
    
    if (isOnBreak) {
      alert('You cannot make calls while on break');
      return;
    }
    
    setSelectedLead(lead);
    setShowCallModal(true);
  };

  const handleInitiateCall = () => {
    if (!selectedLead) return;

    setCallInProgress(true);
    setCallStartTime(new Date());
    setCallTimer(0);

    // Open phone dialer
    window.location.href = `tel:${selectedLead.phone}`;

    // Show active call UI
    setActiveCall({
      lead: selectedLead,
      startTime: new Date()
    });

    setShowCallModal(false);
  };

  const handleEndCall = async () => {
    if (!selectedLead) return;

    try {
      let duration = callTimer;
      if (callDuration && !callInProgress) {
        duration = parseInt(callDuration) || 0;
      }

      // Create call log
      await apiService.createCallLog({
        lead_id: selectedLead._id,
        executive_name: executiveName,
        executive_phone: executivePhone,
        client_phone: selectedLead.phone,
        call_status: callResult,
        call_end_duration: duration,
        notes: `Call ${callResult}. Duration: ${duration} seconds`
      });

      const statusMap = {
        'completed': 'pending',
        'sale': 'sale',
        'not_interested': 'not_interested',
        'callback': 'callback',
        'no_answer': 'no_answer'
      };

      const updateResult = await apiService.updateLead(selectedLead._id, {
        status: statusMap[callResult] || 'pending',
        call_end_duration: duration,
        last_call_result: callResult
      });

      if (updateResult.error) {
        alert('Error updating status: ' + updateResult.error);
      }

      // Reset call state
      setCallInProgress(false);
      setCallResult('completed');
      setCallDuration('');
      setSelectedLead(null);
      setActiveCall(null);
      setCallStartTime(null);
      setCallTimer(0);

      fetchLeads();

      alert(`Call completed! Status: ${callResult}. Duration: ${duration} seconds`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    setLoading(true);
    const result = await apiService.updateLead(leadId, {
      status: newStatus,
      last_call_result: newStatus === 'sale' ? 'sale' : 'completed'
    });

    if (result.error) {
      alert('Error updating status: ' + result.error);
    } else {
      fetchLeads();
    }
    setLoading(false);
  };

  const handleNotesChange = async (leadId, notes) => {
    await apiService.updateLead(leadId, {
      notes: notes,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffa500',
      sale: '#28a745',
      not_interested: '#dc3545',
      callback: '#17a2b8',
      no_answer: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const getCallResultColor = (result) => {
    const colors = {
      'completed': '#6c757d',
      'sale': '#28a745',
      'not_interested': '#dc3545',
      'callback': '#17a2b8',
      'no_answer': '#ffa500'
    };
    return colors[result] || '#6c757d';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(campaignSearch.toLowerCase());
    const matchesHidePaused = hidePaused ? campaign.status === 'active' : true;
    return matchesSearch && matchesHidePaused;
  });

  const selectedCampaignData = campaigns.find(c => c._id === selectedCampaign);

  const stats = {
    total: leads.length,
    pending: leads.filter(l => l.status === 'pending').length,
    sale: leads.filter(l => l.status === 'sale').length,
    notInterested: leads.filter(l => l.status === 'not_interested').length,
    callback: leads.filter(l => l.status === 'callback').length,
    noAnswer: leads.filter(l => l.status === 'no_answer').length
  };

  const handleAutoCallInitiated = (lead) => {
    setSelectedLead(lead);
    setCallInProgress(true);
    setCallStartTime(new Date());
    setCallTimer(0);
    setActiveCall({
      lead: lead,
      startTime: new Date()
    });
  };

  const handleBreakStatusChange = (status) => {
    setIsOnBreak(status === 'on_break');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Active Call Banner */}
      {callInProgress && activeCall && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#28a745',
          color: 'white',
          padding: '15px 20px',
          zIndex: 1001,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              📞 On Call with {activeCall.lead.name}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {activeCall.lead.phone} • Duration: {formatTimer(callTimer)}
            </div>
          </div>
          <button
            onClick={() => {
              setShowCallModal(true);
              setCallInProgress(false);
            }}
            style={{
              padding: '8px 20px',
              backgroundColor: 'white',
              color: '#28a745',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            End Call
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginTop: callInProgress ? '60px' : '0'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>📞 Tele CRM</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              Campaign & Lead Management System
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setViewMode('campaigns')}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === 'campaigns' ? '#3498db' : '#4a6572',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Campaigns
            </button>
            <button
              onClick={() => setViewMode('leads')}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === 'leads' ? '#3498db' : '#4a6572',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Leads
            </button>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Executive Info Bar */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>Executive Name</label>
            <input
              type="text"
              value={executiveName}
              onChange={(e) => setExecutiveName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>Your Phone Number</label>
            <input
              type="tel"
              value={executivePhone}
              onChange={(e) => setExecutivePhone(e.target.value)}
              placeholder="e.g., 8019771538"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Break System */}
        <BreakSystem 
          executiveName={executiveName}
          executivePhone={executivePhone}
          onBreakStatusChange={handleBreakStatusChange}
        />

        {/* Auto Call System - Only show in leads view when campaign is selected */}
        {viewMode === 'leads' && selectedCampaign && (
          <AutoCallSystem
            executiveName={executiveName}
            executivePhone={executivePhone}
            selectedCampaign={selectedCampaign}
            onCallInitiated={handleAutoCallInitiated}
            isOnBreak={isOnBreak}
          />
        )}

        {/* Campaigns View */}
        {viewMode === 'campaigns' && (
          <>
            {/* Campaign Header */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '50px'
            }}>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px"
                }}
              >
                {/* Search Input with Icon */}
                <div
                  style={{
                    position: "relative",
                    width: "300px"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "14px",
                      color: "#999"
                    }}
                  >
                    🔍
                  </span>

                  <input
                    type="text"
                    placeholder="Search Campaign"
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 32px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  />
                </div>

                {/* Create Campaign Button */}
                <button
                  onClick={() => setShowCreateCampaign(true)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    whiteSpace: "nowrap"
                  }}
                >
                  <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
                  Create Campaign
                </button>
              </div>

            </div>

            {/* Campaign Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign._id}
                  style={{
                    backgroundColor: 'white',
                    border: selectedCampaign === campaign._id ? '2px solid #3498db' : '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                  onClick={() => {
                    setSelectedCampaign(campaign._id);
                    setViewMode('leads');
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                        {campaign.name}
                      </h3>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        backgroundColor: campaign.status === 'active' ? '#d4edda' : '#fff3cd',
                        color: campaign.status === 'active' ? '#155724' : '#856404',
                        borderRadius: '12px',
                        fontSize: '12px',
                        marginTop: '5px'
                      }}>
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCampaign(campaign._id, campaign.status);
                      }}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: campaign.status === 'active' ? '#ffc107' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {campaign.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                  </div>

                  <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                    {campaign.description || 'No description'}
                  </p>

                  <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#666' }}>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '8px',
                      borderRadius: '4px',
                      flex: 1,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#3498db' }}>
                        {campaign.leadsCount || 0}
                      </div>
                      <div>Leads</div>
                    </div>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '8px',
                      borderRadius: '4px',
                      flex: 1,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#28a745' }}>
                        {campaign.salesCount || 0}
                      </div>
                      <div>Sales</div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredCampaigns.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px',
                  color: '#999'
                }}>
                  No campaigns found. Create your first campaign!
                </div>
              )}
            </div>
          </>
        )}

        {/* Leads View */}
        {viewMode === 'leads' && (
          <>
            {/* Leads Header */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <button
                    onClick={() => setViewMode('campaigns')}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: 'transparent',
                      color: '#3498db',
                      border: '1px solid #3498db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ← Back
                  </button>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>
                    {selectedCampaignData ? selectedCampaignData.name : 'Select a Campaign'}
                  </h2>
                  {selectedCampaignData && (
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: selectedCampaignData.status === 'active' ? '#d4edda' : '#fff3cd',
                      color: selectedCampaignData.status === 'active' ? '#155724' : '#856404',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {selectedCampaignData.status.toUpperCase()}
                    </span>
                  )}
                </div>
                {selectedCampaignData && (
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    {selectedCampaignData.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    if (!selectedCampaign) {
                      alert('Please select a campaign first');
                      return;
                    }
                    setShowAddLeadModal(true);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>+</span> Add Lead
                </button>

                <button
                  onClick={() => {
                    if (!selectedCampaign) {
                      alert('Please select a campaign first');
                      return;
                    }
                    document.getElementById('importExcelInput').click();
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  📊 Import Excel
                </button>

                <input
                  id="importExcelInput"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportFromExcel}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#2c3e50' }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Total Leads</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffa500' }}>
                  {stats.pending}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Pending</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#28a745' }}>
                  {stats.sale}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Sales</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc3545' }}>
                  {stats.notInterested}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Not Interested</div>
              </div>
            </div>

            {/* Filters */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Leads</option>
                  <option value="pending">Pending</option>
                  <option value="sale">Sale</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="callback">Callback</option>
                  <option value="no_answer">No Answer</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>Date Filters</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {years.map(year => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Leads Table */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Loading leads...
                </div>
              ) : !selectedCampaign ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Please select a campaign to view leads
                </div>
              ) : leads.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                  No leads found for this campaign. Add leads manually or import from Excel.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>Date</th>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>Name</th>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>Phone</th>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>Email</th>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>Status</th>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>Last Call Result</th>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>Total Duration</th>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, index) => (
                        <tr key={lead._id} style={{
                          backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                          borderBottom: '1px solid #f0f0f0'
                        }}>
                          <td style={{ padding: '12px 15px', color: '#666' }}>
                            {formatDate(lead.Date)}
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <div style={{ fontWeight: '500', color: '#2c3e50' }}>{lead.name}</div>
                            <div style={{ fontSize: '12px', color: '#999' }}>{lead.company || '-'}</div>
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <div style={{ color: '#3498db', fontWeight: '500' }}>{lead.phone}</div>
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <div style={{ color: '#666' }}>{lead.email || '-'}</div>
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                              style={{
                                padding: '6px 10px',
                                border: `2px solid ${getStatusColor(lead.status)}`,
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                color: getStatusColor(lead.status),
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="sale">Sale</option>
                              <option value="not_interested">Not Interested</option>
                              <option value="callback">Callback</option>
                              <option value="no_answer">No Answer</option>
                            </select>
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            {lead.last_call_result ? (
                              <span style={{
                                padding: '4px 8px',
                                backgroundColor: getCallResultColor(lead.last_call_result) + '20',
                                color: getCallResultColor(lead.last_call_result),
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                textTransform: 'capitalize'
                              }}>
                                {lead.last_call_result.replace('_', ' ')}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '12px 15px', color: '#666', fontWeight: '500' }}>
                            {formatDuration(lead.total_call_duration)}
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <button
                              onClick={() => handleCallClick(lead)}
                              disabled={callInProgress || isOnBreak}
                              style={{
                                padding: '8px 15px',
                                backgroundColor: callInProgress || isOnBreak ? '#6c757d' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: callInProgress || isOnBreak ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                opacity: callInProgress || isOnBreak ? 0.6 : 1
                              }}
                            >
                              📞 Call
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Create New Campaign</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>Campaign Name *</label>
              <input
                type="text"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="Enter campaign name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>Description</label>
              <textarea
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                placeholder="Enter campaign description"
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>Status</label>
              <select
                value={newCampaign.status}
                onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateCampaign(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Add New Lead</h2>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>Campaign *</label>
              <select
                value={newLead.campaign_id}
                onChange={(e) => setNewLead({ ...newLead, campaign_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                required
              >
                <option value="">Select Campaign</option>
                {campaigns.filter(c => c.status === 'active').map(campaign => (
                  <option key={campaign._id} value={campaign._id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>Date (DD/MM/YYYY) *</label>
                <input
                  type="text"
                  value={newLead.Date}
                  onChange={(e) => setNewLead({ ...newLead, Date: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Manual">Manual</option>
                  <option value="Google">Google</option>
                  <option value="Referral">Referral</option>
                  <option value="Website">Website</option>
                  <option value="IndiaMart">Indian Mart</option>
                  <option value="Just Dial">Just Dial </option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>Name *</label>
              <input
                type="text"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Client name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>Phone *</label>
                <input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="Phone number"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>Email</label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="Email address"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>Company</label>
              <input
                type="text"
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                placeholder="Company name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddLeadModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddLead}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Adding...' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && selectedLead && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>
              {callInProgress ? 'Call in Progress' : 'Call Information'}
            </h2>

            <div style={{
              backgroundColor: '#f0f8ff',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>Client</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#2c3e50' }}>{selectedLead.name}</div>
                <div style={{ fontSize: '14px', color: '#3498db' }}>{selectedLead.phone}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Executive</div>
                <div style={{ fontSize: '14px', color: '#2c3e50' }}>{executiveName} ({executivePhone})</div>
              </div>
            </div>

            {callInProgress && (
              <div style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>Call Duration</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>{formatTimer(callTimer)}</div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '500',
                color: '#2c3e50'
              }}>Call Result</label>
              <select
                value={callResult}
                onChange={(e) => setCallResult(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="completed">Completed</option>
                <option value="sale">Sale</option>
                <option value="not_interested">Not Interested</option>
                <option value="callback">Callback</option>
                <option value="no_answer">No Answer</option>
              </select>
            </div>

            {!callInProgress && (
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#2c3e50'
                }}>Call Duration (seconds)</label>
                <input
                  type="number"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  placeholder="Enter duration in seconds"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              {!callInProgress ? (
                <button
                  onClick={handleInitiateCall}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  📞 Start Call
                </button>
              ) : null}

              <button
                onClick={handleEndCall}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: callInProgress ? '#dc3545' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {callInProgress ? 'End Call Now' : 'End Call'}
              </button>
            </div>

            <button
              onClick={() => {
                setShowCallModal(false);
                if (callInProgress) {
                  setCallInProgress(false);
                }
              }}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginTop: '10px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import Results Modal */}
      {showImportResults && importResults && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Import Results</h2>

            <div style={{
              backgroundColor: '#f0f8ff',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>Campaign: {importResults.campaign}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Total Records</div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>{importResults.total}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>New Leads</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745' }}>{importResults.inserted}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Duplicates</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#ffc107' }}>{importResults.duplicates}</div>
                </div>
              </div>
            </div>

            {importResults.duplicates > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#ffc107', marginBottom: '10px' }}>Duplicate Leads Found:</div>
                <div style={{
                  maxHeight: '150px',
                  overflow: 'auto',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  padding: '10px',
                  backgroundColor: '#fffcf3'
                }}>
                  {importResults.duplicateLeads.map((dup, index) => (
                    <div key={index} style={{
                      padding: '8px',
                      borderBottom: index < importResults.duplicateLeads.length - 1 ? '1px solid #eee' : 'none',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: '500' }}>{dup.name}</div>
                      <div style={{ color: '#666' }}>{dup.phone} • {dup.company || 'No company'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowImportResults(false)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeleCRM;