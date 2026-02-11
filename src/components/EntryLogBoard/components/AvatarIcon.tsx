import { useTexture } from '@react-three/drei'

interface Props {
  url: string
  size: number
  position: [number, number, number]
}

export const AvatarIcon: React.FC<Props> = ({ url, size, position }) => {
  const texture = useTexture(url)
  return (
    <mesh position={position}>
      <circleGeometry args={[size / 2, 32]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
