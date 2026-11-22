import type { Country } from './data'

export type Question = { country: Country; choices: string[] }
function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let i = result.length-1; i > 0; i--) {
    const j = Math.floor(random()*(i+1))
    ;[result[i],result[j]] = [result[j],result[i]]
  }
  return result
}
const alternatives: Record<number,string[]> = {
  710: ['Pretoria','Cape Town','Bloemfontein'], 68: ['Sucre','La Paz'],
  144: ['Colombo','Sri Jayawardenepura Kotte'], 748: ['Mbabane','Lobamba'],
  528: ['Amsterdam','The Hague'], 204: ['Porto-Novo','Cotonou'],
  275: ['Ramallah','Jerusalem','East Jerusalem']
}
function questionFor(country: Country, pool: Country[], random: () => number): Question {
  const excluded = new Set([country.capital,...(alternatives[country.id] ?? [])])
  const candidates = pool.filter(c => !excluded.has(c.capital))
  const names = [...shuffle(candidates.filter(c => c.region === country.region),random),
    ...shuffle(candidates.filter(c => c.region !== country.region),random)].map(c=>c.capital)
  return {country, choices:shuffle([country.capital,...Array.from(new Set(names)).slice(0,3)],random)}
}
export function createQuestion(pool: Country[], previousId?: number, random = Math.random) {
  return questionFor(shuffle(pool.filter(c => c.id !== previousId),random)[0],pool,random)
}
export function expedition(pool: Country[]) {
  return shuffle(pool,Math.random).slice(0,10).map(country=>questionFor(country,pool,Math.random))
}
