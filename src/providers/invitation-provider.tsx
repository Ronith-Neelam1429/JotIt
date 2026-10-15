import { createContext, type PropsWithChildren, useContext, useState } from 'react';
export type PendingInvitation = { jotId: string; token: string; key: string };
const Context = createContext<{ pending: PendingInvitation | null; setPending: (value: PendingInvitation | null) => void } | null>(null);
export function InvitationProvider({ children }: PropsWithChildren) {
  const [pending, setPending] = useState<PendingInvitation | null>(null);
  return <Context.Provider value={{ pending, setPending }}>{children}</Context.Provider>;
}
export function usePendingInvitation() {
  const value = useContext(Context);
  if (!value) throw new Error('InvitationProvider is missing.');
  return value;
}
