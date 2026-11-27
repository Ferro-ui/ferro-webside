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
  // Starting suggestions only. Widths share the available facade on small sketches.
  function forBuilding(model) {
    const group=(type,wall,count,w,h)=>({type,wall,count,width:Math.round(w*100)/100,height:Math.round(h*100)/100});
    const {length,width,height}=model;
    const entrance=group('door','front',1,Math.min(1.6,width*.24),Math.min(2.35,height*.85));
    if(model.buildingUse==='Butikk') return [
      entrance,group('window','front',1,Math.min(6,width*.57),Math.min(2.65,height*.72)),
      group('window','sideA',2,Math.min(5,length*.39),Math.min(2.65,height*.72))
    ];
    if(model.buildingUse==='Kontor') {
      const count=Math.max(2,Math.min(10,Math.round(length/3)));
      return [entrance,...['sideA','sideB'].map(wall=>group('window',wall,count,Math.min(2.2,length*.68/count),Math.min(1.65,height*.45))),
        group('window','front',1,Math.min(2.4,width*.4),Math.min(1.65,height*.45))];
    }
    if(model.buildingUse==='Verksted') return [
      group('gate','front',width>=12?2:1,Math.min(4,width*.42),Math.min(4.5,height*.82)),
      group('door','sideA',1,Math.min(1,length*.2),Math.min(2.1,height*.85)),
      group('window','sideA',2,Math.min(1.8,length*.23),Math.min(.95,height*.24))
    ];
    return [];
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
        const sillFraction={Butikk:.15,Verksted:.72}[model.buildingUse] ?? .5;
        const bottom=g.type==='window'?(model.height-g.height)*sillFraction:0;
        placed.push({type:g.type,wall,start,end:start+g.width,bottom,top:bottom+g.height});
        start+=g.width+gap;
      }
    }
    return {placed,issues};
  }
  return {walls,types,restore,layout,example,forBuilding};
})();
