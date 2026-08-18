import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from 'axios';

const DailyPlanner = ({ loggedInUser }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const containerStyle = {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    maxWidth: '800px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  };

  const headerStyle = {
    color: '#003366',
    textAlign: 'center',
    marginBottom: '25px',
    borderBottom: '2px solid #003366',
    paddingBottom: '10px'
  };

  const inputContainerStyle = {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  };

  const inputStyle = {
    flex: 1,
    padding: '12px 15px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '16px'
  };

  const buttonStyle = {
    padding: '12px 20px',
    backgroundColor: '#003366',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
    ':hover': {
      backgroundColor: '#005599'
    }
  };

  const datePickerStyle = {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    marginBottom: '20px'
  };

  const taskListStyle = {
    listStyle: 'none',
    padding: 0
  };

  const taskItemStyle = {
    backgroundColor: 'white',
    padding: '15px',
    marginBottom: '10px',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  const taskTextStyle = {
    flex: 1,
    marginLeft: '15px',
    textDecoration: 'none'
  };

  const completedTaskStyle = {
    textDecoration: 'line-through',
    color: '#888'
  };

  const actionButtonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    marginLeft: '10px',
    color: '#003366'
  };

  const errorStyle = {
    color: 'red',
    marginBottom: '15px',
    textAlign: 'center'
  };

  const loadingStyle = {
    textAlign: 'center',
    color: '#003366',
    margin: '20px 0'
  };

  useEffect(() => {
    fetchTasks();
  }, [date]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/planner?date=${date}&user=${loggedInUser}`);
      setTasks(response.data);
    } catch (error) {
      setError('Failed to fetch tasks');
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;

    try {
      const response = await axios.post('/api/planner', {
        text: newTask,
        date,
        user: loggedInUser,
        completed: false
      });
      setTasks([...tasks, response.data]);
      setNewTask('');
    } catch (error) {
      setError('Failed to add task');
      console.error('Error adding task:', error);
    }
  };

  const toggleComplete = async (id) => {
    try {
      const task = tasks.find(t => t._id === id);
      const response = await axios.patch(`/api/planner/${id}`, {
        completed: !task.completed
      });
      setTasks(tasks.map(t => t._id === id ? response.data : t));
    } catch (error) {
      setError('Failed to update task');
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`/api/planner/${id}`);
      setTasks(tasks.filter(t => t._id !== id));
    } catch (error) {
      setError('Failed to delete task');
      console.error('Error deleting task:', error);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={headerStyle}>Daily Planner</h2>
      
      <div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={datePickerStyle}
        />
      </div>

      <div style={inputContainerStyle}>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add new task (e.g., 'Call 5 customers')"
          style={inputStyle}
          onKeyPress={(e) => e.key === 'Enter' && addTask()}
        />
        <button onClick={addTask} style={buttonStyle}>
          Add Task
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {isLoading ? (
        <div style={loadingStyle}>Loading tasks...</div>
      ) : (
        <ul style={taskListStyle}>
          {tasks.map(task => (
            <li key={task._id} style={taskItemStyle}>
              <button
                onClick={() => toggleComplete(task._id)}
                style={{ ...actionButtonStyle, color: task.completed ? '#4CAF50' : '#ccc' }}
              >
                {task.completed ? '✓' : '○'}
              </button>
              <span style={{ ...taskTextStyle, ...(task.completed ? completedTaskStyle : {}) }}>
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(task._id)}
                style={{ ...actionButtonStyle, color: '#ff4444' }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {tasks.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', color: '#666' }}>
          No tasks planned for this day. Add some tasks to get started!
        </div>
      )}
    </div>
  );
};

export default DailyPlanner;