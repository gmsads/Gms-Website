/* eslint-disable react-hooks/exhaustive-deps */
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
import SalaryComponent from './SalaryComponent';

const PerformanceView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeNameFromUrl = searchParams.get('employee');

  const userRole = localStorage.getItem('role') || '';
  const isAdmin = userRole === 'Admin';
  const isHR = userRole === 'HR';
  const isSalesManager = userRole === 'Sales Manager';
  const isServiceManager = userRole === 'Service Manager';

  const canNavigateToOrders = isAdmin || isSalesManager;
  const canNavigateToProspects = isAdmin || isSalesManager;

  const [executives, setExecutives] = useState([]);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingExecutives, setLoadingExecutives] = useState(false);

  const [salaryData, setSalaryData] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [allEmployeesForSalary, setAllEmployeesForSalary] = useState([]);

  // Calendar month labels (Jan-Dec)
  const calendarMonthLabels = useMemo(() => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], []);

  // Calendar Year State (Jan-Dec) like admin dashboard
  const [selectedYear, setSelectedYear] = useState(() => {
    const currentDate = new Date();
    return currentDate.getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState(null);

  const [manuallyEligibleMonths, setManuallyEligibleMonths] = useState(() => {
    try {
      const saved = localStorage.getItem('executiveIncentiveEligibility');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {};
    }
  });

  // Format currency for display
  const formatCurrency = (value) => {
    if (!value || value === 0) return '₹0';
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    try {
      localStorage.setItem('executiveIncentiveEligibility', JSON.stringify(manuallyEligibleMonths));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [manuallyEligibleMonths]);

  const allExecutives = useMemo(() => {
    return executives.map(exec => ({
      ...exec,
      displayName: `${exec.name} (${exec.type})`,
      value: `${exec.type}_${exec._id}`
    }));
  }, [executives]);

  const filteredExecutives = useMemo(() => {
    if (!searchTerm) return allExecutives;
    return allExecutives.filter(exec =>
      exec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allExecutives, searchTerm]);

  const selectedExecutiveObj = useMemo(() => {
    return allExecutives.find(exec => exec.value === selectedExecutive);
  }, [allExecutives, selectedExecutive]);

  // Calculate totals with proper breakdown (New + Retail combined)
  const calculateTotals = useMemo(() => {
    if (!performanceData?.detailedData?.byMonth) {
      return {
        target: 0,
        achieved: 0,
        advance: 0,
        remaining: 0,
        totalOrders: 0,
        totalProspects: 0,
        totalAmount: 0,
        newRetailCount: 0,
        newRetailAmount: 0,
        agentCount: 0,
        agentAmount: 0,
        renewalCount: 0,
        renewalAmount: 0,
        renewalAgentCount: 0,
        renewalAgentAmount: 0
      };
    }
    
    const monthlyData = performanceData.detailedData.byMonth;
    const filteredMonths = monthlyData.filter(monthData => {
      const [monthName, yearStr] = monthData.month.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = calendarMonthLabels.indexOf(monthName);
      
      if (selectedYear !== 'all' && year !== selectedYear) {
        return false;
      }
      if (selectedMonth !== null && monthIndex !== selectedMonth) {
        return false;
      }
      return true;
    });
    
    const totals = filteredMonths.reduce((acc, month) => ({
      target: acc.target + (month.target || 0),
      achieved: acc.achieved + (month.achieved || 0),
      advance: acc.advance + (month.advance || 0),
      totalOrders: acc.totalOrders + (month.orders || 0),
      totalProspects: acc.totalProspects + (month.prospects || 0),
      totalAmount: acc.totalAmount + (month.totalAmount || 0),
      newRetailCount: acc.newRetailCount + (month.newRetailCount || 0),
      newRetailAmount: acc.newRetailAmount + (month.newRetailAmount || 0),
      agentCount: acc.agentCount + (month.agentCount || 0),
      agentAmount: acc.agentAmount + (month.agentAmount || 0),
      renewalCount: acc.renewalCount + (month.renewalCount || 0),
      renewalAmount: acc.renewalAmount + (month.renewalAmount || 0),
      renewalAgentCount: acc.renewalAgentCount + (month.renewalAgentCount || 0),
      renewalAgentAmount: acc.renewalAgentAmount + (month.renewalAgentAmount || 0)
    }), {
      target: 0,
      achieved: 0,
      advance: 0,
      totalOrders: 0,
      totalProspects: 0,
      totalAmount: 0,
      newRetailCount: 0,
      newRetailAmount: 0,
      agentCount: 0,
      agentAmount: 0,
      renewalCount: 0,
      renewalAmount: 0,
      renewalAgentCount: 0,
      renewalAgentAmount: 0
    });
    
    return {
      ...totals,
      remaining: Math.max(0, totals.target - totals.achieved),
      achievedPercentage: totals.target > 0 ? (totals.achieved / totals.target) * 100 : (totals.achieved > 0 ? 100 : 0)
    };
  }, [performanceData, selectedYear, selectedMonth, calendarMonthLabels]);

  const overallBalance = calculateTotals.achieved - calculateTotals.advance;

  const fetchSalaryData = async (employeeId, employeeName) => {
    if (!employeeId) return;
    
    setLoadingSalary(true);
    try {
      let response;
      try {
        response = await axios.get(`/api/salaries/${employeeId}`);
      } catch (idError) {
        if (employeeName) {
          response = await axios.get(`/api/salaries/${encodeURIComponent(employeeName)}`);
        } else {
          throw new Error('Salary not found');
        }
      }
      
      if (response && response.data) {
        setSalaryData(response.data);
      } else {
        setSalaryData(null);
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
      setSalaryData(null);
    } finally {
      setLoadingSalary(false);
    }
  };

  const calculateTotalSalaryReceived = () => {
    if (!salaryData || !salaryData.paymentHistory) return 0;
    if (selectedYear === 'all') return 0;
    
    const total = salaryData.paymentHistory
      .filter(payment => {
        if (!payment.month) return false;
        const [year, month] = payment.month.split('-');
        const paymentYear = parseInt(year);
        const paymentMonth = parseInt(month);
        
        // Filter by selected year
        return paymentYear === selectedYear;
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    return total;
  };

  const getFormattedSalaryInfo = () => {
    if (!salaryData || !salaryData.paymentHistory || !Array.isArray(salaryData.paymentHistory)) {
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }

    if (selectedYear === 'all') {
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }

    const paymentsInYear = salaryData.paymentHistory.filter(payment => {
      if (!payment.month) return false;
      const [year] = payment.month.split('-');
      const paymentYear = parseInt(year);
      return paymentYear === selectedYear;
    });

    const total = paymentsInYear.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const monthsCount = paymentsInYear.length;

    if (total === 0 || monthsCount === 0) {
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }

    return {
      total: total,
      monthsCount: monthsCount,
      formattedString: `${formatCurrency(total)} (${monthsCount} month${monthsCount > 1 ? 's' : ''})`
    };
  };

  const handleSalaryClick = () => {
    setShowSalaryModal(true);
  };

  const handleCloseSalaryModal = async () => {
    setShowSalaryModal(false);
    if (selectedExecutive) {
      const [executiveType, executiveId] = selectedExecutive.split('_');
      const executive = allExecutives.find(exec => exec.value === selectedExecutive);
      await fetchSalaryData(executiveId, executive?.name);
    }
  };

  const fetchPerformanceData = async (executiveValue) => {
    if (!executiveValue) return;

    setLoading(true);
    try {
      const [executiveType, executiveId] = executiveValue.split('_');
      const executive = allExecutives.find(exec => exec.value === executiveValue);
      const executiveName = executive?.name || '';
      
      const params = {
        executiveId,
        executiveType,
      };
      
      if (selectedYear !== 'all') {
        const startDate = new Date(selectedYear, 0, 1);
        const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      } else if (dateRange.startDate && dateRange.endDate) {
        params.startDate = dateRange.startDate;
        params.endDate = dateRange.endDate;
      }

      const res = await axios.get('/api/performance', { params });
      setPerformanceData(res.data);
      await fetchSalaryData(executiveId, executiveName);

    } catch (error) {
      console.error('Error fetching performance data:', error);
      alert('Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExecutive) {
      fetchPerformanceData(selectedExecutive);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (employeeNameFromUrl && allExecutives.length > 0) {
      const foundExecutive = allExecutives.find(exec =>
        exec.name.toLowerCase() === employeeNameFromUrl.toLowerCase()
      );
      if (foundExecutive) {
        setSelectedExecutive(foundExecutive.value);
        setSearchTerm(foundExecutive.name);
        fetchPerformanceData(foundExecutive.value);
      }
    }
  }, [employeeNameFromUrl, allExecutives]);

  const fetchAllExecutives = async () => {
    setLoadingExecutives(true);
    try {
      const res = await axios.get('/api/performance/executives');
      setExecutives(res.data);

      const employeesForSalary = res.data.map(exec => ({
        _id: exec._id,
        name: exec.name,
        role: exec.type,
        active: true
      }));
      setAllEmployeesForSalary(employeesForSalary);

    } catch (error) {
      console.error('Error fetching executives:', error);
      setExecutives([]);
    } finally {
      setLoadingExecutives(false);
    }
  };

  useEffect(() => {
    fetchAllExecutives();
  }, []);

  // Generate year options (from 2015 to current year + 5)
  const yearOptions = () => {
    const currentYear = new Date().getFullYear();
    const options = [{ value: 'all', label: 'All Years' }];
    for (let i = 2015; i <= currentYear + 5; i++) {
      options.push({ value: i, label: i.toString() });
    }
    return options;
  };

  const handleYearChange = (e) => {
    const value = e.target.value;
    setSelectedYear(value === 'all' ? 'all' : parseInt(value));
    setSelectedMonth(null);
  };

  const handleMonthChange = (e) => {
    const value = e.target.value;
    setSelectedMonth(value ? parseInt(value) : null);
  };

  const formatPercentage = (percentage) => {
    if (!percentage || percentage <= 0) return '0%';
    if (percentage >= 100) {
      return `${(percentage / 100).toFixed(1)}%`;
    }
    return `${percentage.toFixed(1)}%`;
  };

  const handleMonthClick = (monthData) => {
    if (!canNavigateToOrders) {
      alert('You do not have permission to view order details');
      return;
    }
    
    const [monthName, yearStr] = monthData.month.split(' ');
    const monthIndex = calendarMonthLabels.indexOf(monthName);
    
    const [executiveType, executiveId] = selectedExecutive.split('_');
    
    navigate(`/admin-dashboard/view-orders?month=${monthIndex + 1}&year=${yearStr}&executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
  };

  const handleTotalOrdersClick = () => {
    if (!canNavigateToOrders) {
      alert('You do not have permission to view order details');
      return;
    }
    const [executiveType, executiveId] = selectedExecutive.split('_');
    
    let queryParams = `executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`;
    
    if (selectedYear !== 'all') {
      queryParams += `&year=${selectedYear}`;
    }
    if (selectedMonth !== null) {
      queryParams += `&month=${selectedMonth + 1}`;
    }
    
    navigate(`/admin-dashboard/view-orders?${queryParams}`);
  };

  const handleTotalProspectsClick = () => {
    if (!canNavigateToProspects) {
      alert('You do not have permission to view prospect details');
      return;
    }
    const [executiveType, executiveId] = selectedExecutive.split('_');
    navigate(`/admin-dashboard/view-prospective?executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
  };

  const handleMonthlyProspectsClick = (monthData) => {
    if (!canNavigateToProspects) {
      alert('You do not have permission to view prospect details');
      return;
    }
    
    const [monthName, yearStr] = monthData.month.split(' ');
    const monthIndex = calendarMonthLabels.indexOf(monthName);
    const year = parseInt(yearStr);
    const [executiveType, executiveId] = selectedExecutive.split('_');
    navigate(`/admin-dashboard/view-prospective?month=${monthIndex + 1}&year=${year}&executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
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

  const getPerformanceColor = (percentage) => {
    if (percentage >= 150) return '#ff69b4';
    if (percentage >= 100) return '#9b59b6';
    if (percentage >= 75) return '#2ecc71';
    if (percentage >= 50) return '#f39c12';
    if (percentage >= 35) return '#f1c40f';
    return '#e74c3c';
  };

  const getYTickFormatter = (data) => {
    if (!data || data.length === 0) return (value) => `₹${value}`;
    const maxValue = Math.max(
      ...data.map(item => Math.max(item.target || 0, item.achieved || 0))
    );
    if (maxValue >= 1000000) {
      return (value) => {
        if (value >= 10000000) return `₹${(value/10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value/100000).toFixed(1)}L`;
        return `₹${(value/1000).toFixed(0)}k`;
      };
    } else if (maxValue >= 100000) {
      return (value) => `₹${(value/100000).toFixed(1)}L`;
    } else if (maxValue >= 10000) {
      return (value) => `₹${(value/1000).toFixed(0)}k`;
    } else {
      return (value) => `₹${value.toLocaleString('en-IN')}`;
    }
  };

  const getYAxisProps = (data) => {
    if (!data || data.length === 0) return { domain: [0, 100000], tickCount: 6 };
    const maxValue = Math.max(
      ...data.map(item => Math.max(item.target || 0, item.achieved || 0))
    );
    const niceMax = Math.ceil(maxValue / 50000) * 50000;
    const tickCount = Math.min(6, Math.max(3, Math.ceil(niceMax / 50000)));
    return {
      domain: [0, niceMax],
      tickCount: tickCount
    };
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const target = payload[0]?.value || 0;
      const achieved = payload[1]?.value || 0;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '280px',
          fontSize: '13px'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: '600', color: '#2c3e50' }}>{label}</p>
          <p style={{ margin: '2px 0', color: '#3498db' }}>Target: {formatCurrency(target)}</p>
          <p style={{ margin: '2px 0', color: '#2ecc71' }}>Achieved (New/Retail): {formatCurrency(achieved)}</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
            ✓ Only New & Retail orders count toward target
          </p>
        </div>
      );
    }
    return null;
  };

  const getChartSubtitle = () => {
    if (!selectedExecutiveObj?.name) {
      return 'Select an executive to view monthly performance';
    }
    const executiveName = selectedExecutiveObj?.name || 'Selected Executive';
    const yearText = selectedYear !== 'all' ? selectedYear : 'All Years';
    const monthText = selectedMonth !== null ? ` - ${calendarMonthLabels[selectedMonth]}` : '';
    return `${executiveName} - Monthly Performance for ${yearText}${monthText}`;
  };

  const renderExecutiveMonthlyChart = () => {
    if (!selectedExecutive) {
      return (
        <div style={styles.noDataText}>
          Please select an executive from the form below to view monthly performance
        </div>
      );
    }
    
    const monthlyData = performanceData?.detailedData?.byMonth || [];
    
    const filteredMonthlyData = monthlyData.filter(monthData => {
      const [monthName, yearStr] = monthData.month.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = calendarMonthLabels.indexOf(monthName);
      
      if (selectedYear !== 'all' && year !== selectedYear) {
        return false;
      }
      if (selectedMonth !== null && monthIndex !== selectedMonth) {
        return false;
      }
      return true;
    });
    
    filteredMonthlyData.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA - dateB;
    });
    
    const chartData = filteredMonthlyData.map(monthData => {
      const [monthName, yearStr] = monthData.month.split(' ');
      const monthIndex = calendarMonthLabels.indexOf(monthName);
      
      return {
        ...monthData,
        displayMonth: `${calendarMonthLabels[monthIndex]} ${yearStr}`,
        targetAmount: monthData.target || 0,
        achievedAmount: monthData.achieved || 0
      };
    });
    
    if (chartData.length === 0) {
      return (
        <div style={styles.noDataText}>
          No performance data available for the selected {selectedYear !== 'all' ? `year ${selectedYear}` : 'period'}
        </div>
      );
    }
    
    const yAxisProps = getYAxisProps(chartData);
    const yTickFormatter = getYTickFormatter(chartData);
    const isSmallScreen = window.innerWidth < 768;
    
    const getBarSize = () => {
      const dataLength = chartData.length;
      if (dataLength <= 6) return 40;
      if (dataLength <= 8) return 35;
      if (dataLength <= 10) return 30;
      if (dataLength <= 12) return 25;
      return 20;
    };
    
    return (
      <div>
        <div style={styles.chartSubtitle}>{getChartSubtitle()}</div>
        <div style={styles.chartWrapper}>
          <div style={{ 
            width: '100%', 
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div style={{ 
              minWidth: isSmallScreen ? '600px' : '100%',
              height: '400px'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  barCategoryGap={isSmallScreen ? "15%" : "20%"}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="displayMonth" 
                    angle={isSmallScreen ? -45 : -45} 
                    textAnchor="end" 
                    height={70} 
                    tick={{ fontSize: isSmallScreen ? 10 : 11 }} 
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={yTickFormatter} 
                    tick={{ fontSize: isSmallScreen ? 10 : 12 }} 
                    domain={yAxisProps.domain} 
                    tickCount={yAxisProps.tickCount} 
                    width={isSmallScreen ? 60 : 80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar 
                    dataKey="targetAmount" 
                    name="Target Amount" 
                    fill="#3498db" 
                    radius={[4, 4, 0, 0]} 
                    barSize={getBarSize()}
                  />
                  <Bar 
                    dataKey="achievedAmount" 
                    name="Achieved (New/Retail)" 
                    fill="#2ecc71" 
                    radius={[4, 4, 0, 0]}
                    barSize={getBarSize()}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hasData ? getPerformanceColor((entry.achievedAmount / entry.targetAmount) * 100) : '#ecf0f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div style={{ 
          textAlign: 'center', 
          marginTop: '10px', 
          fontSize: '12px', 
          color: '#666',
          backgroundColor: '#e8f5e9',
          padding: '8px',
          borderRadius: '6px',
          display: 'inline-block',
          width: 'auto',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          📊 Note: Only <strong>New</strong> and <strong>Retail</strong> client orders count toward target achievement
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: '15px', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 5px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#e74c3c', marginRight: '4px' }}></div><span style={{ fontSize: '11px' }}>0-35%</span></div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 5px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#f1c40f', marginRight: '4px' }}></div><span style={{ fontSize: '11px' }}>35-50%</span></div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 5px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#f39c12', marginRight: '4px' }}></div><span style={{ fontSize: '11px' }}>50-75%</span></div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 5px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#2ecc71', marginRight: '4px' }}></div><span style={{ fontSize: '11px' }}>75-100%</span></div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 5px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#9b59b6', marginRight: '4px' }}></div><span style={{ fontSize: '11px' }}>100-150% (1.0x-1.5x)</span></div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 5px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#ff69b4', marginRight: '4px' }}></div><span style={{ fontSize: '11px' }}>150%+ (1.5x+)</span></div>
        </div>
      </div>
    );
  };

  // Compact Performance Box Component
  const renderPerformanceBox = (percentage) => {
    if (!percentage || percentage <= 0) {
      return (
        <div>
          <div style={styles.performanceBox}>
            <div style={{ ...styles.performanceSegment, width: '100%', backgroundColor: '#ecf0f1' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px', fontWeight: '600', fontSize: '14px', color: '#2c3e50' }}>
            Performance: 0%
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
            const fillWidth = isPartial ? ((percentage - segment.min) / segmentWidth) * 100 : (percentage >= segment.max ? 100 : 0);
            return (
              <div key={index} style={{
                ...styles.performanceSegment,
                width: `${segmentWidth}%`,
                backgroundColor: isActive ? segment.color : '#ecf0f1',
                backgroundImage: isPartial ? `linear-gradient(to right, ${segment.color} 0%, ${segment.color} ${fillWidth}%, #ecf0f1 ${fillWidth}%, #ecf0f1 100%)` : 'none'
              }}>
                {isActive && !isPartial && segment.max <= 150 && (
                  <span>{segment.max === 150 ? '1.5x' : segment.max === 100 ? '1.0x' : `${segment.max}%`}</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: '8px', fontWeight: '600', fontSize: '14px', color: '#2c3e50' }}>
          Performance: {formatPercentage(percentage)}
        </div>
      </div>
    );
  };

  const renderYearFilter = () => {
    return (
      <div style={styles.yearlyFilterContainer}>
        <div style={styles.yearlyFilterGroup}>
          <label htmlFor="year" style={styles.label}>Filter by Year</label>
          <select 
            name="year" 
            value={selectedYear} 
            onChange={handleYearChange} 
            style={styles.select}
          >
            {yearOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        {selectedYear !== 'all' && (
          <div style={styles.yearlyFilterGroup}>
            <label htmlFor="month" style={styles.label}>Filter by Month (Optional)</label>
            <select 
              name="month" 
              value={selectedMonth !== null ? selectedMonth : ''} 
              onChange={handleMonthChange} 
              style={styles.select}
            >
              <option value="">All Months</option>
              {calendarMonthLabels.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  const getYearFilterDisplayText = () => {
    if (selectedYear === 'all') return 'All Years';
    return selectedYear;
  };

  const styles = {
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      borderRadius: '10px',
      boxShadow: '0 0 20px rgba(0,0,0,0.1)'
    },
    heading: {
      color: '#2c3e50',
      textAlign: 'center',
      marginBottom: '25px',
      fontSize: '28px',
      fontWeight: '600'
    },
    formContainer: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      marginBottom: '25px'
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
      transition: 'backgroundColor 0.3s',
      marginTop: '10px',
      width: '100%'
    },
    buttonDisabled: {
      backgroundColor: '#bdc3c7',
      cursor: 'not-allowed'
    },
    resultsContainer: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    },
    resultsTitle: {
      fontSize: '22px',
      marginTop: '0',
      marginBottom: '15px',
      color: '#2c3e50',
      borderBottom: '1px solid #eee',
      paddingBottom: '10px'
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '20px',
      marginTop: '20px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      borderTop: '4px solid #3498db',
      transition: 'transform 0.2s, box-shadow 0.2s',
      minWidth: '0',
      overflow: 'hidden'
    },
    cardTitle: {
      marginTop: '0',
      marginBottom: '12px',
      color: '#34495e',
      fontSize: '16px',
      fontWeight: '600',
      wordWrap: 'break-word'
    },
    cardItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
      paddingBottom: '8px',
      borderBottom: '1px solid #f1f1f1',
      flexWrap: 'wrap',
      gap: '8px'
    },
    clickableCardItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
      paddingBottom: '8px',
      borderBottom: '1px solid #f1f1f1',
      cursor: canNavigateToOrders ? 'pointer' : 'not-allowed',
      transition: 'background-color 0.2s',
      flexWrap: 'wrap',
      gap: '8px',
      opacity: canNavigateToOrders ? 1 : 0.7
    },
    cardLabel: {
      color: '#7f8c8d',
      fontWeight: '500',
      fontSize: '13px',
      flexShrink: 0
    },
    cardValue: {
      fontWeight: '600',
      color: '#2c3e50',
      textAlign: 'right',
      fontSize: '13px',
      wordBreak: 'break-word'
    },
    balanceValue: {
      fontWeight: '600',
      color: overallBalance >= 0 ? '#27ae60' : '#e74c3c',
      textAlign: 'right'
    },
    monthlySection: {
      marginTop: '25px'
    },
    monthlyHeader: {
      fontSize: '18px',
      marginBottom: '15px',
      color: '#2c3e50',
      borderBottom: '1px solid #eee',
      paddingBottom: '10px'
    },
    monthlyGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      gap: '20px'
    },
    monthlyCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      borderTop: '4px solid #2ecc71',
      position: 'relative',
      minWidth: '0',
      overflow: 'hidden'
    },
    performanceBox: {
      width: '100%',
      height: '40px',
      backgroundColor: '#ecf0f1',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      margin: '10px 0',
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
      position: 'relative',
      fontSize: '11px'
    },
    clientBreakdown: {
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      padding: '10px',
      marginTop: '10px',
      border: '1px solid #e9ecef'
    },
    clientBreakdownTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#495057',
      marginBottom: '8px',
      borderBottom: '1px solid #dee2e6',
      paddingBottom: '5px'
    },
    clientBreakdownItem: {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      gap: '8px',
      alignItems: 'center',
      fontSize: '12px',
      padding: '6px 0',
      borderBottom: '1px dotted #e9ecef'
    },
    targetBox: {
      backgroundColor: '#e3f2fd',
      borderRadius: '6px',
      padding: '10px',
      marginBottom: '10px',
      textAlign: 'center'
    },
    targetValue: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1976d2'
    },
    achievedValue: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#4CAF50'
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
      fontWeight: '600',
      minWidth: '60px',
      textAlign: 'center'
    },
    selectedExecutive: {
      marginTop: '10px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px solid #ddd',
      fontSize: '14px'
    },
    yearlyFilterContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '15px',
      marginBottom: '20px'
    },
    yearlyFilterGroup: {
      minWidth: '250px',
      flex: '1'
    },
    resultsHeader: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      marginBottom: '20px'
    },
    yearFilterDisplay: {
      backgroundColor: '#e3f2fd',
      padding: '8px 15px',
      borderRadius: '6px',
      border: '1px solid #1976d2',
      color: '#1976d2',
      fontWeight: '600',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      justifyContent: 'center'
    },
    yearFilterLabel: {
      color: '#1976d2',
      fontSize: '14px',
      fontWeight: '600'
    },
    yearBadge: {
      backgroundColor: '#1976d2',
      color: 'white',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      marginLeft: '8px',
      display: 'inline-block'
    },
    loadingSpinner: {
      border: '3px solid #f3f3f3',
      borderTop: '3px solid #3498db',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      animation: 'spin 1s linear infinite',
      marginRight: '10px',
      display: 'inline-block'
    },
    dateRangeContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    dateInputContainer: {
      flex: '1'
    },
    chartContainer: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      marginBottom: '25px',
      marginTop: '25px'
    },
    chartTitle: {
      fontSize: '22px',
      marginTop: '0',
      marginBottom: '15px',
      color: '#2c3e50',
      borderBottom: '1px solid #eee',
      paddingBottom: '10px',
      textAlign: 'center'
    },
    chartSubtitle: {
      textAlign: 'center',
      color: '#7f8c8d',
      marginBottom: '20px',
      fontSize: '14px'
    },
    chartWrapper: {
      width: '100%',
      position: 'relative'
    },
    noDataText: {
      textAlign: 'center',
      padding: '30px',
      color: '#95a5a6',
      fontSize: '16px',
      fontStyle: 'italic'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'auto'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '95%',
      maxWidth: '1400px',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    },
    modalClose: {
      position: 'absolute',
      top: '10px',
      right: '20px',
      fontSize: '30px',
      cursor: 'pointer',
      color: '#666',
      zIndex: 10,
      background: 'none',
      border: 'none',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Executive Performance Dashboard</h1>

      {/* Info Banner */}
      <div style={{
        backgroundColor: '#e8f5e9',
        borderLeft: '4px solid #4CAF50',
        padding: '10px 16px',
        marginBottom: '20px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '18px' }}>📊</span>
        <div>
          <strong style={{ color: '#2e7d32' }}>Target Calculation:</strong>
          <span style={{ marginLeft: '8px', color: '#555', fontSize: '13px' }}>
            Only <strong style={{ color: '#4CAF50' }}>New</strong> OR <strong style={{ color: '#8BC34A' }}>Retail</strong> client orders count toward target achievement. Advance is only applicable for New & Retail orders.
          </span>
        </div>
      </div>

      <div style={styles.chartContainer}>
        <h2 style={styles.chartTitle}>Monthly Performance Chart</h2>
        {renderExecutiveMonthlyChart()}
      </div>

      <div style={styles.formContainer}>
        <h2 style={styles.formTitle}>Individual Performance Report</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label htmlFor="executive" style={styles.label}>Select Executive *</label>
              <div style={styles.searchContainer}>
                {loadingExecutives ? (
                  <div style={{ padding: '12px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                    <div style={styles.loadingSpinner}></div> Loading executives...
                  </div>
                ) : (
                  <>
                    <input type="text" placeholder="Type executive name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowDropdown(true)} style={styles.searchInput} />
                    {showDropdown && filteredExecutives.length > 0 && (
                      <div style={styles.dropdownList}>
                        {filteredExecutives.map((exec) => {
                          let badgeColor = '#3498db';
                          if (exec.type === 'service') badgeColor = '#2ecc71';
                          if (exec.type === 'account') badgeColor = '#9b59b6';
                          if (exec.type === 'field') badgeColor = '#e74c3c';
                          return (
                            <div key={exec.value} style={{ ...styles.dropdownItem, ...(selectedExecutive === exec.value ? styles.dropdownItemHover : {}) }} onClick={() => { setSelectedExecutive(exec.value); setSearchTerm(exec.name); setShowDropdown(false); }}>
                              <span style={{ flex: 1, marginRight: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exec.name}</span>
                              <span style={{ ...styles.typeBadge, backgroundColor: badgeColor }}>{exec.type}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
              {selectedExecutive && selectedExecutiveObj && (
                <div style={styles.selectedExecutive}>Selected: {selectedExecutiveObj.name} ({selectedExecutiveObj.type})</div>
              )}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date Range (Optional)</label>
              <div style={styles.dateRangeContainer}>
                <div style={styles.dateInputContainer}>
                  <input type="date" name="startDate" value={dateRange.startDate} onChange={handleDateChange} style={styles.input} max={dateRange.endDate || format(new Date(), 'yyyy-MM-dd')} />
                </div>
                <div style={styles.dateInputContainer}>
                  <input type="date" name="endDate" value={dateRange.endDate} onChange={handleDateChange} style={styles.input} min={dateRange.startDate} max={format(new Date(), 'yyyy-MM-dd')} />
                </div>
              </div>
            </div>
          </div>
          <button type="submit" disabled={loading || loadingExecutives || !selectedExecutive} style={{ ...styles.button, ...((loading || loadingExecutives || !selectedExecutive) ? styles.buttonDisabled : {}) }}>
            {loading ? 'Loading...' : (loadingExecutives ? 'Loading Executives...' : 'View Performance Report')}
          </button>
        </form>
      </div>

      {performanceData && (
        <div style={styles.resultsContainer}>
          <div style={styles.resultsHeader}>
            <h2 style={styles.resultsTitle}>
              Performance Report for {performanceData.executiveName}
              {dateRange.startDate && dateRange.endDate && (
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#7f8c8d', display: 'block', marginTop: '5px' }}>
                  ({format(parseISO(dateRange.startDate), 'MMM dd, yyyy')} - {format(parseISO(dateRange.endDate), 'MMM dd, yyyy')})
                </span>
              )}
            </h2>
            <div style={styles.yearFilterDisplay}>
              <span style={styles.yearFilterLabel}>Year:</span>
              <span>{getYearFilterDisplayText()}</span>
              {selectedMonth !== null && <span style={styles.yearBadge}>{calendarMonthLabels[selectedMonth]}</span>}
            </div>
          </div>

          {renderYearFilter()}

          {/* Performance Summary Cards - Compact */}
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Executive Information</h3>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Date of Joining:</span>
                <span style={styles.cardValue}>{performanceData.dateOfJoining ? format(parseISO(performanceData.dateOfJoining), 'MMM dd, yyyy') : 'N/A'}</span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Avg. Monthly Target:</span>
                <span style={styles.cardValue}>{formatCurrency(performanceData.avgMonthlyTarget || 0)}</span>
              </div>
              <div style={{ 
                cursor: 'pointer', 
                backgroundColor: loadingSalary ? '#f8f9fa' : 'transparent', 
                borderRadius: '6px', 
                padding: '8px',
                marginTop: '5px'
              }} onClick={handleSalaryClick}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={styles.cardLabel}>💰 Salary:</span>
                  <span style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '13px' }}>
                    {loadingSalary ? 'Loading...' : getFormattedSalaryInfo().formattedString}
                  </span>
                </div>
                {!loadingSalary && salaryData && salaryData.basicSalary > 0 && (
                  <div style={{ fontSize: '11px', color: '#7f8c8d', textAlign: 'center', padding: '6px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                    Basic: {formatCurrency(salaryData.basicSalary)} | Paid: {formatCurrency(calculateTotalSalaryReceived())}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Activity Metrics</h3>
              <div style={{ ...styles.clickableCardItem, cursor: canNavigateToProspects ? 'pointer' : 'not-allowed', opacity: canNavigateToProspects ? 1 : 0.7 }} onClick={canNavigateToProspects ? handleTotalProspectsClick : null}>
                <span style={styles.cardLabel}>Total Prospects:</span><span style={styles.cardValue}>{performanceData.totalProspects || 0}</span>
              </div>
              <div style={styles.cardItem}><span style={styles.cardLabel}>Total Calls:</span><span style={styles.cardValue}>{performanceData.totalCalls || 0}</span></div>
              <div style={styles.cardItem}><span style={styles.cardLabel}>Total WhatsApp:</span><span style={styles.cardValue}>{performanceData.totalWhatsapp || 0}</span></div>
            </div>

            {/* Target Card - Compact */}
            <div style={{ ...styles.card, borderTop: '4px solid #2ecc71' }}>
              <h3 style={styles.cardTitle}>🎯 Target - {selectedMonth !== null ? calendarMonthLabels[selectedMonth] : 'Yearly'}</h3>
              
              <div style={styles.targetBox}>
                <div style={styles.cardItem}>
                  <span style={styles.cardLabel}>Target:</span>
                  <span style={styles.targetValue}>{formatCurrency(calculateTotals.target)}</span>
                </div>
                <div style={styles.cardItem}>
                  <span style={styles.cardLabel}>Achieved (New/Retail):</span>
                  <span style={styles.achievedValue}>{formatCurrency(calculateTotals.achieved)}</span>
                </div>
              </div>
              
              {renderPerformanceBox(calculateTotals.achievedPercentage)}
              
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Advance (New/Retail only):</span>
                <span style={styles.cardValue}>{formatCurrency(calculateTotals.advance)}</span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Balance:</span>
                <span style={styles.balanceValue}>{formatCurrency(overallBalance)}</span>
              </div>
              <div style={{ ...styles.clickableCardItem, cursor: canNavigateToOrders ? 'pointer' : 'not-allowed', opacity: canNavigateToOrders ? 1 : 0.7 }} onClick={canNavigateToOrders ? handleTotalOrdersClick : null}>
                <span style={styles.cardLabel}>Total Orders:</span>
                <span style={styles.cardValue}>{calculateTotals.totalOrders || '0'}</span>
              </div>
              
              {/* Client Breakdown - Compact */}
              <div style={styles.clientBreakdown}>
                <div style={styles.clientBreakdownTitle}>📋 Client Breakdown:</div>
                
                <div style={styles.clientBreakdownItem}>
                  <span>New & Retail:</span>
                  <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                    {calculateTotals.newRetailCount} orders
                  </span>
                  <span>{formatCurrency(calculateTotals.newRetailAmount)}</span>
                </div>
                
                <div style={styles.clientBreakdownItem}>
                  <span>Agent:</span>
                  <span>{calculateTotals.agentCount} orders</span>
                  <span>{formatCurrency(calculateTotals.agentAmount)}</span>
                </div>
                
                <div style={styles.clientBreakdownItem}>
                  <span>Renewal:</span>
                  <span>{calculateTotals.renewalCount} orders</span>
                  <span>{formatCurrency(calculateTotals.renewalAmount)}</span>
                </div>
                
                <div style={styles.clientBreakdownItem}>
                  <span>Renewal-Agent:</span>
                  <span>{calculateTotals.renewalAgentCount} orders</span>
                  <span>{formatCurrency(calculateTotals.renewalAgentAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.monthlySection}>
            <h3 style={styles.monthlyHeader}>Monthly Breakdown</h3>
            <div style={styles.monthlyGrid}>
              {performanceData?.detailedData?.byMonth
                ?.filter(monthData => {
                  const [monthName, yearStr] = monthData.month.split(' ');
                  const year = parseInt(yearStr);
                  const monthIndex = calendarMonthLabels.indexOf(monthName);
                  
                  if (selectedYear !== 'all' && year !== selectedYear) return false;
                  if (selectedMonth !== null && monthIndex !== selectedMonth) return false;
                  return true;
                })
                .map((monthData, index) => {
                  const [monthName, yearStr] = monthData.month.split(' ');
                  const monthIndex = calendarMonthLabels.indexOf(monthName);
                  const displayMonth = `${calendarMonthLabels[monthIndex]} ${yearStr}`;
                  
                  const target = monthData.target || 0;
                  const achieved = monthData.achieved || 0;
                  const advance = monthData.advance || 0;
                  const percentage = target > 0 ? (achieved / target) * 100 : (achieved > 0 ? 100 : 0);
                  
                  return (
                    <div key={index} style={styles.monthlyCard}>
                      <h3 style={styles.cardTitle}>{displayMonth}</h3>
                      
                      <div style={styles.targetBox}>
                        <div style={styles.cardItem}>
                          <span style={styles.cardLabel}>Target:</span>
                          <span style={styles.targetValue}>{formatCurrency(target)}</span>
                        </div>
                        <div style={styles.cardItem}>
                          <span style={styles.cardLabel}>Achieved (New/Retail):</span>
                          <span style={styles.achievedValue}>{formatCurrency(achieved)}</span>
                        </div>
                      </div>
                      
                      {renderPerformanceBox(percentage)}
                      
                      <div style={styles.cardItem}>
                        <span style={styles.cardLabel}>Advance (New/Retail only):</span>
                        <span style={styles.cardValue}>{formatCurrency(advance)}</span>
                      </div>
                      
                      <div style={{ ...styles.clickableCardItem, cursor: canNavigateToOrders ? 'pointer' : 'not-allowed', opacity: canNavigateToOrders ? 1 : 0.7 }} 
                           onClick={() => canNavigateToOrders ? handleMonthClick({ ...monthData, month: displayMonth }) : null}>
                        <span style={styles.cardLabel}>Total Orders:</span>
                        <span style={styles.cardValue}>{monthData.orders || 0}</span>
                      </div>
                      
                      <div style={{ ...styles.clickableCardItem, cursor: canNavigateToProspects ? 'pointer' : 'not-allowed', opacity: canNavigateToProspects ? 1 : 0.7 }} 
                           onClick={() => canNavigateToProspects ? handleMonthlyProspectsClick({ ...monthData, month: displayMonth }) : null}>
                        <span style={styles.cardLabel}>Prospects:</span>
                        <span style={styles.cardValue}>{monthData.prospects || 0}</span>
                      </div>
                      
                      {/* Client Breakdown - Aligned properly */}
                      <div style={styles.clientBreakdown}>
                        <div style={styles.clientBreakdownTitle}>📋 Client Breakdown:</div>
                        
                        <div style={styles.clientBreakdownItem}>
                          <span>New & Retail:</span>
                          <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                            {monthData.newRetailCount || 0} orders
                          </span>
                          <span>{formatCurrency(monthData.newRetailAmount || 0)}</span>
                        </div>
                        
                        <div style={styles.clientBreakdownItem}>
                          <span>Agent:</span>
                          <span>{monthData.agentCount || 0} orders</span>
                          <span>{formatCurrency(monthData.agentAmount || 0)}</span>
                        </div>
                        
                        <div style={styles.clientBreakdownItem}>
                          <span>Renewal:</span>
                          <span>{monthData.renewalCount || 0} orders</span>
                          <span>{formatCurrency(monthData.renewalAmount || 0)}</span>
                        </div>
                        
                        <div style={styles.clientBreakdownItem}>
                          <span>Renewal-Agent:</span>
                          <span>{monthData.renewalAgentCount || 0} orders</span>
                          <span>{formatCurrency(monthData.renewalAgentAmount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {showSalaryModal && (
        <div style={styles.modalOverlay} onClick={handleCloseSalaryModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={handleCloseSalaryModal}>×</button>
            <SalaryComponent employees={allEmployeesForSalary} onSave={async () => { if (selectedExecutive) { const [executiveType, executiveId] = selectedExecutive.split('_'); const executive = allExecutives.find(exec => exec.value === selectedExecutive); await fetchSalaryData(executiveId, executive?.name); } }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .recharts-wrapper { overflow-x: auto !important; }
          .recharts-surface { min-width: 600px !important; }
          div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default PerformanceView;