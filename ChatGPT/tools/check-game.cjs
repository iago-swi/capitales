// Run with Electron from ChatGPT/. Each run uses a fresh, in-memory browser session.
const {app,BrowserWindow,nativeImage}=require('electron')
const fs=require('node:fs')
const assert=require('node:assert/strict')
const initSql=require('sql.js')
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const live=process.argv.includes('--live')
const capture=!live && process.argv.includes('--capture')
const base=live?'https://iago-swi.github.io/capitales/ChatGPT/':'http://127.0.0.1:4173/capitales/ChatGPT/'
app.whenReady().then(async()=>{
  const win=new BrowserWindow({show:false,width:1120,height:700,useContentSize:true,webPreferences:{offscreen:true,partition:'qa',backgroundThrottling:false}})
  const wc=win.webContents
  const errors=[]
  wc.on('console-message',e=>{if(e.level==='error')errors.push(e.message)})
  const js=s=>wc.executeJavaScript(s)
  async function wait(s,ms=20000){
    const end=Date.now()+ms
    while(Date.now()<end){if(await js('Boolean('+s+')'))return;await sleep(40)}
    throw Error('Timed out waiting for '+s+' '+await js('document.body.innerText'))
  }
  const click=s=>js('document.querySelector('+JSON.stringify(s)+').click()')
  const keyboard=key=>js('window.dispatchEvent(new KeyboardEvent("keydown",{key:'+JSON.stringify(key)+'}))')
  await win.loadURL(base)
  const SQL=await initSql()
  const old=new SQL.Database()
  old.run("CREATE TABLE scores(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL DEFAULT 'Anonymous',score INTEGER NOT NULL,total INTEGER NOT NULL,played_at TEXT NOT NULL); INSERT INTO scores(name,score,total,played_at) VALUES('Original explorer',8,10,'2026-09-19')")
  const key='capitales.sqlite.base64'
  await js('localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(Buffer.from(old.export()).toString('base64'))+')')
  wc.reload()
  await wait('document.querySelector(".modes")')
  wc.debugger.attach('1.3')

  async function shot(path){
    if(!capture)return
    const {data}=await wc.debugger.sendCommand('Page.captureScreenshot',{format:'png'})
    const jpg=nativeImage.createFromBuffer(Buffer.from(data,'base64')).resize({width:800,height:500}).toJPEG(82)
    assert(jpg.length<100000)
    fs.writeFileSync(path,jpg)
  }
  let streak=0
  for(const mode of ['name','place']){
    if(mode==='place'){
      await click('.modes button:nth-child(2)')
      if(capture)await js(`(()=>{const schedule=window.setTimeout;window.setTimeout=(fn,ms,...args)=>{
        if(ms===1500 && document.querySelector('.round-label')?.textContent.includes('· 2 /')){window.finishCapture=fn;return 0}
        return schedule(fn,ms,...args)
      }})()`)
    }
    // Repeatable countries make the near and far probes comparable across builds.
    await js('(()=>{let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)})()')
    await keyboard('Enter')
    for(let i=0;i<10;i++){
      await wait('document.querySelector(".round-label")?.textContent.includes("· '+(i+1)+' / 10") && !document.querySelector(".result")')
      // Read the active component's geographic frame to drive known map locations
      // through Chromium's normal pointer event path, including CSS transforms.
      const state=await js(`(()=>{
        const svg=document.querySelector('svg.country-map')
        let fiber=svg[Object.keys(svg).find(k=>k.startsWith('__reactFiber'))]
        while(fiber && !fiber.memoizedProps?.frame)fiber=fiber.return
        if(fiber.memoizedProps.frame.outline!==svg.querySelector('.country-shape').getAttribute('d'))fiber=fiber.alternate
        const f=fiber.memoizedProps.frame, matrix=svg.getScreenCTM()
        const c=f.projection(f.capital)
        const marker=new DOMPoint(...c).matrixTransform(matrix)
        const corner=new DOMPoint(c[0]>400?2:798,c[1]>240?2:478).matrixTransform(matrix)
        return {x:marker.x,y:marker.y,dx:corner.x-marker.x,dy:corner.y-marker.y,capital:f.capital,reach:f.reach}
      })()`)
      let expectedKm=null
      if(mode==='name'){
        if(i===0)await shot('screenshot.jpg')
        const data=require('../src/countries.json')
        const city=data.find(c=>c.longitude===state.capital[0]&&c.latitude===state.capital[1]).capital
        const ix=await js('[...document.querySelectorAll(".choices button")].findIndex(b=>b.textContent.slice(1)==='+JSON.stringify(city)+')')
        assert(ix>=0,city+' '+await js('document.body.innerText'));await keyboard(String(ix+1))
      }else if(i!==3){
        if(i===4){
          await wc.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:390,height:800,deviceScaleFactor:1,mobile:false})
          await wc.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true})
          await sleep(120)
        }
        if(i===4){assert(await js('document.documentElement.scrollWidth<=innerWidth'));}
        // On resize the original screen coordinates have changed. Use a fresh CTM.
        const ratio=i===1?.23:i===2?1:0
        const coords=await js(`(()=>{
          const svg=document.querySelector('.country-map')
          let f=svg[Object.keys(svg).find(k=>k.startsWith('__reactFiber'))]
          while(!f.memoizedProps?.frame)f=f.return
          if(f.memoizedProps.frame.outline!==svg.querySelector('.country-shape').getAttribute('d'))f=f.alternate
          const frame=f.memoizedProps.frame,p=frame.projection(frame.capital)
          const x=p[0]+((p[0]>400?2:798)-p[0])*${ratio}, y=p[1]+((p[1]>240?2:478)-p[1])*${ratio}
          const point=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM())
          const [lon,lat]=frame.projection.invert([x,y])
          const [a,b]=frame.capital, rad=Math.PI/180
          const km=12742*Math.asin(Math.sqrt(Math.sin((lat-b)*rad/2)**2+Math.cos(b*rad)*Math.cos(lat*rad)*Math.sin((lon-a)*rad/2)**2))
          return {x:point.x,y:point.y,km}
        })()`)
        expectedKm=coords.km
        delete coords.km
        if(i===4){
          console.log('Touch',coords,await js('document.elementFromPoint('+coords.x+','+coords.y+')?.outerHTML.slice(0,100)'))
          await wc.debugger.sendCommand('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[coords]})
          await wc.debugger.sendCommand('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
        }else for(const type of ['mousePressed','mouseReleased'])await wc.debugger.sendCommand('Input.dispatchMouseEvent',{type,...coords,button:'left',clickCount:1})
      }
      await wait('document.querySelector(".result")')
      if(mode==='place'){
        const reveal=await js('document.querySelector(".result").innerText')
        const points=Number(reveal.match(/([+-]?\d+)$/)[1])
        console.log(i+1,reveal.replace(/\n/g,' '))
        if(i===0||i===4)assert(/\b[01] km/i.test(reveal))
        if(i===1 && capture){await sleep(120);await shot('place.jpg');await js('window.finishCapture()')}
        const target=Math.max(25,state.reach*.15), zero=2*target
        const hit=expectedKm!==null && expectedKm<=target
        streak=hit?streak+1:0
        const ms=await js('document.querySelector("progress").value')
        let expected=-100
        if(expectedKm!==null){
          expected=expectedKm>=zero ? -Math.round(100*Math.min(1,(expectedKm-zero)/(Math.max(state.reach,1.5*zero)-zero))) :
            Math.round((100+(hit?ms/150:0))*Math.min(1,(zero-expectedKm)/(zero-25))*Math.max(1,Math.min(2,1+.25*(streak-1))))
        }
        assert(Math.abs(points-expected)<=2,'Expected '+expected+' observed '+points)
        if(i===2)assert(points<=0)
        if(i===3)assert.equal(points,-100)
      }
    }
    await wait('document.querySelector("#player-name")')
    await js(`(()=>{const input=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'QA ${mode}');input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('form').requestSubmit()})()`)
    await wait('document.querySelector(".leaderboard-row")')
    wc.reload()
    await wait('document.querySelector(".welcome-actions")')
    await click('.welcome-actions button')
    await wait('document.body.innerText.includes("QA '+mode+'")')
    assert.equal(await js('document.querySelectorAll(".leaderboard-row").length'),1)
    if(mode==='place'){
      await click('.clear-row button');await click('.clear-row button:last-child')
      await wait('document.querySelector(".empty-score")')
    }
    await click('.leaderboard-top button')
  }
  const bytes=await js('localStorage.getItem('+JSON.stringify(key)+')')
  const db=new SQL.Database(Buffer.from(bytes,'base64'))
  assert.equal(db.exec('SELECT name FROM scores')[0].values[0][0],'Original explorer')
  assert.deepEqual(db.exec('SELECT mode,name FROM mode_scores')[0].values,[['name','QA name']])
  assert.deepEqual(errors,[])
  console.log('Verified both games, touch, timeout, per-mode persistence and the archived legacy score.')
  app.exit(0)
}).catch(e=>{console.error(e);app.exit(1)})
