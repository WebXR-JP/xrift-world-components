import type { SeatExitOffset } from './types'

/**
 * 降車位置の既定値: 座面の高さから前へ 0.6m。
 * 立ち上がると重力が復帰するので、床があれば自然に落ち着く
 */
export const DEFAULT_EXIT_OFFSET: Required<SeatExitOffset> = { forward: 0.6, right: 0, up: 0 }

export const DEFAULT_INTERACTION_TEXT = '座る'
