import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { Object3D } from 'three'
import { InstanceStateProvider, type InstanceStateContextValue } from './InstanceStateContext'
import { ScreenShareProvider, type ScreenShareContextValue } from './ScreenShareContext'

// デフォルトの画面共有実装（開発環境用）
const createDefaultScreenShareImplementation = (): ScreenShareContextValue => ({
  videoElement: null,
  isSharing: false,
  startScreenShare: () => console.log('[ScreenShare] startScreenShare called'),
  stopScreenShare: () => console.log('[ScreenShare] stopScreenShare called'),
})

export interface XRiftContextValue {
  /**
   * ワールドのベースURL（CDNのディレクトリパス）
   * 例: 'https://assets.xrift.net/users/xxx/worlds/yyy/hash123/'
   */
  baseUrl: string
  /**
   * インタラクト可能なオブジェクトのセット
   * レイキャストのパフォーマンス最適化のために使用
   */
  interactableObjects: Set<Object3D>
  /**
   * インタラクト可能なオブジェクトを登録
   */
  registerInteractable: (object: Object3D) => void
  /**
   * インタラクト可能なオブジェクトの登録を解除
   */
  unregisterInteractable: (object: Object3D) => void
  // 将来的に追加可能な値
  // worldId?: string
  // instanceId?: string
  // config?: WorldConfig
}

/**
 * 現在のターゲットオブジェクトを提供するContext
 * 頻繁に更新されるため、XRiftContextから分離してパフォーマンスを最適化
 */
export const CurrentTargetContext = createContext<Object3D | null>(null)

/**
 * XRift ワールドの情報を提供するContext
 * ワールド側でこのContextを直接参照して情報を取得できる
 */
export const XRiftContext = createContext<XRiftContextValue | null>(null)

interface Props {
  baseUrl: string
  currentTarget?: Object3D | null
  /**
   * インスタンス状態管理の実装（オプション）
   * 指定しない場合はデフォルト実装（ローカルstate）が使用される
   */
  instanceStateImplementation?: InstanceStateContextValue
  /**
   * 画面共有の実装（オプション）
   * 指定しない場合はデフォルト実装（no-op）が使用される
   */
  screenShareImplementation?: ScreenShareContextValue
  children: ReactNode
}

/**
 * XRift ワールドの情報を提供するContextProvider
 * Module Federationで動的にロードされたワールドコンポーネントに
 * 必要な情報を注入するために使用
 */
export const XRiftProvider = ({
  baseUrl,
  currentTarget = null,
  instanceStateImplementation,
  screenShareImplementation,
  children,
}: Props) => {
  // インタラクト可能なオブジェクトの管理
  const [interactableObjects] = useState(() => new Set<Object3D>())

  // 画面共有の実装（指定がない場合はデフォルト実装を使用）
  const screenShareImpl = useMemo(
    () => screenShareImplementation ?? createDefaultScreenShareImplementation(),
    [screenShareImplementation],
  )

  // オブジェクトの登録
  const registerInteractable = useCallback((object: Object3D) => {
    interactableObjects.add(object)
  }, [interactableObjects])

  // オブジェクトの登録解除
  const unregisterInteractable = useCallback((object: Object3D) => {
    interactableObjects.delete(object)
  }, [interactableObjects])

  // XRiftContextの値をメモ化（currentTarget以外の値が変わらない限り再作成しない）
  const xriftContextValue = useMemo(
    () => ({
      baseUrl,
      interactableObjects,
      registerInteractable,
      unregisterInteractable,
    }),
    [baseUrl, interactableObjects, registerInteractable, unregisterInteractable],
  )

  return (
    <XRiftContext.Provider value={xriftContextValue}>
      <CurrentTargetContext.Provider value={currentTarget}>
        <ScreenShareProvider value={screenShareImpl}>
          <InstanceStateProvider implementation={instanceStateImplementation}>
            {children}
          </InstanceStateProvider>
        </ScreenShareProvider>
      </CurrentTargetContext.Provider>
    </XRiftContext.Provider>
  )
}

/**
 * XRift ワールドの情報を取得するhook
 * ワールドプロジェクト側でアセットの相対パスを絶対パスに変換する際に使用
 *
 * @example
 * const { baseUrl } = useXRift()
 * const gltf = useGLTF(baseUrl + 'assets/model.glb')
 *
 * @throws {Error} XRiftProvider の外で呼び出された場合
 */
export const useXRift = (): XRiftContextValue => {
  const context = useContext(XRiftContext)

  if (!context) {
    throw new Error('useXRift must be used within XRiftProvider')
  }

  return context
}

/**
 * 現在のターゲットオブジェクトを取得するhook
 * currentTargetの変更時のみ再レンダリングされる（パフォーマンス最適化）
 *
 * @example
 * const currentTarget = useCurrentTarget()
 * const isTargeted = currentTarget?.uuid === myObject.uuid
 */
export const useCurrentTarget = (): Object3D | null => {
  return useContext(CurrentTargetContext)
}
