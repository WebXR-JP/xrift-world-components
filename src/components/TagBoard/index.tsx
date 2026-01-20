/**
 * TagBoard コンポーネント
 *
 * ユーザーが選択したタグをローカル/グローバルに扱い、
 * ボードUI（`TagSelector`）と、各ユーザー頭上へのタグ表示（`TagDisplay`）を提供します。
 *
 * デフォルト値は `constants.ts` の `DEFAULT_TAGS` / `DEFAULT_TITLE` / `DEFAULT_INSTANCE_STATE_KEY` を使用します。
 * 列数は `tags` から自動計算されます。
 *
 * 役割:
 * - TagSelector: タグ選択ボードUI の提供
 * - TagDisplay: 各ユーザー頭上へのタグ表示
 * - 両者の同期: インスタンス状態を通じた連携
 */
import { useState } from "react";
import { useUsers } from "../../contexts/UsersContext";
import { TagSelector } from "./TagSelector";
import { TagDisplay } from "./TagDisplay";
import {
  DEFAULT_TAGS,
  DEFAULT_TITLE,
  DEFAULT_INSTANCE_STATE_KEY,
} from "./constants";
import { type TagBoardProps } from "./types";

export const TagBoard = ({
  tags = DEFAULT_TAGS,
  title = DEFAULT_TITLE,
  instanceStateKey = DEFAULT_INSTANCE_STATE_KEY,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: TagBoardProps) => {
  const { remoteUsers, getMovement, getLocalMovement, localUser } = useUsers();
  const [tagsVisible, setTagsVisible] = useState(true);

  return (
    <>
      {/* タグ選択ボード UI */}
      <TagSelector
        tags={tags}
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
          tags={tags}
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
          tags={tags}
          visible={tagsVisible}
          instanceStateKey={instanceStateKey}
        />
      ))}
    </>
  );
};
