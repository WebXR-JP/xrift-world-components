/**
 * TagDisplay コンポーネント
 *
 * 指定ユーザーの頭上に選択済みタグを列ごとに整列して表示します。
 * 位置は `getMovement(userId)` の結果に追従します。
 *
 * Props:
 * - userId: 表示対象ユーザーID
 * - getMovement: ユーザー位置を取得する関数（毎フレーム呼び出し）
 * - tags: 全タグ定義（フィルター前）
 * - visible: 表示/非表示フラグ
 * - instanceStateKey: インスタンス状態キーの識別子
 */
import { useMemo, useRef } from "react";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type Group, DoubleSide, Vector3 } from "three";

import { useInstanceState } from "../../../../hooks/useInstanceState";
import { TagChip } from "../TagChip";
import { type TagDisplayProps } from "../../types";
import {
  calculateLayout,
  getSelectedTags,
  groupTagsByColumn,
} from "./utils";

const HEAD_OFFSET_Y = 2.6;

export const TagDisplay = ({
  userId,
  getMovement,
  tags,
  visible,
  instanceStateKey,
}: TagDisplayProps) => {
  const groupRef = useRef<Group>(null);
  const stateKey = `tag-${instanceStateKey}-${userId}`;

  // インスタンス状態から選択済みタグID を取得
  const [selectedTagIds] = useInstanceState<string[]>(stateKey, []);

  // useMemo
  const flatTags = useMemo(() => tags.flat(), [tags]);
  const selectedTags = useMemo(
    () => getSelectedTags(selectedTagIds, flatTags),
    [selectedTagIds, flatTags],
  );
  const activeColumns = useMemo(
    () => groupTagsByColumn(selectedTags, tags),
    [selectedTags, tags],
  );
  const layout = useMemo(
    () => calculateLayout(activeColumns),
    [activeColumns],
  );

  // useFrame で位置を更新
  useFrame(() => {
    if (!userId || !groupRef.current) return;
    const movement = getMovement(userId);
    if (!movement) {
      groupRef.current.visible = false;
      return;
    }

    // ワールド座標
    const worldPos = new Vector3(
      movement.position.x,
      movement.position.y + HEAD_OFFSET_Y,
      movement.position.z,
    );

    // 親がある場合、ワールド座標をローカル座標に変換
    const parent = groupRef.current.parent;
    if (parent) {
      parent.updateWorldMatrix(true, false);
      parent.worldToLocal(worldPos);
    }

    groupRef.current.position.copy(worldPos);
    groupRef.current.visible = true;
  });

  // タグが無い、または非表示の場合は何も描画しない
  if (selectedTags.length === 0 || !visible) return null;

  return (
    <group ref={groupRef} visible={false} scale={[0.5, 0.5, 0.5]}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <group>
          {/* 背景: 半透明の黒背景 */}
          <mesh position={[0, (-(layout.maxRows - 1) * layout.tagHeight) / 2, -0.02]}>
            <planeGeometry
              args={[layout.totalWidth + 0.1, layout.maxRows * layout.tagHeight + 0.1]}
            />
            <meshBasicMaterial
              color={0x000000}
              opacity={0.6}
              transparent
              side={DoubleSide}
            />
          </mesh>

          {/* タグを配置 */}
          {activeColumns.map(([columnIndex, columnTags], activeColIndex) => {
            const xPos =
              (activeColIndex - (activeColumns.length - 1) / 2) * layout.columnSpacing;

            return columnTags.map((tag, rowIndex) => {
              const yOffset = -rowIndex * (layout.tagHeight + layout.tagSpacing);

              return (
                <TagChip
                  key={`${columnIndex}-${tag.id}`}
                  tag={tag}
                  width={layout.tagWidth}
                  height={layout.tagHeight}
                  fontSize={0.08}
                  position={[xPos, yOffset, 0]}
                  doubleSided
                />
              );
            });
          })}
        </group>
      </Billboard>
    </group>
  );
};
