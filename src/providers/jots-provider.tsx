import { createContext, type PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { permanentlyDeleteJot, prepareJotSave, saveJot, saveSharedJot, subscribeToJots } from '@/lib/firebase-jots';
import { ACCENTS, createId, deleteEntries, restoreEntry as restoreDeletedEntry, emptyContent, contentOf, normalizeTags, checkpoint, recordUndo, stepUndo, type UndoState, type JotContent, type Jot, type JotKind } from '@/lib/jot-model';
import { getOrCreateJotEncryptionKey, type JotEncryptionKey } from '@/lib/jot-encryption';
import { canEditJot } from '@/lib/collaboration-model';
import { clearSharedKeys, forgetSharedKey } from '@/lib/collaboration-keys';
import { mergeJotChanges } from '@/lib/jot-merge';
import { dispatchJotSave } from '@/lib/jot-save-queue';
import { useAuth } from '@/providers/auth-provider';

export type { Jot, JotEntry, JotKind } from '@/lib/jot-model';

type JotsContextValue = {
  restoreVersion: (id: string, versionId: string) => void;
  undo: (id: string) => void;
  redo: (id: string) => void;
  canUndo: (id: string) => boolean;
  canRedo: (id: string) => boolean;
  organizeJot: (id: string, folder: string, tags: string[]) => void;
  pinJot: (id: string, pinned: boolean) => void;
  archiveJot: (id: string, archived: boolean) => void;
  duplicateJot: (id: string, asTemplate?: boolean) => Jot;
  completeAll: (id: string) => void;
  clearCompleted: (id: string) => void;
  restoreEntry: (id: string, entryId: string) => void;
  updateAppearance: (id: string, accent: string, emoji: string) => void;
  addEntry: (jotId: string, text: string) => boolean;
  changeJotKind: (jotId: string, kind: JotKind) => Promise<void>;
  createJot: (title: string, kind: JotKind, seed?: Partial<JotContent>) => Jot;
  deleteJotPermanently: (jotId: string) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  jots: Jot[];
  removeEntry: (jotId: string, entryId: string) => void;
  renameEntry: (jotId: string, entryId: string, text: string, quantity?: string, note?: string) => void;
  renameJot: (jotId: string, title: string) => Promise<void>;
  reorderEntries: (jotId: string, entryIds: string[]) => void;
  restoreJot: (jotId: string) => Promise<void>;
  retrySync: () => void;
  syncError: string | null;
  toggleEntry: (jotId: string, entryId: string) => void;
  trashJots: (jotIds: string[]) => Promise<void>;
  trashedJots: Jot[];
  updateDocument: (jotId: string, content: string) => void;
};
const JotsContext = createContext<JotsContextValue | null>(null);

export function JotsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.uid;
  const [jots, setJots] = useState<Jot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const jotsRef = useRef<Jot[]>([]);
  const encryptionKeyRef = useRef<JotEncryptionKey | null>(null);
  const dirtyBases = useRef(new Map<string, Jot>());
  const dirtyJots = useRef(new Map<string, Jot>());
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saveChains = useRef(new Map<string, Promise<void>>());
  const deletingIds = useRef(new Set<string>());
  const session = useRef(0);
  const undoStates = useRef(new Map<string, UndoState>());

  function replaceJots(next: Jot[]) {
    jotsRef.current = next;
    setJots(next);
  }
  function reportSyncError(error: unknown) {
    console.error('Jot sync failed:', error);
    setSyncError('Changes are kept in this session. Reconnect and tap Retry to sync them before signing out.');
  }
  function persist(jot: Jot) {
    const key = encryptionKeyRef.current;
    if (!key) return;
    const generation = session.current;
    const previous = saveChains.current.get(jot.id) ?? Promise.resolve();
    if (jot.collaboration) {
      const next = previous.catch(() => undefined).then(async () => {
        if (generation !== session.current || !userId || deletingIds.current.has(jot.id)) return;
        const target = dirtyJots.current.get(jot.id), base = dirtyBases.current.get(jot.id);
        if (!target || !base) return;
        const saved = await saveSharedJot(base, target, userId, key);
        if (generation !== session.current) return;
        const pending = dirtyJots.current.get(jot.id);
        if (!pending) return; // Membership may have been revoked during the transaction.
        let display = saved;
        if (pending === target) { dirtyJots.current.delete(jot.id); dirtyBases.current.delete(jot.id); }
        else {
          display = mergeJotChanges(target, pending, saved);
          dirtyJots.current.set(jot.id, display);
          dirtyBases.current.set(jot.id, saved);
        }
        replaceJots(jotsRef.current.map((item) => item.id === jot.id ? display : item));
        setIsSaving(dirtyJots.current.size > 0);
        if (!dirtyJots.current.size) setSyncError(null);
      });
      saveChains.current.set(jot.id, next);
      void next.catch((error) => { if (generation === session.current) reportSyncError(error); }).finally(() => {
        if (saveChains.current.get(jot.id) === next) saveChains.current.delete(jot.id);
      });
      return;
    }
    const next = dispatchJotSave(previous, async () => {
      if (generation !== session.current || deletingIds.current.has(jot.id)) return null;
      const commit = await prepareJotSave(jot, key);
      return generation === session.current && !deletingIds.current.has(jot.id) ? commit : null;
    }, () => {
      if (generation !== session.current) return;
      if (dirtyJots.current.get(jot.id) === jot) dirtyJots.current.delete(jot.id);
      setIsSaving(dirtyJots.current.size > 0);
      if (!dirtyJots.current.size) setSyncError(null);
    }, (error) => { if (generation === session.current) reportSyncError(error); });
    saveChains.current.set(jot.id, next);
    void next.catch((error) => {
      if (generation === session.current) reportSyncError(error);
    }).finally(() => {
      if (saveChains.current.get(jot.id) === next) saveChains.current.delete(jot.id);
    });
  }
  function scheduleSave(jot: Jot, delay = 0) {
    dirtyJots.current.set(jot.id, jot);
    setIsSaving(true);
    const timer = saveTimers.current.get(jot.id);
    if (timer) clearTimeout(timer);
    saveTimers.current.delete(jot.id);
    if (!delay) { persist(jot); return; }
    saveTimers.current.set(jot.id, setTimeout(() => {
      saveTimers.current.delete(jot.id);
      const latest = dirtyJots.current.get(jot.id);
      if (latest) persist(latest);
    }, delay));
  }
  function retrySync() {
    dirtyJots.current.forEach((jot) => scheduleSave(jot));
  }

  useEffect(() => {
    const generation = ++session.current;
    dirtyJots.current.clear();
    dirtyBases.current.clear();
    clearSharedKeys();
    undoStates.current.clear();
    saveChains.current.clear();
    deletingIds.current.clear();
    const timers = saveTimers.current;
    const pending = dirtyJots.current;
    const chains = saveChains.current;
    const sessionRef = session;
    timers.forEach(clearTimeout);
    timers.clear();
    let unsubscribe: (() => void) | undefined;
    if (userId) void getOrCreateJotEncryptionKey(userId).then((key) => {
      if (session.current !== generation) return;
      encryptionKeyRef.current = key;
      unsubscribe = subscribeToJots(userId, key, (remote) => {
        if (session.current !== generation) return;
        const merged = new Map(remote.filter((jot) => !deletingIds.current.has(jot.id)).map((jot) => [jot.id, jot]));
        dirtyJots.current.forEach((jot, id) => {
          const incoming = merged.get(id);
          if (jot.collaboration && (!incoming || !canEditJot(incoming, userId))) {
            dirtyJots.current.delete(id); dirtyBases.current.delete(id); undoStates.current.delete(id);
            forgetSharedKey(userId, id);
            const timer = saveTimers.current.get(id); if (timer) clearTimeout(timer);
            saveTimers.current.delete(id);
            setSyncError('Your access changed. Unsaved edits could not be sent to this jot.');
            return;
          }
          const pending = incoming?.collaboration ? { ...jot, collaboration: incoming.collaboration, ownerId: incoming.ownerId, memberIds: incoming.memberIds } : jot;
          // Preserve identity during ordinary snapshots so acknowledgements can clear the queue.
          if (incoming?.collaboration && !jot.collaboration) {
            dirtyBases.current.set(id, incoming); dirtyJots.current.set(id, pending);
          }
          merged.set(id, pending);
        });
        setIsSaving(dirtyJots.current.size > 0);
        // Decryption can finish after a write acknowledgement. Keep newer local data.
        jotsRef.current.forEach((jot) => {
          const incoming = merged.get(jot.id);
          if (!jot.collaboration && !incoming?.collaboration && incoming && jot.updatedAt > incoming.updatedAt) merged.set(jot.id, jot);
        });
        replaceJots([...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt));
        setIsLoading(false);
      }, (error) => { if (session.current === generation) { reportSyncError(error); setIsLoading(false); } });
    }).catch((error) => { if (session.current === generation) { reportSyncError(error); setIsLoading(false); } });
    return () => {
      unsubscribe?.();
      // Flush debounced edits using the current account's key before invalidating the session.
      pending.forEach((jot) => {
        if (encryptionKeyRef.current && !jot.collaboration) {
          const key = encryptionKeyRef.current;
          void (chains.get(jot.id) ?? Promise.resolve()).catch(() => undefined)
            .then(() => saveJot(jot, key)).catch(console.error);
        }
      });
      timers.forEach(clearTimeout);
      timers.clear();
      ++sessionRef.current;
      encryptionKeyRef.current = null;
    };
  }, [userId]); // Account identity, not profile edits, owns the subscription.

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') dirtyJots.current.forEach((jot) => scheduleSave(jot));
    });
    return () => subscription.remove();
  });

  function edit(jotId: string, update: (jot: Jot) => Jot, delay = 0, record = true) {
    const current = jotsRef.current.find((jot) => jot.id === jotId);
    if (!current) return;
    if (!canEditJot(current, userId)) { Alert.alert('View only', 'Ask the owner for editing access.'); return; }
    const changed = update(current);
    if (JSON.stringify(changed) === JSON.stringify(current)) return;
    if (new TextEncoder().encode(JSON.stringify(contentOf(changed))).length > 220000) {
      Alert.alert('This jot is getting full', 'Split it into smaller jots before adding more content. Your existing content is unchanged.');
      return;
    }
    if (record) undoStates.current.set(jotId, recordUndo(undoStates.current.get(jotId), current, delay > 0, Date.now()));
    const next = { ...changed, versions: checkpoint(current, changed, delay > 0), updatedAt: Math.max(Date.now(), current.updatedAt + 1) };
    if (current.collaboration && !dirtyBases.current.has(jotId)) dirtyBases.current.set(jotId, current);
    replaceJots(jotsRef.current.map((jot) => jot.id === jotId ? next : jot));
    scheduleSave(next, delay);
    return next;
  }
  function restoreVersion(id: string, versionId: string) {
    edit(id, (jot) => {
      const version = jot.versions.find((candidate) => candidate.id === versionId);
      return version ? { ...jot, ...version.content } : jot;
    });
  }
  function travel(id: string, direction: 'undo' | 'redo') {
    const current = jotsRef.current.find((jot) => jot.id === id);
    const state = undoStates.current.get(id);
    if (!current || !state) return;
    const result = stepUndo(state, current, direction);
    if (!result) return;
    undoStates.current.set(id, result.state);
    edit(id, (jot) => ({ ...jot, ...result.content }), 0, false);
  }
  function createJot(title: string, kind: JotKind, seed: Partial<JotContent> = {}) {
    if (!user || !encryptionKeyRef.current) throw new Error('Your jots are still loading. Try again in a moment.');
    const now = Date.now();
    const jot: Jot = { ...emptyContent(kind), id: createId(), title: title.trim().slice(0, 100) || 'Untitled',
      accent: ACCENTS[jotsRef.current.length % ACCENTS.length].color, ...seed,
      createdAt: now, updatedAt: now, memberIds: [user.uid], ownerId: user.uid, trashedAt: null, versions: [] };
    replaceJots([jot, ...jotsRef.current]);
    scheduleSave(jot);
    return jot;
  }
  function organizeJot(id: string, folder: string, tags: string[]) {
    edit(id, (jot) => ({ ...jot, folder: folder.trim().slice(0, 50), tags: normalizeTags(tags) }));
  }
  function pinJot(id: string, pinned: boolean) {
    edit(id, (jot) => ({ ...jot, pinned }));
  }
  function archiveJot(id: string, archived: boolean) {
    edit(id, (jot) => ({ ...jot, archivedAt: archived ? Date.now() : null }));
  }
  function duplicateJot(id: string, asTemplate = false) {
    const original = jotsRef.current.find((jot) => jot.id === id);
    if (!original) throw new Error('This jot is no longer available.');
    const title = asTemplate ? `${original.title} template` : original.isTemplate ? original.title : `${original.title} copy`;
    return createJot(title, original.kind, {
      ...contentOf(original), title: title.slice(0, 100), archivedAt: null, pinned: false,
      isTemplate: asTemplate, deletedEntries: [],
      entries: original.entries.map((entry) => ({ ...entry, id: createId(), createdAt: Date.now(),
        completed: original.isTemplate || asTemplate ? false : entry.completed })),
    });
  }
  function updateAppearance(id: string, accent: string, emoji: string) {
    edit(id, (jot) => ({ ...jot, accent, emoji }));
  }
  function addEntry(id: string, text: string) {
    if (!text.trim()) return false;
    return Boolean(edit(id, (jot) => ({ ...jot, entries: [...jot.entries,
      { completed: false, createdAt: Date.now(), id: createId(), text: text.trim().slice(0, 500) }] })));

  }
  function toggleEntry(id: string, entryId: string) {
    edit(id, (jot) => ({ ...jot, entries: jot.entries.map((entry) => entry.id === entryId ? { ...entry, completed: !entry.completed } : entry) }));
  }
  function removeEntry(id: string, entryId: string) {
    edit(id, (jot) => deleteEntries(jot, [entryId]));
  }
  function completeAll(id: string) {
    edit(id, (jot) => ({ ...jot, entries: jot.entries.map((entry) => ({ ...entry, completed: true })) }));
  }
  function clearCompleted(id: string) {
    edit(id, (jot) => deleteEntries(jot, jot.entries.filter((entry) => entry.completed).map((entry) => entry.id)));
  }
  function restoreEntry(id: string, entryId: string) {
    edit(id, (jot) => restoreDeletedEntry(jot, entryId));
  }
  function renameEntry(id: string, entryId: string, text: string, quantity = '', note = '') {
    if (!text.trim()) return;
    edit(id, (jot) => ({ ...jot, entries: jot.entries.map((entry) => entry.id === entryId ? { ...entry, text: text.trim().slice(0, 500), quantity: quantity.trim().slice(0, 40), note: note.trim().slice(0, 1000) } : entry) }));
  }
  function reorderEntries(id: string, ids: string[]) {
    edit(id, (jot) => {
      const byId = new Map(jot.entries.map((entry) => [entry.id, entry]));
      if (ids.length !== jot.entries.length || new Set(ids).size !== ids.length || ids.some((key) => !byId.has(key))) return jot;
      return { ...jot, entries: ids.map((key) => byId.get(key)!) };
    });
  }
  function updateDocument(id: string, content: string) {
    edit(id, (jot) => ({ ...jot, documentContent: content.slice(0, 50000) }), 400);
  }
  async function renameJot(id: string, title: string) {
    if (!title.trim()) throw new Error('A jot needs a name.');
    edit(id, (jot) => ({ ...jot, title: title.trim().slice(0, 100) }));
  }
  async function changeJotKind(id: string, kind: JotKind) {
    edit(id, (jot) => jot.kind === kind ? jot : ({ ...jot, kind,
      documentContent: kind === 'document' ? jot.entries.map((entry) => `${entry.completed ? '- [x]' : '- [ ]'} ${entry.text}${entry.quantity ? ` (${entry.quantity})` : ''}${entry.note ? ` — ${entry.note.replace(/\n/g, ' ')}` : ''}`).join('\n') : jot.documentContent,
      entries: kind === 'list' ? jot.documentContent.split(/\r?\n/).filter((line) => line.trim()).map((line) => ({
        id: createId(), createdAt: Date.now(), completed: /^(?:[-*•]\s*)?\[[xX]\]/.test(line.trim()),
        text: line.trim().replace(/^(?:[-*•]\s*)?\[[ xX]\]\s*|^(?:[-*•]|\d+[.)]|#{1,3})\s+/, ''),
      })) : jot.entries,
    }));
  }
  async function trashJots(ids: string[]) {
    if (ids.some((id) => jotsRef.current.find((jot) => jot.id === id)?.ownerId !== userId)) throw new Error('Only the owner can move a shared jot to Trash.');
    ids.forEach((id) => edit(id, (jot) => ({ ...jot, trashedAt: Date.now() })));
  }
  async function restoreJot(id: string) {
    if (jotsRef.current.find((jot) => jot.id === id)?.ownerId !== userId) throw new Error('Only the owner can restore this jot.');
    edit(id, (jot) => ({ ...jot, trashedAt: null }));
  }
  async function deleteJotPermanently(id: string) {
    const previous = jotsRef.current.find((jot) => jot.id === id);
    if (!previous) return;
    if (previous.ownerId !== userId) throw new Error('Only the owner can delete this jot.');
    deletingIds.current.add(id);
    const timer = saveTimers.current.get(id);
    if (timer) clearTimeout(timer);
    saveTimers.current.delete(id);
    dirtyJots.current.delete(id);
    setIsSaving(dirtyJots.current.size > 0);
    replaceJots(jotsRef.current.filter((jot) => jot.id !== id));
    try {
      await saveChains.current.get(id)?.catch(() => undefined);
      await permanentlyDeleteJot(id);
    } catch (error) {
      deletingIds.current.delete(id);
      replaceJots([...jotsRef.current, previous]);
      reportSyncError(error);
      throw error;
    }
  }
  return <JotsContext.Provider value={{ restoreVersion, undo: (id) => travel(id, 'undo'), redo: (id) => travel(id, 'redo'),
    canUndo: (id) => Boolean(undoStates.current.get(id)?.past.length), canRedo: (id) => Boolean(undoStates.current.get(id)?.future.length), organizeJot, pinJot, archiveJot, duplicateJot, completeAll, clearCompleted, restoreEntry, updateAppearance, addEntry, changeJotKind, createJot, deleteJotPermanently,
    isLoading, isSaving, jots: jots.filter((jot) => jot.trashedAt === null), removeEntry, renameEntry,
    renameJot, reorderEntries, restoreJot, retrySync, syncError, toggleEntry, trashJots,
    trashedJots: jots.filter((jot) => jot.trashedAt !== null), updateDocument }}>{children}</JotsContext.Provider>;
}
export function useJots() {
  const context = useContext(JotsContext);
  if (!context) throw new Error('useJots must be used inside JotsProvider.');
  return context;
}
