# JotIt

JotIt is an Expo/React Native app for quick lists and free-write notes. Jots can be pinned, archived, searched, sorted, grouped into folders, tagged, duplicated, and reused as templates. Each jot has a color and icon. Lists support drag-to-reorder, completion, quantities, notes, and recovery of deleted items. Trash keeps deleted jots separate from Archive.

Free-write jots use a small Markdown-based formatting toolbar for headings, emphasis, lists, checkboxes, links, and highlighting. The editor has a formatted preview, undo/redo, and version history. Jots can be exported as plain text, Markdown, or PDF, or shared as a read-only text copy through the system share sheet. Sharing a copy does not grant access to the original jot.

## Run locally

Use Node.js 24 LTS and npm. The project uses an npm lockfile.

```sh
npm ci
npm run ios       # or npm run android
```

The app uses native Firebase and export modules, so it needs a development build; Expo Go is not supported. The first platform run generates the native projects and installs the build. Later sessions can use `npm start` with that build installed.

```sh
npm run lint
npm run typecheck
node --test tests/*.test.mjs
```

## Firebase setup

The Firebase client configuration files are referenced by `app.json`. Enable Email/Password and Google sign-in in Firebase Authentication. Initialize Firestore and Storage. The access rules live in `firestore.rules` and `storage.rules`; deploy them to the same Firebase project as the client configuration.

Jot content, including tags, folders, and version history, is encrypted before it reaches Firestore. The encryption key is stored in the device's secure storage and is not synchronized between devices. Keep the original installation if you need to read previously created jots; signing in on a new device or reinstalling does not recover that key. Firestore's local persistence queues offline edits for synchronization when the connection returns.

Trash writes an `expiresAt` timestamp 30 days after a jot is moved there. The Firestore TTL policy in `firestore.indexes.json` makes permanent removal automatic once deployed. The configured JotIt Firebase project already has this policy enabled. TTL deletion is asynchronous and typically happens within a day after expiration. Review existing Firestore indexes before deploying this configuration to another project, then deploy the rules and indexes with that project selected:

```sh
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Until the TTL policy is active, users can still restore or manually delete jots from Trash, but the server will not remove expired jots automatically.

## Project layout

- `src/app/`: Expo Router screens for sign-in, the jot library, jot details, Archive, Templates, and Trash.
- `src/components/`: shared controls, list rows, and the focused free-write editor.
- `src/lib/jot-model.ts`: jot data model, search/sort, undo, and version snapshots.
- `src/lib/firebase-jots.ts`: encrypted Firestore persistence and offline write dispatch.
- `src/lib/jot-format.ts` and `src/lib/jot-sharing.ts`: formatting, exports, and sharing.
- `src/providers/`: authentication and jot state.
- `tests/`: model, formatting, and save-queue checks.

The starter license is preserved in `LICENSE`.
