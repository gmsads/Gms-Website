/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import axios from "axios";

const ViewRecord = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const executiveName = localStorage.getItem("userName") || "Executive";

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/reports/executive-records", {
        params: {
          executive: executiveName
        }
      });
      setRecords(response.data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch records:", err);
      setError("Failed to load records. Please try again.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px" }}>{executiveName}'s Performance Records</h2>

      {error && <div style={{ color: "#d32f2f", padding: "10px", marginBottom: "20px", backgroundColor: "#fdecea", borderRadius: "4px" }}>
        {error}
      </div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>Loading records...</div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>No records found</div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Date</th>
                <th style={tableHeaderStyle}>Executive</th>
                <th style={tableHeaderStyle}>Total Calls</th>
                <th style={tableHeaderStyle}>Follow Ups</th>
                <th style={tableHeaderStyle}>WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "white" : "#f9f9f9" }}>
                  <td style={tableCellStyle}>{formatDate(record.date)}</td>
                  <td style={tableCellStyle}>{record.executiveName}</td>
                  <td style={tableCellStyle}>{record.totalCalls}</td>
                  <td style={tableCellStyle}>{record.followUps}</td>
                  <td style={tableCellStyle}>{record.whatsapp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Style objects to keep JSX clean
const tableHeaderStyle = {
  border: "1px solid black",
  padding: "12px",
  textAlign: "left",
  backgroundColor: "skyblue",
  position: "sticky",
  top: "0"
};

const tableCellStyle = {
  border: "1px solid black",
  padding: "12px",
  textAlign: "left"
};

export default ViewRecord;