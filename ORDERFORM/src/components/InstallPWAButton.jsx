import React, { useEffect, useState } from 'react';

const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    const beforeInstallPromptHandler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const appInstalledHandler = () => {
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  // Only show on mobile and if not installed
  if (!isMobile || isInstalled || !deferredPrompt) return null;

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      <button
        onClick={handleInstallClick}
        style={{
          backgroundColor: '#007bff',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        📲 Install GMS App
      </button>
    </div>
  );
};

export default InstallPWAButton;
