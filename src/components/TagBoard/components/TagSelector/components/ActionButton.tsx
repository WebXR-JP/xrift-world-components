/**
 * ActionButton コンポーネント
 *
 * TagSelector内で使用する汎用アクションボタン。
 */
import { Text } from "@react-three/drei";

import { Interactable } from "../../../../Interactable";

export interface ActionButtonProps {
  id: string;
  label: string;
  color: number;
  width: number;
  height: number;
  scale: number;
  position: [number, number, number];
  onInteract: () => void;
  interactionText: string;
}

export const ActionButton = ({
  id,
  label,
  color,
  width,
  height,
  scale,
  position,
  onInteract,
  interactionText,
}: ActionButtonProps) => {
  return (
    <group position={position}>
      <Interactable id={id} onInteract={onInteract} interactionText={interactionText}>
        <mesh>
          <boxGeometry args={[width, height, 0.01 * scale]} />
          <meshStandardMaterial color={color} opacity={1} transparent />
        </mesh>
      </Interactable>
      <Text
        position={[0, 0, 0.006 * scale]}
        fontSize={0.15 * scale}
        color={0xffffff}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
};
