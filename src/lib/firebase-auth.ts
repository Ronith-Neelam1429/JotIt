import { getAuth } from '@react-native-firebase/auth';

import { getFirebaseApp } from '@/lib/firebase';

let firebaseAuth: ReturnType<typeof getAuth> | undefined;

export function getFirebaseAuth() {
  firebaseAuth ??= getAuth(getFirebaseApp());
  return firebaseAuth;
}
