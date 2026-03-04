import type { ThreeElements } from '@react-three/fiber'
import type { Group } from 'three'
import { useBillboardY } from './hooks'

export { useBillboardY } from './hooks'
export { getBillboardYRotation } from './utils'

type Props = ThreeElements['group'] & {
  children: React.ReactNode
}

/**
 * Y軸ビルボードコンポーネント
 * 子要素をカメラに対してY軸回転のみで追従させる
 */
export const BillboardY = ({ children, ...props }: Props) => {
  const ref = useBillboardY<Group>()

  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}
