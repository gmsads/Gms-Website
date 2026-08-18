import React, { useState } from 'react';
import axios from 'axios';

function UploadVideo() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    businessName: '',
    contactPerson: '',
    phone: '',
    deadline: '',
    priority: 'medium'
  });
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!videoFile) {
      setMessage({ type: 'error', text: 'Please select a video file' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const data = new FormData();
    data.append('video', videoFile);
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('businessName', formData.businessName);
    data.append('contactPerson', formData.contactPerson);
    data.append('phone', formData.phone);
    data.append('deadline', formData.deadline);
    data.append('priority', formData.priority);
    data.append('editorName', localStorage.getItem('userName'));

    try {
      const response = await axios.post('/api/upload-video', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setMessage({ type: 'success', text: 'Video uploaded successfully!' });
      // Reset form
      setFormData({
        title: '',
        description: '',
        businessName: '',
        contactPerson: '',
        phone: '',
        deadline: '',
        priority: 'medium'
      });
      setVideoFile(null);
      setUploadProgress(0);
      
      // Reset file input
      document.getElementById('video-file').value = '';
      
    } catch (error) {
      console.error('Error uploading video:', error);
      setMessage({ type: 'error', text: 'Failed to upload video. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#003366',
      marginBottom: '30px',
      textAlign: 'center',
    },
    form: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 'bold',
      color: '#333',
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      minHeight: '100px',
      fontFamily: 'inherit',
      resize: 'vertical',
    },
    select: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      backgroundColor: 'white',
    },
    fileInput: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      backgroundColor: 'white',
    },
    button: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '12px 30px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
      width: '100%',
      transition: 'background-color 0.3s',
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed',
    },
    progressBar: {
      width: '100%',
      height: '10px',
      backgroundColor: '#f0f0f0',
      borderRadius: '5px',
      overflow: 'hidden',
      marginTop: '10px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#28a745',
      transition: 'width 0.3s',
    },
    message: {
      padding: '10px',
      borderRadius: '5px',
      marginBottom: '20px',
      textAlign: 'center',
    },
    successMessage: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
    },
    errorMessage: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Upload Video</h2>
      
      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === 'success' ? styles.successMessage : styles.errorMessage)
        }}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Video Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Enter video title"
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            style={styles.textarea}
            placeholder="Enter video description"
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Business Name *</label>
          <input
            type="text"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Enter business name"
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Contact Person *</label>
          <input
            type="text"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Enter contact person name"
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Phone Number *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Enter phone number"
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Deadline *</label>
          <input
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Priority *</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
            style={styles.select}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Video File *</label>
          <input
            type="file"
            id="video-file"
            accept="video/*"
            onChange={handleFileChange}
            required
            style={styles.fileInput}
          />
          <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
            Supported formats: MP4, AVI, MOV, MKV (Max size: 500MB)
          </small>
        </div>
        
        {uploading && (
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${uploadProgress}%`}}></div>
            <p style={{ textAlign: 'center', marginTop: '5px', fontSize: '12px' }}>
              Uploading: {uploadProgress}%
            </p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={uploading}
          style={{
            ...styles.button,
            ...(uploading ? styles.buttonDisabled : {})
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  );
}

export default UploadVideo;