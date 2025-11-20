import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: 'police' | 'citizen') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('crime-pred-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string, role: 'police' | 'citizen') => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUser: User = {
      id: `user-${Date.now()}`,
      email,
      fullName: role === 'police' ? 'Officer Singh' : 'Priya Sharma',
      role,
      badgeNumber: role === 'police' ? 'PO-12345' : undefined,
      department: role === 'police' ? 'Mumbai Police' : undefined
    };

    setUser(mockUser);
    localStorage.setItem('crime-pred-user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('crime-pred-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
