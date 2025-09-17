import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AutoPendingPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAutoPendingPayments = async () => {
      try {
        const response = await axios.get('/api/orders/auto-pending-payments');
        setPayments(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch pending payments for auto products');
      } finally {
        setLoading(false);
      }
    };
    fetchAutoPendingPayments();
  }, []);

  const getProductType = (order) => {
    const requirements = [
      order.requirement,
      ...(order.rows?.map(row => row.requirement) || [])
    ].filter(Boolean);
    
    const autoProduct = requirements.find(req => 
      ['auto tops', 'auto stickers'].includes(req.toLowerCase()) ||
      /auto[\s-]*(tops?|stickers?)/i.test(req)
    );
    
    return autoProduct?.toLowerCase() || 'Auto Product';
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending payments...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Pending Payments - Auto Tops/Stickers</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left">Order #</th>
              <th className="py-3 px-4 text-left">Product Type</th>
              <th className="py-3 px-4 text-left">Customer</th>
              <th className="py-3 px-4 text-left">Contact</th>
              <th className="py-3 px-4 text-left">Total (₹)</th>
              <th className="py-3 px-4 text-left">Due (₹)</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment._id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{payment.orderNo}</td>
                <td className="py-3 px-4 capitalize">{getProductType(payment)}</td>
                <td className="py-3 px-4">{payment.customerName}</td>
                <td className="py-3 px-4">{payment.phone}</td>
                <td className="py-3 px-4">{payment.totalAmount?.toFixed(2)}</td>
                <td className="py-3 px-4 font-semibold text-red-600">
                  {payment.balance?.toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <button className="bg-blue-500 text-white px-3 py-1 rounded mr-2">
                    View
                  </button>
                  <button className="bg-green-500 text-white px-3 py-1 rounded">
                    Receive Payment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {payments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No pending payments found for auto tops/stickers
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoPendingPayments;