import React from 'react';
import { useAuth } from './useAuth';
import AuthLoadingScreen from './AuthLoadingScreen';
import LoginScreen from './LoginScreen';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
};

export default AuthGate;
