import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import type { Object3D } from 'three'
import { LAYERS } from '../../../constants/layers'

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
      let node = currentHitRef.current
      while (node) {
        const userData = node.userData as {
          onInteract?: (id: string) => void
          id?: string
        }
        if (typeof userData.onInteract === 'function') {
          userData.onInteract(userData.id ?? '')
          return
        }
        node = node.parent
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('mousedown', handleClick)
    }
  }, [canInteract])

  useFrame(() => {
    const raycaster = raycasterRef.current
    raycaster.far = 3.5
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
