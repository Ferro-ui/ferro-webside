// Full-floor annotations scale with the hall. Partial-floor annotations follow their zone and deck.
const ferroFigures=(()=>{
  const partial=level=>level==='deck' || level==='loft';
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function area(points) {
    return Math.abs(points.reduce((sum,a,i)=>{
      const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];
    },0))/2;
  }
  function valid(points) {
    if(!Array.isArray(points) || points.length<3 || points.length>100 ||
      !points.every(p=>Array.isArray(p) && p.length===2 && p.every(v=>Number.isFinite(v) && v>=0 && v<=1))) return false;
    if(area(points)<1e-7 || new Set(points.map(p=>p.join(','))).size!==points.length) return false;
    const edges=points.map((a,i)=>[a,points[(i+1)%points.length]]);
    function intersects(a,b,c,d) {
      if([0,1].some(k=>Math.max(a[k],b[k])<Math.min(c[k],d[k]) || Math.max(c[k],d[k])<Math.min(a[k],b[k]))) return false;
      return cross(a,b,c)*cross(a,b,d)<=0 && cross(c,d,a)*cross(c,d,b)<=0;
    }
    return edges.every(([a,b],i)=>edges.every(([c,d],j)=>j<=i+1 || (i===0 && j===edges.length-1) || !intersects(a,b,c,d)));
  }
  function restore(list) {
    return Array.isArray(list)?list.filter(s=>s && typeof s.id==='string' && typeof s.name==='string' &&
      Object.hasOwn(ferroRooms.titles,s.level) && valid(s.points)).map(s=>({...s,name:s.name.slice(0,60)})):[];
  }
  function surfaces(model,level) {
    if(!partial(level)) {
      if(!ferroRooms.levels(model.zones[0],model).includes(level)) return [];
      return [{list:model.figures,box:{x:0,y:0,w:model.length,h:model.width}}];
    }
    return model.zones.flatMap((zone,index)=>{
      if(!ferroRooms.levels(zone,model).includes(level)) return [];
      return [{list:zone.figures,index,box:ferroRooms.surface(model,index,level)}];
    });
  }
  function entries(model,level) {
    return surfaces(model,level).flatMap(surface=>surface.list.filter(s=>s.level===level).map(shape=>({...surface,shape})));
  }
  // Midpoint of the widest interior interval at mid-height also sits inside a concave contour.
  function anchor(points) {
    const ys=points.map(p=>p[1]),y=(Math.min(...ys)+Math.max(...ys))/2,xs=[];
    points.forEach((a,i)=>{const b=points[(i+1)%points.length];
      if((a[1]>y)!==(b[1]>y)) xs.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]));
    });
    xs.sort((a,b)=>a-b);let best=0;
    for(let i=2;i+1<xs.length;i+=2) if(xs[i+1]-xs[i]>xs[best+1]-xs[best]) best=i;
    return xs.length>=2?[(xs[best]+xs[best+1])/2,y]:points[0];
  }
  function rectangle(points) {
    if(points.length!==2) return points;
    const [a,b]=points;return [a,[b[0],a[1]],b,[a[0],b[1]]];
  }
  return {valid,area,restore,surfaces,entries,anchor,rectangle};
})();
