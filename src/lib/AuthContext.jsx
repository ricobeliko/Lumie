import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  waitForAuthReady,
  loginWithEmailPassword,
  registerWithEmailPassword,
  loginWithGooglePopup,
  logoutFirebase,
} from '@/firebase-init';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        setIsLoadingAuth(true);
        await waitForAuthReady();
        unsub = onAuthStateChanged(auth, (fbUser) => {
          if (!fbUser) {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoadingAuth(false);
            return;
          }

          const safeEmail = fbUser.email || '';
          const fullName =
            fbUser.displayName || `Profissional ${fbUser.uid.slice(0, 6)}`;

          setUser({
            id: fbUser.uid,
            uid: fbUser.uid,
            email: safeEmail,
            full_name: fullName,
            role: 'professional',
          });
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
        });
      } catch (error) {
        setAuthError({
          type: 'unknown',
          message: error?.message || 'Falha na autenticação com Firebase',
        });
        setIsLoadingAuth(false);
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const checkAppState = async () => {
    // Mantido para compatibilidade com o restante da aplicação.
    return null;
  };

  const login = async (email, password) => {
    setAuthError(null);
    const u = await loginWithEmailPassword(email, password);
    return u;
  };

  const register = async (email, password) => {
    setAuthError(null);
    const u = await registerWithEmailPassword(email, password);
    return u;
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    const u = await loginWithGooglePopup();
    return u;
  };

  const logout = async () => {
    setAuthError(null);
    await logoutFirebase();
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      register,
      loginWithGoogle,
      logout,
      navigateToLogin,
      checkAppState
    }}>
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
