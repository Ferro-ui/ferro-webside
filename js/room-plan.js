// All cuts are relative to their parent, so rooms stay within the zone when its dimensions change.
const ferroRooms = (() => {
  const titles={ground:'1. etasje',deck:'Mesanin',second:'2. etasje',third:'3. etasje',loft:'Loft'};
  const leaf=(name='')=>({name});
  const split=(axis,ratio,first,second)=>({axis,ratio,children:[first,second]});
  function read(node,depth=0) {
    if(!node || depth>64) return leaf();
    if((node.axis==='x' || node.axis==='y') && Number.isFinite(node.ratio) && node.ratio>0 && node.ratio<1 && node.children?.length===2)
      return split(node.axis,node.ratio,...node.children.map(child=>read(child,depth+1)));
    return leaf(typeof node.name==='string'?node.name.slice(0,40):'');
  }
  function fromLegacy(rooms) {
    if(!Array.isArray(rooms)) return leaf();
    const items=rooms.filter(r=>r && typeof r.name==='string');
    function partition(i) {
      if(i>=items.length) return leaf();
      const first=leaf(items[i].name.slice(0,40));
      if(i===items.length-1) return first;
      const weight=r=>Number.isFinite(r.weight) && r.weight>0?r.weight:1;
      const total=items.slice(i).reduce((n,r)=>n+weight(r),0);
      return split('y',weight(items[i])/total,first,partition(i+1));
    }
    return partition(0);
  }
  function levels(zone,{stories,roof}) {
    return Object.keys(titles).filter(k=>k==='ground' || (k==='deck' && zone.mezzanine) ||
      (k==='second' && stories>=2) || (k==='third' && stories===3) || (k==='loft' && roof==='gable' && zone.loft));
  }
  function cells(tree,boundaries) {
    const result=[];
    function visit(node,path,x,y,w,h) {
      if(!node.children) {result.push({node,path,x,y,w,h});return;}
      if(boundaries) boundaries.push({node,path,x,y,w,h});
      const fraction=node.ratio;
      if(node.axis==='x') {
        visit(node.children[0],path+'0',x,y,w*fraction,h);
        visit(node.children[1],path+'1',x+w*fraction,y,w*(1-fraction),h);
      } else {
        visit(node.children[0],path+'0',x,y,w,h*fraction);
        visit(node.children[1],path+'1',x,y+h*fraction,w,h*(1-fraction));
      }
    }
    visit(tree,'',0,0,1,1);return result;
  }
  function parent(tree,path) {
    return [...path.slice(0,-1)].reduce((node,bit)=>node.children[Number(bit)],tree);
  }
  function replace(zone,level,path,node) {
    if(!path) zone.layouts[level]=node;
    else parent(zone.layouts[level],path).children[Number(path.at(-1))]=node;
  }
  function wallRow(side,count,remaining) {
    const alongX=side==='sideA' || side==='sideB';
    function row(i) {
      const room=leaf('Kontor '+(i+1));
      return i===count-1?room:split(alongX?'x':'y',1/(count-i),room,row(i+1));
    }
    const first=side==='front' || side==='sideB';
    const open=leaf(remaining || 'Åpent areal');
    return split(alongX?'y':'x',first?.35:.65,first?row(0):open,first?open:row(0));
  }
  function footprint(zone,level) {
    if(level!=='deck') return {x:0,y:0,w:1,h:1};
    return {x:zone.deckX/100,y:zone.deckY/100,w:zone.deckLength/100,h:zone.depth/100};
  }
  // Bays follow the hall length. Side-by-side ground zones with lofts share
  // their run along the ridge so their upper rooms never overlap.
  function loftRuns(model) {
    const runs=[];
    function measure(node) {
      if(Number.isInteger(node)) {
        const z=model.zones[node];
        return {id:node,share:z.share,loftShare:z.loft?z.share:0};
      }
      const a=measure(node.first),b=measure(node.second);
      return {axis:node.axis,a,b,share:a.share+b.share,loftShare:a.loftShare+b.loftShare};
    }
    function place(node,x,w) {
      if(!node.loftShare) return;
      if(node.id!==undefined){runs[node.id]={x,w};return;}
      const ratio=node.axis==='x'?node.a.share/node.share:node.a.loftShare/node.loftShare;
      place(node.a,x,w*ratio);place(node.b,x+w*ratio,w*(1-ratio));
    }
    place(measure(model.zoneTree),0,model.length);
    return runs;
  }
  function surface(model,index,level) {
    const zone=model.zones[index],geometry=model.zoneGeometry;
    if(level==='loft'){
      const run=geometry.loftRuns[index],h=model.width*zone.loftWidth/100,w=run.w*zone.loftLength/100;
      return {x:run.x+(run.w-w)/2,y:(model.width-h)/2,w,h};
    }
    const b=geometry.boxes[index],f=footprint(zone,level);
    return {x:b.x+b.w*f.x,y:b.y+b.h*f.y,w:b.w*f.w,h:b.h*f.h};
  }
  const ridgeRise=model=>model.ridgeRise ?? Math.min(model.width*.14,model.height*.55);
  return {ridgeRise,loftRuns,surface,footprint,titles,leaf,split,read,fromLegacy,levels,cells,parent,replace,wallRow};
})();
