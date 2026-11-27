/* ============================================================
   Ferro Stålentreprenør — front-end runtime
   Small, dependency-free runtime for the site:
     · hash-routed single-page navigation between the 5 screens
     · light / dark theme toggle (remembered in localStorage)
     · logo intro clean-up · scroll reveal · service cards on touch
     · hero drone film (lazy start, pause/play, project captions)
     · project grid + project-detail rendering from data
     · contact form "sent" state · image lightbox
     · legacy helpers for the screens that still use inline styles:
       inline-style normalization, data-hover / data-focus merging,
       card parallax tilt
   ============================================================ */
(function () {
  'use strict';

  /* ---- tiny helpers ---- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ============================================================
     Inline-style normalization.
     The responsive rules match the CSSOM-serialized form of inline
     styles, e.g. [style*="grid-template-columns: 1fr 1fr"].
     Re-serializing every [style] at startup guarantees that form,
     so the @media rules apply however the markup was written.
     ============================================================ */
  function normalize(root) {
    if (!root) return;
    $all('[style]', root).forEach(function (el) {
      el.setAttribute('style', el.style.cssText);
    });
  }

  /* ============================================================
     Hover / focus styles (data-hover / data-focus)
     ============================================================ */
  function bindHoverFocus(root) {
    if (!root) return;
    $all('[data-hover]', root).forEach(function (el) {
      if (el._hoverBound) return;
      el._hoverBound = true;
      var hover = el.getAttribute('data-hover');
      el.addEventListener('mouseenter', function () {
        el.setAttribute('style', (el.getAttribute('style') || '') + ';' + hover);
      });
      el.addEventListener('mouseleave', function () {
        el.setAttribute('style', el._baseStyle || '');
      });
      // refresh the captured base each time we leave-clean, so active-state
      // changes elsewhere don't get clobbered
      el._captureBase = function () { el._baseStyle = el.getAttribute('style') || ''; };
      el._captureBase();
    });
    $all('[data-focus]', root).forEach(function (el) {
      if (el._focusBound) return;
      el._focusBound = true;
      var focus = el.getAttribute('data-focus');
      el._baseFocus = el.getAttribute('style') || '';
      el.addEventListener('focus', function () {
        el.setAttribute('style', el._baseFocus + ';' + focus);
      });
      el.addEventListener('blur', function () {
        el.setAttribute('style', el._baseFocus);
      });
    });
  }

  /* ============================================================
     Card parallax tilt + spotlight
     ============================================================ */
  function initParallax() {
    var MAX = 6;
    var tilted = null;
    function reset(card) {
      card.style.transform = '';
      var sp = card.querySelector('[data-proj-spot]');
      if (sp) sp.style.opacity = '0';
    }
    document.addEventListener('pointermove', function (e) {
      var t = e.target;
      var card = (t && t.closest) ? t.closest('[data-proj]') : null;
      if (tilted && tilted !== card) { reset(tilted); tilted = null; }
      if (!card) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var rx = (0.5 - py) * MAX;
      var ry = (px - 0.5) * MAX;
      card.style.transform = 'perspective(1000px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      var sp = card.querySelector('[data-proj-spot]');
      if (sp) {
        sp.style.opacity = '1';
        sp.style.background = 'radial-gradient(380px circle at ' + (px * 100).toFixed(1) + '% ' + (py * 100).toFixed(1) + '%, rgba(157,189,226,0.28), transparent 62%)';
      }
      tilted = card;
    }, { passive: true });
    window.addEventListener('blur', function () { if (tilted) { reset(tilted); tilted = null; } });
  }

  /* ============================================================
     Lightbox
     ============================================================ */
  var lb = $('[data-lightbox]');
  var lbImg = $('[data-lightbox-img]');
  var galleryCells = [];
  var activeImage = 0;
  function showImage(index) {
    activeImage = (index + galleryCells.length) % galleryCells.length;
    lbImg.src = galleryCells[activeImage].dataset.src;
    lbImg.alt = ferroProjects[state.detail].title + ', bilde ' + (activeImage + 1);
    $('[data-position]', lb).textContent = (activeImage + 1) + ' / ' + galleryCells.length;
  }
  function openLightbox(cell) {
    galleryCells = $all('[data-gallery-img]', cell.closest('.h26-gallery'));
    showImage(galleryCells.indexOf(cell));
    $('[data-prev]', lb).hidden = $('[data-next]', lb).hidden = galleryCells.length < 2;
    cell.focus({preventScroll: true});
    lb.showModal();
  }
  $('.lightbox__close', lb).onclick = function () { lb.close(); };
  $('[data-prev]', lb).onclick = function () { showImage(activeImage - 1); };
  $('[data-next]', lb).onclick = function () { showImage(activeImage + 1); };
  lb.addEventListener('click', function (event) { if (event.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      lb.close();
      return;
    }
    if (event.key === 'ArrowLeft') showImage(activeImage - 1);
    if (event.key === 'ArrowRight') showImage(activeImage + 1);
  });
  var startTouch;
  lbImg.addEventListener('touchstart', function (event) {
    startTouch = event.touches.length === 1 ? event.touches[0] : null;
  }, {passive:true});
  lbImg.addEventListener('touchend', function (event) {
    if (!startTouch) return;
    var dx = event.changedTouches[0].clientX - startTouch.clientX;
    var dy = event.changedTouches[0].clientY - startTouch.clientY;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) showImage(activeImage + (dx < 0 ? 1 : -1));
    startTouch = null;
  }, {passive:true});

  /* ============================================================
     Render: project grid (/prosjekter)
     ============================================================ */
  function card(project) {
    const image=project.hero ? '<img src="'+esc(project.hero)+'" alt="" loading="lazy">' : '';
    return '<a class="h26-project h26-project-link" href="#prosjekt/'+project.slug+'">'+image+
      '<p class="h26-metadata">'+esc(project.sted)+' · '+esc(projectCategories[project.category])+'</p>'+
      '<h3>'+esc(project.title)+'</h3><p>'+esc(project.lead)+'</p></a>';
  }

  function renderGrid() {
    const terms=$('#project-search').value.trim().toLocaleLowerCase('nb').split(/\s+/);
    const projects=ferroProjects.filter(p=>{
      const text=[p.title,p.sted,p.client,p.lead,projectCategories[p.category],p.slug.replaceAll('-',' ')].join(' ').toLocaleLowerCase('nb');
      return (!category || p.category===category) && terms.every(term=>text.includes(term));
    });
    $('[data-proj-grid]').innerHTML=projects.map(card).join('');
    $('[data-result-count]').textContent=projects.length ? projects.length+(projects.length===1?' prosjekt':' prosjekter') : 'Ingen treff. Prøv en annen kategori eller et annet søk.';
    $all('[data-category]').forEach(link=>link.setAttribute('aria-current',link.dataset.category===category?'true':'false'));
  }

  function detailHTML(d) {
    const facts={Sted:d.sted,...(d.client?{Byggherre:d.client}:{}),...d.facts,...(d.byggetid?{Byggetid:d.byggetid}:{})};
    const related=ferroProjects.filter(p=>p!==d).sort((a,b)=>Number(b.category===d.category)-Number(a.category===d.category)).slice(0,3);
    return '<nav class="h26-shell h26-detail-top path-links" aria-label="Brødsmuler"><a href="#hjem">Forside</a> / <a href="#prosjekter">Prosjekter</a> / <span aria-current="page">'+esc(d.title)+'</span></nav>'+
      '<header class="h26-page-head h26-shell"><h1>'+esc(d.headline || d.title)+'</h1><p>'+esc(d.lead)+'</p></header>'+
      (d.hero?'<div class="h26-shell"><img class="h26-detail-hero" src="'+esc(d.hero)+'" alt="'+esc(d.heroAlt || d.title+' i '+d.sted)+'"></div>':'')+
      '<section class="h26-section h26-shell h26-detail-body"><div class="h26-detail-text">'+(d.body || []).map(p=>'<p>'+esc(p)+'</p>').join('')+
      (d.specs?'<h2>Leveransen</h2><ul class="h26-build-list h26-spec-list">'+d.specs.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'')+
      '<a class="h26-text-link" href="#prosjekter/'+d.category+'">Flere bygg i kategorien '+esc(projectCategories[d.category])+' →</a></div>'+
      '<aside><h2>Fakta</h2><dl class="h26-facts">'+Object.entries(facts).map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl></aside></section>'+
      (d.gallery?'<section class="h26-shell h26-detail-gallery" aria-label="Bildegalleri"><h2>Bildegalleri</h2><div class="h26-gallery">'+d.gallery.map((u,i)=>'<button type="button" class="h26-gallery-item" data-gallery-img data-src="'+esc(u)+'" aria-label="Vis bilde '+(i+1)+' fra '+esc(d.title)+'"><img src="'+esc(u)+'" alt="" loading="lazy"></button>').join('')+'</div></section>':'')+
      (d.quote?'<figure class="h26-shell detail-quote"><blockquote>«'+esc(d.quote.text)+'»</blockquote><figcaption>'+esc(d.quote.name)+' · '+esc(d.quote.org)+'</figcaption></figure>':'')+
      '<section class="h26-section h26-shell"><div class="h26-section-head"><h2>Flere prosjekter</h2><a class="archive-link" href="#prosjekter">Se alle prosjekter →</a></div><div class="h26-project-list">'+related.map(card).join('')+'</div></section>'+
      '<section class="h26-contact"><div class="h26-section h26-shell h26-contact-layout"><h2>Har du et lignende prosjekt?</h2><div class="h26-contact-links"><a class="h26-button h26-button-light" href="#kontakt">Be om tilbud ↗</a><a class="h26-button h26-button-quiet" href="tel:+4795837123" data-contact="phone" data-prefix="Ring ">Ring 958 37 123</a></div></div></section>';
  }

  function renderDetail(i) {
    var host = $('[data-screen="prosjekt"]');
    host.innerHTML = detailHTML(ferroProjects[i]);
    if (window.ferroApplyContact) window.ferroApplyContact(host);
    normalize(host);
    bindHoverFocus(host);
    // gallery clicks → lightbox
    $all('[data-gallery-img]', host).forEach(function (cell) {
      cell.addEventListener('click', function () { openLightbox(cell); });
    });
  }

  /* ============================================================
     Router / screen state
     ============================================================ */
  var state = { page: 'home', detail: null };
  var hashForPage = { home: 'hjem', prosjekter: 'prosjekter', omoss: 'omoss', kontakt: 'kontakt' };
  var pageForHash = { '': 'home', home: 'home', hjem: 'home', prosjekter: 'prosjekter', omoss: 'omoss', 'om-oss': 'omoss', kontakt: 'kontakt' };

  let category='';
  $('#project-search').addEventListener('input',renderGrid);
  const nav=$('#ferro-menu'),menuToggle=$('[data-menu-toggle]');
  function closeMenu(){nav.classList.remove('menu-open');menuToggle.setAttribute('aria-expanded','false');}
  menuToggle.onclick=()=>{
    const open=nav.classList.toggle('menu-open');menuToggle.setAttribute('aria-expanded',open);
  };
  nav.addEventListener('click',closeMenu);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && nav.classList.contains('menu-open')){closeMenu();menuToggle.focus();}
  });
  function render() {
    var active = state.detail != null ? 'prosjekt' : state.page;
    $all('.screen').forEach(function (s) {
      s.classList.toggle('is-active', s.getAttribute('data-screen') === active);
    });
    // every screen currently renders in the light theme (the 2026 home is light-only)
    document.documentElement.toggleAttribute('data-legacy', true);
    document.documentElement.setAttribute('data-page', active);
    if (state.page === 'prosjekter' && state.detail == null) renderGrid();
    if (state.detail != null) renderDetail(state.detail);
    // nav highlight follows the page (stays on "Prosjekter" while a detail is open)
    $all('[data-nav]').forEach(function (link) {
      if (link.getAttribute('data-nav') === state.page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const homeTitle = document.title;
  var routeInitialized = false;
  function setPage(page, detail) {
    if (lb.open) lb.close();
    state.page = page;
    state.detail = detail == null ? null : detail;
    render();
    document.title = page === 'home' ? homeTitle : (state.detail != null ? ferroProjects[state.detail].title : $('.screen.is-active').dataset.screenLabel) + ' | Ferro Stålentreprenør';
    if (routeInitialized) $('#innhold').focus({preventScroll:true});
    routeInitialized = true;
    scrollTop();
  }
  function applyHash() {
    var hash = location.hash.slice(1).toLowerCase();
    closeMenu();
    if (['byggskisse','bygg','prosess','ansatte'].includes(hash)) {
      setPage(hash==='ansatte'?'omoss':'home');
      requestAnimationFrame(function () {
        const section=document.getElementById(hash);
        const title=section.querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});section.scrollIntoView({behavior:'instant'});
      });
      return;
    }
    if(hash==='prosjekter' || (hash.startsWith('prosjekter/') && Object.hasOwn(projectCategories,hash.slice('prosjekter/'.length)))) {
      const next=hash.slice('prosjekter/'.length);
      if(category!==next || state.page!=='prosjekter') $('#project-search').value='';
      category=next;setPage('prosjekter');return;
    }
    var detail = ferroProjects.findIndex(function (p) { return hash === 'prosjekt/' + p.slug; });
    if (detail >= 0) setPage('prosjekter', detail);
    else setPage(pageForHash[hash] || 'home');
  }

  function navigate(page) {
    if (page === state.page && state.detail == null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (('#' + hashForPage[page]) === location.hash) {
      // hash unchanged (e.g. leaving a detail view) → apply directly
      setPage(page);
    } else {
      location.hash = '#' + hashForPage[page];
    }
  }

  /* ============================================================
     Action dispatch
     ============================================================ */
  var ACTIONS = {
    goHome: function () { navigate('home'); },
    goProsjekter: function () { navigate('prosjekter'); },
    goOmOss: function () { navigate('omoss'); },
    goKontakt: function () { navigate('kontakt'); },
  };

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var name = el.getAttribute('data-action');
    if (name === 'submitForm') return; // handled on submit
    if (ACTIONS[name]) {
      // anchors with an in-page hash drive the router; let them, but block default for spans
      if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').charAt(0) === '#') {
        e.preventDefault();
      }
      ACTIONS[name]();
    }
  });

  /* ============================================================
     Theme toggle (light is the default; the choice is remembered)
     ============================================================ */
  var THEME_KEY = 'ferro-theme';
  function applyTheme(theme) {
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    $all('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.setAttribute('aria-label', theme === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema');
    });
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0A1320' : '#FFFFFF');
  }
  function initTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    $all('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      });
    });
  }

  /* ============================================================
     Logo intro: the outline draws once, then the class is removed
     ============================================================ */
  function initLogoIntro() {
    var root = document.documentElement;
    if (!root.classList.contains('logo-intro')) return;
    setTimeout(function () { root.classList.remove('logo-intro'); }, 1600);
  }

  /* ============================================================
     Scroll reveal (opacity + small rise, see [data-reveal] in CSS)
     ============================================================ */
  function initReveal() {
    var items = $all('[data-reveal]');
    if (!document.documentElement.classList.contains('motion') || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     Service cards: on touch screens a tap opens a card
     (hover and keyboard focus are handled in CSS)
     ============================================================ */
  function initServiceCards() {
    var cards = $all('[data-svc]');
    var lastPointer = '';
    document.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType; }, true);
    cards.forEach(function (card) {
      // capture phase, so a first tap on a closed card does not follow its link
      card.addEventListener('click', function (e) {
        if (lastPointer !== 'touch' || card.classList.contains('is-open')) return;
        if (!window.matchMedia('(min-width: 900px)').matches) return;
        e.preventDefault();
        e.stopPropagation();
        cards.forEach(function (c) { c.classList.toggle('is-open', c === card); });
      }, true);
    });
  }

  /* ============================================================
     Hero drone film: a muted loop. The file is fetched only after
     the page has loaded, the small version on small screens. It
     pauses while the hero is off screen or the tab is hidden.
     Reduced motion: the poster stays until the button is used.
     The caption names the project on screen; "from" is the cut
     time in seconds where that project's shots begin.
     ============================================================ */
  var HERO_CAPTIONS = [
    { from: 0,     text: 'Tokke Teknologipark · Dalen' },
    { from: 3.72,  text: 'Skiensvegen 740 · NTT' },
    { from: 7.46,  text: 'Folkestadvegen 3 · Coop Extra Bø' },
    { from: 11.33, text: 'Coop Extra · Lunde' }
  ];

  function initHeroVideo() {
    var video = $('[data-hero-video]');
    if (!video || !video.canPlayType('video/mp4; codecs="avc1.640028"')) return;
    var toggle = $('[data-hero-toggle]');
    var caption = $('[data-hero-caption]');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = window.matchMedia && window.matchMedia('(max-width: 599.98px)').matches;
    var pageLoaded = document.readyState === 'complete';
    var userPaused = reduce;
    var inView = true;

    function captionAt(t) {
      var text = HERO_CAPTIONS[0].text;
      for (var i = 0; i < HERO_CAPTIONS.length; i++) {
        if (t >= HERO_CAPTIONS[i].from) text = HERO_CAPTIONS[i].text;
      }
      return text;
    }
    function showCaption(t) {
      if (!caption) return;
      var text = captionAt(t);
      if (caption.textContent !== text) caption.textContent = text;
    }

    function syncToggle() {
      if (!toggle) return;
      var paused = video.paused;
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', paused ? 'Spill av video' : 'Pause video');
    }

    function load() {
      if (video.getAttribute('src')) return;
      video.preload = 'auto';
      video.src = video.getAttribute(small ? 'data-src-small' : 'data-src-large');
    }

    function update() {
      if (pageLoaded && !userPaused && inView && !document.hidden) {
        load();
        if (video.paused) {
          var p = video.play();
          if (p && p.catch) p.catch(syncToggle);
        }
      } else if (!video.paused) {
        video.pause();
      }
    }

    showCaption(0);
    if (caption) caption.hidden = false;
    if (toggle) toggle.hidden = false;
    syncToggle();

    video.addEventListener('play', syncToggle);
    video.addEventListener('pause', syncToggle);

    // frame-accurate where supported, otherwise a few updates per second
    if ('requestVideoFrameCallback' in video) {
      var onFrame = function (now, meta) {
        showCaption(meta.mediaTime);
        video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
    } else {
      video.addEventListener('timeupdate', function () { showCaption(video.currentTime); });
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        userPaused = !video.paused;
        pageLoaded = true;
        if (userPaused) video.pause();
        else update();
      });
    }

    document.addEventListener('visibilitychange', update);
    if (!pageLoaded) window.addEventListener('load', function () { pageLoaded = true; update(); }, { once: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].isIntersecting;
        update();
      }, { threshold: 0.15 }).observe(video);
    } else {
      update();
    }
  }

  /* ---- floating navigation: steps aside while it would cover the hero buttons ---- */
  function initDockYield() {
    var dock = $('.dock');
    var actions = $('.hero__actions');
    if (!dock || !actions) return;
    var queued = false;
    function update() {
      queued = false;
      var a = actions.getBoundingClientRect();
      // resting position of the dock, independent of its own transition
      var width = dock.offsetWidth;
      var left = (window.innerWidth - width) / 2;
      var top = window.innerHeight - dock.offsetHeight - (parseFloat(getComputedStyle(dock).bottom) || 0);
      var covers = a.width > 0 && a.bottom > top - 8 && a.top < window.innerHeight &&
                   a.right > left && a.left < left + width;
      dock.classList.toggle('is-yielding', covers);
    }
    function request() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    window.addEventListener('hashchange', request);
    window.addEventListener('load', request);
    request();
  }

  /* ============================================================
     Boot
     ============================================================ */
  $all('.screen--legacy').forEach(function (screen) {
    normalize(screen);
    bindHoverFocus(screen);
  });
  $('.skip-link').addEventListener('click', function (event) {
    event.preventDefault();
    $('#innhold').focus();
  });
  initParallax();
  initTheme();
  initLogoIntro();
  initReveal();
  initServiceCards();
  initHeroVideo();
  initDockYield();
  window.addEventListener('hashchange', applyHash);
  applyHash();           // sets initial screen from the URL hash

})();
