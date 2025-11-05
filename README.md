# @xrift/world-components

Xrift ワールド開発用の共有コンポーネントとユーティリティライブラリです。

## インストール

```bash
npm install @xrift/world-components
```

## 必要な依存関係

以下のパッケージがpeerDependenciesとして必要です：

```json
{
  "react": "^18.0.0 || ^19.0.0",
  "@react-three/fiber": "^8.0.0",
  "@react-three/drei": "^9.0.0",
  "three": "^0.150.0"
}
```

## 機能

### XRiftContext

ワールドの基本情報（ベースURLなど）を提供するContextです。

```tsx
import { XRiftProvider, useXRift } from '@xrift/world-components'

// Providerでワールドをラップ
function App() {
  return (
    <XRiftProvider baseUrl="https://assets.xrift.net/users/xxx/worlds/yyy/hash123/">
      <MyWorld />
    </XRiftProvider>
  )
}

// ワールド内でbaseUrlを取得
function MyWorld() {
  const { baseUrl } = useXRift()
  const gltf = useGLTF(baseUrl + 'assets/model.glb')

  return <primitive object={gltf.scene} />
}
```

### Interactable コンポーネント

3Dオブジェクトをインタラクション可能にするラッパーコンポーネントです。

```tsx
import { Interactable } from '@xrift/world-components'

function MyWorld() {
  const handleButtonClick = (id: string) => {
    console.log(`${id} がクリックされました！`)
  }

  return (
    <Interactable
      id="my-button"
      onInteract={handleButtonClick}
      interactionText="ボタンを押す"
    >
      <mesh position={[0, 1, -3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </Interactable>
  )
}
```

#### Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `id` | `string` | ✓ | - | オブジェクトの一意なID |
| `onInteract` | `(id: string) => void` | ✓ | - | インタラクション時のコールバック |
| `interactionText` | `string` | - | `"クリックする"` | インタラクション時に表示するテキスト |
| `enabled` | `boolean` | - | `true` | インタラクション可能かどうか |
| `children` | `ReactNode` | ✓ | - | 3Dオブジェクト |

## 開発

```bash
# 開発モード（ウォッチモード）
npm run dev

# ビルド
npm run build
```

## ライセンス

MIT
