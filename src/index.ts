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
  FileInputContext,
  FileInputProvider,
  useFileInputContext,
  createDefaultFileInputImplementation,
  type FileInputContextValue,
  type FileInputRequest,
  type FileInputError,
  type FileInputErrorType,
} from './contexts/FileInputContext'

export {
  ConfirmContext,
  ConfirmProvider,
  useConfirmContext,
  createDefaultConfirmImplementation,
  type ConfirmContextValue,
  type ConfirmOptions,
} from './contexts/ConfirmContext'

export {
  InstanceContext,
  InstanceProvider,
  useInstanceContext,
  createDefaultInstanceImplementation,
  type InstanceContextValue,
  type InstanceInfo,
} from './contexts/InstanceContext'

export {
  WorldContext,
  WorldProvider,
  useWorldContext,
  createDefaultWorldImplementation,
  type WorldContextValue,
  type WorldInfo,
} from './contexts/WorldContext'

export {
  TeleportContext,
  TeleportProvider,
  useTeleportContext,
  createDefaultTeleportImplementation,
  type TeleportContextValue,
  type TeleportDestination,
} from './contexts/TeleportContext'

export {
  InstanceEventContext,
  InstanceEventProvider,
  useInstanceEventContext,
  createDefaultInstanceEventImplementation,
  type InstanceEventContextValue,
} from './contexts/InstanceEventContext'

export {
  PlacementStateProvider,
  usePlacementState,
  type PlacementMode,
  type PlacementStateContextValue,
} from './contexts/PlacementStateContext'

export {
  VoiceVolumeOverrideContext,
  VoiceVolumeOverrideProvider,
  useVoiceVolumeOverrideContext,
  createDefaultVoiceVolumeOverrideImplementation,
  type VoiceVolumeOverrideContextValue,
  // Deprecated aliases
  AudioVolumeContext,
  AudioVolumeProvider,
  useAudioVolumeContext,
  createDefaultAudioVolumeImplementation,
  type AudioVolumeContextValue,
} from './contexts/AudioVolumeContext'

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

export { Portal, type PortalProps } from './components/Portal'

export {
  BillboardY,
  useBillboardY,
  getBillboardYRotation,
} from './components/BillboardY'

export {
  type PhysicsConfig,
  type CameraConfig,
} from './components/DevEnvironment/types'

// Hooks
export { useInstanceState } from './hooks/useInstanceState'
export { useSpawnPoint } from './hooks/useSpawnPoint'
export { useConfirm } from './hooks/useConfirm'
export { useFileInput } from './hooks/useFileInput'
export { useTeleport } from './hooks/useTeleport'
export { useInstance } from './hooks/useInstance'
export { useWorld } from './hooks/useWorld'
export { useInstanceEvent } from './hooks/useInstanceEvent'
export { useVoiceVolumeOverride, useAudioVolume } from './hooks/useAudioVolume'
export { useDefaultFont, type FontLocale } from './hooks/useDefaultFont'

// Constants
export { LAYERS, type LayerName, type LayerNumber } from './constants/layers'

// Types
export { type AvatarHeight } from './types/avatar'

export {
  type PlayerMovement,
  type Position3D,
  type Rotation3D,
  type VRTrackingData,
  type VRMovementDirection,
} from './types/movement'
