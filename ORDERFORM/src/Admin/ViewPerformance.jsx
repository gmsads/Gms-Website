import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const PerformanceView = () => {
  const navigate = useNavigate();
  const [executives, setExecutives] = useState([]);
  const [serviceExecutives, setServiceExecutives] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Combine all executive types into one array with type information
  const allExecutives = useMemo(() => {
    const execs = executives.map(exec => ({
      ...exec,
      type: 'Sales',
      displayName: `${exec.name} (Sales)`,
      value: `executive_${exec._id}`
    }));
    
    const serviceExecs = serviceExecutives.map(exec => ({
      ...exec,
      type: 'Service',
      displayName: `${exec.name} (Service)`,
      value: `service_${exec._id}`
    }));
    
    const accountExecs = accounts.map(account => ({
      ...account,
      type: 'Account',
      displayName: `${account.name} (Account)`,
      value: `account_${account._id}`
    }));
    
    return [...execs, ...serviceExecs, ...accountExecs];
  }, [executives, serviceExecutives, accounts]);

  // Filter executives based on search term
  const filteredExecutives = useMemo(() => {
    if (!searchTerm) return allExecutives;
    
    return allExecutives.filter(exec => 
      exec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allExecutives, searchTerm]);

  // Find the selected executive object
  const selectedExecutiveObj = useMemo(() => {
    return allExecutives.find(exec => exec.value === selectedExecutive);
  }, [allExecutives, selectedExecutive]);

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '30px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      borderRadius: '10px',
      boxShadow: '0 0 20px rgba(0,0,0,0.1)'
    },
    heading: {
      color: '#2c3e50',
      textAlign: 'center',
      marginBottom: '30px',
      fontSize: '28px',
      fontWeight: '600'
    },
    formContainer: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      marginBottom: '30px'
    },
    formTitle: {
      fontSize: '20px',
      marginTop: '0',
      marginBottom: '20px',
      color: '#34495e',
      borderBottom: '1px solid #eee',
      paddingBottom: '10px'
    },
    formRow: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '20px',
      marginBottom: '20px'
    },
    formGroup: {
      flex: '1',
      minWidth: '250px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#7f8c8d',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '16px',
      transition: 'border 0.3s',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '16px',
      backgroundColor: 'white',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,<svg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M5 6l5 5 5-5z\' fill=\'%23333\'/></svg>")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 10px center',
      backgroundSize: '12px'
    },
    button: {
      backgroundColor: '#3498db',
      color: 'white',
      padding: '12px 25px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      transition: 'background-color 0.3s',
      marginTop: '10px'
    },
    buttonDisabled: {
      backgroundColor: '#bdc3c7',
      cursor: 'not-allowed'
    },
    resultsContainer: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    },
    resultsTitle: {
      fontSize: '22px',
      marginTop: '0',
      marginBottom: '20px',
      color: '#2c3e50',
      borderBottom: '1px solid #eee',
      paddingBottom: '10px'
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
      marginTop: '20px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      borderTop: '4px solid #3498db',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    cardTitle: {
      marginTop: '0',
      marginBottom: '15px',
      color: '#34495e',
      fontSize: '18px',
      fontWeight: '600'
    },
    cardItem: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '12px',
      paddingBottom: '12px',
      borderBottom: '1px solid #f1f1f1'
    },
    clickableCardItem: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '12px',
      paddingBottom: '12px',
      borderBottom: '1px solid #f1f1f1',
      cursor: 'pointer'
    },
    cardLabel: {
      color: '#7f8c8d',
      fontWeight: '500'
    },
    cardValue: {
      fontWeight: '600',
      color: '#2c3e50'
    },
    progressContainer: {
      width: '100%',
      backgroundColor: '#ecf0f1',
      borderRadius: '6px',
      margin: '20px 0',
      height: '30px',
      overflow: 'hidden',
      position: 'relative'
    },
    progressBar: {
      backgroundColor: '#2ecc71',
      color: 'white',
      textAlign: 'center',
      height: '100%',
      lineHeight: '30px',
      fontWeight: '600',
      transition: 'width 0.5s ease'
    },
    monthlySection: {
      marginTop: '30px'
    },
    monthlyHeader: {
      fontSize: '20px',
      marginBottom: '20px',
      color: '#2c3e50',
      borderBottom: '1px solid #eee',
      paddingBottom: '10px'
    },
    monthlyGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '20px'
    },
    monthlyCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      borderTop: '4px solid #2ecc71'
    },
    performanceBox: {
      width: '100%',
      height: '50px',
      backgroundColor: '#ecf0f1',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      margin: '20px 0',
      border: '1px solid #ddd',
      display: 'flex'
    },
    performanceSegment: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      color: 'white',
      transition: 'width 0.5s ease',
      position: 'relative'
    },
    searchContainer: {
      position: 'relative',
      width: '100%'
    },
    searchInput: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '16px',
      boxSizing: 'border-box',
      marginBottom: '5px'
    },
    dropdownList: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      maxHeight: '300px',
      overflowY: 'auto',
      zIndex: '1000',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    dropdownItem: {
      padding: '12px',
      cursor: 'pointer',
      borderBottom: '1px solid #f1f1f1',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    dropdownItemHover: {
      backgroundColor: '#f8f9fa'
    },
    typeBadge: {
      backgroundColor: '#3498db',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600'
    },
    selectedExecutive: {
      marginTop: '10px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px solid #ddd'
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all three types of executives in parallel
        const [execRes, serviceExecRes, accountsRes] = await Promise.all([
          axios.get('/api/performance/executives'),
          axios.get('/api/service-executives'),
          axios.get('/api/accounts')
        ]);
        
        setExecutives(execRes.data);
        setServiceExecutives(serviceExecRes.data);
        setAccounts(accountsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExecutive) {
      alert('Please select an executive');
      return;
    }

    setLoading(true);
    try {
      // Extract the actual ID by removing the prefix
      const [prefix, executiveId] = selectedExecutive.split('_');
      
      const params = { 
        executiveId,
        executiveType: prefix, // Send the type to backend
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      };
      
      const res = await axios.get('/api/performance', { params });
      setPerformanceData(res.data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      alert('Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMonthClick = (monthData) => {
    const [monthStr, yearStr] = monthData.month.split(' ');
    const monthIndex = new Date(`${monthStr} 1, ${yearStr}`).getMonth();
    const year = parseInt(yearStr);
    
    // Extract the executive ID and type from the selected executive
    const [executiveType, executiveId] = selectedExecutive.split('_');
    
    navigate(`/admin-dashboard/view-orders?month=${monthIndex + 1}&year=${year}&executive=${executiveId}&executiveType=${executiveType}`);
  };

  const handleTotalOrdersClick = () => {
    // Extract the executive ID and type from the selected executive
    const [executiveType, executiveId] = selectedExecutive.split('_');
    
    navigate(`/admin-dashboard/view-orders?executive=${executiveId}&executiveType=${executiveType}`);
  };

  const getSegmentColor = (segment) => {
    switch(segment) {
      case 0: return '#e74c3c'; // Red for 0-35%
      case 1: return '#f1c40f'; // Yellow for 35-50%
      case 2: return '#f39c12'; // Orange for 50-75%
      case 3: return '#2ecc71'; // Green for 75-100%
      case 4: return '#9b59b6'; // Purple for 100-150%
      case 5: return '#ff69b4'; // Pink for 150%+
      default: return '#ecf0f1';
    }
  };

  const renderPerformanceBox = (percentage) => {
    if (!percentage || percentage <= 0) {
      return (
        <div>
          <div style={styles.performanceBox}>
            <div
              style={{
                ...styles.performanceSegment,
                width: '100%',
                backgroundColor: '#ecf0f1'
              }}
            />
          </div>
          <div style={{ 
            textAlign: 'center', 
            marginTop: '15px', 
            fontWeight: '600',
            fontSize: '16px',
            color: '#2c3e50'
          }}>
            Current Performance: 0%
          </div>
        </div>
      );
    }

    const segments = [
      { min: 0, max: 35, color: getSegmentColor(0) },
      { min: 35, max: 50, color: getSegmentColor(1) },
      { min: 50, max: 75, color: getSegmentColor(2) },
      { min: 75, max: 100, color: getSegmentColor(3) },
      { min: 100, max: 150, color: getSegmentColor(4) },
      { min: 150, max: 200, color: getSegmentColor(5) }
    ];

    return (
      <div>
        <div style={styles.performanceBox}>
          {segments.map((segment, index) => {
            const segmentWidth = segment.max - segment.min;
            const isActive = percentage >= segment.min;
            const isPartial = percentage > segment.min && percentage < segment.max;
            const fillWidth = isPartial 
              ? ((percentage - segment.min) / segmentWidth) * 100 
              : (percentage >= segment.max ? 100 : 0);

            return (
              <div 
                key={index}
                style={{
                  ...styles.performanceSegment,
                  width: `${segmentWidth}%`,
                  backgroundColor: isActive ? segment.color : '#ecf0f1',
                  backgroundImage: isPartial 
                    ? `linear-gradient(to right, ${segment.color} 0%, ${segment.color} ${fillWidth}%, #ecf0f1 ${fillWidth}%, #ecf0f1 100%)`
                    : 'none'
                }}
              >
                {isActive && !isPartial && segment.max <= 150 && (
                  <span>{segment.max}%</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ 
          textAlign: 'center', 
          marginTop: '15px', 
          fontWeight: '600',
          fontSize: '16px',
          color: '#2c3e50'
        }}>
          Current Performance: {percentage.toFixed(1)}%
        </div>
      </div>
    );
  };

  const renderMonthlyTargets = () => {
    if (!performanceData?.detailedData?.byMonth) return null;

    // Sort months in reverse chronological order (newest first)
    const sortedMonths = [...performanceData.detailedData.byMonth].sort((a, b) => {
      const [aMonth, aYear] = a.month.split(' ');
      const [bMonth, bYear] = b.month.split(' ');
      const aDate = new Date(`${aMonth} 1, ${aYear}`);
      const bDate = new Date(`${bMonth} 1, ${bYear}`);
      return bDate - aDate; // Changed to bDate - aDate for descending order
    });

    return sortedMonths.map((monthData, index) => {
      const percentage = monthData.percentage || 0;

      return (
        <div key={index} style={styles.monthlyCard}>
          <h3 style={styles.cardTitle}>{monthData.month}</h3>
          
          {renderPerformanceBox(percentage)}
          
          <div style={styles.cardItem}>
            <span style={styles.cardLabel}>Target Amount:</span>
            <span style={styles.cardValue}>
              ₹{monthData.target?.toLocaleString('en-IN') || '0'}
            </span>
          </div>
          <div style={styles.cardItem}>
            <span style={styles.cardLabel}>Achieved Amount:</span>
            <span style={styles.cardValue}>
              ₹{monthData.achieved?.toLocaleString('en-IN') || '0'}
            </span>
          </div>
          <div style={styles.cardItem}>
            <span style={styles.cardLabel}>Advance Amount:</span>
            <span style={styles.cardValue}>
              ₹{monthData.advance?.toLocaleString('en-IN') || '0'}
            </span>
          </div>
          <div 
            style={{...styles.clickableCardItem, ...styles.cardItem}}
            onClick={() => handleMonthClick(monthData)}
          >
            <span style={styles.cardLabel}>Total Orders:</span>
            <span style={styles.cardValue}>
              {monthData.orders || '0'}
            </span>
          </div>
        </div>
      );
    });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Executive Performance Dashboard</h1>

      <div style={styles.formContainer}>
        <h2 style={styles.formTitle}>Performance Search Criteria</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label htmlFor="executive" style={styles.label}>Select Executive</label>
              <div style={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Search executives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  style={styles.searchInput}
                />
                {showDropdown && (
                  <div style={styles.dropdownList}>
                    {filteredExecutives.length > 0 ? (
                      filteredExecutives.map((exec) => (
                        <div
                          key={exec.value}
                          style={{
                            ...styles.dropdownItem,
                            ...(selectedExecutive === exec.value ? styles.dropdownItemHover : {})
                          }}
                          onClick={() => {
                            setSelectedExecutive(exec.value);
                            setSearchTerm('');
                            setShowDropdown(false);
                          }}
                        >
                          <span>{exec.name}</span>
                          <span style={{
                            ...styles.typeBadge,
                            backgroundColor: 
                              exec.type === 'Sales' ? '#3498db' : 
                              exec.type === 'Service' ? '#2ecc71' : 
                              '#9b59b6'
                          }}>
                            {exec.type}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={styles.dropdownItem}>
                        No executives found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedExecutive && (
                <div style={styles.selectedExecutive}>
                  Selected: {selectedExecutiveObj?.name} ({selectedExecutiveObj?.type})
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Date Range</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="date"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                    style={styles.input}
                    max={dateRange.endDate || format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="date"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                    style={styles.input}
                    min={dateRange.startDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Loading...' : 'View Performance Report'}
          </button>
        </form>
      </div>

      {performanceData && (
        <div style={styles.resultsContainer}>
          <h2 style={styles.resultsTitle}>
            Performance Report for {performanceData.executiveName}
            {dateRange.startDate && dateRange.endDate && (
              <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#7f8c8d', marginLeft: '15px' }}>
                ({format(parseISO(dateRange.startDate), 'MMM dd, yyyy')} - {format(parseISO(dateRange.endDate), 'MMM dd, yyyy')})
              </span>
            )}
          </h2>

          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Executive Information</h3>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Date of Joining:</span>
                <span style={styles.cardValue}>
                  {performanceData.dateOfJoining ? format(parseISO(performanceData.dateOfJoining), 'MMM dd, yyyy') : 'N/A'}
                </span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Avg. Monthly Target:</span>
                <span style={styles.cardValue}>
                  ₹{(performanceData.avgMonthlyTarget || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Activity Metrics</h3>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Total Prospects:</span>
                <span style={styles.cardValue}>{performanceData.totalProspects || 0}</span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Total Calls:</span>
                <span style={styles.cardValue}>{performanceData.totalCalls || 0}</span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Total WhatsApp:</span>
                <span style={styles.cardValue}>{performanceData.totalWhatsapp || 0}</span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Avg. Call Duration:</span>
                <span style={styles.cardValue}>
                  {performanceData.avgCallDuration ? `${parseFloat(performanceData.avgCallDuration).toFixed(1)} mins` : 'N/A'}
                </span>
              </div>
            </div>

            <div style={{ ...styles.card, borderTop: '4px solid #2ecc71' }}>
              <h3 style={styles.cardTitle}>Overall Performance</h3>
              {renderPerformanceBox(performanceData.achievedPercentage || 0)}
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Total Target:</span>
                <span style={styles.cardValue}>
                  ₹{(performanceData.target || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Total Achieved:</span>
                <span style={styles.cardValue}>
                  ₹{(performanceData.achieved || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Total Advance:</span>
                <span style={styles.cardValue}>
                  ₹{(performanceData.advance || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div 
                style={{...styles.clickableCardItem, ...styles.cardItem}}
                onClick={handleTotalOrdersClick}
              >
                <span style={styles.cardLabel}>Total Orders:</span>
                <span style={styles.cardValue}>
                  {performanceData.totalOrders || '0'}
                </span>
              </div>
            </div>
          </div>

          <div style={styles.monthlySection}>
            <h3 style={styles.monthlyHeader}>Monthly Performance Breakdown</h3>
            <div style={styles.monthlyGrid}>
              {renderMonthlyTargets()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceView;