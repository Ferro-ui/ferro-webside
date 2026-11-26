(() => {
  const stage = document.querySelector('.flight');
  const film = stage.querySelector('video');
  const filmLink = stage.querySelector('[data-film-link]');
  const caption = stage.querySelector('[data-caption]');
  const toggle = stage.querySelector('[data-toggle]');
  const chapterBar = stage.querySelector('.flight-chapters');
  let chapters;
  const neighbors = stage.querySelectorAll('[data-neighbor]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const defaults = [
    {start:0, title:'Tokke Teknologipark · Dalen', slug:'tokke-teknologipark', photo:'tokke'},
    {start:3.29, title:'Skiensvegen 740 · Nome', slug:'skiensvegen-740', photo:'nome'},
    {start:7.31, title:'Folkestadvegen 3 · Bø', slug:'folkestadvegen-3', photo:'bo'},
    {start:11.66, title:'Coop Extra · Lunde', slug:'coop-extra-lunde', photo:'lunde'}
  ];
  let scenes;
  let current = 0, pending = null, inView = false, failed = false;
  let wantsPlay = !reduced.matches && !navigator.connection?.saveData;
  function loadFilm() {
    if (film.hasAttribute('src')) return;
    const width = film.clientWidth * Math.min(devicePixelRatio, 2);
    film.src = 'assets/video/hero-drone-v4-' + (width <= 900 ? 480 : width <= 1500 ? 720 : 1080) + '.mp4';
  }
  function syncPlayback() {
    if (!wantsPlay || !inView || document.hidden || failed) {
      film.pause();
      return;
    }
    loadFilm();
    film.play().catch(updateToggle);
  }
  function updateToggle() {
    toggle.setAttribute('aria-label', film.paused ? 'Spill av dronefilm' : 'Sett dronefilmen på pause');
    toggle.title = toggle.getAttribute('aria-label');
    stage.querySelector('[data-play-icon]').textContent = film.paused ? '▶' : 'Ⅱ';
  }
  function neighborIndex(button) {
    return (current + Number(button.dataset.neighbor) + scenes.length) % scenes.length;
  }
  function showScene(index) {
    current = index;
    const scene = scenes[index];
    filmLink.hidden=!scene;
    if(!scene) return;
    caption.textContent = scene.title;
    filmLink.hash = 'prosjekt/' + scene.slug;
    chapters.forEach((button,i)=>button.setAttribute('aria-pressed',i===index));
    neighbors.forEach(button=>{
      const next = neighborIndex(button);
      button.setAttribute('aria-label','Vis '+scenes[next].title);
      button.querySelector('img').src = scenes[next].image || 'assets/flight/'+scenes[next].photo+'.webp';
    });
  }
  function seekPending() {
    if (pending === null || !film.readyState) return;
    const index = pending;
    pending = null;
    film.currentTime = scenes[index].start;
  }
  function selectScene(index) {
    if (failed) return;
    pending = index;
    film.preload = 'auto';
    loadFilm();
    seekPending();
  }
  function configureScenes(items) {
    scenes=items;
    pending=null;
    chapters=scenes.map((scene,i)=>{
      const button=document.createElement('button');
      button.type='button';button.dataset.chapter=i;button.textContent=scene.label;
      button.onclick=()=>selectScene(i);
      return button;
    });
    chapterBar.replaceChildren(...chapters);
    chapterBar.hidden=failed || scenes.length<2;
    neighbors.forEach(button=>{button.disabled=failed || scenes.length<2;button.hidden=scenes.length<2;});
    showScene(Math.max(0,scenes.findLastIndex(scene=>film.currentTime>=scene.start)));
  }
  const initialLabels=Array.from(chapterBar.children,b=>b.textContent);
  configureScenes(window.ferroHomeScenes ?? defaults.map((scene,i)=>({...scene,label:initialLabels[i]})));
  stage.addEventListener('ferro-scenes',event=>configureScenes(event.detail));
  neighbors.forEach(button=>button.onclick=()=>selectScene(neighborIndex(button)));
  toggle.onclick = () => { wantsPlay = film.paused; syncPlayback(); };
  film.addEventListener('loadedmetadata', seekPending);
  film.addEventListener('seeked', () => film.classList.add('ready'));
  film.addEventListener('playing', () => { film.classList.add('ready'); updateToggle(); });
  film.addEventListener('pause',updateToggle);
  film.addEventListener('timeupdate', () => {
    const index = scenes.findLastIndex(scene=>film.currentTime>=scene.start);
    if (index >= 0 && index !== current) showScene(index);
  });
  film.addEventListener('error', () => {
    failed = true;
    film.classList.remove('ready');
    toggle.hidden = chapterBar.hidden = true;
    neighbors.forEach(button=>button.disabled=true);
    showScene(0);
  });
  reduced.addEventListener('change', () => { if (reduced.matches) { wantsPlay = false; syncPlayback(); } });
  document.addEventListener('visibilitychange',syncPlayback);
  new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;syncPlayback();},{threshold:.05}).observe(film);
  toggle.hidden = false;
  updateToggle();
})();
