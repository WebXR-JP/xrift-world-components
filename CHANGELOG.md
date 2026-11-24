# @xrift/world-components

## 0.68.0

### Minor Changes

- 1419dde: DevEnvironment の VR で掴めるようにする（本番と同じ操作）
  
  - グリップを握る: 手で触れている物を掴む（手にくっつく）。無ければレイの先の物を掴む（手の先に浮く）
  - グリップを離す: 置く。持っている手のトリガーで「使う」（onUseStart / onUseEnd）
  - 右スティック上下: レイの先に浮かせている物を遠ざける・近づける
  - VR を抜けたら、VR で持っていた物を離す
  - VR 中は画面のクロスヘアとマウスロックの案内を出さない

## 0.67.0

### Minor Changes

- 5779c60: DevEnvironment（ワールドの `npm run dev`）から VR に入れるようにする。
  
  - 画面下の真ん中の「VR に入る」ボタンで入る。localhost ではヘッドセットが無くても、エミュレーター（IWER・Meta Quest 3 相当）で PC から試せる
  - 左スティックで移動、右スティックで 45° スナップ回転、右 A でジャンプ・降車、トリガー（手はピンチ）でレイの先の `Interactable` を押す
  - 部屋の中を実際に歩いた分だけ体も動く。VR でも座れる
  - 依存に `@react-three/xr`・`iwer`・`@iwer/devui` を追加
