---
"@xrift/world-components": minor
---

DevEnvironment（ワールドの `npm run dev`）から VR に入れるようにする。

- 画面下の真ん中の「VR に入る」ボタンで入る。localhost ではヘッドセットが無くても、エミュレーター（IWER・Meta Quest 3 相当）で PC から試せる
- 左スティックで移動、右スティックで 45° スナップ回転、右 A でジャンプ・降車、トリガー（手はピンチ）でレイの先の `Interactable` を押す
- 部屋の中を実際に歩いた分だけ体も動く。VR でも座れる
- 依存に `@react-three/xr`・`iwer`・`@iwer/devui` を追加
