import { geoMercator, geoContains, geoPath, geoCircle } from 'd3-geo'
import { feature } from 'topojson-client'
import atlas from 'world-atlas/countries-10m.json'
import type { Country } from './data'
import { distanceKm, targetKm, type Location } from './scoring'

const collection = feature(atlas as never, atlas.objects.countries as never) as unknown as GeoJSON.FeatureCollection<GeoJSON.MultiPolygon | GeoJSON.Polygon>
const shapes = new Map(collection.features.map(f => [Number(f.id), f.geometry]))
export function mapFrame(country: Country) {
  const capital: Location = [country.longitude,country.latitude]
  const geometry = shapes.get(country.id)!
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const pieces = polygons.map(coordinates => ({type:'Polygon' as const,coordinates}))
  const local = pieces.find(p => geoContains(p,capital)) ?? pieces.reduce((best,next) =>
    nearest(next) < nearest(best) ? next : best)
  function nearest(p: GeoJSON.Polygon) {
    return p.coordinates[0].reduce((d,q)=>Math.min(d,distanceKm(capital,q as Location)),Infinity)
  }
  // Keep nearby islands in the same local archipelago while dropping outlying dependencies.
  const radius = local.coordinates[0].reduce((d,q)=>Math.max(d,distanceKm(capital,q as Location)),0)
  const nearby = pieces.filter(p=>p === local || nearest(p) < Math.min(1600,Math.max(160,radius*0.8)))
  const shape: GeoJSON.MultiPolygon = {type:'MultiPolygon',coordinates:nearby.map(p=>p.coordinates)}
  const projection = geoMercator().rotate([-capital[0],0]).fitExtent([[40,32],[760,448]],{
    type:'GeometryCollection', geometries:[shape,{type:'Point',coordinates:capital}]
  })
  const path = geoPath(projection)
  const corners: Location[] = [[0,0],[800,0],[0,480],[800,480]]
  const reach = Math.max(...corners.map(c=>distanceKm(capital,projection.invert!(c)!)))
  const ring = geoCircle().center(capital).radius(targetKm(reach)/6371*180/Math.PI)()
  return {capital,projection,reach,outline:path(shape)!,ring:path(ring)!}
}
