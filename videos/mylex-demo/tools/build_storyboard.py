"""Writes storyboard.html — the static sketch sheet (one cell per frame, key moment, real fonts/colors)."""
import html
from ui import ROOT, CSS, fontface, stage, scr_splash, scr_home, scr_search, scr_catalog, scr_profile, scr_confirm, brand_card

VERSION = "v1"

FRAMES = [
    ("01", "Заставка", "0.0–2.2", "cut",
     stage('Нужен <em>юрист</em>?', scr_splash(), step="01 / 07"),
     "<b>Телефон поднимается снизу.</b> Буквы MYLEX собираются каскадом, затем логотип уменьшается и уезжает в шапку — мост в 02."),
    ("02", "Главная", "2.2–5.6", "в шапку (cut)",
     stage('Все юристы — <em>в одном</em> приложении', scr_home(), step="02 / 07"),
     "<b>Поиск выезжает сверху,</b> счётчики 1200+ / 40+ / 4.9 считаются вверх, категории волной, карусель въезжает справа."),
    ("03", "Поиск", "5.6–8.4", "касание",
     stage('Найдите <em>своего</em> специалиста', scr_search(), step="03 / 07"),
     "<b>Касание строки поиска,</b> клавиатура поднимается, печатается «семейный юрист», касание чипа «Семейное право»."),
    ("04", "Каталог", "8.4–11.4", "slide-left",
     stage('Фильтры — по делу <em>и региону</em>', scr_catalog(), step="04 / 07"),
     "<b>Экран въезжает справа,</b> карточки каскадом; касание «Регион» — шторка с вариантами, выбор «Ташкент», шторка уходит."),
    ("05", "Профиль и запись", "11.4–14.6", "shared zoom",
     stage('Запишитесь <em>в пару касаний</em>', scr_profile(), step="05 / 07"),
     "<b>Аватар карточки вырастает в профиль.</b> Нажатие «Забронировать консультацию» — шторка времени, касание 15:00."),
    ("06", "Подтверждение", "14.6–17.0", "cut",
     stage('Готово. Юрист <em>уже в курсе</em>', scr_confirm(), step="06 / 07"),
     "<b>Нажатие «Подтвердить»:</b> круг пружинит, галочка рисуется, лёгкий наезд камеры, удержание ~1 с (held frame)."),
    ("07", "Бренд", "17.0–20.0", "phone exit ↓",
     stage("", "", step="07 / 07", phone=False, extra=brand_card()),
     "<b>Телефон уходит вниз,</b> MYLEX собирается каскадом (повтор 01), линия рисуется, слоган, mylex.uz, Powered by."),
]

SEAMS = ["01→02 логотип в шапку", "02→03 касание поиска", "03→04 slide-left", "04→05 аватар-zoom",
         "05→06 нажатие «Подтвердить»", "06→07 телефон вниз"]


def build():
    cells = []
    for num, name, span, seam, body, note in FRAMES:
        cells.append(f"""
      <article class="cell" id="frame-{num}">
        <div class="shot"><div class="zoom">{body}</div></div>
        <div class="label"><span>{num} · {html.escape(name.upper())}</span><span>f{num} · {span}</span></div>
        <p class="note">{note}</p>
        <span class="seam">{html.escape(seam)}</span>
      </article>""")
    seam_items = "".join(f"<li>{html.escape(s)}</li>" for s in SEAMS)
    cells.append(f"""
      <article class="cell meta">
        <h3>Швы</h3><ol>{seam_items}</ol>
        <p class="note">Одно направление: новые экраны приходят справа налево внутри телефона; заголовок сверху
        меняется снизу вверх. Телефон не покидает кадр до 07.</p>
      </article>
      <article class="cell meta">
        <h3>Токены</h3>
        <div class="sw"><i style="background:#F4F1F8"></i>фон #F4F1F8</div>
        <div class="sw"><i style="background:#4A3B63"></i>бренд #4A3B63</div>
        <div class="sw"><i style="background:#2E2A38"></i>текст #2E2A38</div>
        <div class="sw"><i style="background:#E7E1F0"></i>мягкий #E7E1F0</div>
        <div class="sw"><i style="background:#E0664F"></i>коралл — только SOS</div>
        <p class="type-s">PT Serif 700 — заголовки, логотип</p>
        <p class="type-a">Inter 400–700 — интерфейс</p>
        <p class="note"><b>Запреты:</b> тёмная тема, неон, градиентный текст, выдуманные лица, слайд-шоу.</p>
      </article>""")

    doc = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>MYLEX — сториборд {VERSION}</title>
<style>
{fontface()}
{CSS}
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{background:#ECE7F2;font-family:'MxSans',system-ui,sans-serif;color:#2E2A38;padding:48px 40px 80px;}}
header{{max-width:1260px;margin:0 auto 36px;display:flex;align-items:flex-end;justify-content:space-between;gap:24px;}}
header h1{{font-family:'MxSerif';font-weight:700;font-size:44px;}}
header h1 small{{font-family:'MxSans';font-size:18px;font-weight:600;color:#fff;background:#4A3B63;border-radius:8px;
  padding:4px 10px;vertical-align:middle;margin-left:10px;}}
header p{{font-size:17px;color:#645E73;margin-top:6px;}}
.tagline-h{{font-size:15px;font-weight:600;color:#4A3B63;background:#fff;border-radius:10px;padding:8px 14px;white-space:nowrap;}}
.grid{{max-width:1260px;margin:0 auto;display:grid;grid-template-columns:repeat(3,380px);gap:40px 60px;justify-content:center;}}
.cell{{position:relative;}}
.shot{{width:360px;height:640px;border-radius:18px;overflow:hidden;position:relative;
  box-shadow:0 18px 40px rgba(46,42,56,.18);background:#F4F1F8;}}
.zoom{{width:1080px;height:1920px;zoom:0.33333;position:relative;}}
.label{{display:flex;justify-content:space-between;margin-top:14px;font-size:13px;font-weight:700;letter-spacing:.08em;}}
.label span:last-child{{color:#645E73;font-weight:500;letter-spacing:0;}}
.cell .note{{font-size:14px;line-height:1.5;color:#4d4760;margin-top:8px;max-width:360px;}}
.cell .note b{{color:#2E2A38;}}
.seam{{display:inline-block;margin-top:10px;font-size:12px;font-weight:600;color:#4A3B63;background:#fff;border-radius:8px;padding:4px 10px;}}
.meta{{width:360px;min-height:640px;background:#fff;border-radius:18px;padding:30px;}}
.meta h3{{font-family:'MxSerif';font-size:30px;margin-bottom:16px;}}
.meta ol{{padding-left:20px;font-size:15px;line-height:2;}}
.sw{{display:flex;align-items:center;gap:12px;font-size:15px;margin-bottom:10px;}}
.sw i{{width:34px;height:34px;border-radius:10px;border:1px solid #d9d2e3;}}
.type-s{{font-family:'MxSerif';font-weight:700;font-size:22px;margin-top:18px;}}
.type-a{{font-size:17px;margin-top:6px;}}
</style>
</head>
<body>
<header>
  <div><h1>MYLEX — демо приложения <small>{VERSION}</small></h1>
  <p>Путь клиента: заставка → главная → поиск → каталог → профиль и запись → подтверждение → бренд.
  Эскизы статичны: показан ключевой момент каждой сцены.</p></div>
  <span class="tagline-h">1080×1920 · 20.0 с · 7 сцен · без звука</span>
</header>
<main class="grid">{''.join(cells)}
</main>
</body>
</html>
"""
    (ROOT / "storyboard.html").write_text(doc)


if __name__ == "__main__":
    build()
