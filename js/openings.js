const ferroOpenings = (() => {
  const walls = {front:'Fremre gavl',back:'Bakre gavl',sideA:'Langside A',sideB:'Langside B'};
  const types = {window:'Vindu',door:'Dør',gate:'Port'};
  function example(type) {
    const defaults = {window:[1.2,1.2,'sideA'],door:[1,2.1,'sideA'],gate:[4,4,'front']};
    const [width,height,wall] = defaults[type];
    return {type,count:1,width,height,wall};
  }
  function valid(g) {
    return g && Object.hasOwn(types,g.type) && Object.hasOwn(walls,g.wall) &&
      Number.isInteger(g.count) && g.count>0 && g.count<=999 &&
      [g.width,g.height].every(n=>Number.isFinite(n) && n>0 && n<=200);
  }
  function restore(saved, model) {
    if (Array.isArray(saved.openings)) return saved.openings.filter(valid);
    const groups=[];
    const round=n=>Math.max(.01,Math.round(n*100)/100);
    const oldCount=[0,1,2,3].includes(saved.gates)?saved.gates:1;
    if(oldCount) {
      const width=round(Math.min(model.width/(oldCount+1)*.73,model.height*.82));
      groups.push({type:'gate',count:oldCount,width,height:round(Math.min(model.height*.74,width*1.28)),wall:saved.end==='back'?'back':'front'});
    }
    if(saved.windows!==false) for(const wall of ['sideA','sideB']) {
      groups.push({type:'window',count:1,width:round(model.length*.89),height:round(model.height*.27),wall});
    }
    return groups;
  }
  // Distribute the requested widths in a single row on each wall without rescaling.
  function layout(model) {
    const placed=[], issues=[];
    for(const wall of Object.keys(walls)) {
      const groups=model.openings.filter(g=>g.wall===wall);
      if(!groups.length) continue;
      const span=wall.startsWith('side')?model.length:model.width;
      const used=groups.reduce((n,g)=>n+g.count*g.width,0);
      if(used>span+1e-8 || groups.some(g=>g.height>model.height)) {
        issues.push(walls[wall]+' – åpningene får ikke plass i den viste veggflaten.');
        continue;
      }
      const count=groups.reduce((n,g)=>n+g.count,0), gap=Math.max(0,span-used)/(count+1);
      let start=gap;
      for(const g of groups) for(let i=0;i<g.count;i++) {
        const bottom=g.type==='window'?(model.height-g.height)*.5:0;
        placed.push({type:g.type,wall,start,end:start+g.width,bottom,top:bottom+g.height});
        start+=g.width+gap;
      }
    }
    return {placed,issues};
  }
  return {walls,types,restore,layout,example};
})();
