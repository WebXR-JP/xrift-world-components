/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useViewpoint, type UseViewpointResult } from '../../hooks/useViewpoint'
import { XRiftProvider } from '../XRiftContext'
import { createDefaultViewpointImplementation, type ViewpointContextValue } from '../ViewpointContext'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('createDefaultViewpointImplementation', () => {
  it('三人称を持たない環境なので常に一人称', () => {
    const viewpoint = createDefaultViewpointImplementation()

    expect(viewpoint.viewpoint).toBe('first-person')
    expect(viewpoint.getViewpoint()).toBe('first-person')
  })
})

describe('useViewpoint', () => {
  let container: HTMLDivElement
  let root: Root
  let latest: UseViewpointResult | null

  const Probe = () => {
    latest = useViewpoint()
    return null
  }

  const render = (viewpointImplementation?: ViewpointContextValue) => {
    act(() => {
      root.render(
        <XRiftProvider baseUrl="" viewpointImplementation={viewpointImplementation}>
          <Probe />
        </XRiftProvider>,
      )
    })
  }

  beforeEach(() => {
    latest = null
    container = document.createElement('div')
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
  })

  it('注入されなければ一人称', () => {
    render()

    expect(latest?.viewpoint).toBe('first-person')
    expect(latest?.isThirdPerson).toBe(false)
  })

  it('注入された視点を返し、差し替えると更新される', () => {
    render({ viewpoint: 'third-person', getViewpoint: () => 'third-person' })
    expect(latest?.isThirdPerson).toBe(true)

    render({ viewpoint: 'first-person', getViewpoint: () => 'first-person' })
    expect(latest?.viewpoint).toBe('first-person')
    expect(latest?.isThirdPerson).toBe(false)
  })

  it('getViewpoint は注入側の関数をそのまま返す（useFrame から最新値を読める）', () => {
    let current: ViewpointContextValue['viewpoint'] = 'first-person'
    render({ viewpoint: 'first-person', getViewpoint: () => current })

    current = 'third-person'

    expect(latest?.getViewpoint()).toBe('third-person')
  })
})
