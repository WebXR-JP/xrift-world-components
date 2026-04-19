import {
  FloatType,
  HalfFloatType,
  type TextureDataType,
  UnsignedByteType,
} from 'three'

const OUTPUT_BUFFER_TYPE_MAP: Record<string, TextureDataType> = {
  UnsignedByteType,
  HalfFloatType,
  FloatType,
}

export function toThreeOutputBufferType(value: string | null | undefined): TextureDataType | undefined {
  if (!value) return undefined
  return OUTPUT_BUFFER_TYPE_MAP[value]
}
