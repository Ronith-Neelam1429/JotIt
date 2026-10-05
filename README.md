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
- npm with a committed dependency lockfile

## Getting started

Use Node.js 24 LTS and npm.

```sh
npm ci
npm start
```

The development server offers options for a device, an Android emulator, or an
iOS simulator. Expo Go must support the project's Expo SDK version; use a
development build if it does not. An iOS simulator requires macOS and Xcode;
an Android emulator requires Android Studio.

```sh
npm run ios
npm run android
npm run web
```

## Type checking

```sh
npm run typecheck
```

## Project structure

- `src/app/_layout.tsx`: app navigation and status bar
- `src/app/index.tsx`: welcome screen
- `assets/`: app icons and splash screen assets
- `app.json`: Expo configuration

## Planned milestones

1. Create and edit personal lists.
2. Add accounts, group membership, and invitations.
3. Synchronize shared lists with access controls.
4. Support offline edits and resolve concurrent changes.

Based on the official Expo starter; its license is preserved in `LICENSE`.
