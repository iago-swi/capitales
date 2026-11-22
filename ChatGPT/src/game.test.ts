import { describe, expect, it } from 'vitest'
import { countries } from './data'
import { createQuestion } from './game'
import atlas from 'world-atlas/countries-10m.json'

describe('createQuestion', () => {
  it('contains all 195 sovereign states with unique map identifiers', () => {
    expect(countries).toHaveLength(195)
    expect(new Set(countries.map((country) => country.id)).size).toBe(195)
    const mapIds = new Set((atlas as { objects: { countries: { geometries: Array<{ id: string }> } } }).objects.countries.geometries.map((item) => Number(item.id)))
    expect(countries.every((country) => mapIds.has(country.id))).toBe(true)
  })
  it('creates four unique choices containing the correct capital', () => {
    const question = createQuestion(countries, undefined, () => 0.42)
    expect(question.choices).toHaveLength(4)
    expect(new Set(question.choices).size).toBe(4)
    expect(question.choices).toContain(question.country.capital)
  })
  it('does not repeat the previous country', () => {
    const question = createQuestion(countries, countries[0].id, () => 0)
    expect(question.country.id).not.toBe(countries[0].id)
  })
})
