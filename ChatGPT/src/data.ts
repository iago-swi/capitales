import catalogue from './countries.json'

export type Country = {
  id: number
  name: string
  nameFr: string
  capital: string
  longitude: number
  latitude: number
  region: string
}

export const countries: Country[] = catalogue
