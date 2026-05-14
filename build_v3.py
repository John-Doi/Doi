#!/usr/bin/env python3

DRONE_MAIN  = "IMG_4044.webp"
DRONE_FLY   = "IMG_4045.webp"
VIDEO_FILE  = "_imagine-public_share-videos_db0d29c6-75a5-485f-bc1d-72feb7115e67_hd.mp4"
BG_WHY      = "D92BA55E-36E7-48DF-9269-094B136883BA.png"

STEPS = [
    ("06919491-6C2B-45CF-9C85-601D32BFAC9F.png", "RCN-01 · INTAKE",      "MISSION INTAKE",
     "Every operation begins with a client consultation and site assessment. We gather mission objectives, property details, airspace constraints, and deliverable requirements to build the correct deployment plan."),
    ("CBED9937-245F-4118-9F60-13298EFD03FD.png", "OPS-02 · PLANNING",    "OPERATIONAL PLANNING",
     "DØi performs pre-flight planning, FAA airspace verification, risk analysis, weather evaluation, and mission route configuration. Every mission is structured for safety, efficiency, and precision data capture."),
    ("26721F3E-B47C-4151-BE3C-22BE642708E6.png", "SYN-03 · INTEL",       "INTELLIGENCE ANALYSIS",
     "DØi analyzes all collected data to identify threats, patterns, and opportunities. We assess risks, validate intel, and generate actionable insights that drive mission success and protect assets on the ground."),
    ("C61D48F2-DEC0-4CF1-A878-9E8B0E367EE7.png", "EXE-04 · EXECUTION",   "MISSION EXECUTION",
     "DØi executes missions with precision and purpose. Real-time data, advanced payloads, and autonomous capabilities deliver actionable intelligence when it matters most. Every mission. Every detail. Every advantage."),
    ("30B9913C-3ABA-4C13-ABF7-42353E6242EB.png", "ANL-05 · POST-OPS",    "POST-MISSION ANALYSIS",
     "DØi transforms raw data into actionable intelligence. We analyze, validate, and deliver insights that inform decisions, optimize operations, and drive mission success. Every dataset. Every advantage."),
    ("E9D566CE-BDDB-4C42-A612-00B7E73D43E2.png", "DAT-06 · PROCESSING",  "DATA PROCESSING & MODELING",
     "Raw data is processed and transformed into intelligent 3D models and maps. We clean, structure, and enrich every dataset to ensure accuracy and reliability. Precision in processing. Confidence in every model."),
    ("EB6D5C86-02AE-49B8-A805-6BC7E33F5B65.png", "QCV-07 · VALIDATION",  "QUALITY CONTROL & VALIDATION",
     "Every dataset undergoes rigorous quality control to ensure accuracy, completeness, and reliability. We validate, verify, and cross-check every detail so you can trust the results. Precision verified. Confidence delivered."),
]

TICKER_ITEMS = [
    ("highlight", "FAA PART 107 CERTIFIED"),
    ("dim",       "DJI ENTERPRISE PARTNER"),
    ("highlight", "THERMAL IMAGING · M4T"),
    ("dim",       "CALIFORNIA OPERATIONS"),
    ("highlight", "REAL-TIME DATA DELIVERY"),
    ("dim",       "CONSTRUCTION & INSPECTION"),
    ("highlight", "NIGHT OPS 107.29 AUTHORIZED"),
    ("dim",       "PRECISION MAPPING · 2CM GSD"),
    ("highlight", "AI-ASSISTED INTELLIGENCE"),
    ("dim",       "72-HOUR RAPID DEPLOYMENT"),
]

def ticker_html():
    items = ""
    for cls, label in TICKER_ITEMS * 2:
        items += f'<span class="t-item {cls}">{label}</span><span class="t-sep">///</span>'
    return items

def pipeline_imgs_html():
    out = ""
    for i, (img, *_) in enumerate(STEPS):
        active = ' active' if i == 0 else ''
        out += f'      <img class="pl-img{active}" src="{img}" alt="Step {i+1}" loading="{"eager" if i==0 else "lazy"}">\n'
    return out

def pipeline_steps_html():
    out = ""
    for i, (_, code, title, body) in enumerate(STEPS):
        num = str(i+1).zfill(2)
        active = ' active' if i == 0 else ''
        out += f"""      <div class="pl-step{active}">
        <div class="step-bg-num">{num}</div>
        <div class="step-code">{code}</div>
        <h3 class="step-title">{title}</h3>
        <p class="step-body">{body}</p>
      </div>\n"""
    return out

def dots_html():
    out = ""
    for i in range(len(STEPS)):
        active = ' active' if i == 0 else ''
        out += f'      <div class="pl-dot{active}"></div>\n'
    return out

def mobile_pipeline_html():
    out = ""
    for i, (img, code, title, body) in enumerate(STEPS):
        num = str(i+1).zfill(2)
        out += f"""    <div class="mob-step">
      <img class="mob-step-img" src="{img}" alt="{title}" loading="lazy">
      <div class="mob-step-content">
        <div class="step-code">{code}</div>
        <h3 class="step-title">{title}</h3>
        <p class="step-body">{body}</p>
      </div>
    </div>\n"""
    return out

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>DØi Labs — Advanced Aerial Intelligence | DJI Matrice 4T Operations</title>
<meta name="description" content="Enterprise drone operations powered by DJI Matrice 4T. Thermal inspection, mapping, surveillance, and operational data services. FAA Part 107 certified. California-based.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
:root {{
  --bg:#080808;--surf:#0e0e0e;--card:#111;--card2:#141414;
  --bd:#1e1e1e;--bd2:#2a2a2a;
  --og:#f08c00;--tiger:#ff6b1a;
  --t1:#f0f0f0;--t2:#a8a8a8;--t3:#555;
  --mono:'Share Tech Mono',monospace;
  --disp:'Orbitron',sans-serif;
  --body:'Rajdhani',sans-serif;
}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
html{{scroll-behavior:smooth;}}
body{{font-family:var(--body);font-size:17px;line-height:1.6;background:var(--bg);color:var(--t1);overflow-x:hidden;cursor:crosshair;}}
body::before{{
  content:'';position:fixed;inset:0;
  background-image:linear-gradient(rgba(240,140,0,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(240,140,0,.022) 1px,transparent 1px);
  background-size:52px 52px;pointer-events:none;z-index:0;
}}

/* ── NAV ── */
.nav{{
  position:fixed;top:0;left:0;right:0;z-index:200;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 48px;height:60px;
  background:rgba(8,8,8,.9);backdrop-filter:blur(16px);
  border-bottom:1px solid var(--bd);
}}
.nav-logo{{font-family:var(--disp);font-size:16px;font-weight:900;color:var(--t1);text-decoration:none;letter-spacing:.06em;}}
.nav-logo em{{color:var(--og);font-style:normal;}}
.nav-links{{display:flex;gap:28px;list-style:none;}}
.nav-links a{{font-family:var(--mono);font-size:10px;color:var(--t2);text-decoration:none;letter-spacing:.14em;text-transform:uppercase;transition:color .2s;}}
.nav-links a:hover{{color:var(--og);}}
.nav-cta{{
  font-family:var(--mono);font-size:10px;letter-spacing:.12em;font-weight:700;
  background:var(--og);color:#000;border:none;padding:8px 22px;cursor:crosshair;
  clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
  transition:background .2s;
}}
.nav-cta:hover{{background:var(--tiger);}}

/* ── HERO SCROLL ZONE ── */
.hero-zone{{height:300vh;position:relative;}}
.hero-pin{{
  position:sticky;top:0;height:100vh;overflow:hidden;
  display:flex;flex-direction:column;background:var(--bg);
}}
.hero-video{{position:absolute;inset:0;z-index:0;overflow:hidden;}}
.hero-video video{{width:100%;height:100%;object-fit:cover;opacity:.15;}}
.hero-video::after{{
  content:'';position:absolute;inset:0;
  background:linear-gradient(120deg,rgba(8,8,8,.95) 0%,rgba(8,8,8,.55) 55%,rgba(8,8,8,.9) 100%);
}}

.hero-inner{{
  position:relative;z-index:1;flex:1;
  display:grid;grid-template-columns:1fr 1fr;
  align-items:center;padding:80px 60px 0;gap:20px;
}}
.hero-left{{display:flex;flex-direction:column;gap:22px;}}
.hero-eyebrow{{
  font-family:var(--mono);font-size:10px;letter-spacing:.2em;color:var(--og);
  text-transform:uppercase;display:flex;align-items:center;gap:12px;
}}
.hero-eyebrow::before{{content:'';display:block;width:24px;height:1px;background:var(--og);}}
.hero-h1{{
  font-family:var(--disp);font-size:clamp(38px,5vw,76px);
  font-weight:900;line-height:1;letter-spacing:-.02em;
}}
.hero-h1 .og{{color:var(--og);display:block;}}
.hero-sub{{font-size:clamp(15px,1.4vw,19px);color:var(--t2);line-height:1.55;max-width:440px;}}
.hero-platform{{
  font-family:var(--mono);font-size:11px;color:var(--t3);letter-spacing:.08em;
  padding:10px 0;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);
}}
.hero-platform span{{color:var(--og);}}
.hero-btns{{display:flex;gap:14px;flex-wrap:wrap;}}
.btn-p{{
  font-family:var(--mono);font-size:11px;letter-spacing:.12em;font-weight:700;
  background:var(--og);color:#000;border:none;padding:14px 32px;cursor:crosshair;
  clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%);
  transition:background .2s,transform .2s;
}}
.btn-p:hover{{background:var(--tiger);transform:translateY(-2px);}}
.btn-g{{
  font-family:var(--mono);font-size:11px;letter-spacing:.12em;
  background:transparent;color:var(--t1);border:1px solid var(--bd2);
  padding:14px 32px;cursor:crosshair;transition:border-color .2s,color .2s;
}}
.btn-g:hover{{border-color:var(--og);color:var(--og);}}

/* ── DRONE ── */
.hero-right{{
  position:relative;display:flex;align-items:center;justify-content:center;
}}
#heroDrone{{
  width:100%;max-width:620px;will-change:transform,opacity;
  filter:drop-shadow(0 30px 60px rgba(255,107,26,.2));
}}
#heroDrone img{{width:100%;height:auto;display:block;}}
.tele{{
  position:absolute;font-family:var(--mono);font-size:10px;
  color:var(--og);letter-spacing:.1em;pointer-events:none;
}}
.tele-line{{
  display:flex;align-items:center;gap:8px;
  background:rgba(8,8,8,.85);border:1px solid rgba(240,140,0,.35);padding:5px 10px;
}}
.tele-dot{{width:5px;height:5px;border-radius:50%;background:var(--og);animation:tdot 2.4s ease-in-out infinite;}}
@keyframes tdot{{0%,100%{{opacity:1;}}50%{{opacity:.15;}}}}
.tele-alt{{top:12%;right:-10px;}}
.tele-spd{{bottom:28%;right:-20px;}}
.tele-bat{{top:32%;left:-30px;}}
.reticle{{
  position:absolute;bottom:18%;left:50%;transform:translateX(-50%);
  width:72px;height:72px;pointer-events:none;
  animation:rpulse 3s ease-in-out infinite;
}}
@keyframes rpulse{{0%,100%{{opacity:.35;transform:translateX(-50%) scale(1);}}50%{{opacity:.75;transform:translateX(-50%) scale(1.08);}}}}

/* Scroll hint */
.scroll-hint{{
  position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
  z-index:2;display:flex;flex-direction:column;align-items:center;gap:6px;
  font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:.18em;
  animation:shint 2.5s ease-in-out infinite;
}}
.scroll-hint::after{{content:'';display:block;width:1px;height:36px;background:linear-gradient(to bottom,var(--t3),transparent);}}
@keyframes shint{{0%,100%{{opacity:.35;}}50%{{opacity:.9;}}}}

/* ── TICKER ── */
.hero-ticker{{
  position:relative;z-index:1;height:34px;overflow:hidden;
  border-top:1px solid var(--bd);background:rgba(14,14,14,.9);flex-shrink:0;
}}
.ticker-track{{
  display:flex;white-space:nowrap;height:100%;align-items:center;
  animation:tick 36s linear infinite;
}}
.t-item{{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.14em;padding:0 32px;text-transform:uppercase;}}
.t-item.highlight{{color:var(--og);}}
.t-sep{{color:var(--bd2);font-family:var(--mono);}}
@keyframes tick{{from{{transform:translateX(0);}}to{{transform:translateX(-50%);}}}}

/* ── PROOF BAND ── */
.proof-band{{
  position:relative;z-index:1;
  display:grid;grid-template-columns:repeat(4,1fr);
  background:var(--surf);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);
}}
.proof-item{{
  padding:48px 44px;border-right:1px solid var(--bd);
  opacity:0;transform:translateY(16px);
  transition:opacity .5s,transform .5s cubic-bezier(.16,1,.3,1);
}}
.proof-item:last-child{{border-right:none;}}
.proof-item.revealed{{opacity:1;transform:translateY(0);}}
.proof-num{{font-family:var(--disp);font-size:clamp(44px,5.5vw,80px);font-weight:900;color:var(--og);line-height:1;letter-spacing:-.02em;}}
.proof-label{{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.14em;text-transform:uppercase;margin-top:6px;}}

/* ── SEC HEAD ── */
.sec-head{{text-align:center;padding:80px 60px 0;}}
.sec-tag{{
  font-family:var(--mono);font-size:10px;letter-spacing:.22em;color:var(--og);
  text-transform:uppercase;margin-bottom:12px;
  display:flex;align-items:center;justify-content:center;gap:16px;
}}
.sec-tag::before,.sec-tag::after{{content:'';display:block;width:28px;height:1px;background:var(--og);opacity:.6;}}
.sec-title{{font-family:var(--disp);font-size:clamp(26px,3.2vw,52px);font-weight:900;letter-spacing:-.01em;line-height:1.1;}}
.sec-title span{{color:var(--og);}}
.sec-desc{{font-size:17px;color:var(--t2);max-width:520px;margin:14px auto 0;line-height:1.6;}}

/* ── PIPELINE (desktop sticky) ── */
.pipeline-zone{{height:800vh;position:relative;}}
.pipeline-pin{{
  position:sticky;top:0;height:100vh;overflow:hidden;
  display:grid;grid-template-columns:1fr 1fr;
}}
.pl-images{{position:relative;overflow:hidden;}}
.pl-img{{
  position:absolute;inset:0;object-fit:cover;width:100%;height:100%;
  opacity:0;transition:opacity .7s cubic-bezier(.16,1,.3,1);
}}
.pl-img.active{{opacity:1;}}
.pl-content{{
  display:flex;flex-direction:column;padding:60px;
  background:var(--surf);border-left:1px solid var(--bd);
  position:relative;overflow:hidden;
}}
.pl-steps{{position:relative;flex:1;}}
.pl-step{{
  position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;
  opacity:0;transform:translateY(28px);pointer-events:none;
  transition:opacity .5s cubic-bezier(.16,1,.3,1),transform .5s cubic-bezier(.16,1,.3,1);
}}
.pl-step.active{{opacity:1;transform:translateY(0);pointer-events:auto;}}
.step-bg-num{{
  position:absolute;top:-30px;right:-10px;
  font-family:var(--disp);font-size:clamp(100px,12vw,160px);font-weight:900;
  color:rgba(240,140,0,.05);line-height:1;pointer-events:none;user-select:none;
}}
.step-code{{font-family:var(--mono);font-size:10px;color:var(--og);letter-spacing:.2em;margin-bottom:16px;display:flex;align-items:center;gap:10px;}}
.step-code::before{{content:'';display:block;width:18px;height:1px;background:var(--og);}}
.step-title{{font-family:var(--disp);font-size:clamp(22px,2.2vw,36px);font-weight:900;color:var(--t1);line-height:1.1;margin-bottom:20px;}}
.step-body{{font-size:15px;color:var(--t2);line-height:1.75;max-width:380px;}}
.pl-dots{{
  display:flex;gap:8px;padding-top:32px;border-top:1px solid var(--bd);margin-top:auto;
}}
.pl-dot{{
  width:6px;height:6px;border-radius:50%;background:var(--bd2);
  transition:background .3s,transform .3s;cursor:pointer;
}}
.pl-dot.active{{background:var(--og);transform:scale(1.5);}}

/* Mobile pipeline (replaces sticky on small screens) */
.mob-pipeline{{display:none;}}
.mob-step{{border-bottom:1px solid var(--bd);}}
.mob-step-img{{width:100%;height:260px;object-fit:cover;display:block;}}
.mob-step-content{{padding:32px 20px;background:var(--surf);}}

/* ── WHY CARDS ── */
.why-section{{position:relative;z-index:1;padding:0 0 80px;background:var(--bg);border-top:1px solid var(--bd);}}
.why-bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.06;pointer-events:none;}}
.why-grid{{
  position:relative;display:grid;grid-template-columns:repeat(3,1fr);
  gap:1px;background:var(--bd);border:1px solid var(--bd);margin:40px 60px 0;
}}
.why-card{{
  background:var(--card);padding:40px;display:flex;flex-direction:column;gap:14px;
  opacity:0;transform:translateY(18px);
  transition:opacity .5s,transform .5s cubic-bezier(.16,1,.3,1),background .3s;
}}
.why-card.revealed{{opacity:1;transform:translateY(0);}}
.why-card:hover{{background:var(--card2);}}
.why-icon{{
  width:40px;height:40px;border:1px solid var(--bd2);
  display:flex;align-items:center;justify-content:center;color:var(--og);
}}
.why-code{{font-family:var(--mono);font-size:10px;color:var(--og);letter-spacing:.15em;}}
.why-title{{font-family:var(--disp);font-size:15px;font-weight:700;color:var(--t1);letter-spacing:.03em;}}
.why-body{{font-size:14px;color:var(--t2);line-height:1.65;}}

/* ── SERVICES ── */
.svc-section{{position:relative;z-index:1;padding:0 0 80px;background:var(--surf);border-top:1px solid var(--bd);}}
.svc-grid{{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:1px;background:var(--bd);border:1px solid var(--bd);margin:40px 60px 0;
}}
.svc-card{{
  background:var(--card);padding:44px;position:relative;overflow:hidden;
  opacity:0;transform:translateY(18px);
  transition:opacity .5s,transform .5s cubic-bezier(.16,1,.3,1);
}}
.svc-card.revealed{{opacity:1;transform:translateY(0);}}
.svc-card::before{{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--og),transparent);opacity:0;transition:opacity .3s;
}}
.svc-card:hover::before{{opacity:1;}}
.svc-div{{font-family:var(--mono);font-size:10px;color:var(--og);letter-spacing:.2em;margin-bottom:20px;}}
.svc-title{{font-family:var(--disp);font-size:17px;font-weight:700;color:var(--t1);margin-bottom:12px;letter-spacing:.02em;}}
.svc-body{{font-size:14px;color:var(--t2);line-height:1.65;}}
.svc-wm{{
  position:absolute;bottom:-16px;right:-8px;font-family:var(--disp);
  font-size:72px;font-weight:900;color:rgba(240,140,0,.04);
  line-height:1;pointer-events:none;user-select:none;
}}

/* ── TRUST ── */
.trust-section{{
  position:relative;z-index:1;padding:0 60px 80px;
  background:var(--bg);border-top:1px solid var(--bd);
}}
.trust-grid{{
  display:grid;grid-template-columns:repeat(6,1fr);gap:1px;
  background:var(--bd);border:1px solid var(--bd);margin-top:40px;
}}
.trust-item{{
  background:var(--card);padding:28px 16px;text-align:center;
  opacity:0;transform:translateY(10px);
  transition:opacity .4s,transform .4s;
}}
.trust-item.revealed{{opacity:1;transform:translateY(0);}}
.trust-icon{{font-size:22px;color:var(--og);}}
.trust-label{{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.1em;margin-top:8px;text-transform:uppercase;}}

/* ── FORM ── */
.form-section{{position:relative;z-index:1;padding:80px 60px;background:var(--surf);border-top:1px solid var(--bd);}}
.form-inner{{max-width:860px;margin:0 auto;}}
.form-grid{{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:40px;}}
.form-group{{display:flex;flex-direction:column;gap:6px;}}
.form-group.full{{grid-column:1/-1;}}
.form-label{{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.15em;text-transform:uppercase;}}
.form-input,.form-select,.form-textarea{{
  background:var(--card);border:1px solid var(--bd);color:var(--t1);
  font-family:var(--body);font-size:16px;padding:12px 16px;outline:none;
  transition:border-color .2s;-webkit-appearance:none;
}}
.form-input:focus,.form-select:focus,.form-textarea:focus{{border-color:var(--og);}}
.form-textarea{{resize:vertical;min-height:110px;}}
.form-submit{{
  margin-top:20px;width:100%;font-family:var(--mono);font-size:13px;
  letter-spacing:.15em;font-weight:700;background:var(--og);color:#000;
  border:none;padding:18px;cursor:crosshair;
  clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%);
  transition:background .2s;
}}
.form-submit:hover{{background:var(--tiger);}}

/* ── FOOTER ── */
footer{{
  position:relative;z-index:1;background:var(--bg);
  border-top:1px solid var(--bd);padding:60px 60px 36px;
}}
.foot-inner{{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:60px;margin-bottom:40px;}}
.foot-brand{{display:flex;flex-direction:column;gap:14px;}}
.foot-logo{{font-family:var(--disp);font-size:22px;font-weight:900;color:var(--t1);letter-spacing:.06em;}}
.foot-logo em{{color:var(--og);font-style:normal;}}
.foot-tag{{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.12em;}}
.foot-col-title{{font-family:var(--mono);font-size:10px;color:var(--og);letter-spacing:.2em;text-transform:uppercase;margin-bottom:16px;}}
.foot-links{{list-style:none;display:flex;flex-direction:column;gap:10px;}}
.foot-links a{{font-size:14px;color:var(--t2);text-decoration:none;transition:color .2s;}}
.foot-links a:hover{{color:var(--og);}}
.foot-bottom{{
  border-top:1px solid var(--bd);padding-top:24px;
  display:flex;justify-content:space-between;align-items:center;
}}
.foot-copy{{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.1em;}}

/* ── MOBILE ── */
@media(max-width:900px){{
  .nav-links,.nav-cta{{display:none;}}
  .nav{{padding:0 20px;}}
  .hero-inner{{grid-template-columns:1fr;padding:80px 20px 20px;}}
  .hero-right{{display:none;}}
  .proof-band{{grid-template-columns:repeat(2,1fr);}}
  .proof-item{{padding:32px 20px;border-right:none;border-bottom:1px solid var(--bd);}}
  .pipeline-zone,.pipeline-pin{{display:none;}}
  .mob-pipeline{{display:block;}}
  .why-grid,.svc-grid{{grid-template-columns:1fr;margin:40px 20px 0;}}
  .trust-section{{padding:0 20px 60px;}}
  .trust-grid{{grid-template-columns:repeat(3,1fr);}}
  .form-section{{padding:60px 20px;}}
  .form-grid{{grid-template-columns:1fr;}}
  footer{{padding:40px 20px 24px;}}
  .foot-inner{{grid-template-columns:1fr;gap:36px;}}
  .sec-head{{padding:60px 20px 0;}}
}}
@media(prefers-reduced-motion:reduce){{
  *,*::before,*::after{{animation-duration:.01ms!important;transition-duration:.01ms!important;}}
}}
</style>
</head>
<body>

<!-- NAV -->
<nav class="nav">
  <a class="nav-logo" href="#">DØ<em>i</em> LABS</a>
  <ul class="nav-links">
    <li><a href="#pipeline">PIPELINE</a></li>
    <li><a href="#mission">CAPABILITIES</a></li>
    <li><a href="#services">SERVICES</a></li>
    <li><a href="#contact">CONTACT</a></li>
  </ul>
  <button class="nav-cta" onclick="document.getElementById('contact').scrollIntoView({{behavior:'smooth'}})">DEPLOY NOW</button>
</nav>

<!-- HERO SCROLL ZONE -->
<section class="hero-zone" id="hero">
  <div class="hero-pin">
    <div class="hero-video">
      <video autoplay muted loop playsinline>
        <source src="{VIDEO_FILE}" type="video/mp4">
      </video>
    </div>
    <div class="hero-inner">
      <div class="hero-left">
        <p class="hero-eyebrow">DJI Matrice 4T Enterprise Operations</p>
        <h1 class="hero-h1">ADVANCED<span class="og">AERIAL</span>INTELLIGENCE</h1>
        <p class="hero-sub">Enterprise drone operations delivering thermal inspection, precision mapping, and actionable intelligence. FAA Part 107 certified. California-based.</p>
        <div class="hero-platform">
          PLATFORM: <span>DJI MATRICE 4T</span> &nbsp;·&nbsp;
          STATUS: <span>OPERATIONAL</span> &nbsp;·&nbsp;
          CERT: <span>FAA 107.29</span>
        </div>
        <div class="hero-btns">
          <button class="btn-p" onclick="document.getElementById('contact').scrollIntoView({{behavior:'smooth'}})">REQUEST MISSION BRIEF</button>
          <button class="btn-g" onclick="document.getElementById('pipeline').scrollIntoView({{behavior:'smooth'}})">VIEW PIPELINE →</button>
        </div>
      </div>
      <div class="hero-right">
        <div id="heroDrone">
          <img src="{DRONE_MAIN}" alt="DJI Matrice 4T" loading="eager">
          <div class="tele tele-alt"><div class="tele-line"><div class="tele-dot"></div>ALT: 120M AGL</div></div>
          <div class="tele tele-spd"><div class="tele-line"><div class="tele-dot"></div>SPD: 15.2 M/S</div></div>
          <div class="tele tele-bat"><div class="tele-line"><div class="tele-dot"></div>BAT: 94%</div></div>
          <div class="reticle">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="30" stroke="rgba(240,140,0,.45)" stroke-width="1"/>
              <circle cx="40" cy="40" r="3" fill="rgba(240,140,0,.8)"/>
              <line x1="40" y1="5" x2="40" y2="20" stroke="rgba(240,140,0,.45)" stroke-width="1"/>
              <line x1="40" y1="60" x2="40" y2="75" stroke="rgba(240,140,0,.45)" stroke-width="1"/>
              <line x1="5" y1="40" x2="20" y2="40" stroke="rgba(240,140,0,.45)" stroke-width="1"/>
              <line x1="60" y1="40" x2="75" y2="40" stroke="rgba(240,140,0,.45)" stroke-width="1"/>
              <rect x="5" y="5" width="12" height="12" stroke="rgba(240,140,0,.6)" stroke-width="1" fill="none"/>
              <rect x="63" y="5" width="12" height="12" stroke="rgba(240,140,0,.6)" stroke-width="1" fill="none"/>
              <rect x="5" y="63" width="12" height="12" stroke="rgba(240,140,0,.6)" stroke-width="1" fill="none"/>
              <rect x="63" y="63" width="12" height="12" stroke="rgba(240,140,0,.6)" stroke-width="1" fill="none"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
    <div class="hero-ticker"><div class="ticker-track">{ticker_html()}</div></div>
    <div class="scroll-hint">SCROLL TO DEPLOY</div>
  </div>
</section>

<!-- PROOF BAND -->
<section class="proof-band">
  <div class="proof-item"><div class="proof-num">500+</div><div class="proof-label">MISSIONS FLOWN</div></div>
  <div class="proof-item"><div class="proof-num">48HR</div><div class="proof-label">REPORT TURNAROUND</div></div>
  <div class="proof-item"><div class="proof-num">2CM</div><div class="proof-label">MAPPING ACCURACY</div></div>
  <div class="proof-item"><div class="proof-num">100%</div><div class="proof-label">FAA COMPLIANT</div></div>
</section>

<!-- MISSION PIPELINE (desktop sticky) -->
<div class="pipeline-zone" id="pipeline">
  <div class="pipeline-pin">
    <div class="pl-images">
{pipeline_imgs_html()}    </div>
    <div class="pl-content">
      <div class="sec-head" style="padding:0 0 32px;text-align:left;">
        <div class="sec-tag" style="justify-content:flex-start;">MISSION PIPELINE</div>
        <h2 class="sec-title">7-STEP <span>OPERATION</span></h2>
      </div>
      <div class="pl-steps">
{pipeline_steps_html()}      </div>
      <div class="pl-dots">
{dots_html()}      </div>
    </div>
  </div>
</div>

<!-- MISSION PIPELINE (mobile fallback) -->
<div class="mob-pipeline" id="pipeline-mob">
  <div class="sec-head">
    <div class="sec-tag">MISSION PIPELINE</div>
    <h2 class="sec-title">7-STEP <span>OPERATION</span></h2>
  </div>
{mobile_pipeline_html()}</div>

<!-- WHY DØi -->
<section class="why-section" id="mission">
  <img class="why-bg" src="{BG_WHY}" alt="">
  <div style="position:relative;">
    <div class="sec-head">
      <div class="sec-tag">CAPABILITY OVERVIEW</div>
      <h2 class="sec-title">WHY <span>DØi</span> LABS</h2>
      <p class="sec-desc">Precision tools, trained operators, and battle-tested workflows. This is the standard we operate at.</p>
    </div>
    <div class="why-grid">
      <div class="why-card">
        <div class="why-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
        <div class="why-code">CAP-01 · THERMAL</div>
        <div class="why-title">DUAL THERMAL + RGB</div>
        <div class="why-body">The DJI Matrice 4T delivers simultaneous thermal and RGB capture. Detect heat anomalies, assess infrastructure, and identify targets invisible to standard optics.</div>
      </div>
      <div class="why-card">
        <div class="why-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <div class="why-code">CAP-02 · MAPPING</div>
        <div class="why-title">CENTIMETER PRECISION</div>
        <div class="why-body">Sub-2cm accuracy mapping with RTK positioning. Generate survey-grade point clouds, orthomosaics, and 3D models for engineering and asset management.</div>
      </div>
      <div class="why-card">
        <div class="why-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
        <div class="why-code">CAP-03 · SPEED</div>
        <div class="why-title">48-HOUR TURNAROUND</div>
        <div class="why-body">From wheels-up to deliverable in 48 hours. Our streamlined processing pipeline ensures you have actionable data while the window is still open.</div>
      </div>
      <div class="why-card">
        <div class="why-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <div class="why-code">CAP-04 · COMPLIANCE</div>
        <div class="why-title">FAA PART 107 CERTIFIED</div>
        <div class="why-body">Fully licensed and insured with Night Ops authorization (107.29). We handle all airspace coordination, LAANC approvals, and regulatory compliance.</div>
      </div>
      <div class="why-card">
        <div class="why-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
        <div class="why-code">CAP-05 · INTEL</div>
        <div class="why-title">AI-ASSISTED ANALYSIS</div>
        <div class="why-body">Machine learning-enhanced object detection, anomaly flagging, and change detection. We don't just collect data — we extract intelligence from it.</div>
      </div>
      <div class="why-card">
        <div class="why-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
        <div class="why-code">CAP-06 · RAPID</div>
        <div class="why-title">RAPID DEPLOYMENT</div>
        <div class="why-body">72-hour notice deployment for time-sensitive operations. Emergency response, insurance assessment, wildfire monitoring, and urgent infrastructure inspection.</div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section class="svc-section" id="services">
  <div class="sec-head">
    <div class="sec-tag">MISSION MODULES</div>
    <h2 class="sec-title">OPERATIONAL <span>SERVICES</span></h2>
    <p class="sec-desc">Six specialized divisions. One integrated platform. Total aerial intelligence coverage.</p>
  </div>
  <div class="svc-grid">
    <div class="svc-card"><div class="svc-div">DIV · RCN</div><div class="svc-title">AERIAL RECONNAISSANCE</div><div class="svc-body">Wide-area surveillance and site assessment. RGB + thermal + wide-angle simultaneous capture. Real-time downlink for live situational awareness.</div><div class="svc-wm">RCN</div></div>
    <div class="svc-card"><div class="svc-div">DIV · OPS</div><div class="svc-title">CONSTRUCTION OPERATIONS</div><div class="svc-body">Progress documentation, volumetric measurement, cut/fill analysis, and as-built surveys. Integrate directly with BIM workflows and project management platforms.</div><div class="svc-wm">OPS</div></div>
    <div class="svc-card"><div class="svc-div">DIV · SYN</div><div class="svc-title">PRECISION MAPPING</div><div class="svc-body">Survey-grade topographic mapping with RTK/PPK processing. Sub-2cm accuracy. Deliverables include GeoTIFF orthomosaics, DSM/DTM, and LAS point clouds.</div><div class="svc-wm">SYN</div></div>
    <div class="svc-card"><div class="svc-div">DIV · THM</div><div class="svc-title">THERMAL INSPECTION</div><div class="svc-body">Solar panel efficiency analysis, electrical inspection, HVAC assessment, roof moisture mapping, and wildfire perimeter monitoring using calibrated thermal sensors.</div><div class="svc-wm">THM</div></div>
    <div class="svc-card"><div class="svc-div">DIV · XLAB</div><div class="svc-title">INTELLIGENCE ANALYSIS</div><div class="svc-body">AI-enhanced object detection, change analysis, anomaly identification, and predictive modeling. Turn raw aerial data into decision-ready intelligence reports.</div><div class="svc-wm">XLAB</div></div>
    <div class="svc-card"><div class="svc-div">DIV · FAB</div><div class="svc-title">CUSTOM MISSION DESIGN</div><div class="svc-body">Bespoke operational planning for complex, multi-objective missions. Specialized payload integration, extended BVLOS coordination, and custom data pipeline development.</div><div class="svc-wm">FAB</div></div>
  </div>
</section>

<!-- TRUST -->
<section class="trust-section">
  <div class="sec-head">
    <div class="sec-tag">COMPLIANCE & CERTIFICATION</div>
    <h2 class="sec-title">CERTIFIED. INSURED. <span>READY.</span></h2>
  </div>
  <div class="trust-grid">
    <div class="trust-item"><div class="trust-icon">✈</div><div class="trust-label">FAA PART 107</div></div>
    <div class="trust-item"><div class="trust-icon">🌙</div><div class="trust-label">NIGHT OPS 107.29</div></div>
    <div class="trust-item"><div class="trust-icon">🛡</div><div class="trust-label">$2M LIABILITY</div></div>
    <div class="trust-item"><div class="trust-icon">📡</div><div class="trust-label">LAANC CERTIFIED</div></div>
    <div class="trust-item"><div class="trust-icon">🔒</div><div class="trust-label">DATA SECURE</div></div>
    <div class="trust-item"><div class="trust-icon">⚡</div><div class="trust-label">DJI ENTERPRISE</div></div>
  </div>
</section>

<!-- FORM -->
<section class="form-section" id="contact">
  <div class="form-inner">
    <div class="sec-head" style="padding:0 0 0;">
      <div class="sec-tag">MISSION BRIEF REQUEST</div>
      <h2 class="sec-title">DEPLOY <span>DØi LABS</span></h2>
      <p class="sec-desc">Tell us your mission. We'll build the flight plan.</p>
    </div>
    <form class="form-grid" onsubmit="handleSubmit(event)">
      <div class="form-group"><label class="form-label">FULL NAME</label><input class="form-input" type="text" placeholder="John Smith" required></div>
      <div class="form-group"><label class="form-label">COMPANY / ORGANIZATION</label><input class="form-input" type="text" placeholder="ACME Corp"></div>
      <div class="form-group"><label class="form-label">EMAIL</label><input class="form-input" type="email" placeholder="ops@company.com" required></div>
      <div class="form-group"><label class="form-label">PHONE</label><input class="form-input" type="tel" placeholder="+1 (555) 000-0000"></div>
      <div class="form-group"><label class="form-label">OPERATION LOCATION</label><input class="form-input" type="text" placeholder="City, State or Address"></div>
      <div class="form-group">
        <label class="form-label">SERVICE TYPE</label>
        <select class="form-select">
          <option value="">SELECT MISSION MODULE</option>
          <option>Aerial Reconnaissance (RCN)</option>
          <option>Construction Operations (OPS)</option>
          <option>Precision Mapping (SYN)</option>
          <option>Thermal Inspection (THM)</option>
          <option>Intelligence Analysis (XLAB)</option>
          <option>Custom Mission Design (FAB)</option>
        </select>
      </div>
      <div class="form-group full"><label class="form-label">MISSION OBJECTIVE</label><textarea class="form-textarea" placeholder="Describe your operational requirements, site conditions, and expected deliverables..."></textarea></div>
      <div class="form-group full"><button type="submit" class="form-submit">SUBMIT MISSION BRIEF →</button></div>
    </form>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="foot-inner">
    <div class="foot-brand">
      <div class="foot-logo">DØ<em>i</em> LABS</div>
      <div class="foot-tag">THE DEPARTMENT OF INNOVATION</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--t3);line-height:1.9;">CALIFORNIA-BASED<br>FAA PART 107 · LICENSE #4782910<br>SERVING NATIONWIDE</div>
    </div>
    <div>
      <div class="foot-col-title">OPERATIONS</div>
      <ul class="foot-links">
        <li><a href="#">Aerial Reconnaissance</a></li>
        <li><a href="#">Construction Mapping</a></li>
        <li><a href="#">Thermal Inspection</a></li>
        <li><a href="#">Intelligence Analysis</a></li>
        <li><a href="#">Custom Missions</a></li>
      </ul>
    </div>
    <div>
      <div class="foot-col-title">CONNECT</div>
      <ul class="foot-links">
        <li><a href="#contact">Request Mission Brief</a></li>
        <li><a href="#">Case Studies</a></li>
        <li><a href="#">Compliance & Certs</a></li>
        <li><a href="#">About DØi Labs</a></li>
      </ul>
    </div>
  </div>
  <div class="foot-bottom">
    <div class="foot-copy">© 2026 DØi LABS — THE DEPARTMENT OF INNOVATION. ALL RIGHTS RESERVED.</div>
    <div class="foot-copy">FAA PART 107 · CALIFORNIA · FOUNDED 2023</div>
  </div>
</footer>

<script>
// ── DRONE SCROLL ANIMATION ──
const heroZone = document.querySelector('.hero-zone');
const heroDrone = document.getElementById('heroDrone');
let lastScroll = -1;

function updateHero() {{
  if (!heroZone || !heroDrone) return;
  const rect = heroZone.getBoundingClientRect();
  const maxScroll = heroZone.offsetHeight - window.innerHeight;
  const scrolled = Math.max(0, -rect.top);
  const progress = Math.min(1, scrolled / maxScroll);

  let tx, ty, scale, opacity, rot;
  const t = performance.now() / 1000;

  if (progress < 0.25) {{
    const p = progress / 0.25;
    const ease = 1 - Math.pow(1 - p, 3);
    tx = 110 * (1 - ease);
    ty = -24 * (1 - ease);
    scale = 0.72 + 0.28 * ease;
    opacity = Math.min(1, ease * 1.6);
    rot = 7 * (1 - ease);
  }} else if (progress < 0.72) {{
    tx = Math.sin(t * 0.4) * 2;
    ty = Math.sin(t * 0.7) * 9;
    scale = 1;
    opacity = 1;
    rot = Math.sin(t * 0.5) * 1.5;
  }} else {{
    const p = (progress - 0.72) / 0.28;
    const ease = p * p;
    tx = -110 * ease;
    ty = 32 * ease;
    scale = 1 - 0.28 * ease;
    opacity = Math.max(0, 1 - ease * 1.6);
    rot = -8 * ease;
  }}

  heroDrone.style.transform = `translateX(${{tx.toFixed(1)}}%) translateY(${{ty.toFixed(1)}}px) scale(${{scale.toFixed(3)}}) rotate(${{rot.toFixed(2)}}deg)`;
  heroDrone.style.opacity = opacity.toFixed(3);
}}

function heroLoop() {{
  updateHero();
  requestAnimationFrame(heroLoop);
}}
heroLoop();

// ── PIPELINE SCROLL ──
const plZone = document.querySelector('.pipeline-zone');
const plImgs = document.querySelectorAll('.pl-img');
const plSteps = document.querySelectorAll('.pl-step');
const plDots = document.querySelectorAll('.pl-dot');
let curStep = 0;

function updatePipeline() {{
  if (!plZone || !plImgs.length) return;
  const rect = plZone.getBoundingClientRect();
  const maxScroll = plZone.offsetHeight - window.innerHeight;
  const scrolled = Math.max(0, -rect.top);
  const progress = Math.min(0.9999, scrolled / maxScroll);
  const step = Math.min(plImgs.length - 1, Math.floor(progress * plImgs.length));
  if (step === curStep) return;
  plImgs[curStep].classList.remove('active');
  plSteps[curStep].classList.remove('active');
  plDots[curStep].classList.remove('active');
  plImgs[step].classList.add('active');
  plSteps[step].classList.add('active');
  plDots[step].classList.add('active');
  curStep = step;
}}
window.addEventListener('scroll', updatePipeline, {{passive:true}});
updatePipeline();

// ── INTERSECTION REVEALS ──
const revealEls = document.querySelectorAll('.why-card, .svc-card, .trust-item, .proof-item');
const io = new IntersectionObserver((entries) => {{
  entries.forEach((e, i) => {{
    if (e.isIntersecting) {{
      setTimeout(() => e.target.classList.add('revealed'), i * 70);
      io.unobserve(e.target);
    }}
  }});
}}, {{threshold: 0.1}});
revealEls.forEach(el => io.observe(el));

// ── FORM ──
function handleSubmit(e) {{
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = 'MISSION BRIEF RECEIVED — STANDBY FOR CONTACT';
  btn.style.background = '#22c55e';
  btn.style.clipPath = 'none';
  setTimeout(() => {{
    btn.textContent = 'SUBMIT MISSION BRIEF →';
    btn.style.background = '';
    btn.style.clipPath = '';
    e.target.reset();
  }}, 5000);
}}
</script>
</body>
</html>"""

with open('/home/user/Doi/doilabs-v2.html', 'w') as f:
    f.write(html)

print(f"Written: {{len(html):,}} bytes")
