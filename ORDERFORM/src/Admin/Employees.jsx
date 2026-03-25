/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import SalaryComponent from './SalaryComponent';
import AttendanceComponent from './AttendanceComponent';

export default function Employees() {
  const [employeeCategories, setEmployeeCategories] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState({ active: 0, inactive: 0, total: 0 });
  const [activeFilter, setActiveFilter] = useState('active');
  const [popupMessage, setPopupMessage] = useState({ show: false, message: '', type: '' });
  const [rejoinModal, setRejoinModal] = useState({
    isOpen: false,
    employee: null,
    category: '',
    index: -1,
    rejoinDate: new Date().toISOString().split('T')[0]
  });
  const [editModal, setEditModal] = useState({
    isOpen: false,
    employee: null,
    currentCategory: '',
    originalCategory: '',
    showRejoinDate: false
  });
  const [activeTab, setActiveTab] = useState('directory');
  const [resignationModal, setResignationModal] = useState({
    isOpen: false,
    employee: null,
    category: '',
    index: -1,
    resignationDate: new Date().toISOString().split('T')[0],
    resignationReason: ''
  });
  const [imagePreview, setImagePreview] = useState(null);

  // Document management states
  const [customDocName, setCustomDocName] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [documentModal, setDocumentModal] = useState({
    isOpen: false,
    employee: null,
    category: '',
    documents: {}
  });
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});

  // UPDATED: Added 'VideoEditor' to roleOptions
  const roleOptions = useMemo(() => [
    'Executive', 'Admin', 'Designer', 'Account', 'ServiceExecutive',
    'ServiceManager', 'SalesManager', 'ITTeam', 'DigitalMarketing',
    'ClientService', 'HR', 'Vendor', 'Agent', 'FieldExecutive', 'Unit', 'VideoEditor'
  ], []);

  // Function to get initials from name
  const getInitials = useCallback((name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }, []);

  // Function to generate random color based on name
  const getAvatarColor = useCallback((name) => {
    if (!name) return '#003366';
    const colors = [
      '#003366', '#004d99', '#0066cc', '#0080ff',
      '#006600', '#008000', '#009900', '#00b300',
      '#663300', '#804000', '#994d00', '#b35900',
      '#660066', '#800080', '#990099', '#b300b3',
      '#006666', '#008080', '#009999', '#00b3b3'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Failed to fetch employee data');
      const data = await response.json();

      const transformedData = {};
      Object.entries(data).forEach(([category, employees]) => {
        transformedData[category] = employees.map(employee => ({
          ...employee,
          name: employee.name,
          phone: employee.phone || '',
          active: Boolean(employee.active),
          role: category,
          imageUrl: employee.imageUrl || null,
          cloudinaryId: employee.cloudinaryId || null,
          rejoinDate: employee.rejoinDate || '',
          resignationDate: employee.resignationDate || '',
          resignationReason: employee.resignationReason || '',
          documents: employee.documents || {}
        }));
      });

      setEmployeeCategories(transformedData);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load employee data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // showPopup MUST be defined BEFORE any functions that use it
  const showPopup = useCallback((message, type = 'info') => {
    setPopupMessage({ show: true, message, type });
    setTimeout(() => {
      setPopupMessage(prev => ({ ...prev, show: false }));
    }, 5000);
  }, []);

  // Fetch employee documents and requirements
  const fetchEmployeeDocuments = useCallback(async (employeeName) => {
    try {
      const response = await fetch(`/api/employees/documents/${encodeURIComponent(employeeName)}`);
      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          setRequiredDocuments(data.requiredDocuments || []);

          // Get documents from response
          const docs = data.documents || {};

          // Ensure documents have the correct structure
          const ensureDocumentStructure = (doc) => {
            if (!doc) return { files: [] };
            if (typeof doc === 'string') return { files: [] };
            if (doc.files && Array.isArray(doc.files)) return doc;
            return { files: [] };
          };

          // Handle custom documents
          let customDocs = {};
          if (docs.customDocuments) {
            if (typeof docs.customDocuments === 'object' && docs.customDocuments !== null) {
              customDocs = docs.customDocuments;

              // Ensure each custom document type has a files array
              Object.keys(customDocs).forEach(key => {
                const docData = customDocs[key];
                if (docData && docData.files) {
                  if (!Array.isArray(docData.files)) {
                    docData.files = [];
                  } else {
                    docData.files = docData.files.map(file => ({
                      url: file.url || '',
                      cloudinaryId: file.cloudinaryId || '',
                      filename: file.filename || 'Document',
                      notes: file.notes || key,
                      uploadedAt: file.uploadedAt || new Date().toISOString()
                    }));
                  }
                } else {
                  customDocs[key] = { files: [] };
                }
              });
            }
          }

          const fixedDocs = {
            aadhar: ensureDocumentStructure(docs.aadhar),
            pan: ensureDocumentStructure(docs.pan),
            educational: ensureDocumentStructure(docs.educational),
            experience: ensureDocumentStructure(docs.experience),
            customDocuments: customDocs
          };

          return fixedDocs;
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }

    // Return default structure on error
    return {
      aadhar: { files: [] },
      pan: { files: [] },
      educational: { files: [] },
      experience: { files: [] },
      customDocuments: {}
    };
  }, []);

  // Handle document upload
  const handleDocumentUpload = useCallback(async () => {
    try {
      const { employee, category } = documentModal;
      if (!employee || !employee.name) {
        showPopup('Employee information missing', 'error');
        return;
      }

      const hasFiles = Object.values(selectedFiles).some(files =>
        files && (Array.isArray(files) ? files.length > 0 : !!files)
      );

      if (!hasFiles) {
        showPopup('Please select at least one document to upload', 'error');
        return;
      }

      // Check file count limits
      if (selectedFiles.educational && selectedFiles.educational.length > 10) {
        showPopup('You can upload maximum 10 educational documents at a time', 'error');
        return;
      }

      if (selectedFiles.experience && selectedFiles.experience.length > 10) {
        showPopup('You can upload maximum 10 experience documents at a time', 'error');
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('name', employee.name.trim());

      if (documentNotes) {
        formData.append('documentNotes', documentNotes);
      }

      if (selectedDocumentType === 'custom' && customDocName) {
        formData.append('customDocName', customDocName);
      }

      // Append files
      Object.entries(selectedFiles).forEach(([docField, files]) => {
        if (files) {
          if (Array.isArray(files)) {
            files.forEach(file => {
              formData.append(docField, file);
            });
          } else {
            formData.append(docField, files);
          }
        }
      });

      const response = await fetch('/api/employees/upload-documents', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Document upload failed');
      }

      // Update local state
      setEmployeeCategories(prev => {
        const updated = { ...prev };
        const employeeIndex = updated[category]?.findIndex(emp => emp.name === employee.name);
        if (employeeIndex !== -1) {
          updated[category][employeeIndex] = {
            ...updated[category][employeeIndex],
            documents: result.documents
          };
        }
        return updated;
      });

      showPopup(`${Object.values(selectedFiles).reduce((acc, files) =>
        acc + (Array.isArray(files) ? files.length : 1), 0)} documents uploaded successfully!`, 'success');

      // Refresh documents in modal
      const updatedDocs = await fetchEmployeeDocuments(employee.name);
      setDocumentModal(prev => ({ ...prev, documents: updatedDocs }));
      setSelectedFiles({});
      setCustomDocName('');
      setDocumentNotes('');
      setSelectedDocumentType('');
    } catch (err) {
      console.error('Document upload error:', err);
      showPopup(`Error: ${err.message}`, 'error');
    }
  }, [documentModal, selectedFiles, customDocName, documentNotes, selectedDocumentType, showPopup, fetchEmployeeDocuments]);

  // Rejoin submit handler
  const handleRejoinSubmit = useCallback(async () => {
    try {
      const { employee, rejoinDate } = rejoinModal;
      if (!rejoinDate) {
        showPopup('Rejoin date is required', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('name', employee.name);
      formData.append('active', 'true');
      formData.append('rejoinDate', rejoinDate);
      formData.append('resignationDate', '');
      formData.append('resignationReason', '');

      const response = await fetch('/api/employees/update-profile', {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Status update failed on server');
      }

      await fetchEmployees();

      showPopup(`${employee.name} has rejoined on ${rejoinDate}`, 'success');
      setRejoinModal({ isOpen: false, employee: null, category: '', index: -1, rejoinDate: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error('Rejoin error:', err);
      showPopup('Failed to update status: ' + err.message, 'error');
    }
  }, [rejoinModal, fetchEmployees, showPopup]);

  const toggleEmployeeStatus = useCallback(async (category, index, employee) => {
    try {
      if (employee.active) {
        setResignationModal({
          isOpen: true,
          employee,
          category,
          index,
          resignationDate: new Date().toISOString().split('T')[0],
          resignationReason: ''
        });
      } else {
        setRejoinModal({
          isOpen: true,
          employee,
          category,
          index,
          rejoinDate: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err) {
      console.error('Status update error:', err);
      showPopup('Failed to update status. Refreshing data...', 'error');
      await fetchEmployees();
    }
  }, [fetchEmployees, showPopup]);

  // Resignation submit handler
  const handleResignationSubmit = useCallback(async () => {
    try {
      const { employee, resignationDate, resignationReason } = resignationModal;
      if (!resignationDate || !resignationReason) {
        showPopup('Resignation date and reason are required', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('name', employee.name);
      formData.append('active', 'false');
      formData.append('resignationDate', resignationDate);
      formData.append('resignationReason', resignationReason);
      formData.append('rejoinDate', '');

      const response = await fetch('/api/employees/update-profile', {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Status update failed on server');
      }

      await fetchEmployees();

      showPopup(`${employee.name} has been deactivated`, 'success');
      setResignationModal({ isOpen: false, employee: null, category: '', index: -1, resignationDate: new Date().toISOString().split('T')[0], resignationReason: '' });
    } catch (err) {
      console.error('Resignation error:', err);
      showPopup('Failed to update status: ' + err.message, 'error');
    }
  }, [resignationModal, fetchEmployees, showPopup]);

  const filteredCategories = useMemo(() => {
    return Object.entries(employeeCategories).reduce((acc, [category, employees]) => {
      const filtered = employees.filter(employee => {
        switch (activeFilter) {
          case 'active': return employee.active === true;
          case 'inactive': return employee.active === false;
          default: return true;
        }
      });
      if (filtered.length > 0) acc[category] = filtered;
      return acc;
    }, {});
  }, [employeeCategories, activeFilter]);

  useEffect(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    Object.values(employeeCategories).forEach(employees => {
      employees.forEach(emp => {
        if (emp.active) activeCount++;
        else inactiveCount++;
      });
    });
    setCounts({ active: activeCount, inactive: inactiveCount, total: activeCount + inactiveCount });
  }, [employeeCategories]);

  const handleEditClick = useCallback((employee, category) => {
    setEditModal({
      isOpen: true,
      employee: {
        ...employee,
        resignationDate: employee.resignationDate || '',
        resignationReason: employee.resignationReason || '',
        rejoinDate: employee.rejoinDate || '',
        imageUrl: employee.imageUrl || null,
        imageFile: null,
        documents: employee.documents || {}
      },
      currentCategory: category,
      originalCategory: category,
      showRejoinDate: false
    });
    setImagePreview(null);
  }, []);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setEditModal(prev => ({
        ...prev,
        employee: { ...prev.employee, imageFile: file }
      }));
    }
  }, []);

  // Open document upload modal
  const openDocumentModal = useCallback(async (employee, category) => {
    if (!employee || !employee.name) {
      showPopup('Employee information is missing', 'error');
      return;
    }

    try {
      const docs = await fetchEmployeeDocuments(employee.name);

      const safeDocs = docs || {
        aadhar: { files: [] },
        pan: { files: [] },
        educational: { files: [] },
        experience: { files: [] },
        customDocuments: {}
      };

      setDocumentModal({
        isOpen: true,
        employee: employee,
        category: category,
        documents: safeDocs
      });
      setSelectedFiles({});
      setCustomDocName('');
      setDocumentNotes('');
      setSelectedDocumentType('');
    } catch (error) {
      console.error('Error opening document modal:', error);
      showPopup('Failed to load documents', 'error');
    }
  }, [fetchEmployeeDocuments, showPopup]);

  // Close document modal
  const closeDocumentModal = useCallback(() => {
    setDocumentModal({
      isOpen: false,
      employee: null,
      category: '',
      documents: {}
    });
    setSelectedFiles({});
    setCustomDocName('');
    setDocumentNotes('');
    setSelectedDocumentType('');
  }, []);

  // Handle document file selection
  const handleDocumentFileChange = useCallback((docField, files) => {
    // Check limits for educational and experience
    if (docField === 'educational' && files.length > 10) {
      showPopup('Maximum 10 educational documents can be selected', 'warning');
      return;
    }
    if (docField === 'experience' && files.length > 10) {
      showPopup('Maximum 10 experience documents can be selected', 'warning');
      return;
    }

    setSelectedFiles(prev => ({
      ...prev,
      [docField]: files
    }));
  }, [showPopup]);

  // View document
  const viewDocument = useCallback((documentUrl) => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  }, []);

  // Handle delete document
  const handleDeleteDocument = useCallback(async (docType, fileIndex, employeeName) => {
    try {
      if (!employeeName) {
        showPopup('Employee name is required', 'error');
        return;
      }

      const response = await fetch(`/api/employees/documents/${encodeURIComponent(employeeName)}/${encodeURIComponent(docType)}/${fileIndex}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete document');
      }

      // Refresh documents
      const updatedDocs = await fetchEmployeeDocuments(employeeName);

      // Update the document modal
      setDocumentModal(prev => ({
        ...prev,
        documents: updatedDocs
      }));

      // Update employee categories
      setEmployeeCategories(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(category => {
          const empIndex = updated[category].findIndex(emp => emp.name === employeeName);
          if (empIndex !== -1) {
            updated[category][empIndex] = {
              ...updated[category][empIndex],
              documents: updatedDocs
            };
          }
        });
        return updated;
      });

      showPopup('Document deleted successfully', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showPopup(`Failed to delete document: ${err.message}`, 'error');
    }
  }, [fetchEmployeeDocuments, showPopup]);

  // Handle save with proper active status
  const handleSave = useCallback(async () => {
    try {
      const { employee, currentCategory } = editModal;
      if (!employee.name || !employee.phone || !employee.username) {
        showPopup('Please fill all required fields', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('name', employee.name);
      formData.append('username', employee.username);
      formData.append('phone', employee.phone);
      formData.append('email', employee.email || '');
      formData.append('guardianName', employee.guardianName || '');
      formData.append('guardianContact', employee.guardianContact || '');
      formData.append('aadhar', employee.aadhar || '');
      formData.append('joiningDate', employee.joiningDate || '');
      formData.append('experience', employee.experience || '');
      formData.append('role', currentCategory);

      formData.append('active', employee.active ? 'true' : 'false');

      if (employee.rejoinDate) {
        formData.append('rejoinDate', employee.rejoinDate);
      }

      if (!employee.active) {
        formData.append('resignationDate', employee.resignationDate || '');
        formData.append('resignationReason', employee.resignationReason || '');
      } else {
        formData.append('resignationDate', '');
        formData.append('resignationReason', '');
      }

      if (employee.imageFile) {
        formData.append('image', employee.imageFile);
      }

      const response = await fetch('/api/employees/update-profile', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Update failed');
      }

      await fetchEmployees();
      setEditModal({ isOpen: false, employee: null, currentCategory: '', originalCategory: '', showRejoinDate: false });
      setImagePreview(null);
      showPopup('Employee has been updated successfully!', 'success');
    } catch (err) {
      console.error('Update error:', err);
      showPopup(`Error: ${err.message}`, 'error');
    }
  }, [editModal, fetchEmployees, showPopup]);

  const downloadEmployeeData = useCallback(() => {
    const allEmployees = Object.entries(employeeCategories).flatMap(([category, employees]) =>
      employees.map(emp => ({
        ...emp,
        department: category,
        status: emp.active ? 'Active' : 'Inactive',
        rejoinDate: emp.rejoinDate || 'N/A',
        imageUrl: emp.imageUrl || 'No image',
        documents: JSON.stringify(emp.documents)
      }))
    );
    const ws = XLSX.utils.json_to_sheet(allEmployees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_data.xlsx");
  }, [employeeCategories]);

  const downloadIndividualData = useCallback((employee) => {
    const ws = XLSX.utils.json_to_sheet([{
      ...employee,
      department: editModal.currentCategory,
      status: employee.active ? 'Active' : 'Inactive',
      rejoinDate: employee.rejoinDate || 'N/A',
      documents: JSON.stringify(employee.documents)
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee");
    XLSX.writeFile(wb, `${employee.name}_data.xlsx`);
  }, [editModal.currentCategory]);

  const toggleCategoryExpansion = useCallback((category) => {
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }));
  }, []);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  if (loading) return <div className="loading">Loading employees...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="employee-directory">
      {popupMessage.show && (
        <div className={`popup-message ${popupMessage.type}`}>
          {popupMessage.message}
          <button className="popup-close" onClick={() => setPopupMessage(prev => ({ ...prev, show: false }))}>
            &times;
          </button>
        </div>
      )}

      {/* Resignation Modal */}
      {resignationModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Resignation Details</h3>
              <button className="close-button" onClick={() => setResignationModal({ isOpen: false, employee: null, category: '', index: -1, resignationDate: new Date().toISOString().split('T')[0], resignationReason: '' })}>
                &times;
              </button>
            </div>
            <div className="form-group">
              <label>Resignation Date*</label>
              <input
                type="date"
                value={resignationModal.resignationDate}
                onChange={(e) => setResignationModal(prev => ({ ...prev, resignationDate: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Reason for Resignation*</label>
              <input
                type="text"
                value={resignationModal.resignationReason}
                onChange={(e) => setResignationModal(prev => ({ ...prev, resignationReason: e.target.value }))}
                placeholder="Enter reason for resignation"
                required
              />
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setResignationModal({ isOpen: false, employee: null, category: '', index: -1, resignationDate: new Date().toISOString().split('T')[0], resignationReason: '' })}>Cancel</button>
              <button className="save-button" onClick={handleResignationSubmit}>Confirm Resignation</button>
            </div>
          </div>
        </div>
      )}

      {/* Rejoin Modal */}
      {rejoinModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Set Rejoin Date</h3>
              <button className="close-button" onClick={() => setRejoinModal({ isOpen: false, employee: null, category: '', index: -1, rejoinDate: new Date().toISOString().split('T')[0] })}>
                &times;
              </button>
            </div>
            <div className="form-group">
              <label>Rejoin Date*</label>
              <input
                type="date"
                value={rejoinModal.rejoinDate}
                onChange={(e) => setRejoinModal(prev => ({ ...prev, rejoinDate: e.target.value }))}
                required
              />
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setRejoinModal({ isOpen: false, employee: null, category: '', index: -1, rejoinDate: new Date().toISOString().split('T')[0] })}>Cancel</button>
              <button className="save-button" onClick={handleRejoinSubmit}>Confirm Rejoin</button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {documentModal.isOpen && documentModal.employee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>Manage Documents - {documentModal.employee.name}</h3>
              <button className="close-button" onClick={closeDocumentModal}>
                &times;
              </button>
            </div>

            <div className="document-type-selector">
              <label>Select Document Type to Upload:</label>
              <select
                value={selectedDocumentType}
                onChange={(e) => {
                  setSelectedDocumentType(e.target.value);
                  setSelectedFiles({});
                }}
              >
                <option value="">Choose document type</option>
                <option value="aadhar">Aadhar Card (Front & Back)</option>
                <option value="pan">PAN Card (Front & Back)</option>
                <option value="educational">Educational Documents (Max 10 files)</option>
                <option value="experience">Experience/Offer Letters (Max 10 files)</option>
                <option value="custom">Custom Document</option>
              </select>

              {selectedDocumentType === 'custom' && (
                <div className="custom-doc-input">
                  <input
                    type="text"
                    placeholder="Enter document name (e.g., Portfolio, License, Certificate)"
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                  />
                </div>
              )}

              <div className="document-notes-input">
                <input
                  type="text"
                  placeholder="Add notes about this document (optional)"
                  value={documentNotes}
                  onChange={(e) => setDocumentNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Upload section based on selected document type */}
            {selectedDocumentType && selectedDocumentType !== 'custom' && (
              <div className="upload-section">
                <h4>
                  Upload {selectedDocumentType === 'aadhar' ? 'Aadhar Card' :
                    selectedDocumentType === 'pan' ? 'PAN Card' :
                      selectedDocumentType === 'educational' ? 'Educational Documents (Max 10 files)' :
                        'Experience/Offer Letters (Max 10 files)'}
                </h4>

                {(selectedDocumentType === 'aadhar' || selectedDocumentType === 'pan') && (
                  <div className="two-side-upload">
                    <div className="upload-box">
                      <label>Front Side</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleDocumentFileChange(`${selectedDocumentType}_front`, file);
                        }}
                      />
                      {selectedFiles[`${selectedDocumentType}_front`] && (
                        <span className="file-selected">{selectedFiles[`${selectedDocumentType}_front`].name}</span>
                      )}
                    </div>
                    <div className="upload-box">
                      <label>Back Side</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleDocumentFileChange(`${selectedDocumentType}_back`, file);
                        }}
                      />
                      {selectedFiles[`${selectedDocumentType}_back`] && (
                        <span className="file-selected">{selectedFiles[`${selectedDocumentType}_back`].name}</span>
                      )}
                    </div>
                  </div>
                )}

                {(selectedDocumentType === 'educational' || selectedDocumentType === 'experience') && (
                  <div className="multiple-upload">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => handleDocumentFileChange(selectedDocumentType, Array.from(e.target.files))}
                    />
                    {selectedFiles[selectedDocumentType] && selectedFiles[selectedDocumentType].length > 0 && (
                      <div className="file-list">
                        <p className="file-count">
                          {selectedFiles[selectedDocumentType].length} file(s) selected
                          {selectedFiles[selectedDocumentType].length === 10 && ' (Maximum reached)'}
                        </p>
                        {selectedFiles[selectedDocumentType].map((file, idx) => (
                          <span key={idx} className="file-selected">{idx + 1}. {file.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedDocumentType === 'custom' && customDocName && (
              <div className="upload-section">
                <h4>Upload {customDocName}</h4>
                <div className="multiple-upload">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => handleDocumentFileChange('customDocument', Array.from(e.target.files))}
                  />
                  {selectedFiles.customDocument && selectedFiles.customDocument.length > 0 && (
                    <div className="file-list">
                      <p className="file-count">{selectedFiles.customDocument.length} file(s) selected</p>
                      {selectedFiles.customDocument.map((file, idx) => (
                        <span key={idx} className="file-selected">{idx + 1}. {file.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Display existing documents */}
            <div className="existing-documents">
              <h4>Uploaded Documents</h4>

              {/* Aadhar Documents */}
              <div className="document-group">
                <h5>Aadhar Card</h5>
                {documentModal.documents?.aadhar?.files?.length > 0 ? (
                  documentModal.documents.aadhar.files.map((file, idx) => (
                    <div key={`aadhar-${idx}`} className="document-item">
                      <span>
                        <strong>{file.notes || `Aadhar ${idx + 1}`}</strong>
                        <br />
                        <small>{file.filename || 'Document'}</small>
                        {file.uploadedAt && (
                          <>
                            <br />
                            <small>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</small>
                          </>
                        )}
                      </span>
                      <div className="document-actions">
                        <button onClick={() => viewDocument(file.url)}>View</button>
                        <button
                          className="delete-doc"
                          onClick={() => handleDeleteDocument('aadhar', idx, documentModal.employee.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-documents">No Aadhar documents uploaded</p>
                )}
              </div>

              {/* PAN Documents */}
              <div className="document-group">
                <h5>PAN Card</h5>
                {documentModal.documents?.pan?.files?.length > 0 ? (
                  documentModal.documents.pan.files.map((file, idx) => (
                    <div key={`pan-${idx}`} className="document-item">
                      <span>
                        <strong>{file.notes || `PAN ${idx + 1}`}</strong>
                        <br />
                        <small>{file.filename || 'Document'}</small>
                        {file.uploadedAt && (
                          <>
                            <br />
                            <small>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</small>
                          </>
                        )}
                      </span>
                      <div className="document-actions">
                        <button onClick={() => viewDocument(file.url)}>View</button>
                        <button
                          className="delete-doc"
                          onClick={() => handleDeleteDocument('pan', idx, documentModal.employee.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-documents">No PAN documents uploaded</p>
                )}
              </div>

              {/* Educational Documents */}
              <div className="document-group">
                <h5>Educational Documents ({documentModal.documents?.educational?.files?.length || 0}/10)</h5>
                {documentModal.documents?.educational?.files?.length > 0 ? (
                  documentModal.documents.educational.files.map((file, idx) => (
                    <div key={`edu-${idx}`} className="document-item">
                      <span>
                        <strong>{file.notes || `Educational ${idx + 1}`}</strong>
                        <br />
                        <small>{file.filename || 'Document'}</small>
                        {file.uploadedAt && (
                          <>
                            <br />
                            <small>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</small>
                          </>
                        )}
                      </span>
                      <div className="document-actions">
                        <button onClick={() => viewDocument(file.url)}>View</button>
                        <button
                          className="delete-doc"
                          onClick={() => handleDeleteDocument('educational', idx, documentModal.employee.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-documents">No educational documents uploaded</p>
                )}
              </div>

              {/* Experience Documents */}
              <div className="document-group">
                <h5>Experience/Offer Letters ({documentModal.documents?.experience?.files?.length || 0}/10)</h5>
                {documentModal.documents?.experience?.files?.length > 0 ? (
                  documentModal.documents.experience.files.map((file, idx) => (
                    <div key={`exp-${idx}`} className="document-item">
                      <span>
                        <strong>{file.notes || `Experience ${idx + 1}`}</strong>
                        <br />
                        <small>{file.filename || 'Document'}</small>
                        {file.uploadedAt && (
                          <>
                            <br />
                            <small>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</small>
                          </>
                        )}
                      </span>
                      <div className="document-actions">
                        <button onClick={() => viewDocument(file.url)}>View</button>
                        <button
                          className="delete-doc"
                          onClick={() => handleDeleteDocument('experience', idx, documentModal.employee.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-documents">No experience documents uploaded</p>
                )}
              </div>

              {/* Custom Documents */}
              {documentModal.documents?.customDocuments && 
               Object.keys(documentModal.documents.customDocuments).length > 0 ? (
                <div className="document-group">
                  <h5>Custom Documents</h5>
                  {Object.entries(documentModal.documents.customDocuments).map(([docName, docData]) => {
                    let files = [];
                    if (docData) {
                      if (Array.isArray(docData.files)) {
                        files = docData.files;
                      } else if (Array.isArray(docData)) {
                        files = docData;
                      }
                    }
                    
                    return (
                      <div key={docName} className="document-subgroup">
                        <h6>{docName} ({files.length} file{files.length !== 1 ? 's' : ''})</h6>
                        
                        {files.length > 0 ? (
                          files.map((file, idx) => (
                            <div key={`${docName}-${idx}`} className="document-item">
                              {file?.url ? (
                                <>
                                  {/* File preview */}
                                  {file.url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                                    <img 
                                      src={file.url} 
                                      alt={file.filename || 'Document'} 
                                      style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer'}}
                                      onClick={() => viewDocument(file.url)}
                                    />
                                  ) : (
                                    <div 
                                      style={{width: '50px', height: '50px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', cursor: 'pointer'}}
                                      onClick={() => viewDocument(file.url)}
                                    >
                                      <span>📄</span>
                                    </div>
                                  )}
                                  
                                  {/* File details */}
                                  <div style={{flex: 1}}>
                                    <strong>{file.notes || docName}</strong>
                                    <br />
                                    <small>{file.filename || 'Document'}</small>
                                    {file.uploadedAt && (
                                      <>
                                        <br />
                                        <small>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</small>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="document-actions">
                                    <button onClick={() => viewDocument(file.url)}>View</button>
                                    <button 
                                      className="delete-doc" 
                                      onClick={() => handleDeleteDocument(docName, idx, documentModal.employee.name)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div style={{padding: '10px', color: '#999'}}>Invalid file data</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="no-documents">No files uploaded for {docName}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="document-group">
                  <h5>Custom Documents</h5>
                  <p className="no-documents">No custom documents uploaded</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="cancel-button" onClick={closeDocumentModal}>
                Close
              </button>
              <button
                className="save-button"
                onClick={handleDocumentUpload}
                disabled={!Object.values(selectedFiles).some(f => f && (Array.isArray(f) ? f.length > 0 : f instanceof File))}
              >
                Upload Selected Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={activeTab === 'directory' ? 'active' : ''} onClick={() => setActiveTab('directory')}>Employee Directory</button>
        <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>Attendance</button>
        <button className={activeTab === 'salaries' ? 'active' : ''} onClick={() => setActiveTab('salaries')}>Salaries</button>
      </div>

      {activeTab === 'directory' && (
        <>
          <div className="header">
            <h1>Employee Directory</h1>
            <div className="controls">
              <div className="filter-buttons">
                <button className={activeFilter === 'active' ? 'active' : ''} onClick={() => setActiveFilter('active')}>Active <span className="count-badge">{counts.active}</span></button>
                <button className={activeFilter === 'inactive' ? 'active' : ''} onClick={() => setActiveFilter('inactive')}>Inactive <span className="count-badge">{counts.inactive}</span></button>
                <button className={activeFilter === 'all' ? 'active' : ''} onClick={() => setActiveFilter('all')}>All <span className="count-badge">{counts.total}</span></button>
              </div>
              <button className="download-button" onClick={downloadEmployeeData}>Download Data</button>
            </div>
          </div>

          <div className="employee-categories">
            {Object.entries(filteredCategories).map(([category, employees]) => {
              const isExpanded = expanded[category];
              const shouldShowMore = employees.length > 4;
              const visibleEmployees = isExpanded ? employees : employees.slice(0, 4);

              return (
                <div key={category} className="category-card">
                  <h3>{category}</h3>
                  <ul className="employee-list">
                    {visibleEmployees.map((employee, index) => (
                      <li key={`${category}-${employee.name}-${index}`} className={`employee-item ${employee.active ? '' : 'inactive-employee'}`}>
                        <div className="employee-image-name" onClick={() => handleEditClick(employee, category)}>
                          {employee.imageUrl ? (
                            <img src={employee.imageUrl} alt={employee.name} className="employee-avatar-image" />
                          ) : (
                            <div className="employee-initials-avatar" style={{ backgroundColor: getAvatarColor(employee.name) }}>
                              {getInitials(employee.name)}
                            </div>
                          )}
                          <div className="employee-details">
                            <span className="employee-name">
                              {employee.name}
                              {!employee.active && <span className="inactive-badge"> (Inactive)</span>}
                            </span>
                            {!employee.active && (
                              <div className="resignation-reason">Reason: {employee.resignationReason || 'No reason provided'}</div>
                            )}
                            {/* Document status indicators */}
                            <div className="document-indicators">
                              {employee.documents?.aadhar?.files?.length > 0 &&
                                <span className="doc-indicator" title={`Aadhar: ${employee.documents.aadhar.files.length} file(s)`}>🆔</span>}

                              {employee.documents?.pan?.files?.length > 0 &&
                                <span className="doc-indicator" title={`PAN: ${employee.documents.pan.files.length} file(s)`}>📇</span>}

                              {employee.documents?.educational?.files?.length > 0 &&
                                <span className="doc-indicator" title={`Educational: ${employee.documents.educational.files.length} file(s)`}>🎓</span>}

                              {employee.documents?.experience?.files?.length > 0 &&
                                <span className="doc-indicator" title={`Experience: ${employee.documents.experience.files.length} file(s)`}>💼</span>}

                              {employee.documents?.customDocuments && 
                               typeof employee.documents.customDocuments === 'object' &&
                               Object.keys(employee.documents.customDocuments).length > 0 &&
                                <span className="doc-indicator" title={`Custom: ${Object.keys(employee.documents.customDocuments).length} document type(s)`}>📎</span>}
                            </div>
                          </div>
                        </div>
                        <div className="employee-actions">
                          <button className="documents-button" onClick={() => openDocumentModal(employee, category)} title="Upload/View Documents">
                            📄
                          </button>
                          <div onClick={() => toggleEmployeeStatus(category, index, employee)} className="toggle-switch" aria-label={employee.active ? 'Deactivate' : 'Activate'}>
                            <div className={employee.active ? 'slider-active' : 'slider-inactive'}>
                              <span className="slider-knob"></span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {shouldShowMore && (
                    <button className="show-more" onClick={() => toggleCategoryExpansion(category)}>
                      {isExpanded ? '- less' : '+ more'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'attendance' && <AttendanceComponent employees={Object.values(employeeCategories).flat()} />}
      {activeTab === 'salaries' && <SalaryComponent employees={Object.values(employeeCategories).flat()} />}

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Employee Details</h3>
              <button className="close-button" onClick={() => { setEditModal({ isOpen: false, employee: null, currentCategory: '', originalCategory: '', showRejoinDate: false }); setImagePreview(null); }}>
                &times;
              </button>
            </div>

            <div className="form-container">
              {/* Profile Image Section */}
              <div className="form-section">
                <div className="form-group">
                  <label>Employee Photo</label>
                  <div className="image-preview-container">
                    {(imagePreview || editModal.employee.imageUrl) ? (
                      <img src={imagePreview || editModal.employee.imageUrl} alt={editModal.employee.name} className="employee-image-large" />
                    ) : (
                      <div className="employee-initials-large" style={{ backgroundColor: getAvatarColor(editModal.employee.name) }}>
                        {getInitials(editModal.employee.name)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Upload New Photo</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
                  {editModal.employee.imageUrl && !editModal.employee.imageFile && (
                    <small className="image-info">Current photo uploaded. Upload a new photo to replace it.</small>
                  )}
                  {editModal.employee.imageFile && (
                    <small className="image-info">New photo selected: {editModal.employee.imageFile.name}</small>
                  )}
                </div>
              </div>

              {/* Basic Information Section */}
              <div className="form-section">
                <h4 className="section-title">Basic Information</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name*</label>
                    <input
                      type="text"
                      value={editModal.employee.name || ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, name: e.target.value } }))}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Username*</label>
                    <input
                      type="text"
                      value={editModal.employee.username || ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, username: e.target.value } }))}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={editModal.employee.email || ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, email: e.target.value } }))}
                      placeholder="employee@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number*</label>
                    <input
                      type="tel"
                      value={editModal.employee.phone || ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, phone: e.target.value } }))}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      onKeyPress={(e) => { if (!/^\d$/.test(e.key)) e.preventDefault(); }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details Section */}
              <div className="form-section">
                <h4 className="section-title">Personal Details</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>Parent/Guardian Name</label>
                    <input
                      type="text"
                      value={editModal.employee.guardianName || ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, guardianName: e.target.value } }))}
                      placeholder="Enter parent/guardian full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Parent/Guardian Contact</label>
                    <input
                      type="text"
                      value={editModal.employee.guardianContact || ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, guardianContact: e.target.value } }))}
                      placeholder="10-digit contact number"
                      maxLength={10}
                      onKeyPress={(e) => { if (!/^\d$/.test(e.key)) e.preventDefault(); }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Aadhar Card Number</label>
                    <input
                      type="text"
                      value={editModal.employee.aadhar || ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, aadhar: e.target.value } }))}
                      placeholder="12-digit Aadhar number"
                      maxLength={12}
                      onKeyPress={(e) => { if (!/^\d$/.test(e.key)) e.preventDefault(); }}
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details Section */}
              <div className="form-section">
                <h4 className="section-title">Employment Details</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Joining</label>
                    <input
                      type="date"
                      value={editModal.employee.joiningDate ? (typeof editModal.employee.joiningDate === 'string' ? editModal.employee.joiningDate.split('T')[0] : new Date(editModal.employee.joiningDate).toISOString().split('T')[0]) : ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, joiningDate: e.target.value } }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Past Experience (years)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={editModal.employee.experience || ''}
                      onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, experience: e.target.value } }))}
                      placeholder="Years of experience"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role/Department*</label>
                    <select
                      value={editModal.currentCategory}
                      onChange={(e) => setEditModal(prev => ({ ...prev, currentCategory: e.target.value }))}
                      required
                    >
                      <option value="">Select Role</option>
                      {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Employee ID</label>
                    <div className="employee-id-display">
                      {editModal.employee.employeeId || `EMP-${(editModal.employee.name || 'XXXX').replace(/\s+/g, '').slice(0, 4).toUpperCase()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Status Section */}
              <div className="form-section full-width">
                <h4 className="section-title">Employment Status</h4>

                <div className="form-group">
                  <div className="status-toggle">
                    <button
                      type="button"
                      className={`status-option ${editModal.employee.active ? 'status-active' : ''}`}
                      onClick={() => {
                        if (!editModal.employee.active) {
                          const rejoinDate = prompt('Please enter rejoin date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                          if (!rejoinDate) return;
                          setEditModal(prev => ({
                            ...prev,
                            employee: {
                              ...prev.employee,
                              active: true,
                              rejoinDate,
                              resignationDate: '',
                              resignationReason: ''
                            },
                            showRejoinDate: true
                          }));
                        } else {
                          setEditModal(prev => ({ ...prev, employee: { ...prev.employee, active: true }, showRejoinDate: false }));
                        }
                      }}
                    >
                      <span className="status-indicator"></span>Active
                    </button>

                    <button
                      type="button"
                      className={`status-option ${!editModal.employee.active ? 'status-inactive' : ''}`}
                      onClick={() => {
                        const resignationDate = prompt('Please enter resignation date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                        if (!resignationDate) return;
                        const resignationReason = prompt('Please enter reason for resignation:');
                        if (resignationReason === null) return;
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            active: false,
                            resignationDate,
                            resignationReason: resignationReason || 'No reason provided',
                            rejoinDate: ''
                          },
                          showRejoinDate: false
                        }));
                      }}
                    >
                      <span className="status-indicator"></span>Inactive
                    </button>
                  </div>
                </div>

                {editModal.employee.rejoinDate && (
                  <div className="form-group">
                    <label>Rejoin Date</label>
                    <input
                      type="date"
                      value={typeof editModal.employee.rejoinDate === 'string' ? editModal.employee.rejoinDate.split('T')[0] : new Date(editModal.employee.rejoinDate).toISOString().split('T')[0]}
                      readOnly
                      className="readonly-field"
                    />
                  </div>
                )}
              </div>

              {/* Resignation Details Section */}
              {!editModal.employee.active && (
                <div className="form-section full-width">
                  <h4 className="section-title">Resignation Details</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Resignation Date</label>
                      <input
                        type="date"
                        value={editModal.employee.resignationDate ? (typeof editModal.employee.resignationDate === 'string' ? editModal.employee.resignationDate.split('T')[0] : new Date(editModal.employee.resignationDate).toISOString().split('T')[0]) : ''}
                        onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, resignationDate: e.target.value } }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Reason for Resignation</label>
                      <input
                        type="text"
                        value={editModal.employee.resignationReason || ''}
                        onChange={(e) => setEditModal(prev => ({ ...prev, employee: { ...prev.employee, resignationReason: e.target.value } }))}
                        placeholder="Enter reason for resignation"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => { setEditModal({ isOpen: false, employee: null, currentCategory: '', originalCategory: '', showRejoinDate: false }); setImagePreview(null); }}>Cancel</button>
              <button className="documents-button-large" onClick={() => { 
                setEditModal(prev => ({ ...prev, isOpen: false })); 
                openDocumentModal(editModal.employee, editModal.currentCategory); 
              }}>Manage Documents</button>
              <button className="download-individual-button" onClick={() => downloadIndividualData(editModal.employee)}>Download Data</button>
              <button className="save-button" onClick={handleSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .employee-directory { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .tabs { display: flex; margin-bottom: 20px; border-bottom: none; background: #003366; border-radius: 8px 8px 0 0; overflow: hidden; }
        .tabs button { padding: 12px 24px; background: transparent; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 16px; color: #ffffff; transition: background 0.3s ease, color 0.3s ease; }
        .tabs button:hover { background: rgba(255,255,255,0.15); }
        .tabs button.active { border-bottom-color: #ffcc00; font-weight: bold; background: rgba(255,255,255,0.2); color: #ffcc00; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
        .controls { display: flex; align-items: center; gap: 25px; flex-wrap: wrap; }
        .filter-buttons { display: flex; gap: 10px; background: #f0f0f0; padding: 6px; border-radius: 8px; }
        .filter-buttons button { padding: 6px 12px; border-radius: 6px; border: none; background: transparent; color: #555; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; }
        .filter-buttons button.active { background: #003366; color: white; }
        .filter-buttons button:nth-child(2).active { background: #28a745; }
        .filter-buttons button:nth-child(3).active { background: #dc3545; }
        .count-badge { background: rgba(255,255,255,0.2); border-radius: 12px; padding: 2px 8px; font-size: 0.8em; }
        .download-button { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.3s ease; }
        .download-button:hover { background: #3d8b40; }
        .employee-categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; padding: 10px; }
        .category-card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .category-card h3 { color: #002244; border-bottom: 2px solid #003366; padding-bottom: 10px; margin-bottom: 15px; }
        .employee-list { list-style: none; padding: 0; margin: 0; }
        .employee-item { padding: 12px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .inactive-employee { opacity: 0.7; background-color: #f8f9fa; }
        .employee-image-name { display: flex; align-items: flex-start; gap: 10px; flex: 1; cursor: pointer; position: relative; }
        .employee-avatar-image { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #003366; }
        .employee-initials-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .employee-initials-large { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 36px; margin: 0 auto; box-shadow: 0 4px 8px rgba(0,0,0,0.2); border: 3px solid #003366; }
        .employee-image-large { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin: 0 auto; border: 3px solid #003366; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .image-preview-container { display: flex; justify-content: center; align-items: center; margin: 10px 0; min-height: 130px; }
        .employee-details { display: flex; flex-direction: column; gap: 2px; }
        .employee-name { cursor: pointer; font-weight: 500; }
        .inactive-badge { color: #dc3545; font-size: 0.8em; margin-left: 5px; font-weight: normal; }
        .resignation-reason { font-size: 0.75rem; color: #666; font-style: italic; margin-top: 2px; }
        .document-indicators { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
        .doc-indicator { font-size: 0.8rem; cursor: help; padding: 2px 4px; background: #f0f0f0; border-radius: 4px; }
        .employee-actions { display: flex; align-items: center; gap: 8px; }
        .documents-button { background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s; }
        .documents-button:hover { background: #f0f0f0; }
        .documents-button-large { padding: 10px 20px; border-radius: 6px; background: #17a2b8; color: white; border: none; cursor: pointer; font-weight: 500; transition: background 0.3s ease; }
        .documents-button-large:hover { background: #138496; }
        .toggle-switch { position: relative; width: 50px; height: 24px; cursor: pointer; }
        .slider-active { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #28a745; transition: .4s; border-radius: 24px; }
        .slider-inactive { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #dc3545; transition: .4s; border-radius: 24px; }
        .slider-knob { position: absolute; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        .slider-active .slider-knob { transform: translateX(26px); }
        .slider-inactive .slider-knob { transform: translateX(4px); }
        .show-more { margin-top: 10px; background: none; border: none; color: #007BFF; cursor: pointer; padding: 0; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: white; padding: 20px 30px; border-radius: 12px; width: 900px; max-width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eaeaea; }
        .modal-header h3 { color: #003366; margin: 0; font-size: 1.4rem; }
        .close-button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; padding: 0 10px; }
        .form-container { display: flex; flex-wrap: wrap; gap: 20px; width: 100%; }
        .form-section { flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 15px; }
        .form-section.full-width { flex: 1 0 100%; }
        .form-row { display: flex; gap: 15px; width: 100%; }
        .form-row .form-group { flex: 1; margin-bottom: 0; }
        .form-group { margin-bottom: 15px; width: 100%; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #555; font-size: 0.9rem; }
        .form-group input, .form-group select, .file-input { width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid #ddd; font-size: 0.95rem; box-sizing: border-box; }
        .file-input { padding: 8px; }
        .section-title { color: #003366; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 1px solid #eaeaea; font-size: 1.1rem; font-weight: 600; }
        .readonly-field { background-color: #f5f5f5; cursor: not-allowed; }
        .employee-id-display { padding: 10px 12px; background-color: #f0f7ff; border: 1px solid #cce5ff; border-radius: 6px; font-family: monospace; color: #003366; font-weight: 500; }
        .image-info { display: block; margin-top: 5px; color: #666; font-size: 0.8rem; font-style: italic; }
        .status-toggle { display: flex; gap: 10px; background: #f5f5f5; padding: 5px; border-radius: 8px; }
        .status-option { flex: 1; padding: 8px 12px; border-radius: 6px; cursor: pointer; background: transparent; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.9rem; transition: all 0.2s; color: #555; }
        .status-option.status-active { background: #28a745; color: white; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-option.status-inactive { background: #dc3545; color: white; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-indicator { width: 10px; height: 10px; border-radius: 50%; background: white; display: inline-block; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 15px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #eaeaea; flex-wrap: wrap; }
        .download-individual-button { padding: 10px 20px; border-radius: 6px; background: #4CAF50; color: white; border: none; cursor: pointer; font-weight: 500; transition: background 0.3s ease; }
        .download-individual-button:hover { background: #3d8b40; }
        .cancel-button { padding: 10px 20px; border-radius: 6px; background: #f5f5f5; color: #555; border: 1px solid #ddd; cursor: pointer; font-weight: 500; transition: background 0.3s ease; }
        .cancel-button:hover { background: #e0e0e0; }
        .save-button { padding: 10px 20px; border-radius: 6px; background: #003366; color: white; border: none; cursor: pointer; font-weight: 500; transition: background 0.3s ease; }
        .save-button:hover { background: #002244; }
        .save-button:disabled { background: #cccccc; cursor: not-allowed; }
        .loading, .error { padding: 20px; text-align: center; }
        .error { color: red; }
        .popup-message { position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 5px; color: white; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); z-index: 1000; display: flex; align-items: center; max-width: 400px; animation: slideIn 0.3s ease-out; }
        .popup-message.info { background-color: #2196F3; }
        .popup-message.success { background-color: #4CAF50; }
        .popup-message.error { background-color: #F44336; }
        .popup-close { margin-left: 15px; background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0 0 0 10px; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        
        /* Document Modal Styles */
        .document-type-selector { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .document-type-selector select, .document-type-selector input { width: 100%; padding: 8px 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; }
        .two-side-upload { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
        .upload-box { padding: 15px; border: 2px dashed #ccc; border-radius: 8px; text-align: center; }
        .upload-box label { display: block; margin-bottom: 10px; font-weight: 600; color: #003366; }
        .multiple-upload { padding: 20px; border: 2px dashed #ccc; border-radius: 8px; text-align: center; margin: 15px 0; }
        .multiple-upload input { margin: 10px 0; }
        .file-list { margin-top: 10px; max-height: 200px; overflow-y: auto; padding: 10px; background: white; border-radius: 4px; }
        .file-count { font-weight: bold; color: #003366; margin: 0 0 5px 0; padding: 5px; background: #e8f0fe; border-radius: 4px; }
        .file-selected { display: block; font-size: 0.85rem; color: #28a745; margin: 2px 0; padding: 2px 5px; }
        .existing-documents { margin: 20px 0; max-height: 400px; overflow-y: auto; padding: 10px; background: #f8f9fa; border-radius: 8px; }
        .document-group { margin: 15px 0; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .document-group h5 { margin: 0 0 10px 0; color: #003366; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center; }
        .document-subgroup { margin-left: 15px; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .document-subgroup h6 { margin: 0 0 8px 0; color: #555; font-size: 0.9rem; }
        .document-item { display: flex; align-items: flex-start; justify-content: space-between; padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 4px; border: 1px solid #eaeaea; }
        .document-item span { flex: 1; font-size: 0.9rem; line-height: 1.4; }
        .document-item small { color: #666; font-size: 0.8rem; }
        .document-actions { display: flex; gap: 8px; margin-left: 10px; }
        .document-actions button { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; font-size: 0.8rem; transition: background 0.2s; }
        .document-actions button:hover { background: #0056b3; }
        .document-actions .delete-doc { background: #dc3545; }
        .document-actions .delete-doc:hover { background: #c82333; }
        .document-notes-input { margin-top: 10px; }
        .no-documents { color: #999; font-style: italic; padding: 15px; text-align: center; background: white; border-radius: 4px; margin: 0; }
        .document-thumbnail { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid #ddd; }
        .document-thumbnail:hover { opacity: 0.8; }
        .file-icon-container { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 4px; font-size: 24px; cursor: pointer; }
      `}</style>
    </div>
  );
}