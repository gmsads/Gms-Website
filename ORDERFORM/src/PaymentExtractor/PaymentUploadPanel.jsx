import React, { useState, useRef, useEffect } from 'react';
import { uploadPaymentScreenshots } from './paymentExtractorApi';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export default function PaymentUploadPanel({ onUploadCompleted, showNotification }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [whatsappGroupName, setWhatsappGroupName] = useState('');
  const [whatsappSenderName, setWhatsappSenderName] = useState('');
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [selectedFiles]);

  const handleFilesAdded = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const validEntries = [];
    const rejectedMessages = [];

    incoming.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        rejectedMessages.push(`${file.name}: Unsupported type (JPG, JPEG, PNG, WebP only)`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        rejectedMessages.push(`${file.name}: Exceeds 8MB limit`);
        return;
      }
      validEntries.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (rejectedMessages.length > 0 && showNotification) {
      showNotification(rejectedMessages.join(' | '), 'error');
    }

    setSelectedFiles((prev) => {
      const combined = [...prev, ...validEntries].slice(0, 10);
      return combined;
    });
  };

  const removeSelectedFile = (id) => {
    setSelectedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && target.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      if (showNotification) {
        showNotification('Please select at least one payment screenshot to upload.', 'error');
      }
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const rawFiles = selectedFiles.map((item) => item.file);
      const response = await uploadPaymentScreenshots(
        rawFiles,
        {
          whatsappGroupName,
          whatsappSenderName,
          notes,
          syncOcr: false, // Process OCR asynchronously in background worker
        },
        (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        }
      );

      selectedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setSelectedFiles([]);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (showNotification) {
        showNotification(
          response.message || `Uploaded ${rawFiles.length} screenshot(s) for OCR extraction!`,
          'success'
        );
      }
      if (onUploadCompleted) {
        onUploadCompleted(response);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || 'Failed to upload payment screenshots';
      if (showNotification) {
        showNotification(errMsg, 'error');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: '#003366', fontSize: '18px', fontWeight: 700 }}>
            Upload WhatsApp Payment Screenshots
          </h3>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
            Upload single or multiple screenshots (JPG, JPEG, PNG, WebP · up to 10 images per batch, max 8MB each)
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={uploading}
          style={{
            backgroundColor: '#003366',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          + Upload Payment Screenshots
        </button>
      </div>

      {/* Optional WhatsApp Context Metadata */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}
          >
            WhatsApp Group Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. GMS Sales Payments Group"
            value={whatsappGroupName}
            onChange={(e) => setWhatsappGroupName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}
          >
            WhatsApp Sender Name / Phone (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Ramesh Kumar / 9876543210"
            value={whatsappSenderName}
            onChange={(e) => setWhatsappSenderName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}
          >
            Batch Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Advance for Order #1042"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Drag and drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          border: `2px dashed ${isDragging ? '#2563eb' : '#94a3b8'}`,
          backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
          borderRadius: '10px',
          padding: '28px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => handleFilesAdded(e.target.files)}
        />
        <div style={{ fontSize: '28px', marginBottom: '6px' }}>📤</div>
        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
          Drag & drop payment screenshots here, or click to browse
        </div>
        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
          Supports Google Pay, PhonePe, Paytm, BHIM, and Bank Transfer screenshots (JPG, PNG, WebP)
        </div>
      </div>

      {/* Thumbnail Previews */}
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Selected Screenshots ({selectedFiles.length}/10)
            </span>
            <button
              type="button"
              onClick={() => {
                selectedFiles.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
                setSelectedFiles([]);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear All
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px',
            }}
          >
            {selectedFiles.map((item) => (
              <div
                key={item.id}
                style={{
                  position: 'relative',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f8fafc',
                }}
              >
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  style={{
                    width: '100%',
                    height: '95px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSelectedFile(item.id);
                  }}
                  title="Remove image"
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
                <div
                  style={{
                    padding: '4px 6px',
                    fontSize: '11px',
                    color: '#334155',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={item.file.name}
                >
                  {item.file.name}
                </div>
              </div>
            ))}
          </div>

          {uploading && (
            <div style={{ marginTop: '14px' }}>
              <div
                style={{
                  height: '8px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    backgroundColor: '#2563eb',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#1d4ed8', marginTop: '4px', fontWeight: 600 }}>
                Uploading & starting OCR extraction ({uploadProgress}%)...
              </div>
            </div>
          )}

          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={uploading}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading
                ? 'Uploading & Extracting...'
                : `Start OCR Extraction (${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
