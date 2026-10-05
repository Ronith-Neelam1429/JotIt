import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';

let firebaseApp: ReturnType<typeof getApp> | undefined;
let firestoreDb: ReturnType<typeof getFirestore> | undefined;

export function getFirebaseApp() {
  firebaseApp ??= getApp();
  return firebaseApp;
}

export function getFirestoreDb() {
  firestoreDb ??= getFirestore(getFirebaseApp());
  return firestoreDb;
}
