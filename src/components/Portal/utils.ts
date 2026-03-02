/**
 * パーティクルの初期位置を生成する
 * 渦巻き軌道上にランダムに配置
 */
export const generateParticlePositions = (count: number, radius: number, aspectRatio: number): Float32Array => {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * radius
    const x = Math.cos(angle) * dist
    const y = Math.sin(angle) * dist * aspectRatio
    const z = (Math.random() - 0.5) * 0.2

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }

  return positions
}

/**
 * パーティクルの初期速度パラメータを生成する
 * 各パーティクルの角速度・半径方向速度の基準値
 */
export const generateParticleVelocities = (count: number): Float32Array => {
  const velocities = new Float32Array(count * 2) // [angularSpeed, radialPhase] per particle

  for (let i = 0; i < count; i++) {
    velocities[i * 2] = 0.5 + Math.random() * 1.5 // 角速度: 0.5〜2.0
    velocities[i * 2 + 1] = Math.random() * Math.PI * 2 // 初期位相
  }

  return velocities
}
