/** ユーザーの現在位置・回転情報 */
export interface PlayerMovement {
  position: { x: number; y: number; z: number }
  rotation: { yaw: number; pitch: number }
}

/** 表示用のタグ定義（列位置付き） */
export interface Tag {
  id: string
  label: string
  color: string
  column: number
}

/** TagBoard のプロパティ */
export interface TagBoardProps {
  /** 表示・選択対象のタグ一覧（省略時はデフォルトを使用）。列数は tags から自動計算 */
  tags?: Tag[]
  /** タイトル文言 */
  title?: string
  /** 保存に用いるキー（複数ボード設置時の識別用） */
  storageKey?: string
  /** ボードの位置 */
  position?: [number, number, number]
  /** ボードの回転 */
  rotation?: [number, number, number]
  /** 全体スケール */
  scale?: number
}

/** TagDisplay のプロパティ */
export interface TagDisplayProps {
  userId: string
  getMovement: (userId: string) => PlayerMovement | undefined
  tags: Tag[]
  visible: boolean
  storageKey: string
}

/** TagSelector のプロパティ */
export interface TagSelectorProps {
  tags: Tag[]
  title: string
  columns: number
  storageKey: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}
