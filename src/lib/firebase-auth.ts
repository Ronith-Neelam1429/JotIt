import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  updateProfile,
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

export async function createAccount(
  displayName: string,
  email: string,
  password: string,
) {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );

  await updateProfile(credential.user, { displayName: displayName.trim() });
  return credential;
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

export async function updateCurrentUserProfile(profile: {
  displayName?: string;
  photoURL?: string;
}) {
  const currentUser = getFirebaseAuth().currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to update your profile.');
  }

  await updateProfile(currentUser, profile);
}

export async function reloadCurrentUser() {
  const currentUser = getFirebaseAuth().currentUser;

  if (!currentUser) {
    return null;
  }

  await reload(currentUser);
  return getFirebaseAuth().currentUser;
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
