// hooks/useUsers.js
import { useState, useCallback } from 'react';
import { config } from '../config';

const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${config.API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error fetching users');
      }

      const data = await response.json();
      // Filtriamo gli utenti non disabilitati
      const activeUsers = data.filter(user => !user.userDisabled);
      setUsers(activeUsers);
      return activeUsers;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserById = useCallback((userId) => {
    return users.find(user => user.userId === userId);
  }, [users]);

  const getFilteredUsers = useCallback((role = null) => {
    if (!role) return users;
    return users.filter(user => user.role === role);
  }, [users]);

  return {
    users,
    loading,
    fetchUsers,
    getUserById,
    getFilteredUsers
  };
};

export default useUsers;