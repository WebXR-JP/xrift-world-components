import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type FC } from 'react'
import type { Group } from 'three'
import { LAYERS } from '../../constants/layers'
import { type GrabResultTransform, useGrabbableContext } from '../../contexts/GrabbableContext'
import { GRABBABLE_USER_DATA_KEY } from './constants'
import type { Props } from './types'
import {
  decomposeWorldTransform,
  nextPoseSource,
  type PoseSource,
  poseKey,
  worldToLocalTransform,
} from './utils'

/**
 * 子オブジェクトを「掴める」と宣言するラッパー（<Interactable> と同じ明示オプトイン）
 *
 * - 配下メッシュを GRABBABLE レイヤーに載せ、ルート group に grabbable ID を付ける
 *   → GrabSystem のレイキャストが掴める対象と判別できる
 * - transform をルート group に適用する（子はローカル座標で書く）
 * - 誰かが掴んでいる間は実体を隠す（GrabSystem が掴んでいる人の手元に代わりを表示する）
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
  renderGhost,
  enabled = true,
  sync = true,
  children,
}) => {
  const {
    registerGrabbable,
    unregisterGrabbable,
    getGrabbedId,
    subscribeGrabbedId,
    isHeld,
    getSyncedTransform,
    subscribeSyncedTransform,
  } = useGrabbableContext()

  // 誰かが掴んでいる間は実体を隠す（GrabSystem が代わりを表示する）。
  // isHeld が無い古いプラットフォームでは自分が掴んでいるかだけで判定する
  const isGrabbed = useSyncExternalStore(
    subscribeGrabbedId,
    () => (isHeld ? isHeld(id) : getGrabbedId() === id),
    () => false,
  )

  // プラットフォームが共有している「離した位置」（ワールド座標）
  const syncedTransform = useSyncExternalStore(
    subscribeSyncedTransform ?? noopSubscribe,
    () => (sync ? (getSyncedTransform?.(id) ?? null) : null),
    () => null,
  )

  // 毎レンダーで参照が変わっても登録し直さないよう、最新値は ref で保持
  const transformRef = useRef(transform)
  const onMoveRef = useRef(onMove)
  const renderGhostRef = useRef(renderGhost)
  const childrenRef = useRef(children)
  transformRef.current = transform
  onMoveRef.current = onMove
  renderGhostRef.current = renderGhost
  childrenRef.current = children

  const groupRef = useRef<Group>(null)
  const userData = useMemo(() => ({ [GRABBABLE_USER_DATA_KEY]: id }), [id])

  useEffect(() => {
    if (!enabled) return
    const group = groupRef.current
    if (!group) return

    // 配下メッシュを GRABBABLE レイヤーに載せてレイキャスト対象にする
    group.traverse((obj) => obj.layers.enable(LAYERS.GRABBABLE))

    registerGrabbable(id, {
      // ゴースト未指定時は children をそのまま流用する
      renderGhost: () => renderGhostRef.current?.() ?? childrenRef.current,
      // GrabSystem はワールド座標で確定位置を返すため、ローカル（transform prop と同じ空間）へ
      // 変換してからユーザーの onMove に渡す。変形された親の下に置いてもズレない
      onMove: (world) => {
        const handleMove = onMoveRef.current
        if (!handleMove) return
        const parent = groupRef.current?.parent
        if (!parent) {
          handleMove(world)
          return
        }
        parent.updateWorldMatrix(true, false)
        handleMove(worldToLocalTransform(world.position, world.rotation, parent.matrixWorld))
      },
      // GrabSystem 向けにはワールド姿勢を返す（掴み距離・ゴーストの初期姿勢に使われる）。
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
  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return
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
      source === 'synced' && syncedTransform ? toParentLocal(group, syncedTransform) : transform
    group.position.set(local.position.x, local.position.y, local.position.z)
    group.rotation.set(local.rotation.x, local.rotation.y, local.rotation.z)
  }, [syncedTransform, transform])

  return (
    <group
      ref={groupRef}
      scale={transform.scale ?? 1}
      userData={userData}
      visible={!isGrabbed}
    >
      {children}
    </group>
  )
}

const noopSubscribe = () => () => {}

/** ワールド座標の姿勢を、group の親から見たローカル姿勢に直す（親が無ければそのまま） */
function toParentLocal(group: Group, world: GrabResultTransform): GrabResultTransform {
  const parent = group.parent
  if (!parent) return world
  parent.updateWorldMatrix(true, false)
  return worldToLocalTransform(world.position, world.rotation, parent.matrixWorld)
}

export type { Props as GrabbableProps } from './types'
