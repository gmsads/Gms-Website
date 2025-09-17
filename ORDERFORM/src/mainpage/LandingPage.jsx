/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import bgVideo from '../assets/background.mp4';
import logoImage from '../assets/logo.png';

function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.margin = 0;
    document.body.style.padding = 0;
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden'; // prevent scroll
  }, []);

  const handleLogin = async () => {
    try {
      // 1. Perform login authentication
      const res = await axios.post('/api/login', { name, password });

      if (!res.data.success) {
        alert('Login failed: Invalid credentials');
        return;
      }

      const { role } = res.data;

      // 2. Store user session data
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('role', role);
      localStorage.setItem('userName', name);

      // 3. Track executive login if role is Executive
      if (role === 'Executive') {
        try {
          // Attempt to get location first
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });

          await axios.post('/api/executiveLogins', {
            executiveName: name,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        } catch (geoError) {
          console.warn('Location access denied or failed, logging without location');
          // Fallback: Log without location
          await axios.post('/api/executiveLogins', {
            executiveName: name,
            location: null
          });
        }
      }

      // 4. Redirect based on role
const roleRoutes = {
  'Executive': '/order',
  'Admin': '/admin-dashboard',
  'Designer': '/designer-dashboard',
  'Account': '/account-dashboard',
  'Service Executive': '/service-dashboard',
  'Service Manager': '/service-manager-dashboard',
  'Sales Manager': '/sales-manager-dashboard',
  'Digital Marketing': '/digital-dashboard',
  'Vendor': '/vendor-dashboard',
  'IT': '/it-dashboard',
  'Unit': '/order',                // Redirect to executive order page
  'FieldExecutive': '/order',      // Redirect to executive order page
  'fieldexecutive': '/order'       // Keep backward compatibility
};

      const route = roleRoutes[role];
      if (route) {
        navigate(route, { replace: true });
      } else {
        alert('Unknown role. Please contact administrator.');
      }

    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message ||
        error.message ||
        'Server error';
      alert(`Login failed: ${errorMessage}`);
    }
  };


  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h1 style={styles.navbarTitle}>Global Marketing Solutions</h1>
        <button style={styles.loginBtn} onClick={() => setShowLogin(true)}>Login</button>
      </nav>

      <div style={styles.videoContainer}>
        <video autoPlay loop muted playsInline style={styles.videoBackground}>
          <source src={bgVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <img src={logoImage} alt="Logo" style={styles.logo} />
      </div>

      {showLogin && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <button style={styles.closeBtn} onClick={() => setShowLogin(false)}>&times;</button>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>

            <label style={styles.label}>
              Name:
              <input
                type="text"
                autoComplete="off"
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label style={styles.label}>
              Password:
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  style={{ ...styles.input, paddingRight: '40px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '10px',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#003366',
                    userSelect: 'none',
                  }}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? '👁‍🗨' : '👁'}
                </span>
              </div>
            </label>

            <div style={styles.buttons}>
              <button style={styles.modalBtn} onClick={handleLogin}>Login</button>
              <button style={styles.modalBtn} onClick={() => setShowLogin(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;

const styles = {
  container: {
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#003366',
    color: 'white',
    padding: '2vh 4vw',
    height: '72px',
    zIndex: 2,
  },
  navbarTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
  },
  loginBtn: {
    backgroundColor: 'white',
    color: '#003366',
    padding: '1vh 2vw',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  videoContainer: {
    width: '100%',
    height: 'calc(100vh - 72px)',
    position: 'relative',
    overflow: 'hidden',
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: -1,
  },
  logo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw',
    maxWidth: '800px',
    height: 'auto',
    zIndex: 1,
    filter: 'invert(1) brightness(1.5) drop-shadow(0 0 10px white)',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '2vh',
  },
  modal: {
    background: 'white',
    padding: '5vh 4vw',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#003366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 6px rgba(0,0,0,0.2)',
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
    gap: '10px',
  },
  modalBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#003366',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
