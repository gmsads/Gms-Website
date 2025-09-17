import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ExecutiveDashboard from "../Executive/ExecutiveDashboard";
import ViewOrders from "../Admin/ViewOrders";
import Appointment from "../Executive/Appointment";
import OrderForm from "./OrderForm";
import Pricelist from "../Service/Pricelist";
import ViewAppointments from "../Executive/ViewAppointments";
import Prospective from "./Prospective";
import ViewProspective from "../Admin/Viewprospective";
import DigitalMarketingOrderForm from "../Executive/Digitalform";
import Record from "./Record";
import ViewRecord from "./ViewRecord";
import AutoLogout from "../mainpage/AutoLogout";
import "../Executive/order.css";
import "../app.css";

function Admin() {
  // State for sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState("executive-dashboard");
  
  // State for selected executive
  const [selectedExecutive] = useState(
    localStorage.getItem("userName") || "Executive"
  );
  
  // State for target data
  const [targetData, setTargetData] = useState({
    target: 0,
    achieved: 0,
    formattedTarget: "₹0",
    formattedAchieved: "₹0",
  });
  
  // State for loading status
  const [loading, setLoading] = useState(true);
  
  // State for order number
  const [orderNumber, setOrderNumber] = useState("");
  
  // State for showing order form
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  // State for existing order data
  const [existingOrderData, setExistingOrderData] = useState(null);
  
  // State for loading during search
  const [isLoading, setIsLoading] = useState(false);
  
  // State for search errors
  const [searchError, setSearchError] = useState("");
  
  // State for selected form type
  const [selectedFormType, setSelectedFormType] = useState("order");
  
  // State for showing logout options
  const [showLogoutOptions, setShowLogoutOptions] = useState(false);

  // State for session timer and AutoLogout control
  const [activeDuration, setActiveDuration] = useState("00:00:00");
  const [isSessionActive, setIsSessionActive] = useState(true);
  const timerRef = useRef(null);

  // Get user role from localStorage
  const userRole = localStorage.getItem("userRole") || "executive";
  
  // Ref for logout dropdown
  const logoutRef = useRef(null);

  // Initialize timer on component mount
  useEffect(() => {
    // Set initial login time if not set
    if (!localStorage.getItem('loginTime')) {
      localStorage.setItem('loginTime', new Date().toISOString());
    }

    // Calculate initial duration immediately
    updateDuration();

    // Start the interval timer
    timerRef.current = setInterval(updateDuration, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Function to calculate and update duration
  const updateDuration = () => {
    const storedTime = localStorage.getItem('loginTime');
    if (!storedTime) return;

    const loginTime = new Date(storedTime);
    const now = new Date();
    const diff = now - loginTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
    
    setActiveDuration(`${hours}:${minutes}:${seconds}`);
  };

  // Reset timer function
  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActiveDuration("00:00:00");
    localStorage.removeItem('loginTime');
  };

  // Handle activity selection from dropdown
  const handleActivitySelection = async (activity) => {
    try {
      // Stop the timer for any selection
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Disable AutoLogout by marking session as inactive
      setIsSessionActive(false);

      // Send activity to server
      const userName = localStorage.getItem("userName");
      const userRole = localStorage.getItem("userRole");
      
      await axios.post("/api/log-activity", {
        username: userName,
        role: userRole,
        activityType: activity === "Logout" ? "logout" : "break",
        reason: activity,
        loginTime: localStorage.getItem('loginTime'),
        duration: activeDuration
      });

      // Only clear storage and reset timer for Logout
      if (activity === "Logout") {
        resetTimer();
        localStorage.clear();
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error during activity selection:", error);
      if (activity === "Logout") {
        resetTimer();
        window.location.href = "/";
      }
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close logout dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target)) {
        setShowLogoutOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch target data
  useEffect(() => {
    const fetchTargetData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/executive/${selectedExecutive}`);
        const data = response.data;

        let totalTarget = 0;
        let totalAchieved = 0;

        if (Array.isArray(data)) {
          data.forEach((order) => {
            if (order.target) totalTarget = parseFloat(order.target) || 0;
            if (order.rows) {
              order.rows.forEach((row) => {
                totalAchieved += parseFloat(row.total || 0);
              });
            }
          });
        } else if (data && typeof data === "object") {
          if (data.target) totalTarget = parseFloat(data.target) || 0;
          if (data.rows) {
            data.rows.forEach((row) => {
              totalAchieved += parseFloat(row.total || 0);
            });
          }
        }

        setTargetData({
          target: totalTarget,
          achieved: totalAchieved,
          formattedTarget: `₹${totalTarget.toLocaleString("en-IN")}`,
          formattedAchieved: `₹${totalAchieved.toLocaleString("en-IN")}`,
        });
      } catch (error) {
        console.error("Error fetching target data:", error);
        setTargetData({
          target: 100000,
          achieved: 0,
          formattedTarget: "₹100,000",
          formattedAchieved: "₹0",
        });
      } finally {
        setLoading(false);
      }
    };

    if (selectedExecutive) {
      fetchTargetData();
      const interval = setInterval(fetchTargetData, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedExecutive]);

  // Get profile initials
  const getProfileInitials = (name) =>
    name
      .split(" ")
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");

  // Calculate target percentage
  const targetPercentage =
    targetData.target > 0
      ? Math.min(
          100,
          Math.round((targetData.achieved / targetData.target) * 100)
        )
      : 0;

  // Handle search
  const handleSearch = async () => {
    if (orderNumber.length !== 10) {
      setSearchError("Please enter exactly 10 digits");
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      if (selectedFormType === "order") {
        const response = await axios.get(`/api/by-phone?phone=${orderNumber}`);

        if (response.data) {
          setShowOrderForm(true);

          if (response.data.order) {
            setExistingOrderData(response.data.order);
          } else {
            setExistingOrderData(null);
          }
        }
      } else {
        setShowOrderForm(true);
        setExistingOrderData(null);
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status === 404 &&
        selectedFormType === "order"
      ) {
        setShowOrderForm(true);
        setExistingOrderData(null);
      } else {
        console.error("Search failed:", error);
        setSearchError(
          error.response?.data?.message || "Failed to search. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get progress gradient color
  const getProgressGradient = (percentage) => {
    if (percentage <= 30) return "linear-gradient(to right, #ff4e50, #ff0000)";
    if (percentage <= 50) return "linear-gradient(to right, #ffa751, #ff6a00)";
    if (percentage <= 80)
      return "linear-gradient(to right, rgb(32, 210, 118), rgb(111, 192, 141))";
    return "linear-gradient(to right, rgb(16, 231, 34), rgb(11, 222, 25))";
  };

  // Get blink class for progress
  const getBlinkClass = (percentage) => {
    return percentage < 100 ? "blink-progress" : "";
  };

  return (
    <div className="app-container">
      {isSessionActive && <AutoLogout />}
      
      {/* Navbar */}
      <div className="navbar">
        <button
          className="toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        
        <h1
          className="navbar-title"
          style={{
            background: "linear-gradient(to right, #4facfe, #00f2fe)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome {selectedExecutive}
        </h1>

        <div className="navbar-right">
          {/* Professional Session Timer Card */}
          <div className="session-timer-card">
            <div className="timer-icon-container">
              <svg className="timer-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
              </svg>
            </div>
            <div className="timer-content">
              <div className="timer-label">Active Session</div>
              <div className="timer-value">{activeDuration}</div>
            </div>
          </div>

          <div
            className="target-display blink"
            title={`${targetPercentage}% achieved (${targetData.formattedAchieved} / ${targetData.formattedTarget})`}
          >
            <div className="target-header">
              <span className="target-icon">🎯 Target:</span>
            </div>
            <div className="target-progress-container">
              <span className="target-text">
                {loading
                  ? "Loading..."
                  : `${targetData.formattedAchieved} / ${targetData.formattedTarget}`}
              </span>
              <div className="progress-bar">
                {!loading && (
                  <div
                    className={`progress-fill ${getBlinkClass(
                      targetPercentage
                    )}`}
                    style={{
                      width: `${targetPercentage}%`,
                      backgroundImage: getProgressGradient(targetPercentage),
                    }}
                  ></div>
                )}
              </div>
            </div>
          </div>

          <div className="profile-icon" title={selectedExecutive}>
            <span className="profile-icon-symbol">
              {getProfileInitials(selectedExecutive)}
            </span>
          </div>

          <div ref={logoutRef} className="logout-container">
            <button 
              className="logout-btn" 
              onClick={() => setShowLogoutOptions(!showLogoutOptions)}
            >
              Logout
            </button>
            {showLogoutOptions && (
              <div className="logout-options-dropdown">
                <button onClick={() => handleActivitySelection("Short Break")}>
                  Short Break
                </button>
                <button onClick={() => handleActivitySelection("Team Meeting")}>
                  Team Meeting
                </button>
                <button onClick={() => handleActivitySelection("Client Meeting")}>
                  Client Meeting
                </button>
                <button onClick={() => handleActivitySelection("Lunch Break")}>
                  Lunch Break
                </button>
                <button onClick={() => handleActivitySelection("Logout")}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-content">
          <div className="nav-menu">
            {[
              { key: "executive-dashboard", icon: "🏠", text: "Dashboard" },
              { key: "record", icon: "📊", text: "Performance Record" },
              { key: "viewRecord", icon: "📈", text: "View Records" }, 
              { key: "order", icon: "📝", text: "Create Order ➕" },
              { key: "viewOrders", icon: "📋", text: "View Orders" },
              { key: "appointment", icon: "📅", text: "Create Appointment ➕" },
              { key: "viewAppointments", icon: "📂", text: "View Appointments" },
              { key: "prospective", icon: "🔍", text: "Create Prospects ➕" },
              { key: "viewProspects", icon: "👁️", text: "View Prospects" },
              { key: "price-list", icon: "💰", text: "Price List" },
            ].map(({ key, icon, text }) => (
              <div
                key={key}
                className={`nav-item ${activeTab === key ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(key);
                  if (key === "order") {
                    setShowOrderForm(false);
                    setOrderNumber("");
                  }
                }}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-text">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${sidebarOpen ? "" : "expanded"}`}>
        <div className="form-container">
          {activeTab === "executive-dashboard" && (
            <>
              <ExecutiveDashboard />
            </>
          )}

          {activeTab === "record" && <Record />}
          {activeTab === "appointment" && <Appointment />}
          {activeTab === "viewOrders" && <ViewOrders userRole={userRole} />}
          {activeTab === "price-list" && <Pricelist />}
          {activeTab === "viewAppointments" && <ViewAppointments />}
          {activeTab === "prospective" && <Prospective />}
          {activeTab === "viewProspects" && <ViewProspective />}
          {activeTab === "viewRecord" && <ViewRecord />}

          {activeTab === "order" && !showOrderForm && (
            <div className="phone-search-container">
              <div className="phone-search-box">
                <h3>Enter Phone Number:</h3>
                <div className="form-group">
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*$/.test(val) && val.length <= 10) {
                        setOrderNumber(val);
                        if (searchError) setSearchError("");
                      }
                    }}
                    placeholder="10 digit phone number"
                    maxLength={10}
                  />
                </div>

                <div className="form-type-selector">
                  <label>
                    <input
                      type="radio"
                      name="formType"
                      value="order"
                      checked={selectedFormType === "order"}
                      onChange={() => setSelectedFormType("order")}
                    />
                    Order Form
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="formType"
                      value="Digitalform"
                      checked={selectedFormType === "Digitalform"}
                      onChange={() => setSelectedFormType("Digitalform")}
                    />
                    Digital Marketing Form
                  </label>
                </div>

                {searchError && (
                  <div className="error-message">{searchError}</div>
                )}
                <button
                  onClick={handleSearch}
                  disabled={isLoading || orderNumber.length !== 10}
                  className="search-button"
                >
                  {isLoading
                    ? "Searching..."
                    : selectedFormType === "order"
                    ? "Search Orders"
                    : "Create Digital Order"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "order" &&
            showOrderForm &&
            selectedFormType === "order" && (
              <OrderForm
                orderNumber={orderNumber}
                existingData={existingOrderData}
                onNewOrder={() => setExistingOrderData(null)}
                onBack={() => setShowOrderForm(false)}
                onSuccess={() => {
                  setActiveTab("executive-dashboard");
                  setShowOrderForm(false);
                }}
              />
            )}

          {activeTab === "order" &&
            showOrderForm &&
            selectedFormType === "Digitalform" && (
              <div>
                <button
                  onClick={() => setShowOrderForm(false)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginBottom: "20px",
                  }}
                >
                  Back
                </button>
                <DigitalMarketingOrderForm />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default Admin;