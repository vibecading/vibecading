(function () {
  'use strict';
  const E=window.ShapeEngine,G=window.ShapeGeometry,P=window.ShapeStorage,UI=window.ShapeUI,K=window.ShapeKeyboard;
  const $=id=>document.getElementById(id);
  let profile=P.empty(),hiddenAt=null;
  try{profile=P.restore(localStorage.getItem(P.KEY)??localStorage.getItem(P.LEGACY_KEY));}catch{/* Playing remains available without storage. */}
  function save(){
    try{localStorage.setItem(P.KEY,P.serialize(profile));UI.saveStatus(true);}
    catch{UI.saveStatus(false);}
  }
  function focusCommand(){$('command').focus({preventScroll:true});}
  function dispatch(event){
    profile=P.rollDaily(profile);
    const before=profile.sessions[profile.mode],next=E.transition(before,event);
    profile.sessions[profile.mode]=next;
    profile.best=Math.max(profile.best,profile.sessions.challenge.score);
    if(Object.hasOwn(profile.records,profile.mode))profile.records[profile.mode]=Math.max(profile.records[profile.mode],next.score);
    UI.render(profile);save();
    if(next.score>before.score)UI.celebrate(next.lastPoints);
    else if(event.type==='restart'||next.level!==before.level)UI.clearPopup();
  }
  function selectMode(mode){profile=P.rollDaily(profile);profile.mode=mode;UI.clearPopup();$('share-status').textContent='';UI.render(profile);save();focusCommand();}
  function build(){dispatch({type:profile.sessions[profile.mode].phase==='finished'?'restart':'submit'});focusCommand();}
  function typeShape(key,tapped=false){
    dispatch({type:'add',key});
    if(tapped)K.tap(key);focusCommand();
  }
  function exportBuild(){
    const s=profile.sessions[profile.mode];if(s.scene!=='built'||!s.built.length)return;
    const blob=new Blob([G.exportScene(s.built,s.builtCells,{theme:document.documentElement.dataset.theme})],{type:'image/svg+xml'});
    const link=document.createElement('a'),url=URL.createObjectURL(blob);
    link.href=url;link.download='vibecading-build.svg';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  K.mount();
  $('shape-keys').addEventListener('click',event=>{const button=event.target.closest('[data-shape]');if(button&&!button.disabled)typeShape(button.dataset.shape,true);});
  $('cell-map').addEventListener('click',event=>{
    const button=event.target.closest('[data-cell]');
    if(button){dispatch({type:'place',cell:button.dataset.cell});focusCommand();}
  });
  document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>{dispatch({type:'move',direction:b.dataset.move});focusCommand();}));
  $('scene').addEventListener('click',event=>{
    if(profile.mode==='challenge')return;
    const target=event.target.closest('[data-cell],[data-piece-cell]');
    if(target){dispatch({type:'place',cell:target.dataset.cell||target.dataset.pieceCell});focusCommand();}
  });
  $('queue').addEventListener('click',event=>{const b=event.target.closest('[data-remove]');if(b){dispatch({type:'remove',index:Number(b.dataset.remove)});focusCommand();}});
  $('build').addEventListener('click',build);
  $('undo').addEventListener('click',()=>{dispatch({type:'backspace'});focusCommand();});
  $('clear').addEventListener('click',()=>{dispatch({type:'clear'});focusCommand();});
  $('restart').addEventListener('click',()=>{dispatch({type:'restart'});focusCommand();});
  E.MODES.forEach(mode=>$(mode+'-mode').addEventListener('click',()=>selectMode(mode)));
  $('finish-free').addEventListener('click',()=>{selectMode('sandbox');focusCommand();});
  $('hint').addEventListener('click',()=>{dispatch({type:'hint'});focusCommand();});
  $('edit-build').addEventListener('click',()=>{dispatch({type:'edit'});focusCommand();});
  $('restore-build').addEventListener('click',()=>{dispatch({type:'restore'});focusCommand();});
  $('export').addEventListener('click',exportBuild);
  $('blueprint').addEventListener('click',()=>{K.releaseAll();$('blueprint-zoom').showModal();});
  $('close-blueprint').addEventListener('click',()=>$('blueprint-zoom').close());
  $('copy-result').addEventListener('click',async()=>{
    const text=E.dailyCard(profile.sessions.daily);if(!text)return;
    try{await navigator.clipboard.writeText(text);$('share-status').textContent='Result copied';}
    catch{$('share-status').textContent='Clipboard unavailable. Select the card text or use Save card';}
  });
  $('save-result').addEventListener('click',()=>{
    const s=profile.sessions.daily,text=E.dailyCard(s);if(!text)return;
    const url=URL.createObjectURL(new Blob([text+'\n'],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');
    link.href=url;link.download=`shape-terminal-${s.dailyDate}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('share-status').textContent='Result card saved';
  });
  window.addEventListener('keydown',event=>{
    if($('blueprint-zoom').open)return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
    if(event.target.closest('button,a,summary')&&['Enter',' '].includes(event.key))return;
    const code=event.code||event.key;
    K.controlDown(event.key,code);
    const shape=E.resolveKey(event.key,event.code);
    if(shape){event.preventDefault();K.keyDown(shape,code);if(!event.repeat)typeShape(shape);}
    else if(event.key==='Enter'){event.preventDefault();build();}
    else if(event.key==='Backspace'||event.key==='Escape'){
      event.preventDefault();dispatch({type:event.key==='Backspace'?'backspace':'clear'});focusCommand();
    }else if(event.key==='?'&&profile.mode!=='sandbox'){
      event.preventDefault();dispatch({type:'hint'});
    }else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&profile.mode!=='challenge'){
      event.preventDefault();dispatch({type:'move',direction:event.key.slice(5).toLowerCase()});
    }
  });
  window.addEventListener('keyup',event=>K.keyUp(event.code||event.key));
  window.addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){save();hiddenAt=Date.now();}
    else if(hiddenAt!==null){
      const delta=Date.now()-hiddenAt;
      for(const s of Object.values(profile.sessions)){
        for(const key of ['startedAt','levelStartedAt','finishedAt'])if(s[key]!==null)s[key]+=delta;
      }
      hiddenAt=null;UI.clock(profile);save();
    }
  });
  UI.render(profile);save();setInterval(()=>{
    if(document.hidden)return;
    const current=P.rollDaily(profile);
    if(current!==profile){profile=current;UI.clearPopup();UI.render(profile);save();}else UI.clock(profile);
  },1000);focusCommand();
})();
