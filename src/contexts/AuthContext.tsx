import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  login as loginApi,
  registerUser,
  loginWithFirebase,
  logout as logoutApi,
  getCurrentUser,
  loginWithPhoneEmail,  
} from '@/api/auth.api';
import type {
  User,
  LoginPayload,
  RegisterPayload,
  FirebaseLoginPayload,
} from '@/types/user.types';
import api, { clearTokens, getAccessToken, setAuthFailureHandler } from '@/api/client';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';


interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (payload: LoginPayload) => Promise<{ error: string | null }>;
  signUp: (payload: RegisterPayload) => Promise<{ error: string | null }>;
  initiateSignUp: (payload: RegisterPayload) => Promise<{ token: string | null; error: string | null }>;
  verifySignUp: (userId: string, code: string) => Promise<{ error: string | null }>;
  signInWithFirebase: (payload: FirebaseLoginPayload) => Promise<{ error: string | null }>;
  signInWithPhoneEmail: (payload: { url: string }) => Promise<{ error: string | null }>;
  continueWithGoogle: () => Promise<{ error: string | null }>; 
  signOut: () => Promise<void>;
}
const getErrorMessage = (err: any): string => {
  const detail = err.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((obj: any) => obj.msg).join(", ");
  }

  if (typeof detail === 'string') {
    return detail;
  }

  return err.message || "An unexpected error occurred";
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await getCurrentUser();
      setUser(data);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
    });
    fetchUser();
  }, [fetchUser]);

  const signIn = async (payload: LoginPayload) => {
    try {
      await loginApi(payload);
      await fetchUser(); 
      return { error: null };
    } catch (err: unknown) {
     return { error: getErrorMessage(err) }; 
    }
  };
  const initiateSignUp = async (payload: RegisterPayload) => {
  try {
    const { data } = await api.post('/auth/register/initiate', payload);
    return { userId: data.user_id, error: null };
  } catch (err: any) {
    return { userId: null, error: getErrorMessage(err) };
  }
};

const verifySignUp = async (userId: string, code: string) => {
  try {
    await api.post('/auth/register/verify', { 
      user_id: userId, 
      otp_code: code 
    });
    return { error: null };
  } catch (err: any) {
    return { error: getErrorMessage(err) };
  }
};
  const signInWithFirebase = async (payload: FirebaseLoginPayload) => {
    try {
      await loginWithFirebase(payload);
      await fetchUser();
      return { error: null };
    } catch (err: unknown) {
    return { error: getErrorMessage(err) }; 
    }
  };

  const continueWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      return await signInWithFirebase({ token });
    } catch (err: unknown) {
       return { error: getErrorMessage(err) }; 
    }
  };

  const signUp = async (payload: RegisterPayload) => {
    try {
      await registerUser(payload);
      return { error: null };
    } catch (err: unknown) {
      return { error: getErrorMessage(err) }; 
    }
  };

  const signOut = async () => {
    try {
        await logoutApi();
    } catch (e) {
        console.warn("Logout cleanup failed on server");
    } finally {
        clearTokens();
        setUser(null);
    }
  };
const signInWithPhoneEmail = async (payload: { url: string }) => {
  try {
    await loginWithPhoneEmail(payload);
    await fetchUser(); 
    return { error: null };
  } catch (err: any) {
    const message = err.response?.data?.detail || 'Phone verification failed.';
    return { error: message };
  }
};
  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN', 
        signIn, 
        signUp, 
         initiateSignUp, 
        verifySignUp,   
        signInWithFirebase, 
        signOut,
        continueWithGoogle,
          signInWithPhoneEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}