(function(){
  'use strict';
  const KEY='vibecading.appearance.v1',root=document.documentElement,system=matchMedia('(prefers-color-scheme: dark)');
  const valid=value=>['light','dark','system'].includes(value)?value:'system';
  let preference='system';
  try{preference=valid(localStorage.getItem(KEY));}catch{/* System preference works without storage. */}
  function apply(){
    const theme=preference==='system'?(system.matches?'dark':'light'):preference;
    root.dataset.theme=theme;root.style.colorScheme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='light'?'#F4F6FA':'#0B1330');
    const select=document.getElementById('theme-select');if(select)select.value=preference;
    const logo=document.querySelector('.brand img'),src=theme==='light'?'../brand/lockup-a-light.svg':'../brand/lockup-a-dark.svg';
    if(logo&&logo.getAttribute('src')!==src)logo.setAttribute('src',src);
  }
  apply();
  function mount(){
    apply();document.getElementById('theme-select').addEventListener('change',event=>{
      preference=valid(event.target.value);apply();
      try{localStorage.setItem(KEY,preference);}catch{/* Keep the current page choice. */}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  system.addEventListener('change',()=>{if(preference==='system')apply();});
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){preference=valid(event.newValue);apply();}});
})();
