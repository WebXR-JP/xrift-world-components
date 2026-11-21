/** VR のコントローラーから PhysicsPlayer へ渡す入力（毎フレーム DevXRInput が書き込む） */
export interface DevVRInput {
  /** 左スティックの左右（右が正） */
  moveX: number
  /** 左スティックの前後（奥へ倒すと負） */
  moveY: number
  /** 右の A ボタン（ジャンプ） */
  jump: boolean
}
