import React, { useState, useEffect } from 'react';
import AdminPanel from './AdminPanel';
import NotFound from '../NotFound';

const AdminGuard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!token) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const user = await response.json();
          setIsAdmin(user.role === 'admin');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [token]);

  // Показываем 404 для всех неадминов
  if (isAdmin === null || !isAdmin) {
    return <NotFound />;
  }

  return <AdminPanel />;
};

export default AdminGuard;
