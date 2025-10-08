// components/EmployeeLogin.jsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { faceRecognition } from '../utils/faceRecognition';

const EmployeeLogin = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [loginResult, setLoginResult] = useState(null);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    initializeSystem();
    return () => {
      stopCamera();
    };
  }, []);

  const initializeSystem = async () => {
    try {
      setLoading(true);
      
      // Load face recognition models
      const modelsLoaded = await faceRecognition.loadModels();
      setModelsLoaded(modelsLoaded);
      
      if (modelsLoaded) {
        // Load employees with face data
        await loadEmployeesWithFaces();
        toast.success('Face recognition system ready');
      } else {
        toast.error('Face recognition not available');
      }
    } catch (error) {
      console.error('System initialization error:', error);
      toast.error('Failed to initialize system');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeesWithFaces = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/employees/with-faces');
      const data = await response.json();
      
      if (data.success) {
        // Convert stored descriptors back to Float32Array
        const employeesWithDescriptors = data.data.map(emp => ({
          ...emp,
          faceDescriptor: new Float32Array(emp.faceDescriptor)
        }));
        
        setEmployees(employeesWithDescriptors);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setLoginResult(null);
      
      // Start face detection loop
      detectFaceLoop();
      
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setFaceDetected(false);
  };

  const detectFaceLoop = async () => {
    if (!cameraActive || !modelsLoaded) return;

    try {
      const detection = await faceRecognition.detectFace(videoRef.current);
      
      if (detection) {
        setFaceDetected(true);
        
        // Draw face landmarks
        const canvas = canvasRef.current;
        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        };
        
        faceRecognition.faceapi.matchDimensions(canvas, displaySize);
        const resizedDetection = faceRecognition.faceapi.resizeResults(detection, displaySize);
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceRecognition.faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);
        
      } else {
        setFaceDetected(false);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }

    if (cameraActive) {
      setTimeout(() => detectFaceLoop(), 100);
    }
  };

  const handleFaceLogin = async () => {
    if (!faceDetected) {
      toast.error('Please position your face in the camera view');
      return;
    }

    try {
      setLoading(true);
      setLoginResult(null);

      const detection = await faceRecognition.detectFace(videoRef.current);
      
      if (!detection) {
        toast.error('No face detected. Please try again.');
        return;
      }

      // Convert descriptor to array for API call
      const descriptorArray = faceRecognition.descriptorToArray(detection.descriptor);

      const response = await fetch('http://localhost:5000/api/auth/employee-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faceDescriptor: descriptorArray,
          timestamp: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLoginResult({
          success: true,
          employee: data.employee,
          message: `Welcome ${data.employee.name}!`
        });
        
        toast.success(`Login successful! Welcome ${data.employee.name}`);
        
        // Redirect to dashboard after delay
        setTimeout(() => {
          window.location.href = '/employee-dashboard';
        }, 3000);
        
      } else {
        setLoginResult({
          success: false,
          message: data.message
        });
        toast.error(data.message);
      }

    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-login">
      <div className="login-header">
        <h1>FLEX Manufacturing</h1>
        <h2>Employee Face Login</h2>
        <p>Look at the camera to log in with face recognition</p>
      </div>

      <div className="system-status">
        <div className={`status-indicator ${modelsLoaded ? 'ready' : 'loading'}`}>
          {modelsLoaded ? '✓ System Ready' : '⏳ Loading Face Recognition...'}
        </div>
        <div className="employees-count">
          {employees.length} employees registered for face login
        </div>
      </div>

      <div className="camera-section">
        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              display: cameraActive ? 'block' : 'none',
              width: '100%',
              borderRadius: '8px'
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }}
          />
          
          {!cameraActive && (
            <div className="camera-placeholder">
              <div className="placeholder-content">
                <div className="camera-icon">📷</div>
                <p>Camera not active</p>
                <p>Click "Start Camera" to begin face recognition</p>
              </div>
            </div>
          )}
        </div>

        <div className="face-status">
          {cameraActive && (
            <div className={`status ${faceDetected ? 'detected' : 'searching'}`}>
              {faceDetected ? '✓ Face Detected - Ready to Login' : '🔍 Searching for face...'}
            </div>
          )}
        </div>
      </div>

      <div className="login-controls">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            disabled={!modelsLoaded || loading}
            className="btn btn-primary btn-large"
          >
            Start Camera
          </button>
        ) : (
          <div className="control-buttons">
            <button
              onClick={handleFaceLogin}
              disabled={!faceDetected || loading}
              className="btn btn-success btn-large"
            >
              {loading ? 'Recognizing...' : 'Login with Face'}
            </button>
            <button
              onClick={stopCamera}
              className="btn btn-secondary"
            >
              Stop Camera
            </button>
          </div>
        )}
      </div>

      {loginResult && (
        <div className={`login-result ${loginResult.success ? 'success' : 'error'}`}>
          <div className="result-header">
            <h3>{loginResult.success ? '✓ Login Successful' : '✗ Login Failed'}</h3>
          </div>
          <div className="result-body">
            <p>{loginResult.message}</p>
            {loginResult.success && loginResult.employee && (
              <div className="employee-details">
                <div className="detail-item">
                  <strong>Name:</strong> {loginResult.employee.name}
                </div>
                <div className="detail-item">
                  <strong>Employee ID:</strong> {loginResult.employee.employeeCode}
                </div>
                <div className="detail-item">
                  <strong>Department:</strong> {loginResult.employee.department}
                </div>
                <div className="detail-item">
                  <strong>Time:</strong> {new Date().toLocaleTimeString()}
                </div>
              </div>
            )}
            {loginResult.success && (
              <div className="redirect-notice">
                <p>Redirecting to dashboard...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="login-help">
        <h4>Need Help?</h4>
        <ul>
          <li>Ensure your face is clearly visible in the camera</li>
          <li>Make sure you have registered your face with the system</li>
          <li>Contact administrator if you face issues</li>
        </ul>
      </div>

      <style jsx>{`
        .employee-login {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          text-align: center;
        }
        
        .login-header {
          margin-bottom: 30px;
        }
        
        .login-header h1 {
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .login-header h2 {
          color: #34495e;
          margin-bottom: 10px;
        }
        
        .system-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .status-indicator {
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .status-indicator.ready {
          background: #d4edda;
          color: #155724;
        }
        
        .status-indicator.loading {
          background: #fff3cd;
          color: #856404;
        }
        
        .employees-count {
          color: #6c757d;
          font-size: 14px;
        }
        
        .camera-section {
          margin-bottom: 20px;
        }
        
        .video-container {
          position: relative;
          width: 100%;
          max-width: 500px;
          margin: 0 auto 15px auto;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .camera-placeholder {
          width: 100%;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border: 2px dashed #dee2e6;
        }
        
        .placeholder-content {
          text-align: center;
          color: #6c757d;
        }
        
        .camera-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        
        .face-status {
          margin-bottom: 15px;
        }
        
        .status {
          padding: 10px 15px;
          border-radius: 20px;
          font-weight: bold;
          display: inline-block;
        }
        
        .status.detected {
          background: #d4edda;
          color: #155724;
        }
        
        .status.searching {
          background: #fff3cd;
          color: #856404;
        }
        
        .login-controls {
          margin-bottom: 20px;
        }
        
        .control-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .btn-large {
          min-width: 160px;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }
        
        .btn-success {
          background: #28a745;
          color: white;
        }
        
        .btn-success:hover:not(:disabled) {
          background: #1e7e34;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }
        
        .login-result {
          margin: 20px 0;
          padding: 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .login-result.success {
          border: 1px solid #c3e6cb;
        }
        
        .login-result.error {
          border: 1px solid #f5c6cb;
        }
        
        .result-header {
          padding: 15px 20px;
          border-bottom: 1px solid #dee2e6;
        }
        
        .login-result.success .result-header {
          background: #d4edda;
          color: #155724;
        }
        
        .login-result.error .result-header {
          background: #f8d7da;
          color: #721c24;
        }
        
        .result-header h3 {
          margin: 0;
        }
        
        .result-body {
          padding: 20px;
          background: white;
        }
        
        .employee-details {
          text-align: left;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
        }
        
        .detail-item {
          margin-bottom: 8px;
          display: flex;
        }
        
        .detail-item strong {
          min-width: 120px;
          color: #495057;
        }
        
        .redirect-notice {
          margin-top: 15px;
          padding: 10px;
          background: #e7f3ff;
          border-radius: 4px;
          color: #004085;
        }
        
        .login-help {
          margin-top: 30px;
          padding: 20px;
          background: #e3f2fd;
          border-radius: 8px;
          text-align: left;
        }
        
        .login-help h4 {
          margin: 0 0 10px 0;
          color: #1565c0;
        }
        
        .login-help ul {
          margin: 0;
          padding-left: 20px;
          color: #424242;
        }
        
        .login-help li {
          margin-bottom: 5px;
        }
        
        @media (max-width: 768px) {
          .employee-login {
            padding: 15px;
          }
          
          .system-status {
            flex-direction: column;
            gap: 10px;
            text-align: center;
          }
          
          .control-buttons {
            flex-direction: column;
          }
          
          .btn-large {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeLogin;