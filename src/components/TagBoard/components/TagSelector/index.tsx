/**
 * TagSelector コンポーネント
 *
 * タグ選択用のボードUIを表示し、選択状態をインスタンス状態（`useInstanceState`）へ反映します。
 * 可視状態のトグルも提供します。
 *
 * Props 概要:
 * - tags: 表示・選択対象のタグ一覧
 * - title: ボード上部に表示するタイトル文言
 * - instanceStateKey: 複数ボード設置時のキー識別子
 * - position/rotation/scale: ボードの位置・回転・スケール
 * - tagsVisible: タグ表示/非表示の状態
 * - onTagsVisibleChange: タグ表示/非表示の変更コールバック
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "@react-three/drei";

import { useUsers } from "../../../../contexts/UsersContext";
import { useInstanceState } from "../../../../hooks/useInstanceState";
import { type TagSelectorProps } from "../../types";
import { ActionButton } from "./components/ActionButton";
import { TagButton } from "./components/TagButton";
import { calculateLayout, toggleTagSelection } from "./utils";

export const TagSelector = ({
  tags,
  title,
  instanceStateKey,
  position,
  rotation,
  scale,
  tagsVisible,
  onTagsVisibleChange,
}: TagSelectorProps) => {
  const { localUser } = useUsers();
  const stateKey = `tag-${instanceStateKey}-${localUser?.id}`;

  // グローバル同期用の選択タグID（他ユーザーからも見える状態に反映）
  const [, setGlobalSelectedTagIds] = useInstanceState<string[]>(stateKey, []);
  const [localSelectedTagIds, setLocalSelectedTagIds] = useState<string[]>([]);

  // useMemo
  const flatTags = useMemo(() => tags.flat(), [tags]);
  const layout = useMemo(() => calculateLayout(tags, scale), [tags, scale]);

  // localSelectedTagIds が変更されたらグローバル状態に同期
  useEffect(() => {
    if (!localUser?.id) return;
    setGlobalSelectedTagIds(localSelectedTagIds);
  }, [localSelectedTagIds, localUser?.id, setGlobalSelectedTagIds]);

  // useCallback
  const handleTagClick = useCallback(
    (tagId: string) => {
      setLocalSelectedTagIds((prev) =>
        toggleTagSelection(prev, tagId, flatTags),
      );
    },
    [flatTags],
  );

  const handleClear = useCallback(() => {
    setLocalSelectedTagIds([]);
  }, []);

  const handleToggleVisibility = useCallback(() => {
    onTagsVisibleChange(!tagsVisible);
  }, [onTagsVisibleChange, tagsVisible]);

  return (
    <group position={position} rotation={rotation}>
      {/* 背景ボード */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[layout.boardWidth, layout.boardHeight]} />
        <meshBasicMaterial color={0x2a2a2a} />
      </mesh>

      {/* タイトル */}
      <Text
        position={[0, layout.titleY, 0]}
        fontSize={0.2 * scale}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {title}
      </Text>

      {/* アクションボタン群 */}
      <ActionButton
        id="tag-clear-button"
        label="全削除"
        color={0xff6666}
        width={layout.buttonWidth}
        height={0.35 * scale}
        scale={scale}
        position={[layout.buttonLeftX, layout.buttonGroupY - 0.3 * scale, -0.01]}
        onInteract={handleClear}
        interactionText="選択をクリア"
      />
      <ActionButton
        id="tag-visibility-toggle"
        label={tagsVisible ? "非表示" : "表示"}
        color={tagsVisible ? 0x00aa00 : 0xaa0000}
        width={layout.buttonWidth}
        height={0.35 * scale}
        scale={scale}
        position={[layout.buttonRightX, layout.buttonGroupY - 0.3 * scale, -0.01]}
        onInteract={handleToggleVisibility}
        interactionText={tagsVisible ? "タグを非表示" : "タグを表示"}
      />

      {/* タグボタン群 */}
      {tags.map((columnTags, colIndex) => {
        const xPos =
          (colIndex - (layout.columns - 1) / 2) * layout.columnSpacing;

        return columnTags.map((tag, rowIndex) => {
          const yPos = layout.tagStartY - rowIndex * layout.tagHeight;
          const isSelected = localSelectedTagIds.includes(tag.id);

          return (
            <TagButton
              key={tag.id}
              tag={tag}
              width={layout.tagWidth}
              height={layout.tagHeight}
              scale={scale}
              position={[xPos, yPos, -0.01]}
              isSelected={isSelected}
              onInteract={() => handleTagClick(tag.id)}
            />
          );
        });
      })}
    </group>
  );
};
