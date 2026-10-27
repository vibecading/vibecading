(function () {
  'use strict';
  const E=window.ShapeEngine,G=window.ShapeGeometry,$=id=>document.getElementById(id);
  let lastScene='',lastSolid='';
  const copy=text=>text.replace(/\.$/,'');
  const stars=n=>'★'.repeat(n)+'☆'.repeat(3-n);
  function token(key,i,cls='token',cell=null,editable=false) {
    const label=`${i+1}: ${E.SHAPES[key].name}${cell?` at ${cell}`:''}`;
    const badge=cell===null?'':`<small class="cell-badge">${cell}</small>`;
    const content=G.icon(key)+`<small class="token-letter" aria-hidden="true">${E.SHAPES[key].letter.toUpperCase()}</small>`+badge;
    return `<span class="${cls}" role="listitem" data-shape="${key}" aria-label="${label}">${editable?`<button type="button" data-remove="${i}" aria-label="Remove ${label}">${content}</button>`:content}</span>`;
  }
  function renderScene(s,mode) {
    const {shapes,cells,wire}=E.sceneFor(s),draft=s.scene==='draft',built=s.scene==='built';
    const solid=`${mode}:${s.built.join('')}:${s.builtCells.join(',')}`;
    const identity=`${mode}:${shapes.join('')}:${cells.join(',')}:${wire}:${s.activeCell}`;
    if(identity!==lastScene){
      $('scene').innerHTML=G.scene(shapes,{wire,cells,showPads:mode!=='challenge',activeCell:s.activeCell,animate:!wire&&solid!==lastSolid});
      lastScene=identity;
      if(!wire)lastSolid=solid;
    }
    $('scene').dataset.view=s.scene;
    $('scene').dataset.built=s.built.join('');
    $('scene').dataset.cells=s.builtCells.join(',');
    $('scene-label').textContent=draft?'live draft':built?`shapes built: ${shapes.length}`:'waiting for input';
    $('scene-caption').textContent=copy(mode!=='challenge'?`Cell ${s.activeCell} · ${shapes.filter((_,i)=>cells[i]===s.activeCell).length} shapes here · ${draft?'Enter to build':'arrows or click to move'}`:draft?'A draft in space. Enter makes it solid.':built?'Your line became a volume.':'Read the blueprint. Give it volume.');
    $('stage').dataset.state=s.phase;
    $('restore-build').hidden=s.scene!=='empty'||!s.built.length||s.phase!=='typing';
    $('edit-build').hidden=mode!=='sandbox'||(s.scene==='empty'&&!!s.built.length);
    $('edit-build').disabled=!s.built.length;
    $('export').disabled=!built;
  }
  function renderQueue(s,mode,target,formulaVisible) {
    $('queue').innerHTML=s.queue.map((key,i)=>token(key,i,
      `token${mode==='challenge'&&formulaVisible&&key!==target[i]?' mismatch':''}`,
      mode!=='challenge'?s.queueCells[i]:null,true)).join('');
    const ready=s.phase!=='typing';
    $('command-placeholder').hidden=!!s.queue.length;
    $('command-placeholder').textContent=ready?(s.phase==='finished'?mode==='daily'?'Daily complete':'Collection complete':'Next blueprint — Enter'):mode!=='challenge'?`Next shape at ${s.activeCell}`:s.level===0?'Type your first volume':'Read it. Type it. Build it.';
    document.querySelector('.plane-cursor').hidden=ready;
    $('queue-count').textContent=`${s.queue.length} / ${E.MAX_SHAPES}`;
    const last=s.history[0];
    $('history').innerHTML=last?`<div class="history-row ${last.ok?'ok':''}"><span class="history-prompt">&gt;</span>${last.shapes.map(G.icon).join('')}<span class="history-result">${last.ok?'built':'needs editing'}</span></div>`:'<span>New session. Geometry instead of letters</span>';
    $('undo').disabled=$('clear').disabled=!s.queue.length||ready;
    $('build').innerHTML=`${s.phase==='finished'?'Play again':s.phase==='success'?'Next':'Build'} <kbd>↵</kbd>`;
    const stock=E.remaining(s);
    document.querySelectorAll('.shape-key').forEach(b=>{
      const key=b.dataset.shape;
      b.disabled=s.phase==='finished'||(s.phase==='typing'&&stock?.[key]===0);
      b.querySelector('.stock').hidden=!stock||s.phase!=='typing';
      b.querySelector('.stock').textContent=stock?`${stock[key]} left`:'';
      b.setAttribute('aria-label',`${E.SHAPES[key].letter.toUpperCase()} — ${E.SHAPES[key].name}${/^\d$/.test(key)?`, also ${key}`:''}${stock?`, ${stock[key]} remaining`:''}`);
    });
    $('run-note').hidden=!['kit','daily'].includes(mode);
    $('run-note').textContent=stock?(s.phase==='typing'?`${Object.values(stock).reduce((a,b)=>a+b,0)} parts left · remove a typed shape to return it`:s.phase==='success'?'Kit complete · Enter opens the next kit':'All four kits complete'):`${s.shapeInputs} shape inputs · target ${target.length} · movement is free`;
    $('placement').hidden=mode==='challenge';
    const {cells}=E.sceneFor(s);
    $('active-cell').textContent=s.activeCell;
    $('field-count').textContent=`${new Set(cells).size} / 9 cells used`;
    document.querySelectorAll('#cell-map [data-cell]').forEach(b=>{
      const count=cells.filter(cell=>cell===b.dataset.cell).length;
      b.setAttribute('aria-pressed',b.dataset.cell===s.activeCell);
      b.setAttribute('aria-label',`Cell ${b.dataset.cell}, ${count} ${count===1?'shape':'shapes'}`);
      b.classList.toggle('occupied',count>0);
    });
  }
  function renderBrief(s,mode,target,formulaVisible) {
    const free=mode==='sandbox',finished=s.phase==='finished',levels=E.levelsFor(s),level=E.puzzle(s);
    const names={challenge:'Blueprint',spatial:'Spatial',kit:'Parts kit'};
    $('level-counter').textContent=free?'Open studio':mode==='daily'?`Daily · ${s.dailyDate} UTC`:`${names[mode]} ${s.level+1} / ${levels.length}`;
    $('level-name').textContent=free?'A field of possibilities':finished?mode==='daily'?'Daily complete':'Collection complete':level.name;
    $('level-description').textContent=free?'Nine cells. Up to 16 shapes':mode==='daily'?'Same UTC seed. Accuracy over speed':finished?'Your own visual language':mode==='kit'?'Fixed parts. No speed bonus':level.guided?'Guided build · follow the formula':mode==='spatial'?'Read every cell. Stack order matters':'Read the wireframe from bottom to top';
    $('progress').hidden=free;
    $('progress').innerHTML=levels.map((l,i)=>`<span class="${i<s.results.length?'done':i===s.level?'current':''}" title="${l.name}${s.results[i]?` — ${s.results[i].stars} stars`:''}"></span>`).join('');
    $('progress').setAttribute('aria-label',`Completed ${s.results.length} of ${levels.length} blueprints`);
    const visible=E.sceneFor(s);
    const blueprint=free?visible.shapes:target;
    const blueprintSVG=G.scene(blueprint,{wire:true,compact:true,cells:free?visible.cells:(level.cells??[]),showPads:!free&&mode!=='challenge',activeCell:null});
    $('blueprint').innerHTML=blueprintSVG;$('zoom-scene').innerHTML=blueprintSVG;
    $('zoom-title').textContent=free?'Your composition':level.name;
    $('formula-bar').hidden=free;
    $('formula-status').textContent=level?.guided?(mode==='challenge'?'Guided formula':'Guided formula with cell addresses'):s.hintUsed?'Assisted · one-star build':s.phase!=='typing'?'Blueprint matched':mode==='daily'?'Hidden formula · hint costs 250 points':'Hidden formula · reveal for 1 star';
    $('hint').hidden=free||formulaVisible;
    $('target').hidden=free||!formulaVisible;
    const matching=s.phase==='typing'?s.queue:s.built;
    const matchingCells=s.phase==='typing'?s.queueCells:s.builtCells;
    $('target').innerHTML=!free&&formulaVisible?target.map((key,i)=>{
      const cell=level.cells?.[i]??'B2',index=target.slice(0,i).filter((_,j)=>(level.cells?.[j]??'B2')===cell).length;
      const matched=key===E.stackAt(matching,matchingCells,cell)[index];
      return token(key,i,`target-item${matched?' matched':''}`,mode==='challenge'?null:cell);
    }).join(''):'';
    $('rating').hidden=free||s.phase==='typing';
    const result=s.results.at(-1);
    $('rating').textContent=result?`${stars(result.stars)}  +${result.points}`:'';
    $('rating').setAttribute('aria-label',result?`${result.stars} of 3 stars, ${result.points} points`:'Blueprint rating');
    $('feedback').textContent=copy(s.message||(s.scene==='empty'&&s.built.length?'Scene cleared. Restore build brings back your last build.':free?'Move with four arrows or select a tile. Shapes stack in that cell. Enter builds the whole command.':mode==='daily'?'Match every stack. Fewer attempts and shape inputs earn more points. Take your time.':mode!=='challenge'?'Choose a cell, then type its stack. You can build the cells in any order.':s.level===0?'Start with a plane, then add a block. Press Enter.':formulaVisible?'Match the formula. Each shape stacks on the previous one.':'Which shapes make this silhouette? Type a formula and test it.'));
    $('feedback').classList.toggle('success',s.phase!=='typing');
    $('mistakes').textContent=s.mistakes;
    $('finish-free').hidden=!finished;
  }
  function renderCollection(s,mode) {
    const levels=E.levelsFor(s);
    $('collection').hidden=['sandbox','daily'].includes(mode)||s.phase!=='finished';
    $('collection-title').textContent=mode==='spatial'?'Your spatial collection':mode==='kit'?'Your completed kits':'Your blueprint collection';
    $('collection-total').textContent=`${s.results.reduce((n,r)=>n+r.stars,0)} / ${levels.length*3} stars`;
    $('collection-grid').innerHTML=s.results.map(r=>`<div class="result-tile" role="listitem"><span class="result-number">${String(r.level+1).padStart(2,'0')}</span><strong>${levels[r.level].name}</strong><span class="result-stars" aria-label="${r.stars} of 3 stars">${stars(r.stars)}</span></div>`).join('');
    $('daily-result').hidden=mode!=='daily'||s.phase!=='finished';
    $('daily-card').textContent=E.dailyCard(s);
  }
  function clock(profile) {
    const s=profile.sessions[profile.mode];
    const seconds=s.startedAt===null?0:Math.max(0,Math.floor(((s.finishedAt??Date.now())-s.startedAt)/1000));
    $('elapsed').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }
  function render(profile) {
    const mode=profile.mode,s=profile.sessions[mode];
    const level=E.puzzle(s),target=level?.shapes??[];
    const formulaVisible=!!level?.guided||s.hintUsed||s.phase!=='typing';
    document.body.dataset.mode=mode;document.body.dataset.phase=s.phase;document.body.dataset.level=s.level;document.body.dataset.date=s.dailyDate??'';
    document.querySelector('.stats').hidden=mode==='sandbox';
    $('score').textContent=mode==='sandbox'?'—':s.score;
    $('combo').textContent=s.combo?`×${s.combo}`:'—';
    $('best').textContent=mode==='challenge'||mode==='sandbox'?profile.best:profile.records[mode];
    E.MODES.forEach(id=>$(id+'-mode').setAttribute('aria-pressed',id===mode));
    renderScene(s,mode);renderQueue(s,mode,target,formulaVisible);
    renderBrief(s,mode,target,formulaVisible);renderCollection(s,mode);clock(profile);
  }
  function clearPopup(){$('points-pop').textContent='';$('stage').classList.remove('celebrate');}
  function celebrate(points){clearPopup();$('points-pop').textContent=`+${points}`;void $('stage').offsetWidth;$('stage').classList.add('celebrate');}
  function saveStatus(available){$('save-status').textContent=available?'Saved on this device':'Session only · browser storage unavailable';}
  window.ShapeUI={render,clock,celebrate,clearPopup,saveStatus};
})();
