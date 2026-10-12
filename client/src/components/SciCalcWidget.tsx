import { useState, useRef, useEffect } from "react";
import * as math from "mathjs";
import { Copy, Check, Trash2, ChevronRight } from "lucide-react";

interface Entry { input: string; output: string; err: boolean }
interface Props  { accent?: string; compact?: boolean }

const CONSTANTS: { sym: string; label: string; desc: string }[] = [
  { sym:"pi",         label:"π",   desc:"Pi — 3.14159…"           },
  { sym:"e",          label:"e",   desc:"Eyler soni — 2.71828…"   },
  { sym:"phi",        label:"φ",   desc:"Oltin nisbat — 1.61803…" },
  { sym:"3e8",        label:"c",   desc:"Yorug'lik tezligi (m/s)" },
  { sym:"6.626e-34",  label:"h",   desc:"Planck konstantasi (J·s)"},
  { sym:"6.674e-11",  label:"G",   desc:"Gravitsiya konstantasi"  },
  { sym:"1.38e-23",   label:"kB",  desc:"Boltzmann (J/K)"         },
  { sym:"6.022e23",   label:"Nₐ",  desc:"Avogadro soni"           },
  { sym:"9.81",       label:"g",   desc:"Yerning tortishi (m/s²)" },
  { sym:"1.602e-19",  label:"qe",  desc:"Elektron zaryadi (C)"    },
];

const FUNCS: string[] = [
  "sin","cos","tan","asin","acos","atan",
  "sqrt","cbrt","abs","log","log2","log10",
  "exp","round","ceil","floor","factorial",
  "mean","std","variance","sum","min","max",
  "det","inv","transpose","cross","dot",
];

const EXAMPLES = [
  "sqrt(144)",
  "2^10 - 1",
  "sin(pi/6)",
  "log(1000, 10)",
  "x = 42; x * 2",
  "mean([4,8,15,16,23,42])",
  "factorial(10)",
  "(3 + 4i) * (1 - 2i)",
];

export default function SciCalcWidget({ accent = "#A78BFA", compact }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input,   setInput]   = useState("");
  const [copied,  setCopied]  = useState<number|null>(null);
  const [histIdx, setHistIdx] = useState(-1);
  const scope    = useRef<Record<string,any>>({});
  const bottomRef= useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [entries]);

  const evaluate = (expr?: string) => {
    const raw = (expr ?? input).trim();
    if (!raw) return;
    try {
      const result = math.evaluate(raw, scope.current);
      const out =
        result === undefined || result === null
          ? "✓ Tayinlandi"
          : math.format(result, { precision: 10, notation: "auto" });
      setEntries(e => [...e, { input: raw, output: out, err: false }]);
    } catch (err: any) {
      setEntries(e => [...e, { input: raw, output: err.message, err: true }]);
    }
    setInput("");
    setHistIdx(-1);
  };

  const insert = (text: string) => {
    setInput(i => i + text);
    inputRef.current?.focus();
  };

  const clear = () => {
    setEntries([]);
    scope.current = {};
    setInput("");
    setHistIdx(-1);
  };

  const copyEntry = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { evaluate(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const inputEntries = entries.filter(en => !en.err).map(en => en.input);
      const nextIdx = Math.min(histIdx + 1, inputEntries.length - 1);
      if (nextIdx >= 0) { setHistIdx(nextIdx); setInput(inputEntries[inputEntries.length - 1 - nextIdx]); }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx <= 0) { setHistIdx(-1); setInput(""); }
      else { const ni = histIdx - 1; setHistIdx(ni); const arr = entries.filter(en=>!en.err).map(en=>en.input); setInput(arr[arr.length-1-ni]); }
    }
  };

  const termH = compact ? 180 : 260;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>

      {/* Terminal output */}
      <div style={{
        height: termH, overflowY: "auto",
        background: "var(--sp-surface)",
        border: `1px solid var(--sp-border)`,
        borderRadius: 16,
        padding: "12px 14px",
        fontFamily: "'SF Mono','Fira Mono','Consolas',monospace",
        fontSize: compact ? 12 : 13,
        marginBottom: 8,
        scrollbarWidth: "thin",
        scrollbarColor: "var(--sp-scroll) transparent",
      }}>
        {entries.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:6, paddingTop: compact ? 20 : 60 }}>
            <p style={{ color:"var(--sp-text-dim)", textAlign:"center", fontSize: compact ? 11:12 }}>
              Hisob-kitobni boshlang…
            </p>
            {!compact && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, justifyContent:"center", marginTop:8 }}>
                {EXAMPLES.slice(0,5).map(ex => (
                  <button key={ex} onClick={() => evaluate(ex)}
                    style={{
                      padding:"4px 10px",borderRadius:99,border:`1px solid var(--sp-border)`,
                      background:"var(--sp-surface)",cursor:"pointer",fontFamily:"monospace",
                      fontSize:11,color:"var(--sp-text-muted)",transition:"all 0.15s",
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor=accent)}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--sp-border)")}
                  >{ex}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {entries.map((en, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:6, color:"var(--sp-text-muted)" }}>
              <ChevronRight size={12} style={{ flexShrink:0, marginTop:2, color:accent }}/>
              <span style={{ flex:1, wordBreak:"break-all" }}>{en.input}</span>
            </div>
            <div style={{
              display:"flex", alignItems:"center", gap:6,
              paddingLeft: 18, marginTop:2,
              color: en.err ? "#f87171" : accent,
            }}>
              <span style={{ flex:1, wordBreak:"break-all", fontWeight: en.err ? 400 : 700 }}>{en.output}</span>
              {!en.err && (
                <button onClick={() => copyEntry(i, en.output)}
                  style={{
                    background:"none", border:"none", cursor:"pointer",
                    color: copied===i ? "#34D399" : "var(--sp-text-dim)",
                    padding:2, transition:"color 0.15s",
                  }}
                >
                  {copied===i ? <Check size={10}/> : <Copy size={10}/>}
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input bar */}
      <div style={{
        display:"flex", gap:6, alignItems:"center",
        background:"var(--sp-surface)",
        border:`1px solid ${accent}44`,
        borderRadius:12, padding:"8px 12px", marginBottom: 10,
      }}>
        <ChevronRight size={14} style={{ color:accent, flexShrink:0 }}/>
        <input ref={inputRef} data-testid="input-scicalc"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ifodani kiriting…  (↑↓ tarix)"
          style={{
            flex:1, background:"transparent", border:"none", outline:"none",
            color:"var(--sp-text)",
            fontFamily:"'SF Mono','Fira Mono',monospace",
            fontSize: compact ? 13 : 14,
          }}
        />
        <button data-testid="button-scicalc-eval" onClick={() => evaluate()}
          style={{
            padding:"5px 14px", borderRadius:8, border:"none", cursor:"pointer",
            background: accent, color:"#000", fontWeight:700, fontSize:12,
            fontFamily:"inherit", transition:"opacity 0.15s",
          }}
          onMouseEnter={e=>(e.currentTarget.style.opacity="0.8")}
          onMouseLeave={e=>(e.currentTarget.style.opacity="1")}
        >=</button>
        <button data-testid="button-scicalc-clear" onClick={clear} title="Tozalash"
          style={{
            width:30, height:30, borderRadius:8, border:`1px solid var(--sp-border)`,
            background:"var(--sp-surface)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"var(--sp-text-muted)", transition:"all 0.15s",
          }}
          onMouseEnter={e=>{(e.currentTarget.style.background="var(--sp-surface-hov)");(e.currentTarget.style.color="#f87171");}}
          onMouseLeave={e=>{(e.currentTarget.style.background="var(--sp-surface)");(e.currentTarget.style.color="var(--sp-text-muted)");}}
        ><Trash2 size={12}/></button>
      </div>

      {/* Constants */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize:10, fontWeight:600, color:"var(--sp-text-dim)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>
          Fizik konstantalar
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {CONSTANTS.map(c => (
            <button key={c.sym} data-testid={`button-const-${c.label}`}
              onClick={() => insert(c.sym)} title={c.desc}
              style={{
                padding:"4px 10px", borderRadius:8, border:`1px solid var(--sp-border)`,
                background:"var(--sp-surface)", cursor:"pointer",
                fontFamily:"'SF Mono','Fira Mono',monospace", fontSize:12, fontWeight:700,
                color:accent, transition:"all 0.15s",
              }}
              onMouseEnter={e=>{(e.currentTarget.style.background=`${accent}18`);(e.currentTarget.style.borderColor=`${accent}55`);}}
              onMouseLeave={e=>{(e.currentTarget.style.background="var(--sp-surface)");(e.currentTarget.style.borderColor="var(--sp-border)");}}
            >{c.label}</button>
          ))}
        </div>
      </div>

      {/* Functions */}
      <div>
        <p style={{ fontSize:10, fontWeight:600, color:"var(--sp-text-dim)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>
          Matematik funksiyalar
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
          {FUNCS.map(f => (
            <button key={f} data-testid={`button-fn-${f}`}
              onClick={() => insert(f + "(")}
              style={{
                padding:"3px 8px", borderRadius:6, border:`1px solid var(--sp-border)`,
                background:"var(--sp-surface)", cursor:"pointer",
                fontFamily:"'SF Mono','Fira Mono',monospace", fontSize:11,
                color:"var(--sp-text-sub)", transition:"all 0.15s",
              }}
              onMouseEnter={e=>(e.currentTarget.style.background="var(--sp-surface-hov)")}
              onMouseLeave={e=>(e.currentTarget.style.background="var(--sp-surface)")}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div style={{ marginTop:10, padding:"8px 12px", borderRadius:10, background:"var(--sp-surface)", border:`1px solid var(--sp-border)` }}>
        <p style={{ fontSize:11, color:"var(--sp-text-dim)", lineHeight:1.6 }}>
          💡 <b style={{ color:"var(--sp-text-muted)" }}>O'zgaruvchilar:</b> <code style={{ color:accent, fontFamily:"monospace" }}>x = 42</code> &nbsp;|&nbsp;
          <b style={{ color:"var(--sp-text-muted)" }}>Matritsa:</b> <code style={{ color:accent, fontFamily:"monospace" }}>[[1,2],[3,4]]</code> &nbsp;|&nbsp;
          <b style={{ color:"var(--sp-text-muted)" }}>Kompleks:</b> <code style={{ color:accent, fontFamily:"monospace" }}>3 + 4i</code>
        </p>
      </div>
    </div>
  );
}
