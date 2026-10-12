import { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock, Cloud, DollarSign, Calculator,
  MessageSquare, StickyNote, Bitcoin, Settings, Wifi, Search,
  Newspaper, Wrench, Music2, Moon, Download, Star, Smile, Trophy, Crown, GripVertical,
} from "lucide-react";
import { type Lang, getT, loadLang, saveLang } from "@/lib/i18n";
import FlameClock        from "@/components/FlameClock";
import WeatherWidget     from "@/components/WeatherWidget";
import CurrencyWidget    from "@/components/CurrencyWidget";
import SciCalcWidget     from "@/components/SciCalcWidget";
import MessengersWidget  from "@/components/MessengersWidget";
import TimerWidget       from "@/components/TimerWidget";
import NotesWidget       from "@/components/NotesWidget";
import CryptoWidget      from "@/components/CryptoWidget";
import NewsWidget        from "@/components/NewsWidget";
import ToolsWidget       from "@/components/ToolsWidget";
import MusicWidget       from "@/components/MusicWidget";
import PrayerWidget      from "@/components/PrayerWidget";
import HoroscopeWidget   from "@/components/HoroscopeWidget";
import JokesWidget       from "@/components/JokesWidget";
import SportWidget       from "@/components/SportWidget";
import ChessWidget       from "@/components/ChessWidget";
import SettingsPanel     from "@/components/SettingsPanel";
import SpotlightSearch   from "@/components/SpotlightSearch";
import WorldClocks       from "@/components/WorldClocks";
import UnitConverter     from "@/components/UnitConverter";
import { getTheme, themeCssVars } from "@/lib/theme";

// ─────────────────── TABS ─────────────────────────────────────────────────────
const TABS = [
  { id:0,  icon:Clock,         label:"Soat",      color:"#FF6B35" },
  { id:1,  icon:Cloud,         label:"Ob-havo",   color:"#4ECDC4" },
  { id:2,  icon:DollarSign,    label:"Valyuta",   color:"#FFD166" },
  { id:3,  icon:Calculator,    label:"Hisob",     color:"#A78BFA" },
  { id:4,  icon:MessageSquare, label:"Messenjer", color:"#34D399" },
  { id:5,  icon:StickyNote,    label:"Eslatma",   color:"#F472B6" },
  { id:6,  icon:Bitcoin,       label:"Kripto",    color:"#F59E0B" },
  { id:7,  icon:Newspaper,     label:"Yangilik",  color:"#60A5FA" },
  { id:8,  icon:Wrench,        label:"Asboblar",  color:"#34D399" },
  { id:9,  icon:Music2,        label:"Musiqa",    color:"#E879F9" },
  { id:10, icon:Moon,          label:"Namoz",     color:"#c084fc" },
  { id:11, icon:Star,          label:"Burç",      color:"#a78bfa" },
  { id:12, icon:Smile,         label:"Hazil",     color:"#fbbf24" },
  { id:13, icon:Trophy,        label:"Sport",     color:"#22c55e" },
  { id:14, icon:Crown,         label:"Shaxmat",   color:"#e2c06a" },
];

// ─────────────────── TAB ORDER (drag & drop) ─────────────────────────────────
const DEFAULT_ORDER = TABS.map(t => t.id);
function loadOrder(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem("sp_tab_order") || "null");
    if (Array.isArray(v) && v.length === TABS.length) return v;
  } catch {}
  return DEFAULT_ORDER;
}
function saveOrder(o: number[]) { localStorage.setItem("sp_tab_order", JSON.stringify(o)); }

// ─────────────────── DRAGGABLE TAB BTN ───────────────────────────────────────
function DraggableTabBtn({
  tab, label, isActive, onClick,
  onDragStart, onDragOver, onDrop, isDragging,
}: {
  tab: typeof TABS[0]; label: string; isActive: boolean; onClick: () => void;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void; isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver(e); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      style={{ position:"relative", display:"flex", alignItems:"center", opacity: isDragging ? 0.35 : 1, transition:"opacity 0.15s" }}
    >
      <div className="drag-handle" style={{
        position:"absolute",left:2,top:"50%",transform:"translateY(-50%)",
        cursor:"grab",color:"var(--sp-text-dim)",opacity:0,
        transition:"opacity 0.15s",display:"flex",alignItems:"center",
      }}><GripVertical size={10}/></div>
      <button
        data-testid={`tab-${tab.id}`}
        onClick={onClick}
        className="tab-btn"
        title={`${label} (${tab.id < 10 ? tab.id+1 : "0"})`}
        style={{
          width:60,height:50,borderRadius:13,
          border:`1px solid ${isActive ? tab.color+"40" : "transparent"}`,
          cursor:"pointer",
          background: isActive?`${tab.color}18`:"transparent",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          position:"relative",alignSelf:"center",
        }}
      >
        {isActive && <div style={{
          position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",
          width:3,height:22,borderRadius:2,background:tab.color,boxShadow:`0 0 8px ${tab.color}`,
        }}/>}
        <tab.icon size={15} style={{color:isActive?tab.color:"var(--sp-text-dim)",transition:"color 0.2s"}} strokeWidth={isActive?2.3:1.8}/>
        <span style={{
          fontSize:8,marginTop:2,fontWeight:isActive?600:400,
          color:isActive?tab.color:"var(--sp-text-dim)",
          letterSpacing:"0.02em",transition:"color 0.2s",
           maxWidth:58,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center",paddingInline:2,
        }}>{label}</span>
      </button>
    </div>
  );
}

// ─────────────────── WORKSPACES ───────────────────────────────────────────────
interface Workspace {
  id: string; name: string; emoji: string;
  themeId: string; accent: string; activeTab: number;
}
const DEFAULT_WS: Workspace[] = [
  { id:"ish",     name:"Ish",     emoji:"💼", themeId:"dark",     accent:"#FF6B35", activeTab:0 },
  { id:"oqish",   name:"O'qish",  emoji:"📚", themeId:"midnight", accent:"#A78BFA", activeTab:3 },
  { id:"shaxsiy", name:"Shaxsiy", emoji:"🏠", themeId:"aurora",   accent:"#34D399", activeTab:5 },
];
function loadWS(): Workspace[] {
  try { return JSON.parse(localStorage.getItem("sp_workspaces") || "null") || DEFAULT_WS; }
  catch { return DEFAULT_WS; }
}
function saveWS(ws: Workspace[]) { localStorage.setItem("sp_workspaces", JSON.stringify(ws)); }

// ─────────────────── SHARED NOTE ─────────────────────────────────────────────
const sharedNote = (() => {
  try {
    const n = new URLSearchParams(window.location.search).get("note");
    if (!n) return null;
    return decodeURIComponent(escape(atob(n)));
  } catch { return null; }
})();

// ─────────────────── HELPERS ─────────────────────────────────────────────────
function useIsMobile(bp = 700) {
  const [v, setV] = useState(() => typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return v;
}

function ParticleCanvas({ isDark }: { isDark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d")!;
    let w = canvas.width  = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    const [pr, pg, pb] = isDark ? [255,255,255] : [10,10,60];
    type P = { x:number; y:number; vx:number; vy:number; r:number; o:number; vo:number };
    const pts: P[] = Array.from({ length: reducedMotion ? 0 : 34 }, () => ({
      x:Math.random()*w, y:Math.random()*h,
      vx:(Math.random()-0.5)*0.20, vy:(Math.random()-0.5)*0.20,
      r:1+Math.random()*1.8,
      o:0.06+Math.random()*0.22, vo:(Math.random()-0.5)*0.003,
    }));
    if (reducedMotion) return;
    let raf: number;
    const tick = () => {
      ctx.clearRect(0,0,w,h);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.o+=p.vo;
        if (p.x<0||p.x>w) p.vx*=-1;
        if (p.y<0||p.y>h) p.vy*=-1;
        if (p.o<0.04||p.o>0.30) p.vo*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${pr},${pg},${pb},${p.o.toFixed(2)})`; ctx.fill();
      });
      for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) {
        const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
        if (d<105) {
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(${pr},${pg},${pb},${(0.05*(1-d/105)).toFixed(3)})`;
          ctx.lineWidth=0.5; ctx.stroke();
        }
      }
      raf=requestAnimationFrame(tick);
    };
    tick();
    const onResize=()=>{ w=canvas.width=canvas.offsetWidth; h=canvas.height=canvas.offsetHeight; };
    window.addEventListener("resize",onResize);
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",onResize); };
  }, [isDark]);
  return <canvas ref={ref} className="sp-particles" style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0,opacity:0.72}}/>;
}

// ─────────────────── HOME ────────────────────────────────────────────────────
export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(loadWS);
  const [activeWsId, setActiveWsId] = useState(() => localStorage.getItem("sp_ws_active") || "ish");
  const [lang,     setLang]     = useState<Lang>(loadLang);
  const [tabOrder, setTabOrder] = useState<number[]>(loadOrder);
  const [dragId,   setDragId]   = useState<number|null>(null);
  const [overId,   setOverId]   = useState<number|null>(null);
  const t = getT(lang);
  const orderedTabs = tabOrder.map(id => TABS.find(tab => tab.id === id)!).filter(Boolean);
  const changeLang = useCallback((l: Lang) => { setLang(l); saveLang(l); }, []);
  const handleDrop = useCallback((toId: number) => {
    setTabOrder(prev => {
      if (dragId === null || dragId === toId) return prev;
      const from = prev.indexOf(dragId);
      const to   = prev.indexOf(toId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      saveOrder(next);
      return next;
    });
    setDragId(null); setOverId(null);
  }, [dragId]);

  const activeWs = workspaces.find(w => w.id === activeWsId) || workspaces[0];

  const [active,    setActive]   = useState(() => sharedNote ? 5 : (activeWs?.activeTab ?? 0));
  const [direction, setDir]      = useState(1);
  const [settings,  setSettings] = useState(false);
  const [spotlight, setSpot]     = useState(false);
  const [showTimer, setTimer]    = useState(false);
  const [calcMode,  setCalcMode] = useState<"sci"|"unit">("sci");
  const [themeId,   setThemeId]  = useState(() => activeWs?.themeId || localStorage.getItem("sp_theme") || "dark");
  const [accent,    setAccent]   = useState(() => activeWs?.accent  || localStorage.getItem("sp_accent") || "#FF6B35");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed,     setInstalled]     = useState(false);
  const [wsToast, setWsToast] = useState<string|null>(null);
  const isMobile = useIsMobile(700);
  const theme = getTheme(themeId);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler as any);
    window.addEventListener("appinstalled", () => { setInstalled(true); setInstallPrompt(null); });
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  // Keyboard shortcuts
  const goTo = useCallback((idx: number) => {
    setDir(idx >= active ? 1 : -1);
    setActive(idx);
  }, [active]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag==="INPUT"||tag==="TEXTAREA") return;
      if (e.key>="1"&&e.key<="9") { goTo(+e.key-1); return; }
      if (e.key==="0") { goTo(9); return; }
      if ((e.ctrlKey||e.metaKey)&&e.key==="k") { e.preventDefault(); setSpot(s=>!s); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [goTo]);

  // Callbacks (also persist to workspace)
  const changeAccent = useCallback((c: string) => {
    setAccent(c);
    localStorage.setItem("sp_accent", c);
    setWorkspaces(ws => {
      const u = ws.map(w => w.id === activeWsId ? { ...w, accent: c } : w);
      saveWS(u); return u;
    });
  }, [activeWsId]);

  const changeTheme = useCallback((id: string) => {
    setThemeId(id);
    localStorage.setItem("sp_theme", id);
    const t = getTheme(id);
    setAccent(t.defaultAccent);
    localStorage.setItem("sp_accent", t.defaultAccent);
    setWorkspaces(ws => {
      const u = ws.map(w => w.id === activeWsId ? { ...w, themeId: id, accent: t.defaultAccent } : w);
      saveWS(u); return u;
    });
  }, [activeWsId]);

  // Save active tab to current workspace
  const goToTab = useCallback((idx: number) => {
    goTo(idx);
    setWorkspaces(ws => {
      const u = ws.map(w => w.id === activeWsId ? { ...w, activeTab: idx } : w);
      saveWS(u); return u;
    });
  }, [goTo, activeWsId]);

  // Switch workspace
  const switchWorkspace = useCallback((id: string) => {
    if (id === activeWsId) return;
    // Save current state to current workspace
    setWorkspaces(prev => {
      const updated = prev.map(w => w.id === activeWsId
        ? { ...w, themeId, accent, activeTab: active }
        : w
      );
      saveWS(updated);

      // Load new workspace
      const newWs = updated.find(w => w.id === id);
      if (newWs) {
        setActiveWsId(id);
        localStorage.setItem("sp_ws_active", id);
        setThemeId(newWs.themeId);
        localStorage.setItem("sp_theme", newWs.themeId);
        setAccent(newWs.accent);
        localStorage.setItem("sp_accent", newWs.accent);
        setDir(1);
        setActive(newWs.activeTab);
        const ws = workspaces.find(w => w.id === id);
        setWsToast(ws ? `${ws.emoji} ${ws.name} faol` : null);
        setTimeout(() => setWsToast(null), 2000);
      }
      return updated;
    });
  }, [activeWsId, themeId, accent, active, workspaces]);

  const installApp = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  const tabColor = TABS[active]?.color || accent;
  const tabClass = direction >= 0 ? "tab-fwd" : "tab-back";

  const btnStyle = (on: boolean, color: string): React.CSSProperties => ({
    width:38, height:38, borderRadius:10, border:"none", cursor:"pointer",
    background: on ? `${color}22` : "var(--sp-surface)",
    color: on ? color : "var(--sp-text-muted)",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"all 0.15s", flexShrink:0,
  });

  return (
    <div style={{
      display:"flex",
      flexDirection: isMobile ? "column" : "row",
        minHeight:"100dvh", height:"100vh", width:"100vw",
      overflow:"hidden", userSelect:"none",
      background: theme.bg,
      transition:"background 0.6s ease",
      }} className="sp-shell">
      <style>{`
        :root { ${themeCssVars(theme)} }
        * { font-family:'Inter',sans-serif; box-sizing:border-box; margin:0; padding:0 }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:var(--sp-scroll); border-radius:2px }
        @keyframes tabFwd  { from{opacity:0;transform:translateX(28px) scale(0.97)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes tabBack { from{opacity:0;transform:translateX(-28px) scale(0.97)} to{opacity:1;transform:translateX(0) scale(1)} }
        .tab-fwd  { animation:tabFwd  0.30s cubic-bezier(0.22,1,0.36,1) both }
        .tab-back { animation:tabBack 0.30s cubic-bezier(0.22,1,0.36,1) both }
        @keyframes orbPulse { 0%,100%{box-shadow:0 0 24px var(--a),0 0 52px var(--b)} 50%{box-shadow:0 0 40px var(--a),0 0 80px var(--b)} }
        @keyframes pingRing { 0%{transform:scale(1);opacity:1} 75%{transform:scale(2.4);opacity:0} 100%{transform:scale(2.4);opacity:0} }
        .tab-btn { transition:background 0.18s,border-color 0.18s,transform 0.12s; border:1px solid transparent }
        .tab-btn:active { transform:scale(0.91)!important }
        .content-scroll { scrollbar-width:thin; scrollbar-color:var(--sp-scroll) transparent }
        .rotate-icon { transition:transform 0.4s }
        .rotate-icon.on { transform:rotate(45deg) }
        .hbtn:hover { background:var(--sp-surface-hov)!important; color:var(--sp-text)!important }
        .ws-btn:hover { background:var(--sp-surface-hov)!important; transform:scale(1.1) }
        div:hover > .drag-handle { opacity:1!important }
        .drag-handle:active { cursor:grabbing }
        @keyframes wsToast { from{opacity:0;transform:translateX(-50%) scale(0.9)} to{opacity:1;transform:translateX(-50%) scale(1)} }
        @keyframes pwaBtn  { 0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0)} 50%{box-shadow:0 0 0 4px rgba(52,211,153,0.3)} }
      `}</style>

      <ParticleCanvas isDark={theme.isDark}/>

      {/* Glow blobs */}
      <div className="sp-glow-layer" style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{
          position:"absolute",top:"-20%",left:"-10%",
          width:700,height:700,borderRadius:"50%",
          background:`radial-gradient(circle,${tabColor}10 0%,transparent 60%)`,
          transition:"background 0.8s ease",filter:"blur(2px)",
        }}/>
        <div style={{
          position:"absolute",bottom:"-20%",right:"-10%",
          width:480,height:480,borderRadius:"50%",
          background:`radial-gradient(circle,${accent}0c 0%,transparent 60%)`,
          transition:"background 0.8s ease",
        }}/>
      </div>

      {/* Workspace toast */}
      {wsToast && (
        <div style={{
          position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",
          background:"var(--sp-modal)",border:`1px solid ${accent}33`,borderRadius:12,
          padding:"8px 16px",fontSize:13,color:"var(--sp-text)",zIndex:9999,
          boxShadow:"0 8px 32px #0008",animation:"wsToast 0.3s ease",
        }}>{wsToast}</div>
      )}

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      {!isMobile && (
        <aside style={{
          position:"relative",display:"flex",flexDirection:"column",
          alignItems:"center",paddingTop:12,paddingBottom:10,
           width:80,flexShrink:0,zIndex:20,
          background: theme.sidebar,
          backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
          borderRight:`1px solid ${theme.sidebarBorder}`,
          transition:"background 0.5s,border-color 0.5s",
        }}>

          {/* Workspace switcher */}
          <div style={{
            display:"flex",flexDirection:"column",alignItems:"center",
            gap:2,paddingBottom:8,marginBottom:4,
            borderBottom:`1px solid ${theme.sidebarBorder}`,width:"100%",
          }}>
            {workspaces.map(ws => {
              const isActive = ws.id === activeWsId;
              return (
                <button key={ws.id} onClick={() => switchWorkspace(ws.id)}
                  title={ws.name} aria-label={`${ws.name} workspace`} className="ws-btn"
                  data-testid={`button-workspace-${ws.id}`}
                  style={{
                    width:44,height:32,borderRadius:9,border:"none",cursor:"pointer",fontSize:16,
                    background: isActive ? `${ws.accent}22` : "transparent",
                    boxShadow: isActive ? `0 0 0 1px ${ws.accent}44` : "none",
                    transition:"all 0.18s",
                  }}>{ws.emoji}</button>
              );
            })}
          </div>

          {/* Orb */}
          <div style={{marginBottom:10,position:"relative",width:36,height:36}}>
            <div style={{
              width:36,height:36,borderRadius:"50%",
              background:`linear-gradient(135deg,#FF6B35 0%,${accent} 55%,#45B7D1 100%)`,
              "--a":accent+"cc","--b":accent+"33",
              boxShadow:`0 0 24px ${accent}55, 0 0 44px ${accent}18`,
            } as any}/>
            <div style={{
              position:"absolute",inset:0,borderRadius:"50%",
              border:`1.5px solid ${accent}`,
              opacity:0.72,
            }}/>
          </div>

          <nav
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:1,overflowY:"auto",width:"100%",alignSelf:"stretch",paddingBottom:4}}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
          >
            {orderedTabs.map(tab => (
              <DraggableTabBtn
                key={tab.id}
                tab={tab}
                label={t.tabs[tab.id] ?? tab.label}
                isActive={active === tab.id}
                isDragging={dragId === tab.id}
                onClick={() => goToTab(tab.id)}
                onDragStart={() => { setDragId(tab.id); setOverId(tab.id); }}
                onDragOver={() => setOverId(tab.id)}
                onDrop={() => handleDrop(tab.id)}
              />
            ))}
          </nav>

          <button data-testid="button-spotlight" onClick={()=>setSpot(true)} title="Qidiruv (Ctrl+K)" aria-label="Qidiruv (Ctrl+K)"
            className="hbtn" style={{...btnStyle(false,""),...{marginBottom:4,width:34,height:34}}}
          ><Search size={13}/></button>
          <button data-testid="button-settings" onClick={()=>setSettings(s=>!s)} title="Sozlamalar" aria-label="Sozlamalar"
            className="hbtn" style={{...btnStyle(settings,accent),...{marginBottom:4,width:34,height:34}}}
          ><Settings size={13} className={`rotate-icon${settings?" on":""}`}/></button>
          <span style={{fontSize:8,color:"var(--sp-text-dim)",fontWeight:500}}>v4.0</span>
        </aside>
      )}

      {/* ═══ MAIN ═══ */}
      <main className="sp-main" style={{
        flex:1,display:"flex",flexDirection:"column",overflow:"hidden",zIndex:1,
        ...(isMobile ? {paddingBottom:56} : {}),
      }}>
        {/* Header */}
        <header className="sp-header" style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding: isMobile ? "10px 14px" : "10px 24px",
          minHeight:58,
          flexShrink:0,
          borderBottom:`1px solid var(--sp-border)`,
          background:"color-mix(in srgb, var(--sp-surface) 44%, transparent)",
          backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* Mobile workspace switcher */}
            {isMobile && (
              <div style={{display:"flex",gap:3}}>
                {workspaces.map(ws => (
                  <button key={ws.id} onClick={() => switchWorkspace(ws.id)}
                    title={ws.name}
                    style={{
                      width:28,height:28,borderRadius:8,border:"none",cursor:"pointer",fontSize:13,
                      background: ws.id === activeWsId ? `${ws.accent}22` : "transparent",
                      boxShadow: ws.id === activeWsId ? `0 0 0 1px ${ws.accent}44` : "none",
                      transition:"all 0.15s",
                    }}>{ws.emoji}</button>
                ))}
              </div>
            )}
            <div style={{
              width:8,height:8,borderRadius:"50%",background:tabColor,
              boxShadow:`0 0 10px ${tabColor}`,transition:"background 0.4s,box-shadow 0.4s",
            }}/>
            <div>
              <h1 style={{color:"var(--sp-text)",fontSize:14,fontWeight:600,lineHeight:1}}>{t.tabs[active] ?? TABS[active]?.label}</h1>
              {!isMobile && <p style={{color:"var(--sp-text-dim)",fontSize:11,marginTop:2}}>SmartPanel · {activeWs?.emoji} {activeWs?.name}</p>}
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {/* Search */}
            {!isMobile ? (
              <button data-testid="button-topbar-search" onClick={()=>setSpot(true)} aria-label="Qidiruv (Ctrl+K)"
                style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"5px 12px",borderRadius:99,
                  background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
                  cursor:"pointer",color:"var(--sp-text-muted)",fontSize:12,
                  fontFamily:"inherit",transition:"all 0.15s",
                }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--sp-surface-hov)";(e.currentTarget as HTMLElement).style.color="var(--sp-text-sub)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="var(--sp-surface)";(e.currentTarget as HTMLElement).style.color="var(--sp-text-muted)";}}
              >
                <Search size={12}/> {t.search}
                <kbd style={{fontSize:10,padding:"1px 5px",borderRadius:4,background:"var(--sp-surface)",border:`1px solid var(--sp-border-s)`,color:"var(--sp-text-muted)",fontFamily:"monospace"}}>⌘K</kbd>
              </button>
            ) : (
              <button onClick={()=>setSpot(true)} className="hbtn" aria-label="Qidiruv" style={btnStyle(false,"")}>
                <Search size={15}/>
              </button>
            )}

            {/* Timer toggle (Soat tab) */}
            {active===0 && !isMobile && (
              <button data-testid="button-toggle-timer" onClick={()=>setTimer(t=>!t)} aria-label={showTimer ? t.timerClose : t.timer}
                style={{
                  padding:"5px 12px",borderRadius:99,fontSize:11,fontWeight:600,
                  fontFamily:"inherit",cursor:"pointer",
                  background:showTimer?`${TABS[0].color}22`:"var(--sp-surface)",
                  color:showTimer?TABS[0].color:"var(--sp-text-muted)",
                  border:`1px solid ${showTimer?TABS[0].color+"44":"var(--sp-border)"}`,
                  transition:"all 0.15s",
                }}
              >{showTimer?`⏱ ${t.timerClose}`:`⏱ ${t.timer}`}</button>
            )}
            {active===0 && isMobile && (
              <button onClick={()=>setTimer(v=>!v)} className="hbtn" aria-label={showTimer ? t.timerClose : t.timer}
                style={btnStyle(showTimer, TABS[0].color)}>⏱</button>
            )}

            {/* PWA Install button */}
            {installPrompt && !installed && (
              <button onClick={installApp} data-testid="button-install-pwa"
                title="Ilovani o'rnatish"
                style={{
                  display:"flex",alignItems:"center",gap:5,
                  padding: isMobile ? "5px 8px" : "5px 12px",
                  borderRadius:99,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
                  background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.3)",
                  color:"#34D399",transition:"all 0.15s",
                  animation:"pwaBtn 2s ease-in-out infinite",
                }}
                onMouseEnter={e=>(e.currentTarget.style.background="rgba(52,211,153,0.22)")}
                onMouseLeave={e=>(e.currentTarget.style.background="rgba(52,211,153,0.12)")}
              >
                <Download size={11}/>{!isMobile && ` ${t.install}`}
              </button>
            )}
            {installed && !isMobile && (
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:99,background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.15)"}}>
                <span style={{fontSize:10}}>✅</span>
                <span style={{fontSize:11,color:"#34D399",fontWeight:500}}>O'rnatildi</span>
              </div>
            )}

            {/* Online indicator */}
            {!isMobile && !installPrompt && !installed && (
              <div style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"5px 12px",borderRadius:99,
                background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.2)",
              }}>
                <Wifi size={11} style={{color:"#34D399"}}/>
                <span style={{fontSize:11,color:"#34D399",fontWeight:500}}>{t.online}</span>
              </div>
            )}

            {isMobile && (
              <button onClick={()=>setSettings(v=>!v)} className="hbtn" aria-label="Sozlamalar"
                style={btnStyle(settings, accent)}>
                <Settings size={15} className={`rotate-icon${settings?" on":""}`}/>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <div className="content-scroll sp-content" style={{
          flex:1,overflowY:"auto",minWidth:0,
          padding: isMobile ? "14px 10px calc(72px + env(safe-area-inset-bottom))" : "24px 28px",
        }}>
          {active===0 && (
            <div className={tabClass}>
              {!showTimer ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap: isMobile?16:32, paddingTop: isMobile?4:16}}>
                  <FlameClock accent={accent} compact={isMobile}/>
                   <div style={{width:"100%",maxWidth:isMobile?560:820}}><WorldClocks accent={accent} compact={isMobile}/></div>
                </div>
              ) : isMobile ? (
                <div style={{display:"flex",flexDirection:"column",gap:20}}>
                  <FlameClock accent={accent} compact={true}/>
                  <TimerWidget accent={accent}/>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,alignItems:"start",paddingTop:8}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24}}>
                    <FlameClock accent={accent}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"center"}}>
                    <TimerWidget accent={accent}/>
                  </div>
                </div>
              )}
            </div>
          )}

          {active===1  && <div className={tabClass}><WeatherWidget  accent={accent} compact={isMobile}/></div>}
          {active===2  && <div className={tabClass}><CurrencyWidget accent={accent} compact={isMobile}/></div>}

          {active===3 && (
            <div className={tabClass}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
                <div style={{
                  display:"flex",gap:4,
                  background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
                  borderRadius:12,padding:3,
                }}>
                  {([["sci","🔬 Ilmiy hisob"],["unit","📐 O'lchov"]] as const).map(([mode,lbl])=>(
                    <button key={mode} onClick={()=>setCalcMode(mode)}
                      data-testid={`button-calcmode-${mode}`}
                      style={{
                        padding: isMobile ? "6px 12px" : "6px 18px",
                        borderRadius:9,border:"none",cursor:"pointer",
                        fontFamily:"inherit",fontSize: isMobile ? 11 : 12,fontWeight:600,transition:"all 0.15s",
                        background:calcMode===mode?TABS[3].color:"transparent",
                        color:calcMode===mode?"#000":"var(--sp-text-muted)",
                        boxShadow:calcMode===mode?`0 4px 14px ${TABS[3].color}44`:"none",
                      }}
                    >{lbl}</button>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"center"}}>
                {calcMode==="sci"
                  ? <SciCalcWidget accent={TABS[3].color} compact={isMobile}/>
                  : <UnitConverter accent={TABS[3].color} compact={isMobile}/>}
              </div>
            </div>
          )}

          {active===4  && <div className={tabClass}><MessengersWidget accent={accent} compact={isMobile}/></div>}
          {active===5  && <div className={tabClass}><NotesWidget accent={accent} compact={isMobile} sharedNote={sharedNote}/></div>}
          {active===6  && <div className={tabClass}><CryptoWidget     accent={accent} compact={isMobile}/></div>}
          {active===7  && <div className={tabClass}><NewsWidget       accent={TABS[7].color} compact={isMobile}/></div>}
          {active===8  && <div className={tabClass}><ToolsWidget      accent={TABS[8].color} compact={isMobile}/></div>}
          {active===9  && <div className={tabClass}><MusicWidget      accent={TABS[9].color}  compact={isMobile}/></div>}
          {active===10 && <div className={tabClass}><PrayerWidget     accent={TABS[10].color} compact={isMobile}/></div>}
          {active===11 && <div className={tabClass}><HoroscopeWidget  accent={TABS[11].color} compact={isMobile}/></div>}
          {active===12 && <div className={tabClass}><JokesWidget      accent={TABS[12].color} compact={isMobile}/></div>}
          {active===13 && <div className={tabClass}><SportWidget      accent={TABS[13].color} compact={isMobile}/></div>}
          {active===14 && <div className={tabClass}><ChessWidget      accent={TABS[14].color} compact={isMobile}/></div>}
        </div>
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      {isMobile && (
        <nav className="sp-mobile-nav" style={{
          position:"fixed",bottom:0,left:0,right:0,height:"calc(56px + env(safe-area-inset-bottom))",zIndex:20,
          background: theme.sidebar,
          backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
          borderTop:`1px solid ${theme.sidebarBorder}`,
          display:"flex",
          transition:"background 0.5s,border-color 0.5s",
          overflowX:"auto",
          paddingBottom:"env(safe-area-inset-bottom)",
        }}>
          {TABS.map(tab => {
            const Icon=tab.icon, on=active===tab.id;
            return (
              <button key={tab.id} data-testid={`mobile-tab-${tab.id}`}
                onClick={()=>goToTab(tab.id)}
                style={{
                  flex:`0 0 calc(100% / ${TABS.length})`,
                  height:"100%",border:"none",cursor:"pointer",
                  background:on?`${tab.color}14`:"transparent",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  gap:2,transition:"background 0.15s",position:"relative",minWidth:38,
                }}>
                {on && <div style={{
                  position:"absolute",top:0,left:"20%",right:"20%",
                  height:2,borderRadius:2,background:tab.color,
                  boxShadow:`0 0 6px ${tab.color}`,
                }}/>}
                <Icon size={16} style={{color:on?tab.color:"var(--sp-text-dim)",transition:"color 0.2s"}} strokeWidth={on?2.3:1.8}/>
                <span style={{fontSize:8,color:on?tab.color:"var(--sp-text-dim)",fontWeight:on?600:400,transition:"color 0.2s"}}>
                  {(t.tabs[tab.id] ?? tab.label).slice(0,5)}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Modals */}
      {settings && (
        <SettingsPanel
          accent={accent} onAccent={changeAccent}
          themeId={themeId} onTheme={changeTheme}
          lang={lang} onLang={changeLang} t={t}
          onClose={()=>setSettings(false)}
          panelStyle={isMobile ? {
            right:8,bottom:64,left:8,width:"auto",
            maxHeight:"calc(100dvh - 80px)",overflowY:"auto",
          } : undefined}
        />
      )}
      {spotlight && <SpotlightSearch onClose={()=>setSpot(false)} onNavigate={tab=>{goToTab(tab);setSpot(false);}}/>}
    </div>
  );
}
