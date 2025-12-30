// Contexts
export {
  XRiftContext,
  XRiftProvider,
  useXRift,
  type XRiftContextValue,
} from './contexts/XRiftContext'

export {
  InstanceStateContext,
  useInstanceStateContext,
  type InstanceStateContextValue,
} from './contexts/InstanceStateContext'

export {
  ScreenShareContext,
  ScreenShareProvider,
  useScreenShareContext,
  type ScreenShareContextValue,
} from './contexts/ScreenShareContext'

export {
  SpawnPointContext,
  SpawnPointProvider,
  useSpawnPointContext,
  type SpawnPoint as SpawnPointData,
  type SpawnPointContextValue,
} from './contexts/SpawnPointContext'

// Components
export {
  Interactable,
  type InteractableProps,
} from './components/Interactable'

export { Mirror, type MirrorProps } from './components/Mirror'

export { Skybox, type SkyboxProps } from './components/Skybox'

export {
  VideoScreen,
  type VideoScreenProps,
  type VideoState,
} from './components/VideoScreen'

export {
  ScreenShareDisplay,
  type ScreenShareDisplayProps,
} from './components/ScreenShareDisplay'

export {
  SpawnPoint,
  type SpawnPointProps,
} from './components/SpawnPoint'

// Hooks
export { useInstanceState } from './hooks/useInstanceState'
export { useSpawnPoint } from './hooks/useSpawnPoint'
