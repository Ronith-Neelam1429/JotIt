import { spawnSync } from 'node:child_process';
// The standalone Firebase CLI injects its bundled runtime as `node`; keep our Node 24 test runner.
const runtime = "'" + process.execPath.replaceAll("'", "'\\''") + "'";
const result = spawnSync('firebase', ['emulators:exec', '--project', 'demo-jotit', '--only', 'firestore', `${runtime} --test functions/test/collaboration.integration.mjs`], { stdio: 'inherit' });
if (result.error) console.error('Install Firebase CLI before running the emulator suite:', result.error.message);
process.exitCode = result.status ?? 1;
