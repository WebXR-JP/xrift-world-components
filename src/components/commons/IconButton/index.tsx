import { memo } from "react";
import { Text } from "@react-three/drei";
import { Interactable } from "../../Interactable";

export interface IconButtonProps {
  /** ボタンの一意なID */
  id: string;
  /** ボタンの位置 */
  position: [number, number, number];
  /** ボタンのサイズ */
  size: number;
  /** 表示するアイコン（絵文字やテキスト） */
  icon: string;
  /** インタラクション時のツールチップテキスト */
  interactionText: string;
  /** クリック時のコールバック */
  onInteract: () => void;
  /** 背景色（デフォルト: #444444） */
  backgroundColor?: string;
  /** アイコン色（デフォルト: #ffffff） */
  iconColor?: string;
}

/**
 * 円形のアイコンボタン
 */
export const IconButton = memo(
  ({
    id,
    position,
    size,
    icon,
    interactionText,
    onInteract,
    backgroundColor = "#444444",
    iconColor = "#ffffff",
  }: IconButtonProps) => {
    return (
      <group position={position}>
        <Interactable id={id} onInteract={onInteract} interactionText={interactionText}>
          <mesh>
            <circleGeometry args={[size / 2, 32]} />
            <meshBasicMaterial color={backgroundColor} />
          </mesh>
        </Interactable>
        <Text
          position={[0, 0, 0.01]}
          fontSize={size * 0.4}
          color={iconColor}
          anchorX="center"
          anchorY="middle"
        >
          {icon}
        </Text>
      </group>
    );
  },
);

IconButton.displayName = "IconButton";
