import { useEffect, useState, type FormEvent } from 'react'
import { countries } from './data'
import { createQuestion } from './game'
import { CountryMap } from './CountryMap'
import { getHighScores, openDatabase, qualifiesForHighScore, saveScore, type HighScore } from './database'
import { capitalName, copy, countryName, type Language } from './i18n'

const ROUND_LENGTH = 10
const VERSION = '1.0.1'
type View = 'welcome' | 'game' | 'name' | 'scores'

export default function App() {
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<View>('welcome')
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('capitales.language') as Language) || 'en')
  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [scores, setScores] = useState<HighScore[]>([])
  const [question, setQuestion] = useState(() => createQuestion(countries))
  const [answer, setAnswer] = useState<string>()
  const [name, setName] = useState('')
  const platform = window.capitalesDesktop?.platform
  const text = copy[language]

  useEffect(() => { openDatabase().then(() => { setScores(getHighScores()); setReady(true) }) }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('desktop-app', Boolean(platform))
    return () => document.documentElement.classList.remove('desktop-app')
  }, [platform])
  function toggleLanguage() { const next = language === 'en' ? 'fr' : 'en'; setLanguage(next); localStorage.setItem('capitales.language', next) }
  function begin() { setScore(0); setRound(1); setAnswer(undefined); setQuestion(createQuestion(countries)); setView('game') }
  function choose(choice:string) { if (answer) return; setAnswer(choice); if (choice === question.country.capital) setScore((value) => value + 1) }
  function advance() {
    if (round === ROUND_LENGTH) { setView(qualifiesForHighScore(score) ? 'name' : 'scores'); if (qualifiesForHighScore(score)) setName(''); return }
    setQuestion(createQuestion(countries, question.country.id)); setRound((value) => value + 1); setAnswer(undefined)
  }
  async function recordScore(event:FormEvent) { event.preventDefault(); await saveScore(name.trim() || text.anonymous, score, ROUND_LENGTH); setScores(getHighScores()); setView('scores') }

  if (!ready) return <main className="loading">{text.loading}</main>
  const LanguageButton = () => <button className="language-button" onClick={toggleLanguage} aria-label={text.language} title={text.language}><span aria-hidden="true">{language === 'en' ? '🇫🇷' : '🇬🇧'}</span><b>{language === 'en' ? 'FR' : 'EN'}</b></button>

  if (view === 'scores') return <main className="leaderboard-screen">
    <div className="leaderboard-top"><button className="text-button" onClick={() => setView('welcome')}>← {text.close}</button><LanguageButton /></div>
    <p className="eyebrow">Capitales · SQLite</p><h1>{text.highScores}</h1>
    <div className="leaderboard"><div className="leaderboard-head"><span>{text.rank}</span><span>{text.player}</span><span>{text.score}</span></div>
      {scores.length === 0 ? <p className="empty-score">{text.noScores}</p> : scores.map((entry,index) => <div className="leaderboard-row" key={`${entry.playedAt}-${index}`}><span>{String(index + 1).padStart(2,'0')}</span><strong>{entry.name}</strong><b>{entry.score}<small>/{entry.total}</small></b></div>)}
    </div><button className="primary" onClick={begin}>{text.playAgain} <span>→</span></button>
  </main>

  if (view === 'name') return <main className="name-screen"><LanguageButton /><p className="eyebrow">{text.newHighScore}</p><div className="final-number">{score}<small>/{ROUND_LENGTH}</small></div><h2>{text.finalScore}</h2><p>{text.namePrompt}</p>
    <form onSubmit={recordScore}><label htmlFor="player-name">{text.yourName}</label><input id="player-name" autoFocus maxLength={24} value={name} onChange={(event) => setName(event.target.value)} /><button className="primary" type="submit">{text.saveScore} <span>→</span></button></form>
  </main>

  if (view === 'welcome') return <main className="welcome">
    <div className="welcome-actions"><button className="text-button" onClick={() => setView('scores')}>{text.highScores}</button><LanguageButton /></div><div className="globe-mark" aria-hidden="true"><span>●</span></div><p className="eyebrow">{text.fieldTest} · {countries.length} {text.countries}</p><h1>{text.titleA}<br /><em>{text.titleB}</em></h1><p className="intro">{text.intro}</p><button className="primary" onClick={begin}>{text.begin} <span>→</span></button><div className="welcome-meta"><span>{text.bestScore} <strong>{scores[0]?.score ?? 0}/{ROUND_LENGTH}</strong></span><span>Version {VERSION} · {platform === 'win32' ? text.windowsEdition : platform === 'linux' ? text.linuxEdition : text.browserEdition} · SQLite</span></div>
  </main>

  const correct = answer === question.country.capital
  return <main className="game-shell"><header><div className="brand"><span className="brand-dot" /> CAPITALES</div><div className="round-label">{text.survey} {round} / {ROUND_LENGTH}</div><div className="header-right"><span className="score">{text.score} <strong>{score}</strong></span><LanguageButton /></div></header>
    <section className="game-grid"><div className="map-panel"><div className="coordinates">{Math.abs(question.country.latitude).toFixed(2)}°{question.country.latitude >= 0 ? 'N' : 'S'} · {Math.abs(question.country.longitude).toFixed(2)}°{question.country.longitude >= 0 ? 'E' : 'W'}</div><CountryMap country={question.country} language={language} /><div className="scale-mark">{text.capitalLocation} <span /></div></div><aside className="question-panel"><p className="eyebrow">{text.identify}</p><h2>{text.question}</h2><div className="choices">
      {question.choices.map((choice,index) => { const state = answer ? choice === question.country.capital ? 'correct' : choice === answer ? 'wrong' : 'dim' : ''; return <button key={choice} className={state} onClick={() => choose(choice)}><span>{String.fromCharCode(65 + index)}</span>{capitalName(choice, language)}</button> })}
    </div>{answer && <div className={`result ${correct ? 'yes' : 'no'}`} role="status"><p>{correct ? text.confirmed : `${text.thatWas} ${capitalName(question.country.capital, language)}`}</p><strong>{countryName(question.country, language)}</strong><button onClick={advance}>{round === ROUND_LENGTH ? text.final : text.next} →</button></div>}</aside></section>
  </main>
}
