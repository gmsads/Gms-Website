import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";

import { DESIGN_REQUESTS, DESIGNER_NAMES } from "../utils/endpoints";

const ViewDesignRequests = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState("");
  const [designers, setDesigners] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  // New state for month and year filters
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  
  // Toast function
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // Get all 12 months
  const getAllMonths = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, 3, ..., 12]
  };

  // Get years from 2024 to 2030
  const getAllYears = () => {
    return Array.from({ length: 7 }, (_, i) => 2024 + i); // [2024, 2025, 2026, 2027, 2028, 2029, 2030]
  };

  // Get available years from data for reference
  const getAvailableYearsFromData = (designs) => {
    const yearsSet = new Set();
    
    designs.forEach(design => {
      if (design.requestDate) {
        const date = new Date(design.requestDate);
        const year = date.getFullYear();
        yearsSet.add(year);
      }
    });
    
    return Array.from(yearsSet).sort((a, b) => b - a);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [requestsRes, designersRes] = await Promise.all([
          axios.get(DESIGN_REQUESTS),
          axios.get(DESIGNER_NAMES),
        ]);

        console.log("=== DEBUG: FETCHING LATEST DATA ===");
        console.log("Designs count:", requestsRes.data.length);

        // Check specific design that was just assigned
        const recentlyAssigned = requestsRes.data.find(d =>
          d._id === '68e78ee3e25a17136c84ed73' // Use the ID from your logs
        );
        if (recentlyAssigned) {
          console.log("Recently assigned design:", {
            id: recentlyAssigned._id,
            assignedDesigner: recentlyAssigned.assignedDesigner,
            assignedDesignerName: recentlyAssigned.assignedDesignerName,
            status: recentlyAssigned.status
          });
        }

        // Process designers data - FIXED VERSION
        let designersData = [];

        // Your backend returns { success: true, data: [...] }
        if (designersRes.data && designersRes.data.success && Array.isArray(designersRes.data.data)) {
          designersData = designersRes.data.data.map((designer) => ({
            _id: designer._id,
            name: designer.name,
            username: designer.username || "",
          }));
        } else if (Array.isArray(designersRes.data)) {
          // Fallback if it's directly an array
          designersData = designersRes.data.map((designer) => ({
            _id: designer._id,
            name: designer.name,
            username: designer.username || "",
          }));
        }

        console.log("Designers available:", designersData.length);
        console.log("Designers list:", designersData);

        // Check if assigned designers exist in our list
        const assignedDesigns = requestsRes.data.filter(d => d.assignedDesigner);
        assignedDesigns.forEach(design => {
          const designer = designersData.find(d => d._id === design.assignedDesigner);
          console.log(`Design ${design._id}:`, {
            assignedDesigner: design.assignedDesigner,
            assignedDesignerName: design.assignedDesignerName,
            designerFound: !!designer,
            designerName: designer?.name
          });
        });

        setDesigns(requestsRes.data);
        setDesigners(designersData);

      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
        setDesigners([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refresh]);

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${DESIGN_REQUESTS}/${id}`, {
        status: newStatus,
      });
      setRefresh(!refresh);
      showToast("Status updated successfully!", "success");
    } catch (err) {
      console.error("Error updating status:", err);
      showToast("Failed to update status. Please try again.", "error");
    }
  };

  const handleAssignDesigner = async () => {
    if (!selectedDesigner || !currentDesignId) {
      showToast("Please select a designer", "error");
      return;
    }

    try {
      const selectedDesignerObj = designers.find(d => d._id === selectedDesigner);

      console.log("=== DEBUG: ASSIGNING DESIGNER ===");
      console.log("Design ID:", currentDesignId);
      console.log("Selected Designer:", selectedDesignerObj);

      const response = await axios.patch(
        `${DESIGN_REQUESTS}/${currentDesignId}`,
        {
          assignedDesigner: selectedDesigner,
          assignedDesignerName: selectedDesignerObj?.name,
          status: "in-progress",
        }
      );

      console.log("Assignment response:", response.data);

      // Force immediate refresh
      setRefresh(prev => !prev);
      setShowAssignModal(false);
      setSelectedDesigner("");
      showToast("Designer assigned successfully!", "success");

    } catch (err) {
      console.error("Full error:", err);
      console.error("Response data:", err.response?.data);
      showToast(`Assignment failed: ${err.response?.data?.message || err.message}`, "error");
    }
  };

  const filteredDesigns = designs.filter((design) => {
    const matchesFilter = filter === "all" || design.status === filter;
    const matchesSearch =
      design.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      design.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      design.phoneNumber?.includes(searchTerm) ||
      design.requirements?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Month and year filtering
    let matchesDate = true;
    if (design.requestDate) {
      const designDate = new Date(design.requestDate);
      const designMonth = designDate.getMonth() + 1;
      const designYear = designDate.getFullYear();
      
      if (selectedMonth && selectedMonth !== "") {
        matchesDate = matchesDate && designMonth === parseInt(selectedMonth);
      }
      if (selectedYear && selectedYear !== "") {
        matchesDate = matchesDate && designYear === parseInt(selectedYear);
      }
    } else {
      // If no request date and filters are applied, exclude it
      matchesDate = !selectedMonth && !selectedYear;
    }
    
    return matchesFilter && matchesSearch && matchesDate;
  });

  const openAssignModal = (designId) => {
    setCurrentDesignId(designId);
    setShowAssignModal(true);
  };

  // Function to get assigned designer name
  const getAssignedDesignerName = (design) => {
    // Priority 1: Use the stored designer name (this should be set when assigning)
    if (design.assignedDesignerName) {
      return design.assignedDesignerName;
    }

    // Priority 2: Look up designer by ID from our designers list
    if (design.assignedDesigner && designers.length > 0) {
      const designer = designers.find(d => {
        // Handle both string and ObjectId comparisons
        return d._id === design.assignedDesigner ||
          d._id?.toString() === design.assignedDesigner?.toString() ||
          d._id === design.assignedDesigner?._id;
      });

      if (designer) {
        return designer.name;
      }

      // Designer ID exists but not found in our list
      console.warn(`Designer with ID ${design.assignedDesigner} not found in designers list`);
      return `ID: ${design.assignedDesigner}`;
    }

    // No designer assigned
    return "Unassigned";
  };

  // Reset date filters
  const resetDateFilters = () => {
    setSelectedMonth("");
    setSelectedYear("");
  };

  // Get all months and years
  const months = getAllMonths();
  const years = getAllYears();
  // eslint-disable-next-line no-unused-vars
  const availableYearsFromData = getAvailableYearsFromData(designs);

  // Calculate stats for filtered data
  const totalRequests = filteredDesigns.length;
  const pendingRequests = filteredDesigns.filter((d) => d.status === "pending").length;
  const inProgressRequests = filteredDesigns.filter((d) => d.status === "in-progress").length;
  const completedRequests = filteredDesigns.filter((d) => d.status === "completed").length;

  if (loading)
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading design requests...</p>
      </div>
    );

  if (error)
    return (
      <div style={styles.errorContainer}>
        <p>{error}</p>
        <button style={styles.retryButton} onClick={() => setRefresh(!refresh)}>
          Retry
        </button>
      </div>
    );

  return (
    <div style={styles.container}>
      {/* Toast Component */}
      {toast.show && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'success' ? '#4CAF50' : '#f44336'
        }}>
          {toast.message}
        </div>
      )}

      {/* Assign Designer Modal */}
      {showAssignModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Assign Designer</h3>
            <select
              value={selectedDesigner}
              onChange={(e) => setSelectedDesigner(e.target.value)}
              style={styles.modalSelect}
            >
              <option value="">Select Designer</option>
              {designers.length === 0 ? (
                <option disabled>No designers available</option>
              ) : (
                designers.map((designer) => (
                  <option key={designer._id} value={designer._id}>
                    {designer.name} {designer.username ? `(${designer.username})` : ''}
                  </option>
                ))
              )}
            </select>
            <div style={styles.modalButtons}>
              <button
                style={styles.modalCancelButton}
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button
                style={styles.modalConfirmButton}
                onClick={handleAssignDesigner}
                disabled={!selectedDesigner}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <h2 style={styles.heading}>Design Requests</h2>

        <div style={styles.controls}>
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <span style={styles.searchIcon}>🔍</span>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Filter by status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date Filters Section */}
      <div style={styles.dateFilters}>
        <h3 style={styles.dateFiltersTitle}>Filter by Date</h3>
        <div style={styles.dateFilterControls}>
          <div style={styles.dateFilterGroup}>
            <label style={styles.dateFilterLabel}>Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={styles.dateFilterSelect}
            >
              <option value="">All Months</option>
              {months.map(month => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.dateFilterGroup}>
            <label style={styles.dateFilterLabel}>Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={styles.dateFilterSelect}
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {(selectedMonth || selectedYear) && (
            <button
              style={styles.resetDateButton}
              onClick={resetDateFilters}
            >
              Clear Date Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Stats Section */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <h3>Total Requests</h3>
          <p>{totalRequests}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Pending</h3>
          <p>{pendingRequests}</p>
        </div>
        <div style={styles.statCard}>
          <h3>In Progress</h3>
          <p>{inProgressRequests}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Completed</h3>
          <p>{completedRequests}</p>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeadRow}>
              <th style={{ ...styles.th, width: "12%" }}>Executive</th>
              <th style={{ ...styles.th, width: "12%" }}>Business</th>
              <th style={{ ...styles.th, width: "10%" }}>Contact</th>
              <th style={{ ...styles.th, width: "10%" }}>Phone</th>
              <th style={{ ...styles.th, width: "15%" }}>Requirements</th>
              <th style={{ ...styles.th, width: "10%" }}>Request Date</th>
              <th style={{ ...styles.th, width: "10%" }}>Status</th>
              <th style={{ ...styles.th, width: "10%" }}>Assigned To</th>
              <th style={{ ...styles.th, width: "11%" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDesigns.length > 0 ? (
              filteredDesigns.map((design) => (
                <tr key={design._id} style={styles.tableRow}>
                  <td style={styles.td}>{design.executive || "N/A"}</td>
                  <td style={styles.td}>{design.businessName || "N/A"}</td>
                  <td style={styles.td}>{design.contactPerson || "N/A"}</td>
                  <td style={styles.td}>{design.phoneNumber || "N/A"}</td>
                  <td style={styles.td}>
                    <div style={styles.requirementsCell}>
                      {design.requirements || "N/A"}
                    </div>
                  </td>
                  <td style={styles.td}>
                    {design.requestDate
                      ? format(new Date(design.requestDate), "PP")
                      : "N/A"}
                  </td>
                  <td style={styles.td}>
                    {design.status === "completed" ? (
                      <div style={getStatusStyle(design.status)}>
                        Completed
                      </div>
                    ) : (
                      <select
                        value={design.status || "pending"}
                        onChange={(e) => updateStatus(design._id, e.target.value)}
                        style={getStatusStyle(design.status)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    )}
                  </td>
                  <td style={styles.td}>
                    {getAssignedDesignerName(design)}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.assignButton}
                        onClick={() => openAssignModal(design._id)}
                        disabled={design.status === "completed"}
                      >
                        Assign
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={styles.noResults}>
                  No design requests found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Status style helper
const getStatusStyle = (status) => ({
  padding: "6px 12px",
  borderRadius: "20px",
  border: "none",
  fontWeight: "500",
  cursor: status === "completed" ? "default" : "pointer",
  backgroundColor:
    status === "completed"
      ? "#d4edda"
      : status === "in-progress"
        ? "#fff3cd"
        : "#f8d7da",
  color:
    status === "completed"
      ? "#155724"
      : status === "in-progress"
        ? "#856404"
        : "#721c24",
  width: "100%",
  textAlign: "center",
  display: "inline-block",
});

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    margin: "20px",
    maxWidth: "calc(100% - 40px)",
    overflowX: "auto",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "200px",
    color: "#003366",
    fontSize: "18px",
  },
  spinner: {
    border: "4px solid rgba(0, 0, 0, 0.1)",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    borderLeftColor: "#003366",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  errorContainer: {
    color: "red",
    padding: "20px",
    textAlign: "center",
    backgroundColor: "#ffeeee",
    borderRadius: "5px",
    margin: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  retryButton: {
    padding: "8px 16px",
    backgroundColor: "#003366",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#002244",
    },
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "20px",
  },
  heading: {
    color: "#2c3e50",
    margin: "0",
    fontSize: "24px",
    fontWeight: "600",
  },
  controls: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  searchBox: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchInput: {
    padding: "8px 12px 8px 32px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "14px",
    minWidth: "200px",
  },
  searchIcon: {
    position: "absolute",
    left: "10px",
    color: "#777",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    fontSize: "14px",
    color: "#555",
  },
  filterSelect: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "14px",
    minWidth: "150px",
  },
  // New styles for date filters
  dateFilters: {
    marginBottom: "24px",
    padding: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "6px",
    border: "1px solid #e9ecef",
  },
  dateFiltersTitle: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    color: "#495057",
    fontWeight: "600",
  },
  dateFilterControls: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  dateFilterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dateFilterLabel: {
    fontSize: "14px",
    color: "#495057",
    fontWeight: "500",
  },
  dateFilterSelect: {
    padding: "6px 10px",
    borderRadius: "4px",
    border: "1px solid #ced4da",
    fontSize: "14px",
    minWidth: "120px",
  },
  resetDateButton: {
    padding: "6px 12px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#5a6268",
    },
  },
  stats: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  statCard: {
    flex: "1",
    minWidth: "150px",
    padding: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "6px",
    textAlign: "center",
    "& h3": {
      margin: "0 0 8px 0",
      fontSize: "14px",
      color: "#555",
    },
    "& p": {
      margin: "0",
      fontSize: "24px",
      fontWeight: "600",
      color: "#2c3e50",
    },
  },
  tableWrapper: {
    overflowX: "auto",
    borderRadius: "6px",
    border: "1px solid #eee",
    width: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    tableLayout: "fixed",
  },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: "500",
    position: "sticky",
    top: 0,
    backgroundColor: "#003366",
    color: "white",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle",
    wordWrap: "break-word",
  },
  requirementsCell: {
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  },
  noResults: {
    padding: "20px",
    textAlign: "center",
    color: "#777",
    fontStyle: "italic",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  assignButton: {
    padding: "6px 12px",
    backgroundColor: "#2ecc71",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#27ae60",
    },
    "&:disabled": {
      backgroundColor: "#cccccc",
      cursor: "not-allowed",
    },
  },
  modalOverlay: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "1000",
  },
  modalContent: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    width: "400px",
    maxWidth: "90%",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  modalSelect: {
    width: "100%",
    padding: "10px",
    margin: "16px 0",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },
  modalButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "20px",
  },
  modalCancelButton: {
    padding: "8px 16px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#d32f2f",
    },
  },
  modalConfirmButton: {
    padding: "8px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#388E3C",
    },
    "&:disabled": {
      backgroundColor: "#cccccc",
      cursor: "not-allowed",
    },
  },
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "4px",
    color: "white",
    zIndex: 1001,
    animation: "slideIn 0.3s ease-out",
  },
};

// Add CSS animation for toast
const styleSheet = document.styleSheets[0];
const slideInAnimation = `
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;
styleSheet.insertRule(slideInAnimation, styleSheet.cssRules.length);

export default ViewDesignRequests;