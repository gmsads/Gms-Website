import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import './StartDesign.css';

const StartDesign = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const searchParams = new URLSearchParams(location.search);
  const designIdFromUrl = searchParams.get('id');
  const designFromState = location.state?.design;

  // Timer set to 15 minutes (900 seconds)
  const [timer, setTimer] = useState(900);
  const [isRunning, setIsRunning] = useState(false); // Don't start immediately
  const [showReminder, setShowReminder] = useState(false);
  const [showPauseInput, setShowPauseInput] = useState(false);
  const [showTimeUpOptions, setShowTimeUpOptions] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [designDetails, setDesignDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [designCards, setDesignCards] = useState([]);
  const [timeUsedBeforePause, setTimeUsedBeforePause] = useState(0);
  const [statusUpdated, setStatusUpdated] = useState(false);

  // Pause reasons options
  const pauseReasons = [
    'Break',
    'Discussion with client',
    'Technical issue',
    'Network problem',
    'Clarification needed',
    'Other'
  ];

  // Time extension options
  const timeExtensionOptions = [5, 8, 10];

  useEffect(() => {
    fetchDesignerTasks();
  }, []);

  useEffect(() => {
    // Reset state when design changes
    setTimer(900);
    setIsRunning(false);
    setShowReminder(false);
    setShowPauseInput(false);
    setShowTimeUpOptions(false);
    setPauseReason('');
    setTimeUsedBeforePause(0);
    
    // If we have design from state, use it directly
    if (designFromState) {
      setDesignDetails(designFromState);
      setLoading(false);
      setIsRunning(true);
      return;
    }
    
    // If we have an ID from URL but no design from state, fetch it
    if (designIdFromUrl && !designFromState) {
      fetchDesignDetails();
    } else if (!designIdFromUrl && !designFromState) {
      // If no ID and no design, we're in the task list view
      setLoading(false);
    }
  }, [designIdFromUrl, designFromState]);

  const fetchDesignDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/design-requests/${designIdFromUrl}`);
      setDesignDetails(response.data);
      setLoading(false);
      setIsRunning(true);
    } catch (err) {
      setError('Failed to fetch design details');
      setLoading(false);
    }
  };

  const fetchDesignerTasks = async () => {
    try {
      const loggedInUserId = JSON.parse(localStorage.getItem('userData'))?._id;
      const response = await axios.get(`http://localhost:5000/api/design-requests`, {
        params: {
          assignedDesigner: loggedInUserId,
          status: ['in-progress', 'assigned', 'completed'] // Include completed status
        }
      });
      setDesignCards(response.data);
    } catch (err) {
      console.error('Error fetching designer tasks:', err);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval = null;
    
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    // Show reminder at 10 minutes (600 seconds)
    if (timer === 600) {
      setShowReminder(true);
    }

    // Time's up at 0 seconds
    if (timer === 0) {
      setIsRunning(false);
      setShowTimeUpOptions(true);
    }

    return () => clearInterval(interval);
  }, [isRunning, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
    setTimeUsedBeforePause(900 - timer); // Calculate time used
    setShowPauseInput(true);
  };

  const submitPauseReason = async () => {
    if (pauseReason.trim()) {
      try {
        console.log("Submitting pause reason:", pauseReason);
        console.log("Time used before pause:", formatTime(timeUsedBeforePause));
        
        // Update design with pause reason
        const response = await axios.patch(
          `http://localhost:5000/api/design-requests/${designDetails._id}`,
          {
            pauseReason: pauseReason,
            timeUsedBeforePause: formatTime(timeUsedBeforePause)
          },
          {
            timeout: 10000, // 10 second timeout
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log("Pause reason saved successfully:", response.data);
        setShowPauseInput(false);
        
        // If 15 minutes have passed, show completion option
        if (timeUsedBeforePause >= 900) {
          setShowTimeUpOptions(true);
        }
      } catch (err) {
        console.error('Error saving pause reason:', err);
        if (err.response) {
          // Server responded with error status
          console.error('Server error response:', err.response.data);
          alert(`Failed to save pause reason: ${err.response.data.message || 'Server error'}`);
        } else if (err.request) {
          // Request was made but no response received
          console.error('No response received:', err.request);
          alert('Failed to save pause reason: No response from server');
        } else {
          // Other error
          console.error('Error:', err.message);
          alert(`Failed to save pause reason: ${err.message}`);
        }
      }
    }
  };
  
  // Add this function to handle resume
  const handleResumeTimer = async () => {
    try {
      await axios.patch(`http://localhost:5000/api/design-requests/${designDetails._id}`, {
        resumeTimer: true
      });
      
      setIsRunning(true);
      setShowPauseInput(false);
    } catch (err) {
      console.error('Error resuming timer:', err);
      alert('Failed to resume timer. Please try again.');
    }
  };

  const handleStartDesign = (design) => {
    // Use state to pass the design data and navigate
    navigate(`/designer-dashboard/start-design?id=${design._id}`, { state: { design } });
  };

  const handleBackToTasks = () => {
    if (statusUpdated) {
      fetchDesignerTasks(); // Refresh tasks if status was updated
    }
    setDesignDetails(null);
    setStatusUpdated(false);
    // Clear the URL parameter
    navigate('/designer-dashboard/start-design');
  };

  const handleSubmitDesign = async (status) => {
    try {
      // Update design status in backend
      await axios.patch(`http://localhost:5000/api/design-requests/${designDetails._id}`, {
        status: status === 'completed' ? 'completed' : 'in-progress',
        completedAt: status === 'completed' ? new Date() : null
      });
      
      console.log(`Design ${status} for:`, designDetails);
      setStatusUpdated(true);
      alert(`Design ${status === 'completed' ? 'completed and submitted!' : 'marked as not completed.'}`);
      
      if (status === 'completed') {
        // Navigate back to designer dashboard or show success message
        navigate('/designer-dashboard');
      } else {
        // Reset for next task or show options
        setDesignDetails(null);
        setShowTimeUpOptions(false);
        fetchDesignerTasks(); // Refresh tasks to show updated status
      }
    } catch (err) {
      console.error('Error updating design status:', err);
      alert('Failed to update design status. Please try again.');
    }
  };

  const handleRequestExtension = (minutes) => {
    const additionalSeconds = minutes * 60;
    setTimer(additionalSeconds);
    setIsRunning(true);
    setShowTimeUpOptions(false);
    setShowReminder(false);
    alert(`Time extended by ${minutes} minutes!`);
  };

  // Calculate progress percentage for progress bar
  const progressPercentage = ((900 - timer) / 900) * 100;

  // Check if 15 minutes have passed
  const isTimeComplete = (900 - timer) >= 900;

  if (loading) return <div className="loading">Loading design details...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="start-design-container">
      {designDetails ? (
        <div className="design-task-card">
          {/* Back Button */}
          <button onClick={handleBackToTasks} className="back-btn">
            ← Back to Tasks
          </button>
          
          <h2>Design Task: {designDetails.name || 'Untitled Design'}</h2>
          
          <div className="design-info">
            <p><strong>Client:</strong> {designDetails.clientName || designDetails.contactPerson || 'N/A'}</p>
            <p><strong>Business:</strong> {designDetails.businessName}</p>
            <p><strong>Requirements:</strong> {designDetails.requirements}</p>
            <p><strong>Assigned:</strong> {designDetails.requestDate ? format(new Date(designDetails.requestDate), 'PPpp') : 'N/A'}</p>
            <p><strong>Status:</strong> <span className={`status-badge status-${designDetails.status}`}>{designDetails.status}</span></p>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div 
              className="progress-bar"
              style={{width: `${progressPercentage}%`}}
            ></div>
          </div>

          <div className={`timer-display ${timer <= 600 ? 'warning' : ''} ${timer <= 300 ? 'critical' : ''}`}>
            ⏱️ Time Left: {formatTime(timer)}
            {timer < 900 && (
              <span className="time-used">(Time used: {formatTime(900 - timer)})</span>
            )}
          </div>

          {showReminder && (
            <div className="reminder-alert">
              ⏰ 10 minutes left! Please wrap up your design.
            </div>
          )}

          <div className="timer-controls">
            {isRunning && (
              <button onClick={handlePauseTimer} className="pause-btn">
                Pause Timer
              </button>
            )}
            
            {!isRunning && timer > 0 && !showPauseInput && !showTimeUpOptions && (
              <button onClick={handleResumeTimer} className="resume-btn">
                Resume Timer
              </button>
            )}
          </div>

          {showPauseInput && (
            <div className="pause-reason-form">
              <h3>Pause Reason</h3>
              <select
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="reason-select"
              >
                <option value="">Select a reason</option>
                {pauseReasons.map((reason, index) => (
                  <option key={index} value={reason}>{reason}</option>
                ))}
              </select>
              
              {pauseReason === 'Other' && (
                <textarea
                  placeholder="Please specify the reason"
                  className="reason-textarea"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                />
              )}
              
              <div className="time-used-info">
                <p>Time used before pause: {formatTime(timeUsedBeforePause)}</p>
              </div>
              
              <button 
                onClick={submitPauseReason}
                disabled={!pauseReason}
                className="submit-reason-btn"
              >
                Submit Reason
              </button>

              {/* Show completion option only after 15 minutes */}
              {isTimeComplete && (
                <div className="completion-option-pause">
                  <p>15 minutes have passed. You can mark this design as completed.</p>
                  <button 
                    onClick={() => handleSubmitDesign('completed')}
                    className="complete-btn-pause"
                  >
                    ✅ Mark as Completed
                  </button>
                </div>
              )}
            </div>
          )}

          {showTimeUpOptions && (
            <div className="time-up-options">
              <h3>⏰ Time's Up!</h3>
              <p>What would you like to do?</p>
              
              <div className="completion-options">
                <button 
                  onClick={() => handleSubmitDesign('completed')}
                  className="complete-btn"
                >
                  ✅ Submit Completed Design
                </button>
                
                <button 
                  onClick={() => handleSubmitDesign('not-completed')}
                  className="incomplete-btn"
                >
                  ❌ Mark as Not Completed
                </button>
              </div>
              
              <div className="extension-options">
                <h4>Need more time?</h4>
                <div className="extension-buttons">
                  {timeExtensionOptions.map(minutes => (
                    <button
                      key={minutes}
                      onClick={() => handleRequestExtension(minutes)}
                      className="extension-btn"
                    >
                      +{minutes} mins
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="design-tasks-grid">
          <h2>Your Design Tasks</h2>
          {designCards.length === 0 ? (
            <p className="no-tasks">No design tasks assigned to you.</p>
          ) : (
            <div className="cards-container">
              {designCards.map((design) => (
                <div key={design._id} className="design-card">
                  <h3>{design.businessName}</h3>
                  <p><strong>Client:</strong> {design.contactPerson}</p>
                  <p><strong>Requirements:</strong> {design.requirements.substring(0, 50)}{design.requirements.length > 50 ? '...' : ''}</p>
                  <p><strong>Assigned:</strong> {design.requestDate ? format(new Date(design.requestDate), 'PP') : 'N/A'}</p>
                  <p><strong>Status:</strong> <span className={`status-badge status-${design.status}`}>{design.status}</span></p>
                  {design.status !== 'completed' ? (
                    <button
                      onClick={() => handleStartDesign(design)}
                      className="start-design-btn"
                    >
                      {design.status === 'in-progress' ? 'Continue Design' : 'Start Design (15 mins)'}
                    </button>
                  ) : (
                    <button className="completed-btn" disabled>
                      Completed
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StartDesign;