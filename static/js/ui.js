/* Shared page behaviour (vanilla JS, no dependencies): tooltips, segmented toggles,
   responsive SVG drawing, autoplay while on screen, figure zoom, sortable tables,
   count-up stats, scroll reveal, nav highlight and BibTeX copy. Exposed as window.UI. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var STILL = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function s(tag, attrs, text) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }

  var tip = h('div', { class: 'vb-tip', role: 'status' }); document.body.appendChild(tip);
  function showTip(ev, html) {
    tip.innerHTML = html; tip.classList.add('on');
    var x = ev.clientX, y = ev.clientY, w = tip.offsetWidth, hh = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 14)) + 'px';
    tip.style.top = (y - hh - 12 < 8 ? y + 18 : y - hh - 12) + 'px';
  }
  function hideTip() { tip.classList.remove('on'); }
  function bindTip(el, fn) {
    el.addEventListener('pointermove', function (ev) { showTip(ev, fn(ev)); });
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('click', function (ev) { showTip(ev, fn(ev)); });
  }
  window.addEventListener('scroll', hideTip, { passive: true });

  function seg(host, opts, cur, onPick, label) {
    var box = h('div', { class: 'seg', role: 'group', 'aria-label': label || '' });
    opts.forEach(function (o) {
      var b = h('button', { type: 'button', class: o === cur ? 'on' : '' }, o);
      b.addEventListener('click', function () { box.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); onPick(o); });
      box.appendChild(b);
    });
    host.appendChild(box); return box;
  }
  function responsive(host, draw) {
    var last = 0;
    function run() { var w = host.clientWidth; if (w && Math.abs(w - last) > 4) { last = w; draw(w); } }
    run(); if ('ResizeObserver' in window) new ResizeObserver(run).observe(host); else window.addEventListener('resize', run);
    return function () { last = 0; run(); };
  }
  /* runs while the visual is on screen; hovering pauses it; a click or key press hands control to the reader */
  function autoplay(host, start, stop) {
    if (STILL || !('IntersectionObserver' in window)) return;
    var ok = true, vis = false, over = false;
    function sync() { if (!ok) { stop(); return; } if (vis && !over) start(); else stop(); }
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; sync(); }, { threshold: .15 }).observe(host);
    host.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') { over = true; sync(); } });
    host.addEventListener('pointerleave', function () { over = false; sync(); });
    host.addEventListener('pointerdown', function (ev) { if (ev.isTrusted) { ok = false; sync(); } }, true);
    host.addEventListener('keydown', function (ev) { if (ev.isTrusted) { ok = false; sync(); } }, true);
  }
  function autocycle(host, boxes, ms) {
    var t = null;
    autoplay(host, function () {
      if (!t) t = setInterval(function () {
        var box = boxes[0], bs = box.querySelectorAll('button'), i = 0;
        bs.forEach(function (b, k) { if (b.classList.contains('on')) i = k; });
        bs[(i + 1) % bs.length].click();
      }, ms || 3200);
    }, function () { clearInterval(t); t = null; });
  }
  function axis(svg, x0, x1, y0, y1, xt, yt, xl, yl) {
    yt.forEach(function (t) {
      svg.appendChild(s('line', { x1: x0, x2: x1, y1: t[0], y2: t[0], class: 'grid' }));
      svg.appendChild(s('text', { x: x0 - 6, y: t[0] + 4, 'text-anchor': 'end', class: 'tick' }, t[1]));
    });
    xt.forEach(function (t) { svg.appendChild(s('text', { x: t[0], y: y1 + 16, 'text-anchor': 'middle', class: 'tick' }, t[1])); });
    svg.appendChild(s('line', { x1: x0, x2: x1, y1: y1, y2: y1, class: 'ax' }));
    if (xl) svg.appendChild(s('text', { x: (x0 + x1) / 2, y: y1 + 34, 'text-anchor': 'middle', class: 'lab' }, xl));
    if (yl) svg.appendChild(s('text', { x: 12, y: (y0 + y1) / 2, 'text-anchor': 'middle', class: 'lab', transform: 'rotate(-90 12 ' + (y0 + y1) / 2 + ')' }, yl));
  }

  window.UI = { $: $, h: h, s: s, tip: bindTip, hideTip: hideTip, seg: seg, responsive: responsive, autoplay: autoplay, autocycle: autocycle, axis: axis, still: STILL };

  document.addEventListener('DOMContentLoaded', function () {
    /* figure zoom */
    var lb = h('div', { class: 'lb', role: 'dialog', 'aria-label': 'Figure viewer' }, '<div class="lb-bar"><span class="lb-t"></span><button type="button" data-z="1.4">+</button><button type="button" data-z="0.714">&minus;</button><button type="button" data-z="0">Fit</button><button type="button" class="x" aria-label="Close">&times;</button></div><div class="lb-stage"><img alt=""></div>');
    document.body.appendChild(lb);
    var img = lb.querySelector('img'), stage = lb.querySelector('.lb-stage'), z = 1, tx = 0, ty = 0, drag = null;
    function apply() { img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + z + ')'; }
    function zoom(f) { if (!f) { z = 1; tx = ty = 0; } else { z = Math.max(1, Math.min(8, z * f)); if (z === 1) tx = ty = 0; } apply(); }
    function close() { lb.classList.remove('on'); document.body.style.overflow = ''; }
    document.querySelectorAll('img.zoomable').forEach(function (im) {
      im.addEventListener('click', function () { img.src = im.src; lb.querySelector('.lb-t').textContent = im.alt; zoom(0); lb.classList.add('on'); document.body.style.overflow = 'hidden'; });
    });
    lb.querySelectorAll('[data-z]').forEach(function (b) { b.addEventListener('click', function () { zoom(parseFloat(b.dataset.z)); }); });
    lb.querySelector('.x').addEventListener('click', close);
    stage.addEventListener('click', function (ev) { if (ev.target === stage) close(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
    stage.addEventListener('wheel', function (ev) { ev.preventDefault(); zoom(ev.deltaY < 0 ? 1.15 : .87); }, { passive: false });
    img.addEventListener('dblclick', function () { zoom(z > 1 ? 0 : 2.5); });
    img.addEventListener('pointerdown', function (ev) { drag = [ev.clientX - tx, ev.clientY - ty]; img.setPointerCapture(ev.pointerId); });
    img.addEventListener('pointermove', function (ev) { if (drag && z > 1) { tx = ev.clientX - drag[0]; ty = ev.clientY - drag[1]; apply(); } });
    img.addEventListener('pointerup', function () { drag = null; });
    img.addEventListener('dragstart', function (ev) { ev.preventDefault(); });

    /* copy buttons */
    document.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = document.getElementById(b.dataset.copy).innerText;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.innerHTML = '<i class="fas fa-check"></i> Copied'; }, function () { b.textContent = 'Select and copy'; });
        setTimeout(function () { b.innerHTML = '<i class="far fa-copy"></i> Copy'; }, 1800);
      });
    });

    /* nav highlight */
    var links = document.querySelectorAll('.vb-nav .links a');
    if ('IntersectionObserver' in window && links.length) {
      var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && map[e.target.id]) { links.forEach(function (a) { a.classList.remove('cur'); }); map[e.target.id].classList.add('cur'); } });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (k) { var el = document.getElementById(k); if (el) io2.observe(el); });
    }

    /* reveal and count-up */
    var rev = document.querySelectorAll('.reveal');
    if (STILL || !('IntersectionObserver' in window)) { rev.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .06 });
    rev.forEach(function (e) { io.observe(e); });
    document.querySelectorAll('.stat .num[data-to]').forEach(function (el) {
      var to = parseFloat(el.dataset.to), pre = el.dataset.pre || '', post = el.dataset.post || '', dp = parseInt(el.dataset.dp || '0', 10), t0 = null;
      function fmt(v) { var x = v.toFixed(dp); return dp ? x : Number(x).toLocaleString('en-US'); }
      function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1200), v = to * (1 - Math.pow(1 - p, 3)); el.textContent = pre + fmt(v) + post; if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
  });
})();
