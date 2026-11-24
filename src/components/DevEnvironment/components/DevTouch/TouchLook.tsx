import { useEffect, type MutableRefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { Euler, type Camera } from 'three'
import { TOUCH_LOOK_MAX_PITCH, TOUCH_LOOK_MIN_DELTA, TOUCH_LOOK_SENSITIVITY } from './constants'
import { applyTouchLook } from './utils'

interface Props {
  /** false の間は見回さない（タッチの端末でないとき・VR 中） */
  enabled: boolean
  /** 画面のカメラ（スマホの「掴む」ボタンが、カメラからの距離を測るのに使う） */
  cameraRef: MutableRefObject<Camera | null>
}

const _euler = new Euler(0, 0, 0, 'YXZ')

/** 画面を 1 本の指でなぞって見回す（本番の MobileViewRotationHandler と同じ感度・上下の限界） */
export function TouchLook({ enabled, cameraRef }: Props) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    cameraRef.current = camera
  }, [camera, cameraRef])

  useEffect(() => {
    if (!enabled) return
    const canvas = gl.domElement
    let touchId: number | null = null
    let last = { x: 0, y: 0 }

    const findTouch = (touches: TouchList) => {
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === touchId) return touches[i]
      }
      return null
    }
    const handleStart = (event: TouchEvent) => {
      if (touchId !== null) return
      const touch = event.changedTouches[0]
      if (!touch) return
      touchId = touch.identifier
      last = { x: touch.clientX, y: touch.clientY }
    }
    const handleMove = (event: TouchEvent) => {
      const touch = findTouch(event.changedTouches)
      if (!touch) return
      const dx = touch.clientX - last.x
      const dy = touch.clientY - last.y
      if (Math.abs(dx) < TOUCH_LOOK_MIN_DELTA && Math.abs(dy) < TOUCH_LOOK_MIN_DELTA) return
      last = { x: touch.clientX, y: touch.clientY }
      event.preventDefault()
      _euler.setFromQuaternion(camera.quaternion, 'YXZ')
      const next = applyTouchLook(_euler.y, _euler.x, dx, dy, TOUCH_LOOK_SENSITIVITY, TOUCH_LOOK_MAX_PITCH)
      camera.quaternion.setFromEuler(_euler.set(next.pitch, next.yaw, 0))
    }
    const handleEnd = (event: TouchEvent) => {
      if (findTouch(event.changedTouches)) touchId = null
    }

    canvas.style.touchAction = 'none'
    canvas.addEventListener('touchstart', handleStart, { passive: true })
    canvas.addEventListener('touchmove', handleMove, { passive: false })
    canvas.addEventListener('touchend', handleEnd)
    canvas.addEventListener('touchcancel', handleEnd)
    return () => {
      canvas.removeEventListener('touchstart', handleStart)
      canvas.removeEventListener('touchmove', handleMove)
      canvas.removeEventListener('touchend', handleEnd)
      canvas.removeEventListener('touchcancel', handleEnd)
    }
  }, [enabled, gl, camera])

  return null
}
