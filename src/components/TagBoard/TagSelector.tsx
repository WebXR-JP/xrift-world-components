/**
 * TagSelector コンポーネント
 *
 * タグ選択用のボードUIを表示し、選択状態をインスタンス状態（`useInstanceState`）へ反映します。
 * 可視状態のトグルも提供します。
 *
 * Props 概要:
 * - tags: 表示・選択対象のタグ一覧
 * - title: ボード上部に表示するタイトル文言
 * - storageKey: 複数ボード設置時のキー識別子
 * - position/rotation/scale: ボードの位置・回転・スケール
 * - tagsVisible: タグ表示/非表示の状態
 * - onTagsVisibleChange: タグ表示/非表示の変更コールバック
 */
import { useEffect, useState } from 'react'
import { Text } from '@react-three/drei'

import { useUsers } from '../../contexts/UsersContext'
import { useInstanceState } from '../../hooks/useInstanceState'
import { Interactable } from '../Interactable'
import { type TagSelectorProps } from './types'

export const TagSelector = ({ tags, title, storageKey, position, rotation, scale, tagsVisible, onTagsVisibleChange }: TagSelectorProps) => {
  const { localUser } = useUsers()
  // グローバル同期用の選択タグID（他ユーザーからも見える状態に反映）
  const [, setGlobalSelectedTagIds] = useInstanceState<string[]>(
    `tag-${storageKey}-${localUser?.id}`,
    []
  )
  const [localSelectedTagIds, setLocalSelectedTagIds] = useState<string[]>([])

  // tags から平坦化したタグリストを生成
  const flatTags = tags.flat()
  const columns = tags.length

  // 選択状態の変更時にグローバル状態へ反映
  useEffect(() => {
    if (!localUser?.id) return
    setGlobalSelectedTagIds(localSelectedTagIds)
  }, [localSelectedTagIds, localUser?.id, setGlobalSelectedTagIds])

  // タグボタンのクリック処理: 選択のトグル（tags配列の順番を維持）
  const handleTagClick = (tagId: string) => {
    setLocalSelectedTagIds((prev) => {
      let newIds: string[]
      if (prev.includes(tagId)) {
        newIds = prev.filter(id => id !== tagId)
      } else {
        newIds = [...new Set([...prev, tagId])]
      }
      // tags配列の順番に合わせてソート
      return newIds.sort((a, b) => {
        const indexA = flatTags.findIndex(tag => tag.id === a)
        const indexB = flatTags.findIndex(tag => tag.id === b)
        return indexA - indexB
      })
    })
  }

  // 全クリア: 選択状態を空にする
  const handleClear = () => {
    setLocalSelectedTagIds([])
  }

  // 表示/非表示をトグル
  const handleToggleVisibility = () => {
    onTagsVisibleChange(!tagsVisible)
  }

  // タグを列ごとにグルーピング（すでに tags として列ごとに分かれている）
  const columnGroups = tags

  // レイアウト計算（タグボタンのサイズ・ボードサイズ・列間隔）
  const tagHeight = 0.27 * scale
  const tagWidth = 1.33 * scale
  const columnSpacing = tagWidth

  const maxRowsInColumn = Math.max(...columnGroups.map(col => col.length), 0)
  const boardWidth = columns * tagWidth + 0.2 * scale
  
  // ヘッダー領域の高さ（タイトル + ボタン + マージン）
  const headerHeight = 1.0 * scale
  const boardHeight = maxRowsInColumn * tagHeight + headerHeight
  
  // 背景ボードの上端からの各要素の位置
  const boardTop = boardHeight / 2 
  const titleY = boardTop - 0.25 * scale
  const buttonGroupY = boardTop - 0.3 * scale
  const tagStartY = boardTop - headerHeight

  // ボタンサイズ計算: 背景ボード幅に合わせて可変（左右ボタンで幅を二分）
  const buttonWidth = boardWidth / 2 - 0.05 * scale
  const buttonLeftX = -boardWidth / 4
  const buttonRightX = boardWidth / 4

  return (
    <group position={position} rotation={rotation}>
      {/* 背景ボード（タイトル・コントロールボタンを含む） - 原点を中央に */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[boardWidth, boardHeight]} />
        <meshBasicMaterial color={0x2a2a2a} opacity={1} transparent />
      </mesh>
      
      <Text
        position={[0, titleY, 0]}
        fontSize={0.2 * scale}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {title}
      </Text>

      <group position={[0, buttonGroupY, -0.01]}>
        {/* クリアボタン: 選択済みタグをすべて解除（背景ボード幅に合わせて可変） */}
        <group position={[buttonLeftX, -0.3 * scale, 0]}>
          <Interactable
            id="tag-clear-button"
            onInteract={handleClear}
            interactionText="選択をクリア"
          >
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[buttonWidth, 0.35 * scale, 0.01 * scale]} />
              <meshStandardMaterial
                color={0xff6666}
                opacity={1}
                transparent
              />
            </mesh>
          </Interactable>
          <Text
            position={[0, 0, 0.006 * scale]}
            fontSize={0.15 * scale}
            color={0xffffff}
            anchorX="center"
            anchorY="middle"
          >
            全削除
          </Text>
        </group>

        {/* 表示/非表示トグルボタン: 頭上タグの表示状態切替（背景ボード幅に合わせて可変） */}
        <group position={[buttonRightX, -0.3 * scale, 0]}>
          <Interactable
            id="tag-visibility-toggle"
            onInteract={handleToggleVisibility}
            interactionText={tagsVisible ? "タグを非表示" : "タグを表示"}
          >
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[buttonWidth, 0.35 * scale, 0.01 * scale]} />
              <meshStandardMaterial
                color={tagsVisible ? 0x00aa00 : 0xaa0000}
                opacity={1}
                transparent
              />
            </mesh>
          </Interactable>
          <Text
            position={[0, 0, 0.006 * scale]}
            fontSize={0.15 * scale}
            color={0xffffff}
            anchorX="center"
            anchorY="middle"
          >
            {tagsVisible ? "非表示" : "表示"}
          </Text>
        </group>
      </group>

      {columnGroups.map((columnTags, colIndex) => {
        const xPos = (colIndex - (columns - 1) / 2) * columnSpacing
        
        return (
          <group key={colIndex} position={[xPos, 0, -0.01]}>
            {columnTags.map((tag, rowIndex) => {
              const yPos = tagStartY - rowIndex * tagHeight
              const isSelected = localSelectedTagIds.includes(tag.id)
              
              return (
                <group key={tag.id} position={[0, yPos, 0]}>
                  <Interactable
                    id={`tag-button-${tag.id}`}
                    onInteract={() => handleTagClick(tag.id)}
                    interactionText={tag.label}
                  >
                    <mesh position={[0, 0, 0]}>
                      <boxGeometry args={[tagWidth, tagHeight, 0.01 * scale]} />
                      <meshStandardMaterial
                        color={tag.color}
                        opacity={1}
                        transparent
                      />
                    </mesh>
                  </Interactable>
                  <Text
                    position={[0, 0, 0.01 * scale]}
                    fontSize={0.15 * scale}
                    color={0xffffff}
                    anchorX="center"
                    anchorY="middle"
                  >
                    {tag.label}
                  </Text>
                  {/* 選択済みインジケーター（チェックマーク） */}
                  {isSelected && (
                    <Text
                      position={[-0.58 * scale, -0.02 * scale, 0.012 * scale]}
                      fontSize={0.2 * scale}
                      color={tag.color}
                      anchorX="center"
                      anchorY="middle"
                    >
                      ✓
                    </Text>
                  )}
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
