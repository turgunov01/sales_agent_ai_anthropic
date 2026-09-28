"""Builds index.html — the MYLEX demo as ONE continuous shot (a persistent iPhone whose screens change).

The phone never leaves frame until the brand card, so the piece is authored as a single composition with
labelled scene sections on one timeline instead of hard-cut sub-compositions (a cut would break the take).
"""
from ui import (ROOT, CSS, fontface, chrome, scr_splash, scr_home, scr_search, scr_catalog, scr_profile,
                scr_confirm, brand_card, LAWYERS)

DUR = 20.0
HEADLINES = [
    'Нужен <em>юрист</em>?',
    'Все юристы — <em>в одном</em> приложении',
    'Найдите <em>своего</em> специалиста',
    'Фильтры — по делу <em>и региону</em>',
    'Запишитесь <em>в пару касаний</em>',
    'Готово. Юрист <em>уже в курсе</em>',
]


def view(html, vid):
    return html.replace('<div class="view"', f'<div class="view" id="{vid}" data-layout-allow-overflow', 1)


UNDER_SCRIM = {  # parts of a view that a bottom sheet dims (modal backdrop, not copy to read then)
    "v-catalog": ['<div class="backrow">', '<div class="pills">', '<div class="count">', '<div class="pcards">'],
    "v-profile": ['<div class="appbar"', '<div class="prof">', '<div class="bio">', '<div class="schips">',
                  '<div class="btn" style="position:absolute;left:44px;right:44px;top:914px;">'],
}


def dim_exempt(html, vid):
    for tag in UNDER_SCRIM[vid]:
        html = html.replace(tag, tag.replace("<div", "<div data-layout-ignore", 1), 1)
    return html.replace('<div class="sheet">', '<div class="sheet" data-layout-allow-overlap data-layout-allow-overflow>')


def screens():
    splash = view(scr_splash(), "v-splash").replace(
        '<div class="logo" style="font-size:150px;">MYLEX</div>',
        '<div class="logo split" id="splash-logo" style="font-size:150px;">MYLEX</div>').replace(
        '<div style="font-size:28px;', '<div id="splash-sub" style="font-size:28px;')
    home = view(scr_home(), "v-home")
    search = view(scr_search(typed='<span class="typed">семейный юрист</span>', tap=False), "v-search")
    search = search.replace('class="chip on"', 'class="chip"')
    catalog = dim_exempt(view(scr_catalog(sheet=True), "v-catalog"), "v-catalog")
    catalog = catalog.replace('class="radio on"', 'class="radio"').replace(
        '<div class="pill">Регион</div>', '<div class="pill" id="pill-region"><span id="region-a">Регион</span>'
        '<span id="region-b" style="display:none">Регион: Ташкент</span></div>')
    profile = dim_exempt(view(scr_profile(sheet=True), "v-profile"), "v-profile").replace('class="slot on"', 'class="slot"')
    confirm = view(scr_confirm(), "v-confirm")
    fly = f'<div class="avatar" id="fly-avatar">{LAWYERS[0][0]}</div>'
    taps = "".join(f'<div class="tap" id="tap{i}"></div>' for i in range(1, 9))
    return splash + home + search + catalog + profile + confirm + fly + taps


EXTRA_CSS = """
#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:#F4F1F8;font-family:'MxSans',system-ui,sans-serif;color:#2E2A38;}
.layer{position:absolute;inset:0;width:1080px;height:1920px;}
.hl{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;}
.steps span{position:absolute;right:0;top:0;opacity:0;white-space:nowrap;}
.kicker-r.steps{width:120px;height:30px;}
.rig{position:absolute;inset:0;}
.cam{position:absolute;inset:0;transform-origin:540px 1090px;}
.split .ch{display:inline-block;}
.typed .ch{display:none;}
.search .caret{animation:none;}
#fly-avatar{position:absolute;left:283px;top:210px;width:210px;height:210px;font-size:76px;z-index:14;opacity:0;
  border-radius:105px;}
.tap{opacity:0;left:0;top:0;}
#v-home,#v-search,#v-catalog,#v-profile,#v-confirm{opacity:0;}
.okcircle svg path{stroke-dasharray:30;stroke-dashoffset:30;}
.brandwrap{position:absolute;inset:0;}
.brand .logo .ch{display:inline-block;}
"""

JS = r"""
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  function split(el) {
    const text = el.textContent; el.textContent = "";
    return Array.from(text).map((c) => {
      const s = document.createElement("span"); s.className = "ch";
      s.textContent = c === " " ? " " : c; el.appendChild(s); return s;
    });
  }
  // center of an element in .screen coordinates (layout offsets; unaffected by transforms)
  function screenCenter(el) {
    let x = 0, y = 0, n = el; const scr = $(".screen");
    while (n && n !== scr) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
  }
  function tap(tl, id, target, t) {
    const el = typeof target === "string" ? $(target) : target;
    const c = screenCenter(el), ring = $("#tap" + id);
    tl.set(ring, { left: c.x, top: c.y }, 0);
    tl.fromTo(ring, { scale: 0.45, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.12, ease: "power2.out" }, t);
    tl.to(ring, { scale: 1.45, opacity: 0, duration: 0.36, ease: "power2.out" }, t + 0.14);
    tl.to(el, { scale: 0.95, duration: 0.09, ease: "power2.in" }, t);
    tl.to(el, { scale: 1, duration: 0.3, ease: "back.out(3)" }, t + 0.09);
  }

  document.fonts.ready.then(function () {
    const tl = gsap.timeline({ paused: true });

    // ---------- ambient background (finite loops) ----------
    tl.fromTo(".glow.a", { x: 0, y: 0, scale: 1 }, { x: 60, y: 40, scale: 1.08, duration: 5, ease: "sine.inOut", yoyo: true, repeat: 3 }, 0);
    tl.fromTo(".glow.b", { x: 0, y: 0, scale: 1.05 }, { x: -70, y: -50, scale: 0.97, duration: 5, ease: "sine.inOut", yoyo: true, repeat: 3 }, 0);
    tl.fromTo(".ghost-glyph", { y: 40, rotation: -2 }, { y: -60, rotation: 2, duration: 20, ease: "none" }, 0);
    tl.fromTo(".rule", { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.out", transformOrigin: "0% 50%" }, 0.05);
    tl.fromTo(".kicker", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.25);

    // headline swaps (out-up / in-up) + step counter
    const hls = $$(".hl"), steps = $$(".steps span");
    const hlT = [0.3, 2.3, 5.7, 8.5, 11.5, 14.7];
    hls.forEach((h, i) => {
      tl.fromTo(h, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, hlT[i]);
      const out = i < hls.length - 1 ? hlT[i + 1] - 0.22 : 16.9;
      tl.to(h, { opacity: 0, y: -30, duration: 0.25, ease: "power2.in" }, out);
    });
    const stT = [0.25, 2.2, 5.6, 8.4, 11.4, 14.6, 17.0];
    steps.forEach((s, i) => { tl.set(s, { opacity: 1 }, stT[i]); if (i < steps.length - 1) tl.set(s, { opacity: 0 }, stT[i + 1]); });

    // ---------- 01 splash 0–2.2 ----------
    tl.fromTo(".rig", { y: 1650 }, { y: 0, duration: 0.95, ease: "power3.out" }, 0.05);
    const logoCh = split($("#splash-logo"));
    tl.fromTo(logoCh, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(2)", stagger: 0.06 }, 0.55);
    tl.fromTo("#splash-sub", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4 }, 1.05);
    tl.to("#splash-sub", { opacity: 0, duration: 0.2 }, 1.65);
    // logo shrinks into the app header (bridge into 02)
    const from = screenCenter($("#splash-logo")), to = screenCenter($("#v-home .appbar .logo"));
    tl.to("#splash-logo", { x: to.x - from.x, y: to.y - from.y, scale: 52 / 150, duration: 0.55, ease: "power3.inOut" }, 1.65);
    tl.set("#v-home", { opacity: 1 }, 2.2);
    tl.set("#v-splash", { opacity: 0 }, 2.2);

    // ---------- 02 home 2.2–5.6 ----------
    tl.fromTo("#v-home .appbar .iconbtn", { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(2.5)" }, 2.2);
    tl.fromTo("#v-home .search", { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, 2.22);
    tl.fromTo("#v-home .tabbar", { y: 170 }, { y: 0, duration: 0.5, ease: "power3.out" }, 2.25);
    tl.fromTo("#v-home .stats", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 2.35);
    const statEls = $$("#v-home .stat b");
    [[1200, "+", 0], [40, "+", 0], [4.9, "", 1]].forEach(([end, suf, dec], i) => {
      const o = { v: 0 }, el = statEls[i];
      tl.fromTo(o, { v: 0 }, { v: end, duration: 1.0, ease: "power2.out",
        onUpdate: () => { el.textContent = (dec ? o.v.toFixed(1) : Math.round(o.v)) + suf; } }, 2.35);
    });
    tl.fromTo("#v-home .sec", { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.5 }, 2.75);
    tl.fromTo("#v-home .cat", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.8)", stagger: 0.07 }, 2.85);
    tl.fromTo("#v-home .lcard", { x: 420, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.1 }, 3.35);
    tap(tl, 1, "#v-home .search", 5.3);

    // ---------- 03 search 5.6–8.4 ----------
    tl.set("#v-search", { opacity: 1 }, 5.6);
    tl.set("#v-home", { opacity: 0 }, 5.6);
    tl.fromTo("#v-search .kbd", { y: 640 }, { y: 0, duration: 0.42, ease: "power3.out" }, 5.65);
    const typed = split($("#v-search .typed"));
    typed.forEach((c, i) => tl.set(c, { display: "inline" }, 6.1 + i * 0.07));
    tl.fromTo(["#v-search .sublabel", "#v-search .chip", "#v-search .row"], { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.06 }, 6.75);
    const chip = $("#v-search .chip");
    tap(tl, 2, chip, 7.55);
    tl.set(chip, { attr: { class: "chip on" } }, 7.62);
    tl.to("#v-search .kbd", { y: 640, duration: 0.3, ease: "power2.in" }, 8.05);

    // ---------- 04 catalog 8.4–11.4 (iOS push, right → left) ----------
    tl.fromTo("#v-catalog", { x: 776, opacity: 1 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.inOut" }, 8.3);
    tl.to("#v-search", { x: -230, opacity: 0.35, duration: 0.5, ease: "power3.inOut" }, 8.3);
    tl.set("#v-search", { opacity: 0 }, 8.8);
    tl.fromTo("#v-catalog .pill", { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, stagger: 0.06, ease: "power2.out" }, 8.7);
    tl.fromTo("#v-catalog .count", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 8.9);
    tl.fromTo("#v-catalog .pcard", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.09, ease: "power3.out" }, 8.9);
    tl.set(["#v-catalog .scrim"], { opacity: 0 }, 0);
    tl.set(["#v-catalog .sheet"], { yPercent: 100 }, 0);
    tap(tl, 3, "#pill-region", 9.65);
    tl.to("#v-catalog .scrim", { opacity: 1, duration: 0.3 }, 9.8);
    tl.to("#v-catalog .sheet", { yPercent: 0, duration: 0.42, ease: "power3.out" }, 9.8);
    const radio = $("#v-catalog .radio");
    tap(tl, 4, radio, 10.3);
    tl.set(radio, { attr: { class: "radio on" } }, 10.36);
    tap(tl, 5, "#v-catalog .sheet .btn", 10.7);
    tl.to("#v-catalog .sheet", { yPercent: 100, duration: 0.35, ease: "power2.in" }, 10.9);
    tl.to("#v-catalog .scrim", { opacity: 0, duration: 0.3 }, 10.95);
    tl.set("#region-a", { display: "none" }, 11.05);
    tl.set("#region-b", { display: "inline" }, 11.05);
    tl.set("#pill-region", { attr: { class: "pill on" } }, 11.05);

    // ---------- 05 profile 11.4–14.6 (shared avatar) ----------
    const card = $("#v-catalog .pcard"), cardAv = card.querySelector(".avatar");
    tap(tl, 6, card, 11.25);
    const a0 = screenCenter(cardAv), a1 = screenCenter($("#fly-avatar"));
    tl.set("#v-profile .prof .avatar", { opacity: 0 }, 0);
    tl.set("#fly-avatar", { opacity: 1 }, 11.45);
    tl.fromTo("#fly-avatar", { x: a0.x - a1.x, y: a0.y - a1.y, scale: 150 / 210, borderRadius: 42 },
      { x: 0, y: 0, scale: 1, borderRadius: 105, duration: 0.55, ease: "power3.inOut" }, 11.45);
    tl.set(cardAv, { opacity: 0 }, 11.45);
    tl.to("#v-catalog", { x: -230, opacity: 0, duration: 0.5, ease: "power3.inOut" }, 11.45);
    tl.fromTo("#v-profile", { opacity: 0 }, { opacity: 1, duration: 0.35 }, 11.5);
    tl.set("#v-profile .prof .avatar", { opacity: 1 }, 12.0);
    tl.set("#fly-avatar", { opacity: 0 }, 12.0);
    tl.fromTo(["#v-profile .prof h2", "#v-profile .prof .spec", "#v-profile .prof .rating"], { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, ease: "power2.out" }, 11.8);
    tl.fromTo("#v-profile .bio", { opacity: 0 }, { opacity: 1, duration: 0.35 }, 12.05);
    tl.fromTo("#v-profile .schip", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.07, ease: "back.out(2)" }, 12.15);
    tl.fromTo("#v-profile > .btn", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, 12.3);
    tl.set("#v-profile .scrim", { opacity: 0 }, 0);
    tl.set("#v-profile .sheet", { yPercent: 100 }, 0);
    tap(tl, 7, "#v-profile > .btn", 12.8);
    tl.to("#v-profile .scrim", { opacity: 1, duration: 0.3 }, 12.95);
    tl.to("#v-profile .sheet", { yPercent: 0, duration: 0.45, ease: "power3.out" }, 12.95);
    tl.fromTo("#v-profile .day", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 }, 13.2);
    tl.fromTo("#v-profile .slot", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 }, 13.35);
    const slot = $$("#v-profile .slot")[2];
    tap(tl, 8, slot, 13.85);
    tl.set(slot, { attr: { class: "slot on" } }, 13.91);
    // "Подтвердить" press (reuse ring 1, long finished by now)
    const confirmBtn = $("#v-profile .sheet .btn");
    const cb = screenCenter(confirmBtn);
    tl.set("#tap1", { left: cb.x, top: cb.y }, 14.3);
    tl.fromTo("#tap1", { scale: 0.45, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.12 }, 14.35);
    tl.to("#tap1", { scale: 1.45, opacity: 0, duration: 0.36 }, 14.49);
    tl.to(confirmBtn, { scale: 0.95, duration: 0.09 }, 14.35);
    tl.to(confirmBtn, { scale: 1, duration: 0.3, ease: "back.out(3)" }, 14.44);

    // ---------- 06 confirm 14.6–17.0 ----------
    tl.fromTo("#v-confirm", { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }, 14.6);
    tl.set("#v-profile", { opacity: 0 }, 14.95);
    tl.fromTo("#v-confirm .okcircle", { scale: 0 }, { scale: 1, duration: 0.55, ease: "back.out(2.2)" }, 14.75);
    tl.to("#v-confirm .okcircle svg path", { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, 15.05);
    tl.fromTo(["#v-confirm .okwrap h2", "#v-confirm .okwrap p"], { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power3.out" }, 15.3);
    tl.fromTo("#v-confirm .okcard", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 15.6);
    tl.fromTo("#v-confirm > .btn", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 15.75);
    tl.fromTo("#v-confirm .chatfab", { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(2.5)" }, 15.4);
    tl.to("#v-confirm .chatfab", { scale: 1.14, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: 3 }, 15.9);
    tl.fromTo(".cam", { scale: 1 }, { scale: 1.03, duration: 0.7, ease: "power2.out" }, 15.0);

    // ---------- 07 brand 17.0–20.0 ----------
    tl.to(".rig", { y: 1750, duration: 0.55, ease: "power2.in" }, 16.85);
    const bl = split($(".brand .logo"));
    tl.fromTo(bl, { y: 90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(2)", stagger: 0.07 }, 17.3);
    tl.fromTo(".brand .bar", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, 17.85);
    tl.fromTo(".brand .tagline", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 18.05);
    tl.fromTo(".brand .url", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 18.3);
    tl.fromTo(".powered", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, 18.55);

    window.__timelines["main"] = tl;
    if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();
  });
})();
"""


def build():
    hl = "".join(f'<div class="hl"><span class="hl-text">{h}</span></div>' for h in HEADLINES)
    steps = "".join(f"<span>0{i} / 07</span>" for i in range(1, 8))
    phone = ('<div class="phone" id="phone"><i class="side act"></i><i class="side vu"></i><i class="side vd"></i>'
             f'<i class="side pw"></i><div class="bezel"><div class="screen">{screens()}{chrome()}</div></div></div>')
    doc = f"""<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      *{{margin:0;padding:0;box-sizing:border-box;}}
      html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;background:#F4F1F8;}}
      {fontface()}
      {CSS}
      {EXTRA_CSS}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{DUR}" data-width="1080" data-height="1920">
      <div class="clip layer stage" id="c-bg" data-start="0" data-duration="{DUR}" data-track-index="0">
        <div class="glow a" data-layout-ignore></div><div class="glow b" data-layout-ignore></div><div class="ghost-glyph" data-layout-ignore>§</div>
        <div class="rule"></div><div class="kicker">MYLEX · демо</div><div class="kicker-r steps">{steps}</div>
      </div>
      <div class="clip layer" id="c-headline" data-start="0" data-duration="17.4" data-track-index="1">
        <div class="headline" id="headline">{hl}</div>
      </div>
      <div class="clip layer" id="c-phone" data-start="0" data-duration="17.5" data-track-index="2">
        <div class="rig"><div class="cam">{phone}</div></div>
      </div>
      <div class="clip layer" id="c-brand" data-start="17.0" data-duration="3.0" data-track-index="3">
        <div class="brandwrap">{brand_card()}</div>
      </div>
    </div>
    <script>{JS}</script>
  </body>
</html>
"""
    (ROOT / "index.html").write_text(doc)


if __name__ == "__main__":
    build()
