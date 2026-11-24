import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { DevEnvironment } from '../src/components/DevEnvironment'
import { SpawnPoint } from '../src/components/SpawnPoint'
import { ScreenShareProvider, type ScreenShareContextValue } from '../src/contexts/ScreenShareContext'
import { TextInput } from '../src/components/TextInput'
import { useConfirm } from '../src/hooks/useConfirm'
import { useWorldStorage } from '../src/hooks/useWorldStorage'
import { Text } from '@react-three/drei'
import { TestScene } from '../src/scenes/TestScene'
import { useUsers } from '../src/contexts/UsersContext'
import { Interactable } from '../src/components/Interactable'
import { useTeleport } from '../src/hooks/useTeleport'

function Floor() {
  return (
    <RigidBody type="fixed">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#444444" transparent opacity={0} />
      </mesh>
    </RigidBody>
  )
}

const debugOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  left: 12,
  padding: '8px 12px',
  background: 'rgba(0, 0, 0, 0.6)',
  color: '#fff',
  font: '12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
  borderRadius: 4,
  pointerEvents: 'none',
  whiteSpace: 'pre',
  zIndex: 1000,
}

function MovementDebugReader({
  targetRef,
}: {
  targetRef: React.RefObject<HTMLPreElement>
}) {
  const { getLocalMovement, localUser } = useUsers()
  useFrame(() => {
    if (!targetRef.current) return
    const m = getLocalMovement()
    const fmt = (n: number) => n.toFixed(2)
    targetRef.current.textContent = [
      `user      : ${localUser?.displayName ?? 'null'} (${localUser?.id ?? 'null'})`,
      `position  : x=${fmt(m.position.x)} y=${fmt(m.position.y)} z=${fmt(m.position.z)}`,
      `direction : x=${fmt(m.direction.x)} z=${fmt(m.direction.z)}`,
      `speed     : h=${fmt(m.horizontalSpeed)} v=${fmt(m.verticalSpeed)}`,
      `rotation  : yaw=${fmt(m.rotation.yaw)} pitch=${fmt(m.rotation.pitch)}`,
      `grounded  : ${m.isGrounded}`,
      `jumping   : ${m.isJumping}`,
    ].join('\n')
  })
  return null
}

/** useTeleport の確認用（スポーン地点の正面の柱）。インタラクトすると反対側の床へ、向きを変えて飛ぶ */
function TeleportButton() {
  const { teleport } = useTeleport()
  const handleInteract = useCallback(() => {
    teleport({ position: [-8, 0, -8], yaw: 45 })
  }, [teleport])
  return (
    <Interactable id="dev-teleport" onInteract={handleInteract} interactionText="テレポート">
      <mesh position={[5, 1, 8]}>
        <boxGeometry args={[0.6, 2, 0.6]} />
        <meshStandardMaterial color="#7c5cff" />
      </mesh>
    </Interactable>
  )
}

/** useConfirm の確認用（テレポートの柱の右の柱）。インタラクトすると確認画面を出し、答えを上に出す */
function ConfirmButton() {
  const { requestConfirm } = useConfirm()
  const [answer, setAnswer] = useState('未回答')
  const handleInteract = useCallback(() => {
    void requestConfirm({ title: '確認', message: 'テストの確認です。続けますか？' }).then((ok) => {
      setAnswer(ok ? 'OK' : 'キャンセル')
    })
  }, [requestConfirm])
  return (
    <group position={[6.2, 0, 8]}>
      <Interactable id="dev-confirm" onInteract={handleInteract} interactionText="確認">
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.6, 2, 0.6]} />
          <meshStandardMaterial color="#e0a030" />
        </mesh>
      </Interactable>
      <Text position={[0, 2.3, 0]} rotation={[0, Math.PI, 0]} fontSize={0.2} color="white">
        {answer}
      </Text>
    </group>
  )
}

/** TextInput の確認用（テレポートの柱の左の板） */
function TextInputBoard() {
  const [value, setValue] = useState('')
  return (
    <group position={[3.8, 1.4, 8]} rotation={[0, Math.PI, 0]}>
      <TextInput id="dev-text" value={value} onSubmit={setValue} placeholder="名前を入力">
        <mesh>
          <boxGeometry args={[1, 0.5, 0.1]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </TextInput>
      <Text position={[0, 0, 0.06]} fontSize={0.12} color="white">
        {value || '（クリックして入力）'}
      </Text>
    </group>
  )
}

/** useWorldStorage の確認用（確認の柱のさらに右）。押すと共有の数を 1 増やす。リロードしても残る */
function StorageCounter() {
  const storage = useWorldStorage()
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    void storage.shared.get('dev-counter').then((value) => setCount(typeof value === 'number' ? value : 0))
  }, [storage])
  const handleInteract = useCallback(() => {
    void storage.shared.increment('dev-counter', 1).then(setCount)
  }, [storage])
  return (
    <group position={[7.4, 0, 8]}>
      <Interactable id="dev-storage-counter" onInteract={handleInteract} interactionText="数を増やす">
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.6, 2, 0.6]} />
          <meshStandardMaterial color="#30a0e0" />
        </mesh>
      </Interactable>
      <Text position={[0, 2.3, 0]} rotation={[0, Math.PI, 0]} fontSize={0.2} color="white">
        {count === null ? '…' : `${count}`}
      </Text>
    </group>
  )
}

/** dev 用の画面共有モック（getDisplayMedia で実際に画面共有できる） */
function DevScreenShareProvider({ children }: { children: ReactNode }) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopScreenShare = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setVideoElement(null)
  }, [])

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      streamRef.current = stream
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play()
      setVideoElement(video)
      stream.getVideoTracks()[0]?.addEventListener('ended', stopScreenShare)
    } catch {
      // 共有ダイアログのキャンセルは無視
    }
  }, [stopScreenShare])

  const value = useMemo<ScreenShareContextValue>(
    () => ({
      videoElement,
      isSharing: videoElement !== null,
      startScreenShare,
      stopScreenShare,
      isRoomConnected: true,
    }),
    [videoElement, startScreenShare, stopScreenShare],
  )

  return <ScreenShareProvider value={value}>{children}</ScreenShareProvider>
}

function App() {
  const debugRef = useRef<HTMLPreElement>(null)
  return (
    <>
      <DevEnvironment>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
          <DevScreenShareProvider>
            <Floor />
            <SpawnPoint position={[5, 0, 5]} yaw={180} />
            <TestScene />
            <TeleportButton />
            <ConfirmButton />
            <TextInputBoard />
            <StorageCounter />
            <MovementDebugReader targetRef={debugRef} />
          </DevScreenShareProvider>
      </DevEnvironment>
      <pre ref={debugRef} style={debugOverlayStyle} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
