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
import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type Group, DoubleSide } from 'three'

import { useInstanceState } from '../../hooks/useInstanceState'
import { type Tag, type TagDisplayProps } from './types'

export const TagDisplay = ({ userId, getMovement, tags, visible, instanceStateKey }: TagDisplayProps) => {
  const groupRef = useRef<Group>(null)
  // インスタンス状態から選択済みタグID を取得（他ユーザーからも見える状態と同期）
  const [selectedTagIds] = useInstanceState<string[]>(
    `tag-${instanceStateKey}-${userId}`,
    []
  )

  // tags から平坦化されたタグリストを生成
  const flatTags = tags.flat()

  // フレーム毎に位置を更新: ユーザーの頭上 +1.4 に追従
  useFrame(() => {
    if (!userId) return
    const movement = getMovement(userId)
    if (!movement || !groupRef.current) return

    groupRef.current.position.set(
      movement.position.x,
      movement.position.y + 1.4,
      movement.position.z
    )
  })

  // 重複を排除して選択済みタグを特定
  const uniqueTagIds = [...new Set(selectedTagIds)]
  const selectedTags = uniqueTagIds
    .map(id => flatTags.find(tag => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined)

  // タグが無い場合、または非表示の場合は何も描画しない
  if (selectedTags.length === 0 || !visible) return null

  // 選択済みタグを列ごとにマッピング
  const columnMap = new Map<number, Tag[]>()
  selectedTags.forEach(tag => {
    // tags から列番号を特定
    let columnIndex = -1
    for (let i = 0; i < tags.length; i++) {
      if (tags[i].some(t => t.id === tag.id)) {
        columnIndex = i
        break
      }
    }
    if (columnIndex === -1) return // 見つからない場合はスキップ
    
    if (!columnMap.has(columnIndex)) {
      columnMap.set(columnIndex, [])
    }
    columnMap.get(columnIndex)!.push(tag)
  })

  // アクティブな列のみを取得してソート
  const activeColumns = Array.from(columnMap.entries()).sort((a, b) => a[0] - b[0])

  // レイアウト計算
  const tagHeight = 0.16
  const tagWidth = 0.8
  const tagSpacing = 0
  const columnSpacing = tagWidth

  const maxRows = Math.max(...activeColumns.map(([, t]) => t.length))
  const totalWidth = activeColumns.length * tagWidth

  return (
    <group ref={groupRef} scale={[0.5, 0.5, 0.5]}>
      {/* Billboard: カメラに常に向く（UI 的な見栄え） */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <group>
          {/* 背景: 半透明の黒背景でタグを浮き出させる */}
          <mesh position={[0, -(maxRows - 1) * tagHeight / 2, -0.02]}>
            <planeGeometry args={[totalWidth + 0.1, maxRows * tagHeight + 0.1]} />
            <meshBasicMaterial color={0x000000} opacity={0.6} transparent side={DoubleSide} />
          </mesh>

          {/* 列ごとにタグを配置 */}
          {activeColumns.map(([columnIndex, columnTags], activeColIndex) => {
            const xPos = (activeColIndex - (activeColumns.length - 1) / 2) * columnSpacing

            return (
              <group key={columnIndex} position={[xPos, 0, 0]}>
                {/* 各列内のタグを上から下へ積む */}
                {columnTags.map((tag, rowIndex) => {
                  const yOffset = -rowIndex * (tagHeight + tagSpacing)
                  
                  return (
                    <group key={tag.id} position={[0, yOffset, 0]}>
                      {/* タグボックス */}
                      <mesh position={[0, 0, -0.01]}>
                        <planeGeometry args={[tagWidth, tagHeight]} />
                        <meshBasicMaterial color={tag.color} opacity={0.6} transparent  side={DoubleSide}/>
                      </mesh>
                      {/* タグラベルテキスト */}
                      <Text
                        position={[0, 0, 0]}
                        fontSize={0.08}
                        color={0xffffff}
                        anchorX="center"
                        anchorY="middle"
                      >
                        {tag.label}
                      </Text>
                      {/* タグラベルテキスト（裏面用） */}
                      <Text
                        position={[0, 0, -0.03]}
                        fontSize={0.08}
                        anchorX="center"
                        anchorY="middle"
                        color={0xffffff}
                      >
                        {tag.label}
                      </Text>
                    </group>
                  )
                })}
              </group>
            )
          })}
        </group>
      </Billboard>
    </group>
  )
}
