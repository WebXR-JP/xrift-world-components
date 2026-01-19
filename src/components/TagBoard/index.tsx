/**
 * TagBoard コンポーネント
 *
 * ユーザーが選択したタグをローカル/グローバルに扱い、
 * ボードUI（`TagSelector`）と、各ユーザー頭上へのタグ表示（`TagDisplay`）を提供します。
 *
 * デフォルト値は `constants.ts` の `DEFAULT_TAGS` / `DEFAULT_TITLE` / `DEFAULT_STORAGE_KEY` を使用します。
 * 列数は `tags` から自動計算されます。
 * 可視状態は `VISIBILITY_STORAGE_KEY` を用いて `localStorage` に保存・参照します。
 *
 * 役割:
 * - TagSelector: タグ選択ボードUI の提供
 * - TagDisplay: 各ユーザー頭上へのタグ表示
 * - 両者の同期: localStorage とインスタンス状態を通じた連携
 */
import { useEffect, useState } from 'react'
import { useUsers } from '@xrift/world-components'

import { TagSelector } from './TagSelector'
import { TagDisplay } from './TagDisplay'
import { VISIBILITY_STORAGE_KEY, DEFAULT_TAGS, DEFAULT_TITLE, DEFAULT_STORAGE_KEY } from './constants'
import { type TagBoardProps } from './types'

export const TagBoard = ({
		tags = DEFAULT_TAGS,
		title = DEFAULT_TITLE,
		storageKey = DEFAULT_STORAGE_KEY,
		position = [0, 0, 0],
		rotation = [0, 0, 0],
		scale = 1
}: TagBoardProps) => {
	const { remoteUsers, getMovement, getLocalMovement, localUser } = useUsers()
	const [tagsVisible, setTagsVisible] = useState(true)

	// 初期化: localStorage からタグ表示状態を読み込み
	useEffect(() => {
		const visibilityState = localStorage.getItem(VISIBILITY_STORAGE_KEY)
		if (visibilityState !== null) {
			setTagsVisible(visibilityState === 'true')
		}
	}, [])

	// 監視: TagSelector による表示状態の変更を定期的に監視
	useEffect(() => {
		const handleStorageChange = () => {
			const visibilityState = localStorage.getItem(VISIBILITY_STORAGE_KEY)
			if (visibilityState !== null) {
				setTagsVisible(visibilityState === 'true')
			}
		}
		const interval = setInterval(handleStorageChange, 100)
		return () => clearInterval(interval)
	}, [])

	return (
		<>
			{/* タグ選択ボード UI */}
			<TagSelector
        tags={tags}
        title={title}
        storageKey={storageKey}
        position={position}
        rotation={rotation}
        scale={scale}
      />

			{/* 自分の頭上にタグを表示 */}
			{localUser && (
				<TagDisplay
					userId={localUser.id}
					getMovement={getLocalMovement}
					tags={tags}
					visible={tagsVisible}
					storageKey={storageKey}
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
					storageKey={storageKey}
				/>
			))}
		</>
	)
}

