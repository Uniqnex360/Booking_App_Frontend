import { Capacitor } from '@capacitor/core';
import {
  SignInWithApple,
  SignInWithAppleResponse,
  SignInWithAppleOptions,
} from '@capacitor-community/apple-sign-in';
import {
  OAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import api, { setTokens } from '@/api/client';
import { getCurrentUser } from '@/api/auth.api';

export interface AppleAuthResult {
  error: string | null;
  cancelled?: boolean;
  user?: any;
}

export async function signInWithAppleNative(): Promise<AppleAuthResult> {
  const isIos = Capacitor.getPlatform() === 'ios';

  if (isIos) {
    try {
      const options: SignInWithAppleOptions = {
        clientId: 'com.vybhz.app',
        redirectURI: 'https://vybhz.com',
        scopes: 'email name',
      };

      const res: SignInWithAppleResponse = await SignInWithApple.authorize(options);
      const identityToken = res.response?.identityToken;
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }

      let fullName: string | undefined;
      const given = res.response?.givenName || '';
      const family = res.response?.familyName || '';
      if (given || family) {
        fullName = `${given} ${family}`.trim();
      }

      // Send to direct Apple login endpoint
      const response = await api.post('/auth/login/apple', {
        identity_token: identityToken,
        full_name: fullName,
        authorization_code: res.response?.authorizationCode,
      });

      const { access_token, refresh_token } = response.data.data;
      setTokens(access_token, refresh_token);
      const user = await getCurrentUser();
      return { error: null, user };
    } catch (err: any) {
      // 1001 is standard iOS ASAuthorizationError.canceled
      const msg = (err?.message || '').toLowerCase();
      if (
        err?.code === '1001' ||
        err?.code === 1001 ||
        msg.includes('canceled') ||
        msg.includes('cancelled')
      ) {
        return { error: null, cancelled: true };
      }
      return { error: err?.message || 'Apple Sign-In failed' };
    }
  } else {
    // Web / Android fallback via Firebase OAuthProvider
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();

      // Exchange with backend
      const response = await api.post('/auth/login/firebase', { token });
      const { access_token, refresh_token } = response.data.data;
      setTokens(access_token, refresh_token);
      const user = await getCurrentUser();
      return { error: null, user };
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        msg.includes('closed-by-user') ||
        msg.includes('canceled') ||
        msg.includes('cancelled')
      ) {
        return { error: null, cancelled: true };
      }
      if (
        err?.code === 'auth/operation-not-allowed' ||
        err?.code === 'auth/configuration-not-found' ||
        msg.includes('operation-not-allowed')
      ) {
        return {
          error:
            'Sign in with Apple is supported on iOS devices. On Android/Web, please continue with Google, Phone, or Email.',
        };
      }
      return { error: err?.message || 'Apple Sign-In failed' };
    }
  }
}

