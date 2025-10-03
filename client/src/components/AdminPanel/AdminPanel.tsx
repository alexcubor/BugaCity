import React, { useState, useEffect, useCallback } from 'react';
import NotFound from '../NotFound';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  glukocoins: number;
  rewards: string[];
  createdAt: string;
}


interface Stats {
  users: {
    total: number;
    admins: number;
    regular: number;
  };
  rewards: {
    total: number;
  };
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem('token');

  const fetchData = useCallback(async (endpoint: string) => {
    if (!token) {
      setError('Токен не найден. Войдите в систему.');
      return null;
    }

    try {
      const response = await fetch(`/api/admin/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Доступ запрещен. Требуются права администратора.');
        } else {
          setError(`Ошибка: ${response.status}`);
        }
        return null;
      }

      return await response.json();
    } catch (err) {
      setError('Ошибка сети');
      return null;
    }
  }, [token]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const data = await fetchData('stats');
    if (data) {
      setStats(data);
    }
    setLoading(false);
  }, [fetchData]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const data = await fetchData('users');
    if (data) {
      setUsers(data.users || []);
    }
    setLoading(false);
  }, [fetchData]);


  const deleteUser = useCallback(async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
        loadStats(); // Обновить статистику
      } else {
        setError('Ошибка при удалении пользователя');
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  }, [token, users, loadStats]);

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, loadStats, loadUsers]);


  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-top">
          <h1>Админпанель</h1>
          <button 
            className="exit-admin-btn"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            Выйти из админпанели
          </button>
        </div>
        <div className="admin-tabs">
          <button 
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Статистика
          </button>
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Пользователи
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Закрыть</button>
        </div>
      )}

      <div className="admin-content">
        {loading && <div className="loading">Загрузка...</div>}

        {activeTab === 'stats' && stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Пользователи</h3>
              <div className="stat-number">{stats.users.total}</div>
              <div className="stat-details">
                <span>Админов: {stats.users.admins}</span>
                <span>Обычных: {stats.users.regular}</span>
              </div>
            </div>
            <div className="stat-card">
              <h3>Награды</h3>
              <div className="stat-number">{stats.rewards.total}</div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th>Глюкокоинс</th>
                  <th>Награды</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                    <td>{user.name}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.glukocoins}</td>
                    <td>{user.rewards.length}</td>
                    <td>{new Date(user.createdAt).toLocaleString('ru-RU')}</td>
                    <td>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteUser(user.id)}
                        disabled={user.role === 'admin'}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
