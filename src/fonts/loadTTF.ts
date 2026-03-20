import { MSDF, type GenerateFontResult } from '@zappar/msdf-generator'
import { FileLoader } from 'three'

interface FontInput {
  url: string
  charset: string
  fontSize?: number
  textureSize?: [number, number]
  fieldRange?: number
  padding?: number
  fixOverlaps?: boolean
}

const DEFAULTS = {
  fontSize: 48,
  textureSize: [512, 512] as [number, number],
  fieldRange: 4,
  padding: 4,
  fixOverlaps: true,
} as const

/**
 * TTF フォントを読み込み MSDF アトラスを生成する。
 * `@zappar/msdf-generator` を static import することで、
 * dynamic import がハングする Triplex 環境でも動作する。
 */
export const loadTTF = async (input: FontInput): Promise<GenerateFontResult> => {
  const loader = new FileLoader()
  loader.setResponseType('arraybuffer')
  const arrayBuffer = (await loader.loadAsync(input.url)) as ArrayBuffer

  const generator = new MSDF()
  try {
    await generator.initialize()
    return await generator.generate({
      font: new Uint8Array(arrayBuffer),
      charset: input.charset,
      fontSize: input.fontSize ?? DEFAULTS.fontSize,
      textureSize: input.textureSize ?? DEFAULTS.textureSize,
      fieldRange: input.fieldRange ?? DEFAULTS.fieldRange,
      padding: input.padding ?? DEFAULTS.padding,
      fixOverlaps: input.fixOverlaps ?? DEFAULTS.fixOverlaps,
    })
  } finally {
    generator.dispose()
  }
}
