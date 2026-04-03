/**
 * object-fit: contain 用の映像サイズを計算
 */
export const calculateContainSize = (
  videoWidth: number,
  videoHeight: number,
  screenWidth: number,
  screenHeight: number,
): [number, number] => {
  if (videoWidth <= 0 || videoHeight <= 0) return [screenWidth, screenHeight]

  const videoAspect = videoWidth / videoHeight
  const screenAspect = screenWidth / screenHeight

  if (videoAspect > screenAspect) {
    // 映像が横長 → 幅に合わせて高さを調整
    return [screenWidth, screenWidth / videoAspect]
  } else {
    // 映像が縦長 → 高さに合わせて幅を調整
    return [screenHeight * videoAspect, screenHeight]
  }
}
