(function (root) {
  'use strict';
  const P=typeof module!=='undefined'&&module.exports?require('./puzzles.js'):root.ShapePuzzles;
  const MODES=Object.freeze(['challenge','spatial','kit','daily','sandbox']);
  const SHAPES = Object.freeze({
    '1': { name: 'Plane', height: 0.18, letter: 'p' },
    '2': { name: 'Block', height: 1, letter: 'b' },
    '3': { name: 'Column', height: 1.15, letter: 'c' },
    '4': { name: 'Pyramid', height: 1.35, letter: 'y' },
    '5': { name: 'Wedge', height: 1, letter: 'w' },
    '6': { name: 'Sphere', height: 1.6, letter: 's' },
    a: { name:'Arch', height:1.8, letter:'a' },
    d: { name:'Dome', height:.95, letter:'d' },
    e: { name:'Elbow', height:.65, letter:'e' },
    f: { name:'Frustum', height:1.1, letter:'f' },
    g: { name:'Gable', height:1.15, letter:'g' },
    h: { name:'Hex prism', height:1, letter:'h' },
    i: { name:'I-beam', height:1.2, letter:'i' },
    j: { name:'Hook', height:1.6, letter:'j' },
    k: { name:'Cross', height:.8, letter:'k' },
    l: { name:'L-block', height:1, letter:'l' },
    m: { name:'Steps', height:1.2, letter:'m' },
    n: { name:'N-frame', height:1.6, letter:'n' },
    o: { name:'Torus', height:.5, letter:'o' },
    q: { name:'Cone', height:1.4, letter:'q' },
    r: { name:'Rhombus', height:1.1, letter:'r' },
    t: { name:'T-block', height:.8, letter:'t' },
    u: { name:'U-channel', height:1, letter:'u' },
    v: { name:'V-trough', height:1, letter:'v' },
    x: { name:'Octahedron', height:1.7, letter:'x' },
    z: { name:'Zigzag', height:.7, letter:'z' },
  });
  function resolveKey(key, code = '') {
    if(Object.hasOwn(SHAPES,key))return key;
    const letter=/^Key[A-Z]$/.test(code)?code.slice(3).toLowerCase():String(key).toLowerCase();
    return Object.keys(SHAPES).find(id=>SHAPES[id].letter===letter)??null;
  }
  const LEVELS = [
    { name: 'First volume', shapes: ['1', '2'], guided: true },
    { name: 'Pavilion', shapes: ['1', '2', '1'], guided: true },
    { name: 'Lighthouse', shapes: ['1', '3', '4'] },
    { name: 'Observatory', shapes: ['2', '1', '3', '1'] },
    { name: 'Tower', shapes: ['1', '2', '1', '2', '4'] },
    { name: 'A home for imagination', shapes: ['1', '3', '1', '2', '1', '4'] },
    { name: 'Double deck', shapes: ['1', '2', '1', '2', '1'] },
    { name: 'Signal tower', shapes: ['1', '3', '1', '3', '4'] },
    { name: 'Roof garden', shapes: ['1', '2', '1', '3', '1', '4'] },
    { name: 'Stacked horizon', shapes: ['1', '2', '1', '3', '1', '2', '1'] },
    { name: 'After hours', shapes: ['1', '3', '1', '2', '1', '3', '4'] },
    { name: 'The imagined', shapes: ['1', '2', '1', '3', '1', '2', '1', '4'] },
  ];
  const MAX_SHAPES = 16;
  const CELLS = P.CELLS;
  const levelsFor = state => state.mode==='challenge'?LEVELS:state.mode==='daily'?[P.daily(state.dailyDate)]:state.mode==='sandbox'?[]:P[state.mode];
  const puzzle = state => levelsFor(state)[state.level];
  const stackAt = (shapes,cells,cell) => shapes.filter((_,i)=>(cells?.[i]??'B2')===cell);
  const matches = (shapes,cells,target) => shapes.length===target.shapes.length&&CELLS.every(cell=>stackAt(shapes,cells,cell).join('')===stackAt(target.shapes,target.cells,cell).join(''));
  function remaining(state){
    const stock=puzzle(state)?.inventory;
    return stock?Object.fromEntries(Object.keys(SHAPES).map(key=>[key,(stock[key]??0)-state.queue.filter(k=>k===key).length])):null;
  }
  const cellPosition = cell => ({ x: cell.charCodeAt(0)-66, y: Number(cell[1])-2 });
  function moveCell(cell, direction) {
    const delta = {left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[direction];
    if (!Array.isArray(delta) || !CELLS.includes(cell)) return cell;
    const {x,y}=cellPosition(cell);
    return String.fromCharCode(66+Math.max(-1,Math.min(1,x+delta[0])))+(Math.max(-1,Math.min(1,y+delta[1]))+2);
  }
  // Editing never replaces the archived build; the view explicitly selects visible geometry.
  function sceneFor(state) {
    return state.scene==='built'?{shapes:state.built,cells:state.builtCells,wire:false}
      :state.scene==='draft'?{shapes:state.queue,cells:state.queueCells,wire:true}
      :{shapes:[],cells:[],wire:true};
  }
  function createState(mode = 'challenge',date = P.today()) {
    if(!MODES.includes(mode))mode='challenge';
    return { mode, level: 0, queue: [], built: [], history: [], score: 0, combo: 0,
      mistakes: 0, phase: 'typing', startedAt: null, levelStartedAt: null,
      finishedAt: null, message: '', lastPoints: 0, activeCell: 'B2', queueCells: [],
      builtCells: [], scene:'empty', hintUsed: false, levelMistakes: 0, results: [], shapeInputs:0,
      dailyDate:mode==='daily'?(P.validDate(date)?date:P.today()):null };
  }
  function advance(state) {
    return { ...state, level: state.level + 1, phase: 'typing', queue: [], built: [],
      queueCells: [], builtCells: [], scene:'empty', hintUsed: false, levelMistakes: 0,
      activeCell:'B2', levelStartedAt: null, message: '', lastPoints: 0 };
  }
  function transition(state, event, now = Date.now()) {
    if (event.type === 'restart') return createState(state.mode,state.dailyDate);
    if (state.phase === 'finished') return state;
    if (event.type === 'place' && state.mode !== 'challenge' && CELLS.includes(event.cell))
      return { ...state, activeCell: event.cell };
    if (event.type === 'move' && state.mode !== 'challenge')
      return { ...state, activeCell: moveCell(state.activeCell,event.direction) };
    if (event.type === 'restore' && state.phase === 'typing' && state.scene === 'empty' && !state.queue.length && state.built.length)
      return { ...state, scene:'built', message:state.mode==='sandbox'?'Last build restored. Use Edit build to change it.':'Last attempt restored. Type a new command to continue.' };
    if (event.type === 'edit' && state.mode === 'sandbox' && state.built.length)
      return { ...state, scene:'draft', queue: [...state.built], queueCells: [...state.builtCells],
        activeCell: state.builtCells.at(-1), message: 'Build recalled. Edit shapes, then press Enter.' };
    if (event.type === 'hint' && state.mode !== 'sandbox' && state.phase === 'typing' && !puzzle(state).guided && !state.hintUsed)
      return { ...state, hintUsed: true, message: 'Formula revealed. This blueprint will earn one star.',
        startedAt: state.startedAt ?? now, levelStartedAt: state.levelStartedAt ?? now };
    if (event.type === 'add') {
      if (!Object.hasOwn(SHAPES, event.key)) return state;
      const s = state.phase === 'success' ? advance(state) : state;
      if (s.queue.length >= MAX_SHAPES) return { ...s, message: 'One command can contain up to 16 shapes' };
      if(s.mode==='kit'&&remaining(s)[event.key]===0)return {...s,message:`No ${SHAPES[event.key].name} left. Remove a typed shape to return it to the kit.`};
      return { ...s, scene:'draft', queue: [...s.queue, event.key], queueCells: [...s.queueCells, s.activeCell], message: '', lastPoints: 0,
        shapeInputs:s.shapeInputs+1,
        startedAt: s.startedAt ?? now, levelStartedAt: s.levelStartedAt ?? now };
    }
    if (event.type === 'backspace' && state.phase === 'typing' && state.queue.length)
      return { ...state, scene:state.queue.length>1?'draft':'empty', queue: state.queue.slice(0, -1), queueCells: state.queueCells.slice(0, -1), message: '', lastPoints: 0 };
    if (event.type === 'remove' && state.phase === 'typing' && Number.isInteger(event.index) && event.index >= 0 && event.index < state.queue.length)
      return { ...state, scene:state.queue.length>1?'draft':'empty', queue: state.queue.filter((_,i) => i !== event.index),
        queueCells: state.queueCells.filter((_,i) => i !== event.index), message: '', lastPoints: 0 };
    if (event.type === 'clear' && state.phase === 'typing')
      return { ...state, scene:'empty', queue: [], queueCells: [], message: '', lastPoints: 0 };
    if (event.type !== 'submit') return state;
    if (state.phase === 'success') return advance(state);
    if (!state.queue.length) return { ...state, message: 'Add a shape first — use keys 1–6 or the shape letters' };

    const built = [...state.queue], builtCells = [...state.queueCells];
    const blueprint = puzzle(state),target=blueprint?.shapes;
    const ok = state.mode === 'sandbox' || matches(built,builtCells,blueprint);
    const history = [{ shapes: built, cells: builtCells, ok }, ...state.history].slice(0, 10);
    if (state.mode === 'sandbox') return { ...state, scene:'built', built, builtCells, history, queue: [], queueCells: [],
      message: `Shapes built: ${built.length}. Type your next build.` };
    if (!ok) {
      if(state.mode!=='challenge'){
        const cell=CELLS.find(cell=>stackAt(built,builtCells,cell).join('')!==stackAt(target,blueprint.cells,cell).join(''));
        return {...state,scene:'built',built,builtCells,history,mistakes:state.mistakes+1,levelMistakes:state.levelMistakes+1,combo:0,message:`Cell ${cell} differs from the blueprint. Check its stack and position.`};
      }
      const mismatch = target.findIndex((key, i) => key !== built[i]);
      const visible = blueprint.guided || state.hintUsed;
      const message = mismatch >= 0
        ? visible ? `Position ${mismatch + 1}: use ${SHAPES[target[mismatch]].name}. Edit your command.`
          : `Your build differs near shape ${mismatch + 1}. Check the blueprint or reveal the formula.`
        : 'There are extra shapes in your command. Remove them with Backspace.';
      return { ...state, scene:'built', built, builtCells, history, mistakes: state.mistakes + 1,
        levelMistakes: state.levelMistakes + 1, combo: 0, message };
    }
    const combo = state.combo + 1;
    const seconds = Math.max(0, (now - (state.levelStartedAt ?? now)) / 1000);
    const points = state.mode==='daily'?Math.max(0,1000-state.levelMistakes*100-Math.max(0,state.shapeInputs-target.length)*10-(state.hintUsed?250:0))
      :100+Math.min(combo-1,5)*25+(state.mode==='kit'?0:Math.max(0,60-Math.floor(seconds)))-(state.hintUsed?50:0);
    const stars = state.hintUsed || state.levelMistakes > 2 ? 1 : state.levelMistakes ? 2 : 3;
    const results = [...state.results, { level: state.level, points, stars,
      seconds: Math.round(seconds * 10) / 10, assisted: state.hintUsed }];
    const finished = state.level === levelsFor(state).length - 1;
    return { ...state, scene:'built', built, builtCells, history, queue: [], queueCells: [], results, combo, score: state.score + points,
      phase: finished ? 'finished' : 'success', lastPoints: points,
      finishedAt: finished ? now : null,
      message: finished ? state.mode==='daily'?'Daily blueprint complete. Your result card is ready.':`All ${levelsFor(state).length} blueprints complete. Your imagination takes it from here.`
        : 'Blueprint matched. Press Enter for the next build.' };
  }
  function dailyCard(state){
    if(state.mode!=='daily'||state.phase!=='finished')return '';
    const stars=state.results[0].stars;
    return `SHAPE TERMINAL / DAILY\n${state.dailyDate} UTC\n${'★'.repeat(stars)}${'☆'.repeat(3-stars)} · ${state.score} / 1000\n${state.mistakes+1} ${state.mistakes?'attempts':'attempt'} · ${state.shapeInputs} shape inputs\nSeed ${state.dailyDate} · v1`;
  }
  const api = { SHAPES, LEVELS, MODES, MAX_SHAPES, CELLS, levelsFor, puzzle, stackAt, matches, remaining, dailyCard, today:P.today, validDate:P.validDate, resolveKey, cellPosition, moveCell, sceneFor, createState, transition };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShapeEngine = api;
})(globalThis);
