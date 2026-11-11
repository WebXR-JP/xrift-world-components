import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type FC } from 'react'
import type { Group } from 'three'
import { LAYERS } from '../../constants/layers'
import {
  type GrabHoldEvent,
  type GrabResultTransform,
  useGrabbableContext,
} from '../../contexts/GrabbableContext'
import { GRABBABLE_USER_DATA_KEY } from './constants'
import type { Props } from './types'
import {
  applyWorldPose,
  decomposeWorldTransform,
  type Holder,
  holdTransitions,
  nextPoseSource,
  type PoseSource,
  poseKey,
  restoreHeldLayers,
  shouldStripLayers,
  stripHeldLayers,
  worldToLocalTransform,
} from './utils'

/**
 * 子オブジェクトを「掴める」と宣言するラッパー（<Interactable> と同じ明示オプトイン）
 *
 * - 配下メッシュを GRABBABLE レイヤーに載せ、ルート group に grabbable ID を付ける
 *   → GrabSystem のレイキャストが掴める対象と判別できる
 * - transform をルート group に適用する（子はローカル座標で書く）
 * - 誰かが掴んでいる間は、GrabSystem が渡す手元の姿勢へ本体を動かす（コピーは描かない）
 * - 持ち上げた・手から離れたときに onGrab / onRelease を呼ぶ（全員の画面で）
 * - sync（既定 true）なら、離した位置はプラットフォームが共有し、その位置で描く
 * - 離した（確定）ときは onMove で新しい姿勢が返る。sync={false} ならワールド側で state に反映する
 *
 * 掴む土台（レイキャスト・追従・確定）はプラットフォーム側の GrabSystem が担う。
 * DevEnvironment 内では同梱のローカル GrabSystem で動作する。
 */
export const Grabbable: FC<Props> = ({
  id,
  transform,
  onMove,
  onGrab,
  onRelease,
  onUseStart,
  onUseEnd,
  enabled = true,
  sync = true,
  children,
}) => {
  const {
    registerGrabbable,
    unregisterGrabbable,
    subscribeGrabbedId,
    isHeld,
    isHeldByMe,
    getSyncedTransform,
    subscribeSyncedTransform,
  } = useGrabbableContext()

  // 持っているのは誰か（自分が持っているかは手を問わず isHeldByMe で見る）
  const holder = useSyncExternalStore<Holder>(
    subscribeGrabbedId,
    () => {
      if (isHeldByMe(id)) return 'mine'
      return isHeld?.(id) ? 'other' : 'none'
    },
    () => 'none',
  )
  const isGrabbed = holder !== 'none'

  // プラットフォームが共有している「離した位置」（ワールド座標）
  const syncedTransform = useSyncExternalStore(
    subscribeSyncedTransform ?? noopSubscribe,
    () => (sync ? (getSyncedTransform?.(id) ?? null) : null),
    () => null,
  )

  // 毎レンダーで参照が変わっても登録し直さないよう、最新値は ref で保持
  const transformRef = useRef(transform)
  const onMoveRef = useRef(onMove)
  const onGrabRef = useRef(onGrab)
  const onReleaseRef = useRef(onRelease)
  const onUseStartRef = useRef(onUseStart)
  const onUseEndRef = useRef(onUseEnd)
  transformRef.current = transform
  onMoveRef.current = onMove
  onGrabRef.current = onGrab
  onReleaseRef.current = onRelease
  onUseStartRef.current = onUseStart
  onUseEndRef.current = onUseEnd

  const groupRef = useRef<Group>(null)
  const userData = useMemo(() => ({ [GRABBABLE_USER_DATA_KEY]: id }), [id])
  /** 持ち始めから何フレーム目か（レイヤーを外し直す間隔に使う） */
  const heldFrameRef = useRef(0)
  /** 持っている間にレイヤーを外したか（外していなければ戻さない） */
  const isLayersStrippedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const group = groupRef.current
    if (!group) return

    // 配下メッシュを GRABBABLE レイヤーに載せてレイキャスト対象にする
    group.traverse((obj) => obj.layers.enable(LAYERS.GRABBABLE))

    registerGrabbable(id, {
      // 持っている間は毎フレーム呼ばれる。本体を手元へ動かし、本体をまた掴んだり押したりしないよう
      // GRABBABLE・INTERACTABLE を外す（遅れてマウントされる子のために、ときどき外し直す）
      setHeldPose: (position, quaternion, scale) => {
        const target = groupRef.current
        if (!target) return
        applyWorldPose(target, position, quaternion, scale)
        if (shouldStripLayers(heldFrameRef.current)) {
          stripHeldLayers(target)
          isLayersStrippedRef.current = true
        }
        heldFrameRef.current++
      },
      // GrabSystem はワールド座標で確定位置を返すため、ローカル（transform prop と同じ空間）へ
      // 変換してからユーザーの onMove に渡す。変形された親の下に置いてもズレない
      onMove: (world) => {
        onMoveRef.current?.(toLocalOfParent(groupRef.current, world))
      },
      // 「使う」もプラットフォームからはワールド座標で届くので、onMove と同じローカルに直して渡す
      onUseStart: (event) => {
        onUseStartRef.current?.({
          hand: event.hand,
          transform: toLocalOfParent(groupRef.current, event.transform),
        })
      },
      onUseEnd: (event) => {
        onUseEndRef.current?.({
          hand: event.hand,
          transform: toLocalOfParent(groupRef.current, event.transform),
        })
      },
      canUse: () => onUseStartRef.current !== undefined || onUseEndRef.current !== undefined,
      // GrabSystem 向けにはワールド姿勢を返す（掴み距離・持ち始めの姿勢に使われる）。
      // group 未マウント時のみ transform prop（ローカル）にフォールバック
      getTransform: () => {
        const group = groupRef.current
        if (!group) {
          const t = transformRef.current
          return { position: t.position, rotation: t.rotation, scale: t.scale ?? 1 }
        }
        group.updateWorldMatrix(true, false)
        return decomposeWorldTransform(group.matrixWorld)
      },
      sync,
    })

    return () => {
      unregisterGrabbable(id)
      group.traverse((obj) => obj.layers.disable(LAYERS.GRABBABLE))
    }
  }, [id, enabled, sync, registerGrabbable, unregisterGrabbable])

  // 姿勢はここで当てる。共有している位置と transform prop のうち、あとから変わったほうを使う
  // （ワールドが初期位置に戻したときなどに transform が効くように）。
  // 共有している位置はワールド座標なので、親から見たローカルに直す
  // （親の matrixWorld が要るため、描画後のこのタイミングで当てる）
  const appliedRef = useRef<{
    source: PoseSource
    synced: GrabResultTransform | null
    transformKey: string | null
  }>({ source: 'transform', synced: null, transformKey: null })
  // 持っている間は GrabSystem が手元の姿勢を当てるので触らない。
  // 手から離れたら当て直す（置いたら共有位置・onMove の結果へ、やめたら元の場所へ戻る）
  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group || isGrabbed) return
    const applied = appliedRef.current
    const transformKey = poseKey(transform)
    const source = nextPoseSource(
      applied.source,
      syncedTransform !== null,
      syncedTransform !== applied.synced,
      transformKey !== applied.transformKey,
    )
    appliedRef.current = { source, synced: syncedTransform, transformKey }

    const local =
      source === 'synced' && syncedTransform ? toLocalOfParent(group, syncedTransform) : transform
    group.position.set(local.position.x, local.position.y, local.position.z)
    group.rotation.set(local.rotation.x, local.rotation.y, local.rotation.z)
    group.scale.setScalar(transform.scale ?? 1)
  }, [syncedTransform, transform, isGrabbed])

  // 手から離れたら、持っている間に外したレイヤーを戻す
  useEffect(() => {
    if (isGrabbed) return
    heldFrameRef.current = 0
    const group = groupRef.current
    if (!group || !isLayersStrippedRef.current) return
    restoreHeldLayers(group, enabled)
    isLayersStrippedRef.current = false
  }, [isGrabbed, enabled])

  // 持ち主が変わったら onGrab / onRelease を呼ぶ
  const previousHolderRef = useRef<Holder>('none')
  useEffect(() => {
    const events = holdTransitions(previousHolderRef.current, holder)
    previousHolderRef.current = holder
    for (const { type, isMine } of events) {
      callHoldHandler(type === 'grab' ? onGrabRef.current : onReleaseRef.current, { isMine })
    }
  }, [holder])

  // 持たれたまま外される（作り直される）ときも onRelease を呼ぶ。
  // onGrab で切り替えたワールド側の状態（外した当たり判定など）が戻らなくならないように
  useEffect(
    () => () => {
      const previous = previousHolderRef.current
      if (previous === 'none') return
      previousHolderRef.current = 'none'
      callHoldHandler(onReleaseRef.current, { isMine: previous === 'mine' })
    },
    [],
  )

  return (
    <group ref={groupRef} userData={userData}>
      {children}
    </group>
  )
}

const noopSubscribe = () => () => {}

/**
 * ワールド作者の onGrab / onRelease を呼ぶ。作者のコードが投げてもエラー境界まで届かせず
 * （インスタンスから追い出さないよう）ここで受け止めてログに残す
 */
function callHoldHandler(
  handler: ((event: GrabHoldEvent) => void) | undefined,
  event: GrabHoldEvent,
): void {
  if (!handler) return
  try {
    handler(event)
  } catch (error) {
    console.error('[Grabbable] onGrab / onRelease で例外が発生しました', error)
  }
}

/**
 * GrabSystem からワールド座標で届く姿勢を、transform prop と同じ空間（group の親のローカル）に直す。
 * 変形された親の下に置いてもズレない。group が未マウント・親が無ければそのまま
 */
function toLocalOfParent(group: Group | null, world: GrabResultTransform): GrabResultTransform {
  const parent = group?.parent
  if (!parent) return world
  parent.updateWorldMatrix(true, false)
  return worldToLocalTransform(world.position, world.rotation, parent.matrixWorld)
}

export type { Props as GrabbableProps } from './types'
