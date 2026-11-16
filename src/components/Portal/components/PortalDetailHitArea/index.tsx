import { useEffect, useId, useState } from 'react'
import { CylinderGeometry, MeshBasicMaterial } from 'three'
import { Interactable } from '../../../Interactable'

/** 台座の上からサムネイルの上端までを覆う（サムネイルは浮き沈みしてプレイヤーの方を向くので円柱にする） */
const HIT_RADIUS = 0.75
const HIT_BOTTOM = 0.15
const HIT_TOP = 1.6
const HIT_HEIGHT = HIT_TOP - HIT_BOTTOM

const createGeometry = () => new CylinderGeometry(HIT_RADIUS, HIT_RADIUS, HIT_HEIGHT, 16)
// 見えないがレイは当たる（Raycaster は material.visible を見ない）
const createMaterial = () => new MeshBasicMaterial({ visible: false })

interface Props {
  interactionText: string
  onInteract: () => void
}

/**
 * ポータルにインタラクトするための見えない当たり判定。
 * サムネイルはテクスチャを読み込んでから出るので、Interactable がマウント時にレイヤーを付けても
 * 間に合わない。最初からある専用のメッシュで受ける
 */
export const PortalDetailHitArea = ({ interactionText, onInteract }: Props) => {
  // 同じ行き先のポータルが並んでも別の物として狙えるよう、ポータルごとに別の id にする
  // （行き先から作ると同じ id になり、隣へ視点を移しても狙っている先が切り替わらない）
  const id = `portal-${useId()}`
  const [geometry] = useState(createGeometry)
  const [material] = useState(createMaterial)

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return (
    <Interactable id={id} onInteract={onInteract} interactionText={interactionText}>
      <mesh geometry={geometry} material={material} position={[0, HIT_BOTTOM + HIT_HEIGHT / 2, 0]} />
    </Interactable>
  )
}
