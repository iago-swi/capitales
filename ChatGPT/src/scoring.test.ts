import {describe,it,expect} from 'vitest'
import {award,qualifies,signed,targetKm,distanceKm} from './scoring'
import {mapFrame} from './mapFrame'
import {countries} from './data'
import {expedition} from './game'
describe('expedition rules',()=>{
  it.each([[15000,0,200],[15000,4,400],[7500,1,188]])('Name clock %s and previous streak %s', (ms,previous,points)=>{
    expect(award('name',true,null,0,ms,previous).points).toBe(points)
    expect(award('name',false,null,0,ms,previous)).toEqual({points:0,hit:false,streak:0})
  })
  it.each([[20,200],[150,109],[200,36],[300,0],[650,-50],[1000,-100]])('Place %s km', (distance,points)=>{
    const r=award('place',false,distance,1000,15000,0)
    expect(r.points).toBe(points)
    expect(r.streak).toBe(distance<=150?1:0)
  })
  it('handles the clock, floor and score cutoff',()=>{
    expect(award('place',false,null,100,0,5)).toEqual({points:-100,hit:false,streak:0})
    expect(targetKm(100)).toBe(25)
    expect([157,-15,0].map(signed)).toEqual(['+157','-15','0'])
    const full=Array(10).fill({score:10})
    expect([qualifies(0,[]),qualifies(-1,[]),qualifies(10,full),qualifies(11,full),qualifies(1,[])]).toEqual([false,false,false,true,true])
    expect(new Set(expedition(countries).map(q=>q.country.id)).size).toBe(10)
  })
  it('keeps overseas territories and the date line from dominating the map',()=>{
    const ceilings: Record<number,number>={250:1800,528:800,578:4500,840:7500,724:2200,620:1200,152:6200,643:12500,242:1600,296:1600}
    for(const country of countries.filter(c=>c.id in ceilings)){
      expect(mapFrame(country).reach,country.name).toBeLessThan(ceilings[country.id])
    }
    for(const country of countries.filter(c=>[336,492].includes(c.id))){
      expect(targetKm(mapFrame(country).reach)).toBe(25)
    }
  })
  it('fits every capital inside its invertible frame',()=>{
    for(const c of countries){
      const f=mapFrame(c), p=f.projection(f.capital)!
      expect(p[0],c.name).toBeGreaterThanOrEqual(0)
      expect(p[0],c.name).toBeLessThanOrEqual(800)
      expect(p[1],c.name).toBeGreaterThanOrEqual(0)
      expect(p[1],c.name).toBeLessThanOrEqual(480)
      expect(distanceKm(f.capital,f.projection.invert!(p)!)).toBeLessThan(.001)
      expect(f.reach).toBeGreaterThan(0)
    }
  })
})
