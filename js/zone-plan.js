// A leaf is a zone index. Each split allocates area from the existing zone shares.
const ferroZones = (() => {
  const pair=(axis,first,second)=>({axis,first,second});
  const ids=node=>Number.isInteger(node)?[node]:[...ids(node.first),...ids(node.second)];
  function restore(tree,count) {
    function valid(n,d) {
      return Number.isInteger(n)?n>=0 && n<count:
        d<count && n && ['x','y'].includes(n.axis) && valid(n.first,d+1) && valid(n.second,d+1);
    }
    if(valid(tree,0) && ids(tree).length===count && new Set(ids(tree)).size===count) return tree;
    return Array.from({length:count},(_,i)=>i).reduceRight((other,i)=>pair('x',i,other));
  }
  function replace(tree,id,next) {
    return Number.isInteger(tree)?(tree===id?next:tree):pair(tree.axis,replace(tree.first,id,next),replace(tree.second,id,next));
  }
  function remove(tree,id,reindex=false) {
    if(Number.isInteger(tree)) return tree===id?null:tree-(reindex && tree>id?1:0);
    const first=remove(tree.first,id,reindex),second=remove(tree.second,id,reindex);
    return first===null?second:second===null?first:pair(tree.axis,first,second);
  }
  function place(tree,source,target,side) {
    const axis=['left','right'].includes(side)?'x':'y';
    const before=['left','above'].includes(side);
    return replace(remove(tree,source),target,pair(axis,before?source:target,before?target:source));
  }
  function layout(tree,zones,length,width) {
    const boxes=[],dividers=[];
    function visit(n,x,y,w,h) {
      if(Number.isInteger(n)) {boxes[n]={x,y,w,h};return;}
      const first=ids(n.first),second=ids(n.second);
      const sum=group=>group.reduce((s,i)=>s+zones[i].share,0);
      const ratio=sum(first)/(sum(first)+sum(second)),vertical=n.axis==='x';
      dividers.push({first,second,axis:n.axis,x,y,w,h,ratio});
      if(vertical) {visit(n.first,x,y,w*ratio,h);visit(n.second,x+w*ratio,y,w*(1-ratio),h);}
      else {visit(n.first,x,y,w,h*ratio);visit(n.second,x,y+h*ratio,w,h*(1-ratio));}
    }
    visit(tree,0,0,length,width);return {boxes,dividers};
  }
  // Redistribute a subtree's integer percentage while keeping every zone at least 5%.
  function distribute(zones,group,total,original) {
    const spare=total-group.length*5;
    const weights=group.map(i=>original[i]-5),sum=weights.reduce((a,b)=>a+b,0);
    const parts=group.map((id,j)=>{
      const exact=spare*(sum?weights[j]/sum:1/group.length);
      return {id,value:5+Math.floor(exact),remainder:exact-Math.floor(exact)};
    });
    const left=total-parts.reduce((s,p)=>s+p.value,0);
    parts.sort((a,b)=>b.remainder-a.remainder).forEach((p,i)=>zones[p.id].share=p.value+(i<left?1:0));
  }
  return {restore,place,replace,remove,pair,layout,distribute};
})();
