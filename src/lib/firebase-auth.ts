import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  type User,
} from '@react-native-firebase/auth';

import { getFirebaseApp } from '@/lib/firebase';
import { getGoogleIdToken, signOutFromGoogle } from '@/lib/google-auth';

let firebaseAuth: ReturnType<typeof getAuth> | undefined;

export function getFirebaseAuth() {
  firebaseAuth ??= getAuth(getFirebaseApp());
  return firebaseAuth;
}

export function subscribeToAuthState(listener: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), listener);
}

export async function createAccount(email: string, password: string) {
  return createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );
}

export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
  );
}

export async function signInWithGoogle() {
  const idToken = await getGoogleIdToken();

  if (!idToken) {
    return false;
  }

  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(getFirebaseAuth(), credential);
  return true;
}

export async function signOutCurrentUser() {
  const signedInWithGoogle = getFirebaseAuth().currentUser?.providerData.some(
    ({ providerId }) => providerId === GoogleAuthProvider.PROVIDER_ID,
  );

  if (signedInWithGoogle) {
    await signOutFromGoogle().catch(() => undefined);
  }

  return signOut(getFirebaseAuth());
}
