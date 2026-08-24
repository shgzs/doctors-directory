import { Hono } from "hono";
import type { Env } from "../types";

const ui = new Hono<{ Bindings: Env }>();

// ============================================================================
// Design concept: "دفترچه دورهمی" (the reunion ledger)
//
// This isn't a corporate dashboard — it's a warm, personal address book that
// a group of old classmates keep together. The visual language borrows from
// two worlds on purpose: (1) digital business-card apps (Linktree/Popl-style
// avatar-centric cards, one-tap contact actions, shareable links + QR), and
// (2) the physical artifacts of medical school itself — diplomas, official
// stamps, index cards. The signature element is the wax-seal "مهر تایید"
// badge: admin approval is visually a stamp being pressed, and every verified
// member's card carries that same seal. Specialty tags are rendered as small
// rotated ink stamps rather than flat pill chips.
//
// Palette: warm parchment paper, deep oxblood ink, aged brass for the seal.
// Deliberately NOT teal/emerald (the previous version), not black+neon, not
// a bare cream+terracotta SaaS default.
// ============================================================================

const PAGE = /* html */ `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>دفترچه دورهمی</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
/* ---------- design tokens ---------- */
:root{
  --ink:#2a211b;
  --ink-soft:#6b5d4f;
  --paper:#faf3e6;
  --paper-2:#f0e4cd;
  --card:#fffcf5;
  --oxblood:#7c2f32;
  --oxblood-dark:#5c2224;
  --brass:#b4924c;
  --brass-light:#e3cb93;
  --sage:#59684c;
  --clinical:#2b6777;
  --clinical-light:#dbe9ea;
  --line:#e6d7ba;
  --shadow:0 16px 40px -18px rgba(42,33,27,.35);
  --shadow-sm:0 6px 16px -8px rgba(42,33,27,.25);
  --radius-lg:24px;
  --radius-md:16px;
  --radius-sm:10px;
  --font-display:"Noto Naskh Arabic","Vazirmatn",serif;
  --font-body:"Vazirmatn","Segoe UI",Tahoma,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:auto}
body{
  margin:0;min-height:100vh;color:var(--ink);background:var(--paper);
  font-family:var(--font-body);line-height:1.8;direction:rtl;
  background-image:
    radial-gradient(circle at 100% 0%, #fff8ea 0%, transparent 45%),
    radial-gradient(circle at -5% 100%, #f6e9cf 0%, transparent 40%);
}
button,input,textarea,select{font:inherit;color:inherit}
button{cursor:pointer}
button:disabled{cursor:progress;opacity:.6}
a{color:inherit}
:focus-visible{outline:2.5px solid var(--oxblood);outline-offset:2px;border-radius:6px}
@media (prefers-reduced-motion: reduce){*{animation-duration:.001ms !important;transition-duration:.001ms !important}}

h1,h2,h3{font-family:var(--font-display);color:var(--ink);margin:0 0 6px;font-weight:700;letter-spacing:.2px}
.eyebrow{
  font-family:var(--font-body);font-size:12.5px;color:var(--oxblood);
  display:inline-flex;align-items:center;gap:6px;font-weight:700;
}
.eyebrow::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--oxblood)}
.muted{color:var(--ink-soft)}
.wrap{width:min(1160px,calc(100% - 40px));margin:0 auto}

/* ---------- signature element: the wax-seal stamp ---------- */
.seal{
  width:38px;height:38px;border-radius:50%;flex:none;
  background:radial-gradient(circle at 34% 28%,var(--brass-light),var(--brass) 72%);
  box-shadow:0 0 0 2px var(--paper), 0 0 0 3.5px var(--brass), var(--shadow-sm);
  display:grid;place-items:center;color:#3c2c10;font-size:16px;
}
.seal.sm{width:26px;height:26px;font-size:12px;box-shadow:0 0 0 1.5px var(--paper), 0 0 0 2.5px var(--brass)}
.stamp{
  display:inline-flex;align-items:center;gap:6px;position:relative;
  padding:4px 13px;border-radius:999px;border:1.4px solid currentColor;
  font-family:var(--font-display);font-size:12.5px;font-weight:600;
  transform:rotate(-1.4deg);color:var(--oxblood);white-space:nowrap;
}
.stamp::after{content:"";position:absolute;inset:2.5px;border:1px solid currentColor;border-radius:999px;opacity:.45}
.stamp.sage{color:var(--sage)}
.stamp.brass{color:#8a6d2f}
.seal .cross{position:absolute;bottom:-2px;left:-2px;width:15px;height:15px;background:#fff;border-radius:50%;display:grid;place-items:center;box-shadow:0 0 0 1.5px var(--brass);color:var(--clinical);font-size:11px;font-weight:800}

/* pulse-line: the "medical" signature motif — a thin ECG trace used as a
   divider instead of a plain rule. Drawn once as an SVG data-URI so it
   needs no extra requests and tiles cleanly at any width. */
.pulse-divider{
  height:20px;background-repeat:repeat-x;background-size:120px 20px;opacity:.55;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='20' viewBox='0 0 120 20'%3E%3Cpath d='M0 10 H35 L42 2 L50 18 L58 10 H120' fill='none' stroke='%232b6777' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}

/* brand logo (falls back to the seal mark if no logo has been uploaded yet) */
.brand img{height:34px;width:34px;object-fit:cover;border-radius:50%;box-shadow:0 0 0 2px var(--paper), 0 0 0 3px var(--brass)}

/* framed group photo on the homepage — a real memory, not a stock mockup */
.photo-frame{
  background:#fff;border:1px solid var(--line);border-radius:18px;padding:10px 10px 34px;
  box-shadow:var(--shadow);transform:rotate(-2deg);position:relative;
}
.photo-frame img{width:100%;display:block;border-radius:10px;object-fit:cover;aspect-ratio:4/3}
.photo-frame figcaption{
  position:absolute;bottom:8px;right:14px;left:14px;text-align:center;
  font-family:var(--font-display);font-size:13px;color:var(--ink-soft);
}
.photo-frame .pin{position:absolute;top:-9px;right:50%;translate:50% 0;width:16px;height:16px;border-radius:50%;background:var(--oxblood);box-shadow:0 3px 5px #0003}

/* ---------- top bar ---------- */
.topbar{position:sticky;top:0;z-index:30;backdrop-filter:blur(10px);background:#faf3e6ee;border-bottom:1px solid var(--line)}
.topbar-inner{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--font-display);font-weight:700;font-size:18px}
.tabs{display:flex;gap:4px;flex-wrap:wrap}
.tab{
  padding:9px 14px;border-radius:11px;border:1px solid transparent;background:transparent;
  color:var(--ink-soft);font-size:14px;font-weight:600;transition:.15s;
}
.tab:hover{background:var(--paper-2);color:var(--ink)}
.tab.active{background:var(--oxblood);color:#fff8ee;box-shadow:var(--shadow-sm)}
.tab.admin{color:var(--oxblood)}
.topbar-actions{display:flex;align-items:center;gap:8px}
.who{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-soft)}

/* ---------- buttons ---------- */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  border:0;border-radius:12px;padding:11px 20px;font-weight:700;font-size:14.5px;
  background:var(--oxblood);color:#fff8ee;box-shadow:var(--shadow-sm);transition:.15s;
}
.btn:hover{background:var(--oxblood-dark);transform:translateY(-1px)}
.btn.ghost{background:transparent;color:var(--oxblood);box-shadow:none;border:1.5px solid var(--oxblood)}
.btn.ghost:hover{background:#7c2f3212}
.btn.brass{background:var(--brass);color:#3c2c10}
.btn.brass:hover{background:#a3823f}
.btn.sm{padding:7px 13px;font-size:13px;border-radius:10px}
.btn.block{width:100%}
.btn.danger{background:transparent;color:#9b3f45;box-shadow:none;border:1.5px solid #e2c3c5}
.btn.danger:hover{background:#9b3f4512}
.iconbtn{width:38px;height:38px;border-radius:50%;background:var(--paper-2);border:1px solid var(--line);display:grid;place-items:center;font-size:16px}
.iconbtn:hover{background:var(--brass-light)}
.logout-btn{width:auto;padding:0 12px;border-radius:12px;font-size:12px;color:var(--oxblood)}

/* ---------- cards ---------- */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow);padding:26px}
.card.tight{padding:18px}

/* ---------- hero ---------- */
.hero{padding:56px 0 40px;display:grid;grid-template-columns:1.05fr .95fr;gap:36px;align-items:center}
.hero h1{font-size:clamp(30px,4.4vw,46px);line-height:1.45;margin:14px 0 12px}
.hero p.lead{font-size:16.5px;color:var(--ink-soft);max-width:520px;margin:0 0 22px}
.hero-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:18px}
.hero-stat{font-size:13.5px;color:var(--ink-soft)}
.hero-stat b{color:var(--oxblood);font-family:var(--font-display)}

.fan{position:relative;height:340px;display:grid;place-items:center}
.fan .photo-frame{width:270px;z-index:2}
.fan .mockcard.peek{
  position:absolute;width:190px;left:50%;top:8px;
  transform:translateX(-50%) rotate(8deg) translateY(30px);z-index:1;opacity:.9;
}
.mockcard{
  position:absolute;width:250px;left:50%;top:18px;border-radius:20px;
  background:var(--card);border:1px solid var(--line);box-shadow:var(--shadow);
  padding:20px;transition:transform .35s;
}
.mockcard .av{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--brass-light),var(--brass));margin-bottom:12px}
.mockcard .ln{height:9px;border-radius:5px;background:var(--paper-2);margin-bottom:7px}
.mockcard .ln.w60{width:60%}.mockcard .ln.w40{width:40%}

/* ---------- section heads ---------- */
.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:20px}
.section-head h2{font-size:24px}

/* ---------- directory ---------- */
.searchbar{display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap}
.searchbar input{flex:1;min-width:220px}
input[type=text],input[type=tel],input[type=email],input[type=search],textarea,select{
  width:100%;border:1.4px solid var(--line);border-radius:12px;padding:11px 14px;
  background:var(--card);outline:0;transition:.15s;font-size:14.5px;
}
input:focus,textarea:focus,select:focus{border-color:var(--oxblood);box-shadow:0 0 0 3.5px #7c2f3216}
textarea{min-height:96px;resize:vertical}
label.field{display:flex;flex-direction:column;gap:6px;font-size:13.5px;color:var(--ink-soft);font-weight:600}

.grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
.member-card{
  background:var(--card);border:1px solid var(--line);border-radius:var(--radius-md);
  padding:18px;text-align:right;transition:.18s;position:relative;overflow:hidden;
}
.member-card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.profile-gallery-section{margin-top:18px;padding:16px 18px;border:1px solid var(--line);border-radius:18px;background:var(--paper)}.profile-gallery-section h3{margin:0;font-size:15px}.profile-gallery{display:flex;gap:8px;overflow-x:auto;overscroll-behavior-inline:contain;margin-top:12px;padding:2px 2px 8px;scrollbar-width:thin}.profile-gallery button{flex:0 0 auto;padding:0;border:0;background:none;border-radius:11px;line-height:0}.profile-gallery img{width:68px;height:68px;object-fit:cover;border-radius:11px;border:2px solid var(--line);cursor:zoom-in;transition:transform .18s ease,box-shadow .18s ease}.profile-gallery button:hover img{transform:scale(1.04);box-shadow:0 6px 14px #2b21151f}.profile-gallery img.primary{border-color:var(--brass);box-shadow:0 0 0 2px var(--brass-light)}.photo-manager{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:12px}.photo-manager small{color:var(--ink-soft)}
.profile-lightbox{position:fixed;inset:0;z-index:100;background:#211c18e8;display:grid;place-items:center;padding:20px;direction:ltr}.profile-lightbox[hidden]{display:none}.profile-lightbox-inner{position:relative;width:min(94vw,1000px);height:min(90vh,900px);display:grid;place-items:center}.profile-lightbox img{display:block;max-width:calc(100% - 92px);max-height:100%;object-fit:contain;border-radius:14px;box-shadow:0 18px 60px #0008;user-select:none;touch-action:pan-y}.profile-lightbox button{position:absolute;z-index:2;width:40px;height:40px;border:1px solid #fff8;border-radius:50%;background:#fff;color:var(--ink);font-size:24px;line-height:1;cursor:pointer}.profile-lightbox .close-lightbox{top:0;right:0}.profile-lightbox .prev-lightbox{left:10px;top:50%;transform:translateY(-50%)}.profile-lightbox .next-lightbox{right:10px;top:50%;transform:translateY(-50%)}.profile-lightbox .photo-counter{bottom:0;left:50%;transform:translateX(-50%);width:auto;padding:0 12px;border-radius:16px;font-size:12px}
.member-card .top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.avatar{border-radius:50%;object-fit:cover;flex:none;display:grid;place-items:center;font-weight:700;color:#fff}
.avatar.md{width:52px;height:52px;font-size:17px}
.avatar.lg{width:88px;height:88px;font-size:28px}
.member-card h3{font-size:16px;margin:0}
.member-card .city{font-size:13px;color:var(--ink-soft);display:flex;align-items:center;gap:4px;margin-top:2px}
.empty{padding:34px 18px;text-align:center;border-radius:var(--radius-md);background:var(--paper-2);color:var(--ink-soft);border:1px dashed var(--line)}

/* ---------- doctor profile (the "business card") ---------- */
.profile-layout{display:grid;grid-template-columns:340px 1fr;gap:22px;align-items:start}
.bizcard{
  background:linear-gradient(160deg,#fffdf7,#f7ecd6);
  border:1px solid var(--brass-light);border-radius:var(--radius-lg);
  padding:28px 24px;text-align:center;position:relative;box-shadow:var(--shadow);
}
.bizcard .seal{position:absolute;top:-14px;right:-14px}
.bizcard .avatar{margin:0 auto 14px}
.bizcard h2{font-size:21px;margin-bottom:4px}
.bizcard .stamp{margin:8px auto 16px}
.contact-row{display:flex;align-items:center;gap:10px;padding:10px 4px;border-top:1px solid var(--line);font-size:14px;text-align:right}
.contact-row:first-of-type{border-top:none;margin-top:6px}
.contact-row .ic{width:30px;height:30px;border-radius:9px;background:var(--paper-2);display:grid;place-items:center;flex:none;font-size:14px}
.share-row{display:flex;gap:8px;margin-top:16px}
.public-profile-shell{max-width:1040px;margin:34px auto 60px}.doctor-card-page{display:grid;grid-template-columns:minmax(350px,470px) 1fr;gap:34px;align-items:start}.doctor-business-card{min-height:520px;padding:30px;border-radius:24px;background:linear-gradient(145deg,#fffdf7 0%,#f4e4c8 100%);border:1px solid #d9bf84;box-shadow:0 18px 50px #62431f18}.doctor-business-card .avatar{width:156px;height:156px;font-size:42px;border:7px solid #fffaf0;box-shadow:0 7px 22px #62431f20}.doctor-business-card h2{font-size:26px;margin-top:14px}.doctor-business-card .stamp{font-size:14px;padding:6px 14px}.doctor-business-card.template-calm{background:linear-gradient(145deg,#f4fbf9,#dcefeb);border-color:#acd0ca;box-shadow:0 18px 50px #2b677718}.doctor-business-card.template-calm .seal{background:#2b6777;color:#fff}.doctor-business-card.template-dark{background:linear-gradient(145deg,#173943,#10252d);border-color:#477b7a;color:#f7f1e5;box-shadow:0 18px 50px #10252d44}.doctor-business-card.template-dark .muted,.doctor-business-card.template-dark .contact-row{color:#d5e5e2}.doctor-business-card.template-dark .contact-row{border-color:#477b7a}.doctor-business-card.template-dark .contact-row .ic{background:#2b6777;color:#fff}.doctor-business-card.template-dark .stamp{color:#f7f1e5;border-color:#d9bf84}.doctor-business-card.template-dark .avatar{border-color:#2b6777}.doctor-business-card.template-dark h2,.doctor-business-card.template-dark h3,.doctor-business-card.template-dark p,.doctor-business-card.template-dark div{color:inherit}.doctor-card-details{padding:12px 0}.doctor-card-details h1{font-size:clamp(26px,4vw,40px);line-height:1.45;margin:12px 0 5px}.doctor-card-details .lead{font-size:16px;color:var(--ink-soft);margin:0 0 22px}.public-profile-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px}.profile-back{display:inline-flex;align-items:center;gap:7px;color:var(--oxblood);font-weight:700;margin-bottom:18px}.social-links{display:flex;flex-wrap:wrap;gap:8px}.social-link{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid var(--line);border-radius:10px;color:var(--ink);background:var(--card);text-decoration:none}.social-link:hover{border-color:var(--oxblood);color:var(--oxblood)}.social-icon{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:800}.social-icon.instagram{background:linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)}.social-icon.telegram{background:#229ed9}.social-icon.whatsapp{background:#25d366}.social-icon.linkedin{background:#0a66c2}.social-icon.website{background:var(--clinical)}.print-card-page{min-height:calc(100vh - 130px);display:grid;place-items:center;padding:35px 0}.print-card-toolbar{display:flex;justify-content:center;gap:10px;margin-bottom:18px}.print-business-card{width:90mm;min-height:55mm;box-sizing:border-box;border-radius:5mm;padding:8mm;background:linear-gradient(135deg,#fffdf7,#f0dfbd);border:1px solid #c9a862;box-shadow:0 18px 50px #62431f28;position:relative;overflow:hidden;color:#24343a}.print-business-card::after{content:"";position:absolute;width:70mm;height:70mm;border:1px solid #b4924c55;border-radius:50%;left:-35mm;bottom:-45mm}.print-business-card.calm{background:linear-gradient(135deg,#f4fbf9,#d8eeea);border-color:#9bc6bf}.print-business-card.dark{background:linear-gradient(135deg,#173943,#10252d);border-color:#477b7a;color:#f7f1e5}.print-business-card.dark .print-muted{color:#c9dedb}.print-card-top{display:flex;align-items:center;gap:5mm;position:relative;z-index:1}.print-card-top .avatar{width:27mm;height:27mm;font-size:24px;border:2mm solid #fffaf0}.print-business-card.dark .print-card-top .avatar{border-color:#2b6777}.print-card-name{font-size:19px;font-weight:800;line-height:1.5}.print-card-specialty{font-size:11px;margin-top:2mm;color:#7c2f32}.print-business-card.dark .print-card-specialty{color:#e6c77f}.print-card-rule{height:1px;background:currentColor;opacity:.2;margin:6mm 0 4mm}.print-card-contact{display:flex;flex-direction:column;gap:2mm;font-size:10.5px;position:relative;z-index:1}.print-muted{color:#52656a}.print-card-footer{display:flex;justify-content:space-between;gap:5mm;margin-top:5mm;font-size:9px;position:relative;z-index:1}.print-card-url{direction:ltr;white-space:nowrap}
@media print{body{background:#fff!important}.topbar,.site, .print-card-toolbar,.profile-back{display:none!important}.shell{max-width:none!important;padding:0!important}.print-card-page{min-height:0;padding:0}.print-business-card{box-shadow:none;margin:0;break-inside:avoid}}

.detail-block{margin-bottom:22px}
.detail-block h3{font-size:16px;color:var(--ink-soft);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.detail-block h3::after{content:"";flex:1;height:16px;background-repeat:repeat-x;background-size:90px 16px;opacity:.5;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='16' viewBox='0 0 90 16'%3E%3Cpath d='M0 8 H26 L31 2 L37 14 L43 8 H90' fill='none' stroke='%232b6777' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}
.loc-item,.link-item{padding:12px 14px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;background:var(--card)}
.days{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
.day-chip{font-size:11.5px;padding:2px 8px;border-radius:999px;background:var(--paper-2);color:var(--ink-soft)}

/* ---------- forms / profile editor ---------- */
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.form-grid .full{grid-column:1/-1}
.avatar-upload{display:flex;align-items:center;gap:16px;margin-bottom:22px}
.avatar-upload .avatar{width:84px;height:84px;font-size:26px;position:relative}
.profile-tools{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}.qr-box{display:flex;align-items:center;gap:10px;color:var(--ink-soft);font-size:12px}.qr-box img{width:92px;height:92px;object-fit:contain;border:1px solid var(--line);border-radius:10px;background:#fff}
.photo-manager-list .item-row .photo-actions{opacity:0;pointer-events:none;transition:opacity .15s ease}.photo-manager-list .item-row:hover .photo-actions,.photo-manager-list .item-row:focus-within .photo-actions{opacity:1;pointer-events:auto}
.status-banner{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;margin-bottom:22px}
.status-banner.pending{background:#fbe9d0;border:1px solid #e9c98a}
.status-banner.approved{background:#e9efe3;border:1px solid #c7d6b8}
.list-add{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:14px}
.list-add label.field{flex:1;min-width:140px}
.dayrow{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 14px}
.daytoggle{padding:6px 12px;border-radius:999px;border:1.4px solid var(--line);background:var(--card);font-size:12.5px;cursor:pointer}
.daytoggle.on{background:var(--oxblood);color:#fff8ee;border-color:var(--oxblood)}
.item-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px}
.identity-note{padding:10px 12px;border-radius:12px;background:var(--clinical-light);color:#315d66;font-size:12.5px;margin-top:8px}
.request-card{cursor:pointer;text-align:right}.request-card.selected{border-color:var(--oxblood);box-shadow:0 0 0 3px #7c2f3212}.request-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.answer-card{padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);margin-bottom:9px}.answer-card .answer-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.request-detail{margin-top:22px}
.profile-intro{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px 20px;margin-bottom:20px;border-radius:18px;color:#fff;background:linear-gradient(120deg,var(--clinical),#477b7a);box-shadow:var(--shadow-sm)}.profile-intro h3{color:#fff;font-size:18px}.profile-progress{min-width:150px}.profile-progress small{display:flex;justify-content:space-between;color:#e5f2ef;font-size:12px}.profile-progress i{display:block;height:7px;margin-top:6px;border-radius:99px;background:#ffffff35;overflow:hidden}.profile-progress b{display:block;height:100%;border-radius:99px;background:var(--brass-light)}
.social-presets,.extra-presets{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 14px}.social-preset,.extra-presets button{border:1px solid var(--line);border-radius:999px;padding:6px 11px;background:var(--paper);color:var(--ink-soft);font-size:12px;cursor:pointer}.social-preset:hover,.extra-presets button:hover{border-color:var(--oxblood);color:var(--oxblood);background:#fff8ee}

/* ---------- admin ---------- */
.pending-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-bottom:30px}
.pending-card{background:var(--card);border:1.5px dashed var(--brass);border-radius:var(--radius-md);padding:16px}
.admin-table{overflow:auto;border:1px solid var(--line);border-radius:var(--radius-md)}
.admin-table table{width:100%;border-collapse:collapse;min-width:680px}
.admin-table th,.admin-table td{padding:11px 12px;text-align:right;border-bottom:1px solid var(--line);font-size:13.5px}
.admin-table th{background:var(--paper-2);color:var(--ink-soft);font-weight:700}
.status-pill{font-size:11.5px;padding:3px 10px;border-radius:999px;font-weight:700}
.status-pill.approved{background:#e2ecd9;color:#3f5432}
.status-pill.pending{background:#f7e2b8;color:#7a5a17}
.status-pill.rejected{background:#f3d7d7;color:#8a3a3a}

/* ---------- modal ---------- */
.modal-backdrop{position:fixed;inset:0;background:#2a211bb0;display:grid;place-items:center;z-index:100;padding:16px;backdrop-filter:blur(2px)}
.modal{background:var(--paper);border-radius:var(--radius-lg);box-shadow:var(--shadow);width:min(420px,100%);padding:28px;position:relative;animation:pop .22s}
@keyframes pop{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal-close{position:absolute;top:14px;left:14px;background:transparent;border:0;font-size:20px;color:var(--ink-soft)}
.otp-boxes{display:flex;gap:8px;justify-content:center;margin:16px 0;direction:ltr}
.otp-boxes input{width:42px;height:52px;text-align:center;font-size:20px;padding:0}
.doctor-modal-backdrop{position:fixed;inset:0;background:#2a211bb0;display:grid;place-items:center;z-index:100;padding:16px}
.doctor-modal{background:var(--paper);border-radius:var(--radius-lg);max-width:760px;width:100%;max-height:90vh;overflow:auto;padding:28px;position:relative}

/* ---------- toast ---------- */
#toast-region{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:200;display:flex;flex-direction:column;gap:8px;align-items:center}
.toast{background:var(--ink);color:#fdf7ea;padding:11px 20px;border-radius:999px;font-size:13.5px;box-shadow:var(--shadow);animation:rise .2s}
.toast.err{background:var(--oxblood)}
@keyframes rise{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}

footer.site{padding:34px 0 60px;text-align:center;color:var(--ink-soft);font-size:13px}

@media (max-width:860px){
  .hero{grid-template-columns:1fr;padding-top:30px}
  .fan{height:230px;order:-1}
  .profile-layout{grid-template-columns:1fr}
  .doctor-card-page{grid-template-columns:1fr}.public-profile-shell{margin-top:22px}.doctor-business-card{min-height:0}.doctor-business-card .avatar{width:132px;height:132px}
  .form-grid{grid-template-columns:1fr}
  .tabs{order:3;width:100%;justify-content:flex-start;overflow-x:auto}
  .topbar-inner{flex-wrap:wrap}
  .profile-intro{align-items:stretch;flex-direction:column}.profile-progress{min-width:0}
}
</style>
</head>
<body>
  <div id="toast-region"></div>
  <header class="topbar">
    <div class="wrap topbar-inner">
      <a href="#/home" class="brand">
        <img src="/api/assets/site/university-logo" alt="" onerror="this.outerHTML='&lt;span class=&quot;seal sm&quot;&gt;هم&lt;/span&gt;'">
        دفترچه دورهمی
      </a>
      <nav class="tabs" id="tabs"></nav>
      <div class="topbar-actions" id="topActions"></div>
    </div>
  </header>

  <main id="view" class="wrap"></main>

  <footer class="site">فقط برای اعضای دورهمی · اطلاعات شخصی فقط برای اعضای واردشده نمایش داده می‌شود</footer>

  <div id="modal-root"></div>

<script>
/* ============================================================
 * small utilities
 * ============================================================ */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const view = $("view");
const modalRoot = $("modal-root");

function toast(text, isErr){
  const el = document.createElement("div");
  el.className = "toast" + (isErr ? " err" : "");
  el.textContent = text;
  $("toast-region").appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

let TOKEN = localStorage.getItem("dd_token") || "";
let ME = null; // full profile of logged-in user, loaded lazily

async function api(path, opts = {}){
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  if (TOKEN) headers["Authorization"] = "Bearer " + TOKEN;
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || "خطایی رخ داد");
  return data;
}

const AVATAR_TINTS = ["#7c2f32","#b4924c","#59684c","#5c6f8a","#8a5a3c"];
function tintFor(name){
  let h = 0;
  for (const ch of String(name || "?")) h = (h * 31 + ch.charCodeAt(0)) % AVATAR_TINTS.length;
  return AVATAR_TINTS[h];
}
function initials(name){
  const parts = String(name || "؟").trim().split(/\\s+/);
  return (parts[0]?.[0] || "؟") + (parts[1]?.[0] || "");
}
function displayPhone(value){
  const original = String(value || "").trim();
  const raw = original.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "");
  if (raw.startsWith("00")) return displayPhone(raw.slice(2));
  if (raw.startsWith("98") && raw.length >= 12) return "0" + raw.slice(-10);
  if (raw.startsWith("9") && raw.length >= 10) return "0" + raw.slice(-10);
  if (raw.startsWith("0") && raw.length === 11) return raw;
  return original;
}
function socialLinkHtml(s){
  const platform = String(s.platform || "").trim();
  const key = platform.toLowerCase();
  const value = String(s.value || "").trim();
  let href = value;
  let cls = "website", glyph = "↗";
  if (key.includes("instagram") || key.includes("اینست")) { cls = "instagram"; glyph = "◎"; if (!/^https?:\\/\\//i.test(href)) href = "https://instagram.com/" + href.replace(/^@/, ""); }
  else if (key.includes("telegram") || key.includes("تلگرام")) { cls = "telegram"; glyph = "➤"; if (!/^https?:\\/\\//i.test(href)) href = "https://t.me/" + href.replace(/^@/, ""); }
  else if (key.includes("whatsapp") || key.includes("واتساپ")) { cls = "whatsapp"; glyph = "◉"; if (!/^https?:\\/\\//i.test(href)) href = "https://wa.me/" + displayPhone(href).replace(/^0/, "98"); }
  else if (key.includes("linkedin") || key.includes("لینکدین")) { cls = "linkedin"; glyph = "in"; }
  return '<a class="social-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer"><span class="social-icon ' + cls + '">' + glyph + '</span><span>' + esc(platform) + '</span></a>';
}
function avatarHtml(doctor, size){
  const cls = "avatar " + size;
  if (doctor.avatar_key) {
    return '<img class="' + cls + '" src="/api/assets/' + encodeURIComponent(doctor.avatar_key) + '" alt="' + esc(doctor.full_name) + '">';
  }
  return '<div class="' + cls + '" style="background:' + tintFor(doctor.full_name) + '">' + esc(initials(doctor.full_name)) + "</div>";
}
function photoGalleryHtml(photos){
  if (!photos || !photos.length) return "";
  return '<div class="profile-gallery">' + photos.map((p, i) => '<button type="button" data-gallery-index="' + i + '" aria-label="نمایش عکس ' + (i + 1) + '"><img class="' + (p.is_primary ? 'primary' : '') + '" src="/api/assets/' + encodeURIComponent(p.asset_key) + '" alt="عکس پروفایل"></button>').join('') + '</div>';
}
function profileLightboxHtml(photos){
  if (!photos || !photos.length) return "";
  return '<div class="profile-lightbox" id="profileLightbox" hidden><div class="profile-lightbox-inner"><button type="button" class="close-lightbox" aria-label="بستن">×</button><button type="button" class="prev-lightbox" aria-label="عکس قبلی">‹</button><img id="profileLightboxImage" src="/api/assets/' + encodeURIComponent(photos[0].asset_key) + '" alt="نمایش بزرگ عکس پروفایل"><button type="button" class="next-lightbox" aria-label="عکس بعدی">›</button><button type="button" class="photo-counter" aria-live="polite">1 / ' + photos.length + '</button></div></div>';
}

const DAYS = [
  {k:"sat", label:"شنبه"}, {k:"sun", label:"یکشنبه"}, {k:"mon", label:"دوشنبه"},
  {k:"tue", label:"سه‌شنبه"}, {k:"wed", label:"چهارشنبه"}, {k:"thu", label:"پنجشنبه"}, {k:"fri", label:"جمعه"}
];
const dayLabel = (k) => (DAYS.find(d => d.k === k) || {}).label || k;

const VIS_LABEL = { public: "عمومی", members: "فقط اعضا", private: "خصوصی" };

/* ============================================================
 * auth
 * ============================================================ */
async function loadMe(){
  if (!TOKEN) { ME = null; return; }
  try { ME = await api("/api/doctors/me/profile"); }
  catch { TOKEN = ""; localStorage.removeItem("dd_token"); ME = null; }
}
function logout(){
  TOKEN = ""; ME = null;
  localStorage.removeItem("dd_token");
  toast("از حساب خارج شدید");
  location.hash = "#/home";
  render();
}

function openLoginModal(){
  modalRoot.innerHTML = \`
    <div class="modal-backdrop" id="loginBackdrop">
      <div class="modal">
        <button class="modal-close" id="loginClose">×</button>
        <span class="eyebrow">ورود اعضا</span>
        <h2>خوش برگشتی</h2>
        <p class="muted" style="margin:0 0 16px">شماره موبایلی که در گروه ثبت شده رو وارد کن.</p>
        <div id="loginStep1">
          <label class="field">شماره موبایل
            <input type="tel" id="loginPhone" placeholder="0912xxxxxxx" autofocus>
          </label>
          <button class="btn block" style="margin-top:14px" id="sendOtpBtn">ارسال کد تایید</button>
        </div>
        <div id="loginStep2" style="display:none">
          <p class="muted">کد ۶ رقمی ارسال‌شده به <b id="phoneEcho"></b> رو وارد کن.</p>
          <div class="otp-boxes">
            \${[0,1,2,3,4,5].map(i => '<input maxlength="1" inputmode="numeric" class="otp-d" data-i="' + i + '">').join("")}
          </div>
          <button class="btn block" id="verifyOtpBtn">تایید و ورود</button>
          <button class="btn ghost block" style="margin-top:8px" id="resendOtpBtn">ارسال دوباره کد</button>
        </div>
      </div>
    </div>\`;

  let phone = "";
  $("loginClose").onclick = () => modalRoot.innerHTML = "";
  $("loginBackdrop").onclick = (e) => { if (e.target.id === "loginBackdrop") modalRoot.innerHTML = ""; };

  $("sendOtpBtn").onclick = async () => {
    phone = $("loginPhone").value.trim();
    if (!phone) return toast("شماره موبایل رو وارد کن", true);
    $("sendOtpBtn").disabled = true;
    try {
      const r = await api("/api/auth/request-otp", { method: "POST", body: JSON.stringify({ phone }) });
      toast(r.debugCode ? ("حالت آزمایشی — کد: " + r.debugCode) : "کد تایید پیامک شد");
      $("phoneEcho").textContent = phone;
      $("loginStep1").style.display = "none";
      $("loginStep2").style.display = "block";
      document.querySelector(".otp-d").focus();
    } catch (e) { toast(e.message, true); }
    finally { $("sendOtpBtn").disabled = false; }
  };

  $("loginPhone").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("sendOtpBtn").click(); } };

  $("resendOtpBtn").onclick = () => $("sendOtpBtn").click();

  const digits = () => Array.from(document.querySelectorAll(".otp-d")).map(i => i.value).join("");
  document.addEventListener("input", function handler(e){
    if (!e.target.classList || !e.target.classList.contains("otp-d")) return;
    e.target.value = e.target.value.replace(/\\D/g, "").slice(0,1);
    if (e.target.value && e.target.nextElementSibling) e.target.nextElementSibling.focus();
  });

  $("verifyOtpBtn").onclick = async () => {
    const code = digits();
    if (code.length !== 6) return toast("کد ۶ رقمی رو کامل وارد کن", true);
    $("verifyOtpBtn").disabled = true;
    try {
      const r = await api("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, code }) });
      TOKEN = r.token; localStorage.setItem("dd_token", TOKEN);
      await loadMe();
      modalRoot.innerHTML = "";
      toast(r.status === "pending" ? "ثبت شد — منتظر تایید مدیر گروه باش" : "خوش اومدی!");
      location.hash = r.profileComplete === false ? "#/profile" : "#/directory";
      render();
    } catch (e) { toast(e.message, true); }
    finally { $("verifyOtpBtn").disabled = false; }
  };
  document.querySelectorAll(".otp-d").forEach(input => input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("verifyOtpBtn").click(); } });
}

/* ============================================================
 * top bar / tabs
 * ============================================================ */
function renderChrome(){
  const route = currentRoute();
  const tabs = [
    ["#/home", "خانه"],
    ["#/directory", "دفترچه"],
    ["#/requests", "درخواست معرفی"],
  ];
  if (TOKEN) tabs.push(["#/profile", "پروفایل من"]);
  if (ME && ME.role === "admin") tabs.push(["#/admin", "مدیریت"]);

  $("tabs").innerHTML = tabs.map(([href, label]) =>
    '<a class="tab' + (route.path === href.slice(1) ? " active" : "") + (label === "مدیریت" ? " admin" : "") + '" href="' + href + '">' + label + "</a>"
  ).join("");

  $("topActions").innerHTML = TOKEN
    ? '<span class="who">' + (ME ? esc(ME.full_name || "بدون نام") : "…") + '</span><button class="iconbtn logout-btn" id="logoutBtn" title="خروج از حساب" aria-label="خروج از حساب">خروج</button>'
    : '<button class="btn" id="loginBtn">ورود</button>';

  const loginBtn = $("loginBtn"); if (loginBtn) loginBtn.onclick = openLoginModal;
  const logoutBtn = $("logoutBtn"); if (logoutBtn) logoutBtn.onclick = logout;
}

/* ============================================================
 * views
 * ============================================================ */
async function viewHome(){
  view.innerHTML = \`
    <section class="hero">
      <div>
        <span class="eyebrow">دورهمی همکلاسی‌ها</span>
        <h1>هر همکلاسی، یک کارت. <br>هر معرفی، یک اعتماد قدیمی.</h1>
        <p class="lead">دفترچه‌ی دورهمی جایی‌ست که اطلاعات تماس، تخصص و محل کار همکلاسی‌هامون رو نگه می‌داریم — و وقتی کسی دنبال یک پزشک خوبه، از دل همین جمع معرفی می‌کنیم.</p>
        <div class="hero-actions">
          <button class="btn" id="heroLoginBtn">ورود با شماره موبایل</button>
          <a class="btn ghost" href="#/directory">مشاهده‌ی دفترچه</a>
        </div>
        <div class="hero-stat" id="heroStat">در حال شمارش اعضا…</div>
      </div>
      <div class="fan">
        <div class="mockcard peek"><span class="seal">✓<span class="cross">+</span></span><div class="av"></div><div class="ln w60"></div><div class="ln w40"></div></div>
        <figure class="photo-frame">
          <span class="pin"></span>
          <img src="/api/assets/site/group-photo" alt="عکس دورهمی" onerror="this.parentElement.style.display='none'">
          <figcaption>دورهمی فارغ‌التحصیلی</figcaption>
        </figure>
      </div>
    </section>
    <div class="pulse-divider" style="margin:6px 0 0"></div>
    <section class="card recent-requests" id="recentRequests" style="display:none"><div class="section-head"><div><h2 style="font-size:19px">آخرین سؤال‌های جمع</h2><p class="muted">اگر تجربه‌ای داری، به یکی از دوستان کمک کن.</p></div><a class="btn ghost sm" href="#/requests">دیدن همه</a></div><div class="grid-cards" id="recentRequestGrid"></div></section>\`;
  $("heroLoginBtn").onclick = openLoginModal;
  try {
    const d = await api("/api/doctors");
    $("heroStat").innerHTML = '<b>' + d.doctors.length + '</b> پزشک عضو این دورهمی هستند';
  } catch { $("heroStat").textContent = ""; }
  if (TOKEN) {
    try {
      const d = await api("/api/recommendation-requests?status=open");
      const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = d.requests.filter(x => Date.parse(String(x.created_at).replace(" ", "T") + "Z") >= week).slice(0, 3);
      if (recent.length) { $("recentRequests").style.display = "block"; $("recentRequestGrid").innerHTML = recent.map(x => '<a class="member-card request-card" href="#/requests"><h3>' + esc(x.title) + '</h3><div class="request-meta"><span class="stamp">' + esc([x.specialty,x.city].filter(Boolean).join(" · ") || "بدون دسته‌بندی") + '</span></div><p class="muted" style="font-size:12px">' + esc(x.answer_count || 0) + ' پاسخ</p></a>').join(""); }
    } catch { /* guests and pending users simply do not see member questions */ }
  }
}

async function viewDirectory(){
  view.innerHTML = \`
    <div class="section-head"><h2>دفترچه‌ی اعضا</h2></div>
    <div class="searchbar">
      <input type="search" id="dirSearch" placeholder="جست‌وجو بر اساس نام، تخصص یا شهر…">
      <button class="btn" id="dirSearchBtn">جست‌وجو</button>
    </div>
    <div class="grid-cards" id="dirGrid"><div class="empty">در حال بارگذاری…</div></div>\`;

  async function load(){
    const q = $("dirSearch").value.trim();
    try {
      const d = await api("/api/doctors" + (q ? ("?q=" + encodeURIComponent(q)) : ""));
      $("dirGrid").innerHTML = d.doctors.length
        ? d.doctors.map(x => \`
          <article class="member-card" role="button" tabindex="0" data-id="\${esc(x.id)}">
            <div class="top">\${avatarHtml(x, "md")}
              <div><h3>\${esc(x.full_name || "بدون نام")}</h3>
              <div class="city">\${x.city ? "📍 " + esc(x.city) : ""}</div></div>
            </div>
            \${x.specialty_main ? '<span class="stamp">' + esc(x.specialty_main) + "</span>" : ""}
          </article>\`).join("")
        : '<div class="empty">با این مشخصات کسی پیدا نشد.</div>';
      $("dirGrid").querySelectorAll("[data-id]").forEach(el => {
        el.onclick = () => openDoctorModal(el.dataset.id);
        el.onkeydown = (e) => { if (e.key === "Enter") openDoctorModal(el.dataset.id); };
      });
    } catch (e) { toast(e.message, true); }
  }
  $("dirSearchBtn").onclick = load;
  $("dirSearch").onkeydown = (e) => { if (e.key === "Enter") load(); };
  load().then(() => { const query = new URLSearchParams(location.hash.split("?")[1] || ""); const doctor = query.get("doctor"); if (doctor) openDoctorModal(doctor); });
}

function contactRowsHtml(d, canSeePrivate){
  const rows = [];
  if (d.phone_public) rows.push(["☎", "شماره عمومی", displayPhone(d.phone_public)]);
  if (canSeePrivate && d.phone) rows.push(["📱", "شماره شخصی", displayPhone(d.phone)]);
  if (canSeePrivate && d.email) rows.push(["✉", "ایمیل", d.email]);
  if (d.medical_council_number) rows.push(["🩺", "نظام پزشکی", d.medical_council_number]);
  return rows.map(([ic,label,val]) => \`
    <div class="contact-row"><span class="ic">\${ic}</span><div><div class="muted" style="font-size:12px">\${label}</div>\${esc(val)}</div></div>
  \`).join("") || '<p class="muted" style="text-align:center">اطلاعات تماسی ثبت نشده</p>';
}

async function openDoctorModal(id){
  try {
    const d = await api("/api/doctors/" + encodeURIComponent(id));
    const canSeePrivate = Boolean(ME);
    const url = location.origin + "/d/" + (d.public_id || d.id);
    modalRoot.innerHTML = \`
      <div class="doctor-modal-backdrop" id="docBackdrop">
        <div class="doctor-modal">
          <button class="modal-close" id="docClose">×</button>
          <div class="profile-layout">
            <div class="bizcard">
              <span class="seal">✓<span class="cross">+</span></span>
              \${avatarHtml(d, "lg")}
              <h2>\${esc(d.full_name)}</h2>
              \${d.specialty_main ? '<span class="stamp">' + esc(d.specialty_main) + "</span>" : ""}
              \${contactRowsHtml(d, canSeePrivate)}
              <div class="share-row">
                <a class="btn ghost sm" style="flex:1" href="\${url}">مشاهده صفحه</a>
                <button class="btn brass sm" id="vcardBtn">ذخیره شماره</button>
              </div>
            </div>
            <div>
              \${d.bio ? '<div class="detail-block"><h3>درباره</h3><p>' + esc(d.bio) + "</p></div>" : ""}
              <div class="detail-block"><h3>محل‌های کار</h3>
                \${(d.workLocations||[]).map(l => \`
                  <div class="loc-item"><b>\${esc(l.location_name)}</b>\${l.address ? " — " + esc(l.address) : ""}
                  <div class="days">\${(JSON.parse(l.days_of_week||"[]")).map(k => '<span class="day-chip">' + dayLabel(k) + "</span>").join("")}</div></div>
                \`).join("") || '<p class="muted">ثبت نشده</p>'}
              </div>
              <div class="detail-block"><h3>شبکه‌های اجتماعی</h3>
                \${(d.socialLinks||[]).map(s => socialLinkHtml(s)).join("") || '<p class="muted">ثبت نشده</p>'}
              </div>
              \${(d.extraFields||[]).length ? '<div class="detail-block"><h3>اطلاعات تکمیلی</h3>' + d.extraFields.map(f => '<div class="link-item"><b>' + esc(f.field_key) + "</b> — " + esc(f.field_value) + "</div>").join("") + "</div>" : ""}
            </div>
          </div>
        </div>
      </div>\`;
    $("docClose").onclick = () => modalRoot.innerHTML = "";
    $("docBackdrop").onclick = (e) => { if (e.target.id === "docBackdrop") modalRoot.innerHTML = ""; };
    $("vcardBtn").onclick = () => {
      const vcf = "BEGIN:VCARD\\nVERSION:3.0\\nFN:" + d.full_name + "\\nTEL:" + (d.phone_public || d.phone || "") +
        (d.email ? "\\nEMAIL:" + d.email : "") + "\\nEND:VCARD";
      const blob = new Blob([vcf], { type: "text/vcard" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = (d.full_name || "doctor") + ".vcf"; a.click();
    };
  } catch (e) { toast(e.message, true); }
}

async function viewRequests(){
  if (!TOKEN) { view.innerHTML = gatedNotice("درخواست معرفی فقط برای اعضای واردشده قابل مشاهده‌ست."); return; }
  view.innerHTML = \`
    <div class="section-head"><div><h2>درخواست‌های معرفی</h2><p class="muted">اگر دنبال پزشک یا همکار خوبی هستی، سؤال را برای جمع بنویس.</p></div><span class="stamp">هر جواب، یک تجربه‌ی مفید</span></div>
    <div class="card" style="margin-bottom:22px"><h3 style="font-size:15px;margin-bottom:12px">سؤال جدید</h3>
      <div class="form-grid"><label class="field full">دنبال چه کسی هستی؟<input type="text" id="rqTitle" placeholder="مثلاً ارتوپد اطفال خوب در اصفهان می‌شناسید؟"></label>
      <label class="field">تخصص<input type="text" id="rqSpecialty"></label><label class="field">شهر<input type="text" id="rqCity"></label>
      <label class="field full">توضیح بیشتر<textarea id="rqDetails" placeholder="اگر توضیحی درباره‌ی شرایط یا ترجیح خودت داری…"></textarea></label></div>
      <button class="btn" style="margin-top:14px" id="addRequestBtn">ثبت درخواست</button>
    </div>
    <div class="grid-cards" id="requestList"><div class="empty">در حال بارگذاری…</div></div>
    \`;

  async function load(){
    try {
      const d = await api("/api/recommendation-requests");
      $("requestList").innerHTML = d.requests.length ? d.requests.map(x => \`
        <article class="member-card request-card" data-request-id="\${esc(x.id)}"><h3>\${esc(x.title)}</h3>
          <div class="request-meta"><span class="stamp">\${esc([x.specialty,x.city].filter(Boolean).join(" · ") || "بدون دسته‌بندی")}</span><span class="status-pill \${x.status}">\${x.status === "answered" ? "پاسخ دارد" : x.status === "closed" ? "بسته‌شده" : "باز"}</span></div>
          <p class="muted" style="font-size:12.5px;margin-top:9px">\${esc(x.answer_count || 0)} پاسخ · از طرف \${esc(x.asked_by || "—")}</p></article>\`).join("") : '<div class="empty">هنوز درخواستی ثبت نشده.</div>';
      $("requestList").querySelectorAll("[data-request-id]").forEach(card => card.onclick = () => { location.hash = "#/request/" + encodeURIComponent(card.dataset.requestId); });
    } catch (e) { toast(e.message, true); }
  }
  $("addRequestBtn").onclick = async () => { const title=$("rqTitle").value.trim(); if (!title) return toast("متن درخواست را وارد کن",true); try { await api("/api/recommendation-requests",{method:"POST",body:JSON.stringify({title,specialty:$("rqSpecialty").value,city:$("rqCity").value,details:$("rqDetails").value})}); ["rqTitle","rqSpecialty","rqCity","rqDetails"].forEach(id=>$(id).value=""); toast("درخواست ثبت شد"); load(); } catch(e){toast(e.message,true)} };
  load();
}

async function viewRequestDetail(id){
  if (!TOKEN) { view.innerHTML = gatedNotice("برای دیدن درخواست‌ها ابتدا وارد شو."); return; }
  try {
    const x = await api("/api/recommendation-requests/" + encodeURIComponent(id));
    view.innerHTML = \`
      <div class="public-profile-shell">
        <a class="profile-back" href="#/requests">← بازگشت به فهرست درخواست‌ها</a>
        <div class="section-head"><div><h2>جزئیات درخواست</h2><p class="muted">\${esc([x.specialty,x.city].filter(Boolean).join(" · ") || "درخواست معرفی")}</p></div><span class="status-pill \${x.status}">\${x.status === "answered" ? "پاسخ دارد" : x.status === "closed" ? "بسته‌شده" : "باز"}</span></div>
        <div class="card"><h3>\${esc(x.title)}</h3><p class="muted" style="margin-top:10px">\${esc(x.details || "توضیحی ثبت نشده")}</p><p class="muted" style="font-size:12px;margin-top:12px">ثبت‌شده توسط \${esc(x.asked_by || "—")}</p></div>
        <div class="card" style="margin-top:18px"><div class="section-head"><h3 style="font-size:17px">پاسخ‌ها</h3><span class="stamp">\${x.answers.length} پاسخ</span></div>
          \${x.answers.length ? x.answers.map(a => \`<div class="answer-card"><div class="answer-head"><b>\${esc(a.recommended_name)}</b><span class="muted" style="font-size:12px">پیشنهاد از \${esc(a.answered_by || "—")}</span></div><div class="muted" style="font-size:13px;margin-top:5px">\${esc([a.specialty,a.city,displayPhone(a.phone)].filter(Boolean).join(" · "))}</div>\${a.notes ? \`<p style="font-size:13px;margin:7px 0 0">\${esc(a.notes)}</p>\` : ""}</div>\`).join("") : '<p class="muted">هنوز پاسخی ثبت نشده است.</p>'}
        </div>
        \${x.status !== "closed" ? \`<div class="card" style="margin-top:18px"><h3 style="font-size:16px">پاسخ شما</h3><div class="form-grid" style="margin-top:12px"><label class="field">نام پزشک یا فرد پیشنهادی<input id="ansName"></label><label class="field">تخصص<input id="ansSpecialty"></label><label class="field">شهر<input id="ansCity"></label><label class="field">شماره تماس<input id="ansPhone"></label><label class="field full">توضیح شما<textarea id="ansNotes"></textarea></label></div><button class="btn" style="margin-top:12px" id="sendAnswerBtn">ثبت پاسخ</button></div>\` : ""}
      </div>\`;
    const send = $("sendAnswerBtn");
    if (send) send.onclick = async () => { const recommendedName=$("ansName").value.trim(); if (!recommendedName) return toast("نام فرد پیشنهادی را وارد کن",true); try { await api("/api/recommendation-requests/"+encodeURIComponent(id)+"/answers",{method:"POST",body:JSON.stringify({recommendedName,specialty:$("ansSpecialty").value,city:$("ansCity").value,phone:$("ansPhone").value,notes:$("ansNotes").value})}); toast("پاسخ ثبت شد"); viewRequestDetail(id); } catch(e){toast(e.message,true)} };
  } catch (e) { toast(e.message, true); view.innerHTML = '<div class="empty">درخواست پیدا نشد.</div>'; }
}

async function viewPublicProfile(key){
  try {
    const d = await api("/api/doctors/" + encodeURIComponent(key));
    const officialUrl = d.imc_profile_url || (d.imc_guid ? "https://membersearch.irimc.org/member/profile?id=" + encodeURIComponent(d.imc_guid) : "");
    view.innerHTML = \`
      <div class="public-profile-shell">
        <a class="profile-back" href="#/directory">← بازگشت به دفترچه همکلاسی‌ها</a>
        <div class="doctor-card-page">
          <div class="bizcard doctor-business-card template-\${esc(d.card_template || "default")}">
            <span class="seal">✓<span class="cross">+</span></span>\${avatarHtml(d, "lg")}
            <h2>\${esc(d.full_name || "بدون نام")}</h2>\${d.specialty_main ? '<span class="stamp">' + esc(d.specialty_main) + "</span>" : ""}
            <p class="muted">\${esc(d.city || "")}</p>\${contactRowsHtml(d, Boolean(ME))}
            <div class="public-profile-actions"><button class="btn brass sm" id="publicVcardBtn">ذخیره شماره</button><a class="btn ghost sm" href="#/card/\${encodeURIComponent(d.public_id || d.id)}">کارت ویزیت قابل چاپ</a>\${officialUrl ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(officialUrl) + '">نظام پزشکی</a>' : ""}</div>
          </div>
          <div class="doctor-card-details">
            <h1>\${esc(d.full_name || "پروفایل پزشک")}</h1><p class="lead">\${esc(d.specialty_main || "")}</p>
            \${d.bio ? '<div class="detail-block"><h3>درباره</h3><p>' + esc(d.bio) + "</p></div>" : ""}
            <div class="detail-block"><h3>محل‌های کار</h3>\${(d.workLocations||[]).map(l => '<div class="loc-item"><b>' + esc(l.location_name) + '</b>' + (l.address ? ' — ' + esc(l.address) : '') + '</div>').join('') || '<p class="muted">ثبت نشده</p>'}</div>
            \${(d.socialLinks||[]).length ? '<div class="detail-block"><h3>راه‌های ارتباطی</h3><div class="social-links">' + d.socialLinks.map(s => socialLinkHtml(s)).join('') + '</div></div>' : ""}
            \${(d.extraFields||[]).length ? '<div class="detail-block"><h3>اطلاعات تکمیلی</h3>' + d.extraFields.map(f => '<div class="link-item"><b>' + esc(f.field_key) + '</b> — ' + esc(f.field_value) + '</div>').join('') + '</div>' : ""}
          </div>
        </div>
        \${d.photos && d.photos.length ? '<div class="profile-gallery-section"><h3>گالری تصاویر</h3>' + photoGalleryHtml(d.photos) + '</div>' + profileLightboxHtml(d.photos) : ''}
      </div>\`;
    const galleryPhotos = d.photos || [];
    const lightbox = $("profileLightbox");
    if (lightbox && galleryPhotos.length) {
      let galleryIndex = 0;
      const image = $("profileLightboxImage");
      const counter = lightbox.querySelector(".photo-counter");
      const showPhoto = (index) => { galleryIndex = (index + galleryPhotos.length) % galleryPhotos.length; image.src = "/api/assets/" + encodeURIComponent(galleryPhotos[galleryIndex].asset_key); counter.textContent = (galleryIndex + 1) + " / " + galleryPhotos.length; };
      const close = () => { lightbox.hidden = true; };
      view.querySelectorAll("[data-gallery-index]").forEach(b => b.onclick = () => { showPhoto(Number(b.dataset.galleryIndex)); lightbox.hidden = false; });
      lightbox.querySelector(".close-lightbox").onclick = close;
      lightbox.querySelector(".prev-lightbox").onclick = () => showPhoto(galleryIndex - 1);
      lightbox.querySelector(".next-lightbox").onclick = () => showPhoto(galleryIndex + 1);
      lightbox.onclick = (e) => { if (e.target === lightbox) close(); };
      let startX = 0;
      lightbox.querySelector(".profile-lightbox-inner").ontouchstart = e => { startX = e.changedTouches[0].clientX; };
      lightbox.querySelector(".profile-lightbox-inner").ontouchend = e => { const delta = e.changedTouches[0].clientX - startX; if (Math.abs(delta) > 40) showPhoto(galleryIndex + (delta > 0 ? -1 : 1)); };
      document.onkeydown = e => { if (lightbox.hidden) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") showPhoto(galleryIndex + 1); if (e.key === "ArrowRight") showPhoto(galleryIndex - 1); };
    }
    $("publicVcardBtn").onclick = () => { const vcf = "BEGIN:VCARD\\nVERSION:3.0\\nFN:" + d.full_name + "\\nTEL:" + (d.phone_public || d.phone || "") + (d.email ? "\\nEMAIL:" + d.email : "") + "\\nEND:VCARD"; const blob = new Blob([vcf], {type:"text/vcard"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=(d.full_name||"doctor")+".vcf"; a.click(); };
  } catch (e) { view.innerHTML = '<div class="empty">پروفایل پیدا نشد.</div>'; toast(e.message, true); }
}

async function viewBusinessCard(key){
  try {
    const d = await api("/api/doctors/" + encodeURIComponent(key));
    const theme = d.card_template === "dark" ? "dark" : d.card_template === "calm" ? "calm" : "default";
    const profileUrl = location.origin + "/d/" + (d.public_id || d.id);
    const council = d.roster_council_number || d.medical_council_number;
    view.innerHTML = \`
      <div class="print-card-page">
        <div>
          <div class="print-card-toolbar"><a class="btn ghost sm" href="#/profile-view/\${encodeURIComponent(d.public_id || d.id)}">بازگشت</a><button class="btn sm" id="printCardBtn">چاپ کارت</button></div>
          <article class="print-business-card \${theme}">
            <div class="print-card-top">\${avatarHtml(d, "lg")}<div><div class="print-card-name">\${esc(d.full_name || "")}</div><div class="print-card-specialty">\${esc(d.specialty_main || "")}</div></div></div>
            <div class="print-card-rule"></div>
            <div class="print-card-contact">\${d.city ? '<span>⌖ ' + esc(d.city) + '</span>' : ''}\${d.phone_public ? '<span>☎ ' + esc(displayPhone(d.phone_public)) + '</span>' : ''}\${d.email ? '<span>✉ ' + esc(d.email) + '</span>' : ''}\${council ? '<span>نظام پزشکی: ' + esc(council) + '</span>' : ''}</div>
            <div class="print-card-footer"><span>پزشک</span><span class="print-card-url">\${esc(profileUrl.replace(/^https?:\\/\\//, ""))}</span></div>
          </article>
        </div>
      </div>\`;
    $("printCardBtn").onclick = () => window.print();
  } catch (e) { view.innerHTML = '<div class="empty">پروفایل پیدا نشد.</div>'; toast(e.message, true); }
}

async function viewReferrals(){
  if (!TOKEN) { view.innerHTML = gatedNotice("معرفی‌نامه‌ها فقط برای اعضای واردشده قابل مشاهده‌ست."); return; }
  view.innerHTML = \`
    <div class="section-head">
      <div><h2>معرفی‌نامه‌ها</h2><p class="muted">وقتی یک پزشک خوب می‌شناسی، اینجا معرفیش کن.</p></div>
    </div>
    <div class="card" style="margin-bottom:24px">
      <h3 style="font-size:15px;margin-bottom:12px">➕ معرفی پزشک جدید</h3>
      <div class="form-grid">
        <label class="field">نام پزشک<input type="text" id="refName"></label>
        <label class="field">تخصص<input type="text" id="refSpecialty"></label>
        <label class="field">شهر<input type="text" id="refCity"></label>
        <label class="field">شماره تماس<input type="tel" id="refPhone"></label>
        <label class="field full">توضیح / تجربه‌ی شما<textarea id="refNotes"></textarea></label>
      </div>
      <button class="btn" style="margin-top:14px" id="addRefBtn">ثبت معرفی</button>
    </div>
    <div id="refList" class="grid-cards"><div class="empty">در حال بارگذاری…</div></div>\`;

  async function load(){
    try {
      const d = await api("/api/referrals");
      $("refList").innerHTML = d.referrals.length ? d.referrals.map(x => \`
        <article class="member-card">
          <h3>\${esc(x.recommended_name)}</h3>
          <div class="city">\${esc([x.specialty, x.city].filter(Boolean).join(" · ") || "بدون دسته‌بندی")}</div>
          <p class="muted" style="font-size:13px;margin-top:8px">\${esc(x.notes || "بدون توضیح")}</p>
          <div class="muted" style="font-size:12px;margin-top:8px">معرفی از طرف: \${esc(x.submitted_by || "—")}</div>
        </article>\`).join("") : '<div class="empty">هنوز معرفی‌نامه‌ای ثبت نشده.</div>';
    } catch (e) { toast(e.message, true); }
  }
  $("addRefBtn").onclick = async () => {
    const recommendedName = $("refName").value.trim();
    if (!recommendedName) return toast("نام پزشک رو وارد کن", true);
    try {
      await api("/api/referrals", { method: "POST", body: JSON.stringify({
        recommendedName, specialty: $("refSpecialty").value, city: $("refCity").value,
        phone: $("refPhone").value, notes: $("refNotes").value
      })});
      ["refName","refSpecialty","refCity","refPhone","refNotes"].forEach(id => $(id).value = "");
      toast("معرفی‌نامه ثبت شد"); load();
    } catch (e) { toast(e.message, true); }
  };
  load();
}

function gatedNotice(text){
  return '<div class="empty" style="margin-top:20px">🔒 ' + text + '<br><br><button class="btn" onclick="openLoginModal()">ورود</button></div>';
}

async function viewProfile(){
  if (!TOKEN) { view.innerHTML = gatedNotice("برای مدیریت پروفایلت باید وارد بشی."); return; }
  await loadMe();
  const d = ME;
  const profileScore = Math.round(([d.full_name,d.specialty_main,d.city,d.avatar_key,d.bio,d.phone_public,d.email].filter(Boolean).length / 7) * 100);
  view.innerHTML = \`
    <div class="section-head"><h2>پروفایل من</h2></div>
    <div class="profile-intro"><div><h3>کارت تو، روایت کوتاه توست</h3><div style="font-size:13px;color:#e5f2ef">هرچه اطلاعات کامل‌تر باشد، همکلاسی‌ها راحت‌تر پیدایت می‌کنند.</div></div><div class="profile-progress"><small><span>کامل بودن پروفایل</span><b style="color:#fff">\${profileScore}%</b></small><i><b style="width:\${profileScore}%"></b></i></div></div>
    <div class="status-banner \${d.status}">
      <span class="seal sm">\${d.status === "approved" ? "✓" : "…"}</span>
      <div>\${d.status === "approved" ? "عضویت تایید شده — پروفایلت برای اعضا و QR کارت ویزیت فعاله." : "در انتظار تایید مدیر گروه — به‌محض تایید، پروفایلت فعال می‌شه."}</div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="avatar-upload">
        \${avatarHtml(d, "lg")}
        <div><label class="iconbtn" title="افزودن عکس به گالری" for="photoFiles">＋</label><p class="muted" style="font-size:12.5px;margin:6px 0 0">افزودن عکس با دکمه +</p></div>
      </div>
      <div class="photo-manager"><input type="file" id="photoFiles" accept="image/png,image/jpeg,image/webp" multiple style="display:none"><small>یکی از عکس‌ها اصلی است و بقیه در صفحه پروفایل دیده می‌شوند.</small></div><div id="photoManagerList" class="photo-manager-list"></div>
      <div class="form-grid">
        <label class="field">نام نمایشی<input type="text" id="pfName" value="\${esc(d.full_name||"")}"><div class="identity-note">این نام روی کارت شما نمایش داده می‌شود. نام ثبت‌شده‌ی اولیه فقط برای مدیر قابل مشاهده است.</div></label>
        <label class="field">تخصص<input type="text" id="pfSpecialty" value="\${esc(d.specialty_main||"")}"></label>
        <label class="field">شهر<input type="text" id="pfCity" value="\${esc(d.city||"")}"></label>
        <label class="field">شماره عمومی (برای بیماران)<input type="tel" id="pfPhonePublic" value="\${esc(d.phone_public||"")}"></label>
        <label class="field">شماره نظام پزشکی<input type="text" id="pfCouncil" value="\${esc(d.medical_council_number||"")}"></label>
        <label class="field">ایمیل<input type="email" id="pfEmail" value="\${esc(d.email||"")}"></label>
        <label class="field">قالب کارت<select id="pfCardTemplate"><option value="default" \${d.card_template === "default" ? "selected" : ""}>دفترچه پزشکی</option><option value="calm" \${d.card_template === "calm" ? "selected" : ""}>آرام و دوستانه</option><option value="dark" \${d.card_template === "dark" ? "selected" : ""}>رسمی و تیره</option></select></label>
        <label class="field full">درباره من<textarea id="pfBio">\${esc(d.bio||"")}</textarea></label>
      </div>
      <button class="btn" style="margin-top:14px" id="saveProfileBtn">ذخیره‌ی پروفایل</button>
      <div class="profile-tools"><a class="btn ghost sm" href="#/profile-view/\${encodeURIComponent(d.public_id || d.id)}">مشاهده پروفایل عمومی</a><div class="qr-box"><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=\${encodeURIComponent(location.origin + "/d/" + (d.public_id || d.id))}" alt="QR کارت ویزیت"><small>QR لینک پروفایل</small></div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:15px">محل‌های کار</h3>
      <div id="locList"></div>
      <div class="list-add">
        <label class="field">نام مطب/بیمارستان<input type="text" id="locName"></label>
        <label class="field">آدرس<input type="text" id="locAddr"></label>
      </div>
      <div class="dayrow" id="dayToggles">\${DAYS.map(x => '<button type="button" class="daytoggle" data-k="' + x.k + '">' + x.label + "</button>").join("")}</div>
      <button class="btn sm" id="addLocBtn">افزودن محل کار</button>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:15px">شبکه‌های اجتماعی</h3>
      <div class="social-presets" id="socialPresets">
        <button type="button" class="social-preset" data-platform="WhatsApp">◉ واتساپ</button>
        <button type="button" class="social-preset" data-platform="Telegram">➤ تلگرام</button>
        <button type="button" class="social-preset" data-platform="Instagram">◎ اینستاگرام</button>
        <button type="button" class="social-preset" data-platform="LinkedIn">in لینکدین</button>
        <button type="button" class="social-preset" data-platform="Website">⌁ وب‌سایت</button>
      </div>
      <div id="socList"></div>
      <div class="list-add">
        <label class="field">پلتفرم (واتساپ/تلگرام/…)<input type="text" id="socPlatform"></label>
        <label class="field">آیدی یا لینک<input type="text" id="socValue"></label>
        <label class="field">سطح دسترسی
          <select id="socVis"><option value="members">فقط اعضا</option><option value="public">عمومی</option><option value="private">خصوصی</option></select>
        </label>
      </div>
      <button class="btn sm" id="addSocBtn">افزودن</button>
    </div>

    <div class="card">
      <h3 style="font-size:15px">فیلدهای تکمیلی (هرچیز دیگه)</h3>
      <div class="extra-presets" id="extraPresets"><button type="button" data-field-key="زبان‌ها">زبان‌ها</button><button type="button" data-field-key="زیرتخصص">زیرتخصص</button><button type="button" data-field-key="نحوه نوبت‌دهی">نحوه نوبت‌دهی</button><button type="button" data-field-key="علایق و خاطرات">علایق و خاطرات</button></div>
      <div id="fieldList"></div>
      <div class="list-add">
        <label class="field">عنوان<input type="text" id="fldKey"></label>
        <label class="field">مقدار<input type="text" id="fldValue"></label>
        <label class="field">سطح دسترسی
          <select id="fldVis"><option value="members">فقط اعضا</option><option value="public">عمومی</option><option value="private">خصوصی</option></select>
        </label>
      </div>
      <button class="btn sm" id="addFldBtn">افزودن</button>
    </div>\`;

  const selectedDays = new Set();
  $("dayToggles").querySelectorAll(".daytoggle").forEach(btn => {
    btn.onclick = () => { btn.classList.toggle("on"); selectedDays.has(btn.dataset.k) ? selectedDays.delete(btn.dataset.k) : selectedDays.add(btn.dataset.k); };
  });

  $("photoFiles").onchange = async () => {
    const files = Array.from($("photoFiles").files || []); if (!files.length) return;
    try {
      for (const f of files) { const form = new FormData(); form.append("file", f); const res = await fetch("/api/doctors/me/photos", { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: form }); const dd = await res.json(); if (!res.ok) throw new Error(dd.error || "آپلود عکس ناموفق بود"); }
      toast("عکس‌ها به گالری اضافه شدند"); await loadMe(); renderRoute();
    } catch (e) { toast(e.message, true); }
  };

  function renderPhotos(){
    $("photoManagerList").innerHTML = (ME.photos||[]).map(p => '<div class="item-row"><div style="display:flex;align-items:center;gap:9px"><img src="/api/assets/' + encodeURIComponent(p.asset_key) + '" style="width:48px;height:48px;object-fit:cover;border-radius:8px"><span>' + (p.is_primary ? 'عکس اصلی' : 'عکس گالری') + '</span></div><div class="photo-actions" style="display:flex;gap:6px">' + (!p.is_primary ? '<button class="btn ghost sm" data-photo-primary="' + p.id + '">اصلی کردن</button>' : '') + '<button class="btn danger sm" data-photo-delete="' + p.id + '">حذف</button></div></div>').join('') || '<p class="muted" style="font-size:12px;margin-top:10px">هنوز عکسی به گالری اضافه نشده.</p>';
    $("photoManagerList").querySelectorAll("[data-photo-primary]").forEach(b => b.onclick = async () => { try { await api("/api/doctors/me/photos/" + b.dataset.photoPrimary + "/primary", {method:"PATCH"}); await loadMe(); renderPhotos(); toast("عکس اصلی تغییر کرد"); } catch(e){toast(e.message,true)} });
    $("photoManagerList").querySelectorAll("[data-photo-delete]").forEach(b => b.onclick = async () => { if(!confirm("این عکس حذف شود؟")) return; try { await api("/api/doctors/me/photos/" + b.dataset.photoDelete, {method:"DELETE"}); await loadMe(); renderPhotos(); toast("عکس حذف شد"); } catch(e){toast(e.message,true)} });
  }

  $("saveProfileBtn").onclick = async () => {
    try {
      await api("/api/doctors/me/profile", { method: "PUT", body: JSON.stringify({
        fullName: $("pfName").value, specialtyMain: $("pfSpecialty").value, city: $("pfCity").value,
        phonePublic: $("pfPhonePublic").value, medicalCouncilNumber: $("pfCouncil").value,
        email: $("pfEmail").value, bio: $("pfBio").value, cardTemplate: $("pfCardTemplate").value
      })});
      toast("پروفایل ذخیره شد"); await loadMe(); renderChrome();
    } catch (e) { toast(e.message, true); }
  };

  function renderLoc(){
    $("locList").innerHTML = (ME.workLocations||[]).map(l => \`
      <div class="item-row"><div><b>\${esc(l.location_name)}</b>\${l.address ? " — " + esc(l.address) : ""}</div>
      <button class="btn danger sm" data-del-loc="\${l.id}">حذف</button></div>\`).join("") || '<p class="muted">هنوز چیزی اضافه نشده</p>';
    $("locList").querySelectorAll("[data-del-loc]").forEach(b => b.onclick = async () => {
      try { await api("/api/doctors/me/work-locations/" + b.dataset.delLoc, { method: "DELETE" }); await loadMe(); renderLoc(); toast("حذف شد"); }
      catch (e) { toast(e.message, true); }
    });
  }
  function renderSoc(){
    $("socList").innerHTML = (ME.socialLinks||[]).map(s => \`
      <div class="item-row"><div><b>\${esc(s.platform)}</b> — \${esc(s.value)} <span class="muted" style="font-size:12px">(\${VIS_LABEL[s.visibility]||s.visibility})</span></div>
      <button class="btn danger sm" data-del-soc="\${s.id}">حذف</button></div>\`).join("") || '<p class="muted">هنوز چیزی اضافه نشده</p>';
    $("socList").querySelectorAll("[data-del-soc]").forEach(b => b.onclick = async () => {
      try { await api("/api/doctors/me/social-links/" + b.dataset.delSoc, { method: "DELETE" }); await loadMe(); renderSoc(); toast("حذف شد"); }
      catch (e) { toast(e.message, true); }
    });
  }
  function renderFld(){
    $("fieldList").innerHTML = (ME.extraFields||[]).map(f => \`
      <div class="item-row"><div><b>\${esc(f.field_key)}</b> — \${esc(f.field_value)} <span class="muted" style="font-size:12px">(\${VIS_LABEL[f.visibility]||f.visibility})</span></div>
      <button class="btn danger sm" data-del-fld="\${f.id}">حذف</button></div>\`).join("") || '<p class="muted">هنوز چیزی اضافه نشده</p>';
    $("fieldList").querySelectorAll("[data-del-fld]").forEach(b => b.onclick = async () => {
      try { await api("/api/doctors/me/extra-fields/" + b.dataset.delFld, { method: "DELETE" }); await loadMe(); renderFld(); toast("حذف شد"); }
      catch (e) { toast(e.message, true); }
    });
  }
  $("socialPresets").querySelectorAll("[data-platform]").forEach(btn => btn.onclick = () => {
    const existing = (ME.socialLinks || []).find(s => String(s.platform).toLowerCase() === btn.dataset.platform.toLowerCase());
    $("socPlatform").value = btn.dataset.platform;
    $("socValue").value = existing ? existing.value : "";
    $("socVis").value = existing?.visibility || "public";
    $("socValue").focus();
  });
  $("extraPresets").querySelectorAll("[data-field-key]").forEach(btn => btn.onclick = () => {
    $("fldKey").value = btn.dataset.fieldKey;
    const existing = (ME.extraFields || []).find(f => f.field_key === btn.dataset.fieldKey);
    $("fldValue").value = existing ? existing.field_value : "";
    $("fldValue").focus();
  });
  renderLoc(); renderSoc(); renderFld(); renderPhotos();

  $("addLocBtn").onclick = async () => {
    const locationName = $("locName").value.trim();
    if (!locationName) return toast("نام محل کار رو وارد کن", true);
    try {
      await api("/api/doctors/me/work-locations", { method: "POST", body: JSON.stringify({
        locationName, address: $("locAddr").value, daysOfWeek: Array.from(selectedDays)
      })});
      $("locName").value = ""; $("locAddr").value = ""; selectedDays.clear();
      $("dayToggles").querySelectorAll(".daytoggle").forEach(b => b.classList.remove("on"));
      await loadMe(); renderLoc(); toast("اضافه شد");
    } catch (e) { toast(e.message, true); }
  };
  $("addSocBtn").onclick = async () => {
    const platform = $("socPlatform").value.trim(), value = $("socValue").value.trim();
    if (!platform || !value) return toast("پلتفرم و مقدار رو وارد کن", true);
    try {
      await api("/api/doctors/me/social-links", { method: "POST", body: JSON.stringify({ platform, value, visibility: $("socVis").value })});
      $("socPlatform").value = ""; $("socValue").value = "";
      await loadMe(); renderSoc(); toast("اضافه شد");
    } catch (e) { toast(e.message, true); }
  };
  $("addFldBtn").onclick = async () => {
    const key = $("fldKey").value.trim(), value = $("fldValue").value.trim();
    if (!key) return toast("عنوان فیلد رو وارد کن", true);
    try {
      await api("/api/doctors/me/extra-fields", { method: "POST", body: JSON.stringify({ key, value, visibility: $("fldVis").value })});
      $("fldKey").value = ""; $("fldValue").value = "";
      await loadMe(); renderFld(); toast("اضافه شد");
    } catch (e) { toast(e.message, true); }
  };
}

async function viewAdmin(){
  if (!ME || ME.role !== "admin") { view.innerHTML = gatedNotice("این بخش فقط برای مدیر گروهه."); return; }
  view.innerHTML = \`
    <div class="section-head"><h2>مدیریت اعضا</h2></div>
    <h3 style="font-size:15px">در انتظار تایید</h3>
    <div class="pending-grid" id="pendingGrid"><div class="empty">در حال بارگذاری…</div></div>

    <div class="section-head" style="margin-top:10px">
      <h3 style="font-size:15px">همه‌ی اعضا</h3>
      <div style="display:flex;gap:8px">
        <input type="search" id="adminSearch" placeholder="جست‌وجو…" style="width:200px">
        <select id="adminStatus"><option value="">همه وضعیت‌ها</option><option value="approved">تایید‌شده</option><option value="pending">در انتظار</option><option value="rejected">رد‌شده</option></select>
      </div>
    </div>
    <div class="admin-table"><table id="adminTable"><thead><tr><th>نام</th><th>نام اصلی</th><th>شماره</th><th>وضعیت</th><th>نقش</th><th>عملیات</th></tr></thead><tbody></tbody></table></div>
    <div class="section-head" style="margin-top:30px"><h3 style="font-size:15px">فهرست همکلاسی‌ها و شماره موبایل</h3><input type="search" id="rosterSearch" placeholder="جست‌وجوی نام یا شماره…" style="width:240px"></div>
    <div class="admin-table"><table id="rosterTable"><thead><tr><th>نام اصلی</th><th>رشته</th><th>شماره دانشجویی</th><th>شماره نظام</th><th>موبایل</th><th>عملیات</th></tr></thead><tbody></tbody></table></div>\`;

  async function loadPending(){
    try {
      const d = await api("/api/admin/pending");
      $("pendingGrid").innerHTML = d.pending.length ? d.pending.map(x => \`
        <div class="pending-card">
          <b>\${esc(x.full_name || "بدون نام")}</b><div class="muted" style="font-size:13px">\${esc(displayPhone(x.phone))}</div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn sm brass" data-approve="\${x.id}">🖋 زدن مهر تایید</button>
            <button class="btn sm danger" data-reject="\${x.id}">رد</button>
          </div>
        </div>\`).join("") : '<div class="empty">کسی در صف تایید نیست 🎉</div>';
      $("pendingGrid").querySelectorAll("[data-approve]").forEach(b => b.onclick = async () => {
        try { await api("/api/admin/approve/" + b.dataset.approve, { method: "POST" }); toast("تایید شد"); loadPending(); loadTable(); }
        catch (e) { toast(e.message, true); }
      });
      $("pendingGrid").querySelectorAll("[data-reject]").forEach(b => b.onclick = async () => {
        try { await api("/api/admin/reject/" + b.dataset.reject, { method: "POST" }); toast("رد شد"); loadPending(); loadTable(); }
        catch (e) { toast(e.message, true); }
      });
    } catch (e) { toast(e.message, true); }
  }

  async function loadTable(){
    const q = new URLSearchParams();
    if ($("adminSearch").value) q.set("q", $("adminSearch").value);
    if ($("adminStatus").value) q.set("status", $("adminStatus").value);
    try {
      const d = await api("/api/admin/doctors?" + q.toString());
      document.querySelector("#adminTable tbody").innerHTML = d.doctors.map(x => \`
        <tr><td>\${esc(x.full_name || "—")}</td><td>\${esc(x.official_name || "—")}\${x.name_changed ? '<span class="status-pill pending" style="margin-right:5px">ویرایش شده</span>' : ''}</td><td>\${esc(displayPhone(x.phone))}</td>
        <td><span class="status-pill \${x.status}">\${x.status === "approved" ? "تایید‌شده" : x.status === "pending" ? "در انتظار" : "رد‌شده"}</span></td>
        <td>\${x.role === "admin" ? "مدیر" : "عضو"}</td>
        <td><button class="btn sm ghost" data-role="\${x.id}" data-cur="\${x.role}">\${x.role === "admin" ? "حذف نقش مدیر" : "مدیر کردن"}</button><button class="btn sm ghost" data-doctor-imc="\${x.id}" data-imc-guid="\${esc(x.imc_guid || "")}">نظام پزشکی</button></td></tr>\`
      ).join("") || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">موردی پیدا نشد</td></tr>';
      document.querySelectorAll("[data-role]").forEach(b => b.onclick = async () => {
        const newRole = b.dataset.cur === "admin" ? "member" : "admin";
        try { await api("/api/admin/doctors/" + b.dataset.role + "/role", { method: "PATCH", body: JSON.stringify({ role: newRole })}); toast("نقش به‌روزرسانی شد"); loadTable(); }
        catch (e) { toast(e.message, true); }
      });
      document.querySelectorAll("[data-doctor-imc]").forEach(b => b.onclick = async () => {
        const guid = prompt("GUID پروفایل نظام پزشکی (اختیاری):", b.dataset.imcGuid || "");
        if (guid === null) return;
        try { await api("/api/admin/doctors/" + encodeURIComponent(b.dataset.doctorImc) + "/imc", { method: "PATCH", body: JSON.stringify({ imcGuid: guid }) }); toast("لینک نظام پزشکی ذخیره شد"); loadTable(); }
        catch (e) { toast(e.message, true); }
      });
    } catch (e) { toast(e.message, true); }
  }
  $("adminSearch").onkeydown = (e) => { if (e.key === "Enter") loadTable(); };
  $("adminStatus").onchange = loadTable;
  async function loadRoster(){ try { const q=$("rosterSearch").value.trim(); const d=await api("/api/admin/roster"+(q?"?q="+encodeURIComponent(q):"")); document.querySelector("#rosterTable tbody").innerHTML=d.roster.map(x=>\`<tr><td>\${esc(x.official_name)}</td><td>\${esc(x.field||"—")}</td><td>\${esc(x.student_number||"—")}</td><td>\${esc(x.council_number||"—")}</td><td>\${esc(displayPhone(x.phone)||"—")}</td><td><button class="btn sm ghost" data-roster-phone="\${esc(x.id)}">\${x.phone?"تغییر شماره":"ثبت شماره"}</button><button class="btn sm ghost" data-roster-imc="\${esc(x.id)}">ویرایش نظام</button></td></tr>\`).join(""); $("rosterTable").querySelectorAll("[data-roster-phone]").forEach(b=>b.onclick=async()=>{const phone=prompt("شماره موبایل را وارد کنید:");if(!phone)return;try{await api("/api/admin/roster/"+encodeURIComponent(b.dataset.rosterPhone)+"/phone",{method:"PATCH",body:JSON.stringify({phone})});toast("شماره ذخیره شد");loadRoster();loadTable()}catch(e){toast(e.message,true)}}); $("rosterTable").querySelectorAll("[data-roster-imc]").forEach(b=>b.onclick=async()=>{const x=d.roster.find(r=>String(r.id)===String(b.dataset.rosterImc)); const councilNumber=prompt("شماره نظام پزشکی:",x.council_number||""); if(councilNumber===null)return; const imcGuid=prompt("GUID نظام پزشکی (اختیاری):",x.imc_guid||""); if(imcGuid===null)return; try{await api("/api/admin/roster/"+encodeURIComponent(x.id)+"/imc",{method:"PATCH",body:JSON.stringify({councilNumber,imcGuid})});toast("اطلاعات نظام پزشکی ذخیره شد");loadRoster();loadTable()}catch(e){toast(e.message,true)}}); } catch(e){toast(e.message,true)} }
  $("rosterSearch").onkeydown=e=>{if(e.key==="Enter")loadRoster()};
  loadPending(); loadTable(); loadRoster();
}

/* ============================================================
 * router
 * ============================================================ */
function currentRoute(){
  const hash = (location.hash || "#/home").slice(1);
  const [path] = hash.split("?");
  return { path: path.replace(/^\\//, "") };
}
async function renderRoute(){
  const { path } = currentRoute();
  renderChrome();
  if (path === "home" || path === "") return viewHome();
  if (path === "directory") return viewDirectory();
  if (path.startsWith("profile-view/")) return viewPublicProfile(decodeURIComponent(path.slice("profile-view/".length)));
  if (path.startsWith("card/")) return viewBusinessCard(decodeURIComponent(path.slice("card/".length)));
  if (path === "requests") return viewRequests();
  if (path.startsWith("request/")) return viewRequestDetail(decodeURIComponent(path.slice("request/".length)));
  if (path === "referrals") return viewReferrals();
  if (path === "profile") return viewProfile();
  if (path === "admin") return viewAdmin();
  view.innerHTML = '<div class="empty" style="margin-top:40px">این صفحه پیدا نشد.</div>';
}
async function render(){ renderChrome(); await renderRoute(); }
window.addEventListener("hashchange", renderRoute);
window.openLoginModal = openLoginModal;

(async function init(){
  await loadMe();
  render();
})();
</script>
</body>
</html>`;

ui.get("/", (c) => c.html(PAGE));
ui.get("/*", (c) => c.html(PAGE)); // hash-based routing — any /app/* path serves the same shell

export default ui;
