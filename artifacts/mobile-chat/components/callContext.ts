import { createContext, useContext } from "react";
import type { Profile } from "@workspace/api-client-react";

export interface CallContextValue {
  startCall: (peer: Profile | string, withVideo: boolean) => void;
  endCall: () => void;
}

export const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
}
