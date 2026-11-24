---
"@xrift/world-components": minor
---

DevEnvironment の World Storage（useWorldStorage）を localStorage に保存し、リロードしても残るようにする

- これまではメモリだけで、リロードすると消えていた
- 本番と同じ制限（キーの形式・1 件 100KB・キー数・合計 10MB）で、同じエラーコードを返す
- 保存先のキーは `DevEnvironment` の `worldStorageKey`（既定: `xrift-dev-world-storage`）で変えられる
