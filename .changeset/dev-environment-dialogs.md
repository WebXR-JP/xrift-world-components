---
"@xrift/world-components": minor
---

DevEnvironment の確認画面（useConfirm）と文字入力（TextInput）を本番と同じにする

- これまではブラウザの confirm・prompt だった（VR では見えない）
- PC は本番と同じ見た目の確認画面（Esc でキャンセル・Enter で OK）と入力欄（Enter か ✓ で確定・Esc でやめる）
- VR の確認は目の前に 3D のパネルを出し、レイで押す。右の B でキャンセル
- VR 中の文字入力は、本番と同じく VR を抜けてから入力欄を出す
- 確認画面を開いている間は、後ろの物を押さない・画面の中で押したキーで歩かない
