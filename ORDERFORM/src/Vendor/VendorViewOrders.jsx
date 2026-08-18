import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';

function VendorViewOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('/api/orders/auto-products');
        setOrders(response.data);
        setFilteredOrders(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const results = orders.filter(order =>
      Object.values(order).some(
        value => typeof value === 'string' && 
        value.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      order.rows?.some(row =>
        Object.values(row).some(
          rowValue => typeof rowValue === 'string' && 
          rowValue.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
    setFilteredOrders(results);
  }, [searchTerm, orders]);

  const getStatusBadge = (status) => {
    let bgColor = '';
    if (status === 'Completed') bgColor = 'bg-green-100 text-green-800';
    else if (status === 'Pending') bgColor = 'bg-yellow-100 text-yellow-800';
    else bgColor = 'bg-red-100 text-red-800';
    
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>{status}</span>;
  };

  const getPaymentStatus = (order) => {
    if (order.balance <= 0) return 'Paid';
    if (order.advance > 0) return 'Partially Paid';
    return 'Unpaid';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Auto Products Orders</h1>
          <p className="mt-2 text-sm text-gray-700">
            List of orders containing auto tops or auto stickers
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              className="block w-full rounded-md border-gray-300 pl-4 pr-12 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                onClick={() => setSearchTerm('')}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      S.I
                    </th>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Executive
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Business
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Contact
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Requirement
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Qty
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amounts
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Delivery
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredOrders.map((order, index) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                        {order.executive}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {order.business}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div>{order.contactPerson}</div>
                        <div className="text-blue-600">{order.phone}</div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {order.requirement || order.rows?.[0]?.requirement}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {order.rows?.[0]?.quantity || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div>Total: ₹{order.totalAmount?.toFixed(2)}</div>
                        <div>Advance: ₹{order.advance?.toFixed(2)}</div>
                        <div>Balance: ₹{order.balance?.toFixed(2)}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {order.rows?.[0]?.deliveryDate ? 
                          dayjs(order.rows[0].deliveryDate).format('DD/MM/YYYY') : 
                          'Not set'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 space-y-1">
                        {getStatusBadge(order.status)}
                        <div className="mt-1">
                          {getStatusBadge(getPaymentStatus(order))}
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          View
                        </button>
                        <button className="text-indigo-600 hover:text-indigo-900">
                          Edit
                        </button>
                        {order.balance > 0 && (
                          <button className="text-green-600 hover:text-green-900">
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorViewOrders;