import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

function PendingService() {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);
  

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/orders');
      // Filter orders where any row's deliveryDate is in the future or not marked as completed
      const pendingServices = res.data.filter(order => 
        order.rows.some(row => 
          new Date(row.deliveryDate) > new Date() || 
          !row.isCompleted
        )
      );
      setOrders(pendingServices);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleMarkCompleted = async (orderId, rowIndex) => {
    try {
      await axios.put(`/api/orders/${orderId}/mark-completed`, { rowIndex });
      fetchOrders();
    } catch (err) {
      console.error('Mark as completed failed:', err);
    }
  };

  const handleExportToExcel = () => {
    const exportData = [];

    orders.forEach((order, orderIndex) => {
      order.rows.forEach((row) => {
        exportData.push({
          'S.No': orderIndex + 1,
          'Executive': order.executive,
          'Business': order.business,
          'Customer': order.contactPerson,
          'Contact': `${order.contactCode} ${order.phone}`,
          'Order No': order.orderNo,
          'Order Date': order.orderDate,
          'Target': order.target,
          'Client Type': order.clientType,
          'Requirement': row.requirement,
          'Qty': row.quantity,
          'Rate': row.rate,
          'Total': row.total,
          'Delivery Date': row.deliveryDate,
          'Status': row.isCompleted ? 'Completed' : 'Pending',
          'Advance': order.advance,
          'Balance': order.balance,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PendingServices');
    XLSX.writeFile(workbook, 'pending_services.xlsx');
  };

  const filterOrders = (order) => (row) => {
    const valuesToSearch = [
      order.executive,
      order.business,
      order.contactPerson,
      `${order.contactCode} ${order.phone}`,
      order.orderNo,
      order.orderDate,
      order.clientType,
      row.requirement,
      row.quantity,
      row.rate,
      row.total,
      row.deliveryDate,
      row.isCompleted ? 'Completed' : 'Pending',
      order.advance,
      order.balance,
    ];

    return valuesToSearch.some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Pending Services</h2>

      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              {[
                'S.No', 'Executive', 'Business', 'Customer', 'Contact',
                'Order No', 'Order Date', 'Target', 'Client Type', 'Requirement',
                'Qty', 'Rate', 'Total', 'Delivery Date', 'Status', 'Action'
              ].map((header) => (
                <th key={header} style={styles.th}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order, orderIndex) =>
              order.rows
                .filter(row => new Date(row.deliveryDate) > new Date() || !row.isCompleted)
                .filter(filterOrders(order))
                .map((row, rowIndex) => (
                  <tr
                    key={`${order._id}-${rowIndex}`}
                    style={{
                      backgroundColor: (orderIndex + rowIndex) % 2 === 0 ? '#fdfdfd' : '#f1f8f9',
                    }}
                  >
                    <td style={styles.td}>{orderIndex + 1}</td>
                    <td style={styles.td}>{order.executive}</td>
                    <td style={styles.td}>{order.business}</td>
                    <td style={styles.td}>{order.contactPerson}</td>
                    <td style={styles.td}>{order.contactCode} {order.phone}</td>
                    <td style={styles.td}>{order.orderNo}</td>
                    <td style={styles.td}>{order.orderDate}</td>
                    <td style={styles.td}>{order.target}</td>
                    <td style={styles.td}>{order.clientType}</td>
                    <td style={styles.td}>{row.requirement}</td>
                    <td style={styles.td}>{row.quantity}</td>
                    <td style={styles.td}>{row.rate}</td>
                    <td style={styles.td}>{row.total}</td>
                    <td style={styles.td}>{row.deliveryDate}</td>
                    <td style={styles.td}>{row.isCompleted ? 'Completed' : 'Pending'}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        {!row.isCompleted && (
                          <button
                            onClick={() => handleMarkCompleted(order._id, rowIndex)}
                            style={styles.button('#2ecc71')}
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.footerButtons}>
        <button onClick={handleExportToExcel} style={styles.footerButton('#16a085')}>Save to Excel</button>
        <button onClick={() => navigate(-1)} style={styles.footerButton('#34495e')}>Back</button>
      </div>
    </div>
  );
}

// Use the same styles as ViewOrders
const styles = {
  container: {
    padding: '30px',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh',
    fontFamily: 'monospace',
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
    color: '#1a5d1a',
  },
  searchContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  searchInput: {
    padding: '10px',
    width: '300px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontFamily: 'monospace',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    fontFamily: 'monospace',
  },
  tableHeader: {
    backgroundColor: '#218c74',
    color: '#fff',
  },
  th: {
    border: '1px solid #ccc',
    padding: '8px',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  td: {
    border: '1px solid #ccc',
    padding: '6px 8px',
    fontSize: '12px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  actionButtons: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
  },
  button: (bg) => ({
    backgroundColor: bg,
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  }),
  footerButtons: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '30px',
    gap: '20px',
  },
  footerButton: (bg) => ({
    padding: '10px 16px',
    backgroundColor: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  }),
};

export default PendingService;