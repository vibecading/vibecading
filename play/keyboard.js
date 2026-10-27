(function(){
  'use strict';
  const E=window.ShapeEngine,G=window.ShapeGeometry,$=id=>document.getElementById(id);
  const held=new Map(),timers=new Map(),rows=['qwertyuiop','asdfghjkl','zxcvbnm'];
  let last=null;
  function describe(id,remember=false){
    const shape=E.SHAPES[id];if(!shape)return;
    if(remember){last=id;document.querySelectorAll('.shape-key.last-used').forEach(b=>b.classList.remove('last-used'));button(id)?.classList.add('last-used');}
    $('key-preview').innerHTML=G.icon(id);
    $('key-name').textContent=`${shape.letter.toUpperCase()} / ${shape.name}`;
    $('key-detail').textContent=`Height ${shape.height} · ${/^\d$/.test(id)?`also key ${id}`:'letter key'}`;
  }
  const button=id=>document.querySelector(`.shape-key[data-shape="${id}"]`);
  function hold(target,token){if(!target)return;release(token);held.set(token,target);target.classList.add('pressed');if(target.dataset.shape)describe(target.dataset.shape,true);}
  function release(token){const target=held.get(token);held.delete(token);if(target&&![...held.values()].includes(target))target.classList.remove('pressed');}
  function releaseAll(){held.clear();for(const timer of timers.values())clearTimeout(timer);timers.clear();document.querySelectorAll('.pressed,.tapped').forEach(b=>b.classList.remove('pressed','tapped'));}
  function tap(id){
    const target=button(id);if(!target)return;describe(id,true);target.classList.add('tapped');clearTimeout(timers.get(id));
    timers.set(id,setTimeout(()=>{target.classList.remove('tapped');timers.delete(id);},180));
  }
  function layout(compact){
    $('shape-keys').classList.toggle('compact',compact);
    $('qwerty-layout').setAttribute('aria-pressed',!compact);$('compact-layout').setAttribute('aria-pressed',compact);
    $('keyboard-layout-note').textContent=compact?'Compact view · tap a key or type A–Z':'QWERTY · each letter is a shape · scroll sideways on small screens';
  }
  function mount(){
    $('shape-keys').innerHTML=rows.map((row,index)=>`<div class="keyboard-row" style="--keys:${row.length};--inset:${[0,4,12][index]}%" role="group" aria-label="${row.toUpperCase()} row">${[...row].map(letter=>{
      const id=E.resolveKey(letter),s=E.SHAPES[id];
      return `<button type="button" class="shape-key" data-shape="${id}" data-letter="${letter}" title="${letter.toUpperCase()} — ${s.name}" aria-label="${letter.toUpperCase()} — ${s.name}" aria-keyshortcuts="${letter.toUpperCase()}${/^\d$/.test(id)?' '+id:''}"><kbd>${letter.toUpperCase()}<span>${/^\d$/.test(id)?id:''}</span></kbd><span class="key-icon">${G.icon(id)}</span><span class="key-label">${s.name}</span><span class="stock" hidden></span></button>`;
    }).join('')}</div>`).join('');
    $('shape-keys').addEventListener('pointerdown',event=>{const target=event.target.closest('.shape-key');if(target&&!target.disabled)hold(target,'pointer:'+event.pointerId);});
    window.addEventListener('pointerup',event=>release('pointer:'+event.pointerId));window.addEventListener('pointercancel',event=>release('pointer:'+event.pointerId));
    $('shape-keys').addEventListener('pointerover',event=>{const target=event.target.closest('.shape-key');if(target&&!held.size)describe(target.dataset.shape);});
    $('shape-keys').addEventListener('pointerleave',event=>{release('pointer:'+event.pointerId);if(last&&!held.size)describe(last);});
    $('shape-keys').addEventListener('focusin',event=>{const target=event.target.closest('.shape-key');if(target)describe(target.dataset.shape);});
    $('qwerty-layout').addEventListener('click',()=>layout(false));$('compact-layout').addEventListener('click',()=>layout(true));
    layout(matchMedia('(max-width:760px)').matches);
    window.addEventListener('blur',releaseAll);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
  }
  const controls={Enter:'#build',Backspace:'#undo',Escape:'#clear','?':'#hint',ArrowLeft:'[data-move="left"]',ArrowRight:'[data-move="right"]',ArrowUp:'[data-move="up"]',ArrowDown:'[data-move="down"]'};
  window.ShapeKeyboard={mount,tap,releaseAll,keyDown:(id,code)=>hold(button(id),code),keyUp:release,
    controlDown:(key,code)=>{const selector=controls[key];if(selector)hold(document.querySelector(selector),code);}};
})();
