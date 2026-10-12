import { useState, useEffect, useRef } from "react";
import { Search, Clock, Cloud, DollarSign, Calculator, MessageSquare, StickyNote, Bitcoin } from "lucide-react";

interface Props {
  onClose:    () => void;
  onNavigate: (tab: number) => void;
}

const ITEMS = [
  { tab:0, icon:Clock,         label:"Soat",      desc:"Vaqt va taymer",              color:"#FF6B35", keys:["soat","vaqt","sana","taymer"] },
  { tab:1, icon:Cloud,         label:"Ob-havo",   desc:"Harorat, shamol, namlik",     color:"#4ECDC4", keys:["ob","havo","weather","harorat"] },
  { tab:2, icon:DollarSign,    label:"Valyuta",   desc:"Pul kurslari",                color:"#FFD166", keys:["valyuta","pul","kurs","dollar","euro"] },
  { tab:3, icon:Calculator,    label:"Hisob",     desc:"Kalkulyator",                 color:"#A78BFA", keys:["hisob","kalkulyator","hisobla"] },
  { tab:4, icon:MessageSquare, label:"Messenjer", desc:"Telegram, WhatsApp, Discord", color:"#34D399", keys:["messenjer","telegram","whatsapp","discord"] },
  { tab:5, icon:StickyNote,    label:"Eslatmalar",desc:"Shaxsiy qaydlar",             color:"#F472B6", keys:["eslatma","note","qayd"] },
  { tab:6, icon:Bitcoin,       label:"Kripto",    desc:"Bitcoin, Ethereum narxlari",  color:"#FFD166", keys:["kripto","bitcoin","btc","eth","crypto"] },
];

export default function SpotlightSearch({ onClose, onNavigate }: Props) {
  const [q,   setQ]  = useState("");
  const [sel, setSel]= useState(0);
  const inputRef     = useRef<HTMLInputElement>(null);

  useEffect(()=>{ inputRef.current?.focus(); },[]);

  const filtered = q.trim()
    ? ITEMS.filter(it=>
        it.label.toLowerCase().includes(q.toLowerCase())||
        it.desc.toLowerCase().includes(q.toLowerCase())||
        it.keys.some(k=>k.includes(q.toLowerCase()))
      )
    : ITEMS;

  useEffect(()=>{ setSel(0); },[q]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if (e.key==="Escape") onClose();
      if (e.key==="ArrowDown") { e.preventDefault(); setSel(s=>Math.min(s+1,filtered.length-1)); }
      if (e.key==="ArrowUp")   { e.preventDefault(); setSel(s=>Math.max(s-1,0)); }
      if (e.key==="Enter"&&filtered[sel]) { onNavigate(filtered[sel].tab); onClose(); }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[filtered,sel,onClose,onNavigate]);

  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed",inset:0,zIndex:998,
        background:"var(--sp-overlay)",backdropFilter:"blur(8px)",
        animation:"bIn 0.15s ease",
      }}/>

      <div style={{
        position:"fixed",top:"20%",left:"50%",transform:"translateX(-50%)",
        width:460,zIndex:999,borderRadius:20,
        background:"var(--sp-modal)",
        border:`1px solid var(--sp-border-s)`,
        boxShadow:"0 32px 100px rgba(0,0,0,0.5)",
        overflow:"hidden",animation:"sIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <style>{`
          @keyframes bIn { from{opacity:0} to{opacity:1} }
          @keyframes sIn { from{opacity:0;transform:translateX(-50%) scale(0.92) translateY(-16px)} to{opacity:1;transform:translateX(-50%) scale(1) translateY(0)} }
        `}</style>

        {/* Input */}
        <div style={{
          display:"flex",alignItems:"center",gap:10,padding:"14px 16px",
          borderBottom:`1px solid var(--sp-border)`,
        }}>
          <Search size={18} style={{color:"var(--sp-text-muted)",flexShrink:0}}/>
          <input ref={inputRef} data-testid="input-spotlight"
            value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Qidiring… (Ob-havo, Kripto, Eslatma…)"
            style={{
              flex:1,background:"transparent",border:"none",outline:"none",
              color:"var(--sp-text)",fontSize:16,fontFamily:"inherit",
            }}
          />
          <kbd style={{
            fontSize:11,padding:"2px 7px",borderRadius:6,
            background:"var(--sp-surface)",border:`1px solid var(--sp-border-s)`,
            color:"var(--sp-text-muted)",fontFamily:"monospace",
          }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{maxHeight:340,overflowY:"auto",padding:"6px"}}>
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"28px 0",color:"var(--sp-text-muted)",fontSize:13}}>
              Hech narsa topilmadi
            </div>
          )}
          {filtered.map((it,i)=>{
            const Icon=it.icon, active=i===sel;
            return (
              <button key={it.tab} data-testid={`spotlight-item-${it.tab}`}
                onClick={()=>{onNavigate(it.tab);onClose();}}
                onMouseEnter={()=>setSel(i)}
                style={{
                  width:"100%",display:"flex",alignItems:"center",gap:12,
                  padding:"10px 12px",borderRadius:12,border:"none",cursor:"pointer",
                  background:active?`${it.color}18`:"transparent",
                  textAlign:"left",transition:"background 0.12s",
                }}
              >
                <div style={{
                  width:36,height:36,borderRadius:10,flexShrink:0,
                  background:`${it.color}20`,border:`1px solid ${it.color}33`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                  <Icon size={16} style={{color:it.color}}/>
                </div>
                <div>
                  <p style={{color:active?"var(--sp-text)":"var(--sp-text-sub)",fontSize:14,fontWeight:600,margin:0}}>{it.label}</p>
                  <p style={{color:"var(--sp-text-muted)",fontSize:12,margin:"1px 0 0"}}>{it.desc}</p>
                </div>
                {active&&(
                  <kbd style={{
                    marginLeft:"auto",fontSize:10,padding:"2px 7px",borderRadius:5,
                    background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
                    color:"var(--sp-text-muted)",fontFamily:"monospace",
                  }}>Enter</kbd>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding:"8px 16px",borderTop:`1px solid var(--sp-border)`,
          display:"flex",gap:12,background:"var(--sp-surface)",
        }}>
          {[["↑↓","Ko'chirish"],["↵","Ochish"],["Esc","Yopish"]].map(([k,d])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
              <kbd style={{fontSize:11,padding:"1px 6px",borderRadius:4,
                background:"var(--sp-surface-hov)",border:`1px solid var(--sp-border-s)`,
                color:"var(--sp-text-muted)",fontFamily:"monospace"}}>{k}</kbd>
              <span style={{fontSize:11,color:"var(--sp-text-dim)"}}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
