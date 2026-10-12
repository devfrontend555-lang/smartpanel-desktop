import { ExternalLink } from "lucide-react";

interface Props { accent?: string; compact?: boolean }

const MESSENGERS = [
  { name:"Telegram",  url:"https://web.telegram.org/k/",             color:"#2AABEE", bg:"#0088cc", desc:"Telegram Web",       dot:true  },
  { name:"WhatsApp",  url:"https://web.whatsapp.com/",               color:"#25D366", bg:"#128C7E", desc:"WhatsApp Web",       dot:false },
  { name:"VK",        url:"https://vk.com/im",                       color:"#4C75A3", bg:"#2B587A", desc:"VKontakte xabarlar", dot:false },
  { name:"Instagram", url:"https://www.instagram.com/direct/inbox/", color:"#E1306C", bg:"#C13584", desc:"Instagram Direct",   dot:false },
  { name:"Discord",   url:"https://discord.com/app",                 color:"#5865F2", bg:"#4752C4", desc:"Discord",            dot:true  },
  { name:"Gmail",     url:"https://mail.google.com/",                color:"#EA4335", bg:"#C5221F", desc:"Google Mail",        dot:false },
];

const LOGOS: Record<string,JSX.Element> = {
  Telegram:(
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
      <path d="M21.93 3.48L2.28 11.13c-1.31.5-1.3 1.2-.24 1.51l4.95 1.55 11.47-7.22c.54-.33 1.04-.15.63.21L9.66 15.35l-.38 5.17c.55 0 .8-.25 1.1-.54l2.65-2.57 5.5 4.06c1.01.56 1.74.27 1.99-.94l3.6-17c.37-1.47-.56-2.14-1.29-1.05z" fill="#2AABEE"/>
    </svg>
  ),
  WhatsApp:(
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
      <path d="M20.52 3.45A11.82 11.82 0 0012.04 0C5.46 0 .09 5.35.09 11.92c0 2.1.55 4.15 1.59 5.96L0 24l6.27-1.64a11.9 11.9 0 005.76 1.47h.01c6.58 0 11.95-5.35 11.95-11.92 0-3.18-1.24-6.17-3.47-8.46z" fill="#25D366"/>
      <path d="M12.04 21.83a9.88 9.88 0 01-5.03-1.37l-.36-.21-3.72.97.99-3.61-.24-.37a9.83 9.83 0 01-1.51-5.32c0-5.44 4.43-9.86 9.88-9.86 2.64 0 5.12 1.03 6.98 2.89a9.81 9.81 0 012.89 6.98c0 5.44-4.43 9.9-9.88 9.9z" fill="#fff"/>
      <path d="M17.31 14.52c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.68-1.63-.93-2.23-.24-.59-.5-.51-.68-.52h-.58c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.09 3.2 5.07 4.49.71.3 1.26.49 1.69.62.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="#25D366"/>
    </svg>
  ),
  Discord:(
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
      <path d="M20.32 4.37A19.79 19.79 0 0015.38 3a13.64 13.64 0 00-.62 1.26 18.37 18.37 0 00-5.51 0A13.22 13.22 0 008.63 3a19.73 19.73 0 00-4.95 1.37C.5 8.73-.31 12.98.1 17.17a19.9 19.9 0 006.06 3.05 15.08 15.08 0 001.3-2.1 12.94 12.94 0 01-2.05-.98c.17-.12.34-.25.5-.38a14.24 14.24 0 0012.18 0c.16.13.33.26.5.38-.65.38-1.34.71-2.05.98.38.73.8 1.43 1.3 2.1a19.86 19.86 0 006.06-3.05c.5-5-.84-9.2-3.58-12.8zM8.02 14.63c-1.18 0-2.15-1.09-2.15-2.42s.95-2.43 2.15-2.43 2.17 1.09 2.15 2.43c.02 1.33-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.43 2.15-2.43c1.2 0 2.17 1.09 2.15 2.43 0 1.33-.95 2.42-2.15 2.42z" fill="#5865F2"/>
    </svg>
  ),
};

function getInitials(name: string) { return name.slice(0,2).toUpperCase(); }

export default function MessengersWidget({ accent="#34D399", compact }: Props) {
  const cols = compact ? "1fr" : "1fr 1fr";
  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:cols,gap:10}}>
        {MESSENGERS.map(m=>(
          <a key={m.name} href={m.url} target="_blank" rel="noopener noreferrer"
            data-testid={`link-messenger-${m.name.toLowerCase()}`}
            style={{
              display:"flex",alignItems:"center",gap:12,
              padding:"14px 16px",borderRadius:18,textDecoration:"none",
              background:"var(--sp-surface)",border:`1px solid ${m.color}22`,
              transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              position:"relative",overflow:"hidden",
            }}
            onMouseEnter={e=>{
              const el=e.currentTarget as HTMLElement;
              el.style.background=`${m.color}15`;
              el.style.borderColor=`${m.color}55`;
              el.style.transform="scale(1.03) translateY(-2px)";
              el.style.boxShadow=`0 12px 32px ${m.color}22`;
            }}
            onMouseLeave={e=>{
              const el=e.currentTarget as HTMLElement;
              el.style.background="var(--sp-surface)";
              el.style.borderColor=`${m.color}22`;
              el.style.transform="scale(1)";
              el.style.boxShadow="none";
            }}
          >
            <div style={{
              position:"absolute",right:-20,top:-20,
              width:80,height:80,borderRadius:"50%",
              background:`radial-gradient(circle,${m.color}18 0%,transparent 70%)`,
              pointerEvents:"none",
            }}/>
            <div style={{
              width:44,height:44,borderRadius:14,flexShrink:0,
              background:`linear-gradient(135deg,${m.color}33 0%,${m.bg}22 100%)`,
              border:`1px solid ${m.color}33`,
              display:"flex",alignItems:"center",justifyContent:"center",position:"relative",
            }}>
              {LOGOS[m.name]||<span style={{fontSize:13,fontWeight:800,color:m.color}}>{getInitials(m.name)}</span>}
              {m.dot&&(
                <div style={{
                  position:"absolute",top:-3,right:-3,
                  width:10,height:10,borderRadius:"50%",
                  background:"#FF6B6B",border:"2px solid var(--sp-surface-alt)",
                }}/>
              )}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{color:"var(--sp-text)",fontSize:13,fontWeight:600,margin:0}}>{m.name}</p>
              <p style={{color:"var(--sp-text-muted)",fontSize:11,margin:"2px 0 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.desc}</p>
            </div>
            <ExternalLink size={13} style={{color:"var(--sp-text-muted)",flexShrink:0}}/>
          </a>
        ))}
      </div>

      <div style={{
        marginTop:14,padding:"12px 16px",borderRadius:14,textAlign:"center",
        background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
        fontSize:12,color:"var(--sp-text-dim)",
      }}>
        💡 Messenjerlar yangi tabda ochiladi — login holatingiz saqlanadi
      </div>
    </div>
  );
}
