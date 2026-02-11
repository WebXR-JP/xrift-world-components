export const defaultFormatTimestamp = () => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const MM = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${hh}:${min}:${ss}`
}

export const getLeaderUserId = (users: Array<{ id: string }>) =>
  users.map((user) => user.id).sort()[0]
