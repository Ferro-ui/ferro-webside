// Project the same concept geometry into an axonometric view, a plan or a gable elevation.
function drawFerroSketch(drawing, model, view, angle, interactive=false) {
  const {length, width, height, roof, elevationWall, placed, zones} = model;
  const studio=view==='volume';
  const outlineView=view==='facade' || (studio && ['drawing','shell'].includes(model.layer));
  const dimensioned=studio && outlineView && (model.layer==='drawing' || model.measurements);
  const moduleWidth=1.1; // Sketch spacing of the sandwich panel seams.
  const prefix=interactive?'ferro-live':'ferro-sheet-'+model.level;
  const finish={gable:'#e6edf6',side:'#f7f9fc',glass:'#d6ebf8',shutter:'#e4e8eb','roof-lit':'#fafbfd','roof-shade':'#e9eef4',seam:'#93a7ba'};
  const {layer,level,wall,cover,tilt}=model;
  const plan = view === 'plan', elevation = view === 'facade';
  const nearX = Math.sin(angle) >= 0 ? length : 0;
  const nearY = Math.cos(angle) >= 0 ? width : 0;
  const gableX = elevationWall === 'back' ? length : 0;
  const isSide = elevationWall.startsWith('side');
  const rise=roof==='gable'?ferroRooms.ridgeRise(model):roof==='mono'?Math.min(width*.14,height*.55):0;
  const top = y => height + rise * (roof === 'mono' ? y / width : 1 - Math.abs(2 * y / width - 1));
  const folds = roof === 'gable' ? [0, width / 2, width] : [0, width];
  const art = document.createDocumentFragment();
  function element(tag, attrs, content) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    if (content !== undefined) node.textContent = content;
    art.append(node);
    return node;
  }
  function line(a, b, stroke = '#b0c2cb', weight = 1, dash = '') {
    if(outlineView) {
      stroke=weight>=1.5?'#20395d':'#8996a6';
      weight=weight>=1.5?weight*.73:weight*.62;
    }
    element('line', {x1:a[0], y1:a[1], x2:b[0], y2:b[1], stroke, 'stroke-width':weight, 'stroke-dasharray':dash});
  }
  function face(points, fill, stroke = '#b9cbd1', weight = 1) {
    if(outlineView && stroke!=='none') stroke='#354457';
    return element('polygon', {points:points.map(p => p.join(',')).join(' '), fill, stroke, 'stroke-width':weight, 'stroke-linejoin':'round'});
  }
  function label(x, y, value, size = 15, anchor = 'middle', fill = '#20395d') {
    return element('text', {x,y, fill, 'font-family':'Helvetica Neue,Arial,sans-serif', 'font-size':size, 'font-weight':600, 'text-anchor':anchor}, value);
  }
  function project(x, y, z) {
    if (plan) return [x, y];
    if (elevation) return [isSide ? (elevationWall==='sideA'?x:length-x) : (gableX===0?y:width-y), -z];
    return [x*Math.cos(angle)-y*Math.sin(angle), (x*Math.sin(angle)+y*Math.cos(angle))*tilt-z*Math.sqrt(1-tilt*tilt)];
  }
  const parts=ferroMassing.parts(model), bays=ferroMassing.fields(model);
  const stations=Array.from({length:bays+1},(_,i)=>length*i/bays);
  const corners = [];
  for(const b of parts) for(const x of [b.x,b.x+b.w]) for(const y of [b.y,b.y+b.d]) {
    corners.push(project(x,y,b.floor),project(x,y,b.top));
  }
  for (const x of [0,length]) for (const y of folds) for (const z of [0,top(y)]) corners.push(project(x,y,z));
  const xs = corners.map(p=>p[0]), ys = corners.map(p=>p[1]);
  const left = Math.min(...xs), right = Math.max(...xs), high = Math.min(...ys), low = Math.max(...ys);
  const scale = Math.min((dimensioned?470:550)/(right-left), (dimensioned?225:265)/(low-high));
  const ox = 360-(left+right)*scale/2, oy = 215-(high+low)*scale/2;
  function p(x, y, z = 0) {
    const [u,v] = project(x,y,z);
    return [ox+u*scale,oy+v*scale];
  }
  const defs=element('defs',{});
  // Paint the sheet inside the SVG so the editor and PDF share the white ground.
  element('rect',{width:720,height:440,fill:'#fff'});
  const {boxes,dividers}=model.zoneGeometry;
  function wallPoint(wall,t,z=0,out=0) {
    if(wall==='front' || wall==='back') return p(wall==='front'?-out:length+out,t,z);
    return p(t,wall==='sideA'?width+out:-out,z);
  }
  function facadeBase(wall) {
    const span=wall.startsWith('side')?length:width;
    if(wall.startsWith('side') && (roof==='gable' || (roof==='mono' && wall==='sideB'))) {
      const t=Math.min(.25,span*.035), radius=Math.min(.06,span*.007);
      if(placed.some(op=>op.wall===wall && op.start<t+radius && op.end>t-radius)) return;
      const out=Math.min(.14,height*.04);
      for(const [offset,color,weight] of [[0,'#5e7487',2.5],[radius*.45,'#bdcdd8',1]]) {
        const pipe=(x,z)=>wallPoint(wall,x+offset,z,out);
        line(pipe(t,height),pipe(t,height*.12),color,weight);
        line(pipe(t,height*.12),pipe(t+radius*1.8,height*.065),color,weight);
      }
    }
  }
  function openings(wall) {
    for(const op of placed.filter(o=>o.wall===wall)) {
      const {start:a,end:b,bottom,top,type}=op;
      const q=(t,z)=>wallPoint(wall,t,z);
      const edge={window:'#477799',door:'#516e56',gate:'#94662c'}[type];
      if(plan) {line(q(a,0),q(b,0),edge,4);continue;}
      const fill={window:finish.glass,door:'#263e5b',gate:finish.shutter}[type];
      const inset=Math.min((b-a)*.065,(top-bottom)*.07,2.4/scale);
      face([q(a,bottom),q(b,bottom),q(b,top),q(a,top)],'#1e3249','#adc0cf',1.1).dataset.opening=type;
      const l=a+inset,r=b-inset,sill=bottom+inset,head=top-inset;
      face([q(a,top),q(b,top),q(r,head),q(l,head)],'#233c57','none');
      face([q(a,bottom),q(l,sill),q(l,head),q(a,top)],'#8095aa','none');
      face([q(l,sill),q(r,sill),q(r,head),q(l,head)],fill,'none');
      if(type==='gate') {
        for(let i=1;i<8;i++) {
          const z=sill+(head-sill)*i/8;
          line(q(l,z),q(r,z),'#657e94',.9);
          line(q(l,z+inset*.24),q(r,z+inset*.24),'#dbe5ec',.65);
        }
      } else if(type==='window') {
        line(q(a,top),q(b,top),'#e8f3f9',1.4);
        if((b-a)*scale>35) line(q((l+r)/2,sill),q((l+r)/2,head),'#48657e',1.6);
        line(q(l,sill),q(r,sill),'#c9e5ef',1.3);
      } else {
        line(q(a+(b-a)*.66,top*.48),q(a+(b-a)*.85,top*.48),'#e8eff5',2);
      }
    }
  }
  function dimension(a,b,value,vertical=false) {
    line(a,b,'#93b2c1');
    for (const q of [a,b]) line([q[0]-4,q[1]+4],[q[0]+4,q[1]-4],'#678097');
    const x = (a[0]+b[0])/2, y = (a[1]+b[1])/2;
    label(x+(vertical?9:0), y+(vertical?4:-8), value, 15,vertical?'start':'middle');
  }
  function drawingAnnotations() {
    const ink='#20395d';
    const corner=p(nearX,nearY);
    const centre=p(length/2,width/2);
    function span(end,value) {
      const dx=end[0]-corner[0],dy=end[1]-corner[1],dist=Math.hypot(dx,dy);
      if(dist<35) return;
      let nx=-dy/dist,ny=dx/dist;
      if((centre[0]-corner[0])*nx+(centre[1]-corner[1])*ny>0) {nx=-nx;ny=-ny;}
      const offset=(q,n)=>[q[0]+nx*n,q[1]+ny*n];
      const a=offset(corner,23),b=offset(end,23);
      for(const q of [corner,end]) {
        line(offset(q,3),offset(q,29));
        const [x,y]=offset(q,23);
        line([x-3,y+4],[x+3,y-4],ink,1.6);
      }
      line(a,b,ink,1.3);
      const text=label((a[0]+b[0])/2,(a[1]+b[1])/2+4,String(Math.round(value*1000)),15,'middle',ink);
      text.setAttribute('paint-order','stroke');text.setAttribute('stroke','#fff');text.setAttribute('stroke-width',5);
    }
    span(p(length-nearX,nearY),length);
    span(p(nearX,width-nearY),width);
    const levelText=z=>z===0?'±0,000':'+'+z.toFixed(3).replace('.',',');
    const roofName={gable:'Møne',mono:'Høy raft',flat:'Tak'}[roof];
    const yTop=roof==='gable'?width/2:roof==='mono'?width:nearY;
    const rightmost=points=>points.reduce((a,b)=>a[0]>b[0]?a:b);
    const peak=rightmost([p(0,yTop,top(yTop)),p(length,yTop,top(yTop))]);
    const foot=rightmost([p(0,0),p(0,width),p(length,0),p(length,width)]);
    function levelMark(point,caption,baseline) {
      const x=636;
      line(point,[x-12,baseline],ink,1,'4 3');
      face([[x-12,baseline],[x-5,baseline-6],[x-19,baseline-6]],ink,'none');
      line([x-19,baseline-6],[702,baseline-6],ink,1.4);
      label(700,baseline-11,caption,13,'end',ink);
    }
    levelMark(peak,roofName+' '+levelText(top(yTop)),Math.max(77,peak[1]-10));
    levelMark(foot,'OK gulv '+levelText(0),Math.max(foot[1]+23,peak[1]+43));
    label(22,411,(parts.length?'Hovedbygg  ':'Ytre mål  ')+Math.round(length*1000)+' × '+Math.round(width*1000)+' mm',15,'start',ink);
    label(698,411,'Koter i m · relativt til gulv',13,'end',ink);
  }
  function drawCladding(side) {
    if(wall==='other') return;
    const end=side==='front' || side==='back';
    const span=end?width:length;
    const profile=end?folds:[0,span];
    const head=end?top:()=>top(side==='sideA'?width:0);
    const q=(t,z)=>wallPoint(side,t,z);
    // Clip the joints to the actual roof slope.
    const outline=[q(0,0),q(span,0),...profile.slice().reverse().map(t=>q(t,head(t)))];
    const id=prefix+'-cladding-'+side;
    const clip=element('clipPath',{id});
    clip.append(face(outline,'white','none'));defs.append(clip);
    const joints=element('g',{'clip-path':'url(#'+id+')','data-cladding':side});
    const horizontal=wall==='horizontal';
    const increment=wall==='sheet'?span/(end?40:50):moduleWidth;
    const limit=horizontal?Math.max(...profile.map(head)):span;
    const bevel=Math.min(.018,increment*.02);
    for(let i=1;i*increment<limit-1e-7;i++){
      const t=i*increment;
      const point=(u,offset)=>horizontal?q(u,t+offset):q(t+offset,u);
      const lo=0,hi=horizontal?span:head(t);
      const joint=face([point(lo,-bevel),point(hi,-bevel),point(hi,0),point(lo,0)],'#8497a6',finish.seam,.65);
      joint.dataset.station=String(Math.round(t*1000));
      joints.append(joint);
    }
  }
  function gable(x) {
    face([p(x,0),p(x,width),...folds.slice().reverse().map(y=>p(x,y,top(y)))],finish.gable);
    const side=x===0?'front':'back';
    drawCladding(side);facadeBase(side);openings(side);
  }
  const formatArea=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:1});
  function drawFloor(zone,i,floor,interior,edges) {
    if(!ferroRooms.levels(zone,model).includes(floor)) return;
    const band=height/model.stories;
    const z={ground:0,deck:band*.5,second:band,third:band*2,loft:height}[floor];
    const {x:x0,y:y0,w:span,h:depth}=ferroRooms.surface(model,i,floor);
    const upperColors={deck:'#d3b789',second:'#9bb9be',third:'#b6acbe',loft:'#b6ced9'};
    function tag(node,path) {node.dataset.zone=i;node.dataset.room=path;}
    const cells=ferroRooms.cells(zone.layouts[floor]);
    for(const [j,cell] of cells.entries()) {
      const a=x0+cell.x*span, b=a+span*cell.w, lo=y0+cell.y*depth, hi=lo+cell.h*depth;
      const corners=[p(a,lo,z),p(b,lo,z),p(b,hi,z),p(a,hi,z)];
      const selected=interactive && plan && i===model.selected && cell.path===model.roomPath;
      const fill=selected?'#f7dc9f':(upperColors[floor] || zone.color);
      if(interior && floor!=='ground') {
        const lip=Math.min(3/scale,band*.045), xx=nearX===0?a:b, yy=nearY===0?lo:hi;
        face([p(xx,lo,z),p(xx,hi,z),p(xx,hi,z-lip),p(xx,lo,z-lip)],'#61788d','none');
        face([p(a,yy,z),p(b,yy,z),p(b,yy,z-lip),p(a,yy,z-lip)],'#899fb2','none');
      }
      const slab=face(corners,fill,'#374f59',1.8);
      slab.dataset.floor=floor;
      if(plan) tag(slab,cell.path);
      if(interior) {
        edges.push({axis:'x',at:lo,start:a,end:b,zone:i},{axis:'x',at:hi,start:a,end:b,zone:i},
          {axis:'y',at:a,start:lo,end:hi,zone:i},{axis:'y',at:b,start:lo,end:hi,zone:i});
      } else {
        const w=(b-a)*scale,h=(hi-lo)*scale;
        if(w<16 || h<13) continue;
        const [cx,cy]=p((a+b)/2,(lo+hi)/2);
        const name=cell.node.name.trim() || zone.name, max=Math.floor(w/8);
        const roomLabel=name.length<=max?name:(max>=5?name.slice(0,max-1)+'…':String(j+1));
        const showArea=h>=40 && w>52;
        tag(label(cx,cy+(showArea?-3:4),roomLabel,13,'middle','#17303e'),cell.path);
        if(showArea) tag(label(cx,cy+14,formatArea.format((hi-lo)*(b-a))+' m²',11,'middle','#364f5a'),cell.path);
      }
    }
  }
  // Room polygons share edges, including partial edges at T-junctions.
  // Paint each continuous wall once so adjacent rooms do not double its opacity.
  function transparentWalls(edges,z,ceiling) {
    const runs=new Map(), epsilon=1e-7;
    for(const edge of edges) {
      const key=edge.axis+edge.at.toFixed(7);
      if(!runs.has(key)) runs.set(key,[]);
      runs.get(key).push(edge);
    }
    const walls=[];
    for(const run of runs.values()) {
      run.sort((a,b)=>a.start-b.start);
      let wall;
      for(const edge of run) {
        if(wall && edge.start<=wall.end+epsilon) wall.end=Math.max(wall.end,edge.end);
        else {wall={...edge};walls.push(wall);}
      }
    }
    const depth=w=>{
      const mid=(w.start+w.end)/2;
      return w.axis==='x'?mid*Math.sin(angle)+w.at*Math.cos(angle):w.at*Math.sin(angle)+mid*Math.cos(angle);
    };
    walls.sort((a,b)=>depth(a)-depth(b));
    for(const w of walls) {
      const alongX=w.axis==='x', far=alongX?nearY!==w.at:nearX!==w.at;
      const outside=Math.abs(w.at)<epsilon || Math.abs(w.at-(alongX?width:length))<epsilon;
      const point=(t,h)=>alongX?p(t,w.at,h):p(w.at,t,h);
      const roofCut=typeof ceiling==='function';
      const knots=[w.start];
      if(roofCut && !alongX && w.start<width/2 && w.end>width/2) knots.push(width/2);
      knots.push(w.end);
      const cap=knots.map(t=>point(t,roofCut?ceiling(alongX?w.at:t):ceiling));
      const pane=face([point(w.end,z),point(w.start,z),...cap],alongX?'#c3e3f1':'#9fc9e1','#627e95',outside?1.1:.8);
      pane.setAttribute('fill-opacity',outside?(far?.21:.10):.17);
      pane.setAttribute('stroke-opacity',outside?.68:.49);
      for(let i=1;i<cap.length;i++) line(cap[i-1],cap[i],outside?'#7c96aa':'#8da6b8',outside?1.3:.85);
    }
  }
  function aboveMezzanine(edge) {
    const zone=zones[edge.zone];
    if(!zone.mezzanine) return [edge];
    const bounds=boxes[edge.zone], f=ferroRooms.footprint(zone,'deck');
    const x=bounds.x+bounds.w*f.x, y=bounds.y+bounds.h*f.y;
    const right=x+bounds.w*f.w, bottom=y+bounds.h*f.h;
    const alongX=edge.axis==='x', lo=alongX?x:y, hi=alongX?right:bottom;
    if(edge.at<(alongX?y:x)-1e-7 || edge.at>(alongX?bottom:right)+1e-7) return [edge];
    return [{...edge,end:Math.min(edge.end,lo)},{...edge,start:Math.max(edge.start,hi)}].filter(e=>e.end-e.start>1e-7);
  }
  function longWall(y) {
    face([p(0,y),p(length,y),p(length,y,top(y)),p(0,y,top(y))],finish.side);
    const sideWall=y===width?'sideA':'sideB';
    drawCladding(sideWall);
    facadeBase(sideWall);openings(sideWall);
  }
  function drawFigures(floor,z) {
    const items=ferroFigures.entries(model,floor);
    const draft=interactive && plan && model.figureDraft;
    if(draft) items.push({box:draft.box,shape:{points:draft.points,name:''},draft:true});
    for(const item of items) {
      const {box,shape}=item;
      const projectPoint=([u,v])=>p(box.x+box.w*u,box.y+box.h*v,z);
      const points=shape.points.map(projectPoint);
      const active=interactive && plan && shape.id && model.activeFigure===shape.id;
      function pick(node) {
        if(interactive && plan && shape.id) node.dataset.figureId=shape.id;
      }
      if(points.length>=2) {
        const attrs={points:points.map(pt=>pt.join(',')).join(' '),fill:'#f7d393','fill-opacity':item.draft?.20:.68,
          stroke:'#814617','stroke-width':active?2.8:1.7,'stroke-linejoin':'round'};
        if(item.draft) attrs['stroke-dasharray']='5 3';
        const outline=element(item.draft?'polyline':'polygon',attrs);pick(outline);
        if(shape.name) {
          const [cx,cy]=projectPoint(ferroFigures.anchor(shape.points));
          const caption=label(cx,cy+4,shape.name,13,'middle','#432b19');
          caption.setAttribute('stroke','#fff1d4');caption.setAttribute('stroke-width','3');
          caption.setAttribute('paint-order','stroke');pick(caption);
        }
      }
      if(active || item.draft) points.forEach(([cx,cy],i)=>{
        const grip=element('circle',{cx,cy,r:4.8,fill:'#fff5df',stroke:'#874619','stroke-width':1.6});
        if(active){
          const target=element('circle',{cx,cy,r:9,fill:'transparent'});pick(target);target.dataset.vertex=i;
          pick(grip);grip.dataset.vertex=i;
        }
      });
    }
  }
  // The main volume separates attachments on its far faces from those on its near faces.
  const vx=elevation?(isSide?0:elevationWall==='front'?-1:1):Math.sin(angle);
  const vy=elevation?(isSide?(elevationWall==='sideA'?1:-1):0):Math.cos(angle);
  const partDepth=b=>(b.x+b.w/2)*vx+(b.y+b.d/2)*vy;
  parts.sort((a,b)=>partDepth(a)-partDepth(b));
  const inFront=b=>({front:-vx,back:vx,sideA:vy,sideB:-vy})[b.side]>0;
  const zLevel={ground:0,deck:height/(model.stories*2),second:height/model.stories,third:2*height/model.stories,loft:height};
  function drawPart(b) {
    const ring=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.d],[b.x,b.y+b.d]];
    const rect=z=>ring.map(([x,y])=>p(x,y,z));
    const floor=rect(b.floor),cap=rect(b.top);
    const wing=b.type==='wing', balcony=b.type==='balcony';
    const palette={wood:'#e3dbc9',wall:'#e3eaf1',edge:'#617185'};
    const name=ferroMassing.types[b.type];
    if(plan){
      if(level!=='ground' && !(wing && zLevel[level]<b.height && !['deck','loft'].includes(level)) &&
        !(balcony && ['second','third'].includes(level) && Math.abs(zLevel[level]-b.floor)<height/model.stories*.5)) return;
      const outline=face(floor,wing?'#c1ced7':palette.wood,palette.edge,1.8);
      outline.dataset.part=b.type;
      if(balcony && level==='ground') outline.setAttribute('stroke-dasharray','5 3');
      const mid=p(b.x+b.w/2,b.y+b.d/2);
      if(Math.min(b.w,b.d)*scale>19 && b.w*scale>name.length*6)
        label(mid[0],mid[1]+4,name,11,'middle','#253c51');
      return;
    }
    const open=studio && layer==='open', steelView=studio && layer==='steel';
    if(open && model.section!=='all' && balcony && b.floor>zLevel[model.section]+.01) return;
    const visible=[vy<0?0:2,vx<0?3:1],attached={sideA:0,sideB:2,front:1,back:3}[b.side];
    if(wing && steelView) {
      face(floor,'#bacad2',palette.edge);
      for(let i=0;i<4;i++){line(floor[i],cap[i],'#afc3d3',3);line(cap[i],cap[(i+1)%4],'#b6c9d6',2.8);}
      return;
    }
    if(wing){
      face(floor,'#c1d0d8',palette.edge);
      for(const i of visible){
        const j=(i+1)%4;
        const pane=face([floor[i],floor[j],cap[j],cap[i]],i%2?palette.wall:'#eef3f7',palette.edge);
        if(open){pane.setAttribute('fill-opacity','.23');continue;}
        if(wall==='horizontal') for(let z=moduleWidth;z<b.top;z+=moduleWidth) line(p(...ring[i],z),p(...ring[j],z),'#8ea1b3',.85);
        if(wall==='vertical' || wall==='sheet'){
          const distance=Math.hypot(ring[j][0]-ring[i][0],ring[j][1]-ring[i][1]);
          for(let t=wall==='vertical'?moduleWidth:.45;t<distance;t+=wall==='vertical'?moduleWidth:.45){
            const x=ring[i][0]+(ring[j][0]-ring[i][0])*t/distance,y=ring[i][1]+(ring[j][1]-ring[i][1])*t/distance;
            line(p(x,y,0),p(x,y,b.top),'#8ea1b3',.8);
          }
        }
      }
      if(!open) face(cap,'#d1dde7',palette.edge,1.6).dataset.part=b.type;
    } else {
      const slab=face(floor,palette.wood,'#666b69',1.7);slab.dataset.part=b.type;
      for(let i=1;i<Math.min(32,Math.ceil(b.w/.2));i++){
        const x=b.x+b.w*i/Math.min(32,Math.ceil(b.w/.2));
        line(p(x,b.y,b.floor),p(x,b.y+b.d,b.floor),'#b09c80',.8);
      }
      if(balcony) for(let i=0;i<4;i++){
        if(i===attached) continue;
        const j=(i+1)%4;
        line(cap[i],cap[j],'#677f94',2);
        for(const k of [i,j]) line(floor[k],cap[k],'#788e9f',1.7);
        const panels=Math.min(18,Math.ceil(Math.hypot(ring[j][0]-ring[i][0],ring[j][1]-ring[i][1])/1.4));
        for(let k=1;k<panels;k++){
          const t=k/panels,x=ring[i][0]+(ring[j][0]-ring[i][0])*t,y=ring[i][1]+(ring[j][1]-ring[i][1])*t;
          line(p(x,y,b.floor),p(x,y,b.top),'#8296a4',1.2);
        }
      }
    }
  }
  function drawStairs(floor) {
    zones.forEach((zone,i)=>{
      const stair=zone.stair;
      if(!stair?.type) return;
      const to=ferroStairs.destination(zone,model);
      if(plan ? floor!=='ground' && floor!==to : !to || floor!==to) return;
      const landing=ferroStairs.landing(model,i,to);
      if(!landing) return;
      const {w:span,h:depth}=landing;
      const run=Math.min(span*.72,depth*.68,4.3), treadWidth=run*.22;
      const front=stair.corner.startsWith('Fremre'), sideA=stair.corner.endsWith(' A');
      const originX=landing.x+(front?span*.06:span*.94);
      const originY=landing.y+(sideA?depth*.94:depth*.06);
      const band=height/model.stories,z={deck:band/2,second:band,third:2*band,loft:height}[to] || 0;
      const point=(x,y,h)=>p(originX+(front?x:-x),originY+(sideA?-y:y),plan?0:h*z);
      const edge='#36586a',fill=stair.material==='Tre'?'#efd1a6':stair.material==='Betong'?'#d7dbda':'#d9edf4';
      function surface(corners,color) {
        const node=face(corners.map(c=>point(...c)),color,edge,.85);
        node.dataset.stair=stair.type;node.setAttribute('pointer-events','none');
      }
      function flight(x0,x1,y,h0,h1) {
        const count=6;
        for(let j=0;j<count;j++){
          const x=x0+(x1-x0)*j/count,next=x0+(x1-x0)*(j+1)/count;
          const h=h0+(h1-h0)*j/count,high=h0+(h1-h0)*(j+1)/count;
          if(!plan) surface([[x,y,h],[x,y+treadWidth,h],[x,y+treadWidth,high],[x,y,high]],'#8ea5af');
          surface([[x,y,high],[next,y,high],[next,y+treadWidth,high],[x,y+treadWidth,high]],fill);
        }
        if(plan){
          const mid=y+treadWidth/2, sign=Math.sign(x1-x0);
          line(point(x0,mid,0),point(x1,mid,0),'#204760',1.6);
          surface([[x1,mid,0],[x1-sign*treadWidth*.4,mid-treadWidth*.23,0],[x1-sign*treadWidth*.4,mid+treadWidth*.23,0]],'#204760');
        }
      }
      if(stair.type==='Rett trapp') flight(run,0,0,0,1);
      else {
        flight(0,run-treadWidth,0,0,.5);
        surface([[run-treadWidth,0,.5],[run,0,.5],[run,treadWidth*2,.5],[run-treadWidth,treadWidth*2,.5]],fill);
        flight(run-treadWidth,0,treadWidth,.5,1);
      }
    });
  }
  function axisTag(origin,toward,text) {
    const dx=toward[0]-origin[0],dy=toward[1]-origin[1],d=Math.hypot(dx,dy);
    if(d<.01) return;
    const cx=origin[0]+dx/d*22,cy=origin[1]+dy/d*22;
    line(origin,[cx,cy],'#7393aa',1,'4 2');
    element('circle',{cx,cy,r:8,fill:'#eaf2fa',stroke:'#65849b','stroke-width':1,'data-axis-tag':text});
    label(cx,cy+3.7,text,10,'middle','#20395d');
  }
  function axes(planView) {
    const y=planView?width:nearY,x=planView?0:nearX;
    const delta=y===0?-1:1;
    const spacing=Math.hypot(...p(stations[1],y).map((v,i)=>v-p(0,y)[i]));
    const every=Math.max(1,Math.ceil(23/Math.max(1,spacing)));
    for(let i=0;i<stations.length;i++) if(i===bays || (i%every===0 && (bays-i>=every))) {
      axisTag(p(stations[i],y),p(stations[i],y+delta),String(i+1));
    }
    for(const [yy,letter] of [[width,'A'],[0,'B']]) axisTag(p(x,yy),p(x+(x===0?-1:1),yy),letter);
  }
  if(!plan) parts.filter(b=>!inFront(b)).forEach(drawPart);
  if (plan) {
    if(level==='deck' || level==='loft') face([p(0,0),p(length,0),p(length,width),p(0,width)],'#f2f5f8','#879bad');
    zones.forEach((zone,i)=>drawFloor(zone,i,level,false));
    const current=zones[model.selected];
    if(interactive && ferroRooms.levels(current,model).includes(level)) {
      const {x,y,w,h}=ferroRooms.surface(model,model.selected,level);
      face([p(x,y),p(x+w,y),p(x+w,y+h),p(x,y+h)],'none','#977136',2.5).setAttribute('pointer-events','none');
      if(interactive) {
        const grip=(center,action,axis,symbol)=>{
          const [cx,cy]=center;
          const group=element('g',{'data-grip':action,'data-axis':axis,'aria-hidden':'true'});
          group.append(element('circle',{cx,cy,r:12,fill:'transparent'}));
          group.append(element('rect',{x:cx-9,y:cy-8,width:18,height:16,rx:4,fill:'#173b4a',stroke:'#e4eff0'}));
          group.append(label(cx,cy+4,symbol,12,'middle','#fff'));
          return group;
        };
        const boundaries=[];
        ferroRooms.cells(current.layouts[level],boundaries);
        for(const {node,path,x:bx,y:by,w:bw,h:bh} of boundaries) {
          const vertical=node.axis==='x';
          const start=p(x+w*(bx+(vertical?bw*node.ratio:0)),y+h*(by+(vertical?0:bh*node.ratio)));
          const stop=[start[0]+(vertical?0:bw*w*scale),start[1]+(vertical?bh*h*scale:0)];
          const attrs={'data-grip':'wall','data-axis':node.axis,'data-wall-path':path,'data-span':vertical?bw*w:bh*h};
          element('line',{x1:start[0],y1:start[1],x2:stop[0],y2:stop[1],stroke:'transparent','stroke-width':12,...attrs});
          if(Math.hypot(stop[0]-start[0],stop[1]-start[1])>31) {
            const mid=start.map((v,j)=>(v+stop[j])/2);
            const handle=grip(mid,'wall',node.axis,vertical?'↔':'↕');
            for(const [key,val] of Object.entries(attrs)) handle.setAttribute(key,val);
          }
        }
        if(level==='loft') {
          grip(p(x+w*.72,y+h),'loftWidth','y','↕');
          grip(p(x+w,y+h*.32),'loftLength','x','↔');
        }
        if(level==='deck') {
          for(const [edge,dx,dy,axis] of [['left',0,.5,'x'],['right',1,.5,'x'],['top',.5,0,'y'],['bottom',.5,1,'y']])
            grip(p(x+w*dx,y+h*dy),edge,axis,axis==='x'?'↔':'↕');
          grip(p(x+w*.25,y+h*.25),'move','both','✥');
        }
      }
    }
    const upper=['ground','second','third'][model.stories-1];
    if(roof==='gable' && (level===upper || level==='loft')) {
      const a=p(0,width/2), b=p(length,width/2);
      line(a,b,'#314c63',1.5,'7 5');art.lastChild.setAttribute('pointer-events','none');
      const note=label(a[0]-6,a[1]-6,'Møne',12,'end','#445e75');note.setAttribute('pointer-events','none');
    }
    if(level==='ground') Object.keys(ferroOpenings.walls).forEach(openings);
    for (const [index,d] of (interactive && !['deck','loft'].includes(level)?dividers:[]).entries()) {
      const vertical=d.axis==='x';
      const [cx,cy]=p(d.x+d.w*(vertical?d.ratio:.77),d.y+d.h*(vertical?.77:d.ratio));
      const dot=element('circle',{cx,cy,r:12,fill:'#193746',stroke:'#d6e6ec'});
      const arrow=label(cx,cy+4,vertical?'↔':'↕',12,'middle','#fff');
      for(const node of [dot,arrow]) {node.dataset.divider=index;node.dataset.axis=d.axis;}
    }
    parts.forEach(drawPart);
    drawFigures(level,0);
    drawStairs(level);
    const minX=Math.min(0,...parts.map(b=>b.x)),maxX=Math.max(length,...parts.map(b=>b.x+b.w));
    const minY=Math.min(0,...parts.map(b=>b.y)),maxY=Math.max(width,...parts.map(b=>b.y+b.d));
    const [x,y]=p(minX,minY),[ex,ey]=p(maxX,maxY);
    label((x+ex)/2,ey+(model.showAxes?44:20),'Langside A',12,'middle','#445e75');
    label((x+ex)/2,y-45,'Langside B',12,'middle','#445e75');
    dimension([x,y-14],[ex,y-14],formatArea.format(maxX-minX)+' m');
    dimension([ex+12,y],[ex+12,ey],formatArea.format(maxY-minY)+' m',true);
  } else if (elevation) {
    if(isSide) longWall(elevationWall==='sideA'?width:0);
    else gable(gableX);
    const span=isSide?length:width;
    const first=wallPoint(elevationWall,0), last=wallPoint(elevationWall,span);
    dimension([first[0],first[1]+24],[last[0],last[1]+24],span+' m');
    const base=first[0]<last[0]?last:first;
    dimension([base[0]+14,base[1]],[base[0]+14,base[1]-height*scale],height+' m',true);
  } else if(layer==='steel') {
    let arrival=0;
    const steel=(a,b)=>{
      if(model.framePreview) {
        element('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#355575','stroke-width':5,
          'stroke-linecap':'round',pathLength:1,'data-member':'',style:'--arrival:'+arrival+'ms'});
        return;
      }
      line(a,b,'#1e3555',6);
      line(a,b,'#aac0d1',4.1);
      line([a[0]-1,a[1]-1],[b[0]-1,b[1]-1],'#e0e8e9',1.2);
    };
    const ends=nearX===0?stations.slice().reverse():stations;
    const plate=Math.min(5/scale,length*.03,width*.03);
    face([p(0,0),p(length,0),p(length,width),p(0,width)],'#f1f4f7','#8295a7');
    for(const [index,x] of ends.entries()) {
      arrival=Math.round(380*index/Math.max(1,ends.length-1));
      for(const y of [0,width]) {
        face([p(x-plate,y-plate),p(x+plate,y-plate),p(x+plate,y+plate),p(x-plate,y+plate)],'#536c88','#a7bacb',.8);
      }
      for(const y of [0,width]) steel(p(x,y),p(x,y,top(y)));
      for(let i=1;i<folds.length;i++) steel(p(x,folds[i-1],top(folds[i-1])),p(x,folds[i],top(folds[i])));
    }
    arrival=540;
    for(const y of folds) steel(p(0,y,top(y)),p(length,y,top(y)));
  } else if(layer==='open') {
    face([p(0,0),p(length,0),p(length,width),p(0,width)],'#e6ebf0');
    const indices=zones.map((_,i)=>i);
    indices.sort((a,b)=>{
      const depth=box=>(box.x+box.w/2)*Math.sin(angle)+(box.y+box.h/2)*Math.cos(angle);
      return depth(boxes[a])-depth(boxes[b]);
    });
    const band=height/model.stories;
    const hasDeck=zones.some(zone=>zone.mezzanine);
    let groundEdges=[];
    for(const floor of Object.keys(ferroRooms.titles)) {
      const edges=[];
      for(const i of indices) drawFloor(zones[i],i,floor,true,edges);
      if(edges.length) drawFigures(floor,{ground:0,deck:band*.5,second:band,third:band*2,loft:height}[floor]);
      if(floor==='ground') {
        transparentWalls(edges,0,hasDeck?band/2:band);
        groundEdges=edges;
      } else if(floor==='deck' && hasDeck) {
        transparentWalls([...groundEdges.flatMap(aboveMezzanine),...edges],band/2,band);
      } else if(floor==='loft' && edges.length) {
        transparentWalls(edges,height,top);
      } else if(edges.length) {
        const z=floor==='second'?band:2*band;
        transparentWalls(edges,z,z+band);
      }
      drawStairs(floor);
      if(floor===model.section) break;
    }
    if(roof==='gable' && ['all','loft'].includes(model.section)) {
      for(const x of [0,length]) {
        const peak=p(x,width/2,height+rise);
        face([p(x,0,height),peak,p(x,width,height)],'#b4d9ed','none').setAttribute('fill-opacity',.13);
        for(const y of [0,width]) line(p(x,y,height),peak,'#849bad',1.25);
      }
      line(p(0,width/2,height+rise),p(length,width/2,height+rise),'#688299',1.35,'7 3');
    }
  } else {
    gable(nearX);
    longWall(nearY);
    // The folded verge sits just outside the gable, casting a thin shadow over the cladding.
    const trim=Math.min(height*.045,width*.018,length*.012);
    const outerX=nearX===0?-trim:length+trim;
    for(let i=1;i<folds.length;i++) {
      const a=folds[i-1], b=folds[i];
      face([p(outerX,a,top(a)),p(outerX,b,top(b)),p(outerX,b,top(b)-trim),p(outerX,a,top(a)-trim)],'#5a7591','#8fa7bb',.65);
      face([p(nearX,a,top(a)),p(nearX,b,top(b)),p(outerX,b,top(b)),p(outerX,a,top(a))],'#d5e0e9','none');
    }
    // Folded corner flashing and the plinth follow the visible wall edges.
    for(const x of [0,length]) line(p(x,nearY),p(x,nearY,top(nearY)),'#9bb1c6',2);
    line(p(nearX,0),p(nearX,width),'#687f93',2.4);
    line(p(0,nearY),p(length,nearY),'#879bab',2.4);
    // The far roof plane is painted first, so rotating across the ridge preserves occlusion.
    const roofPlanes=folds.slice(1).map((y,i)=>[folds[i],y]);
    if (nearY===0) roofPlanes.reverse();
    roofPlanes.forEach(([a,b])=>{
      face([p(0,a,top(a)),p(length,a,top(a)),p(length,b,top(b)),p(0,b,top(b))],a===0?finish['roof-shade']:finish['roof-lit'],'#acc0d1',1.1);
      const seams={membrane:5,trp:38,sandwich:14,other:1}[cover];
      for(let i=1;i<seams;i++) {
        const x=length*i/seams;
        line(p(x,a,top(a)),p(x,b,top(b)),cover==='membrane'?'#91a5b6':'#7e94a7',.9);
        const dx=Math.min(length/seams*.08,.85/scale);
        line(p(x+dx,a,top(a)),p(x+dx,b,top(b)),'#e2e9ee',.85);
      }
      for(const x of [0,length]) line(p(x,a,top(a)),p(x,b,top(b)),'#d6e0e9',1.6);
    });
    const eave=top(nearY);
    line(p(0,nearY,eave),p(length,nearY,eave),'#354e67',3.6);
    line(p(0,nearY,eave),p(length,nearY,eave),'#b7c9d7',1.2);
    if(roof==='gable') line(p(0,width/2,top(width/2)),p(length,width/2,top(width/2)),'#dce6ef',2);

  }
  if(!plan) parts.filter(inFront).forEach(drawPart);
  if(dimensioned) drawingAnnotations();
  if(studio && layer==='steel' && !model.framePreview) axes(false);
  if(plan && model.showAxes) axes(true);
  let handles;
  if(interactive && studio) {
    const anchor=(a,b,dx,dy)=>{
      const mid=a.map((v,i)=>(v+b[i])/2);
      const at=[mid[0]+dx,mid[1]+dy];
      if(!dimensioned) {
        line([a[0]+dx,a[1]+dy],[b[0]+dx,b[1]+dy],'#8aa4b9',1);
        for(const end of [a,b]) line(end,[end[0]+dx,end[1]+dy],'#8aa4b9',.8);
      }
      return at;
    };
    const base=p(nearX,nearY), oppositeX=p(length-nearX,nearY),oppositeY=p(nearX,width-nearY);
    const end=oppositeX[0]>oppositeY[0]?[length-nearX,nearY]:[nearX,width-nearY];
    handles={length:anchor(base,oppositeX,0,24),width:anchor(base,oppositeY,0,24),height:anchor(p(...end),p(...end,height),16,0)};
  }
  drawing.replaceChildren(art);
  return {scale,left:ox,top:oy,handles};
}
