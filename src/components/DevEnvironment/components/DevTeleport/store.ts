import type {
  TeleportContextValue,
  TeleportDestination,
} from '../../../../contexts/TeleportContext'

/**
 * DevEnvironment 用のテレポートストア（React 非依存）。
 * useTeleport() の teleport() で行き先を預かり、PhysicsPlayer が次のフレームで取り出して体を動かす。
 * 本番（xrift-frontend の usePlayerInputStore.requestTeleport）と同じく、1フレームに複数呼ばれたら最後の1件だけ効く
 */
export interface DevTeleportStore {
  /** 預かっている行き先を取り出す（取り出したら空になる）。PhysicsPlayer が毎フレーム呼ぶ */
  take: () => TeleportDestination | null
  /** useTeleport() に渡す TeleportContext の実装 */
  contextValue: TeleportContextValue
}

export function createDevTeleportStore(): DevTeleportStore {
  let pending: TeleportDestination | null = null

  const take = (): TeleportDestination | null => {
    const destination = pending
    pending = null
    return destination
  }

  const contextValue: TeleportContextValue = {
    teleport: (destination) => {
      pending = destination
    },
  }

  return { take, contextValue }
}
