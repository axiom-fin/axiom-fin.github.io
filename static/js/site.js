/* AXIOM project page: interactive pieces.
   The hero canvas is an illustration of the idea, not data from the paper.
   The race and the observation cards use only what the paper reports. */
(function () {
  'use strict';
  var U = window.UI, $ = U.$;

  /* ---------- hero illustration: observed series and latent state ---------- */
  (function () {
    var c = $('tape'); if (!c) return;
    var x = c.getContext('2d'), w, h, t = 0, pts = [], raf = null, noise = 1, show = 'Both';
    function seed() { pts = []; var v = 0, s = 12345; function rnd() { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 - .5; }
      for (var i = 0; i < 260; i++) { v = v * .96 + rnd() * 1.2; pts.push({ n: rnd() * 1.6, l: v }); } }
    function size() { var r = c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2); w = r.width; h = r.height; c.width = w * d; c.height = h * d; x.setTransform(d, 0, 0, d, 0, 0); }
    function frame() {
      x.clearRect(0, 0, w, h); var n = pts.length, base = h * .5, amp = h * .3, off = t * .1, N = 150, i, px;
      x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1;
      for (i = 1; i < 4; i++) { x.beginPath(); x.moveTo(0, h * i / 4); x.lineTo(w, h * i / 4); x.stroke(); }
      function y(k, noisy) { var a = pts[(k + Math.floor(off)) % n], b = pts[(k + Math.floor(off) + 1) % n], f = off % 1;
        return base - ((a.l + (b.l - a.l) * f) / 3.2 + (noisy ? noise * (a.n + (b.n - a.n) * f) / 3.6 : 0)) * amp; }
      if (show !== 'Latent state') {
        x.beginPath(); for (i = 0; i < N; i++) { px = i / (N - 1) * w; i ? x.lineTo(px, y(i, true)) : x.moveTo(px, y(i, true)); }
        x.strokeStyle = 'rgba(159,180,207,.65)'; x.lineWidth = 1.2; x.stroke();
      }
      if (show !== 'Observed series') {
        var g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#5aa9e6'); g.addColorStop(1, '#35b98a');
        x.beginPath(); for (i = 0; i < N; i++) { px = i / (N - 1) * w; i ? x.lineTo(px, y(i, false)) : x.moveTo(px, y(i, false)); }
        x.strokeStyle = g; x.lineWidth = 2.8; x.shadowColor = 'rgba(53,185,138,.55)'; x.shadowBlur = 12; x.stroke(); x.shadowBlur = 0;
      }
    }
    function loop() { frame(); t++; raf = requestAnimationFrame(loop); }
    function start() { if (!raf && !U.still) loop(); }
    function stop() { cancelAnimationFrame(raf); raf = null; }
    window.addEventListener('resize', function () { size(); frame(); });
    seed(); size(); frame();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(c); else start();
    U.seg($('tape-ctl'), ['Both', 'Observed series', 'Latent state'], show, function (o) { show = o; frame(); }, 'Show');
    var sl = $('noise');
    if (sl) sl.addEventListener('input', function () { noise = parseFloat(sl.value); $('noise-v').textContent = noise.toFixed(1) + '×'; frame(); });
  })();

  /* ---------- training-time race (relative wall-clock, from the paper) ---------- */
  (function () {
    var host = $('race'); if (!host) return;
    var bars = host.querySelectorAll('.lane .fill'), clock = $('race-clock'), btn = $('race-play'), raf = null, t0 = null, done = false;
    var END = { tf: 1, wm: .4 };
    function paint(p) {
      bars.forEach(function (b) { var e = END[b.dataset.k]; var v = Math.min(p, e) / 1; b.style.width = v * 100 + '%'; b.parentNode.parentNode.classList.toggle('fin', p >= e); });
      clock.textContent = Math.round(p * 100) + '% of the Transformer’s training time';
    }
    function run() {
      cancelAnimationFrame(raf); t0 = null; done = false;
      function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 4200); paint(p); if (p < 1) raf = requestAnimationFrame(step); else done = true; }
      raf = requestAnimationFrame(step);
    }
    btn.addEventListener('click', run);
    if (U.still) { paint(1); return; }
    paint(0);
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: .4 }); io.observe(host); } else paint(1);
  })();

  /* ---------- the two observations ---------- */
  (function () {
    var host = $('obs'); if (!host) return;
    var S = {
      'Raw price and volume': {
        wm: ['Highest directional accuracy', 'of the eight model families', 'good'],
        tf: ['Behind the world model', 'trained under an identical budget', 'mid'],
        ot: ['Below the world model', 'six other model families', 'mid'],
        note: 'On raw OHLCV input, the compact world model (variational encoder + GRU latent transition) reached the highest directional accuracy of the eight families, at about 40% of the Transformer’s wall-clock training time.'
      },
      '+ 91 engineered indicators': {
        wm: ['Tied for the best quality', 'ordering survives', 'good'],
        tf: ['Quality fell', 'the only model harmed by the indicators', 'bad'],
        ot: ['Quality did not fall', 'only the Transformer was harmed', 'mid'],
        note: 'With 91 engineered indicators added, the world model stayed tied for the best quality. The Transformer was the only model whose quality fell.'
      }
    };
    var box = U.seg($('obs-ctl'), Object.keys(S), 'Raw price and volume', paint, 'Input');
    function paint(k) {
      var d = S[k];
      ['wm', 'tf', 'ot'].forEach(function (id) {
        var el = $('o-' + id); el.className = 'oc ' + d[id][2];
        el.querySelector('.st').textContent = d[id][0]; el.querySelector('.sb').textContent = d[id][1];
      });
      $('obs-note').textContent = d.note;
    }
    paint('Raw price and volume');
    U.autocycle(host, [box], 3800);
  })();
})();
