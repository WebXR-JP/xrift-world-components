export interface MirrorProps {
  /** 鏡の位置 */
  position?: [number, number, number]
  /** 鏡の回転 */
  rotation?: [number, number, number]
  /** 鏡のサイズ [幅, 高さ] */
  size?: [number, number]
  /** 反射の色（デフォルト: 0xcccccc） */
  color?: number
  /**
   * 反射テクスチャの解像度の上限（デフォルト: 512）。sizeの比率に応じて自動調整されます。
   * 鏡が画面上で小さく見えているときは、その大きさに合わせて自動で下がります
   */
  textureResolution?: number
  /**
   * この距離（メートル）を超えると擬似ミラーに切り替える（デフォルト: 指定なし）。
   * 指定しなくても、離れるほど反射の解像度は自動で下がり、画面上で十分小さくなると
   * 擬似ミラーに切り替わります。それより手前で反射をやめたいときだけ指定します
   */
  lodDistance?: number
}
