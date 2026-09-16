/**
 * AvatarIcon コンポーネント
 *
 * ログ行のアバターアイコンを表示する。
 * 画像URLがある場合はテクスチャ、ない場合・読み込みに失敗した場合は
 * プレースホルダー円を表示する。
 *
 * drei の useTexture は使わない。読み込み失敗時に throw されたエラーが
 * ErrorBoundary なしで Canvas 全体に伝播しうるため、ここでは
 * TextureLoader を手動で扱い、失敗時は握りつぶしてプレースホルダーに
 * フォールバックする（Suspense による中断も発生しない）。
 */
import { useEffect, useState } from 'react'
import { type Euler, type Vector3 } from '@react-three/fiber'
import { SRGBColorSpace, Texture, TextureLoader } from 'three'

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

/**
 * アバター画像を読み込む。成功するまで（失敗時は恒久的に）null を返す。
 * throw も suspend もしない。
 */
const useAvatarTexture = (avatarUrl: string): Texture | null => {
  const [texture, setTexture] = useState<Texture | null>(null)

  useEffect(() => {
    const loader = new TextureLoader()
    loader.setCrossOrigin('anonymous')

    let cancelled = false
    loader.load(
      avatarUrl,
      (loaded) => {
        if (cancelled) {
          loaded.dispose()
          return
        }
        loaded.colorSpace = SRGBColorSpace
        setTexture(loaded)
      },
      undefined,
      // 読み込み失敗は握りつぶす。呼び出し側がプレースホルダーを表示する
      () => {},
    )

    return () => {
      cancelled = true
      setTexture((prev) => {
        prev?.dispose()
        return null
      })
    }
  }, [avatarUrl])

  return texture
}

const AvatarImage = ({
  avatarUrl,
  size,
  position,
  rotation,
}: Props & { avatarUrl: string }) => {
  const texture = useAvatarTexture(avatarUrl)

  if (!texture) {
    return (
      <AvatarPlaceholder size={size} position={position} rotation={rotation} />
    )
  }

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
