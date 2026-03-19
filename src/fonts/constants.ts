/** Noto Sans JP Regular (CDN) */
export const JAPANESE_FONT_URL =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf'

/** MSDF 生成に含めるベース文字セット（ひらがな・カタカナ・常用句読点・ASCII） */
export const JAPANESE_BASE_CHARSET = [
  // ASCII
  ' !"#$%&\'()*+,-./0123456789:;<=>?@',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`',
  'abcdefghijklmnopqrstuvwxyz{|}~',
  // ひらがな
  'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞ',
  'ただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽ',
  'まみむめもゃやゅゆょよらりるれろゎわゐゑをん',
  // カタカナ
  'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾ',
  'タダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポ',
  'マミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ',
  // 日本語句読点・記号
  '。、・「」『』（）〔〕【】〜ー―…‥々〇〈〉《》！？',
  '　．，：；／￥＄＃＆＊＋−＝｜＜＞＿',
  // 長音・半濁点
  'ーｰ゛゜',
].join('')

/** MSDF テクスチャサイズ（日本語文字数に対応するため大きめ） */
export const JAPANESE_TEXTURE_SIZE: [number, number] = [2048, 2048]
