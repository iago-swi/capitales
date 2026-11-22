export type Mode = 'name' | 'place'
export type Location = [number, number]
export const duration = 15000
export const multiplier = (streak: number) => Math.min(2, 1 + Math.max(0, streak - 1) / 4)
export const targetKm = (reach: number) => Math.max(25, reach * 0.15)
export const signed = (points: number) => points > 0 ? '+' + points : String(points)
export const qualifies = (points: number, board: {score: number}[]) =>
  points > 0 && (board.length < 10 || points > [...board].sort((a,b) => b.score-a.score)[9].score)

export function distanceKm(a: Location, b: Location) {
  const rad = Math.PI / 180
  const h = Math.sin((a[1]-b[1])*rad/2)**2 +
    Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((a[0]-b[0])*rad/2)**2
  return 12742 * Math.asin(Math.sqrt(Math.min(1,h)))
}

export function award(mode: Mode, correct: boolean, distance: number | null, reach: number, ms: number, previous: number) {
  const target = targetKm(reach)
  const hit = mode === 'name' ? correct : distance !== null && distance <= target
  const streak = hit ? previous + 1 : 0
  const speed = hit ? 100 * Math.min(duration, Math.max(0, ms)) / duration : 0
  const full = (100 + speed) * multiplier(streak)
  let points = hit ? Math.round(full) : 0
  if (mode === 'place') {
    const zero = 2 * target
    if (distance === null) points = -100
    else if (distance >= zero) {
      const span = Math.max(reach, 1.5 * zero) - zero
      points = -Math.round(100 * Math.min(1, (distance-zero)/span)) || 0
    } else points = Math.round(full * Math.min(1,(zero-distance)/(zero-25)))
  }
  return { points, streak, hit }
}
