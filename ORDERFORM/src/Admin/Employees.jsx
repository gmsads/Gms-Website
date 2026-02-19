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

  const roleOptions = useMemo(() => [
    'Executive',
    'Admin',
    'Designer',
    'Account',
    'ServiceExecutive',
    'ServiceManager',
    'SalesManager',
    'ITTeam',
    'DigitalMarketing',
    'ClientService',
    'HR',
    'Vendor',
    'Agent',
    'FieldExecutive',
    'Unit'
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
          resignationReason: employee.resignationReason || ''
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

  const showPopup = useCallback((message, type = 'info') => {
    setPopupMessage({ show: true, message, type });
    setTimeout(() => {
      setPopupMessage(prev => ({ ...prev, show: false }));
    }, 5000);
  }, []);

  const handleRejoinSubmit = useCallback(async () => {
    try {
      const { employee, category, rejoinDate } = rejoinModal;

      if (!rejoinDate) {
        showPopup('Rejoin date is required', 'error');
        return;
      }

      const updates = {
        active: true,
        rejoinDate,
        resignationDate: '',
        resignationReason: ''
      };

      // Find the correct index in the original array
      const originalIndex = employeeCategories[category]?.findIndex(emp => emp.name === employee.name);
      
      if (originalIndex === -1) {
        throw new Error('Employee not found');
      }

      // Update server first
      const response = await fetch('/api/employees/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: employee.name,
          updates
        })
      });

      if (!response.ok) {
        throw new Error('Status update failed on server');
      }

      // Then update local state
      setEmployeeCategories(prev => {
        const updated = { ...prev };
        updated[category] = [...updated[category]];
        updated[category][originalIndex] = {
          ...updated[category][originalIndex],
          ...updates
        };
        return updated;
      });

      showPopup(`${employee.name} has rejoined on ${rejoinDate}`, 'success');
      setRejoinModal({
        isOpen: false,
        employee: null,
        category: '',
        index: -1,
        rejoinDate: new Date().toISOString().split('T')[0]
      });

    } catch (err) {
      console.error('Rejoin error:', err);
      showPopup('Failed to update status', 'error');
      await fetchEmployees();
    }
  }, [rejoinModal, employeeCategories, fetchEmployees, showPopup]);

  const toggleEmployeeStatus = useCallback(async (category, index, employee) => {
    try {
      if (employee.active) {
        // Deactivating an active employee - show resignation modal
        setResignationModal({
          isOpen: true,
          employee,
          category,
          index: -1,
          resignationDate: new Date().toISOString().split('T')[0],
          resignationReason: ''
        });
      } else {
        // Activating an inactive employee - show rejoin modal
        setRejoinModal({
          isOpen: true,
          employee,
          category,
          index: -1,
          rejoinDate: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err) {
      console.error('Status update error:', err);
      showPopup('Failed to update status. Refreshing data...', 'error');
      await fetchEmployees();
    }
  }, [fetchEmployees, showPopup]);

  const handleResignationSubmit = useCallback(async () => {
    try {
      const { employee, category, resignationDate, resignationReason } = resignationModal;

      if (!resignationDate || !resignationReason) {
        showPopup('Resignation date and reason are required', 'error');
        return;
      }

      const updates = {
        active: false,
        resignationDate,
        resignationReason,
        rejoinDate: ''
      };

      // Find the correct index in the original array
      const originalIndex = employeeCategories[category]?.findIndex(emp => emp.name === employee.name);
      
      if (originalIndex === -1) {
        throw new Error('Employee not found');
      }

      // Update server first
      const response = await fetch('/api/employees/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: employee.name,
          updates
        })
      });

      if (!response.ok) {
        throw new Error('Status update failed on server');
      }

      // Then update local state
      setEmployeeCategories(prev => {
        const updated = { ...prev };
        updated[category] = [...updated[category]];
        updated[category][originalIndex] = {
          ...updated[category][originalIndex],
          ...updates
        };
        return updated;
      });

      showPopup(`${employee.name} has been deactivated`, 'success');
      setResignationModal({
        isOpen: false,
        employee: null,
        category: '',
        index: -1,
        resignationDate: new Date().toISOString().split('T')[0],
        resignationReason: ''
      });

    } catch (err) {
      console.error('Resignation error:', err);
      showPopup('Failed to update status', 'error');
      await fetchEmployees();
    }
  }, [resignationModal, employeeCategories, fetchEmployees, showPopup]);

  const filteredCategories = useMemo(() => {
    return Object.entries(employeeCategories).reduce((acc, [category, employees]) => {
      const filtered = employees.filter(employee => {
        switch (activeFilter) {
          case 'active': return employee.active === true;
          case 'inactive': return employee.active === false;
          default: return true;
        }
      });

      if (filtered.length > 0) {
        acc[category] = filtered;
      }
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

    setCounts({
      active: activeCount,
      inactive: inactiveCount,
      total: activeCount + inactiveCount
    });
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
        imageFile: null
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
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      setEditModal(prev => ({
        ...prev,
        employee: {
          ...prev.employee,
          imageFile: file
        }
      }));
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const { employee, currentCategory } = editModal;

      if (!employee.name || !employee.phone || !employee.username) {
        throw new Error('Please fill all required fields');
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
      formData.append('active', employee.active);

      if (employee.rejoinDate) {
        formData.append('rejoinDate', employee.rejoinDate);
      }

      if (!employee.active) {
        formData.append('resignationDate', employee.resignationDate || '');
        formData.append('resignationReason', employee.resignationReason || '');
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

      const result = await response.json();
      
      await fetchEmployees();
      setEditModal({ isOpen: false, employee: null, currentCategory: '', originalCategory: '' });
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
        imageUrl: emp.imageUrl || 'No image'
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
      rejoinDate: employee.rejoinDate || 'N/A'
    }]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee");
    XLSX.writeFile(wb, `${employee.name}_data.xlsx`);
  }, [editModal.currentCategory]);

  const toggleCategoryExpansion = useCallback((category) => {
    setExpanded(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  // Clean up preview URL when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  if (loading) return <div className="loading">Loading employees...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="employee-directory">
      {popupMessage.show && (
        <div className={`popup-message ${popupMessage.type}`}>
          {popupMessage.message}
          <button
            className="popup-close"
            onClick={() => setPopupMessage(prev => ({ ...prev, show: false }))}
          >
            &times;
          </button>
        </div>
      )}

      {resignationModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Resignation Details</h3>
              <button
                className="close-button"
                onClick={() => setResignationModal({
                  isOpen: false,
                  employee: null,
                  category: '',
                  index: -1,
                  resignationDate: new Date().toISOString().split('T')[0],
                  resignationReason: ''
                })}
              >
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
              <button
                className="cancel-button"
                onClick={() => setResignationModal({
                  isOpen: false,
                  employee: null,
                  category: '',
                  index: -1,
                  resignationDate: new Date().toISOString().split('T')[0],
                  resignationReason: ''
                })}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={handleResignationSubmit}
              >
                Confirm Resignation
              </button>
            </div>
          </div>
        </div>
      )}

      {rejoinModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Set Rejoin Date</h3>
              <button
                className="close-button"
                onClick={() => setRejoinModal({
                  isOpen: false,
                  employee: null,
                  category: '',
                  index: -1,
                  rejoinDate: new Date().toISOString().split('T')[0]
                })}
              >
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
              <button
                className="cancel-button"
                onClick={() => setRejoinModal({
                  isOpen: false,
                  employee: null,
                  category: '',
                  index: -1,
                  rejoinDate: new Date().toISOString().split('T')[0]
                })}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={handleRejoinSubmit}
              >
                Confirm Rejoin
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'directory' ? 'active' : ''}
          onClick={() => setActiveTab('directory')}
        >
          Employee Directory
        </button>
        <button
          className={activeTab === 'attendance' ? 'active' : ''}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </button>
        <button
          className={activeTab === 'salaries' ? 'active' : ''}
          onClick={() => setActiveTab('salaries')}
        >
          Salaries
        </button>
      </div>

      {activeTab === 'directory' && (
        <>
          <div className="header">
            <h1>Employee Directory</h1>
            <div className="controls">
              <div className="filter-buttons">
                <button
                  className={activeFilter === 'active' ? 'active' : ''}
                  onClick={() => setActiveFilter('active')}
                >
                  Active <span className="count-badge">{counts.active}</span>
                </button>
                <button
                  className={activeFilter === 'inactive' ? 'active' : ''}
                  onClick={() => setActiveFilter('inactive')}
                >
                  Inactive <span className="count-badge">{counts.inactive}</span>
                </button>
                <button
                  className={activeFilter === 'all' ? 'active' : ''}
                  onClick={() => setActiveFilter('all')}
                >
                  All <span className="count-badge">{counts.total}</span>
                </button>
              </div>
              <button className="download-button" onClick={downloadEmployeeData}>
                Download Data
              </button>
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
                      <li
                        key={`${category}-${employee.name}-${index}`}
                        className={`employee-item ${employee.active ? '' : 'inactive-employee'}`}
                      >
                        <div className="employee-image-name" onClick={() => handleEditClick(employee, category)}>
                          {employee.imageUrl ? (
                            <img 
                              src={employee.imageUrl} 
                              alt={employee.name}
                              className="employee-avatar-image"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentNode.querySelector('.employee-initials-avatar-fallback').style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="employee-initials-avatar"
                            style={{ 
                              backgroundColor: getAvatarColor(employee.name),
                              display: employee.imageUrl ? 'none' : 'flex'
                            }}
                          >
                            {getInitials(employee.name)}
                          </div>
                          <div className="employee-details">
                            <span className="employee-name">
                              {employee.name}
                              {!employee.active && <span className="inactive-badge"> (Inactive)</span>}
                            </span>
                            {!employee.active && (
                              <div className="resignation-reason">
                                Reason: {employee.resignationReason || 'No reason provided'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="employee-status">
                          <div
                            onClick={() => toggleEmployeeStatus(category, index, employee)}
                            className="toggle-switch"
                            aria-label={employee.active ? 'Deactivate' : 'Activate'}
                          >
                            <div className={`slider ${employee.active ? 'active' : ''}`}>
                              <span className="slider-knob"></span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {shouldShowMore && (
                    <button
                      className="show-more"
                      onClick={() => toggleCategoryExpansion(category)}
                    >
                      {isExpanded ? '- less' : '+ more'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'attendance' && (
        <AttendanceComponent employees={Object.values(employeeCategories).flat()} />
      )}

      {activeTab === 'salaries' && (
        <SalaryComponent employees={Object.values(employeeCategories).flat()} />
      )}

      {editModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Employee Details</h3>
              <button
                className="close-button"
                onClick={() => {
                  setEditModal({
                    isOpen: false,
                    employee: null,
                    currentCategory: '',
                    originalCategory: '',
                    showRejoinDate: false
                  });
                  setImagePreview(null);
                }}
              >
                &times;
              </button>
            </div>

            <div className="form-container">
              {/* Profile Image Section */}
              <div className="form-section">
                <div className="form-group">
                  <label>Employee Photo</label>
                  <div className="image-preview-container">
                    {(imagePreview || editModal.employee.imageUrl) && !editModal.employee.imageFile ? (
                      <img 
                        src={imagePreview || editModal.employee.imageUrl} 
                        alt={editModal.employee.name}
                        className="employee-image-large"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentNode.querySelector('.employee-initials-large-fallback').style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="employee-initials-large"
                      style={{ 
                        backgroundColor: getAvatarColor(editModal.employee.name),
                        display: (imagePreview || editModal.employee.imageUrl) && !editModal.employee.imageFile ? 'none' : 'flex'
                      }}
                    >
                      {getInitials(editModal.employee.name)}
                    </div>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Upload New Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input"
                  />
                  {editModal.employee.imageUrl && !editModal.employee.imageFile && (
                    <small className="image-info">
                      Current photo uploaded. Upload a new photo to replace it.
                    </small>
                  )}
                  {editModal.employee.imageFile && (
                    <small className="image-info">
                      New photo selected: {editModal.employee.imageFile.name}
                    </small>
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
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            name: e.target.value
                          }
                        }))
                      }
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Username*</label>
                    <input
                      type="text"
                      value={editModal.employee.username || ''}
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            username: e.target.value
                          }
                        }))
                      }
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
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            email: e.target.value
                          }
                        }))
                      }
                      placeholder="employee@company.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number*</label>
                    <input
                      type="tel"
                      value={editModal.employee.phone || ''}
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            phone: e.target.value
                          }
                        }))
                      }
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      onKeyPress={(e) => {
                        if (!/^\d$/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
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
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            guardianName: e.target.value
                          }
                        }))
                      }
                      placeholder="Enter parent/guardian full name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Parent/Guardian Contact</label>
                    <input
                      type="text"
                      value={editModal.employee.guardianContact || ''}
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            guardianContact: e.target.value
                          }
                        }))
                      }
                      placeholder="10-digit contact number"
                      maxLength={10}
                      onKeyPress={(e) => {
                        if (!/^\d$/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Aadhar Card Number</label>
                    <input
                      type="text"
                      value={editModal.employee.aadhar || ''}
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            aadhar: e.target.value
                          }
                        }))
                      }
                      placeholder="12-digit Aadhar number"
                      maxLength={12}
                      onKeyPress={(e) => {
                        if (!/^\d$/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
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
                      value={editModal.employee.joiningDate ? 
                        (typeof editModal.employee.joiningDate === 'string' 
                          ? editModal.employee.joiningDate.split('T')[0] 
                          : new Date(editModal.employee.joiningDate).toISOString().split('T')[0]
                        ) : ''
                      }
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            joiningDate: e.target.value
                          }
                        }))
                      }
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
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          employee: {
                            ...prev.employee,
                            experience: e.target.value
                          }
                        }))
                      }
                      placeholder="Years of experience"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role/Department*</label>
                    <select
                      value={editModal.currentCategory}
                      onChange={(e) =>
                        setEditModal(prev => ({
                          ...prev,
                          currentCategory: e.target.value
                        }))
                      }
                      required
                    >
                      <option value="">Select Role</option>
                      {roleOptions.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Employee ID</label>
                    <div className="employee-id-display">
                      {editModal.employee.employeeId ||
                        `EMP-${(editModal.employee.name || 'XXXX').replace(/\s+/g, '').slice(0, 4).toUpperCase()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`}
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
                      className={`status-option ${editModal.employee.active ? 'active' : ''}`}
                      data-status="active"
                      onClick={() => {
                        const wasInactive = !editModal.employee.active;
                        
                        if (wasInactive) {
                          const rejoinDate = prompt('Please enter rejoin date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                          if (!rejoinDate) return;

                          setEditModal(prev => ({
                            ...prev,
                            employee: {
                              ...prev.employee,
                              active: true,
                              rejoinDate: rejoinDate,
                              resignationDate: '',
                              resignationReason: ''
                            },
                            showRejoinDate: true
                          }));
                        } else {
                          setEditModal(prev => ({
                            ...prev,
                            employee: {
                              ...prev.employee,
                              active: true
                            },
                            showRejoinDate: false
                          }));
                        }
                      }}
                    >
                      <span className="status-indicator active"></span>
                      Active
                    </button>
                    
                    <button
                      type="button"
                      className={`status-option ${!editModal.employee.active ? 'active' : ''}`}
                      data-status="inactive"
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
                            resignationDate: resignationDate,
                            resignationReason: resignationReason || 'No reason provided',
                            rejoinDate: ''
                          },
                          showRejoinDate: false
                        }));
                      }}
                    >
                      <span className="status-indicator inactive"></span>
                      Inactive
                    </button>
                  </div>
                </div>

                {editModal.employee.rejoinDate && (
                  <div className="form-group">
                    <label>Rejoin Date</label>
                    <input
                      type="date"
                      value={typeof editModal.employee.rejoinDate === 'string' 
                        ? editModal.employee.rejoinDate.split('T')[0] 
                        : new Date(editModal.employee.rejoinDate).toISOString().split('T')[0]
                      }
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
                        value={editModal.employee.resignationDate ? 
                          (typeof editModal.employee.resignationDate === 'string' 
                            ? editModal.employee.resignationDate.split('T')[0] 
                            : new Date(editModal.employee.resignationDate).toISOString().split('T')[0]
                          ) : ''
                        }
                        onChange={(e) =>
                          setEditModal(prev => ({
                            ...prev,
                            employee: {
                              ...prev.employee,
                              resignationDate: e.target.value
                            }
                          }))
                        }
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Reason for Resignation</label>
                      <input
                        type="text"
                        value={editModal.employee.resignationReason || ''}
                        onChange={(e) =>
                          setEditModal(prev => ({
                            ...prev,
                            employee: {
                              ...prev.employee,
                              resignationReason: e.target.value
                            }
                          }))
                        }
                        placeholder="Enter reason for resignation"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => {
                  setEditModal({
                    isOpen: false,
                    employee: null,
                    currentCategory: '',
                    originalCategory: '',
                    showRejoinDate: false
                  });
                  setImagePreview(null);
                }}
              >
                Cancel
              </button>
              
              <button
                className="download-individual-button"
                onClick={() => downloadIndividualData(editModal.employee)}
              >
                Download Data
              </button>
              
              <button
                className="save-button"
                onClick={handleSave}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .employee-directory {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: none;
          background: #003366;
          border-radius: 8px 8px 0 0;
          overflow: hidden;
        }

        .tabs button {
          padding: 12px 24px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
          color: #ffffff;
          transition: background 0.3s ease, color 0.3s ease;
        }

        .tabs button:hover {
          background: rgba(255,255,255,0.15);
        }

        .tabs button.active {
          border-bottom-color: #ffcc00;
          font-weight: bold;
          background: rgba(255,255,255,0.2);
          color: #ffcc00;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 25px;
          flex-wrap: wrap;
        }

        .filter-buttons {
          display: flex;
          gap: 10px;
          background: #f0f0f0;
          padding: 6px;
          border-radius: 8px;
        }

        .filter-buttons button {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #555;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .filter-buttons button.active {
          background: #003366;
          color: white;
        }

        .filter-buttons button:nth-child(2).active {
          background: #28a745;
        }

        .filter-buttons button:nth-child(3).active {
          background: #dc3545;
        }

        .count-badge {
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 0.8em;
        }

        .download-button {
          padding: 8px 16px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.3s ease;
        }

        .download-button:hover {
          background: #3d8b40;
        }

        .employee-categories {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          padding: 10px;
        }

        .category-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .category-card h3 {
          color: #002244;
          border-bottom: 2px solid #003366;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }

        .employee-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .employee-item {
          padding: 12px 0;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .inactive-employee {
          opacity: 0.7;
          background-color: #f8f9fa;
        }

        .employee-image-name {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          flex: 1;
          cursor: pointer;
          position: relative;
        }

        .employee-avatar-image {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #003366;
        }

        .employee-initials-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .employee-initials-large {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 36px;
          margin: 0 auto;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          border: 3px solid #003366;
        }

        .employee-image-large {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto;
          border: 3px solid #003366;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .image-preview-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 10px 0;
          min-height: 130px;
        }

        .employee-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .employee-name {
          cursor: pointer;
          font-weight: 500;
        }

        .inactive-badge {
          color: #dc3545;
          font-size: 0.8em;
          margin-left: 5px;
          font-weight: normal;
        }

        .resignation-reason {
          font-size: 0.75rem;
          color: #666;
          font-style: italic;
          margin-top: 2px;
        }

        .employee-status {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toggle-switch {
          position: relative;
          width: 50px;
          height: 24px;
          cursor: pointer;
        }

        .slider {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #dc3545;
          transition: .4s;
          border-radius: 24px;
        }

        .slider.active {
          background-color: #28a745;
        }

        .slider-knob {
          position: absolute;
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        .slider.active .slider-knob {
          transform: translateX(26px);
        }

        .show-more {
          margin-top: 10px;
          background: none;
          border: none;
          color: #007BFF;
          cursor: pointer;
          padding: 0;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 20px 30px;
          border-radius: 12px;
          width: 900px;
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eaeaea;
        }

        .modal-header h3 {
          color: #003366;
          margin: 0;
          font-size: 1.4rem;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #999;
          padding: 0 10px;
        }

        .form-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          width: 100%;
        }

        .form-section {
          flex: 1;
          min-width: 300px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-section.full-width {
          flex: 1 0 100%;
        }

        .form-row {
          display: flex;
          gap: 15px;
          width: 100%;
        }

        .form-row .form-group {
          flex: 1;
          margin-bottom: 0;
        }

        .form-group {
          margin-bottom: 15px;
          width: 100%;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #555;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select,
        .file-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 0.95rem;
          box-sizing: border-box;
        }

        .file-input {
          padding: 8px;
        }

        .section-title {
          color: #003366;
          margin: 0 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #eaeaea;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .readonly-field {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .employee-id-display {
          padding: 10px 12px;
          background-color: #f0f7ff;
          border: 1px solid #cce5ff;
          border-radius: 6px;
          font-family: monospace;
          color: #003366;
          font-weight: 500;
        }

        .image-info {
          display: block;
          margin-top: 5px;
          color: #666;
          font-size: 0.8rem;
          font-style: italic;
        }

        .status-toggle {
          display: flex;
          gap: 10px;
          background: #f5f5f5;
          padding: 5px;
          border-radius: 8px;
        }

        .status-option {
          flex: 1;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.9rem;
        }

        .status-option.active[data-status="active"] {
          background: #e6f7e6;
          color: #28a745;
          font-weight: 500;
        }

        .status-option.active[data-status="inactive"] {
          background: #fde8e8;
          color: #dc3545;
          font-weight: 500;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-indicator.active {
          background: #28a745;
        }

        .status-indicator.inactive {
          background: #dc3545;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px solid #eaeaea;
          flex-wrap: wrap;
        }

        .download-individual-button {
          padding: 10px 20px;
          border-radius: 6px;
          background: #4CAF50;
          color: white;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .cancel-button {
          padding: 10px 20px;
          border-radius: 6px;
          background: #f5f5f5;
          color: #555;
          border: 1px solid #ddd;
          cursor: pointer;
          font-weight: 500;
        }

        .save-button {
          padding: 10px 20px;
          border-radius: 6px;
          background: #003366;
          color: white;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .loading, .error {
          padding: 20px;
          text-align: center;
        }

        .error {
          color: red;
        }

        .popup-message {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 20px;
          border-radius: 5px;
          color: white;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          display: flex;
          align-items: center;
          max-width: 400px;
          animation: slideIn 0.3s ease-out;
        }

        .popup-message.info {
          background-color: #2196F3;
        }

        .popup-message.success {
          background-color: #4CAF50;
        }

        .popup-message.error {
          background-color: #F44336;
        }

        .popup-close {
          margin-left: 15px;
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 0 0 0 10px;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}