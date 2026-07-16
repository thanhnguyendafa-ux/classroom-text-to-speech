import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase/firebaseClient';
import { createOrUpdateUserProfile } from '../cloud-lessons/public';
import { errorCode, errorMessage } from '../../lib/errorMessage';
import { googleAuthErrorMessage, shouldOfferRedirectFallback } from './googleAuthError';
import { clearBrowserGeminiApiKey } from '../../lib/security/geminiApiKeyStorage';

interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  canUseRedirectFallback: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canUseRedirectFallback, setCanUseRedirectFallback] = useState(false);
  const signInInFlightRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setIsAuthLoading(false);
        if (!currentUser) return;

        try {
          await createOrUpdateUserProfile(
            currentUser.uid,
            currentUser.displayName || currentUser.email || 'Google user',
            currentUser.email || '',
            currentUser.photoURL,
          );
        } catch (profileError) {
          console.error('Failed to sync user profile to Firestore:', errorMessage(profileError));
        }
      },
      (authError) => {
        console.error('onAuthStateChanged error:', { code: errorCode(authError) });
        setError(googleAuthErrorMessage(errorCode(authError)));
        setIsAuthLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (signInInFlightRef.current) return;
    signInInFlightRef.current = true;
    setIsAuthLoading(true);
    setError(null);
    setCanUseRedirectFallback(false);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (authError) {
      const code = errorCode(authError);
      console.error('Google Sign-In Error:', { code });
      setCanUseRedirectFallback(shouldOfferRedirectFallback(code));
      setError(googleAuthErrorMessage(code));
    } finally {
      signInInFlightRef.current = false;
      setIsAuthLoading(false);
    }
  };

  const signInWithGoogleRedirect = async () => {
    if (signInInFlightRef.current) return;
    signInInFlightRef.current = true;
    setIsAuthLoading(true);
    setError(null);

    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (authError) {
      const code = errorCode(authError);
      console.error('Google Redirect Sign-In Error:', { code });
      setError(googleAuthErrorMessage(code));
      signInInFlightRef.current = false;
      setIsAuthLoading(false);
    }
  };

  const signOut = async () => {
    setIsAuthLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      clearBrowserGeminiApiKey();
    } catch (signOutError) {
      console.error('Google Sign-Out Error:', { code: errorCode(signOutError) });
      setError(errorMessage(signOutError, 'Có lỗi xảy ra khi đăng xuất.'));
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
        signInWithGoogleRedirect,
        signOut,
        error,
        canUseRedirectFallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
