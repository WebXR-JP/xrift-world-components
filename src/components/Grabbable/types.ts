import type { ReactNode } from 'react'
import type {
  GrabbableTransform,
  GrabHoldEvent,
  GrabResultTransform,
  GrabUseEvent,
} from '../../contexts/GrabbableContext'

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
   * 誰かが持ち上げたとき（自分・ほかの人のどちらでも、全員の画面で呼ばれる）。
   * 持っている間は本体が手元へ動くので、物理（RigidBody 等）を含む物はここで物理を切る
   */
  onGrab?: (event: GrabHoldEvent) => void
  /**
   * 手から離れたとき（置いた・やめた・持っていた人が退室した。全員の画面で呼ばれる）。
   * onGrab で切った物理はここで戻す。置いたときは onMove の後に呼ばれる
   */
  onRelease?: (event: GrabHoldEvent) => void
  /**
   * @deprecated 持っている間は本体が手元へ動くようになったので使われない。
   * 物理を含む物は onGrab / onRelease で物理を切り替える
   */
  renderGhost?: () => ReactNode
  /**
   * 持っている間に「使う」を押したとき（デスクトップはクリック、スマホは「使う」ボタン、VR は持っている手のトリガー）。
   * 銃を撃つ・殴る・ためる などをここで始める。姿勢は transform・onMove と同じローカル座標。
   * 呼ばれるのは持っている本人の画面だけなので、ほかの人に見せる動作は useInstanceEvent などで送る
   */
  onUseStart?: (event: GrabUseEvent) => void
  /**
   * 「使う」を離したとき（連射を止める・ためを放つ など）。
   * 押している途中で置いたとき・ほかの操作で使えなくなったときにも呼ばれる
   */
  onUseEnd?: (event: GrabUseEvent) => void
  /** 掴めるかどうか（false で一時的に掴めなくする） */
  enabled?: boolean
  /** 子要素（3Dオブジェクト・ローカル座標で書く） */
  children: ReactNode
}
