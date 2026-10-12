import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, RefreshCw, Settings, Bell, BellOff, Volume2, Play, Square, Upload, X, Wifi, WifiOff } from "lucide-react";
import { syncPushSubscription } from "../lib/push";

interface PrayerData {
  date: string; method: string;
  timings: Record<string, string>; error: string | null;
}
interface Props { accent?: string; compact?: boolean }

const PRAYERS = [
  { key:"Bomdod", ar:"Fajr",    icon:"🌅", color:"#A78BFA" },
  { key:"Quyosh", ar:"Sunrise", icon:"🌄", color:"#FFD166" },
  { key:"Peshin", ar:"Dhuhr",   icon:"☀️", color:"#FF6B35" },
  { key:"Asr",    ar:"Asr",     icon:"🌤", color:"#F59E0B" },
  { key:"Shom",   ar:"Maghrib", icon:"🌇", color:"#F472B6" },
  { key:"Xufton", ar:"Isha",    icon:"🌙", color:"#60A5FA" },
];

const UZ_CITIES = [
  "Toshkent","Samarqand","Buxoro","Namangan","Andijon",
  "Farg'ona","Nukus","Qarshi","Termiz","Navoiy","Urgench","Jizzax",
];

// ─── Sound catalog ────────────────────────────────────────────────────────────
const SOUND_GROUPS = [
  {
    label: "🕌 Haqiqiy Azonlar",
    sounds: [
      { id:"azan-makka",    label:"Makka Mukarrama azoni",        remote: true },
      { id:"azan-madina",   label:"Madina Munawwara azoni",       remote: true },
      { id:"azan-alafasy",  label:"Mishary Roshid Alafasiy",      remote: true },
      { id:"azan-abdsamad", label:"Abdulbasit Abdussamad",        remote: true },
      { id:"azan-turkey",   label:"Turk Diyanet uslubi",          remote: true },
      { id:"azan-egypt",    label:"Misr Davlat azoni",            remote: true },
    ],
  },
  {
    label: "📱 Notification Ringtonlar",
    sounds: [
      { id:"ring-bell",     label:"Qo'ng'iroq (Bell)",             remote: true },
      { id:"ring-chime",    label:"Chime (Mayin qo'ng'iroq)",      remote: true },
      { id:"ring-positive", label:"Ijobiy signal",                 remote: true },
      { id:"ring-pop",      label:"Pop alert",                     remote: true },
      { id:"ring-ding",     label:"Ding signal",                   remote: true },
      { id:"ring-soft",     label:"Yumshoq signal",                remote: true },
      { id:"ring-digital",  label:"Raqamli biip",                  remote: true },
    ],
  },
  {
    label: "🔊 Sintetik (oflayn)",
    sounds: [
      { id:"synth-azan",  label:"Azon melodiyasi (sintetik)",    remote: false },
      { id:"synth-bell",  label:"Qo'ng'iroq (sintetik)",         remote: false },
      { id:"synth-ring",  label:"Jiringlash (sintetik)",         remote: false },
      { id:"synth-soft",  label:"Yumshoq ohang (sintetik)",      remote: false },
      { id:"synth-beep",  label:"Biip (sintetik)",               remote: false },
    ],
  },
  {
    label: "➕ Boshqa",
    sounds: [
      { id:"custom",      label:"📂 O'z faylim",                  remote: false },
      { id:"none",        label:"🔇 Jim (faqat bildirishnoma)",    remote: false },
    ],
  },
];

const ALL_SOUNDS = SOUND_GROUPS.flatMap(g => g.sounds);

function soundLabel(id: string) {
  return ALL_SOUNDS.find(s => s.id === id)?.label ?? id;
}

// ─── Web Audio synthesis (oflayn fallback) ────────────────────────────────────
function getCtx() {
  return new (window.AudioContext || (window as any).webkitAudioContext)() as AudioContext;
}
function tone(ctx: AudioContext, freq: number, t: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.06, dur * 0.15));
  g.gain.setValueAtTime(vol, t + Math.max(0, dur - 0.12));
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.start(t); osc.stop(t + dur + 0.01);
}
function synthAzan(vol: number) {
  const ctx = getCtx(); const t0 = ctx.currentTime;
  const seq = [[293,.55],[349,.45],[392,.5],[440,.75],[466,.35],[440,.45],[392,.6],[349,.4],[293,1.1]];
  let t = t0;
  seq.forEach(([f,d]) => { tone(ctx,f,t,d,vol*.55); t += d+.06; });
  t += .5;
  seq.forEach(([f,d]) => { tone(ctx,f,t,d,vol*.55); t += d+.06; });
}
function synthBell(vol: number) {
  const ctx = getCtx(); const t = ctx.currentTime;
  [[800,.45],[1200,.3],[1600,.2]].forEach(([f,v],i) => tone(ctx,f,t+i*.08,1.8,vol*(v as number)));
  setTimeout(() => { const t2=ctx.currentTime; [[800,.4],[1200,.25]].forEach(([f,v],i) => tone(ctx,f,t2+i*.08,1.6,vol*(v as number))); }, 1900);
}
function synthRing(vol: number) {
  const ctx = getCtx(); const t = ctx.currentTime;
  for (let i=0;i<4;i++) { tone(ctx,880,t+i*.55,.22,vol*.5); tone(ctx,1100,t+i*.55+.25,.22,vol*.5); }
}
function synthSoft(vol: number) {
  const ctx = getCtx(); const t = ctx.currentTime;
  [[528,.8],[660,.6],[792,.5],[1056,.4]].forEach(([f,v],i) => tone(ctx,f,t+i*.22,0.9,vol*(v as number)));
}
function synthBeep(vol: number) {
  const ctx = getCtx(); const t = ctx.currentTime;
  tone(ctx,1000,t,.25,vol*.6); tone(ctx,1000,t+.35,.25,vol*.6); tone(ctx,1200,t+.7,.35,vol*.6);
}

// ─── Audio player ─────────────────────────────────────────────────────────────
let activeAudio: HTMLAudioElement | null = null;

function stopCurrent() {
  if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; activeAudio = null; }
}

function playRemote(id: string, vol: number, onError?: () => void): HTMLAudioElement {
  stopCurrent();
  const audio = new Audio(`/api/adhan?id=${encodeURIComponent(id)}`);
  audio.volume = Math.max(0, Math.min(1, vol));
  audio.play().catch(() => onError?.());
  activeAudio = audio;
  return audio;
}

function playSound(id: string, vol: number, customUrl?: string) {
  stopCurrent();
  if (id === "none") return;
  if (id === "custom") {
    if (!customUrl) return;
    const a = new Audio(customUrl); a.volume = vol; a.play().catch(()=>{});
    activeAudio = a; return;
  }
  if (id.startsWith("azan-") || id.startsWith("ring-")) {
    playRemote(id, vol, () => {
      // fallback to synth if network fails
      if (id.startsWith("azan-")) synthAzan(vol);
      else synthBell(vol);
    });
    return;
  }
  // synth
  if (id === "synth-azan")  synthAzan(vol);
  else if (id === "synth-bell")  synthBell(vol);
  else if (id === "synth-ring")  synthRing(vol);
  else if (id === "synth-soft")  synthSoft(vol);
  else if (id === "synth-beep")  synthBeep(vol);
}

// ─── Settings persistence ─────────────────────────────────────────────────────
interface PrayerCfg { enabled: boolean; sound: string }
interface Settings  { vol: number; perPrayer: Record<string, PrayerCfg> }

function defaultSettings(): Settings {
  return {
    vol: 0.8,
    perPrayer: Object.fromEntries(
      PRAYERS.map(p => [p.key, { enabled: p.key !== "Quyosh", sound: "azan-makka" }])
    ),
  };
}
function loadSettings(): Settings {
  try {
    const v = JSON.parse(localStorage.getItem("sp_prayer_cfg") || "null");
    if (v?.vol !== undefined && v?.perPrayer) return v as Settings;
  } catch {}
  return defaultSettings();
}
function saveCfg(s: Settings) { localStorage.setItem("sp_prayer_cfg", JSON.stringify(s)); }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseTime(timeStr: string): Date | null {
  const clean = timeStr.replace(/\s*\(.*\)/, "").trim();
  const [h, m] = clean.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function countdown(target: Date): string {
  const diff = Math.floor((target.getTime() - Date.now()) / 1000);
  if (diff <= 0) return "Vaqti o'tdi";
  const h = Math.floor(diff / 3600);
  const mn = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h > 0 ? h + "s " : ""}${mn}d ${String(s).padStart(2, "0")}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PrayerWidget({ accent = "#c084fc", compact }: Props) {
  const [city, setCity]           = useState(() => localStorage.getItem("sp_prayer_city") || "Toshkent");
  const [cityInput, setCityInput] = useState(city);
  const [now, setNow]             = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [cfg, setCfg]             = useState<Settings>(loadSettings);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() =>
    "Notification" in window ? Notification.permission : "denied"
  );
  const [pushState, setPushState] = useState<"idle" | "syncing" | "subscribed" | "unsupported" | "error">("idle");
  const [pushError, setPushError] = useState("");
  const [firedToday, setFiredToday] = useState<Set<string>>(new Set());
  const [customFile, setCustomFile] = useState("");
  const [playing, setPlaying]     = useState<string | null>(null);
  const customUrlRef  = useRef<string>("");
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const playingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // midnight reset
  useEffect(() => {
    const ms = new Date().setHours(24,0,0,0) - Date.now();
    const t = setTimeout(() => setFiredToday(new Set()), ms);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading, refetch, isError } = useQuery<PrayerData>({
    queryKey: ["/api/prayer", city],
    queryFn:  () => fetch(`/api/prayer?city=${encodeURIComponent(city)}`).then(r => r.json()),
    staleTime: 30 * 60_000,
  });

  const prayers = data?.timings
    ? PRAYERS.map(p => ({ ...p, time: data.timings[p.key] || "--:--", date: parseTime(data.timings[p.key] || "") }))
    : PRAYERS.map(p => ({ ...p, time: "--:--", date: null }));

  const upcoming   = prayers.find(p => p.date && p.date > now);
  const passed     = prayers.filter(p => p.date && p.date <= now);
  const lastPassed = passed[passed.length - 1];

  const pct = (() => {
    if (!upcoming || !lastPassed?.date) return 0;
    const total   = upcoming.date!.getTime() - lastPassed.date.getTime();
    const elapsed = now.getTime() - lastPassed.date.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  })();

  // Prayer checker
  useEffect(() => {
    if (!data?.timings) return;
    const check = () => {
      const nowMs = Date.now();
      prayers.forEach(p => {
        if (!p.date || firedToday.has(p.key)) return;
        const pcfg = cfg.perPrayer[p.key];
        if (!pcfg?.enabled) return;
        const diff = p.date.getTime() - nowMs;
        if (diff >= -5000 && diff < 30000) {
          playSound(pcfg.sound, cfg.vol, customUrlRef.current);
          if (notifPerm === "granted" && pushState !== "subscribed") {
            try {
              new Notification(`🕌 ${p.key} namozi`, {
                body: `${p.icon} Vaqt: ${p.time.slice(0,5)} — Alloh qabul qilsin!`,
                icon: "/favicon.png",
              });
            } catch {}
          }
          setFiredToday(prev => new Set([...prev, p.key]));
        }
      });
    };
    const iv = setInterval(check, 10000); check();
    return () => clearInterval(iv);
  }, [data?.timings, cfg, notifPerm, firedToday, pushState]);

  const updateCfg = useCallback((upd: (p: Settings) => Settings) => {
    setCfg(prev => { const next = upd(prev); saveCfg(next); return next; });
  }, []);
  const setPrayerCfg = (key: string, field: keyof PrayerCfg, val: any) =>
    updateCfg(prev => ({ ...prev, perPrayer: { ...prev.perPrayer, [key]: { ...prev.perPrayer[key], [field]: val } } }));

  const enabledPrayerKeys = PRAYERS.filter(p => cfg.perPrayer[p.key]?.enabled).map(p => p.key);
  const syncPush = useCallback(async () => {
    if (notifPerm !== "granted") return;
    setPushState("syncing");
    try {
      const result = await syncPushSubscription(city, enabledPrayerKeys);
      if (result.ok) {
        setPushState("subscribed");
        setPushError("");
      } else {
        setPushState(result.reason?.includes("qo‘llab-quvvatlamaydi") ? "unsupported" : "error");
        setPushError(result.reason || "Web Push yoqilmadi");
      }
    } catch (error) {
      setPushState("error");
      setPushError((error as Error).message || "Web Push serveriga ulanib bo‘lmadi");
    }
  }, [city, enabledPrayerKeys.join("|"), notifPerm]);

  useEffect(() => {
    if (notifPerm === "granted") {
      void syncPush();
    } else {
      setPushState("idle");
    }
  }, [notifPerm, syncPush]);

  const applyCity = () => {
    const c = cityInput.trim() || "Toshkent";
    setCity(c); localStorage.setItem("sp_prayer_city", c);
  };
  const requestNotif = async () => {
    if (!("Notification" in window)) {
      setPushState("unsupported");
      setPushError("Bu brauzer bildirishnomalarni qo‘llab-quvvatlamaydi");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    customUrlRef.current = url;
    setCustomFile(f.name);
  };

  // Preview with stop
  const previewSound = (id: string) => {
    if (playing === id) {
      stopCurrent(); setPlaying(null);
      if (playingTimerRef.current) clearTimeout(playingTimerRef.current);
      return;
    }
    playSound(id, cfg.vol, customUrlRef.current);
    setPlaying(id);
    if (playingTimerRef.current) clearTimeout(playingTimerRef.current);
    playingTimerRef.current = setTimeout(() => setPlaying(null), 12000);
  };

  // ── Styles helpers ──
  const cardStyle: React.CSSProperties = {
    borderRadius:18, border:`1px solid ${accent}33`,
    background:`linear-gradient(135deg,${accent}08,var(--sp-surface))`,
    padding:"16px", display:"flex", flexDirection:"column", gap:12,
  };
  const rowStyle: React.CSSProperties = {
    display:"flex", alignItems:"center", gap:8,
    padding:"8px 10px", borderRadius:12,
    background:"var(--sp-surface)", border:`1px solid var(--sp-border)`,
  };
  const btnStyle = (active: boolean, color: string = accent): React.CSSProperties => ({
    padding:"5px 11px", borderRadius:8, border:`1px solid ${color}44`,
    background:`${color}14`, cursor:"pointer", color, fontFamily:"inherit",
    fontSize:11, fontWeight:600, display:"flex", alignItems:"center", gap:5,
    opacity: active ? 1 : 0.45,
  });

  return (
    <div style={{ maxWidth:520, margin:"0 auto", display:"flex", flexDirection:"column", gap:12 }}>

      {/* ── Header ── */}
      <div style={{
        borderRadius:22, padding: compact?"16px":"22px",
        background:`linear-gradient(145deg,${accent}18,${accent}06)`,
        border:`1px solid ${accent}33`, boxShadow:`0 8px 32px ${accent}12`,
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute",top:-60,right:-60,width:180,height:180,borderRadius:"50%",
          background:`radial-gradient(circle,${accent}18,transparent 65%)`,pointerEvents:"none" }}/>
        <div style={{ fontSize:compact?40:56,position:"absolute",top:compact?10:16,right:compact?16:24,opacity:0.13 }}>🌙</div>
        <div style={{ position:"relative" }}>
          <p style={{ fontSize:11,fontWeight:600,color:accent,marginBottom:4,letterSpacing:"0.08em",textTransform:"uppercase" }}>
            Namoz Vaqtlari
          </p>
          <p style={{ fontSize:compact?20:26,fontWeight:800,color:"var(--sp-text)",lineHeight:1.1,marginBottom:6 }}>
            {upcoming
              ? <>{upcoming.icon} {upcoming.key} — <span style={{color:accent}}>{countdown(upcoming.date!)}</span></>
              : <span style={{opacity:0.6}}>🌙 Xufton o'tdi</span>}
          </p>
          <p style={{ fontSize:11,color:"var(--sp-text-muted)" }}>{data?.date||"…"} · {city}</p>
          {upcoming && lastPassed && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--sp-text-dim)",marginBottom:4 }}>
                <span>{lastPassed.icon} {lastPassed.key} {lastPassed.time.slice(0,5)}</span>
                <span>{upcoming.icon} {upcoming.key} {upcoming.time.slice(0,5)}</span>
              </div>
              <div style={{ height:4,borderRadius:99,background:"var(--sp-border)",overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,
                  background:`linear-gradient(90deg,${accent}88,${accent})`,transition:"width 1s linear" }}/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div style={{ display:"flex",gap:6 }}>
        <div style={{ position:"relative",flex:1 }}>
          <MapPin size={12} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:accent }}/>
          <input
            list="sp-cities" value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && applyCity()}
            placeholder="Shahar nomi…"
            style={{
              width:"100%",paddingLeft:28,paddingRight:10,paddingTop:8,paddingBottom:8,
              borderRadius:11,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
              color:"var(--sp-text)",fontSize:12,fontFamily:"inherit",outline:"none",
            }}
            onFocus={e=>(e.currentTarget.style.borderColor=accent)}
            onBlur={e =>(e.currentTarget.style.borderColor="var(--sp-border)")}
          />
          <datalist id="sp-cities">{UZ_CITIES.map(c=><option key={c} value={c}/>)}</datalist>
        </div>
        <button onClick={applyCity} style={{
          padding:"8px 14px",borderRadius:11,border:"none",cursor:"pointer",
          background:accent,color:"#000",fontWeight:700,fontSize:12,fontFamily:"inherit",
        }}>Ko'rish</button>
        <button onClick={()=>refetch()} style={{
          width:36,height:36,borderRadius:11,border:`1px solid var(--sp-border)`,
          background:"var(--sp-surface)",cursor:"pointer",color:"var(--sp-text-muted)",
          display:"flex",alignItems:"center",justifyContent:"center",
        }}><RefreshCw size={12} style={{animation:isLoading?"spin1 1s linear infinite":"none"}}/></button>
        <button onClick={()=>setShowSettings(s=>!s)} style={{
          width:36,height:36,borderRadius:11,cursor:"pointer",
          border:`1px solid ${showSettings?accent+"66":"var(--sp-border)"}`,
          background:showSettings?`${accent}18`:"var(--sp-surface)",
          color:showSettings?accent:"var(--sp-text-muted)",
          display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",
        }}><Settings size={13}/></button>
        <style>{"@keyframes spin1{to{transform:rotate(360deg)}}"}</style>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div style={{ ...cardStyle, animation:"slideDown .2s ease" }}>
          <style>{"@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}"}</style>

          {/* Header */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:7 }}>
              <Bell size={14} style={{color:accent}}/>
              <span style={{ fontSize:13,fontWeight:700,color:"var(--sp-text)" }}>
                Azon & Ringtone Sozlamalari
              </span>
            </div>
            <button onClick={()=>setShowSettings(false)} style={{
              background:"none",border:"none",cursor:"pointer",color:"var(--sp-text-muted)",padding:4,borderRadius:6,
            }}><X size={14}/></button>
          </div>

          {/* Notification permission */}
          {notifPerm !== "granted" ? (
            <button onClick={requestNotif} style={{
              ...rowStyle, cursor:"pointer", border:`1px solid ${accent}44`,
              background:`${accent}0e`, color:accent, fontFamily:"inherit", fontSize:12, fontWeight:600,
              justifyContent:"flex-start",
            }}>
              <Bell size={13}/>
              {notifPerm === "denied"
                ? "⚠️ Brauzer sozlamalaridan bildirishnomani yoqing"
                : "🔔 Bildirishnomaga ruxsat berish"}
            </button>
          ) : (
            <>
              <div style={{ ...rowStyle, background:"rgba(52,211,153,0.07)", border:"1px solid rgba(52,211,153,0.2)" }}>
                <Bell size={13} style={{color:"#34D399"}}/>
                <span style={{fontSize:12,color:"#34D399",fontWeight:500}}>
                  {pushState === "subscribed" ? "Web Push faol — sahifa yopiq bo‘lsa ham" : "Bildirishnomalar yoqilgan"}
                </span>
              </div>
              {pushState !== "subscribed" && (
                <button onClick={() => void syncPush()} disabled={pushState === "syncing"} style={{
                  ...rowStyle, cursor:pushState === "syncing"?"wait":"pointer",
                  border:`1px solid ${accent}44`, background:`${accent}0e`,
                  color:accent, fontFamily:"inherit", fontSize:12, fontWeight:600,
                }}>
                  <Bell size={13}/>
                  {pushState === "syncing" ? "Web Push ulanmoqda…" : "Web Push’ni yoqish"}
                </button>
              )}
              {pushError && (
                <span style={{fontSize:10,color:"#f59e0b"}}>{pushError}</span>
              )}
            </>
          )}

          {/* Volume */}
          <div style={{ ...rowStyle, gap:10 }}>
            <Volume2 size={13} style={{color:"var(--sp-text-muted)",flexShrink:0}}/>
            <span style={{ fontSize:11,color:"var(--sp-text-muted)",flexShrink:0,minWidth:62 }}>
              Ovoz: {Math.round(cfg.vol*100)}%
            </span>
            <input type="range" min={0} max={1} step={0.05} value={cfg.vol}
              onChange={e=>updateCfg(prev=>({...prev,vol:+e.target.value}))}
              style={{ flex:1,accentColor:accent,cursor:"pointer" }}/>
          </div>

          {/* Custom file */}
          <div style={{ ...rowStyle, gap:8 }}>
            <Upload size={13} style={{color:"var(--sp-text-muted)",flexShrink:0}}/>
            <div style={{
              flex:1,fontSize:11,color:customFile?"var(--sp-text)":"var(--sp-text-muted)",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer",
            }} onClick={()=>fileInputRef.current?.click()}>
              {customFile || "O'z fayli yuklash (MP3, WAV, M4A…)"}
            </div>
            <button onClick={()=>fileInputRef.current?.click()} style={{...btnStyle(true),flexShrink:0}}>
              Tanlash
            </button>
            {customFile && (
              <button onClick={()=>{setCustomFile(""); customUrlRef.current="";}}
                style={{background:"none",border:"none",cursor:"pointer",color:"var(--sp-text-muted)",padding:3,borderRadius:6,flexShrink:0}}>
                <X size={11}/>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFile} style={{display:"none"}}/>
          </div>

          <div style={{ height:1,background:"var(--sp-border)",borderRadius:1 }}/>

          {/* Per-prayer settings */}
          <p style={{ fontSize:11,fontWeight:600,color:"var(--sp-text-muted)",letterSpacing:"0.06em",textTransform:"uppercase",margin:0 }}>
            Har bir namoz sozlamasi
          </p>

          {PRAYERS.map(p => {
            const pcfg = cfg.perPrayer[p.key] || { enabled:true, sound:"azan-makka" };
            const isRemote = ALL_SOUNDS.find(s=>s.id===pcfg.sound)?.remote ?? false;
            return (
              <div key={p.key} style={{
                borderRadius:14,padding:"10px 12px",
                background: pcfg.enabled?`${p.color}08`:"var(--sp-surface)",
                border:`1px solid ${pcfg.enabled?p.color+"22":"var(--sp-border)"}`,
                display:"flex",flexDirection:"column",gap:8,
                transition:"all 0.15s",
              }}>
                {/* Top row: toggle + label */}
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <button onClick={()=>setPrayerCfg(p.key,"enabled",!pcfg.enabled)} style={{
                    width:30,height:30,borderRadius:9,border:"none",cursor:"pointer",flexShrink:0,
                    background:pcfg.enabled?`${p.color}22`:"var(--sp-surface)",
                    display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s",
                  }}>
                    {pcfg.enabled
                      ? <Bell size={13} style={{color:p.color}}/>
                      : <BellOff size={13} style={{color:"var(--sp-text-dim)"}}/>}
                  </button>
                  <span style={{fontSize:16,flexShrink:0}}>{p.icon}</span>
                  <span style={{
                    fontSize:13,fontWeight:pcfg.enabled?700:400,flex:1,
                    color:pcfg.enabled?p.color:"var(--sp-text-muted)",
                  }}>{p.key}</span>
                  {pcfg.enabled && isRemote && (
                    <span title="Internet kerak" style={{flexShrink:0}}>
                      <Wifi size={11} style={{color:"var(--sp-text-dim)"}}/>
                    </span>
                  )}
                  {/* Preview button */}
                  {pcfg.enabled && (
                    <button
                      onClick={()=>previewSound(pcfg.sound)}
                      title={playing===pcfg.sound?"To'xtatish":"Eshitish"}
                      style={{
                        ...btnStyle(true, playing===pcfg.sound?"#f87171":p.color),
                        flexShrink:0,padding:"4px 9px",
                      }}
                    >
                      {playing===pcfg.sound ? <><Square size={10}/>To'xtat</> : <><Play size={10}/>Eshit</>}
                    </button>
                  )}
                </div>

                {/* Sound selector — grouped */}
                {pcfg.enabled && (
                  <select
                    value={pcfg.sound}
                    onChange={e=>setPrayerCfg(p.key,"sound",e.target.value)}
                    style={{
                      width:"100%",padding:"6px 10px",borderRadius:9,
                      background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
                      color:"var(--sp-text)",fontFamily:"inherit",fontSize:12,outline:"none",
                      cursor:"pointer",boxShadow:`0 0 0 0`,transition:"box-shadow 0.15s",
                    }}
                    onFocus={e=>(e.currentTarget.style.boxShadow=`0 0 0 1.5px ${p.color}`)}
                    onBlur={e =>(e.currentTarget.style.boxShadow="0 0 0 0")}
                  >
                    {SOUND_GROUPS.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.sounds.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
            );
          })}

          {/* Sound library preview */}
          <div style={{ height:1,background:"var(--sp-border)",borderRadius:1 }}/>
          <p style={{ fontSize:11,fontWeight:600,color:"var(--sp-text-muted)",letterSpacing:"0.06em",textTransform:"uppercase",margin:0 }}>
            Barcha tovushlarni sinash
          </p>
          {SOUND_GROUPS.map(group => (
            <div key={group.label}>
              <p style={{ fontSize:10,color:"var(--sp-text-dim)",marginBottom:5,fontWeight:600 }}>{group.label}</p>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                {group.sounds.map(s => (
                  <button key={s.id} onClick={()=>previewSound(s.id)}
                    disabled={s.id==="custom"&&!customFile}
                    style={{
                      padding:"5px 10px",borderRadius:8,border:`1px solid ${playing===s.id?"#f87171":"var(--sp-border)"}`,
                      background: playing===s.id?"rgba(248,113,113,0.1)":"var(--sp-surface)",
                      color: playing===s.id?"#f87171":"var(--sp-text-muted)",
                      fontFamily:"inherit",fontSize:11,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:5,transition:"all 0.12s",
                      opacity: s.id==="custom"&&!customFile?0.35:1,
                    }}>
                    {playing===s.id?<Square size={9}/>:<Play size={9}/>}
                    {s.label}
                    {s.remote&&<Wifi size={8} style={{opacity:0.4}}/>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Reset */}
          <button onClick={()=>{const d=defaultSettings();setCfg(d);saveCfg(d);}} style={{
            padding:"7px",borderRadius:10,border:`1px solid var(--sp-border)`,
            background:"var(--sp-surface)",cursor:"pointer",color:"var(--sp-text-muted)",
            fontFamily:"inherit",fontSize:11,
          }}>↩ Sozlamalarni tiklash</button>
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div style={{ borderRadius:14,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,padding:"16px",textAlign:"center" }}>
          <p style={{ fontSize:12,color:"#f87171" }}>😕 {data?.error||"Ma'lumot yuklanmadi"}</p>
        </div>
      )}

      {/* ── Prayer cards ── */}
      <div style={{ display:"grid",gridTemplateColumns:compact?"1fr 1fr":"1fr 1fr 1fr",gap:8 }}>
        {prayers.map(p => {
          const isPassed = p.date && p.date <= now;
          const isNext   = upcoming?.key === p.key;
          const pcfg     = cfg.perPrayer[p.key];
          return (
            <div key={p.key} style={{
              borderRadius:16,padding:compact?"12px 10px":"14px 12px",
              background:isNext?`${p.color}18`:"var(--sp-surface)",
              border:`1px solid ${isNext?p.color+"44":"var(--sp-border)"}`,
              boxShadow:isNext?`0 4px 20px ${p.color}22`:"none",
              transition:"all 0.3s",position:"relative",overflow:"hidden",
              opacity:isPassed&&!isNext?0.55:1,
            }}>
              {isNext && (
                <>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:2,borderRadius:"16px 16px 0 0",background:p.color }}/>
                  <div style={{ position:"absolute",top:6,right:8,width:6,height:6,borderRadius:"50%",background:p.color,animation:"pls 1.5s ease-in-out infinite" }}/>
                  <style>{"@keyframes pls{0%,100%{opacity:1}50%{opacity:0.2}}"}</style>
                </>
              )}
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div style={{ fontSize:compact?18:22,marginBottom:4 }}>{p.icon}</div>
                {pcfg?.enabled && <Bell size={8} style={{color:p.color,opacity:0.5,marginTop:3}}/>}
              </div>
              <p style={{ fontSize:compact?11:12,fontWeight:700,color:isNext?p.color:"var(--sp-text)",marginBottom:2 }}>{p.key}</p>
              <p style={{ fontSize:compact?13:15,fontWeight:800,color:isNext?p.color:"var(--sp-text-sub)",fontFamily:"monospace",letterSpacing:"0.05em" }}>
                {isLoading?<span style={{opacity:0.4}}>--:--</span>:p.time.slice(0,5)}
              </p>
              <p style={{ fontSize:9,color:"var(--sp-text-dim)",marginTop:2,fontStyle:"italic" }}>{p.ar}</p>
              {isPassed&&!isNext&&<div style={{position:"absolute",bottom:8,right:8}}><span style={{fontSize:9,color:"var(--sp-text-dim)"}}>✓</span></div>}
              {isNext&&p.date&&<p style={{fontSize:9,color:p.color,marginTop:4,fontWeight:600}}>{countdown(p.date)}</p>}
            </div>
          );
        })}
      </div>

      {/* ── Method ── */}
      {data && !data.error && (
        <div style={{ borderRadius:12,background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,padding:"10px 14px",display:"flex",alignItems:"center",gap:8 }}>
          <span style={{fontSize:14}}>📿</span>
          <div>
            <p style={{fontSize:11,color:"var(--sp-text-muted)",fontWeight:500}}>Hisoblash usuli</p>
            <p style={{fontSize:10,color:"var(--sp-text-dim)"}}>{data.method?.slice(0,60)||"Moonsighting Committee"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
