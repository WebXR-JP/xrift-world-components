import type { ThreeElements } from '@react-three/fiber'
import type { ReactNode } from 'react'
import type { Group } from 'three'
import type { SeatControlInput } from '../../contexts/SeatContext'

/**
 * `<Vehicle>` は group として置く。初期位置・初期の向きを props で書ける。
 * 走り出したあとの姿勢は `<Vehicle>` が持つので、props で動かそうとしないこと
 * （**運転者のクライアントでは `onDrive`、それ以外では同期されてきた姿勢**が勝つ）。
 * Object3D の数値 id と衝突するため id は乗り物 ID（文字列）に差し替える
 */
export type Props = Omit<ThreeElements['group'], 'id' | 'children' | 'ref'> & {
  /** 乗り物の一意な ID */
  id: string
  /**
   * 操縦入力を受けて乗り物を動かす。**運転席に自分が座っている間だけ**毎フレーム呼ばれる。
   *
   * `vehicle` は three.js の Group そのもの。書き換えるとそのまま乗り物が動く。
   * - `vehicle.rotateY(rad)` で旋回
   * - `vehicle.translateZ(-distance)` で**車体の前方**へ前進（傾いていれば坂に沿う）
   * - `vehicle.quaternion` を直接いじれば坂・バンク・宙返りも表現できる
   *
   * ここで動かした結果が同期され、他の人のクライアントでは `onDrive` は呼ばれずに
   * その姿勢が当たる。乗り物の状態は**運転者のローカルに持つ**のが正しく、
   * `useInstanceState` で別途同期してはいけない（二重管理になる）
   */
  onDrive?: (input: SeatControlInput, delta: number, vehicle: Group) => void
  /** 子要素（車体の見た目と `<Seat>`。乗り物のローカル座標で書く） */
  children: ReactNode
}
