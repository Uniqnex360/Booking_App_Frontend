import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function signInWithGoogleNative(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const clientId = import.meta.env.VITE_WEBSDK_CLIENT_ID;
    await GoogleAuth.initialize({
      clientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
    });
    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser?.authentication?.idToken;
    if (!idToken) {
      throw new Error('No ID token received from Google native sign-in');
    }

    // Exchange native token with Firebase to get a Firebase ID token
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return await result.user.getIdToken();
  } else {
    // Web path — keep popup flow unchanged
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return await result.user.getIdToken();
  }
}

