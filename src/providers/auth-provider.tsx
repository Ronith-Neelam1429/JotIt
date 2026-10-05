import type { User } from '@react-native-firebase/auth';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  reloadCurrentUser,
  subscribeToAuthState,
} from '@/lib/firebase-auth';

type AuthContextValue = {
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  async function refreshUser() {
    const refreshedUser = await reloadCurrentUser();
    setUser(refreshedUser);
  }

  return (
    <AuthContext.Provider value={{ isLoading, refreshUser, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
