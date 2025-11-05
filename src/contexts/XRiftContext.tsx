import { createContext, type ReactNode, useContext, useState, useCallback } from 'react'

/**
 * インタラクタブルオブジェクトの定義
 */
export interface InteractableObject {
  /** オブジェクトの一意なID */
  id: string
  /** インタラクションのタイプ（現在は 'button' のみ） */
  type: 'button'
  /** インタラクション時に表示するテキスト */
  interactionText: string
  /** インタラクション時のコールバック */
  onInteract: () => void
}

export interface XRiftContextValue {
  /**
   * ワールドのベースURL（CDNのディレクトリパス）
   * 例: 'https://assets.xrift.net/users/xxx/worlds/yyy/hash123/'
   */
  baseUrl: string
  /**
   * インタラクタブルオブジェクトを登録する
   */
  registerInteractable: (obj: InteractableObject) => void
  /**
   * インタラクタブルオブジェクトの登録を解除する
   */
  unregisterInteractable: (id: string) => void
  /**
   * 登録済みのインタラクタブルオブジェクト一覧
   */
  interactableObjects: Map<string, InteractableObject>
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
  children: ReactNode
}

/**
 * XRift ワールドの情報を提供するContextProvider
 * Module Federationで動的にロードされたワールドコンポーネントに
 * 必要な情報を注入するために使用
 */
export const XRiftProvider = ({ baseUrl, children }: Props) => {
  const [interactableObjects, setInteractableObjects] = useState<Map<string, InteractableObject>>(
    new Map()
  )

  const registerInteractable = useCallback((obj: InteractableObject) => {
    setInteractableObjects((prev) => {
      const next = new Map(prev)
      next.set(obj.id, obj)
      return next
    })
  }, [])

  const unregisterInteractable = useCallback((id: string) => {
    setInteractableObjects((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  return (
    <XRiftContext.Provider
      value={{
        baseUrl,
        registerInteractable,
        unregisterInteractable,
        interactableObjects,
      }}
    >
      {children}
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
