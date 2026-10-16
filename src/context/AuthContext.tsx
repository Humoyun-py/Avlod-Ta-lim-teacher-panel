import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_TEACHER } from '../services/mockData';
import { localStore } from '../services/teacherService';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check existing session in localStorage
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem('avlod_auth_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        } else {
          // Pre-populate with authenticated demo teacher for instant preview
          const isLoggedOut = localStorage.getItem('avlod_explicit_logout');
          if (!isLoggedOut) {
            setUser(INITIAL_TEACHER);
            localStorage.setItem('avlod_auth_user', JSON.stringify(INITIAL_TEACHER));
          }
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const cleanUsername = username.trim().toLowerCase();

    // Role check: Reject director and admin accounts trying to enter Teacher Panel
    if (cleanUsername.includes('director') || cleanUsername.includes('admin')) {
      setIsLoading(false);
      return {
        success: false,
        error: `Kirish taqiqlandi: Direktor yoki Administrator hisoblari ushbu O‘qituvchi Kabinetiga kira olmaydi. Iltimos, Avlod Ta’lim Director panelidan foydalaning.`,
      };
    }

    // Accept valid demo credentials or teacher credentials
    if (
      (cleanUsername === 'teacher_aziz' || cleanUsername === 'azizbek' || cleanUsername.includes('teacher')) &&
      (password === 'password123' || password.length >= 6)
    ) {
      const authUser = localStore.getTeacher();
      localStorage.setItem('avlod_auth_user', JSON.stringify(authUser));
      localStorage.removeItem('avlod_explicit_logout');
      setUser(authUser);
      setIsLoading(false);
      return { success: true };
    }

    // Also support any teacher credentials if password is at least 6 characters
    if (password === 'password123') {
      const authUser = {
        ...localStore.getTeacher(),
        username: cleanUsername,
      };
      localStorage.setItem('avlod_auth_user', JSON.stringify(authUser));
      localStorage.removeItem('avlod_explicit_logout');
      setUser(authUser);
      setIsLoading(false);
      return { success: true };
    }

    setIsLoading(false);
    return {
      success: false,
      error: 'Login yoki parol noto‘g‘ri. (Standart sinov: teacher_aziz / password123)',
    };
  };

  const logout = () => {
    localStorage.removeItem('avlod_auth_user');
    localStorage.setItem('avlod_explicit_logout', 'true');
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      localStorage.setItem('avlod_auth_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user && user.role === 'teacher',
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
