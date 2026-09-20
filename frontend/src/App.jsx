import React, { useEffect, useState } from 'react';
import ReporterView from './components/ReporterView.jsx';
import AdminView from './components/AdminView.jsx';
import AdminLogin from './components/AdminLogin.jsx';

function getHash() {
  return window.location.hash.replace('#', '');
}

export default function App() {
  const [route, setRoute] = useState(getHash());
  const [isAdminAuthed, setIsAdminAuthed] = useState(!!sessionStorage.getItem('adminKey'));

  useEffect(() => {
    const onHashChange = () => setRoute(getHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('adminKey');
    setIsAdminAuthed(false);
  };

  if (route === 'admin') {
    if (!isAdminAuthed) {
      return <AdminLogin onSuccess={() => setIsAdminAuthed(true)} />;
    }
    return <AdminView onLogout={handleLogout} />;
  }

  return <ReporterView />;
}
