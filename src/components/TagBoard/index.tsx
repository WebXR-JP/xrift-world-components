/**
 * TagBoard コンポーネント
 *
 * ユーザーが選択したタグをローカル/グローバルに扱い、
 * ボードUI（`TagSelector`）と、各ユーザー頭上へのタグ表示（`TagDisplay`）を提供します。
 *
 * 役割:
 * - TagSelector: タグ選択ボードUI の提供
 * - TagDisplay: 各ユーザー頭上へのタグ表示
 * - 両者の同期: インスタンス状態を通じた連携
 */
import { useMemo, useState } from "react";
import { useUsers } from "../../contexts/UsersContext";
import { TagSelector } from "./components/TagSelector";
import { TagDisplay } from "./components/TagDisplay";
import { DEFAULT_COLUMNS, DEFAULT_TAGS, DEFAULT_TITLE } from "./constants";
import { type TagBoardProps } from "./types";
import { splitIntoColumns } from "./utils";

export { type TagBoardProps, type Tag } from "./types";

export const TagBoard = ({
  tags = DEFAULT_TAGS,
  columns = DEFAULT_COLUMNS,
  title = DEFAULT_TITLE,
  instanceStateKey,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: TagBoardProps) => {
  const { remoteUsers, getMovement, getLocalMovement, localUser } = useUsers();
  const [tagsVisible, setTagsVisible] = useState(true);

  const tagColumns = useMemo(
    () => splitIntoColumns(tags, columns),
    [tags, columns],
  );

  return (
    <>
      {/* タグ選択ボード UI */}
      <TagSelector
        tags={tagColumns}
        title={title}
        instanceStateKey={instanceStateKey}
        position={position}
        rotation={rotation}
        scale={scale}
        tagsVisible={tagsVisible}
        onTagsVisibleChange={setTagsVisible}
      />

      {/* 自分の頭上にタグを表示 */}
      {localUser && (
        <TagDisplay
          userId={localUser.id}
          getMovement={getLocalMovement}
          tags={tagColumns}
          visible={tagsVisible}
          instanceStateKey={instanceStateKey}
        />
      )}

      {/* 他ユーザーの頭上にタグを表示 */}
      {remoteUsers.map((user) => (
        <TagDisplay
          key={user.id}
          userId={user.id}
          getMovement={getMovement}
          tags={tagColumns}
          visible={tagsVisible}
          instanceStateKey={instanceStateKey}
        />
      ))}
    </>
  );
};
