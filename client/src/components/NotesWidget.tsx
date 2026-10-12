import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pin, CheckSquare, Square, Share2, Check, X, QrCode } from "lucide-react";

interface Note { id:string; text:string; pinned:boolean; done:boolean; color:string; ts:number }
const COLORS = ["#FF6B35","#4ECDC4","#FFD166","#A78BFA","#34D399","#F87171","#60A5FA","#F472B6"];
interface Props { accent?: string; compact?: boolean; sharedNote?: string | null }

function encodeNote(text: string): string {
  try { return btoa(unescape(encodeURIComponent(text))); } catch { return ""; }
}
function makeShareUrl(text: string): string {
  return `${window.location.origin}/?note=${encodeNote(text)}`;
}

export default function NotesWidget({ accent = "#FFD166", compact, sharedNote }: Props) {
  const [notes, setNotes] = useState<Note[]>(() => {
    try { return JSON.parse(localStorage.getItem("sp_notes") || "[]"); } catch { return []; }
  });
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState(accent);
  const [toast, setToast] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [sharedSaved, setSharedSaved] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { localStorage.setItem("sp_notes", JSON.stringify(notes)); }, [notes]);
  useEffect(() => { setColor(accent); }, [accent]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const add = () => {
    if (!draft.trim()) return;
    setNotes(n => [{id: Date.now().toString(), text: draft.trim(), pinned: false, done: false, color, ts: Date.now()}, ...n]);
    setDraft(""); textRef.current?.focus();
  };
  const del   = (id: string) => setNotes(n => n.filter(x => x.id !== id));
  const pin   = (id: string) => setNotes(n => n.map(x => x.id === id ? {...x, pinned: !x.pinned} : x));
  const check = (id: string) => setNotes(n => n.map(x => x.id === id ? {...x, done: !x.done} : x));

  const shareNote = (text: string) => {
    const url = makeShareUrl(text);
    navigator.clipboard.writeText(url).then(
      () => showToast("🔗 Havola nusxalandi!"),
      () => showToast("📋 " + url)
    );
    setQrFor(url);
    setTimeout(() => setQrFor(null), 4000);
  };

  const saveShared = () => {
    if (!sharedNote) return;
    setNotes(n => [{id: "shared_" + Date.now(), text: sharedNote, pinned: true, done: false, color: accent, ts: Date.now()}, ...n]);
    setSharedSaved(true);
    showToast("✅ Eslatma saqlandi!");
  };

  const sorted = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.ts - a.ts);
  const cols = compact ? "1fr" : "1fr 1fr";

  return (
    <div style={{maxWidth: 520, margin: "0 auto", position: "relative"}}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a2e", border: `1px solid ${accent}44`, borderRadius: 12,
          padding: "10px 18px", fontSize: 13, color: "var(--sp-text)",
          zIndex: 9999, boxShadow: `0 8px 32px #0008`,
          animation: "toastIn 0.3s cubic-bezier(0.22,1,0.36,1)",
        }}>
          <style>{"@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}"}</style>
          {toast}
        </div>
      )}

      {/* QR popup */}
      {qrFor && (
        <div style={{
          position: "fixed", bottom: 80, right: 20, zIndex: 9999,
          background: "white", borderRadius: 16, padding: 12,
          boxShadow: "0 12px 40px #0004",
          animation: "toastIn 0.3s ease",
        }}>
          <p style={{fontSize: 10, color: "#333", marginBottom: 6, textAlign: "center", fontFamily: "Inter,sans-serif", fontWeight: 600}}>QR kod</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrFor)}`}
            alt="QR" width={120} height={120} style={{display: "block", borderRadius: 8}}
          />
          <p style={{fontSize: 9, color: "#888", marginTop: 4, textAlign: "center", fontFamily: "monospace", maxWidth: 120, wordBreak: "break-all"}}>
            {qrFor.slice(0, 50)}…
          </p>
        </div>
      )}

      {/* Shared note banner */}
      {sharedNote && !sharedSaved && (
        <div style={{
          borderRadius: 18, padding: "14px 16px", marginBottom: 16,
          background: `linear-gradient(135deg,${accent}18,${accent}08)`,
          border: `2px solid ${accent}44`,
          animation: "toastIn 0.4s ease",
        }}>
          <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 8}}>
            <Share2 size={13} style={{color: accent}}/>
            <span style={{fontSize: 11, fontWeight: 700, color: accent}}>Ulashilgan eslatma</span>
          </div>
          <p style={{fontSize: 13, color: "var(--sp-text-sub)", lineHeight: 1.5, marginBottom: 10, wordBreak: "break-word"}}>{sharedNote}</p>
          <div style={{display: "flex", gap: 6}}>
            <button onClick={saveShared} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 14px",
              borderRadius: 9, border: "none", cursor: "pointer",
              background: accent, color: "#000", fontWeight: 700, fontSize: 12, fontFamily: "inherit",
            }}><Check size={12}/> Saqlash</button>
            <button onClick={() => setSharedSaved(true)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
              borderRadius: 9, border: `1px solid var(--sp-border)`, cursor: "pointer",
              background: "var(--sp-surface)", color: "var(--sp-text-muted)", fontSize: 12, fontFamily: "inherit",
            }}><X size={12}/> O'chirish</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        background: "var(--sp-surface)", border: `1px solid ${color}33`,
        borderRadius: 18, padding: "14px 16px", marginBottom: 16, transition: "border-color 0.2s",
      }}>
        <textarea ref={textRef} data-testid="input-note"
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add(); }}
          placeholder="Yangi eslatma… (Ctrl+Enter — saqlash)" rows={3}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none",
            color: "var(--sp-text)", fontSize: 14, fontFamily: "inherit", resize: "none", lineHeight: 1.6,
          }}
        />
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10}}>
          <div style={{display: "flex", gap: 6}}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} data-testid={`button-note-color-${c}`}
                style={{
                  width: 18, height: 18, borderRadius: "50%", border: "none", cursor: "pointer", background: c,
                  boxShadow: color === c ? `0 0 8px ${c},0 0 14px ${c}88` : "none",
                  transform: color === c ? "scale(1.3)" : "scale(1)", transition: "all 0.15s",
                }}/>
            ))}
          </div>
          <div style={{display: "flex", gap: 5}}>
            {draft.trim() && (
              <button onClick={() => shareNote(draft)} title="Ulashish"
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "7px 10px",
                  borderRadius: 10, border: `1px solid ${color}44`, cursor: "pointer",
                  background: "transparent", color: color, fontSize: 12, fontFamily: "inherit", transition: "all 0.15s",
                }}><QrCode size={12}/></button>
            )}
            <button data-testid="button-add-note" onClick={add} disabled={!draft.trim()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                background: draft.trim() ? color : "var(--sp-surface)",
                color: draft.trim() ? "#000" : "var(--sp-text-muted)",
                fontWeight: 600, fontSize: 12, fontFamily: "inherit", transition: "all 0.15s",
              }}
            ><Plus size={13}/> Qo'sh</button>
          </div>
        </div>
      </div>

      {sorted.length === 0 && (
        <div style={{textAlign: "center", padding: "40px 0", color: "var(--sp-text-dim)", fontSize: 13}}>
          📝 Hali eslatma yo'q
        </div>
      )}

      <div style={{display: "grid", gridTemplateColumns: cols, gap: 10}}>
        {sorted.map(note => (
          <div key={note.id} data-testid={`card-note-${note.id}`}
            style={{
              background: "var(--sp-surface)",
              border: `1px solid ${note.pinned ? note.color + "55" : "var(--sp-border)"}`,
              borderRadius: 16, padding: "14px 14px 10px",
              position: "relative", transition: "all 0.2s",
              boxShadow: note.pinned ? `0 4px 20px ${note.color}22` : "none",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--sp-surface-hov)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--sp-surface)")}
          >
            {note.pinned && <div style={{
              position: "absolute", top: -5, right: 10, width: 10, height: 10, borderRadius: "50%",
              background: note.color, boxShadow: `0 0 8px ${note.color}`,
            }}/>}
            <div style={{
              position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2,
              background: note.color, boxShadow: `0 0 6px ${note.color}`,
            }}/>
            <p style={{
              fontSize: 13, color: note.done ? "var(--sp-text-muted)" : "var(--sp-text-sub)",
              textDecoration: note.done ? "line-through" : "none",
              lineHeight: 1.5, paddingLeft: 8, marginBottom: 10, wordBreak: "break-word",
            }}>{note.text}</p>
            <div style={{display: "flex", gap: 2, justifyContent: "flex-end"}}>
              <button onClick={() => shareNote(note.text)} title="Ulashish"
                data-testid={`button-note-share-${note.id}`}
                style={{background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--sp-text-dim)", transition: "color 0.15s"}}
                onMouseEnter={e => (e.currentTarget.style.color = note.color)}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--sp-text-dim)")}>
                <Share2 size={13}/>
              </button>
              <button onClick={() => check(note.id)} data-testid={`button-note-check-${note.id}`}
                style={{background: "none", border: "none", cursor: "pointer", padding: 4, color: note.done ? "#34D399" : "var(--sp-text-dim)", transition: "color 0.15s"}}>
                {note.done ? <CheckSquare size={14}/> : <Square size={14}/>}
              </button>
              <button onClick={() => pin(note.id)} data-testid={`button-note-pin-${note.id}`}
                style={{background: "none", border: "none", cursor: "pointer", padding: 4, color: note.pinned ? note.color : "var(--sp-text-dim)", transition: "color 0.15s"}}>
                <Pin size={14}/>
              </button>
              <button onClick={() => del(note.id)} data-testid={`button-note-delete-${note.id}`}
                style={{background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--sp-text-dim)", transition: "color 0.15s"}}
                onMouseEnter={e => (e.currentTarget.style.color = "#ff8080")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--sp-text-dim)")}>
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
