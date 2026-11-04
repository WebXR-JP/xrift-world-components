import type { ReactNode } from 'react'
import type { GrabbableTransform, GrabResultTransform } from '../../contexts/GrabbableContext'

export interface Props {
  /** 掴める対象の一意なID */
  id: string
  /**
   * 対象の姿勢。Grabbable がルート group に適用するため、
   * 子はローカル座標（原点基準）で書く。
   * sync が true（既定）なら最初の位置で、誰かが動かした後はプラットフォームが共有する位置が優先される
   */
  transform: GrabbableTransform
  /**
   * 離した（確定）ときに新しい姿勢を受け取る（ローカル座標）。
   * sync が true（既定）なら位置はプラットフォームが共有するので、state に反映しなくても留まる。
   * sync={false} のときはワールド側で state に反映して transform prop を更新する
   */
  onMove?: (transform: GrabResultTransform) => void
  /**
   * 掴んでいる様子と離した位置をインスタンスの全員に共有するか（既定 true）。
   * 自分の画面だけで動かしたい物は false にする
   */
  sync?: boolean
  /**
   * 掴んでいる間に手元へ表示する代わり（物理なし）をローカル座標で返す
   * 省略時は children をそのまま流用する
   * 子に物理（RigidBody 等）を含む場合は物理なし版を必ず指定すること
   */
  renderGhost?: () => ReactNode
  /** 掴めるかどうか（false で一時的に掴めなくする） */
  enabled?: boolean
  /** 子要素（3Dオブジェクト・ローカル座標で書く） */
  children: ReactNode
}
