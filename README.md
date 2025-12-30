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

### VideoScreen コンポーネント

ワールド内で動画を再生できるスクリーンコンポーネントです。`useInstanceState`を使用してインスタンス内の全ユーザーで再生状態が同期されます。

```tsx
import { VideoScreen } from '@xrift/world-components'

function MyWorld() {
  return (
    <>
      {/* メインスクリーン */}
      <VideoScreen
        id="main-screen"
        position={[0, 2, -5]}
        scale={[16/9 * 3, 3]}
        url="https://example.com/video.mp4"
      />

      {/* サブスクリーン */}
      <VideoScreen
        id="sub-screen"
        position={[5, 1.5, -3]}
        scale={[16/9 * 1.5, 1.5]}
      />
    </>
  )
}
```

#### Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `id` | `string` | ✓ | - | スクリーンの一意なID（インスタンス内で一意である必要があります） |
| `position` | `[number, number, number]` | - | `[0, 2, -5]` | スクリーンの位置 |
| `rotation` | `[number, number, number]` | - | `[0, 0, 0]` | スクリーンの回転 |
| `scale` | `[number, number]` | - | `[16/9 * 3, 3]` | スクリーンのサイズ [幅, 高さ] |
| `url` | `string` | - | `''` | 動画のURL |
| `playing` | `boolean` | - | `true` | 再生中かどうか |
| `currentTime` | `number` | - | `0` | 再生位置（秒） |
| `sync` | `'global' \| 'local'` | - | `'global'` | 同期モード: `global` = インスタンス全体で同期, `local` = ローカルのみ |

#### 同期モード

VideoScreenは2つの同期モードをサポートしています：

- **`sync="global"`（デフォルト）**: インスタンス内の全ユーザーで動画の状態が同期されます。シアターのメインスクリーンなど、全員で同じ動画を見る場合に使用します。
- **`sync="local"`**: ローカルのみで動作し、他のユーザーとは同期されません。個人用モニターなど、各ユーザーが別々の動画を見る場合に使用します。

```tsx
// グローバル同期（デフォルト）
<VideoScreen
  id="theater-screen"
  url="https://example.com/movie.mp4"
  sync="global"
/>

// ローカルのみ
<VideoScreen
  id="personal-monitor"
  url="https://example.com/video.mp4"
  sync="local"
/>
```

#### 状態管理

VideoScreenは`useInstanceState`を使用して以下の状態を管理します：

```tsx
interface VideoState {
  url: string          // 動画のURL
  isPlaying: boolean   // 再生中かどうか
  currentTime: number  // 現在の再生位置（秒）
  serverTime: number   // サーバータイム（VRChat方式の同期用）
}
```

#### 再生状態の制御（方法1: propsで制御）

VideoScreenはpropsで直接制御できます：

```tsx
import { VideoScreen, Interactable } from '@xrift/world-components'
import { useState } from 'react'

function MyWorld() {
  const [playing, setPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)

  return (
    <>
      <VideoScreen
        id="main-screen"
        position={[0, 2, -5]}
        scale={[16/9 * 3, 3]}
        url="https://example.com/video.mp4"
        playing={playing}
        currentTime={currentTime}
      />

      <Interactable
        id="toggle-button"
        onInteract={() => setPlaying(!playing)}
      >
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color={playing ? 'red' : 'green'} />
        </mesh>
      </Interactable>

      <Interactable
        id="seek-button"
        onInteract={() => setCurrentTime(currentTime + 10)}
      >
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="cyan" />
        </mesh>
      </Interactable>
    </>
  )
}
```

#### 再生状態の制御（方法2: useInstanceStateで制御）

VideoScreenの状態は`useInstanceState`を使って外部から制御できます：

```tsx
import { VideoScreen, useInstanceState } from '@xrift/world-components'

function MyWorld() {
  const [videoState, setVideoState] = useInstanceState('video-main-screen', {
    url: '',
    isPlaying: false,
    currentTime: 0,
    serverTime: Date.now(),
  })

  const playVideo = (url: string) => {
    setVideoState({
      url,
      isPlaying: true,
      currentTime: 0,
      serverTime: Date.now(),
    })
  }

  return (
    <>
      <VideoScreen id="main-screen" />

      <Interactable
        id="play-button"
        onInteract={() => playVideo('https://example.com/video.mp4')}
      >
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="green" />
        </mesh>
      </Interactable>
    </>
  )
}
```

#### 注意事項

- 動画URLは直接アクセス可能なMP4などの動画ファイルである必要があります
- CORSの制約により、クロスオリジンの動画を再生する場合は、動画サーバー側で適切なCORSヘッダーの設定が必要です
- 再生位置の同期はVRChat方式（サーバータイム基準）を採用しており、約0.5秒の誤差で自動補正されます
- ブラウザのautoplay policyのため、動画は初期状態でミュートされています
- 物理コライダーは含まれていません。必要な場合は別途追加してください

### ScreenShareDisplay コンポーネント

画面共有の映像を3D空間内にスクリーンとして表示するコンポーネントです。`ScreenShareContext` から映像と状態を取得します。

```tsx
import { ScreenShareDisplay } from '@xrift/world-components'

function MyWorld() {
  return (
    <>
      {/* 基本的な使い方 */}
      <ScreenShareDisplay id="screen-1" />

      {/* 位置とサイズを指定 */}
      <ScreenShareDisplay
        id="screen-2"
        position={[5, 2, -3]}
        scale={[3, 3 * (9/16)]}
      />
    </>
  )
}
```

#### Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `id` | `string` | ✓ | - | スクリーンの一意なID |
| `position` | `[number, number, number]` | - | `[0, 2, -5]` | スクリーンの位置 |
| `rotation` | `[number, number, number]` | - | `[0, 0, 0]` | スクリーンの回転 |
| `scale` | `[number, number]` | - | `[4, 4 * (9/16)]` | スクリーンのサイズ [幅, 高さ] |

#### ScreenShareContext

画面共有の状態は `ScreenShareContext` を通じて提供されます。`XRiftProvider` に `screenShareImplementation` を渡すことで設定します。

```tsx
import { XRiftProvider, ScreenShareDisplay } from '@xrift/world-components'

function App() {
  const screenShareImpl = {
    videoElement: myVideoElement,  // HTMLVideoElement
    isSharing: false,
    startScreenShare: () => { /* 共有開始処理 */ },
    stopScreenShare: () => { /* 共有停止処理 */ },
  }

  return (
    <XRiftProvider
      baseUrl="https://..."
      screenShareImplementation={screenShareImpl}
    >
      <MyWorld />
    </XRiftProvider>
  )
}
```

#### useScreenShareContext フック

コンポーネント内で画面共有の状態を取得するフックです。

```tsx
import { useScreenShareContext } from '@xrift/world-components'

function MyComponent() {
  const { videoElement, isSharing, startScreenShare, stopScreenShare } = useScreenShareContext()

  return (
    <button onClick={isSharing ? stopScreenShare : startScreenShare}>
      {isSharing ? '共有を停止' : '共有を開始'}
    </button>
  )
}
```

#### 注意事項

- `XRiftProvider` に `screenShareImplementation` を渡すことが必須です
- 映像がない場合は「クリックして画面共有」というガイドテキストが表示されます
- スクリーンをクリックすると `startScreenShare` / `stopScreenShare` が呼び出されます

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

### SpawnPoint コンポーネント

ワールド内のプレイヤーのスポーン（出現）地点を指定するコンポーネントです。開発時には位置と向きを視覚的に確認できるヘルパーが表示されます。

```tsx
import { SpawnPoint } from '@xrift/world-components'

function MyWorld() {
  return (
    <>
      {/* 原点にスポーン、正面向き */}
      <SpawnPoint />

      {/* 位置と向きを指定 */}
      <SpawnPoint position={[0, 0, 5]} yaw={180} />
    </>
  )
}
```

#### Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `position` | `[number, number, number]` | - | `[0, 0, 0]` | スポーン位置 |
| `yaw` | `number` | - | `0` | スポーン時の向き（度数法 0-360） |

#### 開発時ヘルパー

開発環境（`import.meta.env.DEV === true`）では、スポーン位置と向きを視覚的に確認できるヘルパーが表示されます：

- 半透明の円柱（下から上にかけて透明度が増すグラデーション）
- 黄緑色の矢印でスポーン方向を表示

本番ビルドではヘルパーは表示されず、コードも含まれません。

#### useSpawnPoint フック

プラットフォーム側で現在設定されているスポーン地点を取得するフックです。

```tsx
import { useSpawnPoint } from '@xrift/world-components'

function PlayerSpawner() {
  const spawnPoint = useSpawnPoint()

  useEffect(() => {
    if (spawnPoint) {
      player.position.set(...spawnPoint.position)
      player.rotation.y = THREE.MathUtils.degToRad(spawnPoint.yaw)
    }
  }, [spawnPoint])

  return null
}
```

#### 注意事項

- 1つのワールドに複数のSpawnPointがある場合、最後に設定されたものが有効になります
- `useSpawnPoint`は主にプラットフォーム側（xrift-frontend）での使用を想定しています

## 開発

```bash
# 開発モード（ウォッチモード）
npm run dev

# ビルド
npm run build
```

## ライセンス

MIT
