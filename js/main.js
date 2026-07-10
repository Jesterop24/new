/* =============================================================
   HENIL PAREKH — PORTFOLIO
   main.js — all custom interaction logic (vanilla + GSAP)
   -------------------------------------------------------------
   Modules:
     - env / feature detection
     - splitText helper
     - preloader
     - lenis smooth scroll + ScrollTrigger bridge
     - custom cursor
     - navbar hide/reveal
     - fullscreen menu overlay
     - hero intro + aurora drift + live clock
     - marquees
     - heading + line reveals
     - horizontal work showcase (pin + scrub)
     - stat count-up
     - parallax
     - process line draw
     - buttons (magnetic / liquid / trace / press / glint)
   ============================================================= */

(function () {
  "use strict";

  /* -----------------------------------------------------------
     ENV / FEATURE DETECTION
     ----------------------------------------------------------- */
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const IS_TOUCH = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  if (hasGSAP && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Mark that JS-driven animation is active (CSS sets pre-reveal states).
  if (!REDUCED) document.documentElement.classList.add("js-anim");

  /* -----------------------------------------------------------
     SPLIT TEXT — hand-written, wraps each word in .word / mask
     Returns array of word elements for staggering.
     ----------------------------------------------------------- */
  function splitWords(el) {
    // Elements already authored with .line/.word in markup: just collect.
    const preset = el.querySelectorAll("[data-split]");
    if (preset.length) return Array.from(preset);
    return [];
  }

  // Split a paragraph into line-masked spans (measured from layout).
  function splitLines(el) {
    const text = el.textContent.trim().replace(/\s+/g, " ");
    const words = text.split(" ");
    el.textContent = "";
    const probes = words.map((w) => {
      const s = document.createElement("span");
      s.className = "rline-word";
      s.style.display = "inline-block";
      s.textContent = w + " ";
      el.appendChild(s);
      return s;
    });

    // Group probe spans into lines by their offsetTop.
    const lines = [];
    let current = null;
    let lastTop = null;
    probes.forEach((span) => {
      const top = span.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 4) {
        current = [];
        lines.push(current);
        lastTop = top;
      }
      current.push(span.textContent);
    });

    // Rebuild as masked line rows.
    el.textContent = "";
    const inners = [];
    lines.forEach((wordsInLine) => {
      const row = document.createElement("span");
      row.className = "rline";
      const inner = document.createElement("span");
      inner.textContent = wordsInLine.join("").trimEnd();
      row.appendChild(inner);
      el.appendChild(row);
      inners.push(inner);
    });
    return inners;
  }

  /* -----------------------------------------------------------
     PRELOADER
     ----------------------------------------------------------- */
  function initPreloader(onDone) {
    const pre = document.getElementById("preloader");
    if (!pre) { onDone(); return; }

    // Graceful degradation: no motion, or GSAP failed to load from CDN.
    if (REDUCED || !hasGSAP) {
      pre.remove();
      onDone();
      return;
    }

    const countEl = document.getElementById("preloaderCount");
    const monogram = pre.querySelector(".preloader__monogram");
    const counter = pre.querySelector(".preloader__counter");
    const hint = pre.querySelector(".preloader__hint");
    let finished = false;

    const state = { val: 0 };

    const tl = gsap.timeline({ onComplete: reveal });
    gsap.set(monogram, { opacity: 0, y: 12 });
    tl.to(monogram, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0);
    tl.to(state, {
      val: 100,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate: () => { countEl.textContent = Math.round(state.val); },
    }, 0.1);

    function reveal() {
      if (finished) return;
      finished = true;
      const out = gsap.timeline({
        onComplete: () => { pre.remove(); onDone(); },
      });
      out.to([counter, hint], { y: 40, opacity: 0, duration: 0.5, ease: "power2.in" }, 0);
      out.to(monogram, { scale: 1.1, opacity: 0, duration: 0.6, ease: "power2.in" }, 0.05);
      out.to(pre, {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.9,
        ease: "power4.inOut",
      }, 0.2);
    }

    // Skippable on click.
    pre.addEventListener("click", () => {
      if (finished) return;
      tl.progress(1); // jumps state to 100 → triggers onComplete → reveal()
    });
  }

  /* -----------------------------------------------------------
     LENIS SMOOTH SCROLL + SCROLLTRIGGER BRIDGE
     ----------------------------------------------------------- */
  let lenis = null;
  function initLenis() {
    if (REDUCED || typeof window.Lenis === "undefined") return;

    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    lenis.on("scroll", () => { if (window.ScrollTrigger) ScrollTrigger.update(); });

    if (hasGSAP) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }

    // Anchor links → smooth scroll via Lenis.
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      });
    });
  }

  // Fallback smooth-anchors when Lenis disabled.
  function initAnchorFallback() {
    if (lenis) return;
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
      });
    });
  }

  /* -----------------------------------------------------------
     CUSTOM CURSOR
     ----------------------------------------------------------- */
  function initCursor() {
    const cursor = document.querySelector(".cursor");
    if (!cursor || IS_TOUCH || REDUCED) return;

    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");
    document.body.classList.add("cursor-active");
    cursor.style.display = "block";

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    // Ring trails with easing.
    function raf() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Hover states.
    const hoverTargets = document.querySelectorAll("a, button, [data-link], .row");
    hoverTargets.forEach((t) => {
      t.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      t.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });

    // "View →" state on project cards.
    document.querySelectorAll("[data-project]").forEach((p) => {
      p.addEventListener("mouseenter", () => cursor.classList.add("is-view"));
      p.addEventListener("mouseleave", () => cursor.classList.remove("is-view"));
    });

    window.addEventListener("mousedown", () => cursor.classList.add("is-down"));
    window.addEventListener("mouseup", () => cursor.classList.remove("is-down"));
    document.addEventListener("mouseleave", () => { cursor.style.opacity = "0"; });
    document.addEventListener("mouseenter", () => { cursor.style.opacity = "1"; });
  }

  /* -----------------------------------------------------------
     NAVBAR — hide on scroll down / reveal on scroll up
     ----------------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    let last = 0;
    const onScroll = (y) => {
      if (document.body.classList.contains("menu-open")) { nav.classList.remove("is-hidden"); return; }
      if (y > last && y > 200) nav.classList.add("is-hidden");
      else nav.classList.remove("is-hidden");
      last = y;
    };
    if (lenis) lenis.on("scroll", ({ scroll }) => onScroll(scroll));
    else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });
  }

  /* -----------------------------------------------------------
     FULLSCREEN MENU OVERLAY
     ----------------------------------------------------------- */
  let menuOpen = false;
  let menuTl = null;

  function closeMenu() {
    if (!menuOpen) return;
    toggleMenu(false);
  }

  function toggleMenu(force) {
    const menu = document.getElementById("menuOverlay");
    const btn = document.getElementById("menuBtn");
    if (!menu || !btn) return;
    const open = typeof force === "boolean" ? force : !menuOpen;
    if (open === menuOpen) return;
    menuOpen = open;

    btn.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("menu-open", open);

    const links = menu.querySelectorAll(".menu__link span");
    const asides = menu.querySelectorAll(".menu__block");

    if (REDUCED || !hasGSAP) {
      menu.classList.toggle("is-open", open);
      menu.style.clipPath = open ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)";
      if (lenis) open ? lenis.stop() : lenis.start();
      return;
    }

    if (menuTl) menuTl.kill();

    if (open) {
      menu.classList.add("is-open");
      if (lenis) lenis.stop();
      gsap.set(links, { yPercent: 120 });
      gsap.set(asides, { opacity: 0, y: 20 });
      menuTl = gsap.timeline();
      menuTl.to(menu, { clipPath: "inset(0 0 0% 0)", duration: 0.7, ease: "power4.inOut" });
      menuTl.to(links, { yPercent: 0, duration: 0.7, stagger: 0.06, ease: "power4.out" }, "-=0.35");
      menuTl.to(asides, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }, "-=0.5");
    } else {
      if (lenis) lenis.start();
      menuTl = gsap.timeline({ onComplete: () => menu.classList.remove("is-open") });
      menuTl.to(links, { yPercent: -120, duration: 0.4, stagger: 0.03, ease: "power3.in" });
      menuTl.to(asides, { opacity: 0, duration: 0.3 }, 0);
      menuTl.to(menu, { clipPath: "inset(0 0 100% 0)", duration: 0.6, ease: "power4.inOut" }, "-=0.2");
    }
  }

  function initMenu() {
    const btn = document.getElementById("menuBtn");
    if (btn) btn.addEventListener("click", () => toggleMenu());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  /* -----------------------------------------------------------
     HERO — intro reveal + aurora drift
     ----------------------------------------------------------- */
  function heroIntro() {
    if (REDUCED || !hasGSAP) return;
    const words = document.querySelectorAll(".hero__title .word");
    const eyebrow = document.querySelector(".hero__eyebrow");
    const sub = document.querySelector(".hero__sub");
    const cta = document.querySelector(".hero__cta");
    const foot = document.querySelector(".hero__foot");

    gsap.set(words, { yPercent: 110 });
    gsap.set([eyebrow, sub, cta, foot], { opacity: 0, y: 24 });

    const tl = gsap.timeline({ delay: 0.1 });
    tl.to(words, { yPercent: 0, duration: 1.1, stagger: 0.12, ease: "power4.out" });
    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.9");
    tl.to(sub, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.6");
    tl.to(cta, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.5");
    tl.to(foot, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.5");

    return tl;
  }

  function auroraDrift() {
    if (REDUCED || !hasGSAP) return;
    gsap.to(".blob--1", { x: "8vw", y: "6vh", duration: 14, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(".blob--2", { x: "-10vw", y: "-5vh", duration: 18, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(".blob--3", { x: "6vw", y: "-8vh", duration: 16, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // Parallax the aurora on scroll (yPercent — separate channel from pointer x/y).
    if (window.ScrollTrigger) {
      gsap.to(".hero__aurora", {
        yPercent: 30, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
    }

    // Pointer-reactive aurora + headline depth (desktop, non-touch only).
    if (!IS_TOUCH) {
      const hero = document.querySelector(".hero");
      if (!hero) return;
      const auroraX = gsap.quickTo(".hero__aurora", "x", { duration: 0.9, ease: "power3" });
      const auroraY = gsap.quickTo(".hero__aurora", "y", { duration: 0.9, ease: "power3" });
      const titleX = gsap.quickTo(".hero__title", "x", { duration: 1.1, ease: "power3" });
      const titleY = gsap.quickTo(".hero__title", "y", { duration: 1.1, ease: "power3" });

      hero.addEventListener("mousemove", (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;   // -0.5 … 0.5
        const ny = e.clientY / window.innerHeight - 0.5;
        auroraX(nx * 60);  auroraY(ny * 60);              // aurora leads
        titleX(nx * -18);  titleY(ny * -18);             // headline counter-drifts
      });
      hero.addEventListener("mouseleave", () => {
        auroraX(0); auroraY(0); titleX(0); titleY(0);
      });
    }
  }

  /* -----------------------------------------------------------
     LIVE CLOCK — Ahmedabad (IST, UTC+5:30)
     ----------------------------------------------------------- */
  function initClock() {
    const hero = document.getElementById("heroClock");
    const foot = document.getElementById("footerClock");
    if (!hero && !foot) return;

    function tick() {
      const now = new Date();
      // IST regardless of viewer timezone.
      const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (5.5 * 3600000));
      let h = ist.getHours();
      const m = String(ist.getMinutes()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      const hh = String(h).padStart(2, "0");
      if (hero) hero.textContent = `— ${hh}:${m} ${ampm}`;
      if (foot) foot.textContent = `AHMEDABAD — ${hh}:${m} ${ampm}`;
    }
    tick();
    setInterval(tick, 1000 * 15);
  }

  /* -----------------------------------------------------------
     MARQUEES — infinite loop, pause on hover, scroll-velocity aware
     ----------------------------------------------------------- */
  function initMarquees() {
    document.querySelectorAll("[data-marquee]").forEach((wrap) => {
      const track = wrap.querySelector(".marquee__track");
      if (!track) return;
      if (REDUCED || !hasGSAP) return;

      const speed = parseFloat(wrap.dataset.speed || "1");
      const half = track.scrollWidth / 2;
      const dur = (half / (60 * speed));

      const tween = gsap.to(track, {
        x: -half,
        duration: dur,
        ease: "none",
        repeat: -1,
        modifiers: { x: (x) => `${parseFloat(x) % half}px` },
      });

      wrap.addEventListener("mouseenter", () => gsap.to(tween, { timeScale: 0, duration: 0.4 }));
      wrap.addEventListener("mouseleave", () => gsap.to(tween, { timeScale: 1, duration: 0.4 }));
    });
  }

  /* -----------------------------------------------------------
     HEADING + LINE REVEALS (scroll-triggered)
     ----------------------------------------------------------- */
  function initReveals() {
    if (!hasGSAP || !window.ScrollTrigger) return;

    // Word-masked section headings.
    document.querySelectorAll("[data-heading]").forEach((h) => {
      const words = h.querySelectorAll(".word");
      if (REDUCED) { gsap.set(words, { yPercent: 0 }); return; }
      gsap.set(words, { yPercent: 110 });
      gsap.to(words, {
        yPercent: 0, duration: 1, stagger: 0.09, ease: "power4.out",
        scrollTrigger: { trigger: h, start: "top 82%" },
      });
    });

    // Line-by-line opacity reading effect.
    document.querySelectorAll("[data-lines]").forEach((p) => {
      const inners = splitLines(p);
      if (REDUCED) { gsap.set(inners, { opacity: 1 }); return; }
      gsap.set(inners, { opacity: 0.15 });
      inners.forEach((line) => {
        gsap.to(line, {
          opacity: 1, ease: "none",
          scrollTrigger: { trigger: line, start: "top 85%", end: "top 55%", scrub: true },
        });
      });
    });
  }

  /* -----------------------------------------------------------
     HORIZONTAL WORK SHOWCASE (pin + scrub) — desktop only
     ----------------------------------------------------------- */
  function initWorkShowcase() {
    if (IS_MOBILE || REDUCED || !hasGSAP || !window.ScrollTrigger) return;

    const viewport = document.getElementById("workViewport");
    const track = document.getElementById("workTrack");
    if (!viewport || !track) return;

    const getScrollAmount = () => track.scrollWidth - window.innerWidth;

    const tween = gsap.to(track, {
      x: () => -getScrollAmount(),
      ease: "none",
    });

    ScrollTrigger.create({
      trigger: viewport,
      start: "center center",
      end: () => `+=${getScrollAmount() + window.innerHeight * 0.4}`,
      pin: true,
      scrub: 1,
      animation: tween,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    });
  }

  /* -----------------------------------------------------------
     STAT COUNT-UP with leading zeros
     ----------------------------------------------------------- */
  function initCounters() {
    if (!hasGSAP || !window.ScrollTrigger) {
      // Static final values.
      document.querySelectorAll(".stat").forEach((el) => {
        el.textContent = formatStat(+el.dataset.count, +el.dataset.pad, el.dataset.suffix);
      });
      return;
    }
    document.querySelectorAll(".stat").forEach((el) => {
      const target = +el.dataset.count;
      const pad = +el.dataset.pad || 0;
      const suffix = el.dataset.suffix || "";
      const obj = { v: 0 };

      const set = () => { el.textContent = formatStat(Math.round(obj.v), pad, suffix); };
      set();

      if (REDUCED) { obj.v = target; set(); return; }

      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => gsap.to(obj, { v: target, duration: 1.6, ease: "power2.out", onUpdate: set }),
      });
    });
  }

  function formatStat(n, pad, suffix) {
    let s = String(n);
    if (pad > 0) s = s.padStart(pad, "0");
    return s + (suffix || "");
  }

  /* -----------------------------------------------------------
     PARALLAX — media moves slower than text
     ----------------------------------------------------------- */
  function initParallax() {
    if (REDUCED || !hasGSAP || !window.ScrollTrigger) return;
    document.querySelectorAll("[data-parallax]").forEach((el) => {
      gsap.fromTo(el, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: el.closest("[data-parallax-wrap]") || el, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  }

  /* -----------------------------------------------------------
     PROCESS LINE DRAW
     ----------------------------------------------------------- */
  function initProcessLine() {
    const path = document.getElementById("processPath");
    if (!path || !hasGSAP || !window.ScrollTrigger) return;

    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = REDUCED ? 0 : len;

    if (REDUCED) return;

    gsap.to(path, {
      strokeDashoffset: 0, ease: "none",
      scrollTrigger: { trigger: ".process__grid", start: "top 75%", end: "bottom 70%", scrub: true },
    });

    // Steps fade up.
    gsap.utils.toArray("[data-step]").forEach((step, i) => {
      gsap.from(step, {
        opacity: 0, y: 30, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: step, start: "top 85%" },
        delay: i * 0.05,
      });
    });
  }

  /* -----------------------------------------------------------
     SERVICES ROW DETAIL — wrap tags so the grid-rows expand works
     ----------------------------------------------------------- */
  function initServiceRows() {
    document.querySelectorAll(".row__detail").forEach((detail) => {
      // Wrap children into a single overflow container for smooth grid expand.
      const wrap = document.createElement("div");
      wrap.className = "row__detail-wrap";
      while (detail.firstChild) wrap.appendChild(detail.firstChild);
      detail.appendChild(wrap);
    });
  }

  /* -----------------------------------------------------------
     BUTTON SYSTEM — magnetic / liquid / trace / press / glint
     ----------------------------------------------------------- */
  function initButtons() {
    document.querySelectorAll(".btn").forEach((btn) => {
      // Liquid fill element.
      const fill = document.createElement("span");
      fill.className = "btn__fill";
      btn.appendChild(fill);

      // Border trace for secondary buttons.
      if (btn.dataset.trace !== undefined || btn.classList.contains("btn--secondary")) {
        buildTrace(btn);
      }

      const isPrimary = btn.classList.contains("btn--primary");
      const canMagnet = !IS_TOUCH && !REDUCED && hasGSAP;

      // --- Liquid fill on enter/leave ---
      btn.addEventListener("mouseenter", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        fillTo(fill, btn, x, y, true);
        btn.classList.add("is-filled");
      });
      btn.addEventListener("mouseleave", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        fillTo(fill, btn, x, y, false);
        btn.classList.remove("is-filled");
        if (canMagnet) {
          gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
          const label = btn.querySelectorAll(".btn__arrow, .btn > *:not(.btn__fill):not(.btn__trace)");
          gsap.to(label, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
        }
      });

      // --- Magnetic pull ---
      if (canMagnet) {
        const strength = 0.35;
        btn.addEventListener("mousemove", (e) => {
          const r = btn.getBoundingClientRect();
          const relX = e.clientX - r.left - r.width / 2;
          const relY = e.clientY - r.top - r.height / 2;
          gsap.to(btn, { x: relX * strength, y: relY * strength, duration: 0.5, ease: "power3.out" });
          // Text layer parallax (moves slightly more).
          const label = btn.querySelectorAll(".btn__arrow, .btn > *:not(.btn__fill):not(.btn__trace)");
          gsap.to(label, { x: relX * strength * 0.4, y: relY * strength * 0.4, duration: 0.5, ease: "power3.out" });
        });
      } else if (IS_TOUCH) {
        // Touch: center-origin fill.
        btn.addEventListener("touchstart", () => {
          fillTo(fill, btn, btn.offsetWidth / 2, btn.offsetHeight / 2, true);
          btn.classList.add("is-filled");
        }, { passive: true });
        btn.addEventListener("touchend", () => {
          fillTo(fill, btn, btn.offsetWidth / 2, btn.offsetHeight / 2, false);
          btn.classList.remove("is-filled");
        });
      }

      // --- Press feedback ---
      const down = () => { if (hasGSAP && !REDUCED) gsap.to(btn, { scale: 0.96, duration: 0.1 }); };
      const up = () => { if (hasGSAP && !REDUCED) gsap.to(btn, { scale: 1, duration: 0.5, ease: "back.out(2)" }); };
      btn.addEventListener("mousedown", down);
      btn.addEventListener("mouseup", up);
      btn.addEventListener("touchstart", down, { passive: true });
      btn.addEventListener("touchend", up);

      // --- Idle glint (primary CTA) ---
      if (isPrimary && btn.dataset.glint !== undefined && !REDUCED) {
        const glint = () => {
          btn.classList.add("glint");
          setTimeout(() => btn.classList.remove("glint"), 1200);
        };
        setInterval(glint, 6000);
        setTimeout(glint, 2500);
      }
    });
  }

  // Animate the liquid blob to fill (or empty) the pill.
  function fillTo(fill, btn, x, y, entering) {
    const w = btn.offsetWidth, h = btn.offsetHeight;
    const scale = (Math.max(w, h) / 10) * 2.4;
    if (!hasGSAP || REDUCED) {
      fill.style.left = x + "px"; fill.style.top = y + "px";
      fill.style.transition = "transform .4s";
      fill.style.transform = entering
        ? `translate(-50%,-50%) scale(${scale})`
        : "translate(-50%,-50%) scale(0)";
      return;
    }
    fill.style.left = x + "px";
    fill.style.top = y + "px";
    gsap.killTweensOf(fill);
    if (entering) {
      gsap.fromTo(fill, { scale: 0 }, { scale, duration: 0.55, ease: "power3.out" });
    } else {
      gsap.to(fill, { scale: 0, duration: 0.45, ease: "power3.in" });
    }
  }

  // Build an SVG rounded-rect stroke that traces on hover.
  function buildTrace(btn) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "btn__trace");
    svg.setAttribute("preserveAspectRatio", "none");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    svg.appendChild(rect);
    btn.appendChild(svg);

    const sync = () => {
      const w = btn.offsetWidth, h = btn.offsetHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      rect.setAttribute("x", "0.75"); rect.setAttribute("y", "0.75");
      rect.setAttribute("width", String(w - 1.5));
      rect.setAttribute("height", String(h - 1.5));
      rect.setAttribute("rx", String(h / 2));
      rect.setAttribute("ry", String(h / 2));
      const len = 2 * (w - 1.5) + 2 * (h - 1.5);
      rect.style.strokeDasharray = len;
      rect.style.strokeDashoffset = len;
      rect._len = len;
    };
    sync();
    window.addEventListener("resize", sync);

    if (REDUCED || !hasGSAP) return;
    btn.addEventListener("mouseenter", () => {
      gsap.to(rect, { strokeDashoffset: 0, duration: 0.7, ease: "power2.out" });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(rect, { strokeDashoffset: rect._len, duration: 0.5, ease: "power2.in" });
    });
  }

  /* -----------------------------------------------------------
     BOOT
     ----------------------------------------------------------- */
  function boot() {
    // Hide hero words immediately (behind the opaque preloader) so the curtain
    // wipe never reveals them un-masked before heroIntro animates them in.
    if (hasGSAP && !REDUCED) gsap.set(".hero__title .word", { yPercent: 110 });

    initServiceRows();
    initLenis();
    initAnchorFallback();
    initNav();
    initMenu();
    initCursor();
    initClock();
    initButtons();

    // Post-preloader: intros + scroll systems.
    const start = () => {
      auroraDrift();
      heroIntro();
      initMarquees();
      initReveals();
      initWorkShowcase();
      initCounters();
      initParallax();
      initProcessLine();

      if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
        // Recalc after fonts load (metrics shift heading masks / pins).
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => ScrollTrigger.refresh());
        }
      }
    };

    initPreloader(start);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
