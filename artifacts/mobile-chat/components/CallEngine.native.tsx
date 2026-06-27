import Constants, { ExecutionEnvironment } from "expo-constants";
import type { ReactNode } from "react";
import CallEngineFallback from "./CallEngineFallback";

// Stream Video needs custom native modules (WebRTC), which only exist in a
// native dev build / standalone app — not in Expo Go. We must avoid even
// *evaluating* the Stream module under Expo Go, so we gate the `require` behind
// a runtime check. Metro still bundles the module, but it is never executed
// (and never crashes) unless we're in a real native build.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const Engine: (props: { children: ReactNode }) => ReactNode = isExpoGo
  ? CallEngineFallback
  : (require("./StreamCallEngine").default as typeof CallEngineFallback);

export default function CallEngine({ children }: { children: ReactNode }) {
  return <Engine>{children}</Engine>;
}
