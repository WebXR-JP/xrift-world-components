import { Text } from '@react-three/drei'
import { type ReactNode, Suspense, useEffect, useId, useMemo, useState } from 'react'
import { ItemProvider } from '../../contexts/ItemContext'
import {
  type ItemLoadError,
  type LoadedItem,
  toItemLoadError,
  useItemLoaderContext,
} from '../../contexts/ItemLoaderContext'
import { PlacementStateProvider } from '../../contexts/PlacementStateContext'
import { XRiftContext, useXRift } from '../../contexts/XRiftContext'
import { baseUrlFromSceneUrl, placeholderLabel } from './utils'

export interface ItemProps {
  /** 置くアイテムの id（マイアイテム・マーケットの URL 末尾）。xrift.json の `world.items` にも書く */
  itemId: string
  position?: [number, number, number]
  /** オイラー角（ラジアン） */
  rotation?: [number, number, number]
  scale?: number
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; loaded: LoadedItem }
  | { status: 'error'; error: ItemLoadError }

const PLACEHOLDER_SIZE = 0.5
const PLACEHOLDER_COLOR = '#8a8f98'
const ERROR_COLOR = '#c0392b'

function ItemPlaceholder({ state }: { state: Exclude<LoadState, { status: 'ready' }> }) {
  const color = state.status === 'error' ? ERROR_COLOR : PLACEHOLDER_COLOR
  const label = placeholderLabel(
    state.status,
    state.status === 'error' ? state.error.code : undefined,
  )
  return (
    <group>
      <mesh position={[0, PLACEHOLDER_SIZE / 2, 0]}>
        <boxGeometry args={[PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
      <Text
        position={[0, PLACEHOLDER_SIZE + 0.15, 0]}
        fontSize={0.08}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

/** アイテムが相対パスで読むアセットのために baseUrl だけを差し替える */
function ItemBaseUrl({ sceneUrl, children }: { sceneUrl: string; children: ReactNode }) {
  const parent = useXRift()
  const value = useMemo(
    () => ({ ...parent, baseUrl: baseUrlFromSceneUrl(sceneUrl) }),
    [parent, sceneUrl],
  )
  return <XRiftContext.Provider value={value}>{children}</XRiftContext.Provider>
}

/**
 * ワールドに最初から置くアイテム（ユーザー作成アイテム）
 *
 * ```tsx
 * <Item itemId="xxxxxxxx-...." position={[2, 0, -3]} />
 * ```
 *
 * - 本体の読み込みはプラットフォームが注入する（本番は xrift-frontend、ローカルは DevEnvironment）
 * - xrift.json の `world.items` に itemId を書くこと。書いていないと本番では読まれない
 *   （先読みと訪問者の解決がその一覧から行われる）
 * - 読めるまで・読めないときは仮の箱（ワイヤーフレーム）と短い理由を出す
 * - アイテムから見た設置者（useItem().placedBy）は null（ワールドの一部で、置いた人がいない）
 */
export function Item({ itemId, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: ItemProps) {
  const loader = useItemLoaderContext()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  // 配置ごとに安定した id（同じアイテムを2か所に置いても useItem().id が別になる）
  const id = useId()

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loader
      .load(itemId)
      .then((loaded) => {
        if (!cancelled) setState({ status: 'ready', loaded })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const itemError = toItemLoadError(error)
        console.error(`[Item] アイテム ${itemId} を読み込めませんでした: ${itemError.message}`)
        setState({ status: 'error', error: itemError })
      })
    return () => {
      cancelled = true
    }
  }, [loader, itemId])

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {state.status === 'ready' ? (
        <ItemProvider id={id} placedBy={null}>
          <ItemBaseUrl sceneUrl={state.loaded.sceneUrl}>
            <PlacementStateProvider mode="placed">
              <Suspense fallback={<ItemPlaceholder state={{ status: 'loading' }} />}>
                <state.loaded.Item />
              </Suspense>
            </PlacementStateProvider>
          </ItemBaseUrl>
        </ItemProvider>
      ) : (
        <ItemPlaceholder state={state} />
      )}
    </group>
  )
}
