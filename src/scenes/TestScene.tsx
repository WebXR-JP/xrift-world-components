import { useState } from 'react'
import { VideoScreen } from '../components/VideoScreen'
import { Mirror } from '../components/Mirror'
import { Skybox } from '../components/Skybox'
import { Interactable } from '../components/Interactable'

/**
 * VideoScreenとMirrorのテストシーン
 * Triplexでコンポーネントを確認するためのシーン
 */
export function TestScene() {
  return (
    <>
      {/* 空 */}
      <Skybox />

      {/* 照明 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      {/* 床 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>

      {/* メインスクリーン（中央） */}
      <VideoScreen
        id="main-screen"
        position={[0, 2, -5]}
        scale={[16 / 9 * 3, 3]}
        url="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      />

      {/* 鏡（左） */}
      <Mirror
        position={[-5, 2.5, -3]}
        size={[3, 4]}
        textureResolution={512}
      />

      {/* 小さい鏡（左奥） */}
      <Mirror
        position={[-3, 1.5, -7]}
        size={[2, 2]}
        color={0xffd700}
      />

      {/* 参照用のキューブ */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      {/* 球体 */}
      <mesh position={[2, 1, -1]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="blue" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 円柱 */}
      <mesh position={[-2, 0.75, -1]}>
        <cylinderGeometry args={[0.5, 0.5, 1.5, 32]} />
        <meshStandardMaterial color="green" />
      </mesh>
    </>
  )
}
