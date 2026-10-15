# JotIt

JotIt is an Expo/React Native app for quick lists and free-write notes. Jots can be pinned, archived, searched, sorted, grouped into folders, tagged, duplicated, and reused as templates. Each jot has a color and icon. Lists support drag-to-reorder, completion, quantities, notes, and recovery of deleted items. Trash keeps deleted jots separate from Archive.

Free-write jots use a small Markdown-based formatting toolbar for headings, emphasis, lists, checkboxes, links, and highlighting. The editor has a formatted preview, undo/redo, and version history. Jots can be exported as plain text, Markdown, or PDF, or shared as a read-only text copy through the system share sheet. Sharing a copy does not grant access to the original jot. Use **Invite someone** on a jot to collaborate on the original.

## Run locally

Use Node.js 24 LTS and npm. The project uses an npm lockfile.

```sh
npm ci
npm run ios       # or npm run android
```

After pulling this collaboration update, rebuild the development client to include Firebase Functions and react-native-svg. The app uses native Firebase and export modules, so it needs a development build; Expo Go is not supported. The first platform run generates the native projects and installs the build. Later sessions can use `npm start` with that build installed.

```sh
npm run lint
npm run typecheck
npm test
npm run test:collaboration  # requires Java 21 and the Firebase CLI
```

## Firebase setup

The Firebase client configuration files are referenced by `app.json`. Enable Email/Password and Google sign-in in Firebase Authentication. Initialize Firestore and Storage. The access rules live in `firestore.rules` and `storage.rules`; deploy them to the same Firebase project as the client configuration.

Jot content, including tags, folders, and version history, is encrypted before it reaches Firestore. Private jots use a device-local key: keep the original installation to read them. Shared jots get an independent AES-256 key. An invitation carries that key to the recipient, who wraps it with their device key and keeps a secure local copy. The server stores only encrypted key envelopes, encrypted content, and encrypted invitation previews. Membership, group names, timestamps, and membership events are access-controlled metadata, not encrypted content.

Shared jots can be opened on another device by accepting a fresh invitation on that device. Private jots are not automatically recoverable after reinstalling. Removing someone prevents future server reads and writes; it cannot retract content or keys they already downloaded.

Private edits use Firestore's offline persistence. Shared edits use online merge transactions, with an encrypted on-device draft backup and automatic retry while the app is active. A removed or demoted member cannot submit queued changes. Keep the installation to retain unsynced drafts.

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

## Collaboration

- Open a jot and tap **Invite someone**, or use **People & invitations** in its options.
- Owners create an editor or viewer link, share it, or show its QR code. Links use a 256-bit random capability, require sign-in, expire after seven days, and can be disabled. Creating a replacement invalidates the previous link. The app must be installed to open the `jotit://` link; there is no web or app-store fallback.
- Recipients preview the encrypted title and explicitly accept or decline. The invitation survives navigation through sign-in or account creation while the app remains open.
- **People** lists members and roles. Tap your own name to set a name just for this jot. Owners can change roles, remove members, or transfer ownership. An owner must transfer ownership before leaving. Up to 30 people can belong to a jot.
- Removal, leaving, and ownership transfer invalidate existing invitation links. Viewers have a read-only interface, and the database separately enforces those permissions.
- A compact indicator shows who else has the jot open. Presence refreshes every 30 seconds and expires after 90 seconds; it is approximate, not a typing or cursor indicator.
- **Activity** shows recent content changes and membership events. Consecutive typing saves are grouped. Content activity keeps the latest 60 entries in the encrypted jot; membership events and inbox notifications expire after 90 days. There are no conversations or direct messages.
- **Notifications** on the home screen is a persistent in-app inbox for joins, removal, role changes, and ownership changes. This version does not send OS push notifications or email.

### Simultaneous edits

Writes retry against the latest Firestore revision. Changes to different list items or different fields merge. Deletion wins over an edit to the same item; restoring an item is an explicit action. The last committed write wins when the same field is changed concurrently. Concurrent additions survive reorder operations. Competing free-write content is saved in Version history as **Concurrent edit (saved copy)** before the last committed text becomes current. There is no character-level text merge.

### Backend deployment and verification

Install server dependencies with `npm ci --prefix functions` after cloning. The callable `collaboration` function runs in `us-central1`, authenticates every request, and performs membership updates and their notifications in the same transaction. Clients cannot directly change memberships, invitation records, key envelopes, or server membership events.

```sh
npx firebase-tools@latest deploy --project jotit-8954e --only functions:collaboration,firestore:rules,firestore:indexes
npx firebase-tools@latest functions:artifacts:setpolicy --project jotit-8954e --location us-central1 --days 7
npm run lint
npm run typecheck
npm test
npm run test:collaboration
npx expo export --platform ios --platform android
```

Use a current npm-installed Firebase CLI for deployment. The standalone CLI's bundled Node 20 runtime cannot load these Node 22 server dependencies. The emulator test runner preserves the project's Node executable so it also works with the standalone CLI.

The emulator suite uses the isolated `demo-jotit` project. It verifies authenticated conversion, preview/accept/decline, viewer/editor boundaries, key privacy, stale-revision rejection, presence impersonation prevention, inbox privacy, link revocation/expiration, concurrent joins, removal, leaving, and ownership transfer. Mobile JavaScript bundle exports validate both platforms; a fresh native build and a two-device smoke test are still required before store distribution.
