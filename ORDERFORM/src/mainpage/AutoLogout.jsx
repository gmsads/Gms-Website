// src/components/AutoLogout.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const AutoLogout = () => {
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate('/'); // redirect to landing/login page
  };

  const resetTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, 30 * 60 * 1000); // 15 minutes
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default AutoLogout;
