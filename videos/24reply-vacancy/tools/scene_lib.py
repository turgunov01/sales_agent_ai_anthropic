"""Shared shell for the 24reply scene sub-compositions (fonts + typing helpers)."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = (ROOT / "tools" / "fontface.css").read_text()

HELPERS = r"""
          function split(el) {
            const text = el.textContent;
            el.textContent = "";
            const out = [];
            for (const c of text) {
              const s = document.createElement("span");
              s.className = "ch";
              s.textContent = c;
              el.appendChild(s);
              out.push(s);
            }
            return out;
          }
          function type(tl, spans, start, cps, caret, keepCaret) {
            const step = 1 / cps;
            spans.forEach((s, i) => {
              const t = start + i * step;
              tl.set(s, { opacity: 1, boxShadow: "0.09em 0 0 " + caret }, t);
              if (i < spans.length - 1 || !keepCaret) tl.set(s, { boxShadow: "0 0 0 transparent" }, t + step);
            });
            return start + spans.length * step;
          }
          function typeSel(tl, sel, start, cps, caret, keep) {
            return type(tl, split(document.querySelector(sel)), start, cps, caret, keep);
          }"""


def write_scene(filename, comp_id, css, html, js, wrap_async=False):
    body_js = js
    if wrap_async:
        script = f"""(function () {{{HELPERS}
          document.fonts.ready.then(function () {{
{body_js}
            window.__timelines["{comp_id}"] = tl;
            if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();
          }});
        }})();"""
    else:
        script = f"""(function () {{{HELPERS}
{body_js}
          window.__timelines["{comp_id}"] = tl;
        }})();"""
    doc = f"""<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <template>
      <style>
        {FONTS}
        .ch {{
          opacity: 0;
        }}
{css}
      </style>

      <div id="root" data-composition-id="{comp_id}" data-width="1080" data-height="1920">
{html}
      </div>

      <script>
        {script}
      </script>
    </template>
  </body>
</html>
"""
    (ROOT / "compositions" / filename).write_text(doc)
