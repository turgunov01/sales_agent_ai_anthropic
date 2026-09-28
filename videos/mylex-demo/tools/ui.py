"""Shared MYLEX UI kit: fonts, tokens, stage (bg + headline + phone), and the app screens.

Everything is authored in px on the 1080x1920 canvas. The phone screen is 776px wide
(390pt logical x ~1.99), so UI body text ~30px stays legible on a phone-sized Reels view.
Used by build_storyboard.py (static sketches) and later by the scene builder.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def fontface(prefix="assets/fonts/"):
    out = []
    uni = {
        "cyrillic": "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
        "latin": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, "
        "U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    }
    for fam, file, weights in (("MxSerif", "PTSerif", (400, 700)), ("MxSans", "Inter", (400, 500, 600, 700))):
        for w in weights:
            for sub, rng in uni.items():
                out.append(
                    f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;font-display:block;"
                    f"src:url('{prefix}{file}-{w}-{sub}.woff2') format('woff2');unicode-range:{rng};}}"
                )
    return "\n".join(out)


# Brand tokens (from the brief): violet oklch(45% 0.09 295) ~ #4A3B63
TOKENS = {
    "bg": "#F4F1F8",
    "brand": "#4A3B63",
    "brand2": "#6A5790",
    "brandSoft": "#E7E1F0",
    "ink": "#2E2A38",
    "muted": "#645E73",
    "card": "#FFFFFF",
    "line": "#E2DCEB",
    "coral": "#E0664F",
    "star": "#C9962E",
}

CSS = """
.stage{position:absolute;inset:0;width:1080px;height:1920px;overflow:hidden;background:#F4F1F8;
  font-family:'MxSans',system-ui,sans-serif;color:#2E2A38;}
.glow{position:absolute;border-radius:50%;pointer-events:none;}
.glow.a{width:980px;height:980px;left:-360px;top:-260px;
  background:radial-gradient(circle,rgba(106,87,144,.30) 0%,rgba(106,87,144,0) 68%);}
.glow.b{width:1100px;height:1100px;right:-460px;bottom:-300px;
  background:radial-gradient(circle,rgba(74,59,99,.26) 0%,rgba(74,59,99,0) 68%);}
.ghost-glyph{position:absolute;left:640px;top:980px;font-family:'MxSerif';font-weight:700;font-size:1100px;
  line-height:1;color:rgba(74,59,99,.07);pointer-events:none;}
.rule{position:absolute;left:90px;right:90px;top:92px;height:3px;background:rgba(74,59,99,.22);}
.kicker{position:absolute;left:90px;top:112px;font-size:24px;font-weight:600;letter-spacing:.18em;
  color:#4A3B63;text-transform:uppercase;}
.kicker-r{position:absolute;right:90px;top:112px;font-size:24px;font-weight:600;letter-spacing:.12em;color:#645E73;}
.headline{position:absolute;left:70px;right:70px;top:150px;height:150px;display:flex;align-items:center;
  justify-content:center;text-align:center;font-family:'MxSerif';font-weight:700;font-size:66px;
  line-height:1.08;color:#2E2A38;}
.headline em{font-style:normal;color:#4A3B63;}

/* phone — iPhone 15 Pro proportions (1:2.047), authored at 820 wide, shown at 0.915 */
.phone{position:absolute;left:130px;top:322px;width:820px;height:1679px;border-radius:128px;padding:7px;
  transform:scale(.915);transform-origin:50% 0;
  background:linear-gradient(140deg,#c9c6cf 0%,#6d6a74 18%,#e4e1e8 42%,#8a8792 62%,#d3d0d8 82%,#77747e 100%);
  box-shadow:0 70px 140px rgba(46,42,56,.30),0 24px 50px rgba(74,59,99,.24);}
.phone .side{position:absolute;width:9px;border-radius:5px;
  background:linear-gradient(90deg,#77747e,#d6d3db 50%,#8a8792);}
.phone .side.act{left:-8px;top:260px;height:74px;}
.phone .side.vu{left:-8px;top:390px;height:130px;}
.phone .side.vd{left:-8px;top:548px;height:130px;}
.phone .side.pw{right:-8px;top:440px;height:200px;}
.bezel{width:100%;height:100%;border-radius:121px;background:#0b0a0e;padding:15px;
  box-shadow:inset 0 0 0 2px #26232c;}
.screen{position:relative;width:776px;height:1635px;border-radius:106px;overflow:hidden;background:#F4F1F8;}
.island{position:absolute;left:50%;top:24px;width:252px;height:74px;margin-left:-126px;border-radius:40px;
  background:#000;z-index:20;}
.island::after{content:"";position:absolute;right:26px;top:24px;width:26px;height:26px;border-radius:50%;
  background:radial-gradient(circle at 40% 40%,#2b3350,#0a0b10 70%);}
.status{position:absolute;left:0;right:0;top:0;height:112px;padding:38px 62px 0 78px;display:flex;
  justify-content:space-between;align-items:flex-start;z-index:19;}
.status .time{font-size:34px;font-weight:600;color:#000;letter-spacing:-.01em;width:150px;text-align:center;}
.status .icons{display:flex;gap:12px;align-items:center;height:42px;}
.status .icons svg{height:24px;width:auto;display:block;}
.homebar{position:absolute;left:50%;bottom:16px;width:280px;height:10px;margin-left:-140px;border-radius:5px;
  background:#000;z-index:25;}
.homebar.light{background:#fff;}
/* iOS tab bar */
.tabbar{position:absolute;left:0;right:0;bottom:0;height:168px;background:rgba(250,249,252,.96);
  border-top:2px solid rgba(46,42,56,.08);display:flex;justify-content:space-around;padding-top:16px;z-index:18;}
.tab{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:20px;font-weight:500;color:#686476;width:150px;}
.tab svg{width:46px;height:46px;}
.tab.on{color:#4A3B63;}
.view{position:absolute;inset:0;}

/* app parts */
.appbar{position:absolute;left:44px;right:44px;top:120px;height:84px;display:flex;align-items:center;
  justify-content:space-between;}
.logo{font-family:'MxSerif';font-weight:700;color:#4A3B63;letter-spacing:.04em;}
.appbar .logo{font-size:52px;}
.iconbtn{width:76px;height:76px;border-radius:38px;background:#fff;display:flex;align-items:center;
  justify-content:center;box-shadow:0 6px 18px rgba(74,59,99,.10);}
.iconbtn svg{width:38px;height:38px;}
.avatar{border-radius:50%;background:#E7E1F0;color:#4A3B63;font-family:'MxSerif';font-weight:700;
  display:flex;align-items:center;justify-content:center;}
.search{position:absolute;left:44px;right:44px;height:100px;border-radius:30px;background:#fff;
  display:flex;align-items:center;gap:20px;padding:0 30px;font-size:30px;color:#645E73;
  box-shadow:0 10px 30px rgba(74,59,99,.10);}
.search svg{width:40px;height:40px;flex:none;}
.search.active{border:3px solid #4A3B63;color:#2E2A38;}
.caret{display:inline-block;width:3px;height:38px;background:#4A3B63;vertical-align:middle;margin-left:2px;}
.stats{position:absolute;left:44px;right:44px;height:170px;border-radius:32px;background:#4A3B63;
  display:flex;align-items:center;justify-content:space-around;color:#fff;
  box-shadow:0 18px 40px rgba(74,59,99,.30);}
.stat{text-align:center;}
.stat b{display:block;font-family:'MxSerif';font-weight:700;font-size:54px;line-height:1.05;}
.stat span{font-size:24px;color:#E3DCF0;}
.stat-sep{width:2px;height:90px;background:rgba(255,255,255,.22);}
.sec{position:absolute;left:44px;right:44px;display:flex;justify-content:space-between;align-items:baseline;}
.sec h3{font-family:'MxSerif';font-weight:700;font-size:38px;color:#2E2A38;}
.sec a{font-size:26px;font-weight:600;color:#4A3B63;}
.cats{position:absolute;left:44px;right:44px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.cat{height:176px;border-radius:32px;background:#fff;box-shadow:0 8px 24px rgba(74,59,99,.08);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:0 10px;}
.cat .ic{width:76px;height:76px;border-radius:24px;background:#E7E1F0;display:flex;align-items:center;justify-content:center;}
.cat .ic svg{width:42px;height:42px;}
.cat span{font-size:24px;font-weight:600;line-height:1.15;text-align:center;color:#2E2A38;}
.carousel{position:absolute;left:44px;display:flex;gap:22px;}
.lcard{width:300px;height:330px;border-radius:32px;background:#fff;box-shadow:0 10px 28px rgba(74,59,99,.10);
  padding:28px;display:flex;flex-direction:column;gap:10px;flex:none;}
.lcard .avatar{width:104px;height:104px;font-size:40px;}
.lcard b{font-size:28px;font-weight:600;line-height:1.2;margin-top:8px;}
.tag{display:inline-block;align-self:flex-start;padding:8px 16px;border-radius:14px;background:#E7E1F0;color:#4A3B63;
  font-size:22px;font-weight:600;}
.rating{font-size:24px;font-weight:600;color:#2E2A38;}
.rating i{font-style:normal;color:#9A7216;}
.rating small{color:#645E73;font-weight:400;font-size:22px;}

/* search screen */
.backrow{position:absolute;left:44px;right:44px;top:124px;display:flex;align-items:center;gap:20px;}
.backrow h2{font-family:'MxSerif';font-weight:700;font-size:46px;}
.chips{position:absolute;left:44px;right:0;display:flex;gap:16px;flex-wrap:nowrap;}
.chip{flex:none;height:72px;padding:0 28px;border-radius:36px;background:#fff;border:2px solid #E2DCEB;
  display:flex;align-items:center;gap:10px;font-size:26px;font-weight:600;color:#2E2A38;}
.chip.on{background:#4A3B63;border-color:#4A3B63;color:#fff;}
.list{position:absolute;left:44px;right:44px;}
.row{height:92px;display:flex;align-items:center;gap:22px;font-size:30px;color:#2E2A38;border-bottom:2px solid #E2DCEB;}
.row svg{width:36px;height:36px;flex:none;}
.row em{font-style:normal;color:#645E73;}
.kbd{position:absolute;left:0;right:0;bottom:0;height:640px;background:#D3D5DC;padding:18px 8px 0;z-index:17;}
.krow{display:flex;justify-content:center;gap:10px;margin-bottom:22px;}
.key{width:61px;height:90px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;
  font-size:36px;color:#000;box-shadow:0 2px 0 rgba(0,0,0,.28);}
.key.w{width:90px;font-size:30px;background:#ABB0BC;}
.key.n{width:120px;font-size:28px;background:#ABB0BC;}
.key.sp{width:356px;font-size:28px;color:#000;}
.key.go{width:170px;background:#4A3B63;color:#fff;font-size:28px;}
.kbd .sys{display:flex;justify-content:space-between;padding:4px 44px 0;}
.kbd .sys svg{width:48px;height:48px;}
.tap{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;
  border:5px solid rgba(74,59,99,.85);background:rgba(74,59,99,.10);z-index:30;}

/* catalog */
.pills{position:absolute;left:44px;top:236px;display:flex;gap:14px;white-space:nowrap;}
.pill{flex:none;height:68px;padding:0 24px;border-radius:34px;background:#fff;border:2px solid #E2DCEB;display:flex;
  align-items:center;gap:8px;font-size:25px;font-weight:600;color:#2E2A38;}
.pill.on{border-color:#4A3B63;color:#4A3B63;background:#EFEAF6;}
.count{position:absolute;left:44px;top:334px;font-size:26px;color:#645E73;}
.count b{color:#2E2A38;}
.pcards{position:absolute;left:44px;right:44px;top:394px;display:flex;flex-direction:column;gap:22px;}
.pcard{height:236px;border-radius:32px;background:#fff;box-shadow:0 10px 28px rgba(74,59,99,.09);padding:28px;
  display:flex;gap:26px;}
.pcard .avatar{width:150px;height:150px;border-radius:30px;font-size:52px;flex:none;}
.pcard .body{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;}
.pcard b{font-size:32px;font-weight:600;}
.pcard .spec{font-size:25px;color:#645E73;}
.pcard .meta{display:flex;justify-content:space-between;align-items:center;margin-top:6px;}
.price{font-size:26px;font-weight:700;color:#4A3B63;}
.region{font-size:22px;font-weight:600;color:#645E73;padding:6px 14px;border-radius:12px;background:#F4F1F8;}
.sheet{position:absolute;left:0;right:0;bottom:0;border-radius:48px 48px 0 0;background:#fff;
  box-shadow:0 -20px 60px rgba(46,42,56,.18);padding:18px 48px 64px;z-index:16;}
.handle{width:72px;height:10px;border-radius:5px;background:#C7C4CD;margin:0 auto 26px;}
.sheet h4{font-family:'MxSerif';font-weight:700;font-size:40px;margin-bottom:14px;}
.radio{height:88px;display:flex;align-items:center;gap:22px;font-size:30px;border-bottom:2px solid #EFEAF6;}
.radio i{width:40px;height:40px;border-radius:50%;border:3px solid #B9B0C8;flex:none;}
.radio.on i{border:12px solid #4A3B63;}
.btn{font-family:'MxSans';height:104px;border-radius:32px;background:#4A3B63;color:#fff;font-size:30px;font-weight:600;display:flex;
  align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(74,59,99,.30);}
.btn.ghost{background:#fff;color:#4A3B63;border:3px solid #4A3B63;box-shadow:none;}
.scrim{position:absolute;inset:0;background:rgba(20,18,26,.34);z-index:15;}

/* profile */
.prof{position:absolute;left:44px;right:44px;top:210px;text-align:center;}
.prof .avatar{width:210px;height:210px;font-size:76px;margin:0 auto 22px;box-shadow:0 0 0 10px #fff,0 14px 34px rgba(74,59,99,.20);}
.prof h2{font-family:'MxSerif';font-weight:700;font-size:54px;}
.prof .spec{font-size:28px;color:#645E73;margin-top:8px;}
.prof .rating{margin-top:12px;font-size:28px;}
.bio{position:absolute;left:110px;right:110px;top:680px;font-size:27px;line-height:1.45;color:#4d4760;text-align:center;}
.schips{position:absolute;left:44px;right:44px;top:800px;display:flex;justify-content:center;gap:14px;}
.schip{height:70px;padding:0 22px;border-radius:22px;background:#fff;box-shadow:0 6px 18px rgba(74,59,99,.08);
  display:flex;align-items:center;font-size:25px;font-weight:600;color:#4A3B63;}
.days{display:flex;gap:14px;margin:6px 0 24px;}
.day{flex:1;height:112px;border-radius:26px;border:2px solid #E2DCEB;display:flex;flex-direction:column;align-items:center;
  justify-content:center;font-size:22px;color:#645E73;}
.day b{font-size:34px;color:#2E2A38;}
.day.on{background:#4A3B63;border-color:#4A3B63;color:#E3DCF0;}
.day.on b{color:#fff;}
.slots{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
.slot{height:80px;border-radius:22px;border:2px solid #E2DCEB;display:flex;align-items:center;justify-content:center;
  font-size:28px;font-weight:600;color:#2E2A38;}
.slot.on{background:#4A3B63;border-color:#4A3B63;color:#fff;}
.sublabel{font-size:24px;font-weight:600;color:#645E73;letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px;}

/* confirm */
.okwrap{position:absolute;left:44px;right:44px;top:330px;text-align:center;}
.okcircle{width:250px;height:250px;border-radius:50%;background:#4A3B63;margin:0 auto 50px;display:flex;
  align-items:center;justify-content:center;box-shadow:0 0 0 26px #E7E1F0,0 24px 60px rgba(74,59,99,.35);}
.okcircle svg{width:130px;height:130px;}
.okwrap h2{font-family:'MxSerif';font-weight:700;font-size:56px;line-height:1.12;max-width:560px;margin:0 auto;}
.okwrap p{font-size:29px;color:#645E73;margin-top:22px;line-height:1.45;}
.okcard{position:absolute;left:44px;right:44px;top:1010px;border-radius:32px;background:#fff;padding:30px 34px;
  display:flex;align-items:center;gap:26px;box-shadow:0 10px 28px rgba(74,59,99,.09);}
.okcard .avatar{width:96px;height:96px;font-size:36px;flex:none;}
.okcard b{font-size:30px;font-weight:600;display:block;}
.okcard span{font-size:25px;color:#645E73;}
.chatfab{position:absolute;right:44px;top:124px;width:84px;height:84px;border-radius:42px;background:#4A3B63;
  display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(74,59,99,.35);}
.chatfab svg{width:42px;height:42px;}

/* brand card */
.brand{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;text-align:center;}
.brand .logo{font-size:210px;line-height:1;}
.brand .bar{width:420px;height:4px;background:#4A3B63;margin:54px 0 46px;border-radius:2px;}
.brand .tagline{font-size:46px;font-weight:500;color:#2E2A38;}
.brand .url{font-size:38px;font-weight:600;color:#4A3B63;margin-top:26px;letter-spacing:.02em;}
.powered{position:absolute;left:0;right:0;bottom:130px;display:flex;align-items:center;justify-content:center;gap:18px;
  font-size:26px;color:#645E73;}
.powered img{width:54px;height:54px;}
.powered b{color:#2E2A38;font-weight:600;letter-spacing:.04em;}
"""

# ---- icons (stroke line icons, brand violet) -------------------------------------------------
def svg(path, color="#4A3B63", sw=2.2, vb=24):
    return (f'<svg viewBox="0 0 {vb} {vb}" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round">{path}</svg>')


IC = {
    "search": '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    "bell": '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    "family": '<circle cx="8" cy="7" r="3"/><circle cx="16.5" cy="8.5" r="2.5"/><path d="M2.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6"/><path d="M13.5 15.2c.9-.8 1.9-1.2 3-1.2 2.6 0 4.5 2 4.5 5"/>',
    "home": '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
    "brief": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
    "scale": '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0z"/><path d="M19 7l-3 7a3 3 0 0 0 6 0z"/>',
    "scroll": '<path d="M7 3h11a2 2 0 0 1 2 2v12"/><path d="M7 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2"/><path d="M9 8h7M9 12h7M9 16h4"/>',
    "grid": '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    "back": '<path d="M15 5l-7 7 7 7"/>',
    "heart": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    "clock": '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    "chat": '<path d="M5 18l-1 3 4-2h9a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v7"/>',
    "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "chev": '<path d="M7 10l5 5 5-5"/>',
    "cal": '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    "user": '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/>',
    "mic": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
}


def icon(name, color="#4A3B63", sw=2.2):
    return svg(IC[name], color, sw)


LAWYERS = [
    ("АК", "Алия Каримова", "Семейное право", "4.9", "128", "от 150 000 сум", "Ташкент"),
    ("ТР", "Тимур Рахимов", "Семейное право", "4.8", "96", "от 120 000 сум", "Ташкент"),
    ("ДЮ", "Дильноза Юсупова", "Наследство", "4.8", "74", "от 200 000 сум", "Самарканд"),
]


SIGNAL = ('<svg viewBox="0 0 36 24"><rect x="0" y="16" width="6" height="8" rx="1.5" fill="#000"/>'
          '<rect x="10" y="11" width="6" height="13" rx="1.5" fill="#000"/><rect x="20" y="6" width="6" height="18" rx="1.5" fill="#000"/>'
          '<rect x="30" y="0" width="6" height="24" rx="1.5" fill="#000"/></svg>')
WIFI = ('<svg viewBox="0 0 34 24"><path d="M17 24l-5.2-6.2a8 8 0 0 1 10.4 0z" fill="#000"/>'
        '<path d="M4.6 9.4a19 19 0 0 1 24.8 0l-3.3 3.9a14 14 0 0 0-18.2 0z" fill="#000"/>'
        '<path d="M0 4.2a26 26 0 0 1 34 0" stroke="#000" stroke-width="4.4" fill="none" stroke-linecap="round" transform="translate(0 1)"/></svg>')
BATT = ('<svg viewBox="0 0 54 24"><rect x="1" y="1" width="46" height="22" rx="7" fill="none" stroke="#000" stroke-opacity=".38" stroke-width="2"/>'
        '<rect x="4.5" y="4.5" width="39" height="15" rx="4" fill="#000"/><path d="M50 8.5v7a3.5 3.5 0 0 0 0-7z" fill="#000" fill-opacity=".45"/></svg>')


def chrome():
    return ('<div class="island"></div><div class="status"><span class="time">9:41</span>'
            f'<span class="icons">{SIGNAL}{WIFI}{BATT}</span></div><div class="homebar"></div>')


def tabbar(active=0):
    items = [("home", "Главная"), ("search", "Поиск"), ("cal", "Записи"), ("user", "Профиль")]
    return '<div class="tabbar">' + "".join(
        f'<div class="tab{" on" if i == active else ""}">{icon(n, "#4A3B63" if i == active else "#686476")}{t}</div>'
        for i, (n, t) in enumerate(items)) + "</div>"


def stage(headline, inner_screen, kicker="MYLEX · демо", step="", phone=True, extra=""):
    ph = (f'<div class="phone" id="phone"><i class="side act"></i><i class="side vu"></i><i class="side vd"></i>'
          f'<i class="side pw"></i><div class="bezel"><div class="screen">{inner_screen}{chrome()}</div></div></div>'
          if phone else "")
    hl = f'<div class="headline" id="headline"><span class="hl-text">{headline}</span></div>' if headline else ""
    return (f'<div class="stage"><div class="glow a"></div><div class="glow b"></div><div class="ghost-glyph" data-layout-ignore>§</div>'
            f'<div class="rule"></div><div class="kicker">{kicker}</div><div class="kicker-r">{step}</div>'
            f'{hl}{ph}{extra}</div>')


# ---- screens (static key-moment states) ----------------------------------------------------
def scr_splash():
    return ('<div class="view" style="display:flex;align-items:center;justify-content:center;flex-direction:column;">'
            '<div class="logo" style="font-size:150px;">MYLEX</div>'
            '<div style="font-size:28px;color:#645E73;margin-top:18px;letter-spacing:.14em;text-transform:uppercase;">'
            'юридические услуги</div></div>')


def scr_home():
    cats = [("family", "Семейное право"), ("home", "Недвижимость"), ("brief", "Бизнес"),
            ("scale", "Трудовые споры"), ("scroll", "Наследство"), ("grid", "Все услуги")]
    cat_html = "".join(f'<div class="cat"><div class="ic">{icon(i)}</div><span>{t}</span></div>' for i, t in cats)
    cards = "".join(
        f'<div class="lcard"><div class="avatar">{a}</div><b>{n}</b><span class="tag">{s}</span>'
        f'<span class="rating"><i>★</i> {r} <small>({c})</small></span></div>'
        for a, n, s, r, c, *_ in LAWYERS)
    return (
        '<div class="view">'
        f'<div class="appbar"><span class="logo">MYLEX</span><span class="iconbtn">{icon("bell")}</span></div>'
        f'<div class="search" style="top:228px;">{icon("search")}Найти юриста или услугу</div>'
        '<div class="stats" style="top:360px;"><div class="stat"><b>1200+</b><span>юристов</span></div>'
        '<div class="stat-sep"></div><div class="stat"><b>40+</b><span>регионов</span></div>'
        '<div class="stat-sep"></div><div class="stat"><b>4.9</b><span>рейтинг</span></div></div>'
        '<div class="sec" style="top:568px;"><h3>Категории</h3><a>Все</a></div>'
        f'<div class="cats" style="top:640px;">{cat_html}</div>'
        '<div class="sec" style="top:1054px;"><h3>Рекомендуемые юристы</h3><a>Все →</a></div>'
        f'<div class="carousel" style="top:1126px;">{cards}</div>'
        f'{tabbar(0)}</div>')


KEYS = ["йцукенгшщзх", "фывапролджэ", "ячсмитьбю"]


def keyboard():
    rows = "".join(f'<div class="krow">{"".join(f"<div class=key>{c}</div>" for c in r)}</div>' for r in KEYS[:2])
    r3 = ('<div class="krow"><div class="key w">⇧</div>' + "".join(f"<div class=key>{c}</div>" for c in KEYS[2])
          + '<div class="key w">⌫</div></div>')
    r4 = '<div class="krow"><div class="key n">123</div><div class="key n">☺</div><div class="key sp">пробел</div><div class="key go">Найти</div></div>'
    sysrow = f'<div class="sys">{icon("globe", "#4d4a55", 1.8)}{icon("mic", "#4d4a55", 1.8)}</div>'
    return f'<div class="kbd">{rows}{r3}{r4}{sysrow}</div>'


def scr_search(typed="семейный юрист", tap=True):
    sugg = [("Семейное право", True), ("Развод и алименты", False), ("Брачный договор", False)]
    chips = "".join(f'<div class="chip{" on" if on else ""}">{t}</div>' for t, on in sugg)
    rows = "".join(f'<div class="row">{icon("search", "#645E73")}<span>{t}</span></div>'
                   for t in ("<b>семейный юрист</b> <em>в Ташкенте</em>", "<b>семейный юрист</b> <em>онлайн</em>"))
    return (
        '<div class="view">'
        f'<div class="backrow"><span class="iconbtn">{icon("back")}</span><h2>Поиск</h2></div>'
        f'<div class="search active" style="top:236px;">{icon("search")}<span>{typed}<i class="caret"></i></span></div>'
        '<div style="position:absolute;left:44px;top:372px;" class="sublabel">Подсказки</div>'
        f'<div class="chips" style="top:420px;">{chips}</div>'
        f'<div class="list" style="top:524px;">{rows}</div>'
        f'{keyboard()}'
        + ('<div class="tap" style="left:196px;top:456px;"></div>' if tap else "")
        + '</div>')


def scr_catalog(sheet=True):
    pills = ('<div class="pill">Тип услуги' + icon("chev") + '</div><div class="pill on">Категория: семейное</div>'
             '<div class="pill">Регион</div><div class="pill">Сортировка: по рейтингу</div>')
    pills = pills.replace("<svg", '<svg style="width:26px;height:26px"')
    cards = "".join(
        f'<div class="pcard"><div class="avatar">{a}</div><div class="body"><b>{n}</b>'
        f'<span class="spec">{s}</span><span class="rating"><i>★</i> {r} <small>({c} отзывов)</small></span>'
        f'<div class="meta"><span class="price">{p}</span><span class="region">{g}</span></div></div></div>'
        for a, n, s, r, c, p, g in LAWYERS)
    sheet_html = ""
    if sheet:
        opts = [("Ташкент", True), ("Самарканд", False), ("Бухара", False), ("Фергана", False)]
        radios = "".join(f'<div class="radio{" on" if on else ""}"><i></i>{t}</div>' for t, on in opts)
        sheet_html = (f'<div class="scrim"></div><div class="sheet"><div class="handle"></div><h4>Регион</h4>{radios}'
                      '<div class="btn" style="margin-top:30px;">Применить</div></div>')
    return (
        '<div class="view">'
        f'<div class="backrow"><span class="iconbtn">{icon("back")}</span><h2>Каталог юристов</h2></div>'
        f'<div class="pills">{pills}</div>'
        '<div class="count"><b>48 юристов</b> · семейное право</div>'
        f'<div class="pcards">{cards}</div>{sheet_html}'
        '</div>')


def scr_profile(sheet=True):
    a, n, s, r, c, p, g = LAWYERS[0]
    chips = "".join(f'<div class="schip">{t}</div>' for t in ("120 дел", "8 лет опыта", "Ответ за 15 мин"))
    days = [("Вт", "29", True), ("Ср", "30", False), ("Чт", "1", False), ("Пт", "2", False)]
    days_html = "".join(f'<div class="day{" on" if on else ""}">{d}<b>{n_}</b></div>' for d, n_, on in days)
    slots = [("10:00", False), ("12:30", False), ("15:00", True), ("17:00", False)]
    slots_html = "".join(f'<div class="slot{" on" if on else ""}">{t}</div>' for t, on in slots)
    sheet_html = ""
    if sheet:
        sheet_html = ('<div class="scrim"></div><div class="sheet"><div class="handle"></div><h4>Выберите время</h4>'
                      f'<div class="sublabel">Сентябрь – октябрь</div><div class="days">{days_html}</div>'
                      f'<div class="sublabel">Время консультации</div><div class="slots">{slots_html}</div>'
                      '<div class="btn">Подтвердить</div></div>')
    return (
        '<div class="view">'
        f'<div class="appbar" style="top:112px;"><span class="iconbtn">{icon("back")}</span>'
        f'<span class="iconbtn">{icon("heart")}</span></div>'
        f'<div class="prof"><div class="avatar">{a}</div><h2>{n}</h2><div class="spec">{s} · {g}</div>'
        f'<div class="rating"><i>★</i> {r} <small>· {c} отзывов</small></div></div>'
        '<div class="bio">Разводы, алименты, раздел имущества. Помогаю договориться без суда.</div>'
        f'<div class="schips">{chips}</div>'
        '<div class="btn" style="position:absolute;left:44px;right:44px;top:914px;">Забронировать консультацию</div>'
        f'{sheet_html}</div>')


def scr_confirm():
    a, n, *_ = LAWYERS[0]
    return (
        '<div class="view" style="background:#FBFAFD;">'
        f'<div class="chatfab">{icon("chat", "#fff")}</div>'
        f'<div class="okwrap"><div class="okcircle">{svg(IC["check"], "#fff", 2.6)}</div>'
        '<h2>Заявка отправлена юристу</h2><p>Юрист ответит в течение 15 минут</p></div>'
        f'<div class="okcard"><div class="avatar">{a}</div><div><b>{n}</b>'
        '<span>Вт, 29 сентября · 15:00</span></div></div>'
        '<div class="btn ghost" style="position:absolute;left:44px;right:44px;top:1200px;">Перейти в чат</div>'
        '</div>')


def brand_card(mark_src="assets/brand/turgunov-mark.svg"):
    return ('<div class="brand"><div class="logo">MYLEX</div><div class="bar"></div>'
            '<div class="tagline">Юридическая помощь — в один клик</div><div class="url">mylex.uz</div></div>'
            f'<div class="powered">Powered by <img src="{mark_src}" alt=""><b>Turgunov Technologies</b></div>')
