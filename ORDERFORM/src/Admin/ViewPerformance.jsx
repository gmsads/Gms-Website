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

  // Get user role from localStorage
  const userRole = localStorage.getItem('role') || '';
  const isAdmin = userRole === 'Admin';
  const isHR = userRole === 'HR';
  const isSalesManager = userRole === 'Sales Manager';
  const isServiceManager = userRole === 'Service Manager';

  // Check if user has permission to navigate to orders/prospects
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

  // Salary-related states
  const [salaryData, setSalaryData] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [allEmployeesForSalary, setAllEmployeesForSalary] = useState([]);

  // Filters - only one year filter now
  const [yearlyFilter, setYearlyFilter] = useState({
    year: new Date().getFullYear()
  });

  const [manuallyEligibleMonths, setManuallyEligibleMonths] = useState(() => {
    try {
      const saved = localStorage.getItem('executiveIncentiveEligibility');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('executiveIncentiveEligibility', JSON.stringify(manuallyEligibleMonths));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [manuallyEligibleMonths]);

  // Format executives for dropdown
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

  // Get executive monthly data for chart
  const getExecutiveMonthlyData = useMemo(() => {
    if (!performanceData?.detailedData?.byMonth || !selectedExecutive) {
      return [];
    }

    const monthlyData = performanceData.detailedData.byMonth;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const filteredMonthlyData = monthlyData.filter(monthData => {
      const [monthName, yearStr] = monthData.month.split(' ');
      const year = parseInt(yearStr);
      return year === yearlyFilter.year;
    });
    
    const allMonthsData = monthNames.map((month, index) => {
      const monthNum = index + 1;
      const monthData = filteredMonthlyData.find(m => {
        const [mName] = m.month.split(' ');
        const mMonthIndex = new Date(`${mName} 1, 2000`).getMonth();
        return mMonthIndex === index;
      });
      
      return {
        month: month,
        monthNum: monthNum,
        target: monthData?.target || 0,
        achieved: monthData?.achieved || 0,
        percentage: monthData?.percentage || 0,
        orders: monthData?.orders || 0,
        prospects: monthData?.prospects || 0,
        advance: monthData?.advance || 0,
        hasData: !!monthData
      };
    });
    
    return allMonthsData;
  }, [performanceData, selectedExecutive, yearlyFilter.year]);

  const calculateYearlyData = useMemo(() => {
    if (!performanceData || !performanceData.detailedData?.byMonth) {
      return null;
    }
    
    const monthlyData = performanceData.detailedData.byMonth;
    const filteredMonths = monthlyData.filter(monthData => {
      const [_, yearStr] = monthData.month.split(' ');
      const year = parseInt(yearStr);
      return yearlyFilter.year ? year === yearlyFilter.year : true;
    });
    
    const totals = filteredMonths.reduce((acc, month) => ({
      target: acc.target + (month.target || 0),
      achieved: acc.achieved + (month.achieved || 0),
      advance: acc.advance + (month.advance || 0),
      orders: acc.orders + (month.orders || 0),
      prospects: acc.prospects + (month.prospects || 0)
    }), { target: 0, achieved: 0, advance: 0, orders: 0, prospects: 0 });
    
    const percentage = totals.target > 0 
      ? (totals.achieved / totals.target) * 100 
      : totals.achieved > 0 ? 100 : 0;
    
    return {
      target: totals.target,
      achieved: totals.achieved,
      advance: totals.advance,
      totalOrders: totals.orders,
      totalProspects: totals.prospects,
      achievedPercentage: percentage
    };
  }, [performanceData, yearlyFilter.year]);

  const overallBalance = useMemo(() => {
    if (!performanceData) return 0;
    if (calculateYearlyData) {
      return calculateYearlyData.achieved - calculateYearlyData.advance;
    }
    const achieved = performanceData.achieved || 0;
    const advance = performanceData.advance || 0;
    return achieved - advance;
  }, [performanceData, calculateYearlyData]);

  const getCurrentPerformancePercentage = () => {
    if (!performanceData) return 0;
    if (calculateYearlyData) {
      return calculateYearlyData.achievedPercentage || 0;
    }
    return performanceData.achievedPercentage || 0;
  };

  const getTargetAmount = () => {
    if (!performanceData) return 0;
    if (calculateYearlyData) {
      return calculateYearlyData.target || 0;
    }
    return performanceData.target || 0;
  };

  const getAchievedAmount = () => {
    if (!performanceData) return 0;
    if (calculateYearlyData) {
      return calculateYearlyData.achieved || 0;
    }
    return performanceData.achieved || 0;
  };

  const getAdvanceAmount = () => {
    if (!performanceData) return 0;
    if (calculateYearlyData) {
      return calculateYearlyData.advance || 0;
    }
    return performanceData.advance || 0;
  };

  const getTotalOrders = () => {
    if (!performanceData) return 0;
    if (calculateYearlyData) {
      return calculateYearlyData.totalOrders || 0;
    }
    return performanceData.totalOrders || 0;
  };

  const calculateMonthlyBalance = (monthData) => {
    const achieved = monthData.achieved || 0;
    const advance = monthData.advance || 0;
    return achieved - advance;
  };

  const meetsIncentiveCriteria = (monthData) => {
    const targetAchieved = monthData.percentage >= 100;
    const minimumOrders = (monthData.orders || 0) >= 10;
    return targetAchieved || minimumOrders;
  };

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

  const handleToggleEligibility = (monthKey, monthData) => {
    setManuallyEligibleMonths(prev => {
      const newState = { ...prev };
      const executiveName = performanceData?.executiveName || 'unknown';
      const uniqueKey = `${executiveName}_${monthKey}`;
      
      if (!newState[uniqueKey]) {
        const gap = calculateEligibilityGap(monthData);
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
      return newState;
    });
  };

  const isMonthEligible = (monthKey) => {
    if (!performanceData?.executiveName) return false;
    const executiveName = performanceData.executiveName;
    const uniqueKey = `${executiveName}_${monthKey}`;
    return !!manuallyEligibleMonths[uniqueKey];
  };

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

  // Enhanced fetchSalaryData function
  const fetchSalaryData = async (employeeId, employeeName) => {
    if (!employeeId) return;
    
    setLoadingSalary(true);
    try {
      console.log('========== FETCHING SALARY DATA ==========');
      console.log('Employee ID:', employeeId);
      console.log('Employee Name:', employeeName || 'Not provided');
      
      let response;
      try {
        response = await axios.get(`/api/salaries/${employeeId}`);
        console.log('✅ Salary found by ID:', response.data);
      } catch (idError) {
        console.log('❌ Failed to fetch by ID:', idError.response?.status);
        
        if (employeeName) {
          try {
            console.log('Trying to fetch by employee name:', employeeName);
            response = await axios.get(`/api/salaries/${encodeURIComponent(employeeName)}`);
            console.log('✅ Salary found by name:', response.data);
          } catch (nameError) {
            console.log('❌ Failed to fetch by name:', nameError.response?.status);
            throw new Error('Salary not found for this employee');
          }
        } else {
          throw new Error('Salary not found');
        }
      }
      
      if (response && response.data) {
        setSalaryData(response.data);
        console.log('Salary data set successfully:', {
          basicSalary: response.data.basicSalary,
          paymentHistoryCount: response.data.paymentHistory?.length || 0,
          paymentHistory: response.data.paymentHistory
        });
      } else {
        console.log('No salary data in response');
        setSalaryData(null);
      }
      
    } catch (error) {
      console.error('Error fetching salary data:', error);
      setSalaryData(null);
    } finally {
      setLoadingSalary(false);
    }
  };

  // Function to calculate total salary received in selected year
  const calculateTotalSalaryReceived = () => {
    if (!salaryData || !salaryData.paymentHistory) return 0;
    const year = yearlyFilter.year;
    if (!year) return 0;
    const yearStr = year.toString();
    const total = salaryData.paymentHistory
      .filter(payment => payment.month && payment.month.startsWith(yearStr))
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    return total;
  };

  // Function to get formatted salary string
  const getFormattedSalaryInfo = () => {
    console.log('=== getFormattedSalaryInfo Debug ===');
    console.log('salaryData:', salaryData);
    console.log('yearlyFilter.year:', yearlyFilter.year);
    
    if (!salaryData) {
      console.log('No salaryData object');
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }
    
    if (!salaryData.paymentHistory) {
      console.log('No paymentHistory in salaryData');
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }
    
    if (!Array.isArray(salaryData.paymentHistory)) {
      console.log('paymentHistory is not an array');
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }
    
    if (salaryData.paymentHistory.length === 0) {
      console.log('paymentHistory is empty');
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }

    const year = yearlyFilter.year;
    if (!year) {
      console.log('No year selected');
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }

    const yearStr = year.toString();
    console.log('Filtering payments for year:', yearStr);
    console.log('All payments:', salaryData.paymentHistory);
    
    const paymentsInYear = salaryData.paymentHistory.filter(payment => {
      if (!payment.month) return false;
      const matches = payment.month.startsWith(yearStr);
      if (matches) console.log('Matched payment:', payment);
      return matches;
    });
    
    console.log('Payments in year:', paymentsInYear);

    const total = paymentsInYear.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const monthsCount = paymentsInYear.length;

    console.log('Total calculated:', total, 'Months count:', monthsCount);

    if (total === 0 || monthsCount === 0) {
      return { total: 0, monthsCount: 0, formattedString: 'Not Configured' };
    }

    return {
      total: total,
      monthsCount: monthsCount,
      formattedString: `₹${total.toLocaleString('en-IN')} (${monthsCount} month${monthsCount > 1 ? 's' : ''})`
    };
  };

  // Function to get total salary digits count
  const getTotalSalaryDigits = () => {
    const { total } = getFormattedSalaryInfo();
    if (total === 0) return 0;
    return total.toString().replace(/[^0-9]/g, '').length;
  };

  // Function to check if salary is configured
  const isSalaryConfigured = () => {
    const { total, monthsCount } = getFormattedSalaryInfo();
    return salaryData && salaryData.basicSalary && salaryData.basicSalary > 0 && total > 0 && monthsCount > 0;
  };

  // Function to open salary modal
  const handleSalaryClick = () => {
    setShowSalaryModal(true);
  };

  // Function to close salary modal
  const handleCloseSalaryModal = async () => {
    setShowSalaryModal(false);
    // Refresh salary data when modal closes
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
      
      console.log('Fetching performance for:', { executiveType, executiveId, executiveName });
      
      const params = {
        executiveId,
        executiveType,
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      };

      const res = await axios.get('/api/performance', { params });
      setPerformanceData(res.data);

      await fetchSalaryData(executiveId, executiveName);
      
      console.log('Completed fetching all data');

    } catch (error) {
      console.error('Error fetching performance data:', error);
      alert('Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

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

  const handleYearlyFilterChange = (e) => {
    const { name, value } = e.target;
    const newYear = value ? parseInt(value) : '';
    setYearlyFilter(prev => ({
      ...prev,
      [name]: newYear
    }));
  };

  const yearOptions = [
    { value: '', label: 'All Years' },
    ...Array.from({ length: 6 }, (_, i) => ({
      value: new Date().getFullYear() - 4 + i,
      label: (new Date().getFullYear() - 4 + i).toString()
    }))
  ];

  const formatPercentage = (percentage) => {
    if (!percentage || percentage <= 0) return '0%';
    if (percentage >= 100) {
      return `${(percentage / 100).toFixed(1)}%`;
    }
    return `${percentage.toFixed(1)}%`;
  };

  const styles = {
    container: {
      maxWidth: '1200px',
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
      transition: 'transform 0.2s, box-shadow 0.2s',
      minWidth: '0',
      overflow: 'hidden'
    },
    cardTitle: {
      marginTop: '0',
      marginBottom: '15px',
      color: '#34495e',
      fontSize: '18px',
      fontWeight: '600',
      wordWrap: 'break-word'
    },
    cardItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      paddingBottom: '12px',
      borderBottom: '1px solid #f1f1f1',
      flexWrap: 'wrap',
      gap: '8px'
    },
    clickableCardItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      paddingBottom: '12px',
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
      fontSize: '14px',
      flexShrink: 0
    },
    cardValue: {
      fontWeight: '600',
      color: '#2c3e50',
      textAlign: 'right',
      fontSize: '14px',
      wordBreak: 'break-word',
      maxWidth: '60%'
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
      fontSize: '20px',
      marginBottom: '15px',
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
      position: 'relative',
      minWidth: '0',
      overflow: 'hidden'
    },
    performanceBox: {
      width: '100%',
      height: '50px',
      backgroundColor: '#ecf0f1',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      margin: '15px 0',
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
      fontSize: '12px'
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
    incentiveCard: {
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '15px'
    },
    incentiveHeader: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginBottom: '12px'
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
      color: '#28a745',
      textAlign: 'center'
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
      top: '10px',
      right: '10px'
    },
    incentiveEligibilitySection: {
      marginTop: '15px',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px solid #dee2e6'
    },
    gapInfo: {
      fontSize: '13px',
      color: '#dc3545',
      marginBottom: '6px',
      textAlign: 'center',
      fontWeight: '600'
    },
    criteriaMetInfo: {
      fontSize: '14px',
      color: '#28a745',
      marginBottom: '6px',
      textAlign: 'center',
      fontWeight: '600'
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
      fontSize: '16px'
    },
    noDataText: {
      textAlign: 'center',
      padding: '30px',
      color: '#95a5a6',
      fontSize: '16px',
      fontStyle: 'italic'
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
    permissionMessage: {
      fontSize: '12px',
      color: '#e74c3c',
      marginTop: '2px',
      marginBottom: '8px',
      fontStyle: 'italic',
      textAlign: 'right'
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
    if (!canNavigateToOrders) {
      alert('You do not have permission to view order details');
      return;
    }
    const [monthStr, yearStr] = monthData.month.split(' ');
    const monthIndex = new Date(`${monthStr} 1, ${yearStr}`).getMonth();
    const year = parseInt(yearStr);
    const [executiveType, executiveId] = selectedExecutive.split('_');
    navigate(`/admin-dashboard/view-orders?month=${monthIndex + 1}&year=${year}&executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
  };

  const handleTotalOrdersClick = () => {
    if (!canNavigateToOrders) {
      alert('You do not have permission to view order details');
      return;
    }
    const [executiveType, executiveId] = selectedExecutive.split('_');
    navigate(`/admin-dashboard/view-orders?executive=${executiveId}&executiveType=${executiveType}&executiveName=${encodeURIComponent(selectedExecutiveObj?.name || '')}`);
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
          maxWidth: '250px',
          fontSize: '13px'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: '600', color: '#2c3e50' }}>{label}</p>
          <p style={{ margin: '2px 0', color: '#3498db' }}>Target: ₹{target?.toLocaleString('en-IN') || 0}</p>
          <p style={{ margin: '2px 0', color: '#2ecc71' }}>Achieved: ₹{achieved?.toLocaleString('en-IN') || 0}</p>
          <p style={{ margin: '2px 0', color: '#e74c3c' }}>Balance: ₹{(achieved - target)?.toLocaleString('en-IN') || 0}</p>
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
    const yearText = yearlyFilter.year ? yearlyFilter.year.toString() : 'All Years';
    return `${executiveName} - Monthly Performance for ${yearText}`;
  };

  const renderExecutiveMonthlyChart = () => {
    if (!selectedExecutive) {
      return (
        <div style={styles.noDataText}>
          Please select an executive from the form below to view monthly performance
        </div>
      );
    }
    if (getExecutiveMonthlyData.length === 0) {
      return (
        <div style={styles.noDataText}>
          No performance data available for the selected executive
        </div>
      );
    }
    const chartData = getExecutiveMonthlyData;
    const yAxisProps = getYAxisProps(chartData);
    const yTickFormatter = getYTickFormatter(chartData);
    return (
      <div>
        <div style={styles.chartSubtitle}>{getChartSubtitle()}</div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" angle={0} textAnchor="middle" height={50} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={yTickFormatter} tick={{ fontSize: 12 }} domain={yAxisProps.domain} tickCount={yAxisProps.tickCount} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="target" name="Target Amount" fill="#3498db" radius={[4, 4, 0, 0]} />
            <Bar dataKey="achieved" name="Achieved Amount" fill="#2ecc71" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.hasData ? getPerformanceColor(entry.percentage) : '#ecf0f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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

  const renderPerformanceBox = (percentage) => {
    if (!percentage || percentage <= 0) {
      return (
        <div>
          <div style={styles.performanceBox}>
            <div style={{ ...styles.performanceSegment, width: '100%', backgroundColor: '#ecf0f1' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '12px', fontWeight: '600', fontSize: '16px', color: '#2c3e50', wordBreak: 'break-word' }}>
            Current Performance: 0%
            {yearlyFilter.year && <span style={styles.yearBadge}>{yearlyFilter.year}</span>}
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
        <div style={{ textAlign: 'center', marginTop: '12px', fontWeight: '600', fontSize: '16px', color: '#2c3e50', wordBreak: 'break-word' }}>
          Current Performance: {formatPercentage(percentage)}
          {yearlyFilter.year && <span style={styles.yearBadge}>{yearlyFilter.year}</span>}
        </div>
      </div>
    );
  };

  const renderYearlyFilter = () => {
    return (
      <div style={styles.yearlyFilterContainer}>
        <div style={styles.yearlyFilterGroup}>
          <label htmlFor="year" style={styles.label}>Filter Monthly Data by Year</label>
          <select name="year" value={yearlyFilter.year} onChange={handleYearlyFilterChange} style={styles.select}>
            {yearOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const renderIncentiveInfo = () => {
    if (incentiveSummary.totalEligibleMonths === 0) return null;
    return (
      <div style={styles.incentiveCard}>
        <div style={styles.incentiveHeader}>
          <h3 style={styles.incentiveTitle}>🎯 Incentive Summary</h3>
          <div style={styles.incentiveAmount}>{incentiveSummary.totalEligibleMonths} Month(s) Eligible</div>
        </div>
        <div style={{ textAlign: 'center', color: '#856404', fontSize: '14px' }}>
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
    const filteredMonths = sortedMonths.filter(monthData => {
      if (!yearlyFilter.year) return true;
      const [_, yearStr] = monthData.month.split(' ');
      const year = parseInt(yearStr);
      return year === yearlyFilter.year;
    });
    if (filteredMonths.length === 0) {
      return (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#95a5a6', fontSize: '16px', fontStyle: 'italic' }}>
          No monthly data available for {yearlyFilter.year || 'the selected period'}
        </div>
      );
    }
    return filteredMonths.map((monthData, index) => {
      const percentage = monthData.percentage || 0;
      const balance = calculateMonthlyBalance(monthData);
      const monthKey = monthData.month;
      const isManuallyEligible = isMonthEligible(monthKey);
      const meetsCriteria = meetsIncentiveCriteria(monthData);
      const gap = calculateEligibilityGap(monthData);
      return (
        <div key={index} style={styles.monthlyCard}>
          {isManuallyEligible && <span style={styles.eligibleBadge}>✅ Eligible</span>}
          <h3 style={styles.cardTitle}>{monthData.month}</h3>
          {renderPerformanceBox(percentage)}
          <div style={styles.cardItem}><span style={styles.cardLabel}>Target Amount:</span><span style={styles.cardValue}>₹{monthData.target?.toLocaleString('en-IN') || '0'}</span></div>
          <div style={styles.cardItem}><span style={styles.cardLabel}>Achieved Amount:</span><span style={styles.cardValue}>₹{monthData.achieved?.toLocaleString('en-IN') || '0'}</span></div>
          <div style={styles.cardItem}><span style={styles.cardLabel}>Advance Amount:</span><span style={styles.cardValue}>₹{monthData.advance?.toLocaleString('en-IN') || '0'}</span></div>
          <div style={styles.cardItem}><span style={styles.cardLabel}>Balance Amount:</span><span style={{ ...styles.cardValue, color: balance >= 0 ? '#27ae60' : '#e74c3c' }}>₹{balance.toLocaleString('en-IN')}</span></div>
          <div style={{ ...styles.clickableCardItem, cursor: canNavigateToOrders ? 'pointer' : 'not-allowed', opacity: canNavigateToOrders ? 1 : 0.7 }} onClick={() => canNavigateToOrders ? handleMonthClick(monthData) : null}>
            <span style={styles.cardLabel}>Total Orders:</span><span style={styles.cardValue}>{monthData.orders || '0'}</span>
          </div>
          <div style={{ ...styles.clickableCardItem, cursor: canNavigateToProspects ? 'pointer' : 'not-allowed', opacity: canNavigateToProspects ? 1 : 0.7 }} onClick={() => canNavigateToProspects ? handleMonthlyProspectsClick(monthData) : null}>
            <span style={styles.cardLabel}>Monthly Prospects:</span><span style={styles.cardValue}>{monthData.prospects || '0'}</span>
          </div>
          <div style={styles.incentiveEligibilitySection}>
            {isManuallyEligible ? (
              <div style={{ textAlign: 'center', color: '#28a745', fontWeight: '600', fontSize: '14px' }}>✅ Already Marked Eligible for Incentive</div>
            ) : (
              <>
                {gap.meetsTargetCriteria && <div style={styles.criteriaMetInfo}>✅ Target Achieved: {formatPercentage(percentage)} (Required: 100%)</div>}
                {gap.meetsOrderCriteria && <div style={styles.criteriaMetInfo}>✅ Orders Completed: {monthData.orders || 0} (Required: 10)</div>}
                {!meetsCriteria && (
                  <>
                    {!gap.meetsTargetCriteria && <div style={styles.gapInfo}>📊 Need {gap.targetNeeded.toFixed(1)}% more to reach target</div>}
                    {!gap.meetsOrderCriteria && <div style={styles.gapInfo}>📦 Need {gap.ordersNeeded} more orders to reach minimum</div>}
                  </>
                )}
                <button onClick={() => handleToggleEligibility(monthKey, monthData)} disabled={!meetsCriteria} style={{ ...styles.makeEligibleButton, ...(!meetsCriteria ? { backgroundColor: '#6c757d', cursor: 'not-allowed' } : {}) }}>
                  {meetsCriteria ? 'Make Eligible for Incentive' : 'Criteria Not Met'}
                </button>
                <div style={{ fontSize: '12px', color: '#6c757d', textAlign: 'center', marginTop: '8px' }}>Eligibility requires: 100% Target OR 10+ Orders</div>
              </>
            )}
          </div>
        </div>
      );
    });
  };

  const getYearFilterDisplayText = () => {
    if (!yearlyFilter.year) return 'All Years';
    return yearlyFilter.year.toString();
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Executive Performance Dashboard</h1>

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
              <span style={styles.yearFilterLabel}>Year Filter:</span>
              <span>{getYearFilterDisplayText()}</span>
            </div>
          </div>

          {renderYearlyFilter()}
          {renderIncentiveInfo()}

          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Executive Information</h3>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Date of Joining:</span>
                <span style={styles.cardValue}>{performanceData.dateOfJoining ? format(parseISO(performanceData.dateOfJoining), 'MMM dd, yyyy') : 'N/A'}</span>
              </div>
              <div style={styles.cardItem}>
                <span style={styles.cardLabel}>Avg. Monthly Target:</span>
                <span style={styles.cardValue}>₹{(performanceData.avgMonthlyTarget || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ 
  ...styles.cardItem, 
  cursor: 'pointer', 
  backgroundColor: loadingSalary ? '#f8f9fa' : 'transparent', 
  transition: 'all 0.2s', 
  borderRadius: '6px', 
  flexDirection: 'column', 
  alignItems: 'stretch',
  padding: '12px'
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
    <span style={styles.cardLabel}>💰 Salary Received ({yearlyFilter.year || 'All Years'}):</span>
    <span style={{ ...styles.cardValue, fontWeight: 'bold', color: '#27ae60' }}>
      {loadingSalary ? 'Loading...' : (() => { 
        const salaryInfo = getFormattedSalaryInfo(); 
        return salaryInfo.total > 0 ? `${salaryInfo.formattedString}` : 'Not Configured'; 
      })()}
    </span>
  </div>
  
  {!loadingSalary && salaryData && salaryData.basicSalary > 0 && (
    <div 
      style={{ 
        fontSize: '12px', 
        color: '#7f8c8d', 
        textAlign: 'center', 
        marginTop: '5px',
        padding: '8px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        cursor: 'pointer'
      }} 
      onClick={handleSalaryClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>💰 Basic Salary:</span>
        <strong style={{ color: '#27ae60' }}>₹{salaryData.basicSalary.toLocaleString('en-IN')}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <span>📊 Total Paid ({yearlyFilter.year || 'All Years'}):</span>
        <strong style={{ color: '#3498db' }}>₹{calculateTotalSalaryReceived().toLocaleString('en-IN')}</strong>
      </div>
      <div style={{ fontSize: '10px', color: '#95a5a6', marginTop: '6px', textAlign: 'center' }}>
        ⚡ Click to view/edit full salary details
      </div>
    </div>
  )}
  
  {!loadingSalary && !salaryData && (
    <div 
      style={{ 
        fontSize: '12px', 
        color: '#e74c3c', 
        textAlign: 'center', 
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#fee',
        borderRadius: '6px',
        cursor: 'pointer'
      }} 
      onClick={handleSalaryClick}
    >
      ⚠️ No salary record found. Click to configure.
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
              <div style={styles.cardItem}><span style={styles.cardLabel}>Avg. Call Duration:</span><span style={styles.cardValue}>{performanceData.avgCallDuration ? `${parseFloat(performanceData.avgCallDuration).toFixed(1)} mins` : 'N/A'}</span></div>
            </div>

            <div style={{ ...styles.card, borderTop: '4px solid #2ecc71' }}>
              <h3 style={styles.cardTitle}>Overall Performance</h3>
              {renderPerformanceBox(getCurrentPerformancePercentage())}
              <div style={styles.cardItem}><span style={styles.cardLabel}>Total Target:</span><span style={styles.cardValue}>₹{getTargetAmount().toLocaleString('en-IN')}</span></div>
              <div style={styles.cardItem}><span style={styles.cardLabel}>Total Achieved:</span><span style={styles.cardValue}>₹{getAchievedAmount().toLocaleString('en-IN')}</span></div>
              <div style={styles.cardItem}><span style={styles.cardLabel}>Total Advance:</span><span style={styles.cardValue}>₹{getAdvanceAmount().toLocaleString('en-IN')}</span></div>
              <div style={styles.cardItem}><span style={styles.cardLabel}>Balance Amount:</span><span style={styles.balanceValue}>₹{overallBalance.toLocaleString('en-IN')}</span></div>
              <div style={{ ...styles.clickableCardItem, cursor: canNavigateToOrders ? 'pointer' : 'not-allowed', opacity: canNavigateToOrders ? 1 : 0.7 }} onClick={canNavigateToOrders ? handleTotalOrdersClick : null}>
                <span style={styles.cardLabel}>Total Orders:</span><span style={styles.cardValue}>{getTotalOrders() || '0'}</span>
              </div>
            </div>
          </div>

          <div style={styles.monthlySection}>
            <h3 style={styles.monthlyHeader}>Monthly Performance Breakdown for {yearlyFilter.year || 'All Years'}</h3>
            <div style={styles.monthlyGrid}>{renderMonthlyTargets()}</div>
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
          .recharts-wrapper { overflow-x: auto; }
          .recharts-surface { min-width: 500px; }
          div[style*="max-width: 1200px"] { padding: 15px !important; }
          div[style*="padding: 20px"] { padding: 15px !important; }
          h1[style*="font-size: 28px"] { font-size: 24px !important; }
          div[style*="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))"] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .recharts-surface { min-width: 400px; }
          h1[style*="font-size: 28px"] { font-size: 22px !important; }
          div[style*="height: 50px"], div[style*="height: 40px"] { height: 35px !important; }
        }
          // Update the cardItem style in your styles object
cardItem: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
  paddingBottom: '12px',
  borderBottom: '1px solid #f1f1f1',
  flexWrap: 'wrap',
  gap: '8px'
},

// Add this new style for the salary details container
salaryDetailsContainer: {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '12px',
  marginTop: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
},

// Update cardValue to remove max-width restriction
cardValue: {
  fontWeight: '600',
  color: '#2c3e50',
  textAlign: 'right',
  fontSize: '14px',
  wordBreak: 'break-word'
},
      `}</style>
    </div>
  );
};

export default PerformanceView;