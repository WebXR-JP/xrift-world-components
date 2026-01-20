/**
 * TagBoard 関連の定数定義
 */
import { type Tag } from "./types";

export const DEFAULT_TITLE = "タグ選択";
export const DEFAULT_COLUMNS = 3;

export const DEFAULT_TAGS: Tag[] = [
  { color: "#2ECC71", id: "want-talk", label: "話したい" },
  { color: "#3498DB", id: "want-listen", label: "聞きたい" },
  { color: "#95A5A6", id: "silent", label: "無言" },
  { color: "#1ABC9C", id: "developer", label: "開発者" },
  { color: "#2980B9", id: "student", label: "学生" },
  { color: "#F1C40F", id: "beginner", label: "初心者" },
  { color: "#9B59B6", id: "dont-know", label: "なんもわからん" },
  { color: "#8BC34A", id: "working", label: "作業中" },
  { color: "#BF7B41", id: "away", label: "離席中" },
  { color: "#FF9800", id: "cat", label: "ねこ" },
];
