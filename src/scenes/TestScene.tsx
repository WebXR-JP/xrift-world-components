import { Mirror } from "../components/Mirror";

/**
 * Mirror のテストシーン
 */
export function TestScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* ミラー（奥） */}
      <Mirror position={[0, 1.5, -3]} size={[3, 2]} />

      {/* 反射確認用のボックス */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="tomato" />
      </mesh>

      {/* 床 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#888" />
      </mesh>
    </>
  );
}
