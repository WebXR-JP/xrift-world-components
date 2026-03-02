import { PORTAL_DEFAULTS } from './constants'
import type { Props } from './types'

/**
 * Propsにデフォルト値を適用して返す
 */
export const usePortalProps = (props: Props) => {
  const {
    instanceId,
    position = PORTAL_DEFAULTS.position,
    rotation = PORTAL_DEFAULTS.rotation,
  } = props

  return {
    instanceId,
    position,
    rotation,
  }
}
