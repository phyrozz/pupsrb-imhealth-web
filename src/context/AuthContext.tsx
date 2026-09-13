import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
};

const studentPoolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_STUDENT_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_STUDENT_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);
const studentUserPool = new CognitoUserPool(studentPoolData);
const ACTIVE_ID_TOKEN_KEY = 'imhealth.activeIdToken';
const ACTIVE_POOL_KEY = 'imhealth.activePool';
type ActivePool = 'admin' | 'student';

function setActiveSession(pool: ActivePool, session: CognitoUserSession) {
  sessionStorage.setItem(ACTIVE_POOL_KEY, pool);
  sessionStorage.setItem(ACTIVE_ID_TOKEN_KEY, session.getIdToken().getJwtToken());
}

interface AuthContextValue {
  user: CognitoUser | null;
  session: CognitoUserSession | null;
  idToken: string | null;
  activePool: ActivePool | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<CognitoUserSession>;
  signInStudent: (email: string, password: string) => Promise<CognitoUserSession>;
  completeNewPassword: (newPassword: string, requiredAttributes?: Record<string, string>) => Promise<CognitoUserSession>;
  hasPendingNewPassword: boolean;
  signOut: () => void;
  userPool: CognitoUserPool;
  studentUserPool: CognitoUserPool;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [session, setSession] = useState<CognitoUserSession | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [activePool, setActivePool] = useState<ActivePool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingNewPasswordUser, setPendingNewPasswordUser] = useState<CognitoUser | null>(null);

  const refreshSession = useCallback(() => {
    const savedPool = sessionStorage.getItem(ACTIVE_POOL_KEY);
    const pools: Array<[ActivePool, CognitoUserPool]> = savedPool === 'student'
      ? [['student', studentUserPool], ['admin', userPool]]
      : [['admin', userPool], ['student', studentUserPool]];

    const restoreFromPool = (index: number) => {
      if (index >= pools.length) {
        setUser(null);
        setSession(null);
        setIdToken(null);
        setActivePool(null);
        sessionStorage.removeItem(ACTIVE_ID_TOKEN_KEY);
        sessionStorage.removeItem(ACTIVE_POOL_KEY);
        setIsLoading(false);
        return;
      }

      const [poolType, pool] = pools[index];
      const cognitoUser = pool.getCurrentUser();
      if (!cognitoUser) {
        restoreFromPool(index + 1);
        return;
      }

      cognitoUser.getSession((err: Error | null, sess: CognitoUserSession | null) => {
        if (err || !sess?.isValid()) {
          restoreFromPool(index + 1);
          return;
        }
        setUser(cognitoUser);
        setSession(sess);
        setIdToken(sess.getIdToken().getJwtToken());
        setActivePool(poolType);
        setActiveSession(poolType, sess);
        setIsLoading(false);
      });
    };

    restoreFromPool(0);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signIn = (email: string, password: string): Promise<CognitoUserSession> =>
    new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess(sess) {
          setUser(cognitoUser);
          setSession(sess);
          setIdToken(sess.getIdToken().getJwtToken());
          setActivePool('admin');
          setActiveSession('admin', sess);
          resolve(sess);
        },
        newPasswordRequired(userAttributes, requiredAttributes) {
          setPendingNewPasswordUser(cognitoUser);
          sessionStorage.setItem(ACTIVE_POOL_KEY, 'admin');
          reject(
            Object.assign(
              new Error('NEW_PASSWORD_REQUIRED'),
              {
                code: 'NEW_PASSWORD_REQUIRED',
                userAttributes,
                requiredAttributes,
              }
            )
          );
        },
        mfaRequired() {
          reject(new Error('This account requires MFA, but the app does not handle MFA yet.'));
        },
        customChallenge() {
          reject(new Error('This account requires a custom Cognito challenge that the app does not handle yet.'));
        },
        onFailure: reject,
      });
    });

  const completeNewPassword = (newPassword: string, requiredAttributes: Record<string, string> = {}) =>
    new Promise<CognitoUserSession>((resolve, reject) => {
      if (!pendingNewPasswordUser) {
        reject(new Error('No pending new-password challenge found.'));
        return;
      }

      pendingNewPasswordUser.completeNewPasswordChallenge(
        newPassword,
        requiredAttributes,
        {
          onSuccess(sess) {
            setUser(pendingNewPasswordUser);
            setSession(sess);
            setIdToken(sess.getIdToken().getJwtToken());
            const poolType = sessionStorage.getItem(ACTIVE_POOL_KEY) === 'student' ? 'student' : 'admin';
            setActivePool(poolType);
            setActiveSession(poolType, sess);
            setPendingNewPasswordUser(null);
            resolve(sess);
          },
          onFailure(err) {
            reject(err);
          },
        }
      );
    });

  // Student sign-in uses the separate student user pool
  const signInStudent = (email: string, password: string): Promise<CognitoUserSession> =>
    new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: studentUserPool });
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess(sess) {
          setUser(cognitoUser);
          setSession(sess);
          setIdToken(sess.getIdToken().getJwtToken());
          setActivePool('student');
          setActiveSession('student', sess);
          resolve(sess);
        },
        newPasswordRequired(userAttributes, requiredAttributes) {
          setPendingNewPasswordUser(cognitoUser);
          sessionStorage.setItem(ACTIVE_POOL_KEY, 'student');
          reject(Object.assign(new Error('NEW_PASSWORD_REQUIRED'), { code: 'NEW_PASSWORD_REQUIRED', userAttributes, requiredAttributes }));
        },
        onFailure: reject,
      });
    });

  const signOut = () => {
    userPool.getCurrentUser()?.signOut();
    studentUserPool.getCurrentUser()?.signOut();
    setUser(null);
    setSession(null);
    setIdToken(null);
    setActivePool(null);
    sessionStorage.removeItem(ACTIVE_ID_TOKEN_KEY);
    sessionStorage.removeItem(ACTIVE_POOL_KEY);
    setPendingNewPasswordUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        idToken,
        activePool,
        isLoading,
        signIn,
        signInStudent,
        completeNewPassword,
        hasPendingNewPassword: Boolean(pendingNewPasswordUser),
        signOut,
        userPool,
        studentUserPool,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
