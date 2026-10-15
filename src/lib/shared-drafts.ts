import { File, Paths } from 'expo-file-system';
import { decryptJson, encryptJson, type JotEncryptionKey } from '@/lib/jot-encryption';
import type { Jot } from '@/lib/jot-model';
export type SharedDraft = { base: Jot; local: Jot };
const writes = new Map<string, Promise<void>>();
function draftFile(userId: string) { return new File(Paths.document, `jotit-shared-drafts-${encodeURIComponent(userId)}.json`); }
export function saveSharedDrafts(userId: string, drafts: SharedDraft[], key: JotEncryptionKey) {
  const next = (writes.get(userId) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const file = draftFile(userId);
    if (!drafts.length) { if (file.exists) file.delete(); return; }
    file.write(await encryptJson(drafts, key));
  });
  writes.set(userId, next);
  return next;
}
export async function loadSharedDrafts(userId: string, key: JotEncryptionKey): Promise<SharedDraft[]> {
  await writes.get(userId)?.catch(() => undefined);
  const file = draftFile(userId);
  if (!file.exists) return [];
  const drafts = await decryptJson<SharedDraft[]>(await file.text(), key);
  return Array.isArray(drafts) ? drafts.filter((draft) => draft.base?.id === draft.local?.id && draft.local?.collaboration) : [];
}
