import { useState, useCallback } from "react";
import { Copy, Check, RefreshCw, QrCode, KeyRound, FileJson, Hash, Palette } from "lucide-react";

interface Props { accent?: string; compact?: boolean }

type Tool = "qr" | "password" | "json" | "base64" | "hash" | "color";

const TOOLS: { key: Tool; label: string; icon: JSX.Element; desc: string }[] = [
  { key:"qr",       label:"QR",      icon:<QrCode size={13}/>,    desc:"QR kod" },
  { key:"password", label:"Parol",   icon:<KeyRound size={13}/>,  desc:"Parol yaratuvchi" },
  { key:"json",     label:"JSON",    icon:<FileJson size={13}/>,  desc:"JSON formatlash" },
  { key:"base64",   label:"Base64",  icon:<Hash size={13}/>,      desc:"Kodlash" },
  { key:"hash",     label:"Hash",    icon:<Hash size={13}/>,      desc:"SHA-256" },
  { key:"color",    label:"Rang",    icon:<Palette size={13}/>,   desc:"Rang konvertori" },
];

function useCopy() {
  const [id, setId] = useState<string|null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(()=>{});
    setId(key); setTimeout(()=>setId(null), 1400);
  }, []);
  return { copied: id, copy };
}

// ── QR GENERATOR ─────────────────────────────────────────────────────────────
function QRTool({ accent }: { accent: string }) {
  const [text, setText] = useState("https://smartpanel.uz");
  const [size, setSize] = useState(200);
  const { copied, copy } = useCopy();

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=1a1a2e&color=ffffff&ecc=H`;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <input data-testid="input-qr-text" value={text}
        onChange={e=>setText(e.target.value)}
        placeholder="Matn yoki URL kiriting…"
        style={{
          padding:"10px 14px",borderRadius:12,
          background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
          color:"var(--sp-text)",fontSize:13,fontFamily:"inherit",outline:"none",
          transition:"border-color 0.15s",
        }}
        onFocus={e=>(e.currentTarget.style.borderColor=accent)}
        onBlur={e=>(e.currentTarget.style.borderColor="var(--sp-border)")}
      />
      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
        <span style={{ fontSize:12,color:"var(--sp-text-muted)" }}>O'lcham:</span>
        {[150,200,300].map(s=>(
          <button key={s} onClick={()=>setSize(s)}
            style={{
              padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",
              fontSize:11,fontWeight:600,fontFamily:"inherit",
              background:size===s?accent:"var(--sp-surface)",
              color:size===s?"#000":"var(--sp-text-muted)",
              transition:"all 0.15s",
            }}
          >{s}px</button>
        ))}
      </div>
      {text.trim() && (
        <div style={{ display:"flex",justifyContent:"center" }}>
          <div style={{
            padding:16,borderRadius:20,
            background:"var(--sp-surface)",
            border:`1px solid ${accent}33`,
            boxShadow:`0 8px 32px ${accent}22`,
          }}>
            <img src={qrUrl} alt="QR" width={size} height={size}
              style={{ borderRadius:12,display:"block" }}
            />
            <button onClick={()=>copy(qrUrl, "qr")}
              data-testid="button-qr-copy"
              style={{
                marginTop:10,width:"100%",padding:"7px 0",borderRadius:10,
                border:`1px solid var(--sp-border)`,cursor:"pointer",
                background:"var(--sp-surface)",
                color:copied==="qr"?"#34D399":"var(--sp-text-muted)",
                fontSize:11,fontFamily:"inherit",transition:"all 0.15s",
                display:"flex",alignItems:"center",justifyContent:"center",gap:5,
              }}
            >{copied==="qr"?<Check size={11}/>:<Copy size={11}/>} {copied==="qr"?"Nusxalandi!":"URL nusxalash"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PASSWORD GENERATOR ────────────────────────────────────────────────────────
function PasswordTool({ accent }: { accent: string }) {
  const [len,    setLen]    = useState(20);
  const [upper,  setUpper]  = useState(true);
  const [nums,   setNums]   = useState(true);
  const [syms,   setSyms]   = useState(true);
  const [pass,   setPass]   = useState("");
  const { copied, copy } = useCopy();

  const generate = () => {
    const lo = "abcdefghijklmnopqrstuvwxyz";
    const up = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nu = "0123456789";
    const sy = "!@#$%^&*-_+=?";
    let pool = lo;
    if (upper) pool += up;
    if (nums)  pool += nu;
    if (syms)  pool += sy;
    let result = "";
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    for (let i=0;i<len;i++) result += pool[arr[i] % pool.length];
    setPass(result);
  };

  const Toggle = ({ label, on, set }: { label:string; on:boolean; set:(v:boolean)=>void }) => (
    <button onClick={()=>set(!on)}
      style={{
        padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer",
        fontSize:11,fontWeight:600,fontFamily:"inherit",transition:"all 0.15s",
        background:on?accent:"var(--sp-surface)",
        color:on?"#000":"var(--sp-text-muted)",
      }}
    >{label}</button>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
        <span style={{ fontSize:12,color:"var(--sp-text-muted)",width:80 }}>Uzunlik: {len}</span>
        <input type="range" min={8} max={64} value={len}
          onChange={e=>setLen(+e.target.value)}
          data-testid="input-password-length"
          style={{ flex:1,accentColor:accent }}
        />
      </div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
        <Toggle label="A–Z"           on={upper} set={setUpper}/>
        <Toggle label="0–9"           on={nums}  set={setNums}/>
        <Toggle label="!@#$%"         on={syms}  set={setSyms}/>
      </div>
      <button data-testid="button-generate-password" onClick={generate}
        style={{
          padding:"10px 0",borderRadius:12,border:"none",cursor:"pointer",
          background:accent,color:"#000",fontWeight:700,fontSize:13,
          fontFamily:"inherit",transition:"opacity 0.15s",
        }}
        onMouseEnter={e=>(e.currentTarget.style.opacity="0.85")}
        onMouseLeave={e=>(e.currentTarget.style.opacity="1")}
      >🔑 Parol yaratish</button>
      {pass && (
        <div style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"12px 14px",borderRadius:12,
          background:"var(--sp-surface)",border:`1px solid ${accent}33`,
          boxShadow:`0 4px 20px ${accent}15`,
        }}>
          <span data-testid="text-generated-password"
            style={{
              flex:1,fontFamily:"'SF Mono','Fira Mono',monospace",
              fontSize:13,color:"var(--sp-text)",wordBreak:"break-all",letterSpacing:"0.05em",
            }}
          >{pass}</span>
          <button onClick={()=>copy(pass,"pass")} data-testid="button-copy-password"
            style={{
              width:32,height:32,borderRadius:8,border:`1px solid var(--sp-border)`,
              background:"none",cursor:"pointer",flexShrink:0,
              color:copied==="pass"?"#34D399":accent,transition:"color 0.15s",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}
          >{copied==="pass"?<Check size={13}/>:<Copy size={13}/>}</button>
        </div>
      )}
      <p style={{ fontSize:11,color:"var(--sp-text-dim)",textAlign:"center" }}>
        🔒 Web Crypto API — kriptografik xavfsiz tasodifiy raqamlar
      </p>
    </div>
  );
}

// ── JSON FORMATTER ────────────────────────────────────────────────────────────
function JsonTool({ accent }: { accent: string }) {
  const [input,  setInput]  = useState("");
  const [output, setOutput] = useState("");
  const [err,    setErr]    = useState(false);
  const { copied, copy } = useCopy();

  const format = () => {
    try { setOutput(JSON.stringify(JSON.parse(input),null,2)); setErr(false); }
    catch { setOutput("❌ JSON xato: " + (input.trim() ? "Noto'g'ri sintaksis" : "Bo'sh kiritma")); setErr(true); }
  };
  const minify = () => {
    try { setOutput(JSON.stringify(JSON.parse(input))); setErr(false); }
    catch { setOutput("❌ JSON xato"); setErr(true); }
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      <textarea data-testid="input-json" value={input}
        onChange={e=>setInput(e.target.value)}
        placeholder={'{"name":"SmartPanel","version":2,"awesome":true}'}
        rows={5}
        style={{
          padding:"10px 12px",borderRadius:12,resize:"vertical",
          background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
          color:"var(--sp-text)",fontSize:12,fontFamily:"'SF Mono','Fira Mono',monospace",
          outline:"none",transition:"border-color 0.15s",
        }}
        onFocus={e=>(e.currentTarget.style.borderColor=accent)}
        onBlur={e=>(e.currentTarget.style.borderColor="var(--sp-border)")}
      />
      <div style={{ display:"flex",gap:6 }}>
        <button data-testid="button-json-format" onClick={format}
          style={{ flex:1,padding:"8px 0",borderRadius:10,border:"none",cursor:"pointer",
            background:accent,color:"#000",fontWeight:600,fontSize:12,fontFamily:"inherit" }}
        >Formatlash</button>
        <button data-testid="button-json-minify" onClick={minify}
          style={{ flex:1,padding:"8px 0",borderRadius:10,border:`1px solid var(--sp-border)`,cursor:"pointer",
            background:"var(--sp-surface)",color:"var(--sp-text-sub)",fontSize:12,fontFamily:"inherit" }}
        >Qisqartirish</button>
      </div>
      {output && (
        <div style={{ position:"relative" }}>
          <pre style={{
            padding:"10px 12px",borderRadius:12,
            background:"var(--sp-surface)",border:`1px solid ${err?"#f8717155":accent+"33"}`,
            color:err?"#f87171":"var(--sp-text)",
            fontSize:12,fontFamily:"'SF Mono','Fira Mono',monospace",
            overflowX:"auto",margin:0,maxHeight:180,overflowY:"auto",
          }}>{output}</pre>
          {!err && (
            <button onClick={()=>copy(output,"json")} data-testid="button-json-copy"
              style={{
                position:"absolute",top:8,right:8,
                width:28,height:28,borderRadius:7,border:`1px solid var(--sp-border)`,
                background:"var(--sp-surface)",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                color:copied==="json"?"#34D399":accent,transition:"all 0.15s",
              }}
            >{copied==="json"?<Check size={10}/>:<Copy size={10}/>}</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── BASE64 ────────────────────────────────────────────────────────────────────
function Base64Tool({ accent }: { accent: string }) {
  const [input,  setInput]  = useState("");
  const [output, setOutput] = useState("");
  const [mode,   setMode]   = useState<"enc"|"dec">("enc");
  const { copied, copy } = useCopy();

  const run = () => {
    try {
      if (mode === "enc") setOutput(btoa(unescape(encodeURIComponent(input))));
      else               setOutput(decodeURIComponent(escape(atob(input))));
    } catch { setOutput("❌ Xato kiritma"); }
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      <div style={{ display:"flex",gap:5 }}>
        {([["enc","Kodlash"],["dec","Dekodlash"]] as const).map(([m,l])=>(
          <button key={m} onClick={()=>setMode(m)}
            style={{
              flex:1,padding:"7px 0",borderRadius:10,border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all 0.15s",
              background:mode===m?accent:"var(--sp-surface)",
              color:mode===m?"#000":"var(--sp-text-muted)",
            }}
          >{l}</button>
        ))}
      </div>
      <textarea data-testid="input-base64" value={input}
        onChange={e=>setInput(e.target.value)}
        placeholder={mode==="enc" ? "Matn kiriting…" : "Base64 matn kiriting…"}
        rows={3}
        style={{
          padding:"10px 12px",borderRadius:12,resize:"vertical",
          background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
          color:"var(--sp-text)",fontSize:12,fontFamily:"'SF Mono','Fira Mono',monospace",
          outline:"none",
        }}
      />
      <button data-testid="button-base64-run" onClick={run}
        style={{
          padding:"8px 0",borderRadius:10,border:"none",cursor:"pointer",
          background:accent,color:"#000",fontWeight:600,fontSize:12,fontFamily:"inherit",
        }}
      >{mode==="enc" ? "Kodlash" : "Dekodlash"}</button>
      {output && (
        <div style={{ position:"relative" }}>
          <pre style={{
            padding:"10px 12px",borderRadius:12,
            background:"var(--sp-surface)",border:`1px solid ${accent}33`,
            color:"var(--sp-text)",fontSize:12,
            fontFamily:"'SF Mono','Fira Mono',monospace",
            overflowX:"auto",wordBreak:"break-all",margin:0,whiteSpace:"pre-wrap",
          }}>{output}</pre>
          <button onClick={()=>copy(output,"b64")} data-testid="button-base64-copy"
            style={{
              position:"absolute",top:8,right:8,width:28,height:28,
              borderRadius:7,border:`1px solid var(--sp-border)`,
              background:"var(--sp-surface)",cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              color:copied==="b64"?"#34D399":accent,
            }}
          >{copied==="b64"?<Check size={10}/>:<Copy size={10}/>}</button>
        </div>
      )}
    </div>
  );
}

// ── SHA-256 HASH ──────────────────────────────────────────────────────────────
function HashTool({ accent }: { accent: string }) {
  const [input,  setInput]  = useState("");
  const [hashes, setHashes] = useState<{label:string;value:string}[]>([]);
  const [loading,setLoading]= useState(false);
  const { copied, copy } = useCopy();

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const enc = new TextEncoder();
    const buf = enc.encode(input);
    const results: {label:string;value:string}[] = [];
    for (const algo of ["SHA-1","SHA-256","SHA-384","SHA-512"]) {
      try {
        const digest = await crypto.subtle.digest(algo, buf);
        const hex = Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
        results.push({ label: algo, value: hex });
      } catch {}
    }
    setHashes(results);
    setLoading(false);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
      <textarea data-testid="input-hash" value={input}
        onChange={e=>setInput(e.target.value)}
        placeholder="Xeshlash uchun matn kiriting…"
        rows={3}
        style={{
          padding:"10px 12px",borderRadius:12,resize:"vertical",
          background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
          color:"var(--sp-text)",fontSize:12,fontFamily:"'SF Mono','Fira Mono',monospace",
          outline:"none",
        }}
      />
      <button data-testid="button-hash-run" onClick={run} disabled={loading}
        style={{
          padding:"8px 0",borderRadius:10,border:"none",cursor:"pointer",
          background:accent,color:"#000",fontWeight:600,fontSize:12,fontFamily:"inherit",
        }}
      >{loading ? "Hisoblanmoqda…" : "Hash yaratish"}</button>
      {hashes.map(h=>(
        <div key={h.label} style={{
          padding:"10px 12px",borderRadius:12,
          background:"var(--sp-surface)",border:`1px solid var(--sp-border)`,
        }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
            <span style={{ fontSize:10,fontWeight:700,color:accent }}>{h.label}</span>
            <button onClick={()=>copy(h.value,h.label)}
              style={{
                background:"none",border:"none",cursor:"pointer",
                color:copied===h.label?"#34D399":accent,transition:"color 0.15s",
              }}
            >{copied===h.label?<Check size={11}/>:<Copy size={11}/>}</button>
          </div>
          <p style={{
            fontFamily:"'SF Mono','Fira Mono',monospace",fontSize:10,
            color:"var(--sp-text-sub)",wordBreak:"break-all",margin:0,lineHeight:1.6,
          }}>{h.value}</p>
        </div>
      ))}
      <p style={{ fontSize:11,color:"var(--sp-text-dim)",textAlign:"center" }}>
        🔐 Web Crypto API — brauzer ichida xavfsiz
      </p>
    </div>
  );
}

// ── COLOR TOOLS ───────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number,number,number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)] : null;
}
function rgbToHsl(r:number,g:number,b:number): [number,number,number] {
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h=0,s=0; const l=(max+min)/2;
  if (max!==min) {
    const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}
  }
  return [Math.round(h*360),Math.round(s*100),Math.round(l*100)];
}
function palette(hex: string): string[] {
  const rgb=hexToRgb(hex); if (!rgb) return [];
  const [h,s,l]=rgbToHsl(...rgb);
  return [
    `hsl(${h},${s}%,${l}%)`,
    `hsl(${(h+180)%360},${s}%,${l}%)`,
    `hsl(${(h+120)%360},${s}%,${l}%)`,
    `hsl(${(h+240)%360},${s}%,${l}%)`,
    `hsl(${h},${s}%,${Math.min(l+20,95)}%)`,
    `hsl(${h},${s}%,${Math.max(l-20,5)}%)`,
  ];
}

function ColorTool({ accent }: { accent: string }) {
  const [hex, setHex] = useState("#A78BFA");
  const { copied, copy } = useCopy();
  const rgb = hexToRgb(hex);
  const hsl = rgb ? rgbToHsl(...rgb) : null;
  const pal = palette(hex);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
      <div style={{ display:"flex",gap:10,alignItems:"center" }}>
        <input type="color" value={hex} onChange={e=>setHex(e.target.value)}
          data-testid="input-color-picker"
          style={{
            width:56,height:56,borderRadius:14,border:"none",cursor:"pointer",
            background:"none",padding:0,
          }}
        />
        <div style={{ flex:1,display:"flex",flexDirection:"column",gap:6 }}>
          {[
            { label:"HEX", value: hex.toUpperCase() },
            { label:"RGB", value: rgb ? `rgb(${rgb.join(", ")})` : "—" },
            { label:"HSL", value: hsl ? `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` : "—" },
          ].map(row=>(
            <div key={row.label} style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:10,fontWeight:700,color:accent,width:28 }}>{row.label}</span>
              <span style={{
                flex:1,fontFamily:"'SF Mono','Fira Mono',monospace",fontSize:11,color:"var(--sp-text-sub)",
              }}>{row.value}</span>
              <button onClick={()=>copy(row.value,row.label)}
                style={{
                  background:"none",border:"none",cursor:"pointer",padding:2,
                  color:copied===row.label?"#34D399":accent,
                }}
              >{copied===row.label?<Check size={10}/>:<Copy size={10}/>}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div style={{
        height:48,borderRadius:14,
        background:hex,
        border:`1px solid var(--sp-border)`,
        boxShadow:`0 8px 24px ${hex}44`,
      }}/>

      {/* Palette */}
      <div>
        <p style={{ fontSize:10,color:"var(--sp-text-dim)",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em" }}>
          Komplementar palitra
        </p>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:5 }}>
          {pal.map((c,i)=>(
            <button key={i} onClick={()=>{
              const tmp=document.createElement("canvas");tmp.width=1;tmp.height=1;
              const ctx=tmp.getContext("2d")!;ctx.fillStyle=c;ctx.fillRect(0,0,1,1);
              const [r,g,b]=ctx.getImageData(0,0,1,1).data;
              setHex(`#${[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")}`);
            }}
              style={{
                height:36,borderRadius:8,border:`1px solid rgba(255,255,255,0.1)`,
                background:c,cursor:"pointer",transition:"transform 0.15s",
              }}
              onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.12)")}
              onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ToolsWidget({ accent = "#34D399", compact }: Props) {
  const [tool, setTool] = useState<Tool>("qr");
  const current = TOOLS.find(t=>t.key===tool)!;

  return (
    <div style={{ maxWidth: 480, margin:"0 auto" }}>
      {/* Tool selector */}
      <div style={{
        display:"flex",gap:4,flexWrap:"wrap",
        marginBottom:16,
        background:"var(--sp-surface)",
        border:`1px solid var(--sp-border)`,
        borderRadius:14,padding:4,
      }}>
        {TOOLS.map(t=>(
          <button key={t.key} onClick={()=>setTool(t.key)}
            data-testid={`button-tool-${t.key}`}
            title={t.desc}
            style={{
              flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,
              padding: compact ? "7px 4px" : "7px 10px",
              borderRadius:10,border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:compact?10:12,fontWeight:600,
              transition:"all 0.15s",
              background:tool===t.key?accent:"transparent",
              color:tool===t.key?"#000":"var(--sp-text-muted)",
              boxShadow:tool===t.key?`0 4px 12px ${accent}44`:"none",
              minWidth:0,
            }}
          >{t.icon}{!compact&&t.label}</button>
        ))}
      </div>

      {/* Tool header */}
      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:12 }}>
        <div style={{
          width:32,height:32,borderRadius:9,
          background:`${accent}20`,border:`1px solid ${accent}33`,
          display:"flex",alignItems:"center",justifyContent:"center",
          color:accent,
        }}>{current.icon}</div>
        <div>
          <p style={{ fontSize:13,fontWeight:700,color:"var(--sp-text)",margin:0 }}>{current.label}</p>
          <p style={{ fontSize:11,color:"var(--sp-text-muted)",margin:0 }}>{current.desc}</p>
        </div>
      </div>

      {/* Active tool */}
      <div style={{ animation:"fadeIn 0.2s ease" }}>
        <style>{"@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}"}</style>
        {tool==="qr"       && <QRTool       accent={accent}/>}
        {tool==="password" && <PasswordTool accent={accent}/>}
        {tool==="json"     && <JsonTool     accent={accent}/>}
        {tool==="base64"   && <Base64Tool   accent={accent}/>}
        {tool==="hash"     && <HashTool     accent={accent}/>}
        {tool==="color"    && <ColorTool    accent={accent}/>}
      </div>
    </div>
  );
}
