const ferroStairs = (() => {
  const corners=['Fremre gavl / langside A','Fremre gavl / langside B','Bakre gavl / langside A','Bakre gavl / langside B'];
  const flights=['Rett trapp','U-trapp med repos'];
  const materials=['Stål','Betong','Tre'];
  function stair(raw={}) {
    return {type:flights.includes(raw?.type)?raw.type:'', corner:corners.includes(raw?.corner)?raw.corner:corners[0],
      material:materials.includes(raw?.material)?raw.material:'', to:Object.hasOwn(ferroRooms.titles,raw?.to) && raw.to!=='ground'?raw.to:''};
  }
  function destination(zone,model) {
    return ferroRooms.levels(zone,model).includes(zone.stair?.to)?zone.stair.to:'';
  }
  function landing(model,index,to) {
    const goal=ferroRooms.surface(model,index,to);
    if(to!=='loft') return goal;
    const ground=model.zoneGeometry.boxes[index];
    const x=Math.max(goal.x,ground.x),y=Math.max(goal.y,ground.y);
    const w=Math.min(goal.x+goal.w,ground.x+ground.w)-x,h=Math.min(goal.y+goal.h,ground.y+ground.h)-y;
    return w>1e-6 && h>1e-6?{x,y,w,h}:null;
  }
  function summary(model) {
    const lines=[];
    model.zones.forEach((zone,i)=>{
      const s=zone.stair;
      if(s.type) lines.push('Innvendig trapp · sone '+(i+1)+' '+zone.name+' · '+s.type+' · fra 1. etasje til '+(ferroRooms.titles[destination(zone,model)] || 'uavklart nivå')+' · '+s.corner+(s.material?' · '+s.material:''));
      if(s.type && destination(zone,model)==='loft' && !landing(model,i,'loft')) lines.push('Trappeplassering avklares. Loftet ligger utenfor denne sonen.');
    });
    return lines;
  }
  return {corners,flights,materials,stair,destination,landing,summary};
})();
