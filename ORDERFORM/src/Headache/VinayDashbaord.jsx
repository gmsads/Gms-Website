import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
} from 'chart.js';

import AutoLogout from "../mainpage/AutoLogout";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  ChartJSTooltip,
  ChartJSLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

const SalesDashboard = () => {
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProspects: 0,
    upcomingAppointments: 0,
    completedAppointments: 0
  });
  const [loading, setLoading] = useState(true);
  const [username] = useState('Sales Executive');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [monthlyOrderData, setMonthlyOrderData] = useState([]);
  const [conversionChartData, setConversionChartData] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const isDashboardHome = location.pathname === '/sales-dashboard';

  // Month labels
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Generate year options
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }

  // Mock weekly data
  const mockWeeklyData = {
    0: [5, 8, 6, 7],    // January weeks
    1: [7, 9, 8, 6],    // February weeks
    2: [6, 7, 5, 6],    // March weeks
    3: [4, 5, 3, 4],    // April weeks
    4: [5, 6, 5, 4],    // May weeks
    5: [6, 7, 5, 5, 2], // June weeks (5 weeks)
    6: [8, 9, 7, 6],    // July weeks
    7: [6, 7, 5, 4],    // August weeks
    8: [6, 7, 6, 5],    // September weeks
    9: [5, 6, 5, 4],    // October weeks
    10: [5, 6, 4, 3],   // November weeks
    11: [6, 7, 5, 4]    // December weeks
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Simulate API calls with mock data
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockOrders = [
          { id: 'ORD-1001', status: 'Completed', customer: 'ABC Corp', amount: 2500, date: '2023-05-15' },
          { id: 'ORD-1002', status: 'Pending', customer: 'XYZ Ltd', amount: 1800, date: '2023-05-20' },
          { id: 'ORD-1003', status: 'Completed', customer: 'Global Tech', amount: 3200, date: '2023-06-10' },
          { id: 'ORD-1004', status: 'Cancelled', customer: 'Acme Inc', amount: 1500, date: '2023-06-15' },
          { id: 'ORD-1005', status: 'Completed', customer: 'Tech Solutions', amount: 2800, date: '2023-06-20' },
        ];

        const mockProspects = [
          { id: 'PRS-1001', name: 'New Horizons', status: 'Contacted', value: 5000, date: '2023-06-01' },
          { id: 'PRS-1002', name: 'Future Tech', status: 'Qualified', value: 7500, date: '2023-06-05' },
          { id: 'PRS-1003', name: 'Innovate Inc', status: 'New', value: 3000, date: '2023-06-10' },
          { id: 'PRS-1004', name: 'Digital Wave', status: 'Contacted', value: 4200, date: '2023-06-15' },
        ];

        const mockAppointments = [
          { id: 'APT-1001', customer: 'ABC Corp', date: '2023-06-25', time: '10:00', status: 'Scheduled' },
          { id: 'APT-1002', customer: 'XYZ Ltd', date: '2023-06-26', time: '14:30', status: 'Completed' },
          { id: 'APT-1003', customer: 'Global Tech', date: '2023-06-28', time: '11:00', status: 'Scheduled' },
        ];

        // Mock monthly order data
        const mockMonthlyData = [15, 22, 18, 12, 20, 25, 28, 22, 24, 18, 15, 20];

        // Mock conversion chart data
        const mockConversionChartData = {
          labels: monthLabels,
          prospects: [25, 30, 22, 18, 24, 28, 32, 28, 26, 20, 18, 22],
          orders: [15, 22, 18, 12, 20, 25, 28, 22, 24, 18, 15, 20],
          conversionRates: [60, 73, 82, 67, 83, 89, 88, 79, 92, 90, 83, 91]
        };

        if (isMounted) {
          setOrders(mockOrders);
          setProspects(mockProspects);
          setAppointments(mockAppointments);
          setStats({
            totalOrders: mockOrders.length,
            totalProspects: mockProspects.length,
            upcomingAppointments: mockAppointments.filter(a => a.status === 'Scheduled').length,
            completedAppointments: mockAppointments.filter(a => a.status === 'Completed').length
          });
          setMonthlyOrderData(mockMonthlyData);
          setConversionChartData(mockConversionChartData);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [year, selectedMonth]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/');
  };

  // Chart data
  const orderStatusData = {
    labels: ['Completed', 'Pending', 'Cancelled'],
    datasets: [
      {
        data: [
          orders.filter(o => o.status === 'Completed').length,
          orders.filter(o => o.status === 'Pending').length,
          orders.filter(o => o.status === 'Cancelled').length
        ],
        backgroundColor: ['#4CAF50', '#FFA500', '#FF0000'],
        borderColor: ['#fff', '#fff', '#fff'],
        borderWidth: 1,
      },
    ],
  };

  const orderTrendsData = {
    labels: selectedMonth !== null
      ? ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].slice(
        0, mockWeeklyData[selectedMonth]?.length || 4
      )
      : monthLabels,
    datasets: [
      {
        label: selectedMonth !== null ? 'Weekly Orders' : 'Monthly Orders',
        data: selectedMonth !== null
          ? mockWeeklyData[selectedMonth] || [0, 0, 0, 0]
          : monthlyOrderData,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f4f4f4'
      }}>
        <div>Loading Sales Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <AutoLogout />
      
      {/* Navbar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '60px',
        backgroundColor: '#003366',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 2,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          fontSize: '24px',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '40px',
        }} onClick={toggleSidebar}>
          {sidebarOpen ? '☰' : '≡'}
        </div>
        <div style={{
          background: 'linear-gradient(to right, #ff7e5f, #feb47b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          fontSize: '18px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 'calc(100vw - 200px)',
          textAlign: 'center',
        }}>
          SALES MANAGEMENT DASHBOARD
        </div>
        <div style={{
          marginRight: '30px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          color: '#003366',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontWeight: 'bold',
          fontSize: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '250px' : '0',
        backgroundColor: '#003366',
        color: '#fff',
        overflowX: 'hidden',
        transition: 'width 0.3s ease',
        paddingTop: '20px',
        position: 'fixed',
        top: '60px',
        bottom: 0,
        left: 0,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <NavLink
          to="/sales-dashboard"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
          end
        >
          Dashboard
        </NavLink>
        
        <NavLink
          to="/sales-dashboard/create-order"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Create Order ➕
        </NavLink>
        
        <NavLink
          to="/sales-dashboard/view-orders"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          View All Orders
        </NavLink>
        
        <NavLink
          to="/sales-dashboard/create-prospect"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Create Prospect ➕
        </NavLink>
        
        <NavLink
          to="/sales-dashboard/view-prospects"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          View Prospects
        </NavLink>
        
        <NavLink
          to="/sales-dashboard/create-appointment"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Create Appointment ➕
        </NavLink>
        
        <NavLink
          to="/sales-dashboard/view-appointments"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          View Appointments
        </NavLink>
        
        <NavLink
          to="/sales-dashboard/price-list"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Price List
        </NavLink>
        
        <button
          style={{
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            padding: '12px 25px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: 'auto',
            marginBottom: '20px',
            marginLeft: '25px',
            marginRight: '25px',
            borderRadius: '5px',
            textAlign: 'center',
          }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        marginLeft: sidebarOpen ? '250px' : '0',
        marginTop: '60px',
        padding: '20px',
        transition: 'margin-left 0.3s ease',
        width: '100%',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        backgroundColor: '#f4f4f4',
      }}>
        {isDashboardHome ? (
          <>
            {/* Search and Filter Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <input
                  type="text"
                  placeholder="Search orders, prospects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    minWidth: '250px'
                  }}
                />
                <button style={{
                  padding: '8px 16px',
                  backgroundColor: '#003366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  Search
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <label htmlFor="year-select" style={{
                  fontWeight: 'bold',
                  color: '#003366',
                  fontSize: '14px',
                }}>
                  Year:
                </label>
                <select
                  id="year-select"
                  value={year}
                  onChange={(e) => {
                    setYear(parseInt(e.target.value));
                    setSelectedMonth(null);
                    setSelectedWeek(null);
                  }}
                  style={{
                    padding: '5px',
                    fontSize: '14px',
                    width: '80px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <label htmlFor="month-select" style={{
                  fontWeight: 'bold',
                  color: '#003366',
                  fontSize: '14px',
                }}>
                  Month:
                </label>
                <select
                  id="month-select"
                  value={selectedMonth !== null ? selectedMonth + 1 : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedMonth(value ? parseInt(value) - 1 : null);
                    setSelectedWeek(null);
                  }}
                  style={{
                    padding: '5px',
                    fontSize: '14px',
                    width: '100px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                >
                  <option value="">All Months</option>
                  {monthLabels.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div>Total Orders</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#003366'
                }}>{stats.totalOrders}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>This period</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div>Active Prospects</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#4CAF50'
                }}>{stats.totalProspects}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Potential opportunities</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div>Upcoming Appointments</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#FFA500'
                }}>{stats.upcomingAppointments}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Scheduled meetings</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div>Completed Appointments</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#FF0000'
                }}>{stats.completedAppointments}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Finished meetings</div>
              </div>
            </div>

            {/* First Row of Charts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '15px'
            }}>
              {/* Order Status Overview */}
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '10px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#003366',
                minHeight: '350px',
              }}>
                <div>Order Status {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : ''}</div>
                <div style={{
                  width: '100%',
                  height: '180px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  margin: '15px 0'
                }}>
                  <Doughnut
                    data={orderStatusData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            boxWidth: 15,
                            padding: 15
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const label = context.label || '';
                              const value = context.raw || 0;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = Math.round((value / total) * 100);
                              return `${label}: ${value} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
                <div style={{
                  fontSize: '40px',
                  color: '#002244',
                  marginTop: '10px'
                }}>
                  {stats.totalOrders}
                </div>
              </div>

              {/* Order Trends Chart */}
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    marginBottom: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#003366',
                  }}>
                    {selectedMonth !== null
                      ? `Order Trends - ${monthLabels[selectedMonth]} ${year}`
                      : 'Monthly Order Trends'}
                  </div>
                </div>
                <div style={{
                  height: '250px',
                  position: 'relative',
                  marginBottom: '10px'
                }}>
                  <Bar
                    data={orderTrendsData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) =>
                              `${selectedMonth !== null ? 'Week' : 'Month'} ${context.label}: ${context.raw}`
                          }
                        }
                      },
                      onClick: (event, elements) => {
                        if (elements.length > 0) {
                          if (selectedMonth !== null) {
                            navigate(`/sales-dashboard/view-orders?week=${elements[0].index + 1}&month=${selectedMonth + 1}&year=${year}`);
                          } else {
                            navigate(`/sales-dashboard/view-orders?month=${elements[0].index + 1}&year=${year}`);
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { precision: 0 }
                        }
                      }
                    }}
                  />
                </div>
                {selectedMonth !== null && (
                  <button
                    onClick={() => setSelectedMonth(null)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#003366',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontSize: '12px'
                    }}
                  >
                    View All Months
                  </button>
                )}
              </div>
            </div>

            {/* Conversion Chart */}
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#003366',
                marginBottom: '15px'
              }}>
                Prospect to Order Conversion
              </div>
              <div style={{ height: '300px', position: 'relative' }}>
                {conversionChartData ? (
                  <Line
                    data={{
                      labels: conversionChartData.labels,
                      datasets: [
                        {
                          label: 'Prospects',
                          data: conversionChartData.prospects,
                          borderColor: 'rgba(75, 192, 192, 1)',
                          backgroundColor: 'rgba(75, 192, 192, 0.2)',
                          yAxisID: 'y',
                          borderWidth: 2
                        },
                        {
                          label: 'Orders',
                          data: conversionChartData.orders,
                          borderColor: 'rgba(54, 162, 235, 1)',
                          backgroundColor: 'rgba(54, 162, 235, 0.2)',
                          yAxisID: 'y',
                          borderWidth: 2
                        },
                        {
                          label: 'Conversion Rate (%)',
                          data: conversionChartData.conversionRates,
                          borderColor: 'rgba(255, 99, 132, 1)',
                          backgroundColor: 'rgba(255, 99, 132, 0.2)',
                          yAxisID: 'y1',
                          borderWidth: 2,
                          borderDash: [5, 5]
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        },
                        legend: {
                          position: 'top',
                        }
                      },
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                          title: {
                            display: true,
                            text: 'Count'
                          },
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          title: {
                            display: true,
                            text: 'Conversion Rate (%)'
                          },
                          min: 0,
                          max: 100,
                          grid: {
                            drawOnChartArea: false,
                          },
                        },
                      }
                    }}
                  />
                ) : (
                  <div>Loading conversion data...</div>
                )}
              </div>
            </div>

            {/* Recent Activity Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px'
            }}>
              {/* Recent Orders */}
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#003366'
                  }}>
                    Recent Orders
                  </div>
                  <NavLink to="/sales-dashboard/view-orders" style={{
                    fontSize: '12px',
                    color: '#003366',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}>
                    View All →
                  </NavLink>
                </div>
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{order.id}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{order.customer}</div>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end'
                      }}>
                        <div style={{
                          color: order.status === 'Completed' ? '#4CAF50' : 
                                order.status === 'Pending' ? '#FFA500' : '#FF0000',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}>
                          {order.status}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                          ${order.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#003366'
                  }}>
                    Upcoming Appointments
                  </div>
                  <NavLink to="/sales-dashboard/view-appointments" style={{
                    fontSize: '12px',
                    color: '#003366',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}>
                    View All →
                  </NavLink>
                </div>
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {appointments.filter(a => a.status === 'Scheduled').slice(0, 5).map((appt) => (
                    <div key={appt.id} style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{appt.customer}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(appt.date).toLocaleDateString()} at {appt.time}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 8px',
                        backgroundColor: '#003366',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        Scheduled
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
};

export default SalesDashboard;