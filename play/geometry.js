(function (root) {
  'use strict';
  const frames=typeof module!=='undefined'&&module.exports?require('./icon-frames.js'):root.ShapeIconFrames;
  const ISO=Math.tan(Math.PI/6);
  function icon(key) {
    return scene([key],{wire:true,compact:true,grid:false,presentation:'icon'})
      .replace(/role="img" aria-label="[^"]*"/,'aria-hidden="true"')
      .replace('stroke="#FF6FB0"','stroke="currentColor"').replace('stroke-opacity="0.5"','stroke-opacity="1"');
  }
  const round = n => Math.round(n * 100) / 100;
  function scene(shapes, { wire = false, compact = false, cells = [], grid: showGrid = true, showPads = false, activeCell = 'B2', animate = false, presentation = (!showGrid || compact) && !showPads && shapes.length===1 } = {}) {
    const E=root.ShapeEngine;
    const heights = Object.fromEntries(E.CELLS.map(cell=>[cell,0]));
    const blocks = shapes.map((key,i) => {
      const cell = E.CELLS.includes(cells[i]) ? cells[i] : 'B2';
      const h = E.SHAPES[key].height, z = heights[cell];
      heights[cell] += h;
      return {key,cell,h,z,index:i,...E.cellPosition(cell)};
    });
    const total = Math.max(...Object.values(heights));
    const spread = showPads || blocks.some(b=>b.cell !== 'B2');
    const scale = compact ? Math.min(spread ? 9 : 22, 150 / (total + (spread ? 7.5 : 2)))
      : spread ? Math.min(36,340/(total+7.5)) : Math.min(64,300/(total+2));
    const cx = compact ? 80 : 320;
    const cy = (compact ? 100 : 215) + total * scale / 2;
    const project = (x, y, z, cell = 'B2') => {
      const p=E.cellPosition(cell);
      return [round(cx+(x-y+(p.x-p.y)*2.5)*scale),round(cy+(x+y+(p.x+p.y)*2.5)*scale*ISO-z*scale)];
    };
    const point = p => p.join(',');
    const shade = amount => `rgb(${[255,111,176].map((value, i) => Math.round(value * amount + [13,24,56][i] * (1 - amount))).join(',')})`;
    const face = (points, amount) => `<polygon points="${points.map(point).join(' ')}" fill="${wire ? 'none' : shade(amount)}"/>`;
    function box(z, h, radius, cell) {
      const base = [[-radius,-radius],[radius,-radius],[radius,radius],[-radius,radius]];
      const b = base.map(([x,y]) => project(x,y,z,cell));
      const t = base.map(([x,y]) => project(x,y,z+h,cell));
      return face([b[3], b[2], t[2], t[3]], .65) + face([b[2], b[1], t[1], t[2]], .42) + face(t, 1);
    }
    function column(z, h, cell) {
      const [x, top] = project(0,0,z+h,cell), [, bottom] = project(0,0,z,cell);
      const rx = round(scale * .93), ry = round(scale * .93 * ISO);
      return `<path d="M${x-rx} ${top}V${bottom}C${x-rx} ${bottom+ry*1.33} ${x+rx} ${bottom+ry*1.33} ${x+rx} ${bottom}V${top}" fill="${wire ? 'none' : shade(.6)}"/><ellipse cx="${x}" cy="${top}" rx="${rx}" ry="${ry}" fill="${wire ? 'none' : '#FF6FB0'}"/>`;
    }
    function pyramid(z, h, cell) {
      const a = project(0,0,z+h,cell), l = project(-1,1,z,cell), f = project(1,1,z,cell), r = project(1,-1,z,cell);
      return face([l, f, a], .8) + face([f, r, a], .5);
    }
    function wedge(z,h,cell){
      const a=project(-.9,-.9,z+h,cell),b=project(.9,-.9,z,cell),c=project(.9,.9,z,cell),d=project(-.9,.9,z+h,cell),e=project(-.9,.9,z,cell);
      return face([e,c,d],.6)+face([a,b,c,d],1);
    }
    function sphere(z,h,cell){
      const [x,y]=project(0,0,z+h/2,cell),r=round(h*scale/2);
      const body=`<circle cx="${x}" cy="${y}" r="${r}" fill="${wire?'none':'#FF6FB0'}"/>`;
      if(wire)return body+`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.35}" fill="none"/><ellipse cx="${x}" cy="${y}" rx="${r*.35}" ry="${r}" fill="none"/>`;
      return body+`<path d="M${x} ${y-r}C${x+r*.3} ${y-r} ${x+r*.6} ${y+r*.6} ${x-r*.45} ${y+r*.89}A${r} ${r} 0 0 0 ${x} ${y-r}" fill="${shade(.55)}" stroke="none"/>`;
    }
    function prism(base,z,h,cell,topRatio=1){
      const bottom=base.map(([x,y])=>project(x,y,z,cell)),top=base.map(([x,y])=>project(x*topRatio,y*topRatio,z+h,cell));
      const sides=base.map((p,i)=>({i,j:(i+1)%base.length,depth:p[0]+p[1]}))
        .filter(({i,j})=>(base[j][1]-base[i][1])-(base[j][0]-base[i][0])>0)
        .sort((a,b)=>a.depth-b.depth);
      return sides.map(({i,j})=>face([bottom[i],bottom[j],top[j],top[i]],base[j][1]-base[i][1]>0?.45:.7)).join('')+face(top,1);
    }
    function profile(outline,z,cell,r=.7){
      const back=outline.map(([x,t])=>project(x,-r,z+t,cell)),front=outline.map(([x,t])=>project(x,r,z+t,cell));
      const sides=outline.map((p,i)=>({i,j:(i+1)%outline.length,depth:p[1]})).sort((a,b)=>a.depth-b.depth);
      return face(back,.4)+sides.map(({i,j})=>face([back[i],back[j],front[j],front[i]],outline[j][1]>outline[i][1]?.45:.9)).join('')+face(front,.7);
    }
    const regular=(n,r=1)=>Array.from({length:n},(_,i)=>[Math.cos(i*2*Math.PI/n)*r,Math.sin(i*2*Math.PI/n)*r]);
    function dome(z,h,cell){
      const [x,y]=project(0,0,z,cell),rx=scale*.95,ry=scale*.95*ISO,top=y-h*scale;
      return `<path d="M${x-rx} ${y}C${x-rx} ${top-h*scale*.3} ${x+rx} ${top-h*scale*.3} ${x+rx} ${y}A${rx} ${ry} 0 0 1 ${x-rx} ${y}" fill="${wire?'none':shade(.85)}"/><path d="M${x-rx} ${y}A${rx} ${ry} 0 0 0 ${x+rx} ${y}M${x} ${y+ry}Q${x-rx*.55} ${top} ${x} ${top}" fill="none"/>`;
    }
    function torus(z,h,cell){
      const mesh=[];
      const vertex=(u,v)=>[(.75+.25*Math.cos(v))*Math.cos(u),(.75+.25*Math.cos(v))*Math.sin(u),z+h/2+h/2*Math.sin(v)];
      for(let i=0;i<16;i++)for(let j=0;j<6;j++){
        const points=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([u,v])=>vertex(u*Math.PI/8,v*Math.PI/3));
        mesh.push({points,depth:points.reduce((n,[x,y,t])=>n+x+y+t*.4,0),shade:.5+.45*(1+Math.sin((j+.5)*Math.PI/3))/2});
      }
      return mesh.sort((a,b)=>a.depth-b.depth).map(m=>face(m.points.map(([x,y,t])=>project(x,y,t,cell)),m.shade)).join('');
    }
    function octahedron(z,h,cell){
      const ring=regular(4).map(([x,y])=>[x,y,z+h/2]),top=[0,0,z+h],bottom=[0,0,z];
      const faces=ring.flatMap((p,i)=>[{p:[top,p,ring[(i+1)%4]],shade:.65+i*.08},{p:[bottom,ring[(i+1)%4],p],shade:.4+i*.05}]);
      return faces.filter(({p})=>{
        if(wire)return true;
        const a=p[1].map((n,i)=>n-p[0][i]),b=p[2].map((n,i)=>n-p[0][i]);
        return a[1]*b[2]-a[2]*b[1]+a[2]*b[0]-a[0]*b[2]+a[0]*b[1]-a[1]*b[0]>0;
      }).sort((a,b)=>a.p.flat().reduce((s,n)=>s+n,0)-b.p.flat().reduce((s,n)=>s+n,0))
        .map(f=>face(f.p.map(([x,y,t])=>project(x,y,t,cell)),f.shade)).join('');
    }
    function elbow(z,h,cell){
      // A hollow round tube turns through 90 degrees. Only its continuous
      // silhouette and the two circular openings are stroked, never the mesh.
      const radius=.95,tube=h/2,steps=24;
      const vertex=(angle,phi)=>[.55+(radius+tube*Math.cos(phi))*Math.cos(angle),.55+(radius+tube*Math.cos(phi))*Math.sin(angle),z+h/2+tube*Math.sin(phi)];
      const projected=(angle,phi)=>project(...vertex(angle,phi),cell);
      const curve=points=>'M'+points.map(point).join('L');
      const angles=Array.from({length:steps+1},(_,i)=>Math.PI+i*Math.PI/(2*steps));
      const silhouette=angle=>Math.atan(-(Math.cos(angle)+Math.sin(angle))/(2*ISO));
      const contours=[0,Math.PI].map(offset=>angles.map(angle=>projected(angle,silhouette(angle)+offset)));
      let surface='';
      if(!wire){
        // Longitudinal bands share continuous contours. No crosswise seams
        // means the bend stays smooth even in a small glyph or screenshot.
        surface=Array.from({length:12},(_,i)=>{
          const edge=offset=>angles.map(angle=>projected(angle,silhouette(angle)+Math.PI*(i+offset)/12));
          const points=[...edge(0),...edge(1).reverse()],fill=shade(.48+.44*Math.sin(Math.PI*(i+.5)/12));
          return `<path d="${curve(points)}Z" fill="${fill}" stroke="${fill}" stroke-width=".3"/>`;
        }).join('');
      }
      const outline=contours.map(points=>`<path d="${curve(points)}" fill="none"/>`).join('');
      const ends=[Math.PI,Math.PI*1.5].map(angle=>{
        const ring=factor=>Array.from({length:65},(_,i)=>{
          const phi=i*Math.PI/32;
          return project(.55+(radius+tube*factor*Math.cos(phi))*Math.cos(angle),.55+(radius+tube*factor*Math.cos(phi))*Math.sin(angle),z+h/2+tube*factor*Math.sin(phi),cell);
        });
        return `<g class="pipe-end"><path d="${curve(ring(1))}Z" fill="${wire?'none':shade(.85)}"/><path d="${curve(ring(.57))}Z" fill="${wire?'none':shade(.25)}"/></g>`;
      }).join('');
      return `<g class="pipe-body">${surface}${outline}</g>${ends}`;
    }
    function alphabetShape(key,z,h,cell){
      if(key==='d')return dome(z,h,cell);
      if(key==='o')return torus(z,h,cell);
      if(key==='x')return octahedron(z,h,cell);
      if(key==='f')return prism([[-1,-1],[1,-1],[1,1],[-1,1]],z,h,cell,.45);
      if(key==='h')return prism(regular(6),z,h,cell);
      if(key==='q')return prism(regular(20),z,h,cell,0);
      if(key==='r')return prism([[-1.1,0],[0,-.65],[1.1,0],[0,.65]],z,h,cell);
      if(key==='e')return elbow(z,h,cell);
      const footprints={
        i:[[-1,-1],[1,-1],[1,-.55],[.3,-.55],[.3,.55],[1,.55],[1,1],[-1,1],[-1,.55],[-.3,.55],[-.3,-.55],[-1,-.55]],
        k:[[-.35,-1],[.35,-1],[.35,-.35],[1,-.35],[1,.35],[.35,.35],[.35,1],[-.35,1],[-.35,.35],[-1,.35],[-1,-.35],[-.35,-.35]],
        l:[[-1,-1],[-.35,-1],[-.35,.35],[1,.35],[1,1],[-1,1]],
        t:[[-1,-1],[1,-1],[1,-.35],[.35,-.35],[.35,1],[-.35,1],[-.35,-.35],[-1,-.35]],
        u:[[-1,-1],[-.45,-1],[-.45,.45],[.45,.45],[.45,-1],[1,-1],[1,1],[-1,1]],
        z:[[-1,-1],[1,-1],[1,-.5],[-.15,.45],[1,.45],[1,1],[-1,1],[-1,.5],[.15,-.45],[-1,-.45]],
      };
      if(footprints[key])return prism(footprints[key],z,h,cell);
      if(key==='a'){
        const outer=Array.from({length:13},(_,i)=>{const a=Math.PI-i*Math.PI/12;return [Math.cos(a),.8+Math.sin(a)];});
        const inner=Array.from({length:13},(_,i)=>{const a=i*Math.PI/12;return [.5*Math.cos(a),.8+.5*Math.sin(a)];});
        return profile([[-1,0],...outer,[1,0],[.5,0],...inner,[-.5,0]],z,cell,.5);
      }
      const outlines={
        g:[[-1,0],[0,h],[1,0]],
        j:[[-1,h],[-.4,h],[-.4,.55],[0,.25],[.5,.55],[.5,.9],[1,.9],[1,.35],[.5,0],[-.5,0],[-1,.45]],
        m:[[-1,0],[-1,.4],[-.35,.4],[-.35,.8],[.3,.8],[.3,h],[1,h],[1,0]],
        n:[[-1,0],[-1,h],[-.5,h],[.5,.5],[.5,h],[1,h],[1,0],[.5,0],[-.5,h-.5],[-.5,0]],
        v:[[-1,h],[-.65,h],[0,.3],[.65,h],[1,h],[0,0]],
      };
      return profile(outlines[key],z,cell);
    }
    let grid = '';
    if (!compact && showGrid && !showPads) {
      for (let i = -4; i <= 4; i += .5) {
        grid += `<path d="M${point(project(i,-4,0))}L${point(project(i,4,0))}M${point(project(-4,i,0))}L${point(project(4,i,0))}"/>`;
      }
      grid = `<g class="floor-grid" fill="none" stroke="#EAF0FF" stroke-opacity=".065" stroke-width="1">${grid}</g>`;
      const x = project(3,0,0), y = project(0,3,0);
      grid += `<g class="axis-label" fill="#9AA6C4" font-size="10" font-family="IBM Plex Sans,system-ui,sans-serif"><text x="${x[0]+10}" y="${x[1]}">X</text><text x="${y[0]-16}" y="${y[1]}">Y</text></g>`;
    }
    let pads = '';
    const footprint=(cell,z,r)=>[[-r,-r],[r,-r],[r,r],[-r,r]].map(([x,y])=>point(project(x,y,z,cell))).join(' ');
    if (showPads) pads = E.CELLS.map(cell=>{
      const [x,y]=project(-.9,.9,0,cell),selected=cell===activeCell;
      return `<polygon data-cell="${cell}" points="${footprint(cell,0,1.25)}" fill="#FF6FB0" fill-opacity="${selected ? .12 : heights[cell] ? .035 : .012}" stroke="#FF6FB0" stroke-opacity="${selected ? .9 : .22}" stroke-width="${selected?1.6:(compact ? .5 : 1)}"/><text x="${x}" y="${y+3}" text-anchor="middle" fill="#9AA6C4" font-size="${compact?8:9}" font-family="IBM Plex Sans,system-ui,sans-serif" pointer-events="none">${cell}</text>`;
    }).join('');
    blocks.sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.x-b.x||a.z-b.z);
    const parts = blocks.map(({key,cell,h,z,index}) => {
      const content = key === '3' ? column(z,h,cell) : key === '4' ? pyramid(z,h,cell) : key === '5' ? wedge(z,h,cell) : key === '6' ? sphere(z,h,cell) : ['1','2'].includes(key) ? box(z,h,key === '1' ? 1.08 : .78,cell) : alphabetShape(key,z,h,cell);
      return `<g class="piece" data-piece-cell="${cell}" style="--piece:${index}">${content}</g>`;
    }).join('');
    let cursor='';
    if(showPads&&!compact){
      const z=heights[activeCell]??0,[x,y]=project(0,0,z+.07,activeCell),[,ground]=project(0,0,0,activeCell);
      cursor=`<g class="landing-cursor" data-cursor-cell="${activeCell}" fill="none" stroke="#FF6FB0" stroke-width="2" pointer-events="none"><path d="M${x} ${y}V${ground}" stroke-dasharray="3 4" stroke-opacity=".5"/><polygon points="${footprint(activeCell,z+.07,1.13)}" stroke-dasharray="6 3"/><path d="M${x-4} ${y}h8M${x} ${y-4}v8"/></g>`;
    }
    // The measured compact bounds give every isolated shape one common frame.
    // A uniform transform preserves thin slabs and all original proportions;
    // gameplay compositions use their physical dimensions and never get fitted.
    let fit='',strokeWidth=compact?1:1.6;
    const asIcon=presentation==='icon';
    if(presentation&&shapes.length===1&&!showPads&&frames[shapes[0]]){
      const [x,y,size]=frames[shapes[0]].split(' ').map(Number),ratio=scale/22;
      const position=E.cellPosition(blocks[0].cell);
      const sourceX=cx+(x+size/2-80)*ratio+(position.x-position.y)*2.5*scale;
      const sourceY=cy+(y+size/2-(100+total*11))*ratio+(position.x+position.y)*2.5*scale*ISO;
      const target=asIcon?40.68:compact?88:256,fitScale=target/(size/1.18*ratio);
      const targetX=asIcon?24:cx,targetY=asIcon?24:compact?95:215;
      fit=` data-presentation="fit" transform="translate(${targetX} ${targetY}) scale(${fitScale}) translate(${-sourceX} ${-sourceY})"`;
      strokeWidth=(asIcon?2.2:strokeWidth)/fitScale;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${asIcon?'48 48':compact ? '160 190' : '640 430'}" role="img" aria-label="${wire ? 'Blueprint' : 'Build'} of ${shapes.length} ${shapes.length === 1 ? 'shape' : 'shapes'}${showPads&&activeCell?`, selected cell ${activeCell}`:''}">${grid}${pads}<g class="sculpture ${wire ? 'wire' : 'solid'}${animate?' animate':''}"${fit} stroke="${wire ? '#FF6FB0' : '#0D1838'}" stroke-opacity="${wire ? .5 : 1}" stroke-width="${strokeWidth}" stroke-linejoin="round">${parts}</g>${cursor}</svg>`;
  }
  function exportScene(shapes, cells, {theme='dark'}={}) {
    const background=theme==='light'?'#F4F6FA':'#0B1330',label=theme==='light'?'#4B5675':'#9AA6C4';
    const recipe=shapes.map((key,i)=>`${key}:${cells[i]??'B2'}`).join(' ');
    return scene(shapes,{cells,grid:false,presentation:false}).replace(/(<svg[^>]+>)/,'$1<title>VibeCADing — Shape Terminal build</title><desc>'+recipe+'</desc><rect width="640" height="430" fill="'+background+'"/>')
      .replace('</svg>','<text x="20" y="410" fill="'+label+'" font-size="11" font-family="IBM Plex Sans,system-ui,sans-serif">VibeCADing / Shape Terminal</text></svg>');
  }
  root.ShapeGeometry = { icon, scene, exportScene };
})(globalThis);
