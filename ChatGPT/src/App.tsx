import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { countries } from './data'
import { expedition } from './game'
import { mapFrame } from './mapFrame'
import { CountryMap } from './CountryMap'
import { clearScores, getHighScores, openDatabase, saveScore, type HighScore } from './database'
import { capitalName, copy, countryName, gameCopy, type Language } from './i18n'
import { award, distanceKm, duration, multiplier, qualifies, signed, type Mode, type Location } from './scoring'

const VERSION = '2.0.0'
type View = 'welcome' | 'game' | 'name' | 'scores'
type Result = ReturnType<typeof award> & {distance:number|null; guess?:Location; choice?:string; expired:boolean}
export default function App() {
  const [ready,setReady] = useState(false)
  const [mode,setMode] = useState<Mode>(()=>localStorage.getItem('capitales.mode')==='place'?'place':'name')
  const [view,setView] = useState<View>('welcome')
  const [language,setLanguage] = useState<Language>(()=>localStorage.getItem('capitales.language')==='fr'?'fr':'en')
  const [scores,setScores] = useState<HighScore[]>([])
  const [deck,setDeck] = useState(()=>expedition(countries))
  const [index,setIndex] = useState(0)
  const [run,setRun] = useState<Result[]>([])
  const [name,setName] = useState('')
  const [confirm,setConfirm] = useState(false)
  const [left,setLeft] = useState(duration)
  const deadline = useRef(0)
  const locked = useRef(false)
  const platform = window.capitalesDesktop?.platform
  const text = copy[language], ui = gameCopy[language]
  const question = deck[index], country = question.country
  const frame = useMemo(()=>mapFrame(country),[country])
  const result = run[index]
  const score = run.reduce((sum,r)=>sum+r.points,0)
  const hits = run.filter(r=>r.hit).length
  const drops = run.flatMap(r=>r.distance===null ? [] : [r.distance])
  const summary = run.length===10 && <p>{text.finalScore} {score} · {hits} / 10 {mode==='name'?ui.answered:ui.target} · {mode==='name' ? ui.streak+' '+Math.max(...run.map(r=>r.streak)) : ui.average+' '+(drops.length ? Math.round(drops.reduce((a,b)=>a+b)/drops.length)+' km':'—')}</p>
  useEffect(()=>{let active=true; openDatabase().then(()=>{if(active){setScores(getHighScores(mode));setReady(true)}});return ()=>{active=false}},[mode])
  useEffect(()=>{document.documentElement.classList.toggle('desktop-app',Boolean(platform))},[platform])
  function toggleLanguage() {
    const next = language==='en'?'fr':'en'
    localStorage.setItem('capitales.language',next)
    setLanguage(next)
  }
  function resetClock() {deadline.current=performance.now()+duration;locked.current=false;setLeft(duration)}
  function begin() {
    setDeck(expedition(countries));setIndex(0);setRun([]);setName('');setConfirm(false);resetClock();setView('game')
  }
  function settle(choice?:string, guess?:Location) {
    if(locked.current) return
    locked.current=true
    const remaining=Math.max(0,deadline.current-performance.now())
    if(!remaining){choice=undefined;guess=undefined}
    const distance=guess ? distanceKm(frame.capital,guess) : null
    const reward=award(mode,choice===country.capital,distance,frame.reach,remaining,run[index-1]?.streak ?? 0)
    setLeft(remaining)
    setRun([...run,{...reward,choice,guess,distance,expired:remaining===0}])
  }
  useEffect(()=>{
    if(view!=='game' || result) return
    const timer=window.setInterval(()=>{
      const remaining=deadline.current-performance.now()
      if(remaining<=0) settle()
      else setLeft(remaining)
    },75)
    return ()=>clearInterval(timer)
  },[view,index,result])
  useEffect(()=>{
    if(view!=='game' || !result) return
    const timer=window.setTimeout(()=>{
      if(index===9){setView(qualifies(score,scores)?'name':'scores');return}
      resetClock();setIndex(index+1)
    },1500)
    return ()=>clearTimeout(timer)
  },[view,index,result])
  useEffect(()=>{
    function key(e:KeyboardEvent) {
      if(!ready || e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && e.target.matches('input,textarea,[contenteditable=true]'))) return
      if(view==='welcome' && e.key==='Enter' && !(e.target instanceof HTMLButtonElement)){e.preventDefault();begin()}
      if(view==='game' && mode==='name' && /^[a-d1-4]$/i.test(e.key)) {
        const keyIndex='abcd'.indexOf(e.key.toLowerCase())
        settle(question.choices[keyIndex<0 ? Number(e.key)-1 : keyIndex])
      }
    }
    window.addEventListener('keydown',key)
    return ()=>window.removeEventListener('keydown',key)
  })
  async function recordScore(event:FormEvent) {
    event.preventDefault()
    await saveScore(mode,name.trim()||text.anonymous,score)
    setScores(getHighScores(mode));setView('scores')
  }
  if (!ready) return <main className="loading">{text.loading}</main>
  const LanguageButton = () => <button className="language-button" onClick={toggleLanguage} aria-label={text.language} title={text.language}><span aria-hidden="true">{language === 'en' ? '🇫🇷' : '🇬🇧'}</span><b>{language === 'en' ? 'FR' : 'EN'}</b></button>

  if (view === 'scores') return <main className="leaderboard-screen">
    <div className="leaderboard-top"><button className="text-button" onClick={() => (setConfirm(false),setRun([]),setView('welcome'))}>← {text.close}</button><LanguageButton /></div>
    <p className="eyebrow">Capitales · SQLite</p><h1>{text.highScores} · {ui[mode]}</h1>{summary}
    <div className="leaderboard"><div className="leaderboard-head"><span>{text.rank}</span><span>{text.player}</span><span>{text.score}</span></div>
      {scores.length === 0 ? <p className="empty-score">{text.noScores}</p> : scores.map((entry,index) => <div className="leaderboard-row" key={entry.id}><span>{String(index + 1).padStart(2,'0')}</span><strong>{entry.name}</strong><b>{entry.score}</b></div>)}
    </div>{scores.length>0 && <div className="clear-row">{confirm ? <><p>{ui.confirm}</p><button className="text-button" onClick={()=>setConfirm(false)}>{ui.keep}</button><button className="text-button" onClick={async()=>{await clearScores(mode);setScores(getHighScores(mode));setConfirm(false)}}>{ui.clear}</button></> : <button className="text-button" onClick={()=>setConfirm(true)}>{ui.clear}</button>}</div>}<button className="primary" onClick={begin}>{text.playAgain} <span>→</span></button>
  </main>

  if (view === 'name') return <main className="name-screen"><LanguageButton /><p className="eyebrow">{text.newHighScore}</p><div className="final-number">{score}</div><h2>{text.finalScore}</h2>{summary}<p>{text.namePrompt}</p>
    <form onSubmit={recordScore}><label htmlFor="player-name">{text.yourName}</label><input id="player-name" autoFocus maxLength={24} value={name} onChange={(event) => setName(event.target.value)} /><button className="primary" type="submit">{text.saveScore} <span>→</span></button></form>
  </main>

  if (view === 'welcome') return <main className="welcome">
    <div className="welcome-actions"><button className="text-button" onClick={() => setView('scores')}>{text.highScores}</button><LanguageButton /></div><div className="globe-mark" aria-hidden="true"><span>●</span></div><p className="eyebrow">{text.fieldTest} · {countries.length} {text.countries}</p><h1>{text.titleA}<br /><em>{mode==='name' ? text.titleB : ui.placeTitle}</em></h1><p className="intro">{mode==='name' ? text.intro : ui.placeIntro}</p><div className="modes" role="group" aria-label={ui.mode}>{(['name','place'] as const).map(m=><button key={m} aria-pressed={m===mode} onClick={()=>{setMode(m);localStorage.setItem('capitales.mode',m);setScores(getHighScores(m))}}>{ui[m]}</button>)}</div><button className="primary" onClick={begin}>{text.begin} <span>→</span></button><div className="welcome-meta"><span>{text.bestScore} <strong>{scores[0]?.score ?? 0}</strong></span><span>Version {VERSION} · {platform === 'win32' ? text.windowsEdition : platform === 'linux' ? text.linuxEdition : text.browserEdition} · SQLite</span></div>
  </main>


  const city = capitalName(country.capital,language)
  const hint = matchMedia('(pointer: coarse)').matches ? ui.tap : ui.click
  return <main className="game-shell"><header>
    <div className="brand"><span className="brand-dot"/> CAPITALES</div>
    <div className="round-label">{ui[mode]} · {index+1} / 10</div>
    <div className="header-right"><span className="score">{text.score} <strong>{score}</strong></span><LanguageButton/></div>
  </header>
  <section className="game-grid"><div className="map-panel">
    <CountryMap frame={frame} mode={mode} revealed={!!result} guess={result?.guess} label={mode==='name'?text.capitalLocation:hint} onDrop={p=>settle(undefined,p)}/>
    <div className="scale-mark">{mode==='name'?text.capitalLocation:countryName(country,language)} <span/></div>
  </div><aside className="question-panel">
    <label className="clock">{ui.time} · {Math.ceil(left/1000)} s · ×{multiplier(result?.streak ?? run[index-1]?.streak ?? 0)}
      <progress max={duration} value={left}/></label>
    <h2>{mode==='name'?text.question:ui.where+' '+city+'?'}</h2>
    {mode==='place' ? <p>{hint}</p> : <div className="choices">{question.choices.map((c,i)=>
      <button key={c} disabled={!!result} className={result?(c===country.capital?'correct':c===result.choice?'wrong':'dim'):''} onClick={()=>settle(c)}>
        <span>{String.fromCharCode(65+i)}</span>{capitalName(c,language)}</button>)}</div>}
    {result && <div className="result" role="status"><p>{result.expired?ui.timeout:result.distance!==null?ui.off+' '+Math.round(result.distance)+' km':text.thatWas}</p>
      <strong>{city} · {signed(result.points)}</strong></div>}
  </aside></section></main>
}
