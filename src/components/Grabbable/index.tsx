import { useEffect, useMemo, useRef, useSyncExternalStore, type FC } from 'react'
import type { Group } from 'three'
import { LAYERS } from '../../constants/layers'
import { useGrabbableContext } from '../../contexts/GrabbableContext'
import { GRABBABLE_USER_DATA_KEY } from './constants'
import type { Props } from './types'
import { decomposeWorldTransform, worldToLocalTransform } from './utils'

/**
 * 子オブジェクトを「掴める」と宣言するラッパー（<Interactable> と同じ明示オプトイン）
 *
 * - 配下メッシュを GRABBABLE レイヤーに載せ、ルート group に grabbable ID を付ける
 *   → GrabSystem のレイキャストが掴める対象と判別できる
 * - transform をルート group に適用する（子はローカル座標で書く）
 * - 掴んでいる間は実体を隠す（GrabSystem がゴーストを代わりに表示する）
 * - 離した（確定）ときは onMove で新しい姿勢が返るので、ワールド側で state に反映する
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
  children,
}) => {
  const { registerGrabbable, unregisterGrabbable, getGrabbedId, subscribeGrabbedId } =
    useGrabbableContext()

  // 掴み中は実体を隠す（ゴーストが代わりに表示される）
  const isGrabbed = useSyncExternalStore(
    subscribeGrabbedId,
    () => getGrabbedId() === id,
    () => false,
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
        const parent = groupRef.current?.parent
        if (!parent) {
          onMoveRef.current(world)
          return
        }
        parent.updateWorldMatrix(true, false)
        onMoveRef.current(worldToLocalTransform(world.position, world.rotation, parent.matrixWorld))
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
    })

    return () => {
      unregisterGrabbable(id)
      group.traverse((obj) => obj.layers.disable(LAYERS.GRABBABLE))
    }
  }, [id, enabled, registerGrabbable, unregisterGrabbable])

  const { position, rotation, scale = 1 } = transform

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={scale}
      userData={userData}
      visible={!isGrabbed}
    >
      {children}
    </group>
  )
}

export type { Props as GrabbableProps } from './types'
