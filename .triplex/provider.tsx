import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Skybox } from '../src/components/Skybox'
import { XRiftProvider } from '../src/contexts/XRiftContext'

/** uikit が必要とする localClippingEnabled を有効化 */
function EnableLocalClipping() {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])
  return null
}

export function CanvasProvider({
  children,
}: {
  children?: React.ReactNode
}) {
  return (
    <XRiftProvider baseUrl="">
      <EnableLocalClipping />
      <Skybox />
      {children}
    </XRiftProvider>
  )
}
