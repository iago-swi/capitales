import { geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import atlas from 'world-atlas/countries-10m.json'
import type { Country } from './data'
import { copy, countryName, type Language } from './i18n'

type Atlas = { objects: { countries: unknown } }

export function CountryMap({ country, language }: { country: Country; language: Language }) {
  const collection = feature(atlas as never, (atlas as unknown as Atlas).objects.countries as never) as unknown as GeoJSON.FeatureCollection
  const geometry = collection.features.find((item) => Number(item.id) === country.id)
  if (!geometry) return <div className="map-error">{copy[language].mapUnavailable}</div>
  const projection = geoMercator().fitExtent([[46, 38], [754, 442]], geometry)
  const path = geoPath(projection)(geometry)
  const point = projection([country.longitude, country.latitude]) ?? [400, 240]

  return (
    <svg className="country-map" viewBox="0 0 800 480" role="img" aria-label={`${countryName(country, language)} — ${copy[language].capitalLocation}`}>
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.7" />
        </pattern>
        <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="800" height="480" className="map-grid" fill="url(#grid)" />
      <path d={path ?? ''} className="country-shape" />
      <circle cx={point[0]} cy={point[1]} r="17" className="capital-pulse" />
      <circle cx={point[0]} cy={point[1]} r="6" className="capital-dot" filter="url(#glow)" />
    </svg>
  )
}
