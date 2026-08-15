import { createContext, type ReactNode, useContext } from 'react'

/**
 * 用途ごとに要求する時刻精度のプリセット
 *
 * - `media`: 動画・音楽の再生位置合わせ。数百 ms のズレは体感しにくい
 * - `motion`: 決定論的アニメーション（動く床・観覧車）、アバター補間
 *
 * 早押しやゴール判定のような**公平性が要る用途のプリセットは用意していない**。
 * 経路の往復が非対称なぶんの誤差はクライアント側から検出できず、しかも
 * セッション中ほぼ一定なので繰り返しても平均化されない（＝同じ人が毎回勝ち、
 * 同じ人が毎回負ける）。判定はサーバー側で裁定すること。
 */
export type ServerClockAccuracy = 'media' | 'motion'

/** プリセットが要求する `uncertainty` の上限（ms） */
export const SERVER_CLOCK_ACCURACY_THRESHOLD: Record<ServerClockAccuracy, number> = {
  media: 300,
  motion: 100,
}

/**
 * 共有時計の Context 値
 *
 * **注入側（プラットフォーム）への契約:**
 *
 * `uncertainty` / `synced` / `timeJumpCount` はただの値なので、この Context の
 * reactivity は「注入側が**新しいオブジェクトに差し替えること**」に全面的に依存する。
 * 同じオブジェクトを持ち続けると（getter 付きの可変オブジェクトを1個渡す等）、
 * 一度レンダーした値のまま永久に更新されず、**下のフックの使用例が黙って壊れる**
 * （飛びを観測できないので基準を取り直せない）。
 *
 * 差し替えるタイミング:
 * 1. オフセットを採用したとき（≒45秒ごとの再同期）
 * 2. `synced` が変化したとき
 * 3. 時刻が飛んだとき
 *
 * この頻度なら `uncertainty` の鮮度は最大45秒遅れ = ドリフト換算で +2ms 程度。
 * しきい値（100 / 300ms）に対して無視できる。
 */
export interface ServerClockContextValue {
  /**
   * サーバ時刻の推定値（ms）
   *
   * 値ではなく関数。`useFrame` の中から再レンダーなしで呼べる。
   * 一度も同期していなければ `Date.now()` にフォールバックする。
   */
  now: () => number
  /**
   * 推定誤差の上界（ms）。一度も同期していなければ Infinity
   *
   * 経過時間による劣化を含む値。往路と復路が非対称だった場合の誤差上界であり、
   * 実際の再現性はこれよりずっと良いことが多い（実測で 2 桁違う）。
   * ただしその差はクライアント側からは検出できないため、これが唯一の保証値になる。
   */
  uncertainty: number
  /**
   * いま同期が有効か
   *
   * 切断中は false になるが `now()` は直前の推定を返し続ける（通信が切れただけで
   * 端末の時計は動いているため）。切断が続くと `uncertainty` が膨らんでいく。
   */
  synced: boolean
  /**
   * `now()` のタイムラインが飛んだ回数
   *
   * 通常の補正は徐々に寄せる（時刻は巻き戻らない）が、次の場合だけは飛ぶ。
   * 1. 端末のスリープ等で推定を捨てたとき
   * 2. フォールバックから推定へ戻ったとき（初回同期・採り直しの完了）
   * 3. 補正量が大きすぎて徐々に寄せられないとき
   *
   * **時刻から位置を計算しているワールドは、この値の変化を見て基準を取り直すこと。**
   * 取り直さないと、飛んだぶんだけオブジェクトがワープしたまま戻らない。
   *
   * 名前はプラットフォーム側の実装（`ServerClock.timeJumpCount`）と一致させてある。
   * あちらの `discontinuityCount` は「端末時計の不連続の**検出**回数」という別物なので、
   * 注入するときに取り違えないこと。
   */
  timeJumpCount: number
  /** 直近に飛んだ量（ms）。負なら時刻が戻った */
  lastTimeJumpMs: number
}

/**
 * デフォルト実装（プラットフォームが実装を注入しない場合に使用される）
 *
 * 端末のローカル時計をそのまま返す。他の端末とは 0.1〜数秒ずれている前提なので、
 * `synced` は false・`uncertainty` は Infinity で「信用できない」ことを明示する。
 */
export const createDefaultServerClockImplementation = (): ServerClockContextValue => ({
  now: () => Date.now(),
  uncertainty: Number.POSITIVE_INFINITY,
  synced: false,
  timeJumpCount: 0,
  lastTimeJumpMs: 0,
})

/**
 * 用途に対して時刻が十分な精度かを判定する
 *
 * false のときの振る舞いはワールドの判断。動画なら同期を諦める（再生継続を優先）、
 * 決定論的アニメーションなら合わせにいかずそのまま動かす、など。
 */
export const isServerClockAccurateEnough = (
  clock: Pick<ServerClockContextValue, 'synced' | 'uncertainty'>,
  accuracy: ServerClockAccuracy,
): boolean => clock.synced && clock.uncertainty <= SERVER_CLOCK_ACCURACY_THRESHOLD[accuracy]

/**
 * インスタンス共有時計（サーバ時刻）を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const ServerClockContext = createContext<ServerClockContextValue | null>(null)

interface Props {
  value: ServerClockContextValue
  children: ReactNode
}

/** 共有時計を提供する ContextProvider */
export const ServerClockProvider = ({ value, children }: Props) => {
  return <ServerClockContext.Provider value={value}>{children}</ServerClockContext.Provider>
}

/**
 * 共有時計の Context を取得する hook
 * @throws {Error} ServerClockProvider の外で呼び出された場合
 */
export const useServerClockContext = (): ServerClockContextValue => {
  const context = useContext(ServerClockContext)
  if (!context) {
    throw new Error('useServerClockContext must be used within ServerClockProvider')
  }
  return context
}
