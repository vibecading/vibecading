(function (root) {
  'use strict';
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.ShapeEngine;
  function empty(now=Date.now()) {
    return { sessions:Object.fromEntries(E.MODES.map(mode=>[mode,E.createState(mode,E.today(now))])),mode:'sandbox',best:0,records:{spatial:0,kit:0,daily:0} };
  }
  function serialize(profile, now = Date.now()) {
    const sessions = {};
    for (const mode of E.MODES) {
      const s = profile.sessions[mode];
      sessions[mode] = { ...s,
        elapsedMs: s.startedAt === null ? null : Math.max(0, (s.finishedAt ?? now) - s.startedAt),
        levelElapsedMs: s.levelStartedAt === null ? null : Math.max(0, (s.finishedAt ?? now) - s.levelStartedAt),
        startedAt: null, levelStartedAt: null, finishedAt: null };
    }
    return JSON.stringify({ version:5,sessions,mode:profile.mode,best:profile.best,records:profile.records });
  }
  const number = (n,max=10000000) => Number.isSafeInteger(n) && n >= 0 && n <= max;
  const elapsed = n => n === null || (Number.isFinite(n) && n >= 0 && n <= 31536000000);
  const keys = a => Array.isArray(a) && a.length <= E.MAX_SHAPES && a.every(k => typeof k === 'string' && Object.hasOwn(E.SHAPES,k));
  const cells = (a,count) => Array.isArray(a) && a.length === count && a.every(c => E.CELLS.includes(c));
  function migrate(data) {
    if (!data || typeof data !== 'object') return null;
    const cell = lane => [-1,0,1].includes(lane) ? ['A3','B2','C1'][lane+1] : null;
    return { ...data, activeCell:cell(data.activeLane),
      queueCells:Array.isArray(data.queueLanes) ? data.queueLanes.map(cell) : null,
      builtCells:Array.isArray(data.builtLanes) ? data.builtLanes.map(cell) : null,
      history:Array.isArray(data.history) ? data.history.map(h=>h && ({...h,cells:Array.isArray(h.lanes)?h.lanes.map(cell):null})) : null };
  }
  function session(data, mode, now) {
    const fresh=()=>E.createState(mode,E.today(now));
    if(mode==='daily'&&(!data||!E.validDate(data.dailyDate)))return fresh();
    const initial=E.createState(mode,data?.dailyDate),count=Math.max(1,E.levelsFor(initial).length);
    if (!data || typeof data !== 'object' || !number(data.level,count-1)
      || !['typing','success','finished'].includes(data.phase)
      || !keys(data.queue) || !keys(data.built)
      || !['empty','draft','built'].includes(data.scene)
      || !cells(data.queueCells,data.queue.length) || !cells(data.builtCells,data.built.length)
      || !E.CELLS.includes(data.activeCell) || typeof data.hintUsed !== 'boolean'
      || !number(data.score) || !number(data.combo,count) || !number(data.mistakes) || !number(data.shapeInputs)
      || !number(data.levelMistakes,data.mistakes) || !number(data.lastPoints,1000)
      || !elapsed(data.elapsedMs) || !elapsed(data.levelElapsedMs)
      || (data.elapsedMs === null && data.levelElapsedMs !== null)
      || !Array.isArray(data.results) || data.results.length > count
      || !Array.isArray(data.history) || data.history.length > 10) return fresh();
    const validResult = (r,i) => r && r.level === i && number(r.points,1000)
      && [1,2,3].includes(r.stars) && Number.isFinite(r.seconds) && r.seconds >= 0
      && r.seconds <= 31536000 && typeof r.assisted === 'boolean';
    if (!data.results.every(validResult) || data.score !== data.results.reduce((sum,r)=>sum+r.points,0)
      || data.history.some(h=>!h || !keys(h.shapes) || !cells(h.cells,h.shapes.length) || typeof h.ok !== 'boolean')) return fresh();
    if (mode === 'sandbox' && (data.level !== 0 || data.phase !== 'typing' || data.results.length || data.score || data.combo)) return fresh();
    if (mode === 'challenge' && (data.activeCell !== 'B2' || [...data.queueCells,...data.builtCells].some(c=>c !== 'B2')))return fresh();
    if (mode !== 'sandbox' && (data.results.length !== data.level + (data.phase !== 'typing' ? 1 : 0)
      || (data.phase === 'finished' && data.level !== count-1)
      || (data.phase === 'success' && data.level === count-1))) return fresh();
    if (data.phase !== 'typing' && (!data.built.length || data.queue.length || data.elapsedMs === null)) return fresh();
    if ((data.scene==='empty' && data.queue.length) || (data.scene==='draft' && !data.queue.length)
      || (data.scene==='built' && !data.built.length) || (data.phase!=='typing' && data.scene!=='built')) return fresh();
    if (data.scene==='built' && data.queue.length && (data.queue.join('')!==data.built.join('')
      || data.queueCells.join(',')!==data.builtCells.join(','))) return fresh();
    const target=E.puzzle({...initial,level:data.level});
    if(data.phase!=='typing'&&!E.matches(data.built,data.builtCells,target))return fresh();
    if(mode==='kit'&&[data.queue,data.built].some(shapes=>Object.keys(E.SHAPES).some(key=>shapes.filter(k=>k===key).length>(target.inventory[key]??0))))return fresh();
    return { ...initial, level:data.level, phase:data.phase,shapeInputs:data.shapeInputs,scene:data.scene,
      queue:[...data.queue], built:[...data.built], queueCells:[...data.queueCells], builtCells:[...data.builtCells],
      activeCell:data.activeCell, hintUsed:data.hintUsed, score:data.score, combo:data.combo,
      mistakes:data.mistakes, levelMistakes:data.levelMistakes, lastPoints:data.lastPoints,
      results:data.results.map(r=>({level:r.level,points:r.points,stars:r.stars,seconds:r.seconds,assisted:r.assisted})),
      history:data.history.map(h=>({shapes:[...h.shapes],cells:[...h.cells],ok:h.ok})),
      startedAt:data.elapsedMs === null ? null : now-data.elapsedMs,
      levelStartedAt:data.levelElapsedMs === null ? null : now-data.levelElapsedMs,
      finishedAt:data.phase === 'finished' ? now : null,
      message:data.phase === 'finished' ? mode==='daily'?'Daily blueprint complete. Your result card is ready.':`All ${count} blueprints complete. Your imagination takes it from here.`
        : data.phase === 'success' ? 'Blueprint matched. Press Enter for the next build.' : '' };
  }
  function restore(text, now = Date.now()) {
    try {
      if (typeof text !== 'string' || text.length > 200000) return empty(now);
      const data=JSON.parse(text);
      if (!data || ![2,3,4,5].includes(data.version) || !data.sessions) return empty(now);
      const read = mode => {
        if(data.version<4&&!['challenge','sandbox'].includes(mode))return E.createState(mode,E.today(now));
        const value=data.version===2?migrate(data.sessions[mode]):data.sessions[mode];
        const migrated=value&&data.version<5?{...value,
          shapeInputs:data.version<4?0:value.shapeInputs,
          scene:value.queue?.length?'draft':value.built?.length?'built':'empty'}:value;
        return session(migrated,mode,now);
      };
      const sessions=Object.fromEntries(E.MODES.map(mode=>[mode,read(mode)]));
      const records=Object.fromEntries(['spatial','kit','daily'].map(mode=>[mode,Math.max(number(data.records?.[mode])?data.records[mode]:0,sessions[mode].score)]));
      return rollDaily({sessions,records,mode:E.MODES.includes(data.mode)?data.mode:'challenge',best:Math.max(number(data.best)?data.best:0,sessions.challenge.score)},now);
    } catch { return empty(now); }
  }
  function rollDaily(profile,now=Date.now()){
    if(profile.sessions.daily.dailyDate===E.today(now))return profile;
    return {...profile,sessions:{...profile.sessions,daily:E.createState('daily',E.today(now))},records:{...profile.records,daily:0}};
  }
  // The key stays stable so version-2 players keep their saved builds.
  const api = { KEY:'vibecading.shape-terminal.alphabet.v1',LEGACY_KEY:'vibecading.shape-terminal.v2',empty,serialize,restore,rollDaily };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShapeStorage = api;
})(globalThis);
