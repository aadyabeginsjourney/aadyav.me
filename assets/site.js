// aadyav.me interactions: draggable scrapbook pieces, the work collage (filter, colour
// shift, tilt, cursor tag), modelling photo stacks and film, a gallery lightbox,
// sticky header, reading progress and scroll reveal.
(function () {
  var doc = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------- sound */
  // Soft sounds made on the fly with Web Audio (no files to download): a plop when
  // something is dropped, flipped or pressed, and a paper rustle for the photobook.
  // Browsers only allow audio after the visitor has clicked or tapped, and every sound
  // here follows a click or drag. The speaker button in the header mutes them.
  var Sound = (function () {
    var ctx = null, on = true;
    try { on = localStorage.getItem("sound") !== "off"; } catch (e) {}
    function ac() {
      if (!on || reduce) return null;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function plop(pitch, vol) {
      var c = ac(); if (!c) return;
      var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      var f = (pitch || 1) * (520 + Math.random() * 80);
      o.type = "sine";
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.32, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.09, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.22);
    }
    var noise = null;
    function turn() {
      var c = ac(); if (!c) return;
      var t = c.currentTime, len = 0.5;
      if (!noise) {
        noise = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
        var d = noise.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.random());
      }
      var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = noise;
      bp.type = "bandpass"; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(2600, t);
      bp.frequency.exponentialRampToValueAtTime(700, t + len);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.06);
      g.gain.setValueAtTime(0.12, t + 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(bp); bp.connect(g); g.connect(c.destination);
      src.start(t); src.stop(t + len);
      setTimeout(function () { plop(0.45, 0.05); }, 330); // the page landing
    }
    function set(v) {
      on = v;
      try { localStorage.setItem("sound", v ? "on" : "off"); } catch (e) {}
      $$("[data-sound]").forEach(function (b) { b.setAttribute("aria-pressed", v); b.title = v ? "Sound on" : "Sound off"; });
      if (v) plop(1.2);
    }
    // A rubber-stamp thud: a low knock plus a short papery click.
    function stamp(i) {
      var c = ac(); if (!c) return;
      var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      var f = 150 - (i || 0) * 6;
      o.type = "sine";
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2);
      burst(c, t, 0.05, 1800, 0.12);
    }
    function burst(c, t, len, freq, vol) {
      var buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 0.8; g.gain.value = vol;
      src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t);
    }
    // An airy whoosh for things flying off.
    function whoosh() {
      var c = ac(); if (!c) return;
      var t = c.currentTime, len = 0.55;
      var buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; bp.type = "bandpass"; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(350, t); bp.frequency.exponentialRampToValueAtTime(3200, t + len * 0.7);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + len * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t); src.stop(t + len);
    }
    return { plop: plop, turn: turn, stamp: stamp, whoosh: whoosh, set: set, get on() { return on; } };
  })();
  $$("[data-sound]").forEach(function (b) {
    b.setAttribute("aria-pressed", Sound.on); b.title = Sound.on ? "Sound on" : "Sound off";
    b.addEventListener("click", function () { Sound.set(!Sound.on); });
  });
  // A soft plop for every button and tab press.
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest(".btn:not([data-flip]), .tab, .m-tab, .pc-copy, .lb-btn:not(.fb-btn)");
    if (t) Sound.plop(t.classList.contains("tab") || t.classList.contains("m-tab") ? 1.25 : 1);
  });

  /* ---------------------------------------------------------- lightbox */
  var box = document.createElement("dialog");
  box.className = "lightbox";
  box.setAttribute("aria-label", "Image viewer");
  box.innerHTML = '<img alt=""><p class="lb-cap"></p>' +
    '<button type="button" class="lb-btn lb-close">Close</button>' +
    '<button type="button" class="lb-btn lb-prev" aria-label="Previous image">&larr;</button>' +
    '<button type="button" class="lb-btn lb-next" aria-label="Next image">&rarr;</button>';
  document.body.appendChild(box);
  var big = $("img", box), cap = $(".lb-cap", box), set = [], cur = 0;
  function show(i) {
    cur = (i + set.length) % set.length;
    var t = set[cur];
    big.src = t.currentSrc || t.src; big.alt = t.alt; cap.textContent = t.alt;
  }
  function openLB(list, i) {
    if (typeof box.showModal !== "function" || !list.length) return;
    set = list; show(i); box.showModal();
  }
  function closeLB() { box.close(); big.removeAttribute("src"); }
  $(".lb-close", box).addEventListener("click", closeLB);
  $(".lb-prev", box).addEventListener("click", function (e) { e.stopPropagation(); show(cur - 1); });
  $(".lb-next", box).addEventListener("click", function (e) { e.stopPropagation(); show(cur + 1); });
  box.addEventListener("click", function (e) { if (e.target === box || e.target === big) closeLB(); });
  box.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") show(cur + 1);
    if (e.key === "ArrowLeft") show(cur - 1);
  });
  var touchX = null;
  box.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var d = e.changedTouches[0].clientX - touchX;
    if (Math.abs(d) > 50) show(cur + (d < 0 ? 1 : -1));
    touchX = null;
  });
  var zoomables = $$("img[data-zoom]");
  zoomables.forEach(function (im, i) { im.addEventListener("click", function () { openLB(zoomables, i); }); });

  /* ---------------------------------------------------------- draggable pieces */
  // Anything with tape can be pushed around. A press without movement still counts
  // as a click, so stickers still open their project.
  var z = 10;
  function draggable(el, onRelease) {
    var sx, sy, ox = 0, oy = 0, moved = false, id = null;
    el.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      id = e.pointerId; moved = false;
      sx = e.clientX - ox; sy = e.clientY - oy;
      el.setPointerCapture(id);
    });
    el.addEventListener("pointermove", function (e) {
      if (e.pointerId !== id) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx - ox) + Math.abs(dy - oy) < 6) return;
      if (!moved) { moved = true; el.classList.add("is-dragging"); el.style.zIndex = ++z; }
      ox = dx; oy = dy;
      el.style.setProperty("--dx", dx + "px");
      el.style.setProperty("--dy", dy + "px");
    });
    function end(e) {
      if (e.pointerId !== id) return;
      id = null; el.classList.remove("is-dragging");
      if (moved && !el.classList.contains("m-card")) Sound.plop(0.8 + Math.random() * 0.3);
      if (onRelease && moved) {
        if (onRelease(ox, oy) === "reset") { ox = 0; oy = 0; }
      }
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false; } }, true);
    el.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }
  $$("[data-drag]").forEach(function (el, i) { el.style.setProperty("--i", i); draggable(el); });

  /* ---------------------------------------------------------- work collage */
  var work = $(".work"), list = $("[data-list]");
  if (list) {
    var cards = $$(".card", list), tabs = $$("[data-filter]");
    function setFilter(f) {
      list.dataset.f = f;
      tabs.forEach(function (t) {
        var on = t.dataset.filter === f;
        t.classList.toggle("is-on", on); t.setAttribute("aria-pressed", on);
      });
      cards.forEach(function (c) {
        // The low-key project only shows inside its own category.
        var hide = f === "all" ? c.hasAttribute("data-lowkey") : c.dataset.cat !== f;
        c.hidden = hide;
      });
    }
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        setFilter(t.dataset.filter);
        history.replaceState(null, "", (t.dataset.filter === "all" ? location.pathname : "?f=" + t.dataset.filter) + "#work");
      });
    });
    // Masonry: deal the visible cards into real column boxes (shortest column first).
    // CSS multi-column was drawing the tape above a column's first card at the bottom
    // of the column before it.
    var colsN = 0;
    function layout(force) {
      var n = innerWidth > 960 ? 3 : innerWidth > 640 ? 2 : 1;
      if (n === colsN && !force) return;
      colsN = n;
      var boxes = [];
      for (var k = 0; k < n; k++) { var b = document.createElement("div"); b.className = "collage-col"; boxes.push(b); }
      var hs = boxes.map(function () { return 0; });
      cards.forEach(function (c) {
        if (c.hidden) { boxes[0].appendChild(c); return; }
        var k = hs.indexOf(Math.min.apply(null, hs));
        boxes[k].appendChild(c);
        hs[k] += (c.offsetHeight || 400) + 40;
      });
      list.innerHTML = "";
      boxes.forEach(function (b) { list.appendChild(b); });
      list.classList.add("is-masonry");
    }
    var setFilter0 = setFilter;
    setFilter = function (f) { setFilter0(f); layout(true); };
    addEventListener("resize", function () { layout(false); });
    var q = new URLSearchParams(location.search).get("f");
    setFilter(q && tabs.some(function (t) { return t.dataset.filter === q; }) ? q : "all");

    // The whole section takes on the colour of the project under the cursor.
    cards.forEach(function (c) {
      c.addEventListener("pointerenter", function () {
        work.classList.add("is-tinted");
        work.style.setProperty("--wbg", c.dataset.bg);
        work.style.setProperty("--wfg", c.dataset.fg);
      });
      c.addEventListener("focus", function () {
        work.style.setProperty("--wbg", c.dataset.bg);
        work.style.setProperty("--wfg", c.dataset.fg);
      });
      if (fine && !reduce) {
        c.addEventListener("pointermove", function (e) {
          var r = c.getBoundingClientRect();
          c.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5) * 10 + "deg");
          c.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5) * -10 + "deg");
        });
        c.addEventListener("pointerleave", function () { c.style.removeProperty("--tx"); c.style.removeProperty("--ty"); });
      }
    });
    list.addEventListener("pointerleave", function () {
      work.style.removeProperty("--wbg"); work.style.removeProperty("--wfg");
      work.classList.remove("is-tinted");
    });
  }

  /* ---------------------------------------------------------- modelling */
  var mod = $(".modelling");
  if (mod) {
    var mtabs = $$(".m-tab", mod), stacks = $$(".stack", mod);
    function activeStack() { return stacks.filter(function (s) { return !s.hidden; })[0]; }
    mtabs.forEach(function (t) {
      t.addEventListener("click", function () {
        mtabs.forEach(function (o) { o.classList.toggle("is-on", o === t); o.setAttribute("aria-pressed", o === t); });
        stacks.forEach(function (s) { s.hidden = s.dataset.stack !== t.dataset.shoot; });
        mod.style.setProperty("--ground", t.style.getPropertyValue("--ground"));
      });
    });
    // The top photo is the last child; flipping sends it to the bottom of the pile.
    function flip(stack, dx, dy) {
      var top = stack.lastElementChild;
      if (!top) return;
      top.style.setProperty("--dx", (dx || 420) + "px");
      top.style.setProperty("--dy", (dy || -40) + "px");
      top.style.setProperty("--spin", (dx < 0 ? -18 : 18) + "deg");
      top.classList.add("is-gone");
      Sound.plop(0.9);
      setTimeout(function () {
        top.classList.add("is-dragging");
        top.style.removeProperty("--dx"); top.style.removeProperty("--dy"); top.style.removeProperty("--spin");
        stack.insertBefore(top, stack.firstElementChild);
        top.offsetWidth; // apply the reset before re-enabling transitions
        top.classList.remove("is-dragging", "is-gone");
      }, reduce ? 0 : 320);
    }
    stacks.forEach(function (s) {
      $$(".m-card", s).forEach(function (card) {
        draggable(card, function (dx, dy) {
          if (Math.abs(dx) + Math.abs(dy) > 90 && card === s.lastElementChild) flip(s, dx, dy);
          else { card.style.removeProperty("--dx"); card.style.removeProperty("--dy"); }
          return "reset";
        });
        card.addEventListener("click", function () { if (card === s.lastElementChild) flip(s, 420, -40); });
      });
    });
    var flipBtn = $("[data-flip]", mod), viewBtn = $("[data-view-photo]", mod);
    if (flipBtn) flipBtn.addEventListener("click", function () { flip(activeStack(), 420, -40); });
    if (viewBtn) viewBtn.addEventListener("click", function () {
      var imgs = $$(".m-card img", activeStack()).reverse(); // top photo first
      openLB(imgs, 0);
    });

    var film = $(".film", mod), video = film && $("video", film), play = film && $(".film-play", film);
    if (video && play) {
      play.addEventListener("click", function () { video.play(); });
      video.addEventListener("play", function () { film.classList.add("is-playing"); });
      video.addEventListener("pause", function () { if (video.currentTime === 0 || video.ended) film.classList.remove("is-playing"); });
      video.addEventListener("ended", function () { film.classList.remove("is-playing"); });
    }
  }

  /* ---------------------------------------------------------- photobook flip-book */
  // Uses StPageFlip (loaded only on pages with a book). Without it the pages stay a
  // swipeable strip, so the book is always readable.
  $$("[data-flipbook]").forEach(function (fb) {
    var bookEl = $(".fb-book", fb), leaves = $$(".fb-page", fb);
    var imgs = leaves.map(function (l) { return $("img", l); });
    var count = $(".fb-count", fb), prev = $("[data-fb-prev]", fb), next = $("[data-fb-next]", fb);
    function start() {
      if (!window.St || !St.PageFlip) return;
      imgs.forEach(function (im) { if (im) im.loading = "eager"; }); // no blank pages mid-turn
      // Page shape: from data-ratio (height / width) for drawn books, else the first image.
      var first = imgs[0], ratio = parseFloat(fb.dataset.ratio);
      var w = 1, h = ratio || 1;
      if (!ratio && first) { w = first.naturalWidth || +first.getAttribute("width"); h = first.naturalHeight || +first.getAttribute("height"); }
      var maxW = +fb.dataset.maxw || 900;
      var book = new St.PageFlip(bookEl, {
        width: Math.min(600, maxW), height: Math.round(Math.min(600, maxW) * h / w), size: "stretch",
        minWidth: 240, maxWidth: maxW, minHeight: Math.round(240 * h / w), maxHeight: Math.round(maxW * h / w),
        showCover: true, usePortrait: true, mobileScrollSupport: true,
        maxShadowOpacity: 0.45, flippingTime: reduce ? 1 : 900, drawShadow: true
      });
      book.loadFromHTML(leaves);
      fb.classList.add("is-ready");
      var total = book.getPageCount();
      function update(i) {
        var inner = total - 2, spread = book.getOrientation() === "landscape" && i + 1 <= inner;
        count.textContent = i === 0 ? "Cover" : i >= total - 1 ? "Back cover"
          : spread ? "Pages " + i + "–" + (i + 1) + " of " + inner : "Page " + i + " of " + inner;
        prev.disabled = i === 0; next.disabled = i >= total - 1;
      }
      update(0);
      book.on("flip", function (e) { update(e.data); });
      // Rustle when a page starts turning (drag, click or arrow key).
      var lastState = "read";
      book.on("changeState", function (e) {
        if ((e.data === "flipping" || e.data === "user_fold") && lastState === "read") Sound.turn();
        lastState = e.data;
      });
      prev.addEventListener("click", function () { book.flipPrev(); });
      next.addEventListener("click", function () { book.flipNext(); });
      // Arrow keys turn pages while the book is on screen and the viewer is closed.
      var visible = false;
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.4 }).observe(fb);
      addEventListener("keydown", function (e) {
        if (!visible || box.open) return;
        if (e.key === "ArrowRight") { book.flipNext(); e.preventDefault(); }
        if (e.key === "ArrowLeft") { book.flipPrev(); e.preventDefault(); }
      });
      var zoomBtn = $("[data-fb-zoom]", fb);
      if (zoomBtn) zoomBtn.addEventListener("click", function () { openLB(imgs, book.getCurrentPageIndex()); });
    }
    if (window.St) start();
    else addEventListener("load", start);
  });

  /* ---------------------------------------------------------- visitor counter */
  // GoatCounter's public total for the whole site. Stays hidden if it can't be read
  // (counter not set up yet, offline, or blocked), so nothing broken ever shows.
  var visits = $("[data-visits]");
  if (visits && window.fetch) {
    fetch(visits.dataset.visits + "/counter/TOTAL.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var total = d && parseInt(String(d.count).replace(/[^\d]/g, ""), 10);
        if (!total) return;
        var el = $("[data-visits-n]", visits);
        visits.hidden = false;
        if (reduce) { el.textContent = total.toLocaleString(); return; }
        var t0 = null;
        (function tick(t) { // roll the number up like an odometer
          t0 = t0 || t;
          var k = Math.min(1, (t - t0) / 1400);
          el.textContent = Math.round(total * (1 - Math.pow(1 - k, 3))).toLocaleString();
          if (k < 1) requestAnimationFrame(tick);
        })(performance.now());
      })
      .catch(function () {});
  }

  /* ---------------------------------------------------------- copy email */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.dataset.copy).then(function () {
        var t = b.textContent; b.textContent = "Copied!";
        setTimeout(function () { b.textContent = t; }, 1600);
      });
    });
  });

  /* ---------------------------------------------------------- header + progress */
  var header = $("[data-header]"), bar = header && $(".progress", header), lastY = scrollY;
  function onScroll() {
    var y = scrollY;
    header.classList.toggle("is-solid", y > 40);
    header.classList.toggle("is-hidden", y > 400 && y > lastY + 4);
    if (y < lastY - 4 || y < 400) header.classList.remove("is-hidden");
    lastY = y;
    if (bar) {
      var max = doc.scrollHeight - innerHeight;
      bar.style.setProperty("--p", max > 0 ? Math.min(1, y / max) : 0);
    }
  }
  if (header) { addEventListener("scroll", onScroll, { passive: true }); onScroll(); }

  /* ---------------------------------------------------------- opening: ransom note */
  // The animation is pure CSS and starts on the first frame. This just remembers that it
  // played (so it shows once per visit) and takes it out of the page when it's done.
  var rn = $(".rn-intro");
  if (rn) {
    if (doc.classList.contains("intro-on")) {
      try { sessionStorage.setItem("seenIntro", "1"); } catch (e) {}
      setTimeout(function () { doc.classList.remove("intro-on"); if (rn.parentNode) rn.parentNode.removeChild(rn); }, 2700);
    } else if (rn.parentNode) rn.parentNode.removeChild(rn);
  }

  /* ---------------------------------------------------------- blush */
  // Click the landing photo for cartoon blush on the cheeks (and a few hearts).
  // A drag doesn't count as a click, so moving the photo still works.
  var pol = $(".polaroid");
  if (pol && $(".blush", pol)) {
    pol.addEventListener("click", function () {
      var on = !pol.classList.contains("is-blushing");
      pol.classList.toggle("is-blushing", on);
      Sound.plop(on ? 1.5 : 0.9, 0.08);
    });
  }

  /* ---------------------------------------------------------- project click sound */
  // Opening a project waits a beat so its plop is heard before the page changes.
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href*="work/"]');
    if (!a || a.target === "_blank" || !Sound.on || reduce) return;
    e.preventDefault();
    Sound.plop(1.15, 0.1);
    setTimeout(function () { location.href = a.href; }, 150);
  });

  /* ---------------------------------------------------------- cursor label */
  // A round label follows the cursor over things you can open, drag or flip.
  var cursor = $(".cursor"), cursorLabel = cursor && $(".cursor-label", cursor);
  if (cursor && fine && !reduce) {
    var CURSOR_TARGETS = [
      [".card", "View"], [".stack .m-card", "Flip"], [".next-link", "Next"], ["img[data-zoom]", "Zoom"]
    ];
    CURSOR_TARGETS.forEach(function (t) { $$(t[0]).forEach(function (el) { el.setAttribute("data-cursor", t[1]); }); });
    doc.classList.add("has-cursor");
    var cx = -200, cy = -200, tx = -200, ty = -200, hot = null, moving = false;
    function follow() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cursor.style.setProperty("--cx", cx.toFixed(1) + "px");
      cursor.style.setProperty("--cy", cy.toFixed(1) + "px");
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3) requestAnimationFrame(follow); else moving = false;
    }
    addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      var el = e.target.closest && e.target.closest("[data-cursor]");
      if (el !== hot) {
        if (!hot) { cx = tx; cy = ty; } // appear right under the pointer, then glide
        hot = el;
        cursor.classList.toggle("is-on", !!el);
        if (el) cursorLabel.textContent = el.getAttribute("data-cursor");
      }
      if (!moving) { moving = true; requestAnimationFrame(follow); }
    }, { passive: true });
    document.addEventListener("pointerleave", function () { hot = null; cursor.classList.remove("is-on"); });
    // Scrolling moves the page under a still mouse, so check what is under it now.
    addEventListener("scroll", function () {
      if (tx < 0) return;
      var under = document.elementFromPoint(tx, ty), el = under && under.closest("[data-cursor]");
      if (el !== hot) { hot = el; cursor.classList.toggle("is-on", !!el); if (el) cursorLabel.textContent = el.getAttribute("data-cursor"); }
    }, { passive: true });
  }

  /* ---------------------------------------------------------- magnetic buttons */
  // Buttons lean towards the cursor when it comes close. This uses `translate`, so the
  // hover lift (`transform`) still works on top.
  if (fine && !reduce) {
    $$(".btn, .social").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.3).toFixed(1) + "px " +
                            ((e.clientY - r.top - r.height / 2) * 0.4).toFixed(1) + "px";
      });
      b.addEventListener("pointerleave", function () { b.style.translate = ""; });
    });
  }

  /* ---------------------------------------------------------- letters swell */
  // Big headings: each letter grows as the cursor passes. Words stay whole so lines
  // still wrap between words; screen readers get the plain heading text.
  if (fine && !reduce) {
    var swellHeads = $$(".intro-name, .work-title, .m-title, .closer-title, .opener-title, .sec .huge");
    swellHeads.forEach(function (h) {
      var label = h.textContent.replace(/\s+/g, " ").trim();
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 1) { walk(n); return; }
          if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
          var frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span"); w.className = "sw-word"; w.setAttribute("aria-hidden", "true");
            Array.prototype.forEach.call(part, function (ch) {
              var c = document.createElement("span"); c.className = "sw"; c.textContent = ch; w.appendChild(c);
            });
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        });
      })(h);
      h.setAttribute("aria-label", label);
    });
    var swellOn = [];
    var sio = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        var ls = $$(".sw", e.target);
        if (e.isIntersecting) swellOn = swellOn.concat(ls);
        else {
          swellOn = swellOn.filter(function (l) { return ls.indexOf(l) < 0; });
          ls.forEach(function (l) { l.style.transform = ""; });
        }
      });
    });
    swellHeads.forEach(function (h) { sio.observe(h); });
    var lastMove = null, swellRaf = 0;
    function swell() {
      swellRaf = 0;
      swellOn.forEach(function (l) {
        var r = l.getBoundingClientRect();
        var d = Math.hypot(lastMove.x - (r.left + r.width / 2), lastMove.y - (r.top + r.height / 2));
        var k = Math.max(0, 1 - d / Math.max(140, r.height * 1.6));
        l.style.transform = k > 0.01 ? "translateY(" + (-k * 8).toFixed(1) + "%) scale(" + (1 + k * 0.28).toFixed(3) + ")" : "";
      });
    }
    addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !swellOn.length) return;
      lastMove = { x: e.clientX, y: e.clientY };
      if (!swellRaf) swellRaf = requestAnimationFrame(swell);
    }, { passive: true });
  }

  /* ---------------------------------------------------------- photo morph */
  // Cross-page view transitions: the photo you clicked grows into the project's cover,
  // and shrinks back into it when you come back. Other browsers just load the page.
  function slugOf(url) { var m = /\/work\/([^\/]+)\//.exec(url || ""); return m && m[1]; }
  function morphImg(slug) {
    if (!slug) return null;
    return $$('a[href$="work/' + slug + '/index.html"] img').filter(function (im) {
      var r = im.getBoundingClientRect();
      return r.width && r.bottom > 0 && r.top < innerHeight && !im.closest("[hidden]") && getComputedStyle(im).opacity !== "0";
    })[0] || null;
  }
  function nameFor(im, vt) {
    if (!im) return;
    im.style.viewTransitionName = "hero";
    vt.finished.then(function () { im.style.viewTransitionName = ""; });
  }
  if (document.body.classList.contains("home")) {
    addEventListener("pageswap", function (e) {
      if (e.viewTransition && e.activation && e.activation.entry) nameFor(morphImg(slugOf(e.activation.entry.url)), e.viewTransition);
    });
    addEventListener("pagereveal", function (e) {
      if (e.viewTransition && window.navigation && navigation.activation && navigation.activation.from)
        nameFor(morphImg(slugOf(navigation.activation.from.url)), e.viewTransition);
    });
  }

  /* ---------------------------------------------------------- reveal on scroll */
  if (!("IntersectionObserver" in window) || reduce) return;
  doc.classList.add("js");
  var items = $$(".sec .wrap > *, .bleed, .about-body, .work-head, .m-text, .m-stage, .film, .closer > *");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        var t = en.target;
        t.classList.remove("pre"); io.unobserve(t);
        setTimeout(function () { t.classList.remove("rv"); }, 900);
      }
    });
  }, { rootMargin: "0px 0px -6% 0px" });
  items.forEach(function (el) {
    el.classList.add("rv");
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); io.observe(el); }
  });
})();
