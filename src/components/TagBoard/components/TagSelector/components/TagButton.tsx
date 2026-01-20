/**
 * TagButton コンポーネント
 *
 * タグ選択ボタン。選択状態のチェックマーク表示を含む。
 */
import { Text } from "@react-three/drei";

import { Interactable } from "../../../../Interactable";
import { TagChip } from "../../TagChip";
import { type Tag } from "../../../types";

export interface TagButtonProps {
  tag: Tag;
  width: number;
  height: number;
  scale: number;
  position: [number, number, number];
  isSelected: boolean;
  onInteract: () => void;
}

export const TagButton = ({
  tag,
  width,
  height,
  scale,
  position,
  isSelected,
  onInteract,
}: TagButtonProps) => {
  return (
    <group position={position}>
      <Interactable
        id={`tag-button-${tag.id}`}
        onInteract={onInteract}
        interactionText={tag.label}
      >
        <TagChip
          tag={tag}
          width={width}
          height={height}
          fontSize={0.15 * scale}
        />
      </Interactable>
      {/* 選択済みインジケーター（チェックマーク） */}
      {isSelected && (
        <Text
          position={[-0.58 * scale, -0.02 * scale, 0.012 * scale]}
          fontSize={0.2 * scale}
          color={0xffffff}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.2 * scale * 0.04}
          outlineColor={0x000000}
        >
          ✓
        </Text>
      )}
    </group>
  );
};
