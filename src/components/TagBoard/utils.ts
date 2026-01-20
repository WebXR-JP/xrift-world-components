import { type Tag } from "./types";

/**
 * タグ配列を指定列数で分割する
 * 各列にできるだけ均等にタグを配置する
 */
export const splitIntoColumns = (tags: Tag[], columns: number): Tag[][] => {
  if (columns <= 0 || tags.length === 0) return [];

  const result: Tag[][] = Array.from({ length: columns }, () => []);
  const baseCount = Math.floor(tags.length / columns);
  const remainder = tags.length % columns;

  let index = 0;
  for (let col = 0; col < columns; col++) {
    const count = baseCount + (col < remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      result[col].push(tags[index++]);
    }
  }

  return result;
};
