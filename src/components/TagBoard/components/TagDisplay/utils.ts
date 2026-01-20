import { type Tag } from "../../types";

export interface TagDisplayLayout {
  tagHeight: number;
  tagWidth: number;
  tagSpacing: number;
  columnSpacing: number;
  maxRows: number;
  totalWidth: number;
}

export type ActiveColumn = [number, Tag[]];

/**
 * 選択されたタグIDから実際のタグオブジェクトを取得
 */
export const getSelectedTags = (
  selectedTagIds: string[],
  flatTags: Tag[],
): Tag[] => {
  const uniqueTagIds = [...new Set(selectedTagIds)];
  return uniqueTagIds
    .map((id) => flatTags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);
};

/**
 * 選択済みタグを列ごとにマッピングしてソート
 */
export const groupTagsByColumn = (
  selectedTags: Tag[],
  tags: Tag[][],
): ActiveColumn[] => {
  const columnMap = new Map<number, Tag[]>();

  selectedTags.forEach((tag) => {
    let columnIndex = -1;
    for (let i = 0; i < tags.length; i++) {
      if (tags[i].some((t) => t.id === tag.id)) {
        columnIndex = i;
        break;
      }
    }
    if (columnIndex === -1) return;

    if (!columnMap.has(columnIndex)) {
      columnMap.set(columnIndex, []);
    }
    columnMap.get(columnIndex)!.push(tag);
  });

  return Array.from(columnMap.entries()).sort((a, b) => a[0] - b[0]);
};

/**
 * レイアウト計算
 */
export const calculateLayout = (activeColumns: ActiveColumn[]): TagDisplayLayout => {
  const tagHeight = 0.16;
  const tagWidth = 0.8;
  const tagSpacing = 0;
  const columnSpacing = tagWidth;

  const maxRows = activeColumns.length > 0
    ? Math.max(...activeColumns.map(([, t]) => t.length))
    : 0;
  const totalWidth = activeColumns.length * tagWidth;

  return {
    tagHeight,
    tagWidth,
    tagSpacing,
    columnSpacing,
    maxRows,
    totalWidth,
  };
};
