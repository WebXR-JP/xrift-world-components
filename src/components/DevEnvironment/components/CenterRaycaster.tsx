import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import type { Object3D } from 'three'
import { LAYERS } from '../../../constants/layers'
import { INTERACT_DISTANCE } from '../constants'
import { invokeInteract } from '../utils'

interface Props {
  onHitChange: (hit: boolean) => void
  /** false を返す間はクリックしてもインタラクトしない（物を掴んでいる間はクリックが「使う」になる） */
  canInteract?: () => boolean
}

const NDC_CENTER = new Vector2(0, 0)

export function CenterRaycaster({ onHitChange, canInteract }: Props) {
  const { camera, scene } = useThree()
  const raycasterRef = useRef(new Raycaster())
  const currentHitRef = useRef<Object3D | null>(null)
  const wasHitRef = useRef(false)

  useEffect(() => {
    const handleClick = () => {
      if (canInteract && !canInteract()) return
      invokeInteract(currentHitRef.current)
    }
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('mousedown', handleClick)
    }
  }, [canInteract])

  useFrame(() => {
    const raycaster = raycasterRef.current
    raycaster.far = INTERACT_DISTANCE
    raycaster.layers.set(LAYERS.INTERACTABLE)
    raycaster.setFromCamera(NDC_CENTER, camera)
    const hits = raycaster.intersectObjects(scene.children, true)
    currentHitRef.current = hits.length > 0 ? hits[0].object : null

    const isHit = currentHitRef.current !== null
    if (isHit !== wasHitRef.current) {
      wasHitRef.current = isHit
      onHitChange(isHit)
    }
  })

  return null
}
