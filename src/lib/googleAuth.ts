import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import {
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

// iOS client ID from GoogleService-Info.plist (must match bundle ID in Google Cloud Console)
const IOS_CLIENT_ID =
  '835333652848-q9nosshusfsfmidscimcibesu3mqo8au.apps.googleusercontent.com';

export async function signInWithGoogleNative(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const webClientId = import.meta.env.VITE_WEBSDK_CLIENT_ID;

    // On iOS the GIDSignIn SDK requires the iOS OAuth client ID as `clientId`.
    // The web/server client ID is set via capacitor.config.ts → serverClientId.
    const isIos = Capacitor.getPlatform() === 'ios';
    await GoogleAuth.initialize({
      clientId: isIos ? IOS_CLIENT_ID : webClientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
    });

    // Sign out any previous session so the account picker always appears,
    // instead of silently reusing the last signed-in account.
    try { await GoogleAuth.signOut(); } catch (_) { /* no previous session */ }

    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser?.authentication?.idToken;
    if (!idToken) {
      throw new Error('No ID token received from Google native sign-in');
    }

    // Return the pure Google ID token directly to be verified by backend,
    // completely bypassing Firebase and its quota limitations.
    return idToken;
  } else {
    // Web path: get Google credential from popup
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.idToken) {
      return credential.idToken;
    }
    return await result.user.getIdToken();
  }
}

