import { useState } from "react";
import { useInstanceState } from "./useInstanceState";

export type SyncMode = "global" | "local";

/**
 * syncモードに応じて適切な状態管理を選択するフック
 * - global: useInstanceState（マルチユーザー間で共有）
 * - local: useState（端末内のみ）
 */
export function useSyncState<T>(
  key: string,
  initialValue: T,
  sync: SyncMode,
) {
  const [globalState, setGlobalState] = useInstanceState<T>(key, initialValue);
  const [localState, setLocalState] = useState<T>(initialValue);

  if (sync === "global") {
    return [globalState, setGlobalState] as const;
  }
  return [localState, setLocalState] as const;
}
