import { Text } from '@react-three/drei'
import { type ReactNode, Suspense, useEffect, useMemo, useState } from 'react'
import { ItemProvider } from '../../contexts/ItemContext'
import {
  type ItemLoadError,
  type LoadedItem,
  toItemLoadError,
  useItemLoaderContext,
} from '../../contexts/ItemLoaderContext'
import { PlacementStateProvider } from '../../contexts/PlacementStateContext'
import { XRiftContext, useXRift } from '../../contexts/XRiftContext'
import { baseUrlFromSceneUrl, createPlacementIdRegistry, placeholderLabel } from './utils'

export interface ItemProps {
  /** 置くアイテムの id（マイアイテム・マーケットの URL 末尾）。xrift.json の `world.items` にも書く */
  itemId: string
  position?: [number, number, number]
  /** オイラー角（ラジアン） */
  rotation?: [number, number, number]
  scale?: number
  /**
   * この配置の id（アイテム側には useItem().id として渡る）。ワールド内で一意にする
   *
   * itemId が「何を置くか」、placementId が「どの配置か」。アイテムは共有状態（useInstanceState など）
   * のキーにこれを使うので、全クライアントで同じ値であることと、位置を動かしたり版を上げたりしても
   * 変わらないことが要る。自動で決めると（React の useId はツリー上の位置、置き方から組むと移動）
   * どちらかが崩れるので作者が付ける
   */
  placementId: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; loaded: LoadedItem }
  | { status: 'error'; error: ItemLoadError }

const PLACEHOLDER_SIZE = 0.5

/** 同じ失敗を配置の数だけ console に出さない（itemId × 理由で1回） */
const loggedFailures = new Set<string>()

function logLoadFailure(itemId: string, error: ItemLoadError): void {
  const key = `${itemId}:${error.code}`
  if (loggedFailures.has(key)) return
  loggedFailures.add(key)
  console.error(`[Item] アイテム ${itemId} を読み込めませんでした: ${error.message}`)
}
const PLACEHOLDER_COLOR = '#8a8f98'
const ERROR_COLOR = '#c0392b'

/** 画面にある配置の名札。同じ名札が重なったら開発者に知らせる（名札は変えない） */
const placementIds = createPlacementIdRegistry()

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
      {/* drei の Text はフォントの読み込みで suspend する。境界を置かないと上の Suspense まで
          巻き込み、初回に Canvas 全体が一瞬消える */}
      <Suspense fallback={null}>
        <Text
          position={[0, PLACEHOLDER_SIZE + 0.15, 0]}
          fontSize={0.08}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </Suspense>
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
 * <Item placementId="lamp-entrance" itemId="xxxxxxxx-...." position={[2, 0, -3]} />
 * ```
 *
 * - 本体の読み込みはプラットフォームが注入する（本番は xrift-frontend、ローカルは DevEnvironment）
 * - xrift.json の `world.items` に itemId を書くこと。書いていないと本番では読まれない
 *   （先読みと訪問者の解決がその一覧から行われる）
 * - 読めるまで・読めないときは仮の箱（ワイヤーフレーム）と短い理由を出す
 * - アイテムから見た設置者（useItem().placedBy）は null（ワールドの一部で、置いた人がいない）
 * - useItem().id は placementId プロップ（作者が付けるワールド内で一意の名前）
 */
export function Item({
  placementId,
  itemId,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: ItemProps) {
  const loader = useItemLoaderContext()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  // 同じ placementId を2つ書くと、共有状態を使うアイテムは2つが連動した1つのように振る舞う。
  // 自動で振り直すとクライアントごとにずれるので、値は変えずに知らせるだけにする
  useEffect(() => {
    if (placementIds.register(placementId)) {
      console.warn(
        `[Item] 同じ placementId の配置が重なっています（${placementId}）。<Item> の placementId はワールド内で一意にしてください`,
      )
    }
    return () => placementIds.unregister(placementId)
  }, [placementId])

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
        logLoadFailure(itemId, itemError)
        setState({ status: 'error', error: itemError })
      })
    return () => {
      cancelled = true
    }
  }, [loader, itemId])

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {state.status === 'ready' ? (
        <ItemProvider id={placementId} placedBy={null}>
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
