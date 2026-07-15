import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase/firebaseClient';
import { createOrUpdateUserProfile } from '../cloud-lessons/cloudLessonApi';
import { errorCode, errorMessage } from '../../lib/errorMessage';

interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setIsAuthLoading(false);
        if (currentUser) {
          try {
            await createOrUpdateUserProfile(
              currentUser.uid,
              currentUser.displayName || currentUser.email || 'Người dùng Google',
              currentUser.email || '',
              currentUser.photoURL
            );
          } catch (err) {
            console.error('Failed to sync user profile to Firestore:', err);
          }
        }
      },
      (err) => {
        console.error('onAuthStateChanged error:', err);
        setError(err.message);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setIsAuthLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google Sign-In Error:', err);
      if (errorCode(err) === 'auth/popup-blocked') {
        setError('Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép bật popup và thử lại.');
      } else if (errorCode(err) === 'auth/popup-closed-by-user') {
        setError('Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.');
      } else {
        setError(errorMessage(err, 'Không thể đăng nhập bằng Google. Vui lòng thử lại.'));
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signOut = async () => {
    setIsAuthLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (err: unknown) {
      console.error('Google Sign-Out Error:', err);
      setError(errorMessage(err, 'Có lỗi xảy ra khi đăng xuất.'));
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        signInWithGoogle,
        signOut,
        error,
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
