import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const PerformanceView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeNameFromUrl = searchParams.get('employee');
  
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
  const [overallPerformance, setOverallPerformance] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  
  // NEW: Month and Year filter state for overall performance chart
  const [chartFilters, setChartFilters] = useState({
    month: new Date().getMonth() + 1, // Current month (1-12)
    year: new Date().getFullYear() // Current year
  });
  
  // PERSISTENT: Load from localStorage on component mount
  const [manuallyEligibleMonths, setManuallyEligibleMonths] = useState(() => {
    try {
      const saved = localStorage.getItem('executiveIncentiveEligibility');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {};
    }
  });


  // PERSISTENT: Save to localStorage whenever manuallyEligibleMonths changes
  useEffect(() => {
    try {
      localStorage.setItem('executiveIncentiveEligibility', JSON.stringify(manuallyEligibleMonths));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [manuallyEligibleMonths]);

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

  // Calculate balance for overall performance
  const overallBalance = useMemo(() => {
    if (!performanceData) return 0;
    const achieved = performanceData.achieved || 0;
    const advance = performanceData.advance || 0;
    return achieved - advance;
  }, [performanceData]);

  // Calculate balance for monthly performance
  const calculateMonthlyBalance = (monthData) => {
    const achieved = monthData.achieved || 0;
    const advance = monthData.advance || 0;
    return achieved - advance;
  };

  // NEW CRITERIA: Check if month meets incentive criteria (target achieved OR minimum orders)
  const meetsIncentiveCriteria = (monthData) => {
    const targetAchieved = monthData.percentage >= 100; // 100% target achievement
    const minimumOrders = (monthData.orders || 0) >= 10; // At least 10 orders
    
    return targetAchieved || minimumOrders;
  };

  // NEW: Calculate what's needed for eligibility
  const calculateEligibilityGap = (monthData) => {
    const currentPercentage = monthData.percentage || 0;
    const currentOrders = monthData.orders || 0;
    
    const targetNeeded = Math.max(0, 100 - currentPercentage);
    const ordersNeeded = Math.max(0, 10 - currentOrders);
    
    return {
      targetNeeded,
      ordersNeeded,
      meetsTargetCriteria: currentPercentage >= 100,
      meetsOrderCriteria: currentOrders >= 10
    };
  };

  // PERSISTENT: Handle manual eligibility toggle with executive-specific storage
  const handleToggleEligibility = (monthKey, monthData) => {
    setManuallyEligibleMonths(prev => {
      const newState = { ...prev };
      
      // Create unique key with executive name and month
      const executiveName = performanceData?.executiveName || 'unknown';
      const uniqueKey = `${executiveName}_${monthKey}`;
      
      // Only allow adding eligibility, not removing
      if (!newState[uniqueKey]) {
        const gap = calculateEligibilityGap(monthData);
        
        // Add eligibility with criteria met information
        newState[uniqueKey] = {
          eligible: true,
          executiveName: executiveName,
          month: monthKey,
          criteria: {
            targetRequired: 100,
            targetAchieved: monthData.percentage || 0,
            ordersRequired: 10,
            ordersAchieved: monthData.orders || 0,
            meetsTarget: gap.meetsTargetCriteria,
            meetsOrders: gap.meetsOrderCriteria,
            dateMarked: new Date().toISOString()
          }
        };
      }
      // No else condition - once eligible, cannot be removed
      
      return newState;
    });
  };

  // PERSISTENT: Check if month is eligible for current executive
  const isMonthEligible = (monthKey) => {
    if (!performanceData?.executiveName) return false;
    const executiveName = performanceData.executiveName;
    const uniqueKey = `${executiveName}_${monthKey}`;
    return !!manuallyEligibleMonths[uniqueKey];
  };

  // PERSISTENT: Calculate incentive summary for current executive only
  const incentiveSummary = useMemo(() => {
    if (!performanceData?.executiveName) {
      return {
        totalEligibleMonths: 0,
        totalIncentiveAmount: 0,
        averageMonthlyIncentive: 0
      };
    }

    const executiveName = performanceData.executiveName;
    const eligibleMonths = Object.values(manuallyEligibleMonths).filter(
      month => month.executiveName === executiveName
    );
    
    return {
      totalEligibleMonths: eligibleMonths.length,
      totalIncentiveAmount: 0,
      averageMonthlyIncentive: 0
    };
  }, [manuallyEligibleMonths, performanceData]);

  // Extract the performance data fetching logic into a separate function
  const fetchPerformanceData = async (executiveValue) => {
    if (!executiveValue) return;

    setLoading(true);
    try {
      const [prefix, executiveId] = executiveValue.split('_');
      
      const params = { 
        executiveId,
        executiveType: prefix,
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      };
      
      const res = await axios.get('/api/performance', { params });
      setPerformanceData(res.data);
      // Don't reset manuallyEligibleMonths - keep the persisted data
    } catch (error) {
      console.error('Error fetching performance data:', error);
      alert('Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-select executive when component mounts or URL parameter changes
  useEffect(() => {
    if (employeeNameFromUrl && allExecutives.length > 0) {
      const foundExecutive = allExecutives.find(exec => 
        exec.name.toLowerCase() === employeeNameFromUrl.toLowerCase()
      );
      
      if (foundExecutive) {
        setSelectedExecutive(foundExecutive.value);
        setSearchTerm(foundExecutive.name);
        
        // Auto-fetch performance data
        fetchPerformanceData(foundExecutive.value);
      }
    }
  }, [employeeNameFromUrl, allExecutives]);

// NEW: Fetch overall performance data with month and year filters
const fetchOverallPerformance = async (month = null, year = null) => {
  setChartLoading(true);
  try {
    const params = {};
    // Only send month/year if they have values (not empty strings)
    if (month !== '' && month !== null) params.month = month;
    if (year !== '' && year !== null) params.year = year;
    
    console.log('Fetching overall performance with params:', params);
    
    const res = await axios.get('/api/performance/overall', { params });
    setOverallPerformance(res.data);
  } catch (error) {
    console.error('Error fetching overall performance:', error);
  } finally {
    setChartLoading(false);
  }
};

  // Fetch overall performance data on component mount and when filters change
  useEffect(() => {
    fetchOverallPerformance(chartFilters.month, chartFilters.year);
  }, [chartFilters.month, chartFilters.year]);

  // Fetch executives data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [execRes, serviceExecRes, accountsRes] = await Promise.all([
          axios.get('/api/performance/executives'),
          axios.get('/api/service-executives'),
          axios.get('/api/accounts')
        ]);
        
        // Filter out Sangeetha, Shivakumari, Malleshwari, Rajitha, and Malli from sales executives
        const filteredSalesExecs = execRes.data.filter(exec => 
          exec.name.toLowerCase() !== 'sangeetha' && 
          exec.name.toLowerCase() !== 'shivakumari' &&
          exec.name.toLowerCase() !== 'malleshwari' &&
          exec.name.toLowerCase() !== 'rajitha' &&
          exec.name.toLowerCase() !== 'malli'
        );
        
        setExecutives(filteredSalesExecs);
        setServiceExecutives(serviceExecRes.data);
        setAccounts(accountsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  // NEW: Handle chart filter changes
  const handleChartFilterChange = (e) => {
    const { name, value } = e.target;
    setChartFilters(prev => ({
      ...prev,
      [name]: value ? parseInt(value) : ''
    }));
  };

  // NEW: Generate month options
  const monthOptions = [
    { value: '', label: 'All Months' },
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // NEW: Generate year options (last 5 years and next 1 year)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: '', label: 'All Years' },
    ...Array.from({ length: 6 }, (_, i) => ({
      value: currentYear - 4 + i,
      label: (currentYear - 4 + i).toString()
    }))
  ];

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
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    cardLabel: {
      color: '#7f8c8d',
      fontWeight: '500'
    },
    cardValue: {
      fontWeight: '600',
      color: '#2c3e50'
    },
    balanceValue: {
      fontWeight: '600',
      color: overallBalance >= 0 ? '#27ae60' : '#e74c3c'
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
      borderTop: '4px solid #2ecc71',
      position: 'relative'
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
    },
    clickableCardItemHover: {
      backgroundColor: '#f8f9fa'
    },
    // UPDATED INCENTIVE STYLES
    incentiveCard: {
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    },
    incentiveHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px'
    },
    incentiveTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#856404',
      margin: 0
    },
    incentiveAmount: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#28a745'
    },
    makeEligibleButton: {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      marginTop: '10px',
      width: '100%'
    },
    eligibleBadge: {
      backgroundColor: '#28a745',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      position: 'absolute',
      top: '15px',
      right: '15px'
    },
    incentiveEligibilitySection: {
      marginTop: '15px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px solid #dee2e6'
    },
    incentiveInfo: {
      fontSize: '14px',
      color: '#495057',
      marginBottom: '10px',
      textAlign: 'center'
    },
    gapInfo: {
      fontSize: '13px',
      color: '#dc3545',
      marginBottom: '8px',
      textAlign: 'center',
      fontWeight: '600'
    },
    criteriaMetInfo: {
      fontSize: '14px',
      color: '#28a745',
      marginBottom: '8px',
      textAlign: 'center',
      fontWeight: '600'
    },
    // CHART STYLES
    chartContainer: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      marginBottom: '30px',
      marginTop: '30px'
    },
    chartTitle: {
      fontSize: '22px',
      marginTop: '0',
      marginBottom: '20px',
      color: '#2c3e50',
      borderBottom: '1px solid #eee',
      paddingBottom: '10px',
      textAlign: 'center'
    },
    chartSubtitle: {
      textAlign: 'center',
      color: '#7f8c8d',
      marginBottom: '30px',
      fontSize: '16px'
    },
    loadingText: {
      textAlign: 'center',
      padding: '40px',
      color: '#7f8c8d',
      fontSize: '16px'
    },
    noDataText: {
      textAlign: 'center',
      padding: '40px',
      color: '#95a5a6',
      fontSize: '16px',
      fontStyle: 'italic'
    },
    // NEW: Chart filter styles
    chartFilterContainer: {
      display: 'flex',
      gap: '20px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    },
    chartFilterGroup: {
      minWidth: '200px'
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExecutive) {
      alert('Please select an executive');
      return;
    }

    await fetchPerformanceData(selectedExecutive);
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
    
    const [executiveType, executiveId] = selectedExecutive.split('_');
    navigate(`/admin-dashboard/view-orders?month=${monthIndex + 1}&year=${year}&executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
  };

  const handleTotalOrdersClick = () => {
    const [executiveType, executiveId] = selectedExecutive.split('_');
    navigate(`/admin-dashboard/view-orders?executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
  };

  const handleTotalProspectsClick = () => {
    const [executiveType, executiveId] = selectedExecutive.split('_');
    navigate(`/admin-dashboard/view-prospective?executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
  };

  const handleMonthlyProspectsClick = (monthData) => {
    const [monthStr, yearStr] = monthData.month.split(' ');
    const monthIndex = new Date(`${monthStr} 1, ${yearStr}`).getMonth();
    const year = parseInt(yearStr);
    
    const [executiveType, executiveId] = selectedExecutive.split('_');
    navigate(`/admin-dashboard/view-prospective?month=${monthIndex + 1}&year=${year}&executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
  };

  const getSegmentColor = (segment) => {
    switch(segment) {
      case 0: return '#e74c3c';
      case 1: return '#f1c40f';
      case 2: return '#f39c12';
      case 3: return '#2ecc71';
      case 4: return '#9b59b6';
      case 5: return '#ff69b4';
      default: return '#ecf0f1';
    }
  };

  // Function to get color based on performance percentage
  const getPerformanceColor = (percentage) => {
    if (percentage >= 150) return '#ff69b4'; // Pink for 150%+
    if (percentage >= 100) return '#9b59b6'; // Purple for 100-150%
    if (percentage >= 75) return '#2ecc71';  // Green for 75-100%
    if (percentage >= 50) return '#f39c12';  // Orange for 50-75%
    if (percentage >= 35) return '#f1c40f';  // Yellow for 35-50%
    return '#e74c3c'; // Red for 0-35%
  };

  // Smart Y-axis tick formatter that adapts to data range
  const getYTickFormatter = (data) => {
    if (!data || data.length === 0) return (value) => `₹${value}`;
    
    // Find the maximum value in the data
    const maxValue = Math.max(
      ...data.map(item => Math.max(item.target || 0, item.achieved || 0))
    );
    
    // Determine appropriate scaling based on max value
    if (maxValue >= 1000000) {
      // For values in lakhs/crores
      return (value) => {
        if (value >= 10000000) return `₹${(value/10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value/100000).toFixed(1)}L`;
        return `₹${(value/1000).toFixed(0)}k`;
      };
    } else if (maxValue >= 100000) {
      // For values in lakhs
      return (value) => `₹${(value/100000).toFixed(1)}L`;
    } else if (maxValue >= 10000) {
      // For values in thousands
      return (value) => `₹${(value/1000).toFixed(0)}k`;
    } else {
      // For smaller values, show actual amount with proper formatting
      return (value) => `₹${value.toLocaleString('en-IN')}`;
    }
  };

  // Smart Y-axis domain and ticks calculation
  const getYAxisProps = (data) => {
    if (!data || data.length === 0) return { domain: [0, 100000], tickCount: 6 };
    
    const maxValue = Math.max(
      ...data.map(item => Math.max(item.target || 0, item.achieved || 0))
    );
    
    // Calculate nice upper bound
    const niceMax = Math.ceil(maxValue / 50000) * 50000;
    const tickCount = Math.min(6, Math.max(3, Math.ceil(niceMax / 50000)));
    
    return {
      domain: [0, niceMax],
      tickCount: tickCount
    };
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const target = payload[0]?.value || 0;
      const achieved = payload[1]?.value || 0;
      const performance = payload[2]?.value || 0;
      
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: '600', color: '#2c3e50' }}>
            {label}
          </p>
          <p style={{ margin: '2px 0', color: '#3498db' }}>
            Target: ₹{target?.toLocaleString('en-IN') || 0}
          </p>
          <p style={{ margin: '2px 0', color: '#2ecc71' }}>
            Achieved: ₹{achieved?.toLocaleString('en-IN') || 0}
          </p>
          <p style={{ margin: '2px 0', color: '#e74c3c' }}>
            Balance: ₹{(achieved - target)?.toLocaleString('en-IN') || 0}
          </p>
          <p style={{ margin: '5px 0 0 0', fontWeight: '600', color: '#f39c12' }}>
            Performance: {performance?.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // NEW: Generate chart subtitle based on filters
  const getChartSubtitle = () => {
    const monthName = chartFilters.month ? monthOptions.find(m => m.value === chartFilters.month)?.label : 'All Months';
    const yearText = chartFilters.year ? chartFilters.year.toString() : 'All Years';
    
    if (!chartFilters.month && !chartFilters.year) {
      return 'All Time Performance Data';
    } else if (chartFilters.month && chartFilters.year) {
      return `Performance for ${monthName} ${yearText}`;
    } else if (chartFilters.month) {
      return `Performance for ${monthName} (All Years)`;
    } else {
      return `Performance for Year ${yearText} (All Months)`;
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

  // Render the overall performance chart
  const renderOverallPerformanceChart = () => {
    if (chartLoading) {
      return <div style={styles.loadingText}>Loading performance chart...</div>;
    }

    if (!overallPerformance || overallPerformance.length === 0) {
      return <div style={styles.noDataText}>No performance data available for the selected period</div>;
    }

    // Sort by performance percentage (descending) and take top 10
    const topPerformers = [...overallPerformance]
      .sort((a, b) => b.performancePercentage - a.performancePercentage)
      .slice(0, 10);

    const chartData = topPerformers.map(exec => ({
      name: exec.executiveName.length > 15 ? exec.executiveName.substring(0, 15) + '...' : exec.executiveName,
      fullName: exec.executiveName,
      target: exec.totalTarget || 0,
      achieved: exec.totalAchieved || 0,
      performance: exec.performancePercentage || 0,
      type: exec.executiveType,
      balance: (exec.totalAchieved || 0) - (exec.totalTarget || 0)
    }));

    const yAxisProps = getYAxisProps(chartData);
    const yTickFormatter = getYTickFormatter(chartData);

    return (
      <div>
        <div style={styles.chartSubtitle}>
          {getChartSubtitle()}
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tickFormatter={yTickFormatter}
              tick={{ fontSize: 12 }}
              domain={yAxisProps.domain}
              tickCount={yAxisProps.tickCount}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="target" 
              name="Target Amount" 
              fill="#3498db"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="achieved" 
              name="Achieved Amount" 
              fill="#2ecc71"
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getPerformanceColor(entry.performance)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Performance Legend */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '20px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#e74c3c', marginRight: '5px' }}></div>
            <span style={{ fontSize: '12px' }}>0-35%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#f1c40f', marginRight: '5px' }}></div>
            <span style={{ fontSize: '12px' }}>35-50%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#f39c12', marginRight: '5px' }}></div>
            <span style={{ fontSize: '12px' }}>50-75%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#2ecc71', marginRight: '5px' }}></div>
            <span style={{ fontSize: '12px' }}>75-100%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#9b59b6', marginRight: '5px' }}></div>
            <span style={{ fontSize: '12px' }}>100-150%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
            <div style={{ width: '15px', height: '15px', backgroundColor: '#ff69b4', marginRight: '5px' }}></div>
            <span style={{ fontSize: '12px' }}>150%+</span>
          </div>
        </div>

        {/* Executive Type Legend */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginTop: '15px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: '#3498db', 
              marginRight: '5px',
              borderRadius: '2px'
            }}></div>
            <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Target</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: '#2ecc71', 
              marginRight: '5px',
              borderRadius: '2px'
            }}></div>
            <span style={{ fontSize: '12px', color: '#7f8c8d' }}>Achieved (Colored by Performance %)</span>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Render chart filters
  const renderChartFilters = () => {
    return (
      <div style={styles.chartFilterContainer}>
        <div style={styles.chartFilterGroup}>
          <label htmlFor="month" style={styles.label}>Filter by Month</label>
          <select
            name="month"
            value={chartFilters.month}
            onChange={handleChartFilterChange}
            style={styles.select}
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div style={styles.chartFilterGroup}>
          <label htmlFor="year" style={styles.label}>Filter by Year</label>
          <select
            name="year"
            value={chartFilters.year}
            onChange={handleChartFilterChange}
            style={styles.select}
          >
            {yearOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  // PERSISTENT: Render incentive information (only when there are eligible months)
  const renderIncentiveInfo = () => {
    if (incentiveSummary.totalEligibleMonths === 0) return null;

    return (
      <div style={styles.incentiveCard}>
        <div style={styles.incentiveHeader}>
          <h3 style={styles.incentiveTitle}>🎯 Incentive Summary</h3>
          <div style={styles.incentiveAmount}>
            {incentiveSummary.totalEligibleMonths} Month(s) Eligible
          </div>
        </div>
        
        <div style={{ textAlign: 'center', color: '#856404' }}>
          {incentiveSummary.totalEligibleMonths} month(s) marked eligible for incentive processing
        </div>
      </div>
    );
  };

 const renderMonthlyTargets = () => {
  if (!performanceData?.detailedData?.byMonth) return null;

  const sortedMonths = [...performanceData.detailedData.byMonth].sort((a, b) => {
    const [aMonth, aYear] = a.month.split(' ');
    const [bMonth, bYear] = b.month.split(' ');
    const aDate = new Date(`${aMonth} 1, ${aYear}`);
    const bDate = new Date(`${bMonth} 1, ${bYear}`);
    return bDate - aDate;
  });

  return sortedMonths.map((monthData, index) => {
    const percentage = monthData.percentage || 0;
    const balance = calculateMonthlyBalance(monthData);
    const monthKey = monthData.month;
    const isManuallyEligible = isMonthEligible(monthKey); // PERSISTENT: Use the new function
    const meetsCriteria = meetsIncentiveCriteria(monthData);
    const gap = calculateEligibilityGap(monthData);

    return (
      <div key={index} style={styles.monthlyCard}>
        {isManuallyEligible && (
          <span style={styles.eligibleBadge}>✅ Eligible</span>
        )}
        
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
        <div style={styles.cardItem}>
          <span style={styles.cardLabel}>Balance Amount:</span>
          <span style={{
            ...styles.cardValue,
            color: balance >= 0 ? '#27ae60' : '#e74c3c'
          }}>
            ₹{balance.toLocaleString('en-IN')}
          </span>
        </div>
        <div 
          style={styles.clickableCardItem}
          onClick={() => handleMonthClick(monthData)}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f8f9fa';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          <span style={styles.cardLabel}>Total Orders:</span>
          <span style={styles.cardValue}>
            {monthData.orders || '0'}
          </span>
        </div>
        <div 
          style={styles.clickableCardItem}
          onClick={() => handleMonthlyProspectsClick(monthData)}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f8f9fa';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          <span style={styles.cardLabel}>Monthly Prospects:</span>
          <span style={styles.cardValue}>
            {monthData.prospects || '0'}
          </span>
        </div>
        
        {/* UPDATED INCENTIVE ELIGIBILITY SECTION */}
        <div style={styles.incentiveEligibilitySection}>
          {isManuallyEligible ? (
            <div style={{ textAlign: 'center', color: '#28a745', fontWeight: '600' }}>
              ✅ Already Marked Eligible for Incentive
            </div>
          ) : (
            <>
              {/* Show criteria status */}
              {gap.meetsTargetCriteria && (
                <div style={styles.criteriaMetInfo}>
                  ✅ Target Achieved: {percentage}% (Required: 100%)
                </div>
              )}
              {gap.meetsOrderCriteria && (
                <div style={styles.criteriaMetInfo}>
                  ✅ Orders Completed: {monthData.orders || 0} (Required: 10)
                </div>
              )}
              
              {/* Show what's needed if criteria not met */}
              {!meetsCriteria && (
                <>
                  {!gap.meetsTargetCriteria && (
                    <div style={styles.gapInfo}>
                      📊 Need {gap.targetNeeded}% more to reach target
                    </div>
                  )}
                  {!gap.meetsOrderCriteria && (
                    <div style={styles.gapInfo}>
                      📦 Need {gap.ordersNeeded} more orders to reach minimum
                    </div>
                  )}
                </>
              )}
              
              <button
                onClick={() => handleToggleEligibility(monthKey, monthData)}
                disabled={!meetsCriteria}
                style={{
                  ...styles.makeEligibleButton,
                  ...(!meetsCriteria ? { backgroundColor: '#6c757d', cursor: 'not-allowed' } : {})
                }}
              >
                {meetsCriteria ? 'Make Eligible for Incentive' : 'Criteria Not Met'}
              </button>
              
              <div style={{ fontSize: '12px', color: '#6c757d', textAlign: 'center', marginTop: '8px' }}>
                Eligibility requires: 100% Target OR 10+ Orders
              </div>
            </>
          )}
        </div>
      </div>
    );
  });
};

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Executive Performance Dashboard</h1>

      {/* Overall Performance Chart Section */}
      <div style={styles.chartContainer}>
        <h2 style={styles.chartTitle}>Overall Performance</h2>
        
        {/* NEW: Chart Filters */}
        {renderChartFilters()}
        
        {renderOverallPerformanceChart()}
      </div>

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

          {/* UPDATED INCENTIVE SUMMARY CARD */}
          {renderIncentiveInfo()}

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
              <div 
                style={styles.clickableCardItem}
                onClick={handleTotalProspectsClick}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
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
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Balance Amount:</span>
                <span style={styles.balanceValue}>
                  ₹{overallBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div 
                style={styles.clickableCardItem}
                onClick={handleTotalOrdersClick}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
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