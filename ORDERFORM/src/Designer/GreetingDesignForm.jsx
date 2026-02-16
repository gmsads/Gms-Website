import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const GreetingDesignForm = ({ onDesignAdded }) => {
  const [formData, setFormData] = useState({
    occasion: '',
    title: '',
    description: '',
    scheduledDate: '',
    category: 'festival',
    tags: '',
    isActive: true
  });
  
  const [designFile, setDesignFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  
  // Camera/File refs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [stream, setStream] = useState(null);

  // Predefined occasions
  const occasionCategories = {
    festival: [
      'Diwali', 'Holi', 'Dussehra', 'Ganesh Chaturthi', 'Navratri',
      'Durga Puja', 'Eid', 'Christmas', 'New Year', 'Makar Sankranti',
      'Raksha Bandhan', 'Pongal', 'Onam', 'Gurpurab', 'Good Friday',
      'Ramadan', 'Bakrid'
    ],
    special: [
      'Birthday', 'Anniversary', 'Marriage Anniversary', 'Business Anniversary',
      'Achievement', 'Thank You', 'Welcome', 'Promotion', 'Retirement'
    ],
    seasonal: [
      'Spring', 'Summer', 'Monsoon', 'Autumn', 'Winter',
      'Valentine\'s Day', 'Mother\'s Day', 'Father\'s Day',
      'Women\'s Day', 'Teachers Day'
    ],
    corporate: [
      'Quarter End', 'Year End', 'Budget Approval', 'Project Launch',
      'Team Success', 'Client Appreciation'
    ]
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [stream, previewUrl]);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  // Handle file selection from gallery
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('Please select an image file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage('File size should be less than 10MB', 'error');
      return;
    }

    setDesignFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Start camera
  const startCamera = async () => {
    try {
      setShowCameraModal(true);
      setMessage('');

      const constraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      showMessage('Cannot access camera. Please check permissions.', 'error');
      setShowCameraModal(false);
    }
  };

  // Capture design from camera
  const captureDesign = () => {
    if (!videoRef.current || !canvasRef.current) {
      showMessage('Camera not ready', 'error');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        showMessage('Camera not ready. Please try again.', 'error');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().getTime();
          const file = new File(
            [blob],
            `greeting_${timestamp}.jpg`,
            { type: 'image/jpeg' }
          );

          setDesignFile(file);
          setPreviewUrl(URL.createObjectURL(blob));
          stopCamera();
          setShowCameraModal(false);
          showMessage('Design captured successfully!');
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error capturing design:', error);
      showMessage('Error capturing design', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const closeCamera = () => {
    stopCamera();
    setShowCameraModal(false);
  };

  const triggerCamera = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
    
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      startCamera();
    }
  };

  const removeDesign = () => {
    setDesignFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!designFile) {
      showMessage('Please upload a design image', 'error');
      return;
    }

    if (!formData.occasion || !formData.scheduledDate) {
      showMessage('Please select occasion and scheduled date', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    showMessage('Uploading to Cloudinary...', 'info');

    try {
      const submitData = new FormData();
      
      submitData.append('design', designFile);
      submitData.append('occasion', formData.occasion);
      submitData.append('title', formData.title || formData.occasion);
      submitData.append('description', formData.description);
      submitData.append('scheduledDate', formData.scheduledDate);
      submitData.append('category', formData.category);
      submitData.append('tags', formData.tags);
      submitData.append('isActive', formData.isActive);
      submitData.append('uploadedBy', localStorage.getItem('userId') || 'designer');
      submitData.append('uploaderName', localStorage.getItem('userName') || 'Designer');

      const response = await axios.post(`${API_BASE_URL}/greetings/designs`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        showMessage('✅ Design uploaded to Cloudinary successfully!');
        
        setFormData({
          occasion: '',
          title: '',
          description: '',
          scheduledDate: '',
          category: 'festival',
          tags: '',
          isActive: true
        });
        removeDesign();
        
        if (onDesignAdded) {
          onDesignAdded(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error uploading design:', error);
      showMessage(error.response?.data?.message || 'Error uploading design', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCategoryChange = (category) => {
    setFormData({ ...formData, category, occasion: '' });
  };

  return (
    <div className="greeting-design-form">
      {/* Camera Modal */}
      {showCameraModal && (
        <div className="camera-modal-overlay">
          <div className="camera-modal">
            <div className="camera-header">
              <h3>Capture Greeting Design</h3>
              <button className="camera-close-btn" onClick={closeCamera}>✕</button>
            </div>
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-video"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            <div className="camera-controls">
              <button className="capture-btn" onClick={captureDesign}>
                <span className="btn-icon">📸</span>
                Capture Design
              </button>
              <button className="cancel-btn" onClick={closeCamera}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="design-form">
        <h2>Upload Greeting Design to Cloudinary</h2>
        
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">{uploadProgress}% Uploaded to Cloudinary</span>
          </div>
        )}

        {/* Design Upload Section */}
        <div className="form-section">
          <h3>1. Upload Design to Cloudinary</h3>
          
          <div className="design-upload-container">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden-input"
              id="design-gallery"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              capture="environment"
              className="hidden-input"
              id="design-camera"
            />
            
            {!previewUrl ? (
              <div className="upload-options">
                <label htmlFor="design-gallery" className="upload-option gallery-option">
                  <span className="option-icon">📁</span>
                  <span className="option-text">Choose from Gallery</span>
                  <span className="option-note">(Uploads to Cloudinary)</span>
                </label>
                
                <button type="button" onClick={triggerCamera} className="upload-option camera-option">
                  <span className="option-icon">📷</span>
                  <span className="option-text">Take Photo</span>
                  <span className="option-note">(Uploads to Cloudinary)</span>
                </button>
              </div>
            ) : (
              <div className="design-preview">
                <img src={previewUrl} alt="Design preview" className="preview-image" />
                <div className="preview-info">
                  <span className="file-name">{designFile?.name}</span>
                  <span className="file-size">
                    {(designFile?.size / 1024).toFixed(2)} KB
                  </span>
                </div>
                <button type="button" onClick={removeDesign} className="remove-btn">
                  ✕ Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Occasion Details Section */}
        <div className="form-section">
          <h3>2. Occasion Details</h3>
          
          <div className="form-group">
            <label>Category *</label>
            <div className="category-selector">
              {Object.keys(occasionCategories).map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`category-btn ${formData.category === cat ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Select Occasion *</label>
            <select
              value={formData.occasion}
              onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
              required
              className="occasion-select"
            >
              <option value="">-- Select Occasion --</option>
              {occasionCategories[formData.category]?.map(occasion => (
                <option key={occasion} value={occasion}>{occasion}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Design Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Diwali 2024 Premium Design"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Description / Message</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter greeting message..."
              rows="3"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Scheduled Date *</label>
            <input
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              required
              min={new Date().toISOString().split('T')[0]}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Tags (comma separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., premium, festival, 2024"
              className="form-input"
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              Active (Visible to team)
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={removeDesign}>
            Clear Form
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={uploading || !designFile}
          >
            {uploading ? `Uploading to Cloudinary (${uploadProgress}%)` : 'Upload to Cloudinary'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .greeting-design-form {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .design-form {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .design-form h2 {
          margin: 0 0 25px 0;
          color: #1e293b;
          font-size: 24px;
          font-weight: 600;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 15px;
        }

        .form-section {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .form-section h3 {
          margin: 0 0 20px 0;
          color: #0f172a;
          font-size: 18px;
          font-weight: 600;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .message.success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .message.info {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .upload-progress {
          margin-bottom: 20px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
        }

        .progress-bar {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 14px;
          color: #475569;
          font-weight: 500;
        }

        .hidden-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
        }

        .upload-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .upload-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .upload-option:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          transform: translateY(-2px);
        }

        .option-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }

        .option-text {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 5px;
        }

        .option-note {
          font-size: 12px;
          color: #64748b;
        }

        .design-preview {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .preview-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
        }

        .preview-info {
          flex: 1;
        }

        .file-name {
          display: block;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .file-size {
          font-size: 12px;
          color: #64748b;
        }

        .remove-btn {
          padding: 8px 16px;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .category-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 15px;
        }

        .category-btn {
          padding: 8px 16px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 20px;
          cursor: pointer;
        }

        .category-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #2563eb;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #334155;
        }

        .form-input, .occasion-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
        }

        .form-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 30px;
        }

        .submit-btn, .cancel-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .submit-btn {
          background: #3b82f6;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: #f1f5f9;
          color: #475569;
        }

        /* Camera Modal */
        .camera-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .camera-modal {
          background: #1a1a1a;
          border-radius: 20px;
          width: 100%;
          max-width: 800px;
          overflow: hidden;
        }

        .camera-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: #2d2d2d;
          color: white;
        }

        .camera-container {
          background: black;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-video {
          width: 100%;
          max-height: 500px;
          object-fit: contain;
        }

        .camera-controls {
          display: flex;
          gap: 15px;
          padding: 20px;
          justify-content: center;
        }

        .capture-btn {
          padding: 12px 30px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 30px;
          font-size: 16px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .upload-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default GreetingDesignForm;