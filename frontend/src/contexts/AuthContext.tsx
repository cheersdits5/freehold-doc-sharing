import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthContextType, UserInfo, LoginCredentials } from '../types/auth';
import { authService } from '../services/authService';
import { tokenStorage } from '../utils/tokenStorage';

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: UserInfo; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(credentials);
      
      // Store tokens using token storage utility
      tokenStorage.setToken(response.token);
      tokenStorage.setRefreshToken(response.refreshToken);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.user, token: response.token },
      });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = (): void => {
    tokenStorage.clearTokens();
    dispatch({ type: 'LOGOUT' });
  };

  // Check for existing token on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenStorage.getToken();
      
      if (token) {
        // Temporarily skip token validation for mock API
        const isValid = true; // await authService.validateToken(token);
        if (isValid) {
          // In a real app, you'd decode the token or fetch user info
          // For now, we'll set a basic authenticated state
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: {
                id: 'temp',
                email: 'temp@example.com',
                firstName: 'User',
                lastName: 'Name',
                role: 'member',
              },
              token,
            },
          });
        } else {
          tokenStorage.clearTokens();
        }
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    initializeAuth();
  }, []);

  const contextValue: AuthContextType = {
    user: state.user,
    token: state.token,
    login,
    logout,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}