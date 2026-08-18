import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Tag, Card, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const LogoutHistory = () => {
  const [logoutHistory, setLogoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Login Time',
      dataIndex: 'loginTime',
      key: 'loginTime',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: 'Logout Time',
      dataIndex: 'logoutTime',
      key: 'logoutTime',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: 'Duration',
      dataIndex: 'sessionDuration',
      key: 'sessionDuration',
      render: (duration) => {
        const seconds = parseInt(duration);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => (
        <Tag color={reason.length > 20 ? 'geekblue' : 'green'}>{reason}</Tag>
      ),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/logout-history');
        setLogoutHistory(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching logout history:', error);
        message.error('Failed to load logout history');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownload = async () => {
    try {
      const response = await axios.get('/api/logout-history/download', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'LogoutHistory.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Logout history downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      message.error('Failed to download logout history');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Logout History"
        extra={
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleDownload}
          >
            Export to JSON
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={logoutHistory}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Card>
    </div>
  );
};

export default LogoutHistory;