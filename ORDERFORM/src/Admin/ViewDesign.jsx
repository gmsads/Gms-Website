import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  // Fetch design requests and designers
  // In your useEffect where you fetch data:
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [requestsRes, designersRes] = await Promise.all([
          axios.get(DESIGN_REQUESTS),
          axios.get(DESIGNER_NAMES),

          // axios.get('/api/designers?active=true') // Only fetch active designers
        ]);

        // Process designers data according to your API response
        const designersData = Array.isArray(designersRes.data.data)
          ? designersRes.data.data.map((designer) => ({
            _id: designer._id,
            name: designer.name,
            username: designer.username || "", // Handle optional username
          }))
          : [];

        setDesigns(requestsRes.data);
        setDesigners(designersData);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
        setDesigners([]); // Set empty array on error
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
      setRefresh(!refresh); // Refresh data after update
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status. Please try again.");
    }
  };
  const handleAssignDesigner = async () => {
    if (!selectedDesigner || !currentDesignId) {
      alert("Please select a designer");
      return;
    }
  
    try {
      const response = await axios.patch(
        `${DESIGN_REQUESTS}/${currentDesignId}`,
        {
          assignedDesigner: selectedDesigner,
          assignedDesignerName: designers.find(d => d._id === selectedDesigner)?.name,
          status: "in-progress",
        }
      );
  
      setRefresh(!refresh);
      setShowAssignModal(false);
      alert("Designer assigned successfully!");
      
    } catch (err) {
      console.error("Full error:", err);
      console.error("Response data:", err.response?.data);
      alert(`Assignment failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredDesigns = designs.filter((design) => {
    const matchesFilter = filter === "all" || design.status === filter;
    const matchesSearch =
      design.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      design.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      design.phoneNumber?.includes(searchTerm) ||
      design.requirements?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleViewDetails = (designId) => {
    navigate(`/admin-dashboard/design-details/${designId}`);
  };

  const openAssignModal = (designId) => {
    setCurrentDesignId(designId);
    setShowAssignModal(true);
  };

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
                    {designer.name} ({designer.username})
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

      <div style={styles.tableWrapper}>
      <table style={styles.table}>
  <thead>
    <tr style={styles.tableHeadRow}>
      <th style={{ ...styles.th, width: "10%" }}>Order No</th>
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
          <td style={styles.td}>{design.order?.orderNo || "N/A"}</td>
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
            <select
              value={design.status || "pending"}
              onChange={(e) => updateStatus(design._id, e.target.value)}
              style={getStatusStyle(design.status)}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </td>
          <td style={styles.td}>
            {design.assignedDesigner
              ? designers.find((d) => d._id === design.assignedDesigner)
                  ?.name || "Unknown"
              : "Unassigned"}
          </td>
          <td style={styles.td}>
            <div style={styles.actionButtons}>
              <button
                style={styles.viewButton}
                onClick={() => handleViewDetails(design._id)}
              >
                View
              </button>
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
        <td colSpan="10" style={styles.noResults}>
          No design requests found matching your criteria
        </td>
      </tr>
    )}
  </tbody>
</table>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <h3>Total Requests</h3>
          <p>{designs.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Pending</h3>
          <p>{designs.filter((d) => d.status === "pending").length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>In Progress</h3>
          <p>{designs.filter((d) => d.status === "in-progress").length}</p>
        </div>
        <div style={styles.statCard}>
          <h3>Completed</h3>
          <p>{designs.filter((d) => d.status === "completed").length}</p>
        </div>
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
  cursor: "pointer",
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
  tableWrapper: {
    overflowX: "auto",
    borderRadius: "6px",
    border: "1px solid #eee",
    marginBottom: "24px",
    width: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    tableLayout: "fixed", // Ensures consistent column widths
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
    wordWrap: "break-word", // Allows text to wrap within cells
  },
  requirementsCell: {
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block", // Helps with text overflow
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
  viewButton: {
    padding: "6px 12px",
    backgroundColor: "#3498db",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: "#2980b9",
    },
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
  stats: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
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
};

export default ViewDesignRequests;
