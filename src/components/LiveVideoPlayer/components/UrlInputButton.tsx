import { memo, useCallback } from 'react'
import { Text } from '@react-three/drei'
import { Interactable } from '../../Interactable'
import { useTextInputContext } from '../../../contexts/TextInputContext'
import type { UrlInputButtonProps } from '../types'

export const UrlInputButton = memo(
  ({ id, position, size, currentUrl, onUrlChange }: UrlInputButtonProps) => {
    const { requestTextInput } = useTextInputContext()

    const handleInteract = useCallback(() => {
      requestTextInput({
        id: `${id}-url-input`,
        placeholder: 'ライブストリームのURLを入力',
        initialValue: currentUrl,
        onSubmit: (value) => {
          if (value && value.trim() !== '') {
            onUrlChange(value.trim())
          }
        },
      })
    }, [id, currentUrl, onUrlChange, requestTextInput])

    return (
      <group position={position}>
        <Interactable
          id={id}
          onInteract={handleInteract}
          interactionText="URL変更"
        >
          <mesh>
            <circleGeometry args={[size / 2, 32]} />
            <meshBasicMaterial color="#444444" />
          </mesh>
        </Interactable>
        <Text
          position={[0, 0, 0.01]}
          fontSize={size * 0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          🔗
        </Text>
      </group>
    )
  }
)

UrlInputButton.displayName = 'UrlInputButton'
