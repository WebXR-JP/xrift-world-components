import { Suspense } from 'react'
import { Fullscreen, Container } from '@react-three/uikit'
import { TroikaText } from '../components/TroikaText'

export function TroikaTextScene() {
  return (
    <Suspense fallback={null}>
      <Fullscreen flexDirection="column" alignItems="center" gap={20} pixelSize={0.01} paddingTop={100}>
        {/* 単体テスト */}
        <TroikaText fontSize={32} color={0x333333}>
          こんにちは世界！Hello World!
        </TroikaText>

        {/* flexbox レイアウトテスト */}
        <Container flexDirection="row" gap={10} alignItems="center">
          <TroikaText fontSize={24} color={0x666666}>
            URLを入力してください
          </TroikaText>
          <Container width={200} height={40} backgroundColor={0x3b82f6} borderRadius={4} />
        </Container>

        {/* 複数行テスト */}
        <Container width={400} padding={16} backgroundColor={0xf3f4f6} borderRadius={8}>
          <TroikaText fontSize={18} color={0x374151}>
            日本語テキストのテスト。troika-three-text を使用して、charset
            指定なしで日本語を表示しています。改行も自動で行われます。
          </TroikaText>
        </Container>

        {/* fontSize / color バリエーション */}
        <Container flexDirection="row" gap={16} alignItems="flex-end">
          <TroikaText fontSize={12} color={0x9ca3af}>
            12px
          </TroikaText>
          <TroikaText fontSize={18} color={0x6b7280}>
            18px
          </TroikaText>
          <TroikaText fontSize={24} color={0x374151}>
            24px
          </TroikaText>
          <TroikaText fontSize={32} color={0x111827}>
            32px
          </TroikaText>
        </Container>
      </Fullscreen>
    </Suspense>
  )
}
