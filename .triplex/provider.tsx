import { Skybox } from '../src/components/Skybox'
import { XRiftProvider } from '../src/contexts/XRiftContext'

export function CanvasProvider({
  children,
}: {
  children?: React.ReactNode
}) {
  return (
    <XRiftProvider baseUrl="">
      <Skybox />
      {children}
    </XRiftProvider>
  )
}
