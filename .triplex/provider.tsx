import { Skybox } from '../src/components/Skybox'

export function CanvasProvider({
  children,
}: {
  children?: React.ReactNode
}) {
  return (
    <>
      <Skybox />
      {children}
    </>
  )
}
