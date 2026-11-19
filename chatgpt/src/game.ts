import type { Country } from './data'

export type Question = { country: Country; choices: string[] }

export function createQuestion(pool: Country[], previousId?: number, random = Math.random): Question {
  const eligible = pool.filter((item) => item.id !== previousId)
  const country = eligible[Math.floor(random() * eligible.length)] ?? pool[0]
  const regional = pool.filter((item) => item.id !== country.id && item.region === country.region)
  const others = pool.filter((item) => item.id !== country.id && item.region !== country.region)
  const shuffled = [...regional, ...others].sort(() => random() - 0.5)
  const choices = [country.capital, ...shuffled.slice(0, 3).map((item) => item.capital)]
    .sort(() => random() - 0.5)
  return { country, choices }
}
