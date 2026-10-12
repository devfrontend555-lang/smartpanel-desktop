import { X, Palette, Keyboard, Info, Sun, Globe2 } from "lucide-react";
import { THEMES } from "@/lib/theme";
import { type Lang, LANG_LABELS } from "@/lib/i18n";

interface Props {
  accent:     string;
  onAccent:   (c: string) => void;
  themeId:    string;
  onTheme:    (id: string) => void;
  onClose:    () => void;
  lang:       Lang;
  onLang:     (l: Lang) => void;
  t:          Record<string, any>;
  panelStyle?: React.CSSProperties;
}

const ACCENTS = [
  { color:"#FF6B35", name:"Olov"        },
  { color:"#4ECDC4", name:"Ko'k-yashil" },
  { color:"#FFD166", name:"Oltin"       },
  { color:"#A78BFA", name:"Binafsha"    },
  { color:"#34D399", name:"Yashil"      },
  { color:"#F87171", name:"Qizil"       },
  { color:"#60A5FA", name:"Ko'k"        },
  { color:"#F472B6", name:"Pushti"      },
  { color:"#FBBF24", name:"Sariq"       },
  { color:"#818CF8", name:"Lavanda"     },
];

export default function SettingsPanel({ accent, onAccent, themeId, onTheme, onClose, lang, onLang, t, panelStyle }: Props) {
  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed",inset:0,background:"var(--sp-overlay)",
        backdropFilter:"blur(4px)",zIndex:998,animation:"fadeIn 0.15s ease",
      }}/>

      <div style={{
        position:"fixed",right:16,bottom:70,
        width:300,borderRadius:20,zIndex:999,
        background:"var(--sp-modal)",
        border:`1px solid var(--sp-border-s)`,
        boxShadow:"0 24px 80px rgba(0,0,0,0.5)",
        animation:"slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        overflow:"hidden",
        ...panelStyle,
      }}>
        <style>{`
          @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
          @keyframes slideUp { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        `}</style>

        {/* Header */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 16px",borderBottom:`1px solid var(--sp-border)`,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Palette size={15} style={{color:accent}}/>
            <span style={{color:"var(--sp-text)",fontSize:14,fontWeight:600}}>{t.settings}</span>
          </div>
          <button onClick={onClose}
            style={{background:"none",border:"none",cursor:"pointer",color:"var(--sp-text-muted)",padding:4,borderRadius:6}}
            onMouseEnter={e=>(e.currentTarget.style.color="var(--sp-text)")}
            onMouseLeave={e=>(e.currentTarget.style.color="var(--sp-text-muted)")}
          ><X size={16}/></button>
        </div>

        {/* Language picker */}
        <div style={{padding:"12px 16px",borderBottom:`1px solid var(--sp-border)`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <Globe2 size={13} style={{color:"var(--sp-text-muted)"}}/>
            <span style={{
              fontSize:11,fontWeight:600,color:"var(--sp-text-muted)",
              letterSpacing:"0.06em",textTransform:"uppercase",
            }}>{t.language}</span>
          </div>
          <div style={{display:"flex",gap:6}}>
            {(["uz","en","ru"] as Lang[]).map(l => (
              <button key={l} onClick={() => onLang(l)}
                data-testid={`button-lang-${l}`}
                style={{
                  flex:1,padding:"6px 4px",borderRadius:9,border:"none",cursor:"pointer",
                  fontFamily:"inherit",fontSize:11,fontWeight:600,transition:"all 0.15s",
                  background: lang===l ? `${accent}22` : "var(--sp-surface)",
                  color: lang===l ? accent : "var(--sp-text-muted)",
                  boxShadow: lang===l ? `0 0 0 1.5px ${accent}55` : `0 0 0 1px var(--sp-border)`,
                }}
              >{LANG_LABELS[l]}</button>
            ))}
          </div>
        </div>

        {/* Theme picker */}
        <div style={{padding:"14px 16px",borderBottom:`1px solid var(--sp-border)`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <Sun size={13} style={{color:"var(--sp-text-muted)"}}/>
            <span style={{
              fontSize:11,fontWeight:600,color:"var(--sp-text-muted)",
              letterSpacing:"0.06em",textTransform:"uppercase",
            }}>{t.theme}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {THEMES.map(th => {
              const isActive = themeId === th.id;
              return (
                <button key={th.id}
                  data-testid={`button-theme-${th.id}`}
                  onClick={() => onTheme(th.id)}
                  style={{
                    borderRadius:10,padding:"7px 4px",border:"none",cursor:"pointer",
                    background:"var(--sp-surface)",
                    boxShadow: isActive ? `0 0 0 2px ${accent}` : `0 0 0 1px var(--sp-border)`,
                    transition:"all 0.18s",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:5,
                  }}
                  onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.06)")}
                  onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}
                >
                  <div style={{
                    width:42,height:22,borderRadius:6,
                    background:`linear-gradient(135deg,${th.preview[0]} 0%,${th.preview[1]} 100%)`,
                    border:`1px solid ${th.isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,
                  }}/>
                  <span style={{
                    fontSize:9,fontWeight:600,letterSpacing:"0.03em",
                    color: isActive ? accent : "var(--sp-text-muted)",
                  }}>{th.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent picker */}
        <div style={{padding:"14px 16px",borderBottom:`1px solid var(--sp-border)`}}>
          <p style={{
            fontSize:11,fontWeight:600,color:"var(--sp-text-muted)",
            marginBottom:12,letterSpacing:"0.06em",textTransform:"uppercase",
          }}>{t.accent}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {ACCENTS.map(a => (
              <button key={a.color} onClick={()=>onAccent(a.color)}
                data-testid={`button-accent-${a.name}`}
                title={a.name}
                style={{
                  width:"100%",aspectRatio:"1",borderRadius:12,
                  background:a.color,border:"none",cursor:"pointer",
                  boxShadow:accent===a.color?`0 0 14px ${a.color},0 0 28px ${a.color}66`:"none",
                  transform:accent===a.color?"scale(1.18)":"scale(1)",
                  transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                  outline:accent===a.color?"2px solid rgba(255,255,255,0.5)":"none",
                  outlineOffset:2,
                }}
              />
            ))}
          </div>
          <p style={{fontSize:11,color:accent,textAlign:"center",marginTop:10,fontWeight:600}}>
            {ACCENTS.find(a=>a.color===accent)?.name || t.customColor}
          </p>
        </div>

        {/* Shortcuts */}
        <div style={{padding:"0 16px 14px",borderTop:`1px solid var(--sp-border)`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"12px 0 10px"}}>
            <Keyboard size={13} style={{color:"var(--sp-text-muted)"}}/>
            <span style={{
              fontSize:11,fontWeight:600,color:"var(--sp-text-muted)",
              letterSpacing:"0.06em",textTransform:"uppercase",
            }}>{t.keyboard}</span>
          </div>
          {t.shortcuts.map((s: any) => (
            <div key={s.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
              <span style={{fontSize:12,color:"var(--sp-text-sub)"}}>{s.desc}</span>
              <kbd style={{
                fontSize:11,fontFamily:"monospace",fontWeight:700,
                padding:"2px 8px",borderRadius:6,
                background:"var(--sp-surface)",border:`1px solid var(--sp-border-s)`,
                color:"var(--sp-text-sub)",
              }}>{s.key}</kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding:"10px 16px",borderTop:`1px solid var(--sp-border)`,
          display:"flex",alignItems:"center",gap:6,
          background:"var(--sp-surface)",
        }}>
          <Info size={11} style={{color:"var(--sp-text-dim)"}}/>
          <span style={{fontSize:11,color:"var(--sp-text-dim)"}}>SmartPanel {t.version} — PRO</span>
        </div>
      </div>
    </>
  );
}
