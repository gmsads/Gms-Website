// src/pages/Appointments/Appointments.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Appointments.css'; // Optional styling file

const AppointmentStatus = () => {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();
  const executive = localStorage.getItem('userName');

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data } = await axios.get('/api/appointments');
        setAppointments(data.filter(
          appt => appt.executive === executive && appt.status === 'assigned'
        ));
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };
    fetchAppointments();
  }, [executive]);

  return (
    <div className="appointments-container">
      <div className="header">
        <button 
          onClick={() => navigate(-1)}
          className="back-button"
        >
          &larr; Back to Dashboard
        </button>
        <h2>Assigned Appointments</h2>
      </div>
      
      <div className="appointments-list">
        {appointments.map(appt => (
          <div key={appt.id} className="appointment-card">
            <h3>{appt.title}</h3>
            <div className="appointment-details">
              <p><strong>Client:</strong> {appt.clientName}</p>
              <p><strong>Date:</strong> {new Date(appt.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(appt.date).toLocaleTimeString()}</p>
              <p><strong>Status:</strong> <span className="status-badge">{appt.status}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppointmentStatus;