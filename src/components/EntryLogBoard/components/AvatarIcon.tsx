/**
 * AvatarIcon コンポーネント
 *
 * ログ行のアバターアイコンを表示する。
 * 画像URLがある場合はテクスチャ、ない場合はプレースホルダー円を表示。
 */
import { useTexture } from '@react-three/drei'
import { type Euler, type Vector3 } from '@react-three/fiber'

interface Props {
  avatarUrl: string | null
  size: number
  position?: Vector3
  rotation?: Euler
}

const AvatarPlaceholder = ({
  size,
  position,
  rotation,
}: Omit<Props, 'avatarUrl'>) => (
  <mesh position={position} rotation={rotation}>
    <circleGeometry args={[size / 2, 32]} />
    <meshBasicMaterial color={0x666666} />
  </mesh>
)

const AvatarImage = ({
  avatarUrl,
  size,
  position,
  rotation,
}: Props & { avatarUrl: string }) => {
  const texture = useTexture(avatarUrl)

  return (
    <mesh position={position} rotation={rotation}>
      <circleGeometry args={[size / 2, 32]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

export const AvatarIcon = ({ avatarUrl, size, position, rotation }: Props) => {
  if (!avatarUrl) {
    return (
      <AvatarPlaceholder size={size} position={position} rotation={rotation} />
    )
  }

  return (
    <AvatarImage
      avatarUrl={avatarUrl}
      size={size}
      position={position}
      rotation={rotation}
    />
  )
}
