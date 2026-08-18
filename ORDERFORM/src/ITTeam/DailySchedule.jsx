import React, { useState } from 'react';
import { format } from 'date-fns';

const EnhancedDailyPlanner = () => {
  const getCurrentTimeFormatted = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return {
      displayTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`,
      timeValue: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      period: period
    };
  };

  const [date, setDate] = useState(new Date());
  const [name, setName] = useState('');
  const [activities, setActivities] = useState([{ 
    ...getCurrentTimeFormatted(),
    name: '', 
    topic: '',
    useTimePicker: false
  }]);
  const [savedPlans, setSavedPlans] = useState([]);

  const addActivityField = () => {
    setActivities([...activities, { 
      ...getCurrentTimeFormatted(),
      name: '', 
      topic: '',
      useTimePicker: false
    }]);
  };

  const toggleTimeInput = (index) => {
    const updatedActivities = [...activities];
    updatedActivities[index].useTimePicker = !updatedActivities[index].useTimePicker;
    setActivities(updatedActivities);
  };

  const handleTimePickerChange = (index, timeValue) => {
    const updatedActivities = [...activities];
    const [hours, minutes] = timeValue.split(':');
    let hourNum = parseInt(hours);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    
    hourNum = hourNum % 12;
    hourNum = hourNum ? hourNum : 12; // Convert 0 to 12
    
    updatedActivities[index].timeValue = timeValue;
    updatedActivities[index].displayTime = `${hourNum.toString().padStart(2, '0')}:${minutes} ${period}`;
    updatedActivities[index].period = period;
    
    setActivities(updatedActivities);
  };

  const handleManualTimeChange = (index, value) => {
    const updatedActivities = [...activities];
    
    // Remove any existing AM/PM to prevent duplication
    const cleanValue = value.replace(/[AP]M/i, '').trim();
    
    // Try to detect if user is typing AM/PM
    const hasAM = value.toLowerCase().includes('am');
    const hasPM = value.toLowerCase().includes('pm');
    const period = hasPM ? 'PM' : hasAM ? 'AM' : updatedActivities[index].period;
    
    // Format as HH:MM
    const timeParts = cleanValue.split(':');
    let hours = timeParts[0] ? parseInt(timeParts[0]) : 0;
    const minutes = timeParts[1] ? timeParts[1].substring(0, 2).padStart(2, '0') : '00';
    
    if (hours > 12) {
      hours = hours % 12;
      if (hours === 0) hours = 12;
    }
    
    updatedActivities[index].displayTime = `${hours.toString().padStart(2, '0')}:${minutes} ${period}`;
    updatedActivities[index].timeValue = `${hours.toString().padStart(2, '0')}:${minutes}`;
    updatedActivities[index].period = period;
    
    setActivities(updatedActivities);
  };

  const handleActivityChange = (index, field, value) => {
    const updatedActivities = [...activities];
    updatedActivities[index][field] = value;
    setActivities(updatedActivities);
  };

  const removeActivity = (index) => {
    if (activities.length > 1) {
      const updatedActivities = [...activities];
      updatedActivities.splice(index, 1);
      setActivities(updatedActivities);
    }
  };

  const saveDailyPlan = () => {
    if (!name.trim() || activities.some(a => !a.displayTime || !a.name)) return;
    
    const newPlan = {
      id: Date.now(),
      date: format(date, 'yyyy-MM-dd'),
      planName: name,
      activities: activities.map(({ displayTime, name, topic }) => ({ 
        time: displayTime, 
        name, 
        topic 
      })),
      createdAt: new Date()
    };
    
    setSavedPlans([newPlan, ...savedPlans]);
    setName('');
    setActivities([{ 
      ...getCurrentTimeFormatted(),
      name: '', 
      topic: '',
      useTimePicker: false
    }]);
  };

  const deletePlan = (id) => {
    setSavedPlans(savedPlans.filter(plan => plan.id !== id));
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Enhanced Daily Planner</h2>
      
      <div style={styles.dateContainer}>
        <label style={styles.label}>Date:</label>
        <input
          type="date"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => setDate(new Date(e.target.value))}
          style={styles.dateInput}
        />
      </div>

      <div style={styles.planForm}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Plan Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Client Meeting Day"
            style={styles.textInput}
          />
        </div>

        <h3 style={styles.sectionHeader}>Daily Activities</h3>
        
        <div style={styles.activitiesContainer}>
          {activities.map((activity, index) => (
            <div key={index} style={styles.activityCard}>
              <div style={styles.activityRow}>
                <div style={styles.timeInputContainer}>
                  <div style={styles.timeInputHeader}>
                    <label style={styles.smallLabel}>Time</label>
                    <button 
                      onClick={() => toggleTimeInput(index)}
                      style={styles.toggleButton}
                      title={activity.useTimePicker ? 'Switch to text input' : 'Switch to time picker'}
                    >
                      {activity.useTimePicker ? '⌨' : '🕒'}
                    </button>
                  </div>
                  {activity.useTimePicker ? (
                    <div style={styles.timePickerWrapper}>
                      <input
                        type="time"
                        value={activity.timeValue}
                        onChange={(e) => handleTimePickerChange(index, e.target.value)}
                        style={styles.timePickerInput}
                        required
                      />
                      <select
                        value={activity.period}
                        onChange={(e) => {
                          const updatedActivities = [...activities];
                          updatedActivities[index].period = e.target.value;
                          updatedActivities[index].displayTime = 
                            `${updatedActivities[index].timeValue} ${e.target.value}`;
                          setActivities(updatedActivities);
                        }}
                        style={styles.periodSelect}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={activity.displayTime}
                      onChange={(e) => handleManualTimeChange(index, e.target.value)}
                      placeholder="HH:MM AM/PM"
                      style={styles.timeInput}
                      required
                    />
                  )}
                </div>
                
                <div style={styles.nameInputContainer}>
                  <label style={styles.smallLabel}>With (Name)</label>
                  <input
                    type="text"
                    value={activity.name}
                    onChange={(e) => handleActivityChange(index, 'name', e.target.value)}
                    placeholder="Person/Company"
                    style={styles.textInput}
                    required
                  />
                </div>
                
                <button 
                  onClick={() => removeActivity(index)}
                  style={styles.removeButton}
                  title="Remove activity"
                >
                  ×
                </button>
              </div>
              
              <div style={styles.topicInputContainer}>
                <label style={styles.smallLabel}>Topic to Discuss</label>
                <input
                  type="text"
                  value={activity.topic}
                  onChange={(e) => handleActivityChange(index, 'topic', e.target.value)}
                  placeholder="Meeting agenda or discussion points"
                  style={styles.textInput}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div style={styles.buttonGroup}>
          <button 
            onClick={addActivityField}
            style={styles.addButton}
          >
            + Add Activity
          </button>
          
          <button 
            onClick={saveDailyPlan}
            style={styles.saveButton}
          >
            Save Daily Plan
          </button>
        </div>
      </div>

      <div style={styles.savedPlans}>
        <h3 style={styles.sectionHeader}>Saved Plans</h3>
        {savedPlans.length === 0 ? (
          <p style={styles.noPlans}>No plans saved yet</p>
        ) : (
          savedPlans.map(plan => (
            <div key={plan.id} style={styles.planCard}>
              <div style={styles.planHeader}>
                <div>
                  <strong>{plan.date}</strong> - {plan.planName}
                </div>
                <button 
                  onClick={() => deletePlan(plan.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
              
              <div style={styles.planActivities}>
                {plan.activities.map((activity, index) => (
                  <div key={index} style={styles.savedActivity}>
                    <div style={styles.savedTime}>{activity.time}</div>
                    <div style={styles.savedDetails}>
                      <div style={styles.savedName}>{activity.name}</div>
                      {activity.topic && <div style={styles.savedTopic}>Topic: {activity.topic}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f7fa',
    borderRadius: '8px'
  },
  header: {
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '24px'
  },
  dateContainer: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center'
  },
  label: {
    marginRight: '15px',
    fontWeight: 'bold',
    color: '#2c3e50',
    minWidth: '90px',
    fontSize: '14px'
  },
  smallLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
    display: 'block',
    fontWeight: '500'
  },
  dateInput: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    width: '200px'
  },
  textInput: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    width: '100%',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  timeInput: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    width: '100%',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  timePickerWrapper: {
    display: 'flex',
    gap: '5px'
  },
  timePickerInput: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    flex: '1',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  periodSelect: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    width: '60px',
    fontSize: '14px'
  },
  timeInputHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  toggleButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0',
    marginLeft: '5px'
  },
  planForm: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  formGroup: {
    marginBottom: '20px'
  },
  sectionHeader: {
    color: '#2c3e50',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
    fontSize: '18px'
  },
  activitiesContainer: {
    marginBottom: '20px'
  },
  activityCard: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '15px',
    border: '1px solid #eee'
  },
  activityRow: {
    display: 'flex',
    gap: '15px',
    marginBottom: '10px',
    alignItems: 'flex-end'
  },
  timeInputContainer: {
    flex: '0 0 180px'
  },
  nameInputContainer: {
    flex: '1 1 auto'
  },
  topicInputContainer: {
    width: '100%'
  },
  removeButton: {
    backgroundColor: '#ffebee',
    color: '#f44336',
    border: 'none',
    borderRadius: '4px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    marginTop: '10px'
  },
  addButton: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    flex: 1
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    flex: 1
  },
  savedPlans: {
    marginTop: '20px'
  },
  noPlans: {
    color: '#999',
    textAlign: 'center',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px dashed #ddd'
  },
  planCard: {
    backgroundColor: 'white',
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  planHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid #f0f0f0'
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    color: '#f44336',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  planActivities: {
    marginTop: '10px'
  },
  savedActivity: {
    display: 'flex',
    gap: '20px',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px dashed #eee',
    alignItems: 'center'
  },
  savedTime: {
    fontWeight: 'bold',
    minWidth: '80px',
    color: '#2c3e50',
    fontSize: '14px'
  },
  savedDetails: {
    flex: 1
  },
  savedName: {
    fontWeight: '500',
    marginBottom: '4px'
  },
  savedTopic: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic'
  }
};

export default EnhancedDailyPlanner;