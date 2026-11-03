import type { Object3D } from 'three'
import { LAYERS } from '../../../../constants/layers'

/**
 * 掴み中に表示する代わりの見た目を group 全体に整える。
 * GRABBABLE / INTERACTABLE レイヤーを除去して、代わり自身が
 * レイキャスト対象にならないようにする（子が遅延マウントされるため毎フレーム）。
 * 本番と同じく半透明にはしない（実体を手に持っているように見せる）
 */
export function applyGrabGhostAppearance(group: Object3D): void {
  group.traverse((obj) => {
    obj.layers.disable(LAYERS.GRABBABLE)
    obj.layers.disable(LAYERS.INTERACTABLE)
  })
}
