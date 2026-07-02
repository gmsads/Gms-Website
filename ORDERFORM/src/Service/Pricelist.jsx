import React, { useState, useEffect } from 'react';

const PriceList = () => {
  // All price list items in the exact order: No Parking → Auto → Mobile Vans → Others
  const priceItems = [
    // ===== NO PARKING BOARDS (FLUTE BOARDS) - FIRST =====
    { category: "NO PARKING BOARDS", product: "No Parking Board", size: "12x9 Screen", price: 12, installation: 10 },
    { category: "NO PARKING BOARDS", product: "No Parking Board", size: "12x9 UV Print", price: 15, installation: 10 },
    { category: "NO PARKING BOARDS", product: "No Parking Board", size: "12x12 Screen", price: 15, installation: 10 },
    { category: "NO PARKING BOARDS", product: "No Parking Board", size: "12x12 UV Print", price: 18, installation: 10 },
    { category: "NO PARKING BOARDS", product: "No Parking Board", size: "12x18 Screen", price: 22, installation: 10 },
    { category: "NO PARKING BOARDS", product: "No Parking Board", size: "12x18 UV Print", price: 27, installation: 10 },
    
    // ===== POLE BOARDS - SECOND =====
    { category: "POLE BOARDS (FLUTE BOARDS)", product: "Pole Board", size: "18x18 Screen", price: 33, installation: 25 },
    { category: "POLE BOARDS (FLUTE BOARDS)", product: "Pole Board", size: "18x18 UV Print", price: 41, installation: 25 },
    { category: "POLE BOARDS (FLUTE BOARDS)", product: "Pole Board", size: "18x24 Screen", price: 45, installation: 25 },
    { category: "POLE BOARDS (FLUTE BOARDS)", product: "Pole Board", size: "18x24 UV Print", price: 54, installation: 25 },
    { category: "POLE BOARDS (FLUTE BOARDS)", product: "Pole Board", size: "24x24 Screen", price: 60, installation: 25 },
    { category: "POLE BOARDS (FLUTE BOARDS)", product: "Pole Board", size: "24x24 UV Print", price: 72, installation: 25 },
    { category: "POLE BOARDS (FLUTE BOARDS)", product: "Pole Board", size: "24x36 Screen", price: 90, installation: 25 },
    { category: "POLE BOARDS (FLUTE BOARDS)", product: "Pole Board", size: "24x36 UV Print", price: 108, installation: 25 },
    
    // ===== AUTO TOPS & STICKERS - THIRD =====
    { category: "AUTO", product: "Auto Tops", size: "", price: 750 },
    { category: "AUTO", product: "Auto Sticker (PVC Quality)", size: "500 Qnty", price: 80 },
    { category: "AUTO", product: "Auto Sticker (Vinyl Quality)", size: "Below 500 Qnty", price: 140 },
    
    // ===== MOBILE VANS - FOURTH =====
    { category: "MOBILE VANS", product: "Normal Mobile Van", size: "1 Month", price: 85000 },
    { category: "MOBILE VANS", product: "LED Mobile Van", size: "1 Month", price: 350000 },
    
    // ===== TRY CYCLES =====
    { category: "TRY CYCLES", product: "Try Cycles", size: "Each Per Day", price: 1800 },
    { category: "TRY CYCLES", product: "1 Time  Fabrication", size: "Each Cycle", price: 1000 },
    
    // ===== SKY BALLOONS =====
    { category: "SKY BALLOONS", product: "Sky Balloons", size: "Telangana", price: 25000 },
    { category: "SKY BALLOONS", product: "Sky Balloons", size: "Andhra Pradesh", price: 35000 },
    
    // ===== DEMO TENT & GAZIBO =====
    { category: "TENTS", product: "Demo Tent", size: "4x4x7", price: 4500 },
    { category: "TENTS", product: "Demo Tent", size: "6x6x7", price: 6500 },
    { category: "TENTS", product: "Demo Tent", size: "10x10x7", price: 10500 },
    { category: "TENTS", product: "Gazibo", size: "6x6x7", price: 8500 },
    { category: "TENTS", product: "Gazibo", size: "10x10x7", price: 11000 },
    
    // ===== ROLL UP STANDY =====
    { category: "ROLL UP", product: "Roll Up Standy", size: "6x3", price: 1800 },
    
    // ===== DIGITAL WALL POSTERS =====
    { category: "DIGITAL WALL POSTERS", product: "Digital Wall Poster (per sft 35)", size: "2x3", price: 210 },
    { category: "DIGITAL WALL POSTERS", product: "Digital Wall Poster (per sft 35)", size: "4x3", price: 420 },
    { category: "DIGITAL WALL POSTERS", product: "Digital Wall Poster (per sft 35)", size: "6x3", price: 630 },
    { category: "DIGITAL WALL POSTERS", product: "Digital Wall Poster (per sft 35)", size: "6x4", price: 840 },
    
    // ===== PAMPHLETS =====
    { category: "PAMPHLETS", product: "Pamphlets", size: "A4 Size Each", price: 1.80 },
    { category: "PAMPHLETS", product: "Pamphlets", size: "A5 Size Each", price: 1.50 },
    { category: "PAMPHLETS", product: "Pamphlets", size: "A3 Size Each", price: 2.80 },
    
    // ===== FLEXYS =====
    { category: "FLEXYS", product: "Normal Flexy", size: "Per SFT", price: 35 },
    { category: "FLEXYS", product: "Flex with Frame Iron", size: "Per SFT", price: 150 },
    { category: "FLEXYS", product: "Wooden Frame", size: "Per SFT", price: 100 },
    { category: "FLEXYS", product: "Black Out", size: "Per SFT", price: 40 },
    { category: "FLEXYS", product: "Star Flexy", size: "Per SFT", price: 50 },
    
    // ===== ROUNDS =====
    { category: "ROUNDS", product: "Rounds", size: "10x10", price: 10000 },
    { category: "ROUNDS", product: "Rounds", size: "15x15", price: 15000 },
    { category: "ROUNDS", product: "Rounds", size: "20x20", price: 20000 },
    
    // ===== SIGNBOARDS - LAST =====
    { category: "SIGNBOARDS", product: "Back Lit Board", size: "Per SFT", price: 450 },
    { category: "SIGNBOARDS", product: "LED Board", size: "Per SFT", price: 1000 },
    { category: "SIGNBOARDS", product: "Clip On Boards", size: "Per SFT", price: 1000 },
    { category: "SIGNBOARDS", product: "Dot LED Boards", size: "Per SFT", price: 1000 },
    { category: "SIGNBOARDS", product: "Cover LED Boards", size: "Per SFT", price: 1200 },
    { category: "SIGNBOARDS", product: "Liquid LED Boards", size: "Per SFT", price: 2000 },
    { category: "STICKER", product: "Normal Vinyle", size: "", price: 100 },
    { category: "STICKER", product: "Eco Solvent with Lamination", size: "", price: 150 },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Get unique categories in the order they appear
  const categories = ['All', ...new Set(priceItems.map(item => item.category))];

  // Filter items based on search and category
  const filteredItems = priceItems.filter(item => {
    const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.size.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Format price with commas
  const formatPrice = (price) => {
    if (price >= 1000) {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `₹${price.toFixed(2)}`;
  };

  // Mobile responsive
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ 
      maxWidth: '1200px',
      margin: '0 auto',
      padding: isMobileView ? '10px' : '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: isMobileView ? '15px' : '30px' }}>
        <h1 style={{ 
          color: '#2c3e50', 
          marginBottom: '5px',
          fontSize: isMobileView ? '20px' : '28px'
        }}>Price List</h1>
        <p style={{ 
          color: '#7f8c8d',
          fontSize: isMobileView ? '12px' : '14px'
        }}>Complete price list of all products and services</p>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex',
        flexDirection: isMobileView ? 'column' : 'row',
        gap: isMobileView ? '10px' : '15px',
        marginBottom: isMobileView ? '15px' : '25px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="🔍 Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: isMobileView ? '10px 14px' : '10px 16px',
            border: '2px solid #e9ecef',
            borderRadius: '8px',
            fontSize: isMobileView ? '13px' : '14px',
            width: '100%',
            maxWidth: isMobileView ? '100%' : '400px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: isMobileView ? '10px 14px' : '10px 16px',
            border: '2px solid #e9ecef',
            borderRadius: '8px',
            fontSize: isMobileView ? '13px' : '14px',
            backgroundColor: 'white',
            outline: 'none',
            cursor: 'pointer',
            width: isMobileView ? '100%' : 'auto',
            minWidth: isMobileView ? '100%' : '200px'
          }}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Mobile Card View */}
      {isMobileView ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <div 
                key={index}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid #e9ecef'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '6px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        backgroundColor: '#e9ecef',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#2c3e50'
                      }}>
                        {item.category}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#6c757d'
                      }}>
                        #{index + 1}
                      </span>
                    </div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      fontSize: '14px',
                      marginBottom: '4px'
                    }}>
                      {item.product}
                    </div>
                    {item.size && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6c757d',
                        marginBottom: '4px'
                      }}>
                        📏 {item.size}
                      </div>
                    )}
                    {item.installation && (
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#e67e22',
                        marginTop: '2px'
                      }}>
                        🔧 Installation: ₹{item.installation}
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    textAlign: 'right',
                    minWidth: '80px'
                  }}>
                    <div style={{ 
                      fontWeight: '700', 
                      color: '#27ae60',
                      fontSize: '16px'
                    }}>
                      {formatPrice(item.price)}
                    </div>
                    {item.installation && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#6c757d'
                      }}>
                        + ₹{item.installation} install
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '14px',
              backgroundColor: 'white',
              borderRadius: '10px',
              border: '1px solid #e9ecef'
            }}>
              No items found matching your search criteria
            </div>
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <div style={{ 
          overflowX: 'auto',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <table style={{ 
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            fontSize: '14px',
            minWidth: '700px'
          }}>
            <thead>
              <tr style={{ 
                backgroundColor: '#2c3e50',
                color: 'white'
              }}>
                <th style={{ 
                  padding: '14px 16px',
                  textAlign: 'center',
                  borderBottom: '2px solid #34495e',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '60px'
                }}>
                  Sl No
                </th>
                <th style={{ 
                  padding: '14px 16px',
                  textAlign: 'left',
                  borderBottom: '2px solid #34495e',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '120px'
                }}>
                  Category
                </th>
                <th style={{ 
                  padding: '14px 16px',
                  textAlign: 'left',
                  borderBottom: '2px solid #34495e',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Product / Service
                </th>
                <th style={{ 
                  padding: '14px 16px',
                  textAlign: 'center',
                  borderBottom: '2px solid #34495e',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Size / Specification
                </th>
                <th style={{ 
                  padding: '14px 16px',
                  textAlign: 'center',
                  borderBottom: '2px solid #34495e',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Installation
                </th>
                <th style={{ 
                  padding: '14px 16px',
                  textAlign: 'right',
                  borderBottom: '2px solid #34495e',
                  fontWeight: '600',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '120px'
                }}>
                  Price (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <tr 
                    key={index}
                    style={{
                      borderBottom: '1px solid #e9ecef',
                      backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e8f0fe';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa';
                    }}
                  >
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'center',
                      color: '#6c757d',
                      fontWeight: '500',
                      fontSize: '13px'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      fontWeight: '600',
                      color: '#2c3e50',
                      fontSize: '12px'
                    }}>
                      <span style={{
                        backgroundColor: '#e9ecef',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        display: 'inline-block'
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      fontWeight: '500',
                      color: '#2c3e50',
                      fontSize: '13px'
                    }}>
                      {item.product}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'center',
                      color: '#6c757d',
                      fontSize: '13px'
                    }}>
                      {item.size || '-'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'center',
                      color: '#e67e22',
                      fontWeight: '500',
                      fontSize: '13px'
                    }}>
                      {item.installation ? `₹${item.installation}` : '-'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: '#27ae60',
                      fontSize: '14px'
                    }}>
                      {formatPrice(item.price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#6c757d',
                    fontSize: '16px'
                  }}>
                    No items found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer with total count */}
      <div style={{
        marginTop: isMobileView ? '15px' : '20px',
        padding: isMobileView ? '12px' : '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#6c757d',
        fontSize: isMobileView ? '12px' : '14px'
      }}>
        Showing {filteredItems.length} of {priceItems.length} items
      </div>
    </div>
  );
};

export default PriceList;