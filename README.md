# JotIt

JotIt is a mobile app for sharing quick lists and notes with friends and family.
A group can create a shared **jot**, such as a grocery list, and everyone invited
can add or update items so the information stays in one place.

The goal is to make capturing everyday information as simple as opening a jot,
adding what you remembered, and moving on.

## Project status

Initial project foundation with a JotIt welcome screen. Shared lists,
authentication, invitations, and synchronization are planned and are not yet
implemented. The starter icons are temporary Expo assets.

## Stack

- React Native and Expo for iOS and Android
- TypeScript with strict checking
- Expo Router for navigation
- Native Firebase Authentication and Cloud Firestore
- npm with a committed dependency lockfile

## Getting started

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run ios
```

### Firebase configuration

The iOS and Android Firebase client configuration files are connected through
`app.json`. Their registered application identifiers must match the values in
the Firebase console. Access control must be enforced with Firebase
Authentication and Firestore Security Rules. Never put a Firebase service-account
private key in the mobile app.

Firebase is accessed through `src/lib/firebase.ts`. Import
`getFirebaseAuth` from `src/lib/firebase-auth` for authentication and
`getFirestoreDb` from `src/lib/firebase` for Firestore. The native Firestore SDK
provides local persistence and synchronizes pending changes after reconnecting.

React Native Firebase requires a development build and does not run in Expo Go.
The first platform command creates the native project, compiles a development
build, installs it on a simulator or emulator, and starts Expo. Later sessions
can use `npm start` when the development build is already installed.

The iOS build uses dynamic framework linkage because React Native Firebase 26
resolves the Firebase Apple SDK through Swift Package Manager by default.

## Authentication

JotIt uses Firebase Authentication. Email/password and Google account sign-in,
password reset, persistent sessions, protected routes, and sign-out are
implemented. Enable **Email/Password** and **Google** under Firebase Console →
Authentication → Sign-in method before using the flows.

Google Sign-In uses the native Google SDK on iOS and Credential Manager on
Android. It requires a development build and does not run in Expo Go.

Account settings let signed-in users update their global display name and
profile photo, view their email, request a password reset, and log out. Profile
photos are uploaded to Firebase Storage under `users/{uid}/profile-picture`, so
Firebase Storage must be initialized for the project with authenticated-user
rules before uploads will work. The recommended rules are in `storage.rules`.

```sh
npm run ios
npm run android
```

## Type checking

```sh
npm run typecheck
```

## Project structure

- `src/app/_layout.tsx`: app navigation and status bar
- `src/app/index.tsx`: welcome screen
- `assets/`: app icons and splash screen assets
- `GoogleService-Info.plist`: Firebase iOS client configuration
- `google-services.json`: Firebase Android client configuration
- `app.json`: Expo configuration

## Planned milestones

1. Create and edit personal lists.
2. Add accounts, group membership, and invitations.
3. Synchronize shared lists with access controls.
4. Support offline edits and resolve concurrent changes.

Based on the official Expo starter; its license is preserved in `LICENSE`.
