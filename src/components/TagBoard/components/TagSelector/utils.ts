import { type Tag } from "../../types";

export interface TagSelectorLayout {
  tagHeight: number;
  tagWidth: number;
  columnSpacing: number;
  columns: number;
  boardWidth: number;
  boardHeight: number;
  titleY: number;
  buttonGroupY: number;
  tagStartY: number;
  buttonWidth: number;
  buttonLeftX: number;
  buttonRightX: number;
}

/**
 * タグIDの選択状態をトグルし、tagsの順番でソートして返す
 */
export const toggleTagSelection = (
  prevIds: string[],
  tagId: string,
  flatTags: Tag[],
): string[] => {
  let newIds: string[];
  if (prevIds.includes(tagId)) {
    newIds = prevIds.filter((id) => id !== tagId);
  } else {
    newIds = [...new Set([...prevIds, tagId])];
  }
  // tags配列の順番に合わせてソート
  return newIds.sort((a, b) => {
    const indexA = flatTags.findIndex((tag) => tag.id === a);
    const indexB = flatTags.findIndex((tag) => tag.id === b);
    return indexA - indexB;
  });
};

export const calculateLayout = (tags: Tag[][], scale: number): TagSelectorLayout => {
  const tagHeight = 0.27 * scale;
  const tagWidth = 1.33 * scale;
  const columnSpacing = tagWidth;
  const columns = tags.length;

  const maxRowsInColumn = Math.max(...tags.map((col) => col.length), 0);
  const boardWidth = columns * tagWidth + 0.2 * scale;

  const headerHeight = 1.0 * scale;
  const boardHeight = maxRowsInColumn * tagHeight + headerHeight;

  const boardTop = boardHeight / 2;
  const titleY = boardTop - 0.25 * scale;
  const buttonGroupY = boardTop - 0.3 * scale;
  const tagStartY = boardTop - headerHeight;

  const buttonWidth = boardWidth / 2 - 0.05 * scale;
  const buttonLeftX = -boardWidth / 4;
  const buttonRightX = boardWidth / 4;

  return {
    tagHeight,
    tagWidth,
    columnSpacing,
    columns,
    boardWidth,
    boardHeight,
    titleY,
    buttonGroupY,
    tagStartY,
    buttonWidth,
    buttonLeftX,
    buttonRightX,
  };
};
