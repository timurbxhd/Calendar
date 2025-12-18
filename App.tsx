import React, { useState, useEffect } from 'react';
import { User } from './types';
import { getSession, clearSession } from './services/storageService';
import Auth from './components/Auth';
import Calendar from './components/Calendar';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const sessionUser = await getSession();
        if (sessionUser) {
          setUser(sessionUser);
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      {!user ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <Calendar user={user} onLogout={handleLogout} />
      )}
    </>
  );
};

export default App;