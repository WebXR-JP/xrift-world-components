import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'
import type { Object3D } from 'three'
import { InstanceStateProvider, type InstanceStateContextValue } from './InstanceStateContext'
import { ScreenShareProvider, type ScreenShareContextValue } from './ScreenShareContext'

export interface XRiftContextValue {
  /**
   * ワールドのベースURL（CDNのディレクトリパス）
   * 例: 'https://assets.xrift.net/users/xxx/worlds/yyy/hash123/'
   */
  baseUrl: string
  /**
   * 現在レイキャストでターゲットされているオブジェクト
   * xrift-frontend側のRaycastDetectorが設定する
   */
  currentTarget: Object3D | null
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
   * 指定しない場合は ScreenShareContext が提供されない
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

  // オブジェクトの登録
  const registerInteractable = useCallback((object: Object3D) => {
    interactableObjects.add(object)
  }, [interactableObjects])

  // オブジェクトの登録解除
  const unregisterInteractable = useCallback((object: Object3D) => {
    interactableObjects.delete(object)
  }, [interactableObjects])

  // 子要素（ScreenShareProvider でラップするかどうか）
  const content = (
    <InstanceStateProvider implementation={instanceStateImplementation}>{children}</InstanceStateProvider>
  )

  return (
    <XRiftContext.Provider
      value={{
        baseUrl,
        currentTarget,
        interactableObjects,
        registerInteractable,
        unregisterInteractable,
      }}
    >
      {screenShareImplementation ? (
        <ScreenShareProvider value={screenShareImplementation}>{content}</ScreenShareProvider>
      ) : (
        content
      )}
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
