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
html{scroll-behavior:smooth}
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
.status-banner{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;margin-bottom:22px}
.status-banner.pending{background:#fbe9d0;border:1px solid #e9c98a}
.status-banner.approved{background:#e9efe3;border:1px solid #c7d6b8}
.list-add{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:14px}
.list-add label.field{flex:1;min-width:140px}
.dayrow{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 14px}
.daytoggle{padding:6px 12px;border-radius:999px;border:1.4px solid var(--line);background:var(--card);font-size:12.5px;cursor:pointer}
.daytoggle.on{background:var(--oxblood);color:#fff8ee;border-color:var(--oxblood)}
.item-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px}

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
  .form-grid{grid-template-columns:1fr}
  .tabs{order:3;width:100%;justify-content:flex-start;overflow-x:auto}
  .topbar-inner{flex-wrap:wrap}
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
function avatarHtml(doctor, size){
  const cls = "avatar " + size;
  if (doctor.avatar_key) {
    return '<img class="' + cls + '" src="/api/assets/' + encodeURIComponent(doctor.avatar_key) + '" alt="' + esc(doctor.full_name) + '">';
  }
  return '<div class="' + cls + '" style="background:' + tintFor(doctor.full_name) + '">' + esc(initials(doctor.full_name)) + "</div>";
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
}

/* ============================================================
 * top bar / tabs
 * ============================================================ */
function renderChrome(){
  const route = currentRoute();
  const tabs = [
    ["#/home", "خانه"],
    ["#/directory", "دفترچه"],
    ["#/referrals", "معرفی‌نامه‌ها"],
  ];
  if (TOKEN) tabs.push(["#/profile", "پروفایل من"]);
  if (ME && ME.role === "admin") tabs.push(["#/admin", "مدیریت"]);

  $("tabs").innerHTML = tabs.map(([href, label]) =>
    '<a class="tab' + (route.path === href.slice(1) ? " active" : "") + (label === "مدیریت" ? " admin" : "") + '" href="' + href + '">' + label + "</a>"
  ).join("");

  $("topActions").innerHTML = TOKEN
    ? '<span class="who">' + (ME ? esc(ME.full_name || "بدون نام") : "…") + '</span><button class="iconbtn" id="logoutBtn" title="خروج">⎋</button>'
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
    <div class="pulse-divider" style="margin:6px 0 0"></div>\`;
  $("heroLoginBtn").onclick = openLoginModal;
  try {
    const d = await api("/api/doctors");
    $("heroStat").innerHTML = '<b>' + d.doctors.length + '</b> پزشک عضو این دورهمی هستند';
  } catch { $("heroStat").textContent = ""; }
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
  load();
}

function contactRowsHtml(d, canSeePrivate){
  const rows = [];
  if (d.phone_public) rows.push(["☎", "شماره عمومی", d.phone_public]);
  if (canSeePrivate && d.phone) rows.push(["📱", "شماره شخصی", d.phone]);
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
    const url = location.origin + "/d/" + d.id;
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
                <button class="btn ghost sm" style="flex:1" id="copyLinkBtn">کپی لینک پروفایل</button>
                <button class="btn brass sm" id="vcardBtn">افزودن مخاطب</button>
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
                \${(d.socialLinks||[]).map(s => '<div class="link-item"><b>' + esc(s.platform) + "</b> — " + esc(s.value) + "</div>").join("") || '<p class="muted">ثبت نشده</p>'}
              </div>
              \${(d.extraFields||[]).length ? '<div class="detail-block"><h3>اطلاعات تکمیلی</h3>' + d.extraFields.map(f => '<div class="link-item"><b>' + esc(f.field_key) + "</b> — " + esc(f.field_value) + "</div>").join("") + "</div>" : ""}
            </div>
          </div>
        </div>
      </div>\`;
    $("docClose").onclick = () => modalRoot.innerHTML = "";
    $("docBackdrop").onclick = (e) => { if (e.target.id === "docBackdrop") modalRoot.innerHTML = ""; };
    $("copyLinkBtn").onclick = async () => {
      try { await navigator.clipboard.writeText(url); toast("لینک کپی شد"); }
      catch { toast("کپی خودکار ممکن نبود؛ لینک: " + url, true); }
    };
    $("vcardBtn").onclick = () => {
      const vcf = "BEGIN:VCARD\\nVERSION:3.0\\nFN:" + d.full_name + "\\nTEL:" + (d.phone_public || d.phone || "") +
        (d.email ? "\\nEMAIL:" + d.email : "") + "\\nEND:VCARD";
      const blob = new Blob([vcf], { type: "text/vcard" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = (d.full_name || "doctor") + ".vcf"; a.click();
    };
  } catch (e) { toast(e.message, true); }
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
  view.innerHTML = \`
    <div class="section-head"><h2>پروفایل من</h2></div>
    <div class="status-banner \${d.status}">
      <span class="seal sm">\${d.status === "approved" ? "✓" : "…"}</span>
      <div>\${d.status === "approved" ? "عضویت تایید شده — پروفایلت برای اعضا و QR کارت ویزیت فعاله." : "در انتظار تایید مدیر گروه — به‌محض تایید، پروفایلت فعال می‌شه."}</div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="avatar-upload">
        \${avatarHtml(d, "lg")}
        <div>
          <label class="btn sm brass" for="avatarFile">تغییر عکس پروفایل</label>
          <input type="file" id="avatarFile" accept="image/png,image/jpeg,image/webp" style="display:none">
          <p class="muted" style="font-size:12.5px;margin:6px 0 0">JPG یا PNG، حداکثر ۳ مگابایت</p>
        </div>
      </div>
      <div class="form-grid">
        <label class="field">نام کامل<input type="text" id="pfName" value="\${esc(d.full_name||"")}"></label>
        <label class="field">تخصص<input type="text" id="pfSpecialty" value="\${esc(d.specialty_main||"")}"></label>
        <label class="field">شهر<input type="text" id="pfCity" value="\${esc(d.city||"")}"></label>
        <label class="field">شماره عمومی (برای بیماران)<input type="tel" id="pfPhonePublic" value="\${esc(d.phone_public||"")}"></label>
        <label class="field">شماره نظام پزشکی<input type="text" id="pfCouncil" value="\${esc(d.medical_council_number||"")}"></label>
        <label class="field">ایمیل<input type="email" id="pfEmail" value="\${esc(d.email||"")}"></label>
        <label class="field full">درباره من<textarea id="pfBio">\${esc(d.bio||"")}</textarea></label>
      </div>
      <button class="btn" style="margin-top:14px" id="saveProfileBtn">ذخیره‌ی پروفایل</button>
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

  $("avatarFile").onchange = async () => {
    const f = $("avatarFile").files[0]; if (!f) return;
    const form = new FormData(); form.append("file", f);
    try {
      const res = await fetch("/api/doctors/me/avatar", { method: "POST", headers: { Authorization: "Bearer " + TOKEN }, body: form });
      const dd = await res.json(); if (!res.ok) throw new Error(dd.error || "آپلود ناموفق بود");
      toast("عکس پروفایل ذخیره شد"); await loadMe(); renderRoute();
    } catch (e) { toast(e.message, true); }
  };

  $("saveProfileBtn").onclick = async () => {
    try {
      await api("/api/doctors/me/profile", { method: "PUT", body: JSON.stringify({
        fullName: $("pfName").value, specialtyMain: $("pfSpecialty").value, city: $("pfCity").value,
        phonePublic: $("pfPhonePublic").value, medicalCouncilNumber: $("pfCouncil").value,
        email: $("pfEmail").value, bio: $("pfBio").value
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
  renderLoc(); renderSoc(); renderFld();

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
    <div class="admin-table"><table id="adminTable"><thead><tr><th>نام</th><th>شماره</th><th>وضعیت</th><th>نقش</th><th>عملیات</th></tr></thead><tbody></tbody></table></div>\`;

  async function loadPending(){
    try {
      const d = await api("/api/admin/pending");
      $("pendingGrid").innerHTML = d.pending.length ? d.pending.map(x => \`
        <div class="pending-card">
          <b>\${esc(x.full_name || "بدون نام")}</b><div class="muted" style="font-size:13px">\${esc(x.phone)}</div>
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
        <tr><td>\${esc(x.full_name || "—")}</td><td>\${esc(x.phone)}</td>
        <td><span class="status-pill \${x.status}">\${x.status === "approved" ? "تایید‌شده" : x.status === "pending" ? "در انتظار" : "رد‌شده"}</span></td>
        <td>\${x.role === "admin" ? "مدیر" : "عضو"}</td>
        <td><button class="btn sm ghost" data-role="\${x.id}" data-cur="\${x.role}">\${x.role === "admin" ? "حذف نقش مدیر" : "مدیر کردن"}</button></td></tr>\`
      ).join("") || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">موردی پیدا نشد</td></tr>';
      document.querySelectorAll("[data-role]").forEach(b => b.onclick = async () => {
        const newRole = b.dataset.cur === "admin" ? "member" : "admin";
        try { await api("/api/admin/doctors/" + b.dataset.role + "/role", { method: "PATCH", body: JSON.stringify({ role: newRole })}); toast("نقش به‌روزرسانی شد"); loadTable(); }
        catch (e) { toast(e.message, true); }
      });
    } catch (e) { toast(e.message, true); }
  }
  $("adminSearch").onkeydown = (e) => { if (e.key === "Enter") loadTable(); };
  $("adminStatus").onchange = loadTable;
  loadPending(); loadTable();
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
