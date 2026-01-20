import { type PlayerMovement } from "../../types/movement";

/** 表示用のタグ定義 */
export interface Tag {
  id: string;
  label: string;
  color: string;
}

/** TagBoard のプロパティ */
export interface TagBoardProps {
  /** 表示・選択対象のタグ（省略時はデフォルトを使用） */
  tags?: Tag[];
  /** 表示列数（省略時は3列） */
  columns?: number;
  /** タイトル文言 */
  title?: string;
  /** インスタンス状態のキー（複数ボード設置時の識別用） */
  instanceStateKey: string;
  /** ボードの位置 */
  position?: [number, number, number];
  /** ボードの回転 */
  rotation?: [number, number, number];
  /** 全体スケール */
  scale?: number;
}

/** TagDisplay のプロパティ */
export interface TagDisplayProps {
  userId: string;
  getMovement: (userId: string) => PlayerMovement | undefined;
  tags: Tag[][];
  visible: boolean;
  instanceStateKey: string;
}

/** TagSelector のプロパティ */
export interface TagSelectorProps {
  tags: Tag[][];
  title: string;
  instanceStateKey: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  /** タグ表示/非表示の状態 */
  tagsVisible: boolean;
  /** タグ表示/非表示の変更コールバック */
  onTagsVisibleChange: (visible: boolean) => void;
}
