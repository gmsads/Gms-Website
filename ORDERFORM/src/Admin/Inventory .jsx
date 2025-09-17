import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Inventory = () => {
    const [inventoryItems, setInventoryItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        itemName: '',
        quantity: '',
        handlingPerson: '',
        customItem: '',
        itemType: ''
    });
    const [selectedItem, setSelectedItem] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const predefinedItems = [
        'Try Cycles',
        'Rounds',
        'Mobile Vans',
        'Frames',
        'Welding Machine',
        'Racks',
        'Laptops',
        'Chairs',
        'Desktops',
        'Fans'
    ];

    // API base URL
    const API_URL = 'http://localhost:5000/api/inventory';

    // Load inventory from backend
    useEffect(() => {
        const fetchInventory = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(API_URL);
                setInventoryItems(response.data);
                setError(null);
            } catch (err) {
                setError('Failed to fetch inventory. Please try again later.');
                console.error('Error fetching inventory:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventory();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleDropdownChange = (e) => {
        const value = e.target.value;
        setSelectedItem(value);

        if (value !== 'other') {
            setFormData({
                ...formData,
                itemType: value,
                itemName: value,
                customItem: ''
            });
        } else {
            setFormData({
                ...formData,
                itemType: 'Other',
                itemName: ''
            });
        }
    };

    const resetForm = () => {
        setFormData({
            itemName: '',
            quantity: '',
            handlingPerson: '',
            customItem: '',
            itemType: ''
        });
        setSelectedItem('');
        setEditingItem(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const itemData = {
            itemName: selectedItem === 'other' ? formData.customItem : formData.itemName,
            quantity: formData.quantity,
            handlingPerson: formData.handlingPerson,
            itemType: selectedItem === 'other' ? 'Other' : selectedItem
        };

        setIsLoading(true);
        try {
            if (editingItem) {
                // Update existing item
                const response = await axios.put(`${API_URL}/${editingItem._id}`, itemData);
                setInventoryItems(inventoryItems.map(item =>
                    item._id === editingItem._id ? response.data : item
                ));
            } else {
                // Add new item
                const response = await axios.post(API_URL, itemData);
                setInventoryItems([...inventoryItems, response.data]);
            }

            resetForm();
            setShowForm(false);
            setError(null);
        } catch (err) {
            setError(`Failed to ${editingItem ? 'update' : 'add'} item. Please try again.`);
            console.error('Error saving item:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        if (predefinedItems.includes(item.itemName)) {
            setSelectedItem(item.itemName);
            setFormData({
                itemName: item.itemName,
                quantity: item.quantity,
                handlingPerson: item.handlingPerson,
                customItem: '',
                itemType: item.itemType
            });
        } else {
            setSelectedItem('other');
            setFormData({
                itemName: '',
                quantity: item.quantity,
                handlingPerson: item.handlingPerson,
                customItem: item.itemName,
                itemType: item.itemType
            });
        }
        setShowForm(true);
    };

    const deleteItem = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            setIsLoading(true);
            try {
                await axios.delete(`${API_URL}/${id}`);
                setInventoryItems(inventoryItems.filter(item => item._id !== id));
                setError(null);
            } catch (err) {
                setError('Failed to delete item. Please try again.');
                console.error('Error deleting item:', err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.title}>Office Inventory</h1>
                    <p style={styles.subtitle}>Manage your office assets and equipment</p>
                </div>
                <button
                    style={styles.primaryButton}
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    disabled={isLoading}
                >
                    <span style={styles.buttonIcon}>+</span> Add Item
                </button>
            </header>

            {error && (
                <div style={styles.errorAlert}>
                    {error}
                    <button
                        style={styles.alertCloseButton}
                        onClick={() => setError(null)}
                    >
                        &times;
                    </button>
                </div>
            )}

            {showForm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                {editingItem ? 'Edit Inventory Item' : 'Add New Item'}
                            </h2>
                            <button
                                style={styles.closeButton}
                                onClick={() => {
                                    resetForm();
                                    setShowForm(false);
                                }}
                                disabled={isLoading}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Item Type</label>
                                <select
                                    value={selectedItem}
                                    onChange={handleDropdownChange}
                                    required
                                    style={styles.select}
                                    disabled={isLoading}
                                >
                                    <option value="">Select an item type</option>
                                    {predefinedItems.map((item, index) => (
                                        <option key={index} value={item}>{item}</option>
                                    ))}
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {selectedItem === 'other' && (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Custom Item Name</label>
                                    <input
                                        type="text"
                                        name="customItem"
                                        value={formData.customItem}
                                        onChange={handleInputChange}
                                        required
                                        style={styles.input}
                                        placeholder="Enter custom item name"
                                        disabled={isLoading}
                                    />
                                </div>
                            )}

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Quantity</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    required
                                    min="1"
                                    style={styles.input}
                                    placeholder="How many?"
                                    disabled={isLoading}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Responsible Person</label>
                                <input
                                    type="text"
                                    name="handlingPerson"
                                    value={formData.handlingPerson}
                                    onChange={handleInputChange}
                                    required
                                    style={styles.input}
                                    placeholder="Who's responsible?"
                                    disabled={isLoading}
                                />
                            </div>

                            <div style={styles.formActions}>
                                <button
                                    type="button"
                                    style={styles.secondaryButton}
                                    onClick={() => {
                                        resetForm();
                                        setShowForm(false);
                                    }}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={styles.primaryButton}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Processing...' : editingItem ? 'Update Item' : 'Save Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <main style={styles.main}>
                {isLoading && !showForm ? (
                    <div style={styles.loadingState}>
                        <div style={styles.spinner}></div>
                        <p>Loading inventory...</p>
                    </div>
                ) : inventoryItems.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIllustration}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z"></path>
                                <path d="M12 10v4"></path>
                                <path d="M12 10h4.5"></path>
                                <path d="M12 14h4.5"></path>
                                <path d="M7 14h4.5"></path>
                                <path d="M7 10h4.5"></path>
                            </svg>
                        </div>
                        <p style={styles.emptyText}>No inventory items found</p>
                        <button
                            style={styles.primaryButton}
                            onClick={() => setShowForm(true)}
                            disabled={isLoading}
                        >
                            Add Your First Item
                        </button>
                    </div>
                ) : (
                    <div style={styles.tableContainer}>
                        <div style={styles.tableHeader}>
                            <h2 style={styles.sectionTitle}>Current Inventory</h2>
                            <div style={styles.tableStats}>
                                <span style={styles.itemCount}>{inventoryItems.length} items</span>
                                <span style={styles.itemUpdated}>Last updated: {new Date().toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div style={styles.tableScroll}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeaderCell}>Item</th>
                                        <th style={styles.tableHeaderCell}>Type</th>
                                        <th style={styles.tableHeaderCell}>Qty</th>
                                        <th style={styles.tableHeaderCell}>Responsible</th>
                                        <th style={styles.tableHeaderCell}>Added</th>
                                        <th style={styles.tableHeaderCell}>Updated</th>
                                        <th style={styles.tableHeaderCell}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryItems.map((item) => (
                                        <tr key={item._id} style={styles.tableRow}>
                                            <td style={styles.tableCell}>
                                                <div style={styles.itemName}>{item.itemName}</div>
                                                {item.itemName.length > 20 && (
                                                    <div style={styles.itemTooltip}>{item.itemName}</div>
                                                )}
                                            </td>
                                            <td style={styles.tableCell}>{item.itemType}</td>
                                            <td style={styles.tableCell}>
                                                <span style={styles.quantityBadge}>{item.quantity}</span>
                                            </td>
                                            <td style={styles.tableCell}>{item.handlingPerson}</td>
                                            <td style={styles.tableCell}>
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </td>
                                            <td style={styles.tableCell}>
                                                {new Date(item.updatedAt).toLocaleDateString()}
                                            </td>
                                            <td style={styles.tableCell}>
                                                <div style={styles.actionButtons}>
                                                    <button
                                                        style={styles.editButton}
                                                        onClick={() => handleEdit(item)}
                                                        disabled={isLoading}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        style={styles.dangerButton}
                                                        onClick={() => deleteItem(item._id)}
                                                        disabled={isLoading}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// Modern styling with CSS-in-JS
const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#111827',
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1.5rem'
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '700',
        margin: '0 0 0.25rem 0',
        color: '#111827',
        lineHeight: '1.3'
    },
    subtitle: {
        fontSize: '1rem',
        color: '#6b7280',
        margin: 0
    },
    main: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden'
    },
    primaryButton: {
        backgroundColor: '#4f46e5',
        color: 'white',
        padding: '0.75rem 1.25rem',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        ':hover': {
            backgroundColor: '#4338ca',
            transform: 'translateY(-1px)'
        },
        ':disabled': {
            backgroundColor: '#a5b4fc',
            cursor: 'not-allowed',
            transform: 'none'
        }
    },
    buttonIcon: {
        fontSize: '1.1rem',
        fontWeight: 'bold'
    },
    secondaryButton: {
        backgroundColor: 'white',
        color: '#4f46e5',
        padding: '0.75rem 1.25rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        ':hover': {
            backgroundColor: '#f9fafb',
            borderColor: '#d1d5db'
        },
        ':disabled': {
            color: '#a5b4fc',
            borderColor: '#e5e7eb',
            cursor: 'not-allowed'
        }
    },
    editButton: {
        backgroundColor: 'white',
        color: '#2563eb',
        padding: '0.5rem 1rem',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        ':hover': {
            backgroundColor: '#eff6ff'
        },
        ':disabled': {
            color: '#93c5fd',
            borderColor: '#dbeafe',
            cursor: 'not-allowed'
        }
    },
    dangerButton: {
        backgroundColor: 'white',
        color: '#dc2626',
        padding: '0.5rem 1rem',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        marginLeft: '0.5rem',
        ':hover': {
            backgroundColor: '#fef2f2'
        },
        ':disabled': {
            color: '#fca5a5',
            borderColor: '#fee2e2',
            cursor: 'not-allowed'
        }
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
    },
    modalHeader: {
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: {
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#111827'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        color: '#6b7280',
        padding: '0.25rem',
        borderRadius: '4px',
        ':hover': {
            backgroundColor: '#f3f4f6',
            color: '#111827'
        },
        ':disabled': {
            cursor: 'not-allowed',
            opacity: 0.5
        }
    },
    form: {
        padding: '1.5rem'
    },
    formGroup: {
        marginBottom: '1.5rem'
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151'
    },
    input: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '0.95rem',
        transition: 'all 0.2s ease',
        backgroundColor: '#f9fafb',
        ':focus': {
            outline: 'none',
            borderColor: '#4f46e5',
            backgroundColor: 'white',
            boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)'
        },
        ':disabled': {
            backgroundColor: '#f3f4f6',
            cursor: 'not-allowed'
        }
    },
    select: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '0.95rem',
        backgroundColor: '#f9fafb',
        transition: 'all 0.2s ease',
        ':focus': {
            outline: 'none',
            borderColor: '#4f46e5',
            backgroundColor: 'white',
            boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)'
        },
        ':disabled': {
            backgroundColor: '#f3f4f6',
            cursor: 'not-allowed'
        }
    },
    formActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid #e5e7eb'
    },
    emptyState: {
        padding: '4rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    emptyIllustration: {
        marginBottom: '1.5rem',
        opacity: 0.6
    },
    emptyText: {
        color: '#6b7280',
        marginBottom: '1.5rem',
        fontSize: '1rem'
    },
    loadingState: {
        padding: '4rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    spinner: {
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #4f46e5',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem'
    },
    tableContainer: {
        padding: '1.5rem'
    },
    tableHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
    },
    sectionTitle: {
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#111827'
    },
    tableStats: {
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem'
    },
    itemCount: {
        color: '#6b7280',
        fontSize: '0.875rem'
    },
    itemUpdated: {
        color: '#9ca3af',
        fontSize: '0.75rem'
    },
    tableScroll: {
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
    },
    table: {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0',
        minWidth: '800px'
    },
    tableHeaderCell: {
        padding: '0.75rem 1rem',
        textAlign: 'left',
        fontSize: '0.8125rem',
        fontWeight: '600',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        whiteSpace: 'nowrap'
    },
    tableRow: {
        ':hover': {
            backgroundColor: '#f9fafb'
        }
    },
    tableCell: {
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '0.875rem',
        verticalAlign: 'middle'
    },
    itemName: {
        maxWidth: '200px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        position: 'relative',
        ':hover': {
            overflow: 'visible'
        }
    },
    itemTooltip: {
        position: 'absolute',
        top: '100%',
        left: 0,
        backgroundColor: '#111827',
        color: 'white',
        padding: '0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        zIndex: 10,
        whiteSpace: 'normal',
        width: '200px',
        display: 'none'
    },
    quantityBadge: {
        backgroundColor: '#e0e7ff',
        color: '#4f46e5',
        padding: '0.25rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: '600'
    },
    actionButtons: {
        display: 'flex',
        alignItems: 'center'
    },
    errorAlert: {
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    alertCloseButton: {
        background: 'none',
        border: 'none',
        color: '#b91c1c',
        fontSize: '1.25rem',
        cursor: 'pointer',
        padding: '0 0.5rem'
    }
};

export default Inventory;