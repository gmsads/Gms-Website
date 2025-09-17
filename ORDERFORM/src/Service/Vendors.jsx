import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VendorsPage = () => {
    // State for vendors data and UI
    const [vendorsData, setVendorsData] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Category management state
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // New vendor form state
    const [newVendor, setNewVendor] = useState({
        name: '',
        contact: '',
        location: '',
        category: 'mobile-vans',
        details: {
            address: '',
            services: '',
            rating: '',
            availability: 'Mon-Fri, 9AM-6PM',
            notes: ''
        }
    });

    // Vendor categories - initial state
    const [vendorCategories, setVendorCategories] = useState([
        { id: 'mobile-vans', name: 'Mobile Vans' },
        { id: 'try-cycles', name: 'Try Cycles' },
        { id: 'digital-wall', name: 'Digital Wall Pasting' },
        { id: 'pole-boards', name: 'Pole Boards Installation' },
        { id: 'rounds', name: 'Rounds' },
    ]);

    // Fetch vendors from backend
    useEffect(() => {
        const fetchVendors = async () => {
            try {
                setIsLoading(true);
                // Replace with your actual API endpoint
                const response = await axios.get('/api/vendors');
                setVendorsData(response.data);
                setError('');
            } catch (err) {
                setError('Failed to fetch vendors. Please try again later.');
                console.error('Error fetching vendors:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVendors();
    }, []);

     // Filter vendors based on search and category
     const filteredVendors = vendorsData.filter(vendor => {
        const matchesSearch = vendor.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || vendor.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('details.')) {
        const detailField = name.split('.')[1];
        setNewVendor({
            ...newVendor,
            details: {
                ...newVendor.details,
                [detailField]: name === 'details.rating' ? parseFloat(value) : value
            }
        });
    } else {
        setNewVendor({
            ...newVendor,
            [name]: value
        });
    }
};

    // Submit new vendor to backend
    
    // Submit new vendor to backend
    const handleAddVendor = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!newVendor.name || !newVendor.contact || !newVendor.location) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setIsLoading(true);
            const response = await axios.post('/api/vendors', {
                ...newVendor,
                contact: String(newVendor.contact) // Ensure contact is string
            });

            setVendorsData([...vendorsData, response.data]);
            setShowAddForm(false);
            setNewVendor({
                name: '',
                contact: '',
                location: '',
                category: 'mobile-vans',
                details: {
                    address: '',
                    services: '',
                    rating: 0,
                    availability: 'Mon-Fri, 9AM-6PM',
                    notes: ''
                }
            });
            setError('');
        } catch (err) {
            setError(`Failed to add vendor: ${err.response?.data?.message || err.message}`);
            console.error('Error adding vendor:', err);
        } finally {
            setIsLoading(false);
        }
    };


    const handleAddCategory = () => {
        if (!newCategoryName.trim()) {
            setError('Category name cannot be empty');
            return;
        }
        
        const newCategory = {
            id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
            name: newCategoryName.trim()
        };
        
        // Check if category already exists
        if (vendorCategories.some(cat => cat.id === newCategory.id)) {
            setError('This category already exists');
            return;
        }
        
        setVendorCategories([...vendorCategories, newCategory]);
        setNewCategoryName('');
        setShowAddCategory(false);
        setSelectedCategory(newCategory.id);
        setNewVendor(prev => ({ ...prev, category: newCategory.id }));
        setError('');
    };


    // Styles
    const styles = {
        container: {
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        searchInput: {
            padding: '10px',
            width: '300px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            marginRight: '10px'
        },
        categoryButtons: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '20px'
        },
        categoryButton: {
            padding: '8px 15px',
            borderRadius: '20px',
            border: '1px solid #003366',
            backgroundColor: 'white',
            color: '#003366',
            cursor: 'pointer',
            transition: 'all 0.3s'
        },
        activeCategoryButton: {
            backgroundColor: '#003366',
            color: 'white'
        },
        vendorGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
            marginTop: '20px'
        },
        vendorCard: {
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '15px',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            ':hover': {
                transform: 'translateY(-5px)'
            }
        },
        vendorName: {
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '5px',
            color: '#003366'
        },
        vendorInfo: {
            margin: '5px 0',
            fontSize: '14px'
        },
        detailContainer: {
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '20px',
            marginTop: '20px'
        },
        detailHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid #eee',
            paddingBottom: '15px'
        },
        backButton: {
            padding: '8px 15px',
            backgroundColor: '#003366',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        },
        detailTitle: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#003366'
        },
        detailSection: {
            marginBottom: '20px'
        },
        detailRow: {
            display: 'flex',
            marginBottom: '8px'
        },
        detailLabel: {
            width: '150px',
            fontWeight: 'bold'
        },
        detailValue: {
            flex: 1
        },
        formGroup: {
            marginBottom: '15px'
        },
        formLabel: {
            display: 'block',
            marginBottom: '5px',
            fontWeight: '500'
        },
        formInput: {
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd'
        },
        formActions: {
            display: 'flex',
            gap: '10px',
            marginTop: '20px'
        },
        submitButton: {
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        },
        cancelButton: {
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        },
        errorText: {
            color: 'red',
            marginBottom: '15px'
        },
        loadingText: {
            textAlign: 'center',
            padding: '40px'
        },
        addCategoryContainer: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            alignItems: 'center'
        },
        addCategoryInput: {
            padding: '10px',
            width: '200px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            margin: '0'
        }
    };

    return (
        <div style={styles.container}>
            {isLoading && !vendorsData.length ? (
                <div style={styles.loadingText}>Loading vendors...</div>
            ) : error ? (
                <div style={styles.errorText}>{error}</div>
            ) : !selectedVendor ? (
                <>
                    <div style={styles.header}>
                        <h2>Vendors</h2>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Search by location or name..."
                                style={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                onClick={() => setShowAddForm(true)}
                                style={{
                                    padding: '8px 15px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    marginLeft: '10px'
                                }}
                            >
                                Add New Vendor
                            </button>
                        </div>
                    </div>

                    {showAddCategory && (
                        <div style={styles.addCategoryContainer}>
                            <input
                                type="text"
                                placeholder="New category name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                style={styles.addCategoryInput}
                            />
                            <button
                                onClick={handleAddCategory}
                                style={{
                                    ...styles.submitButton,
                                    padding: '8px 15px'
                                }}
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddCategory(false);
                                    setNewCategoryName('');
                                    setError('');
                                }}
                                style={{
                                    ...styles.cancelButton,
                                    padding: '8px 15px'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    <div style={styles.categoryButtons}>
                        <button
                            style={{
                                ...styles.categoryButton,
                                ...(selectedCategory === 'all' ? styles.activeCategoryButton : {})
                            }}
                            onClick={() => setSelectedCategory('all')}
                        >
                            All Vendors
                        </button>
                        {vendorCategories.map(category => (
                            <button
                                key={category.id}
                                style={{
                                    ...styles.categoryButton,
                                    ...(selectedCategory === category.id ? styles.activeCategoryButton : {})
                                }}
                                onClick={() => setSelectedCategory(category.id)}
                            >
                                {category.name}
                            </button>
                        ))}
                        <button
                            style={{
                                ...styles.categoryButton,
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none'
                            }}
                            onClick={() => setShowAddCategory(true)}
                        >
                            + Add Category
                        </button>
                    </div>

                    {showAddForm && (
                        <div style={{
                            backgroundColor: 'white',
                            padding: '20px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            marginBottom: '20px'
                        }}>
                            <h3>Add New Vendor</h3>

                            <form onSubmit={handleAddVendor}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Vendor Name*:</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={newVendor.name}
                                        onChange={handleInputChange}
                                        style={styles.formInput}
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Contact Number*:</label>
                                    <input
                                        type="tel"
                                        name="contact"
                                        value={newVendor.contact}
                                        onChange={handleInputChange}
                                        style={styles.formInput}
                                        required
                                        maxLength={10}
                                        pattern="[0-9]{10}"
                                        title="Please enter a valid 10-digit number"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Location*:</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={newVendor.location}
                                        onChange={handleInputChange}
                                        style={styles.formInput}
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Category*:</label>
                                    <select
                                        name="category"
                                        value={newVendor.category}
                                        onChange={handleInputChange}
                                        style={styles.formInput}
                                        required
                                    >
                                        {vendorCategories.map(category => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Address:</label>
                                    <input
                                        type="text"
                                        name="details.address"
                                        value={newVendor.details.address}
                                        onChange={handleInputChange}
                                        style={styles.formInput}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Services Offered:</label>
                                    <input
                                        type="text"
                                        name="details.services"
                                        value={newVendor.details.services}
                                        onChange={handleInputChange}
                                        style={styles.formInput}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Availability:</label>
                                    <input
                                        type="text"
                                        name="details.availability"
                                        value={newVendor.details.availability}
                                        onChange={handleInputChange}
                                        style={styles.formInput}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Notes:</label>
                                    <textarea
                                        name="details.notes"
                                        value={newVendor.details.notes}
                                        onChange={handleInputChange}
                                        style={{ ...styles.formInput, minHeight: '80px' }}
                                    />
                                </div>

                                <div style={styles.formActions}>
                                    <button
                                        type="submit"
                                        style={styles.submitButton}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Saving...' : 'Save Vendor'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        style={styles.cancelButton}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {filteredVendors.length > 0 ? (
                        <div style={styles.vendorGrid}>
                            {filteredVendors.map(vendor => (
                                <div
                                    key={vendor.id}
                                    style={styles.vendorCard}
                                    onClick={() => setSelectedVendor(vendor)}
                                >
                                    <div style={styles.vendorName}>{vendor.name}</div>
                                    <div style={styles.vendorInfo}><strong>Contact:</strong> {vendor.contact}</div>
                                    <div style={styles.vendorInfo}><strong>Location:</strong> {vendor.location}</div>
                                    <div style={styles.vendorInfo}>
                                        <strong>Type:</strong> {vendorCategories.find(c => c.id === vendor.category)?.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            No vendors found matching your criteria
                        </div>
                    )}
                </>
            ) : (
                <div style={styles.detailContainer}>
                    <div style={styles.detailHeader}>
                        <button
                            style={styles.backButton}
                            onClick={() => setSelectedVendor(null)}
                        >
                            Back to Vendors
                        </button>
                        <div style={styles.detailTitle}>{selectedVendor.name}</div>
                    </div>

                    <div style={styles.detailSection}>
                        <div style={{ ...styles.detailTitle, fontSize: '18px' }}>Basic Information</div>
                        <div style={styles.detailRow}>
                            <div style={styles.detailLabel}>Contact:</div>
                            <div style={styles.detailValue}>{selectedVendor.contact}</div>
                        </div>
                        <div style={styles.detailRow}>
                            <div style={styles.detailLabel}>Location:</div>
                            <div style={styles.detailValue}>{selectedVendor.location}</div>
                        </div>
                        <div style={styles.detailRow}>
                            <div style={styles.detailLabel}>Category:</div>
                            <div style={styles.detailValue}>
                                {vendorCategories.find(c => c.id === selectedVendor.category)?.name}
                            </div>
                        </div>
                    </div>

                    <div style={styles.detailSection}>
                        <div style={{ ...styles.detailTitle, fontSize: '18px' }}>Service Details</div>
                        <div style={styles.detailRow}>
                            <div style={styles.detailLabel}>Address:</div>
                            <div style={styles.detailValue}>{selectedVendor.details.address}</div>
                        </div>
                        <div style={styles.detailRow}>
                            <div style={styles.detailLabel}>Services:</div>
                            <div style={styles.detailValue}>{selectedVendor.details.services}</div>
                        </div>
                        <div style={styles.detailRow}>
                            <div style={styles.detailLabel}>Availability:</div>
                            <div style={styles.detailValue}>{selectedVendor.details.availability}</div>
                        </div>
                        <div style={styles.detailRow}>
                            <div style={styles.detailLabel}>Rating:</div>
                            <div style={styles.detailValue}>{selectedVendor.details.rating}/5</div>
                        </div>
                    </div>

                    <div style={styles.detailSection}>
                        <div style={{ ...styles.detailTitle, fontSize: '18px' }}>Additional Notes</div>
                        <div>{selectedVendor.details.notes}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorsPage;