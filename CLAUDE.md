# xrift-world-components

このプロジェクトは、React Three Fiberベースの共有コンポーネントライブラリです。できるだけprimitiveでシンプルなコンポーネントを提供し、ユーザーが柔軟に拡張・カスタマイズできる設計を心がけています。

## 開発ガイドライン

### コンポーネント設計の原則

### Primitiveなコンポーネントを作る際の学び

1. **ユーザーとの対話で仕様を詰める**
   - パラメータの意味をユーザーに説明し、公開すべきか・固定値にすべきか判断を仰ぐ
   - 技術的な詳細（例: `clipBias`）は固定値にし、ユーザーが気にする部分（例: 解像度）だけを公開する
   - 複数のパラメータを組み合わせて、より直感的な単一パラメータにできないか検討する
     - 例: `textureWidth/Height` → `textureResolution`（sizeの比率から自動計算）

2. **既存コードの移行アプローチ**
   - 元の実装を理解した上で、不要な部分（フレーム、物理コライダーなど）を削ぎ落とす
   - 依存関係を最小限にする（物理エンジンなどは利用者が必要に応じて追加）
   - ドキュメントに「注意事項」として、何が含まれていないかを明記する

3. **他リポジトリのコード確認**
   - `gh api repos/owner/repo/git/trees/branch?recursive=1` でファイル一覧を取得
   - `gh api repos/owner/repo/contents/path/to/file` でファイル内容を取得（base64デコードが必要）

## 開発ルール

### テスト
- **utils.ts ファイルで切り出された純粋関数は必ずテストを作成する**
- React に依存しない関数は単体テストしやすく、バグの早期発見に重要
- テストファイルは同階層の `__tests__` ディレクトリに `[filename].test.ts` として配置
- 浮動小数点計算を含む場合は `toBeCloseTo()` を使用して精度問題を回避

### コーディング規約

#### 早期return（Early Return）の活用
- **if文のネストは積極的に早期returnで浅くする**
- 条件分岐では否定条件を先に判定し、該当しない場合は早期returnする
- **早期returnの場合はブロック `{}` を省略して1行で書く**: `if (!data) return`

```typescript
// ❌ 悪い例: ネストが深い
const processData = (data) => {
  if (data) {
    if (data.isValid) {
      // メインの処理
    }
  }
}

// ✅ 良い例: 早期returnでネストを浅く
const processData = (data) => {
  if (!data) return
  if (!data.isValid) return
  // メインの処理
}
```

#### useState のデフォルト値における参照同一性
- **配列・オブジェクトリテラルを直接useStateに渡すことを禁止**

```typescript
// ❌ 悪い例
const [items, setItems] = useState<string[]>([])

// ✅ 良い例: 定数として切り出す
const DEFAULT_ITEMS: string[] = []
const [items, setItems] = useState(DEFAULT_ITEMS)

// ✅ または初期化関数を使用
const [items, setItems] = useState(() => [])
```

#### export default の禁止
- **`export default` を基本的に禁止し、名前付きエクスポートを使用する**

```typescript
// ❌ 悪い例
export default function MyComponent() {}

// ✅ 良い例
export function MyComponent() {}
```

#### 純粋関数優先の原則
- **ロジックは可能な限り純粋関数として切り出し、hooks化しすぎない**
- hooks は「React の状態管理やライフサイクルが必要な場合」のみ使用する

**判断基準**:
- 引数から結果を計算するだけ → 純粋関数（utils.ts）
- React の状態（useState）を管理 → hooks
- ライフサイクル（useEffect）が必要 → hooks

#### Props型の命名規則
- **コンポーネントのProps型は「Props」で統一する**
- コンポーネント名を接頭辞として付けない（ファイル内で自明なため）

```typescript
// ❌ 悪い例
interface MyComponentProps { }

// ✅ 良い例
interface Props { }
```

### ファイル構成ルール
- **index.tsx**: メインとなるコンポーネントファイル（必須）
- **types.ts**: そのコンポーネントで使用する型定義
- **hooks.ts**: hooks が肥大化した場合に同階層に切り出し
- **utils.ts**: React に依存しない純粋な関数を切り出し（テストしやすくするため）
- **constants.ts**: そのコンポーネント固有の定数
- **classes/**: クラスベースの実装をまとめるディレクトリ（Strategy パターンなど）
- **__tests__/**: そのコンポーネントに関するテストファイルを格納

### Colocation（関連ファイルの近接配置）
- コンポーネント、スタイル、hooks、テスト、型定義など、関連するすべてのファイルを可能な限り同じディレクトリに配置する

## 関連リポジトリ

| リポジトリ | 説明 |
|-----------|------|
| [xrift-docs](https://github.com/WebXR-JP/xrift-docs) | ドキュメント |
| [xrift-frontend](https://github.com/WebXR-JP/xrift-frontend) | フロントエンド |
| [xrift-backend](https://github.com/WebXR-JP/xrift-backend) | バックエンド |
| [xrift-world-template](https://github.com/WebXR-JP/xrift-world-template) | ワールドテンプレート |
| [xrift-cli](https://github.com/WebXR-JP/xrift-cli) | CLI |
