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

### useInstanceState フック

インスタンス全体で同期される状態を管理するフックです。React の `useState` と同じAPIを提供します。

```tsx
import { useInstanceState } from '@xrift/world-components'

function MyWorld() {
  // インスタンス全体で同期される状態
  const [buttonState, setButtonState] = useInstanceState('button-1', { enabled: false })

  return (
    <Interactable
      id="button-1"
      onInteract={() => {
        // 状態を更新（全てのクライアントで同期される）
        setButtonState({ enabled: !buttonState.enabled })
      }}
    >
      <mesh>
        <meshStandardMaterial color={buttonState.enabled ? 'green' : 'red'} />
      </mesh>
    </Interactable>
  )
}
```

#### 使用方法

```tsx
const [state, setState] = useInstanceState<T>(stateId, initialState)
```

- `stateId`: 状態の一意識別子（インスタンス内で一意である必要があります）
- `initialState`: 初期状態
- `setState`: 状態を更新する関数（直接値 or 関数型アップデートをサポート）

#### 関数型アップデート

```tsx
// 直接値を設定
setState({ enabled: true })

// 前の状態を基に更新
setState(prev => ({ enabled: !prev.enabled }))
```

#### 注意事項

- Context未設定時はローカル `useState` として動作します
- プラットフォーム側（xrift-frontend）がWebSocket実装を注入することで、インスタンス全体での同期が有効になります
- 状態はシリアライズ可能な値（JSON）である必要があります

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

### Mirror コンポーネント

リアルタイムで周囲を反射する鏡のコンポーネントです。

```tsx
import { Mirror } from '@xrift/world-components'

function MyWorld() {
  return (
    <>
      {/* 基本的な使い方 */}
      <Mirror position={[0, 2.5, -5]} size={[4, 3]} />

      {/* 高解像度の鏡 */}
      <Mirror
        position={[5, 2.5, -5]}
        size={[3, 3]}
        textureResolution={1024}
      />

      {/* 金色の鏡 */}
      <Mirror
        position={[-5, 2.5, -5]}
        size={[2, 4]}
        color={0xffd700}
      />
    </>
  )
}
```

#### Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `position` | `[number, number, number]` | - | `[0, 2.5, -9]` | 鏡の位置 |
| `rotation` | `[number, number, number]` | - | `[0, 0, 0]` | 鏡の回転 |
| `size` | `[number, number]` | - | `[8, 5]` | 鏡のサイズ [幅, 高さ] |
| `color` | `number` | - | `0xcccccc` | 反射の色（16進数カラー） |
| `textureResolution` | `number` | - | `512` | 反射テクスチャの解像度。sizeの比率に応じて自動調整されます |

#### 注意事項

- 物理コライダーは含まれていません。必要な場合は`@react-three/rapier`などを使って別途追加してください
- Meta Quest（Android Chrome）での互換性のため、マルチサンプリングは無効化されています

### Skybox コンポーネント

画像を使わずにグラデーションで空を表現するシンプルなskyboxコンポーネントです。

```tsx
import { Skybox } from '@xrift/world-components'

function MyWorld() {
  return (
    <>
      {/* 基本的な使い方（デフォルトは空色→白） */}
      <Skybox />

      {/* 夕焼け風 */}
      <Skybox topColor={0xff6b35} bottomColor={0xffd93d} />

      {/* 夜空風 */}
      <Skybox topColor={0x000033} bottomColor={0x000011} />
    </>
  )
}
```

#### Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `topColor` | `number` | - | `0x87ceeb` | 上部の色（16進数カラー） |
| `bottomColor` | `number` | - | `0xffffff` | 下部の色（16進数カラー） |
| `offset` | `number` | - | `0` | グラデーションの開始位置 |
| `exponent` | `number` | - | `1` | グラデーションの範囲 |

#### 注意事項

- シェーダーを使用した軽量な実装です
- シーンの背景色も自動的に設定されます

## 開発

```bash
# 開発モード（ウォッチモード）
npm run dev

# ビルド
npm run build
```

## ライセンス

MIT
