// Parts are attached to a main-hall face. Along-wall fractions keep them attached on resize.
const ferroMassing=(()=>{
  const types={wing:'Sidefløy',terrace:'Terrasse',balcony:'Balkong'};
  const fields=model=>model.bays || Math.max(1,Math.min(24,Math.round(model.length/6)));
  const span=(model,side)=>side.startsWith('side')?model.length:model.width;
  function restore(saved) {
    const result={};
    for(const side of Object.keys(ferroOpenings.walls)) {
      const s=saved?.[side];
      if(!s || !Object.hasOwn(types,s.type)) continue;
      if(![s.share,s.position,s.depth,s.height].every(Number.isFinite) || s.share<.05 || s.share>1 || s.position<0 || s.position>1 || s.depth<.1 || s.depth>100 || s.height<.1 || s.height>30) continue;
      result[side]={type:s.type,share:s.share,position:s.position,depth:s.depth,height:s.height};
    }
    return result;
  }
  function parts(model) {
    return Object.entries(model.parts).map(([side,s])=>{
      const spanM=span(model,side),along=spanM*s.share,start=(spanM-along)*s.position;
      const long=side.startsWith('side'),w=long?along:s.depth,d=long?s.depth:along;
      const x=long?start:side==='front'?-w:model.length;
      const y=!long?start:side==='sideA'?model.width:-d;
      const floor=s.type==='balcony'?s.height:0;
      const top=s.type==='wing'?s.height:s.type==='balcony'?floor+1:0;
      return {...s,side,x,y,w,d,along,start,floor,top,area:w*d};
    });
  }
  const enclosedArea=model=>parts(model).reduce((n,s)=>n+(s.type==='wing'?s.area:0),model.length*model.width);
  return {types,fields,span,restore,parts,enclosedArea};
})();
