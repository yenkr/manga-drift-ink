// Manga Drift website — small interactions, no libraries.
(function () {
  "use strict";

  // Mobile menu
  var btn = document.querySelector(".menu-btn");
  var menu = document.querySelector(".nav ul");
  if (btn && menu) {
    btn.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") menu.classList.remove("open");
    });
  }

  // Current year in footer
  document.querySelectorAll(".year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Count-up numbers
  function countUp(el) {
    var target = +el.dataset.count, start = null, dur = 1200;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Reveal on scroll
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        var n = en.target.querySelector("[data-count]");
        if (n) countUp(n);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 80 + "ms";
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  // Back to top button
  var top = document.getElementById("top-btn");
  if (top) {
    window.addEventListener("scroll", function () {
      top.classList.toggle("show", window.scrollY > 600);
    }, { passive: true });
    top.addEventListener("click", function () { window.scrollTo({ top: 0 }); });
  }

  // Phone mock-up: a tiny ink-style pseudo-3D road with a drifting car
  var cv = document.getElementById("road");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var W, H, dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  var INK = "#0b0b0b", RED = "#ff2b3a";
  var pos = 0, running = true;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Only animate while visible
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { running = e[0].isIntersecting; }).observe(cv);
  }

  function curve(z) { return Math.sin(z * 0.004) * 1.4 + Math.sin(z * 0.0017) * 0.8; }

  function frame(t) {
    requestAnimationFrame(frame);
    if (!running) return;
    if (!reduced) pos += 6;
    var horizon = H * 0.38;

    // sky with halftone
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    for (var y = 0; y < horizon; y += 8)
      for (var x = (y / 8) % 2 * 4; x < W; x += 8) {
        var r = 1.6 * (1 - y / horizon);
        if (r > .2) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
      }
    // skyline
    ctx.fillStyle = INK;
    for (var i = 0; i < 14; i++) {
      var bw = 18 + (i * 37) % 22, bh = 30 + (i * 53) % 70;
      ctx.fillRect(i * (W / 13) - 6, horizon - bh, bw, bh);
    }

    // road: build points near (k=0) to far (k=1); the curve bends the far end
    var segs = 90, pts = [], dx = 0, xoff = 0;
    for (var n = 0; n <= segs; n++) {
      var k = n / segs;
      var yy = H - (H - horizon) * (1 - Math.pow(1 - k, 2.4));
      var ww = W * 1.1 * (1 - k) + 4;
      dx += curve(pos + n * 20) * (1 - k) * 0.9;
      xoff += dx * 0.02;
      pts.push({ x: W / 2 + xoff * (1 - k), y: yy, w: ww, z: pos + n * 20 });
    }
    for (var m = pts.length - 1; m > 0; m--) {
      var a = pts[m], b = pts[m - 1];
      var stripe = Math.floor(a.z / 60) % 2 === 0;
      // ground
      ctx.fillStyle = stripe ? "#e9e6dd" : "#fff";
      ctx.fillRect(0, a.y, W, b.y - a.y + 1);
      // road
      poly(a.x, a.y, a.w, b.x, b.y, b.w, stripe ? "#2a2a2a" : INK);
      // kerbs
      poly(a.x - a.w * 0.5, a.y, a.w * 0.06, b.x - b.w * 0.5, b.y, b.w * 0.06, stripe ? RED : "#fff");
      poly(a.x + a.w * 0.5, a.y, a.w * 0.06, b.x + b.w * 0.5, b.y, b.w * 0.06, stripe ? RED : "#fff");
      // centre line
      if (stripe) poly(a.x, a.y, a.w * 0.02, b.x, b.y, b.w * 0.02, "#fff");
    }

    // car (drifting: angle follows the curve)
    var slip = Math.sin(t * 0.0012) * 0.35 + curve(pos + 200) * 0.12;
    var cx = W / 2 + Math.sin(t * 0.0012) * W * 0.08, cy = H * 0.8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(slip);
    // smoke
    for (var p = 0; p < 6; p++) {
      ctx.fillStyle = "rgba(255,255,255," + (0.75 - p * 0.11) + ")";
      ctx.strokeStyle = "rgba(11,11,11," + (0.5 - p * 0.08) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-slip * 60 + (p % 2 ? 18 : -18), 34 + p * 9, 9 + p * 3, 0, 6.283);
      ctx.fill(); ctx.stroke();
    }
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.fillStyle = INK; ctx.fillRect(-26, -6, 10, 18); ctx.fillRect(16, -6, 10, 18);   // tyres
    ctx.fillRect(-26, 22, 10, 18); ctx.fillRect(16, 22, 10, 18);
    ctx.fillStyle = "#fff"; roundRect(-20, -22, 40, 66, 10); ctx.fill(); ctx.stroke(); // body
    ctx.fillStyle = INK; roundRect(-14, -6, 28, 22, 5); ctx.fill();                   // roof/glass
    ctx.fillStyle = RED; ctx.fillRect(-20, 36, 40, 5);                                 // wing
    ctx.restore();

    // speed lines
    ctx.strokeStyle = "rgba(11,11,11,.5)"; ctx.lineWidth = 1.2;
    for (var l = 0; l < 10; l++) {
      var ang = (l / 10) * 6.283 + t * 0.0004, len = 30 + ((l * 31 + pos) % 40);
      var r0 = W * 0.55;
      ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * r0);
      ctx.lineTo(W / 2 + Math.cos(ang) * (r0 + len), H / 2 + Math.sin(ang) * (r0 + len));
      ctx.stroke();
    }
    // HUD
    ctx.fillStyle = INK; ctx.fillRect(10, 10, 92, 30);
    ctx.fillStyle = "#fff"; ctx.font = "16px Bangers, Impact, sans-serif";
    ctx.fillText("DRIFT x" + (2 + Math.floor((t / 900) % 6)), 18, 31);
    ctx.fillStyle = RED; ctx.fillRect(W - 82, 10, 72, 30);
    ctx.fillStyle = "#fff"; ctx.fillText(Math.floor(140 + Math.sin(t * 0.002) * 25) + " KM/H", W - 76, 31);
  }

  function poly(x1, y1, w1, x2, y2, w2, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x1 - w1 / 2, y1); ctx.lineTo(x1 + w1 / 2, y1);
    ctx.lineTo(x2 + w2 / 2, y2 + 1); ctx.lineTo(x2 - w2 / 2, y2 + 1);
    ctx.closePath(); ctx.fill();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  requestAnimationFrame(frame);
})();
