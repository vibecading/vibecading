(function(root){
  'use strict';
  const CELLS=Object.freeze(['A1','B1','C1','A2','B2','C2','A3','B3','C3']);
  function composition(name,stacks,options={}){
    const shapes=[],cells=[];
    for(const [cell,keys]of Object.entries(stacks))for(const key of keys){shapes.push(key);cells.push(cell);}
    return {name,shapes,cells,...options};
  }
  const spatial=[
    composition('Twin foundations',{B2:'12',C2:'12'},{guided:true}),
    composition('Gateposts',{A2:'131',C2:'131'}),
    composition('Slope study',{A2:'125',B2:'15',C2:'125'}),
    composition('Orbital court',{A2:'13',B2:'16',C2:'13',B1:'1'}),
    composition('Roofscape',{A1:'125',C1:'125',B3:'134'}),
    composition('Little district',{A1:'125',C1:'136',B2:'12',A3:'14',C3:'15'}),
  ];
  const kit=[
    composition('Two roofs',{B2:'125',C2:'125'},{guided:true}),
    composition('Sculpture garden',{A2:'16',B2:'134',C2:'16'}),
    composition('Corner workshop',{A1:'125',C1:'13',B3:'125'}),
    composition('The whole kit',{A1:'125',C1:'136',A3:'124',C3:'15'}),
  ].map(level=>({...level,inventory:Object.fromEntries(['1','2','3','4','5','6'].map(key=>[key,level.shapes.filter(k=>k===key).length]))}));
  const today=(now=Date.now())=>new Date(now).toISOString().slice(0,10);
  const validDate=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&today(Date.parse(date+'T00:00:00Z'))===date;
  function daily(date){
    let seed=2166136261;
    for(const char of date)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const cells=[...CELLS];
    for(let i=cells.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
    const stacks={};
    for(const cell of cells.slice(0,3+Math.floor(random()*2)))stacks[cell]='1'+(random()>.3?(random()>.5?'2':'3'):'')+['4','5','6'][Math.floor(random()*3)];
    return composition('Daily constellation',stacks,{seed:date});
  }
  const api={CELLS,spatial,kit,today,validDate,daily};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ShapePuzzles=api;
})(globalThis);
