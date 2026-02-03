import { memo } from 'react'

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
      <meshBasicMaterial color={color} />
    </mesh>
  )
)

PlaceholderScreen.displayName = 'PlaceholderScreen'
