import type { ThreeElements } from '@react-three/fiber'
import type { ReactNode } from 'react'
import type { SeatControlInput, SeatOccupant } from '../../contexts/SeatContext'

/**
 * 降車位置（座席ローカル・**ワールドのメートル**）。
 * forward/right は座席の yaw だけで回す（傾きは無視）。up はワールド上方向
 * （宙返り中の乗り物から降りるときに「座席の上」へ出すと地面に埋まるため）。
 * 親を拡大していても距離は拡大されない
 */
export interface SeatExitOffset {
  /** 前方（-Z 側）へ */
  forward?: number
  /** 右方向へ */
  right?: number
  /** ワールド上方向へ */
  up?: number
}

/**
 * <Seat> は group として置く。原点が座面（腰を置く点）、前方が -Z。
 * position / rotation は group と同じように書ける。
 *
 * **scale は受け付けない**。座面は点と向きだけで決まり、着席時の腰・目線の高さは
 * プレイヤーのアバターの実寸から決まるので、座席を拡大しても意味を持たない
 * （拡大すると exitOffset のメートル指定と見た目の大きさが食い違うだけになる）。
 * 見た目を大きくしたいときは children 側を拡大する。
 * Object3D の数値 id と衝突するため id は座席 ID（文字列）に差し替える
 */
export type Props = Omit<ThreeElements['group'], 'id' | 'children' | 'ref' | 'scale'> & {
  /** 座席の一意な ID */
  id: string
  /** 降車位置（省略時は座面の高さから前へ 0.6m） */
  exitOffset?: SeatExitOffset
  /** 狙ったときに表示する文言（既定 '座る'） */
  interactionText?: string
  /** 座れるかどうか（false で一時的に座れなくする。他人が座っている間は自動で false） */
  enabled?: boolean
  /**
   * 誰かがこの座席に座ったときに呼ばれる（自分・他人の両方）。
   * `occupant.isLocalUser` で自分かどうかを判別する
   */
  onEnter?: (occupant: SeatOccupant) => void
  /** 誰かがこの座席から降りたときに呼ばれる（自分・他人の両方） */
  onLeave?: (occupant: SeatOccupant) => void
  /**
   * この席を**運転席**にする（`<Vehicle>` の中でのみ意味を持つ）。
   * 自分がここに座っている間、操縦入力が `<Vehicle>` の `onDrive` へ流れ、
   * 乗り物の姿勢が同期される
   */
  driver?: boolean
  /**
   * 操縦入力を受け取る（この座席を運転席にする）。
   * **自分がこの座席に座っている間だけ**毎フレーム呼ばれる。
   * 乗り物は運転者のクライアントが動かし、他のクライアントはその結果を再現するため、
   * 他人が座っているときには呼ばれない。
   *
   * 乗り物を動かすなら `<Vehicle>` の中で `driver` を使うこと。こちらは砲台や
   * 回転椅子など、**乗り物ではない操作**を座席から受けたいときに使う
   */
  onControlInput?: (input: SeatControlInput, delta: number) => void
  /** 子要素（見た目・クリック対象。座面原点からのローカル座標で書く） */
  children: ReactNode
}
