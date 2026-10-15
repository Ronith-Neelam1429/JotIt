import type { Jot } from './jot-model';

export type MemberRole = 'owner' | 'editor' | 'viewer';
export type JotMember = { role: MemberRole; name: string; joinedAt: number };
export type Collaboration = {
  revision: number;
  members: Record<string, JotMember>;
  lastEditedBy: string;
  lastEditedAt: number;
};
export type Activity = { id: string; actorId: string; actorName: string; description: string; at: number };
export type Invitation = { token: string; role: 'editor' | 'viewer'; expiresAt: number; active: boolean; createdAt: number };
export const MAX_MEMBERS = 30;
export const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const PRESENCE_TTL_MS = 90_000;

export function memberRole(jot: Pick<Jot, 'ownerId' | 'collaboration'>, userId?: string): MemberRole | null {
  if (!userId) return null;
  if (jot.ownerId === userId) return 'owner';
  return jot.collaboration?.members[userId]?.role ?? null;
}
export function canEditJot(jot: Pick<Jot, 'ownerId' | 'collaboration'>, userId?: string) {
  const role = memberRole(jot, userId);
  return role === 'owner' || role === 'editor';
}
export function displayName(value: string | null | undefined) {
  return (value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40) || 'Member';
}
export function memberName(jot: Pick<Jot, 'collaboration'>, userId: string) {
  return jot.collaboration?.members[userId]?.name ?? 'Former member';
}
export function invitationLink(jotId: string, token: string, key: string) {
  return `jotit://invite/${encodeURIComponent(jotId)}/${token}?key=${encodeURIComponent(key)}`;
}
export function validInvitationParts(jotId: unknown, token: unknown, key: unknown): boolean {
  return typeof jotId === 'string' && /^[\w-]{1,128}$/.test(jotId)
    && typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
    && typeof key === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(key);
}
