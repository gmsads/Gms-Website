import React, { useState } from 'react';
import axios from 'axios';

const Prospective = () => {
    const [formData, setFormData] = useState({
        ExcutiveName: '',  // Capital E and N
        businessName: '',
        phoneNumber: '',
        contactPerson: '',
        location: '',
        followUpDate: new Date().toISOString().split('T')[0],
        requirementDescription: ''
    });

    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const today = new Date().toISOString().split('T')[0]; // for min date

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('/api/prospective-clients', formData);
            console.log('Form submitted successfully:', response.data);
            setFormData({
                ExcutiveName: '', 
                businessName: '',
                phoneNumber: '',
                contactPerson: '',
                location: '',
                followUpDate: today,
                requirementDescription: ''
            });
            setShowModal(true); // show success modal
        } catch (err) {
            console.error('Error submitting form:', err);
            alert('Failed to submit form. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: '15px',
            width: '100%',
            maxWidth: '1000px',
            margin: '10px auto',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            <h2 style={{
                color: '#2c3e50',
                marginBottom: '15px',
                textAlign: 'center',
                borderBottom: '2px solid #3498db',
                paddingBottom: '8px',
                fontSize: '1.5rem'
            }}>
                Prospect Information
            </h2>

            <form onSubmit={handleSubmit} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%'
            }}>
                {/* Row 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontWeight: '600', color: '#34495e', fontSize: '14px' }}>Excutive Name *</label>
                        <input type="text"   name="ExcutiveName"  value={formData.excutive} onChange={handleChange} required style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontWeight: '600', color: '#34495e', fontSize: '14px' }}>Business Name *</label>
                        <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontWeight: '600', color: '#34495e', fontSize: '14px' }}>Phone Number *</label>
                        <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required style={inputStyle} />
                    </div>
                </div>

                {/* Row 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontWeight: '600', color: '#34495e', fontSize: '14px' }}>Contact Person *</label>
                        <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} required style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontWeight: '600', color: '#34495e', fontSize: '14px' }}>Location *</label>
                        <input type="text" name="location" value={formData.location} onChange={handleChange} required style={inputStyle} />
                    </div>
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                    <label style={{ fontWeight: '600', color: '#34495e', fontSize: '14px' }}>Requirement Description</label>
                    <textarea name="requirementDescription" value={formData.requirementDescription} onChange={handleChange} placeholder="Enter details about the client's requirements" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>

                {/* Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '300px' }}>
                    <label style={{ fontWeight: '600', color: '#34495e', fontSize: '14px' }}>Follow-up Date *</label>
                    <input
                        type="date"
                        name="followUpDate"
                        value={formData.followUpDate}
                        onChange={handleChange}
                        min={today}
                        required
                        style={inputStyle}
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '10px 15px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginTop: '15px',
                        width: '100%',
                        maxWidth: '150px',
                        alignSelf: 'flex-end',
                        transition: 'background-color 0.3s',
                        opacity: loading ? 0.7 : 1
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2980b9')}
                    onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#3498db')}
                >
                    {loading ? 'Submitting...' : 'Submit'}
                </button>
            </form>

            {/* Success Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: '9999'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                        textAlign: 'center',
                        maxWidth: '400px'
                    }}>
                        <h3 style={{ color: '#2ecc71', marginBottom: '10px' }}>Success!</h3>
                        <p style={{ color: '#2c3e50', marginBottom: '20px' }}>Prospective client submitted successfully.</p>
                        <button onClick={() => setShowModal(false)} style={{
                            backgroundColor: '#3498db',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const inputStyle = {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    width: '100%'
};

export default Prospective;
