import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

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
  const [message, setMessage] = useState('');
  const [occasions, setOccasions] = useState([]);
  
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
      'Diwali',
      'Holi', 
      'Dussehra',
      'Ganesh Chaturthi',
      'Navratri',
      'Durga Puja',
      'Eid',
      'Christmas',
      'New Year',
      'Makar Sankranti',
      'Raksha Bandhan',
      'Pongal',
      'Onam',
      'Gurpurab',
      'Good Friday',
      'Ramadan',
      'Bakrid'
    ],
    special: [
      'Birthday',
      'Anniversary',
      'Marriage Anniversary',
      'Business Anniversary',
      'Achievement',
      'Thank You',
      'Welcome',
      'Promotion',
      'Retirement',
      'Condolence'
    ],
    seasonal: [
      'Spring',
      'Summer',
      'Monsoon',
      'Autumn',
      'Winter',
      'Valentine\'s Day',
      'Mother\'s Day',
      'Father\'s Day',
      'Women\'s Day',
      'Teachers Day'
    ],
    corporate: [
      'Quarter End',
      'Year End',
      'Budget Approval',
      'Project Launch',
      'Team Success',
      'Client Appreciation'
    ]
  };

  useEffect(() => {
    // Load existing occasions from API
    fetchOccasions();
  }, []);

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

  const fetchOccasions = async () => {
    try {
      const response = await axios.get('/api/greetings/occasions');
      if (response.data.success) {
        setOccasions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching occasions:', error);
    }
  };

  // Handle file selection from gallery
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setMessage('File size should be less than 10MB');
      return;
    }

    setDesignFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    // Clear other input
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Start camera for design capture
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
      setMessage('Cannot access camera. Please check permissions or use file upload.');
      setShowCameraModal(false);
    }
  };

  // Capture design from camera
  const captureDesign = () => {
    if (!videoRef.current || !canvasRef.current) {
      setMessage('Camera not ready');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setMessage('Camera not ready. Please try again.');
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
            `greeting_design_${timestamp}.jpg`,
            { type: 'image/jpeg' }
          );

          setDesignFile(file);
          setPreviewUrl(URL.createObjectURL(blob));
          stopCamera();
          setShowCameraModal(false);
          setMessage('Design captured successfully!');
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error capturing design:', error);
      setMessage('Error capturing design. Please try again.');
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

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
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
      setMessage('Please upload a design image');
      return;
    }

    if (!formData.occasion || !formData.scheduledDate) {
      setMessage('Please select occasion and scheduled date');
      return;
    }

    setUploading(true);
    setMessage('Uploading greeting design...');

    try {
      const submitData = new FormData();
      
      // Add design file
      submitData.append('design', designFile);
      
      // Add form fields
      submitData.append('occasion', formData.occasion);
      submitData.append('title', formData.title || formData.occasion);
      submitData.append('description', formData.description);
      submitData.append('scheduledDate', formData.scheduledDate);
      submitData.append('category', formData.category);
      submitData.append('tags', formData.tags);
      submitData.append('isActive', formData.isActive);
      
      // Add metadata
      submitData.append('uploadedBy', localStorage.getItem('userId') || 'designer');
      submitData.append('uploaderName', localStorage.getItem('userName') || 'Designer');
      submitData.append('fileSize', designFile.size);
      submitData.append('fileType', designFile.type);

      const response = await axios.post('/api/greetings/designs', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setMessage('Greeting design uploaded successfully!');
        
        // Reset form
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
        
        // Notify parent
        if (onDesignAdded) {
          onDesignAdded(response.data.data);
        }
      } else {
        setMessage(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading design:', error);
      setMessage(error.response?.data?.message || 'Error uploading design. Please try again.');
    } finally {
      setUploading(false);
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
              <button className="cancel-btn" onClick={closeCamera}>
                Cancel
              </button>
            </div>
            <div className="camera-instructions">
              Position the greeting design in frame and click Capture
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="design-form">
        <h2>Upload Greeting Design</h2>
        
        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Design Upload Section */}
        <div className="form-section">
          <h3>1. Upload Design</h3>
          
          <div className="design-upload-container">
            {/* Hidden inputs */}
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
                  <span className="option-desc">Select existing design</span>
                </label>
                
                <button type="button" onClick={triggerCamera} className="upload-option camera-option">
                  <span className="option-icon">📷</span>
                  <span className="option-text">Take Photo</span>
                  <span className="option-desc">Capture new design</span>
                </button>
              </div>
            ) : (
              <div className="design-preview">
                <img src={previewUrl} alt="Design preview" className="preview-image" />
                <div className="preview-info">
                  <span className="file-name">{designFile?.name}</span>
                  <span className="file-size">
                    {(designFile?.size / 1024).toFixed(0)} KB
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
              placeholder="Enter greeting message or design description..."
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
            <small className="field-hint">
              Designs will be available for sending from this date
            </small>
          </div>

          <div className="form-group">
            <label>Tags (comma separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., premium, animated, 2024, festival"
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
            {uploading ? (
              <>
                <span className="spinner"></span>
                Uploading...
              </>
            ) : (
              'Upload Design'
            )}
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

        .hidden-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          border: 0;
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
          padding: 30px 20px;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
        }

        .upload-option:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          transform: translateY(-2px);
        }

        .gallery-option {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .camera-option {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border-color: #7dd3fc;
        }

        .option-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .option-text {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 5px;
        }

        .option-desc {
          font-size: 13px;
          color: #64748b;
        }

        .design-preview {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .preview-image {
          width: 120px;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
        }

        .preview-info {
          flex: 1;
        }

        .file-name {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 5px;
          word-break: break-all;
        }

        .file-size {
          font-size: 14px;
          color: #64748b;
        }

        .remove-btn {
          padding: 8px 16px;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .remove-btn:hover {
          background: #fecaca;
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
          font-size: 14px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .category-btn:hover {
          background: #e2e8f0;
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
          font-size: 14px;
        }

        .form-input, .occasion-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .form-input:focus, .occasion-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        textarea.form-input {
          resize: vertical;
          min-height: 80px;
        }

        .field-hint {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          color: #64748b;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
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
          transition: all 0.2s ease;
        }

        .submit-btn {
          background: #3b82f6;
          color: white;
          flex: 1;
          max-width: 200px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: #f1f5f9;
          color: #475569;
        }

        .cancel-btn:hover {
          background: #e2e8f0;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Camera Modal Styles */
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
          padding: 20px;
        }

        .camera-modal {
          background: #1a1a1a;
          border-radius: 20px;
          width: 100%;
          max-width: 800px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }

        .camera-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: #2d2d2d;
          color: white;
        }

        .camera-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .camera-close-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 6px;
        }

        .camera-container {
          position: relative;
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
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 30px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 30px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .camera-instructions {
          text-align: center;
          padding: 15px;
          color: #94a3b8;
          font-size: 14px;
          border-top: 1px solid #404040;
        }

        @media (max-width: 768px) {
          .greeting-design-form {
            padding: 10px;
          }

          .design-form {
            padding: 20px;
          }

          .upload-options {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .submit-btn {
            max-width: 100%;
          }

          .camera-modal {
            max-width: 95%;
          }

          .camera-container {
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default GreetingDesignForm;