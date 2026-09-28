"""Generates compositions/02..07 for the 24reply "Вакансия" promo. Run: python3 tools/build_scenes.py"""
from scene_lib import write_scene

PAPER = "#f5f2ed"
SHEET = "#fffefb"
INK = "#1f3a5f"
TEAL = "#0f5c56"
TEAL_DARK = "#153e3c"
MINT = "#9ed3a8"
MUTED = "#7a858c"
LINE = "#e2e0d8"

# ---------------------------------------------------------------- 02 pain
write_scene(
    "02-pain.html",
    "s2-pain",
    f"""
        #root {{ position: absolute; inset: 0; background: {TEAL_DARK}; overflow: hidden; color: {SHEET}; }}
        .s2-beat {{ position: absolute; left: 90px; right: 90px; top: 0; bottom: 0; display: flex;
          flex-direction: column; justify-content: center; opacity: 0; }}
        .s2-when {{ font-family: "Plex24", monospace; font-weight: 700; font-size: 190px; line-height: 1;
          color: {MINT}; letter-spacing: -0.02em; }}
        .s2-when.s2-word {{ font-size: 150px; }}
        .s2-what {{ font-family: "Mont24", sans-serif; font-weight: 900; font-size: 84px; line-height: 1.05;
          margin-top: 40px; }}
        #s2-final {{ align-items: flex-start; }}
        #s2-bubble {{ background: {SHEET}; color: {INK}; font-family: "Inter24", sans-serif; font-size: 44px;
          line-height: 1.3; padding: 34px 40px; border-radius: 34px 34px 34px 8px; max-width: 760px; }}
        #s2-status {{ font-family: "Plex24", monospace; font-size: 34px; color: {MINT}; margin-top: 22px; }}
        #s2-nobody {{ font-family: "Mont24", sans-serif; font-weight: 900; font-size: 116px; line-height: 1.02;
          margin-top: 90px; }}
        #s2-nobody span.s2-hl {{ color: {MINT}; }}
""",
    """
        <div class="s2-beat" id="s2-b1"><div class="s2-when">23:40</div><div class="s2-what">Клиент написал.</div></div>
        <div class="s2-beat" id="s2-b2"><div class="s2-when s2-word">Суббота</div><div class="s2-what">Клиент написал.</div></div>
        <div class="s2-beat" id="s2-b3"><div class="s2-when s2-word">Обед</div><div class="s2-what">Клиент написал.</div></div>
        <div class="s2-beat" id="s2-final">
          <div id="s2-bubble">Здравствуйте! Вы сейчас работаете?</div>
          <div id="s2-status">не прочитано · 2 ч назад</div>
          <div id="s2-nobody">Никто <span class="s2-hl">не ответил.</span></div>
        </div>
""",
    """
          const tl = gsap.timeline({ paused: true });
          const beats = [["#s2-b1", 0], ["#s2-b2", 1.05], ["#s2-b3", 2.1], ["#s2-final", 3.15]];
          beats.forEach(([sel, t], i) => {
            tl.set(sel, { opacity: 1 }, t);
            if (i < beats.length - 1) tl.set(sel, { opacity: 0 }, beats[i + 1][1]);
          });
          ["#s2-b1", "#s2-b2", "#s2-b3"].forEach((sel, i) => {
            const t = beats[i][1];
            tl.fromTo(sel + " .s2-when", { scale: 1.12, transformOrigin: "left center" }, { scale: 1, duration: 0.35, ease: "power3.out" }, t);
            tl.fromTo(sel + " .s2-what", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, t + 0.15);
          });
          tl.fromTo("#s2-bubble", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(1.6)" }, 3.15);
          tl.fromTo("#s2-status", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 3.45);
          tl.fromTo("#s2-nobody", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, 3.75);
""",
)

# ---------------------------------------------------------------- 03 resume
RESUME_CSS = f"""
        #root {{ position: absolute; inset: 0; background: {PAPER}; overflow: hidden; color: {INK};
          font-family: "Plex24", monospace; }}
        .rs-sheet {{ position: absolute; left: 70px; right: 70px; top: 230px; bottom: 380px; background: {SHEET};
          border: 2px solid {LINE}; border-radius: 18px; box-shadow: 0 30px 70px rgba(31, 58, 95, 0.12);
          padding: 80px 70px; box-sizing: border-box; display: flex; flex-direction: column; }}
        .rs-top {{ display: flex; align-items: center; gap: 40px; }}
        .rs-ava {{ width: 170px; height: 170px; flex: 0 0 170px; border-radius: 40px; background: {TEAL};
          color: #fff; font-family: "Inter24", sans-serif; font-weight: 700; font-size: 88px; display: flex;
          align-items: center; justify-content: center; }}
        .rs-tag {{ font-size: 32px; font-weight: 700; letter-spacing: 0.18em; color: {TEAL}; }}
        .rs-name {{ font-family: "Mont24", sans-serif; font-weight: 900; font-size: 78px; line-height: 1.05; margin-top: 10px; }}
        .rs-pos {{ font-size: 34px; color: {MUTED}; margin-top: 44px; line-height: 1.3; }}
        .rs-rule {{ display: block; width: 100%; height: 4px; background: {INK}; margin: 40px 0 20px; transform-origin: left center; }}
        .rs-row {{ display: flex; justify-content: space-between; align-items: baseline; gap: 24px; padding: 26px 0;
          border-bottom: 3px dotted {LINE}; font-size: 40px; }}
        .rs-k {{ color: {MUTED}; flex: 0 0 auto; }}
        .rs-v {{ font-weight: 700; text-align: right; }}
"""

write_scene(
    "03-resume.html",
    "s3-resume",
    RESUME_CSS
    + f"""
        #s3-quote {{ margin-top: auto; background: {TEAL}; color: #fff; border-radius: 22px; padding: 36px 40px;
          font-family: "Mont24", sans-serif; font-weight: 800; font-size: 50px; line-height: 1.15; }}
        #s3-quote span {{ color: {MINT}; }}
""",
    """
        <div class="rs-sheet" id="s3-sheet">
          <div class="rs-top">
            <div class="rs-ava" id="s3-ava">24</div>
            <div>
              <div class="rs-tag" id="s3-tag">РЕЗЮМЕ</div>
              <div class="rs-name" id="s3-name">24reply AI</div>
            </div>
          </div>
          <div class="rs-pos" id="s3-pos">Кандидат на должность: менеджер по продажам</div>
          <span class="rs-rule" id="s3-rule"></span>
          <div class="rs-row" id="s3-r1"><span class="rs-k">График</span><span class="rs-v" id="s3-v1">24/7</span></div>
          <div class="rs-row" id="s3-r2"><span class="rs-k">Ответ</span><span class="rs-v" id="s3-v2">за секунды</span></div>
          <div class="rs-row" id="s3-r3"><span class="rs-k">Знает</span><span class="rs-v" id="s3-v3">ваш каталог и цены</span></div>
          <div class="rs-row" id="s3-r4"><span class="rs-k">Запись</span><span class="rs-v" id="s3-v4">сам бронирует время</span></div>
          <div class="rs-row" id="s3-r5"><span class="rs-k">Выходные</span><span class="rs-v" id="s3-v5">не нужны</span></div>
          <div id="s3-quote">Не чат-бот. <span>Менеджер по продажам.</span></div>
        </div>
""",
    f"""
          const tl = gsap.timeline({{ paused: true }});
          tl.fromTo("#s3-sheet", {{ opacity: 0, y: 50 }}, {{ opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }}, 0);
          tl.fromTo("#s3-ava", {{ scale: 0.4, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.8)" }}, 0.25);
          tl.fromTo("#s3-tag", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.2 }}, 0.35);
          let t = typeSel(tl, "#s3-name", 0.5, 16, "{INK}", false);
          tl.fromTo("#s3-pos", {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, t + 0.1);
          tl.fromTo("#s3-rule", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.45, ease: "power2.inOut" }}, t + 0.25);
          let rt = 1.75;
          for (let i = 1; i <= 5; i++) {{
            tl.fromTo("#s3-r" + i + " .rs-k", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.2 }}, rt);
            const end = typeSel(tl, "#s3-v" + i, rt + 0.15, 22, "{TEAL}", i === 5);
            rt = Math.max(end + 0.25, rt + 0.95);
          }}
          tl.fromTo("#s3-quote", {{ opacity: 0, y: 40, scale: 0.96 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.5)" }}, rt + 0.2);
""",
)

# ---------------------------------------------------------------- 04 internship (chat)
write_scene(
    "04-internship.html",
    "s4-intern",
    f"""
        #root {{ position: absolute; inset: 0; background: {PAPER}; overflow: hidden; color: {INK}; }}
        #s4-label {{ position: absolute; left: 0; right: 0; top: 200px; text-align: center; font-family: "Plex24", monospace;
          font-weight: 700; font-size: 40px; letter-spacing: 0.14em; color: {TEAL}; }}
        #s4-phone {{ position: absolute; left: 110px; right: 110px; top: 290px; height: 1240px; background: #1d2730;
          border-radius: 86px; padding: 20px; box-sizing: border-box; box-shadow: 0 40px 90px rgba(21, 62, 60, 0.28); }}
        #s4-screen {{ position: relative; width: 100%; height: 100%; background: #eef3ee; border-radius: 68px; overflow: hidden;
          font-family: "Inter24", sans-serif; }}
        #s4-head {{ position: absolute; left: 0; right: 0; top: 0; height: 170px; background: {SHEET}; border-bottom: 2px solid {LINE};
          display: flex; align-items: center; gap: 24px; padding: 40px 44px 0; box-sizing: border-box; z-index: 2; }}
        #s4-ava {{ width: 88px; height: 88px; border-radius: 24px; background: {TEAL}; color: #fff; font-weight: 700; font-size: 44px;
          display: flex; align-items: center; justify-content: center; }}
        #s4-title {{ font-weight: 700; font-size: 38px; }}
        #s4-sub {{ font-size: 26px; color: {TEAL}; margin-top: 4px; }}
        #s4-sub::before {{ content: ""; display: inline-block; width: 14px; height: 14px; border-radius: 7px; background: #3fb36b;
          margin-right: 10px; vertical-align: middle; }}
        #s4-view {{ position: absolute; left: 0; right: 0; top: 170px; bottom: 0; overflow: hidden; }}
        #s4-list {{ position: absolute; left: 0; right: 0; top: 0; padding: 36px 34px 60px; box-sizing: border-box;
          display: flex; flex-direction: column; gap: 22px; }}
        .s4-msg {{ max-width: 82%; font-size: 33px; line-height: 1.32; padding: 22px 28px; border-radius: 30px; opacity: 0; }}
        .s4-c {{ align-self: flex-end; background: {INK}; color: #fff; border-bottom-right-radius: 8px; }}
        .s4-a {{ align-self: flex-start; background: #fff; color: {INK}; border: 2px solid {LINE}; border-bottom-left-radius: 8px; }}
        .s4-btns {{ display: flex; gap: 14px; flex-wrap: wrap; opacity: 0; }}
        .s4-btn {{ font-size: 30px; font-weight: 600; padding: 16px 26px; border-radius: 40px; background: #fff; color: {INK};
          border: 2px solid {LINE}; }}
        .s4-dots {{ align-self: flex-start; display: flex; gap: 10px; padding: 26px 30px; background: #fff; border: 2px solid {LINE};
          border-radius: 30px; opacity: 0; }}
        .s4-dots i {{ display: block; width: 14px; height: 14px; border-radius: 7px; background: {MUTED}; }}
        #s4-done {{ align-self: stretch; background: {TEAL}; color: #fff; border-radius: 30px; padding: 30px 32px; opacity: 0;
          display: flex; gap: 26px; align-items: center; }}
        #s4-check {{ width: 76px; height: 76px; flex: 0 0 76px; border-radius: 38px; background: {MINT}; display: flex;
          align-items: center; justify-content: center; }}
        #s4-done-t {{ font-size: 36px; font-weight: 700; }}
        #s4-done-s {{ font-size: 28px; color: #d5ece0; margin-top: 6px; }}
""",
    f"""
        <div id="s4-label">СТАЖИРОВКА · 23:40</div>
        <div id="s4-phone">
          <div id="s4-screen">
            <div id="s4-head">
              <div id="s4-ava">24</div>
              <div><div id="s4-title">24reply</div><div id="s4-sub">AI-менеджер на связи</div></div>
            </div>
            <div id="s4-view" data-layout-allow-overflow data-layout-allow-occlusion>
              <div id="s4-list">
                <div class="s4-msg s4-c" id="s4-m1">Здравствуйте! Сколько стоит консультация? Можно на завтра?</div>
                <div class="s4-dots" id="s4-d1"><i></i><i></i><i></i></div>
                <div class="s4-msg s4-a" id="s4-m2">Консультация — 150 000 сум, 60 минут. Какой формат удобнее?</div>
                <div class="s4-btns" id="s4-b1"><span class="s4-btn" id="s4-b1a">В офисе</span><span class="s4-btn">Онлайн</span></div>
                <div class="s4-dots" id="s4-d2"><i></i><i></i><i></i></div>
                <div class="s4-msg s4-a" id="s4-m3">Завтра свободно:</div>
                <div class="s4-btns" id="s4-b2"><span class="s4-btn">11:00</span><span class="s4-btn">14:30</span><span class="s4-btn" id="s4-b2c">18:00</span></div>
                <div class="s4-dots" id="s4-d3"><i></i><i></i><i></i></div>
                <div class="s4-msg s4-a" id="s4-m4">Отлично! Как вас зовут и ваш номер телефона?</div>
                <div class="s4-msg s4-c" id="s4-m5">Sardor, +998 90 123-45-67</div>
                <div class="s4-dots" id="s4-d4"><i></i><i></i><i></i></div>
                <div id="s4-done">
                  <div id="s4-check"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="{TEAL_DARK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg></div>
                  <div><div id="s4-done-t">Заявка оформлена</div><div id="s4-done-s">Завтра · 18:00 · Консультация</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
""",
    f"""
            const tl = gsap.timeline({{ paused: true }});
            tl.fromTo("#s4-label", {{ opacity: 0, y: -20 }}, {{ opacity: 1, y: 0, duration: 0.35 }}, 0.1);
            tl.fromTo("#s4-phone", {{ y: 160, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }}, 0);
            const view = document.querySelector("#s4-view");
            const list = document.querySelector("#s4-list");
            const viewH = view.clientHeight;
            // Dots occupy layout only while visible; collapse them after they hide so the thread stays tight.
            const dots = {{ "#s4-d1": [1.7, 2.5], "#s4-d2": [4.5, 5.1], "#s4-d3": [6.9, 7.4], "#s4-d4": [9.0, 9.6] }};
            Object.entries(dots).forEach(([sel, [a, b]]) => {{
              tl.set(sel, {{ opacity: 1 }}, a);
              tl.fromTo(sel + " i", {{ opacity: 0.3 }}, {{ opacity: 1, duration: 0.2, stagger: 0.1, repeat: 1, yoyo: true }}, a);
              tl.set(sel, {{ opacity: 0, display: "none" }}, b);
            }});
            const shows = [
              ["#s4-m1", 0.9], ["#s4-m2", 2.5], ["#s4-b1", 3.2], ["#s4-m3", 5.1], ["#s4-b2", 5.6],
              ["#s4-m4", 7.4], ["#s4-m5", 8.3], ["#s4-done", 9.6],
            ];
            // Scroll offsets: measure each item's bottom with every dot row collapsed (final layout).
            document.querySelectorAll(".s4-dots").forEach((d) => (d.style.display = "none"));
            const bottoms = shows.map(([sel]) => {{
              const el = document.querySelector(sel);
              return el.offsetTop + el.offsetHeight + 60;
            }});
            document.querySelectorAll(".s4-dots").forEach((d) => (d.style.display = ""));
            shows.forEach(([sel, t], i) => {{
              tl.fromTo(sel, {{ opacity: 0, y: 24, scale: 0.97 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(1.6)" }}, t);
              const scroll = Math.max(0, bottoms[i] - viewH);
              tl.to(list, {{ y: -scroll, duration: 0.35, ease: "power2.out" }}, t);
            }});
            // Taps on the chosen buttons.
            [["#s4-b1a", 4.1], ["#s4-b2c", 6.5]].forEach(([sel, t]) => {{
              tl.to(sel, {{ scale: 0.92, duration: 0.1 }}, t);
              tl.to(sel, {{ scale: 1, backgroundColor: "{INK}", color: "#ffffff", borderColor: "{INK}", duration: 0.18 }}, t + 0.1);
            }});
            tl.fromTo("#s4-check", {{ scale: 0 }}, {{ scale: 1, duration: 0.45, ease: "back.out(2.2)" }}, 9.8);
""",
    wrap_async=True,
)

# ---------------------------------------------------------------- 05 manager notification
write_scene(
    "05-notify.html",
    "s5-notify",
    f"""
        #root {{ position: absolute; inset: 0; background: {TEAL_DARK}; overflow: hidden; color: {SHEET}; }}
        #s5-head {{ position: absolute; left: 90px; right: 90px; top: 260px; font-family: "Mont24", sans-serif; font-weight: 900;
          font-size: 86px; line-height: 1.04; }}
        #s5-head span {{ display: block; color: {MINT}; }}
        #s5-card {{ position: absolute; left: 80px; right: 80px; top: 700px; background: #fff; color: {INK}; border-radius: 40px;
          padding: 44px 48px; font-family: "Inter24", sans-serif; box-shadow: 0 40px 90px rgba(0, 0, 0, 0.35); }}
        #s5-top {{ display: flex; align-items: center; gap: 22px; }}
        #s5-ava {{ width: 78px; height: 78px; border-radius: 22px; background: {TEAL}; color: #fff; font-weight: 700; font-size: 38px;
          display: flex; align-items: center; justify-content: center; }}
        #s5-app {{ font-weight: 700; font-size: 34px; }}
        #s5-kind {{ font-size: 26px; color: {MUTED}; }}
        #s5-title {{ display: flex; align-items: center; gap: 18px; font-size: 48px; font-weight: 700; margin: 38px 0 20px; }}
        .s5-row {{ display: flex; justify-content: space-between; font-size: 34px; padding: 16px 0; border-bottom: 2px solid #eef0ea; }}
        .s5-row b {{ font-weight: 600; }}
        .s5-row span {{ color: {MUTED}; }}
        #s5-btns {{ display: flex; gap: 14px; margin-top: 34px; }}
        .s5-btn {{ font-size: 30px; font-weight: 600; padding: 20px 26px; border-radius: 20px; border: 2px solid {LINE}; color: {INK}; }}
        #s5-ok {{ background: {INK}; border-color: {INK}; color: #fff; }}
        #s5-chip {{ position: absolute; left: 0; right: 0; top: 1450px; text-align: center; font-family: "Plex24", monospace;
          font-weight: 700; font-size: 38px; color: {MINT}; opacity: 0; }}
""",
    f"""
        <div id="s5-head">Заявка поступила. <span>Менеджер уже знает.</span></div>
        <div id="s5-card">
          <div id="s5-top"><div id="s5-ava">24</div><div><div id="s5-app">24reply Manager</div><div id="s5-kind">уведомление · сейчас</div></div></div>
          <div id="s5-title"><svg width="48" height="48" viewBox="0 0 24 24" fill="{TEAL}"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/></svg>Новая заявка #1042</div>
          <div class="s5-row"><span>Клиент</span><b>Sardor</b></div>
          <div class="s5-row"><span>Услуга</span><b>Консультация</b></div>
          <div class="s5-row"><span>Дата</span><b>Завтра</b></div>
          <div class="s5-row"><span>Время</span><b>18:00</b></div>
          <div id="s5-btns"><span class="s5-btn" id="s5-ok">Подтвердить</span><span class="s5-btn">Взять в работу</span><span class="s5-btn">Открыть</span></div>
        </div>
        <div id="s5-chip">✓ подтверждено — 23:43</div>
""",
    f"""
          const tl = gsap.timeline({{ paused: true }});
          tl.fromTo("#s5-head", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, 0.05);
          tl.fromTo("#s5-card", {{ y: -520, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.65, ease: "back.out(1.3)" }}, 0.45);
          tl.fromTo(".s5-row", {{ opacity: 0, x: -20 }}, {{ opacity: 1, x: 0, duration: 0.25, stagger: 0.12 }}, 1.0);
          tl.fromTo("#s5-btns", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.25 }}, 1.55);
          tl.to("#s5-ok", {{ scale: 0.9, duration: 0.1 }}, 3.0);
          tl.to("#s5-ok", {{ scale: 1, backgroundColor: "{TEAL}", borderColor: "{TEAL}", duration: 0.2 }}, 3.1);
          tl.fromTo("#s5-chip", {{ opacity: 0, y: 20 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, 3.25);
""",
)

# ---------------------------------------------------------------- 06 hired
write_scene(
    "06-hired.html",
    "s6-hired",
    RESUME_CSS
    + f"""
        .rs-row {{ opacity: 0.55; }}
        #s6-stamp {{ position: absolute; left: 50%; top: 880px; width: 700px; margin-left: -350px; text-align: center;
          font-family: "Mont24", sans-serif; font-weight: 900; font-size: 132px; letter-spacing: 0.04em; color: {TEAL};
          border: 14px double {TEAL}; border-radius: 26px; padding: 10px 0 18px; background: rgba(255, 254, 251, 0.82); }}
        #s6-pay {{ margin-top: auto; }}
        .s6-line {{ font-size: 44px; font-weight: 700; line-height: 1.35; }}
        .s6-line.s6-soft {{ font-weight: 400; color: {TEAL}; }}
""",
    """
        <div class="rs-sheet" id="s6-sheet">
          <div class="rs-top">
            <div class="rs-ava">24</div>
            <div><div class="rs-tag">РЕЗЮМЕ</div><div class="rs-name">24reply AI</div></div>
          </div>
          <span class="rs-rule"></span>
          <div class="rs-row"><span class="rs-k">График</span><span class="rs-v">24/7</span></div>
          <div class="rs-row"><span class="rs-k">Ответ</span><span class="rs-v">за секунды</span></div>
          <div class="rs-row"><span class="rs-k">Выходные</span><span class="rs-v">не нужны</span></div>
          <div id="s6-pay">
            <div class="s6-line" id="s6-l1">Зарплата: ≈ 83 000 сум/мес</div>
            <div class="s6-line s6-soft" id="s6-l2">Испытательный срок:</div>
            <div class="s6-line s6-soft" id="s6-l3">7 дней — бесплатно</div>
          </div>
        </div>
        <div id="s6-stamp" data-layout-allow-occlusion>ПРИНЯТ</div>
""",
    f"""
          const tl = gsap.timeline({{ paused: true }});
          tl.fromTo("#s6-stamp", {{ scale: 2.6, rotation: -4, opacity: 0 }}, {{ scale: 1, rotation: -11, opacity: 1, duration: 0.28, ease: "power4.in" }}, 0.45);
          tl.fromTo("#s6-sheet", {{ y: 0 }}, {{ y: 12, duration: 0.06, repeat: 3, yoyo: true, ease: "none" }}, 0.73);
          let t = typeSel(tl, "#s6-l1", 1.15, 28, "{INK}", false);
          t = typeSel(tl, "#s6-l2", t + 0.15, 30, "{TEAL}", false);
          typeSel(tl, "#s6-l3", t + 0.1, 26, "{TEAL}", true);
""",
)

# ---------------------------------------------------------------- 07 CTA
MARK = (
    '<svg id="s7-tmark" viewBox="0 0 271 270" fill="currentColor"><rect x="0" y="0" width="10" height="270"/>'
    '<rect x="0" y="0" width="271" height="10"/><rect x="261" y="0" width="10" height="270"/>'
    '<rect x="0" y="260" width="155" height="10"/><rect x="171" y="260" width="100" height="10"/>'
    '<rect x="52" y="49" width="166" height="10"/><rect x="52" y="80" width="166" height="10"/>'
    '<rect x="115" y="80" width="10" height="169"/><rect x="145" y="49" width="10" height="221"/></svg>'
)
write_scene(
    "07-cta.html",
    "s7-cta",
    f"""
        #root {{ position: absolute; inset: 0; background: {PAPER}; overflow: hidden; color: {INK}; }}
        #s7-main {{ position: absolute; left: 90px; right: 90px; top: 300px; display: flex; flex-direction: column; align-items: center;
          text-align: center; }}
        #s7-logo {{ display: flex; align-items: center; gap: 26px; }}
        #s7-tile {{ width: 230px; height: 230px; border-radius: 62px; background: {TEAL}; color: #fff; font-family: "Inter24", sans-serif;
          font-weight: 700; font-size: 124px; display: flex; align-items: center; justify-content: center; }}
        #s7-ai {{ font-family: "Mont24", sans-serif; font-weight: 900; font-size: 200px; line-height: 1; letter-spacing: -0.03em; }}
        #s7-tag {{ font-family: "Plex24", monospace; font-size: 42px; line-height: 1.35; margin-top: 60px; }}
        #s7-tag b {{ color: {TEAL}; }}
        #s7-btn {{ margin-top: 70px; display: flex; align-items: center; gap: 22px; background: {TEAL}; color: #fff; border-radius: 80px;
          padding: 34px 60px; font-family: "Inter24", sans-serif; font-weight: 600; font-size: 50px; }}
        #s7-url {{ font-family: "Mont24", sans-serif; font-weight: 800; font-size: 70px; margin-top: 50px; }}
        #s7-free {{ font-family: "Plex24", monospace; font-size: 36px; color: {MUTED}; margin-top: 14px; }}
        #s7-powered {{ position: absolute; left: 90px; right: 90px; top: 1390px; display: flex; align-items: center; justify-content: center;
          gap: 26px; padding-top: 36px; border-top: 2px solid {LINE}; color: #111; }}
        #s7-pby {{ font-family: "Plex24", monospace; font-size: 30px; color: {MUTED}; }}
        #s7-tmark {{ display: block; width: 82px; height: 82px; }}
        #s7-tname {{ font-family: "Inter24", sans-serif; text-align: left; line-height: 1; }}
        #s7-tname b {{ display: block; font-weight: 700; font-size: 40px; letter-spacing: 0.02em; }}
        #s7-tname span {{ display: block; font-weight: 500; font-size: 19px; letter-spacing: 0.34em; margin-top: 8px; }}
""",
    f"""
        <div id="s7-main">
          <div id="s7-logo"><div id="s7-tile">24</div><div id="s7-ai">ai</div></div>
          <div id="s7-tag">Не бот. <b>Менеджер по продажам,</b> который работает 24/7.</div>
          <div id="s7-btn"><svg width="54" height="54" viewBox="0 0 24 24" fill="#fff"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.1 1.8 11.6c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3z"/></svg>Подключить Telegram</div>
          <div id="s7-url">24reply.uz</div>
          <div id="s7-free">первые 7 дней — бесплатно</div>
        </div>
        <div id="s7-powered">
          <span id="s7-pby">Powered by</span>
          {MARK}
          <div id="s7-tname"><b>TURGUNOV</b><span>TECHNOLOGIES</span></div>
        </div>
""",
    """
          const tl = gsap.timeline({ paused: true });
          tl.fromTo("#s7-tile", { scale: 0, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.9)" }, 0.15);
          tl.fromTo("#s7-ai", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, 0.5);
          tl.fromTo("#s7-tag", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4 }, 1.0);
          tl.fromTo("#s7-btn", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.8)" }, 1.5);
          tl.fromTo("#s7-url", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35 }, 1.9);
          tl.fromTo("#s7-free", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.15);
          tl.to("#s7-btn", { scale: 1.05, duration: 0.35, repeat: 3, yoyo: true, ease: "sine.inOut" }, 3.3);
          tl.fromTo("#s7-powered", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45 }, 2.5);
          tl.fromTo("#s7-tmark rect", { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.3, stagger: 0.04, ease: "power2.out" }, 2.6);
""",
)
print("scenes written")
