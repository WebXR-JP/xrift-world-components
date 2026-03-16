import { memo } from 'react'
import { FrontSide } from 'three'

interface PlaceholderScreenProps {
  width: number
  screenHeight: number
  color: string
}

/** プレースホルダー画面（読み込み中/エラー時/URL未設定時） */
export const PlaceholderScreen = memo(
  ({ width, screenHeight, color }: PlaceholderScreenProps) => (
    <mesh>
      <planeGeometry args={[width, screenHeight]} />
      <meshBasicMaterial color={color} side={FrontSide} />
    </mesh>
  )
)

PlaceholderScreen.displayName = 'PlaceholderScreen'
