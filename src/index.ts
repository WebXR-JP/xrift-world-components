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

export {
  UsersContext,
  UsersProvider,
  useUsers,
  type User,
  type UsersContextValue,
} from './contexts/UsersContext'

export {
  TextInputContext,
  TextInputProvider,
  useTextInputContext,
  createDefaultTextInputImplementation,
  type TextInputContextValue,
  type TextInputRequest,
} from './contexts/TextInputContext'

export {
  TeleportContext,
  TeleportProvider,
  useTeleportContext,
  createDefaultTeleportImplementation,
  type TeleportContextValue,
  type TeleportDestination,
} from './contexts/TeleportContext'

export {
  WorldEventContext,
  WorldEventProvider,
  useWorldEventContext,
  createDefaultWorldEventImplementation,
  type WorldEventContextValue,
} from './contexts/WorldEventContext'

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

export { VideoPlayer, type VideoPlayerProps } from './components/VideoPlayer'

export { LiveVideoPlayer } from './components/LiveVideoPlayer'

export {
  ScreenShareDisplay,
  type ScreenShareDisplayProps,
} from './components/ScreenShareDisplay'

export {
  SpawnPoint,
  type SpawnPointProps,
} from './components/SpawnPoint'

export {
  TextInput,
  type TextInputProps,
} from './components/TextInput'

export {
  TagBoard,
  type TagBoardProps,
  type Tag,
} from './components/TagBoard'

export {
  Video180Sphere,
  type Video180SphereProps,
} from './components/Video180Sphere'

export {
  DevEnvironment,
  type DevEnvironmentProps,
} from './components/DevEnvironment'

export {
  EntryLogBoard,
  type EntryLogBoardProps,
} from './components/EntryLogBoard'

export { type PhysicsConfig } from './components/DevEnvironment/types'

// Hooks
export { useInstanceState } from './hooks/useInstanceState'
export { useSpawnPoint } from './hooks/useSpawnPoint'
export { useTeleport } from './hooks/useTeleport'
export { useWebAudioVolume } from './hooks/useWebAudioVolume'
export { useWorldEvent } from './hooks/useWorldEvent'

// Constants
export { LAYERS, type LayerName, type LayerNumber } from './constants/layers'

// Types
export {
  type PlayerMovement,
  type Position3D,
  type Rotation3D,
  type VRTrackingData,
  type VRMovementDirection,
} from './types/movement'
