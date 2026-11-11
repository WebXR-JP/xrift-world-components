import type {
  GrabbableContextValue,
  GrabbableEntry,
  GrabResultTransform,
} from '../../../../contexts/GrabbableContext'
import type { Position3D, Rotation3D } from '../../../../types/movement'
import { clampHoldDistance, distanceBetween } from './utils'

export type DevGrabPhase = 'idle' | 'holding'

export interface DevGrabState {
  phase: DevGrabPhase
  /** クロスヘアが狙っている grabbable ID */
  hoveredId: string | null
  /** 掴んでいる grabbable ID */
  grabbedId: string | null
  /** カメラ→対象の保持距離[m] */
  holdDistance: number
  /** ゴーストの現在位置（確定時に使う。毎フレーム更新） */
  heldPosition: Position3D
  /** 掴んだ時点の回転（掴み中は維持） */
  heldRotation: Rotation3D
  /** 掴んだ時点のスケール */
  heldScale: number
  /** 「使う」を押している最中か（離す・置くときに onUseEnd を必ず呼ぶため） */
  isUsing: boolean
}

/**
 * DevEnvironment 用のローカル掴みストア（React 非依存）
 * <Grabbable> 向けの GrabbableContextValue 実装（contextValue）と、
 * DevEnvironment 内の GrabSystem が使う状態・アクションを提供する
 */
export interface DevGrabStore {
  getState: () => DevGrabState
  /** 状態変化を購読する（useSyncExternalStore 互換） */
  subscribe: (listener: () => void) => () => void
  getEntry: (id: string) => GrabbableEntry | undefined
  setHovered: (id: string | null) => void
  /** 狙っている対象を掴む（保持距離はカメラ→対象の距離から算出） */
  grab: (id: string, cameraPosition: Position3D) => void
  /** ゴーストが毎フレーム書き込む（通知なし・getState で読む高頻度パターン） */
  updateHeldPosition: (position: Position3D) => void
  /** 確定して離す（sync なら離した位置を持ち、onMove で新しい姿勢をワールド側へ通知） */
  release: () => void
  /** キャンセルして離す（onMove は呼ばない＝元位置のまま） */
  cancel: () => void
  /** 持っている物を「使う」を押す（onUseStart。持っていなければ何もしない） */
  useStart: () => void
  /** 「使う」を離す（onUseEnd。押していなければ何もしない） */
  useEnd: () => void
  /** <Grabbable> / GrabbableProvider に渡す実装 */
  contextValue: GrabbableContextValue
}

const IDLE_PARTIAL = {
  phase: 'idle',
  grabbedId: null,
  hoveredId: null,
  isUsing: false,
} as const

export function createDevGrabStore(): DevGrabStore {
  const registry = new Map<string, GrabbableEntry>()
  const listeners = new Set<() => void>()
  // 本番ではプラットフォームがインスタンスの全員に共有する「離した位置」。開発環境は1人なので手元に持つだけ
  const syncedTransforms = new Map<string, GrabResultTransform>()
  const syncedListeners = new Set<() => void>()

  let state: DevGrabState = {
    phase: 'idle',
    hoveredId: null,
    grabbedId: null,
    holdDistance: 0,
    heldPosition: { x: 0, y: 0, z: 0 },
    heldRotation: { x: 0, y: 0, z: 0 },
    heldScale: 1,
    isUsing: false,
  }

  /** 「使う」のイベント（開発環境は右手で持つ。姿勢はワールド座標） */
  const useEvent = () => ({
    hand: 'right' as const,
    transform: { position: state.heldPosition, rotation: state.heldRotation },
  })

  /** 押している最中なら onUseEnd を呼んで押していない状態に戻す（離す・置くときに必ず通す） */
  const endUse = () => {
    if (!state.isUsing || !state.grabbedId) return
    registry.get(state.grabbedId)?.onUseEnd?.(useEvent())
    state = { ...state, isUsing: false }
  }

  const setState = (partial: Partial<DevGrabState>) => {
    state = { ...state, ...partial }
    for (const listener of listeners) listener()
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getEntry: (id) => registry.get(id),
    setHovered: (id) => {
      if (state.hoveredId === id) return
      setState({ hoveredId: id })
    },
    grab: (id, cameraPosition) => {
      if (state.phase !== 'idle') return
      const entry = registry.get(id)
      if (!entry) return

      const transform = entry.getTransform()
      setState({
        phase: 'holding',
        grabbedId: id,
        hoveredId: null,
        holdDistance: clampHoldDistance(distanceBetween(cameraPosition, transform.position)),
        heldPosition: transform.position,
        heldRotation: transform.rotation,
        heldScale: transform.scale,
      })
    },
    updateHeldPosition: (position) => {
      state = { ...state, heldPosition: position }
    },
    release: () => {
      if (state.phase !== 'holding' || !state.grabbedId) return
      endUse()
      const entry = registry.get(state.grabbedId)
      const released = { position: state.heldPosition, rotation: state.heldRotation }
      if (entry && entry.sync !== false) {
        syncedTransforms.set(state.grabbedId, released)
        for (const listener of syncedListeners) listener()
      }
      entry?.onMove(released)
      setState(IDLE_PARTIAL)
    },
    cancel: () => {
      if (state.phase !== 'holding') return
      endUse()
      setState(IDLE_PARTIAL)
    },
    useStart: () => {
      if (state.phase !== 'holding' || !state.grabbedId || state.isUsing) return
      const entry = registry.get(state.grabbedId)
      state = { ...state, isUsing: true }
      entry?.onUseStart?.(useEvent())
    },
    useEnd: () => {
      endUse()
    },
    contextValue: {
      registerGrabbable: (id, entry) => {
        registry.set(id, entry)
      },
      unregisterGrabbable: (id) => {
        registry.delete(id)
        // 掴み中・ホバー中の対象がアンマウントされたら状態を戻す
        if (state.grabbedId === id) setState(IDLE_PARTIAL)
        else if (state.hoveredId === id) setState({ hoveredId: null })
      },
      getGrabbedId: () => state.grabbedId,
      subscribeGrabbedId: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      isHeld: (id) => state.grabbedId === id,
      getSyncedTransform: (id) => syncedTransforms.get(id) ?? null,
      subscribeSyncedTransform: (listener) => {
        syncedListeners.add(listener)
        return () => syncedListeners.delete(listener)
      },
    },
  }
}
