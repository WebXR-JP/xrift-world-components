import { capturePointer } from './capturePointer'
import { useCallback, useRef, useState } from 'react'
import type { MutableRefObject, PointerEvent } from 'react'
import type { DevVRInput } from '../DevXR/types'
import { JOYSTICK_DEAD_ZONE, JOYSTICK_MAX_DISTANCE, JOYSTICK_SIZE } from './constants'
import { joystickStyle, knobStyle } from './styles'
import { calculateJoystickPosition, normalizeJoystickInput } from './utils'

interface Props {
  /** 移動の入力の書き込み先（PhysicsPlayer が毎フレーム読む） */
  inputRef: MutableRefObject<DevVRInput>
}

const CENTER = { x: 0, y: 0 }

/** 左下の仮想ジョイスティック（本番の JoystickControl と同じ見た目）。倒した向きと量で歩く */
export function Joystick({ inputRef }: Props) {
  const [knob, setKnob] = useState(CENTER)
  const [active, setActive] = useState(false)
  const centerRef = useRef(CENTER)
  const pointerIdRef = useRef<number | null>(null)

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const position = calculateJoystickPosition(
        clientX,
        clientY,
        centerRef.current.x,
        centerRef.current.y,
        JOYSTICK_MAX_DISTANCE,
      )
      setKnob(position)
      const input = normalizeJoystickInput(position.x, position.y, JOYSTICK_MAX_DISTANCE, JOYSTICK_DEAD_ZONE)
      inputRef.current.moveX = input.x
      inputRef.current.moveY = input.y
    },
    [inputRef],
  )

  const handleDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== null) return
      const rect = event.currentTarget.getBoundingClientRect()
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      pointerIdRef.current = event.pointerId
      capturePointer(event.currentTarget, event.pointerId)
      setActive(true)
      move(event.clientX, event.clientY)
    },
    [move],
  )
  const handleMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerId !== pointerIdRef.current) return
      move(event.clientX, event.clientY)
    },
    [move],
  )
  const handleUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerId !== pointerIdRef.current) return
      pointerIdRef.current = null
      setActive(false)
      setKnob(CENTER)
      inputRef.current.moveX = 0
      inputRef.current.moveY = 0
    },
    [inputRef],
  )

  return (
    <div
      style={joystickStyle(JOYSTICK_SIZE, active)}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onLostPointerCapture={handleUp}
    >
      <div style={knobStyle(knob.x, knob.y)} />
    </div>
  )
}
