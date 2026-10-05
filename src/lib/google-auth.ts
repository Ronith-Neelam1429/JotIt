import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from 'react-native-nitro-google-signin';

GoogleOneTapSignIn.configure({ webClientId: 'autoDetect' });

export async function getGoogleIdToken() {
  await GoogleOneTapSignIn.checkPlayServices();

  let response = await GoogleOneTapSignIn.signIn();

  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.createAccount();
  }

  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.presentExplicitSignIn();
  }

  if (isCancelledResponse(response)) {
    return null;
  }

  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error('Google Sign-In did not return an ID token.');
  }

  return response.data.idToken;
}

export async function signOutFromGoogle() {
  await GoogleOneTapSignIn.signOut();
}
