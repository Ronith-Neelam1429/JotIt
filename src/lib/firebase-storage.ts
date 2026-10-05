import {
  getDownloadURL,
  getStorage,
  putFile,
  ref,
} from '@react-native-firebase/storage';

import { getFirebaseApp } from '@/lib/firebase';

let firebaseStorage: ReturnType<typeof getStorage> | undefined;

function getFirebaseStorage() {
  firebaseStorage ??= getStorage(getFirebaseApp());
  return firebaseStorage;
}

export async function uploadProfilePhoto(
  userId: string,
  localUri: string,
  contentType = 'image/jpeg',
) {
  const profilePhotoRef = ref(
    getFirebaseStorage(),
    `users/${userId}/profile-picture`,
  );

  await putFile(profilePhotoRef, localUri, {
    contentType,
    customMetadata: { ownerId: userId },
  });

  const downloadUrl = await getDownloadURL(profilePhotoRef);
  const separator = downloadUrl.includes('?') ? '&' : '?';
  return `${downloadUrl}${separator}updated=${Date.now()}`;
}
