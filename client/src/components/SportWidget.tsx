import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface Match {
  id: string;
  home: string; homeFl: string; homeScore: number | null;
  away: string; awayFl: string; awayScore: number | null;
  status: "live" | "finished" | "upcoming";
  time: string; league: string; leagueFl: string;
  minute?: number;
}

interface StandingRow {
  pos: number; team: string; fl: string;
  played: number; won: number; drawn: number; lost: number;
  gf: number; ga: number; pts: number;
}

interface SportData {
  matches: Match[];
  wc2026: StandingRow[][];
  uzLeague: StandingRow[];
  error: string | null;
}

const WC_STREAMS = [
  { name: "1-kanal (Live)", url: "https://t.me/uzreport_live", icon: "📺", color: "#ef4444" },
  { name: "Sport TV (Uzbekistan)", url: "https://t.me/uzreport_live", icon: "⚽", color: "#22c55e" },
  { name: "Eurosport Uzbekistan", url: "https://eurosport.com", icon: "🌍", color: "#3b82f6" },
  { name: "FIFA+ (Bepul!)", url: "https://www.fifa.com/fifaplus", icon: "🏆", color: "#f59e0b" },
  { name: "Setanta Sports", url: "https://setantasports.com", icon: "📡", color: "#8b5cf6" },
  { name: "SportsurgeNet", url: "https://sportsurge.net", icon: "🎯", color: "#ec4899" },
];

interface Props { accent?: string; compact?: boolean; }

export default function SportWidget({ accent = "#22c55e", compact }: Props) {
  const [view, setView] = useState<"matches" | "wc2026" | "streams">("matches");
  const [wcGroup, setWcGroup] = useState(0);

  const { data, isLoading } = useQuery<SportData>({
    queryKey: ["/api/sport"],
    staleTime: 3 * 60_000,
    refetchInterval: 60_000,
  });

  const matches = data?.matches || [];
  const live    = matches.filter(m => m.status === "live");
  const fin     = matches.filter(m => m.status === "finished");
  const up      = matches.filter(m => m.status === "upcoming");

  function MatchCard({ m }: { m: Match }) {
    const isLive = m.status === "live";
    const isFin  = m.status === "finished";
    return (
      <div style={{
        borderRadius: 14, padding: "12px 14px",
        background: isLive ? `${accent}10` : "var(--sp-surface)",
        border: `1px solid ${isLive ? accent + "44" : "var(--sp-border)"}`,
        position: "relative", overflow: "hidden",
        boxShadow: isLive ? `0 4px 20px ${accent}18` : "none",
      }}>
        {isLive && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${accent},${accent}88)` }} />
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 9, color: isLive ? accent : "var(--sp-text-dim)", fontWeight: 600 }}>
            {m.leagueFl} {m.league}
          </span>
          {isLive && (
            <span style={{ fontSize: 9, color: accent, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent, display: "inline-block", animation: "sLive 1s ease-in-out infinite" }} />
              {m.minute ?? ""}' JONLI
            </span>
          )}
          {isFin && <span style={{ fontSize: 9, color: "var(--sp-text-dim)" }}>Tugadi</span>}
          {!isLive && !isFin && <span style={{ fontSize: 9, color: "var(--sp-text-muted)" }}>{m.time}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>{m.homeFl}</span>
            <span style={{ fontSize: compact ? 11 : 13, fontWeight: 700, color: "var(--sp-text)" }}>{m.home}</span>
          </div>
          <div style={{
            padding: "4px 12px", borderRadius: 8,
            background: isLive || isFin ? `${accent}18` : "var(--sp-border)",
            fontWeight: 800, fontSize: 15, fontFamily: "monospace",
            color: isLive || isFin ? accent : "var(--sp-text-dim)",
            minWidth: 60, textAlign: "center",
          }}>
            {(isLive || isFin) && m.homeScore !== null ? `${m.homeScore} — ${m.awayScore}` : "— : —"}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <span style={{ fontSize: compact ? 11 : 13, fontWeight: 700, color: "var(--sp-text)", textAlign: "right" }}>{m.away}</span>
            <span style={{ fontSize: 18 }}>{m.awayFl}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{`@keyframes sLive{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>

      {/* Header */}
      <div style={{
        borderRadius: 22, padding: compact ? "14px 16px" : "18px 22px",
        background: `linear-gradient(145deg,${accent}18,${accent}06)`,
        border: `1px solid ${accent}33`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle,${accent}20,transparent 65%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>⚽ Sport Natijalari</p>
          <p style={{ fontSize: compact ? 16 : 22, fontWeight: 800, color: "var(--sp-text)" }}>
            {isLoading ? "Yuklanmoqda…" : live.length > 0
              ? <><span style={{ color: accent }}>{live.length}</span> ta JONLI o'yin</>
              : `${matches.length} ta o'yin`}
          </p>
          {!isLoading && <p style={{ fontSize: 10, color: "var(--sp-text-dim)", marginTop: 2 }}>🏆 WC 2026 · Premier Liga · UCL</p>}
        </div>
        <span style={{ fontSize: compact ? 40 : 56, opacity: 0.18, position: "relative" }}>⚽</span>
      </div>

      {/* View tabs */}
      <div style={{
        display: "flex", gap: 4, background: "var(--sp-surface)",
        border: "1px solid var(--sp-border)", borderRadius: 14, padding: 4,
      }}>
        {([["matches","📊 O'yinlar"],["wc2026","🏆 WC 2026"],["streams","📺 Ko'rish"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            style={{
              flex: 1, padding: compact ? "6px 4px" : "7px 8px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: compact ? 10 : 11, fontWeight: 700, transition: "all 0.15s",
              background: view === v ? accent : "transparent",
              color: view === v ? "#000" : "var(--sp-text-muted)",
              boxShadow: view === v ? `0 4px 14px ${accent}44` : "none",
            }}>{l}</button>
        ))}
      </div>

      {/* Matches */}
      {view === "matches" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {isLoading && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--sp-text-muted)", fontSize: 13 }}>
              ⚽ Natijalar yuklanmoqda…
            </div>
          )}
          {!isLoading && matches.length === 0 && (
            <div style={{
              borderRadius: 16, padding: "24px", textAlign: "center",
              background: "var(--sp-surface)", border: "1px solid var(--sp-border)",
            }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>😴</p>
              <p style={{ fontSize: 13, color: "var(--sp-text-muted)" }}>Bugun o'yin yo'q</p>
            </div>
          )}
          {live.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: "0.08em" }}>🔴 JONLI</p>
              {live.map(m => <MatchCard key={m.id} m={m} />)}
            </>
          )}
          {up.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sp-text-muted)", letterSpacing: "0.08em", marginTop: 4 }}>🕐 KUTILMOQDA</p>
              {up.slice(0, 5).map(m => <MatchCard key={m.id} m={m} />)}
            </>
          )}
          {fin.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sp-text-dim)", letterSpacing: "0.08em", marginTop: 4 }}>✅ TUGADI</p>
              {fin.slice(0, 5).map(m => <MatchCard key={m.id} m={m} />)}
            </>
          )}
        </div>
      )}

      {/* WC 2026 Groups */}
      {view === "wc2026" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            borderRadius: 16, padding: compact ? "14px" : "18px",
            background: "var(--sp-surface)", border: "1px solid var(--sp-border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--sp-text)" }}>🏆 Jahon Chempionati 2026</p>
              <p style={{ fontSize: 10, color: accent, fontWeight: 600 }}>🇺🇸🇨🇦🇲🇽 USA/Canada/Mexico</p>
            </div>
            {/* Group picker */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
              {(data?.wc2026 || []).map((_, gi) => (
                <button key={gi} onClick={() => setWcGroup(gi)}
                  style={{
                    padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 10, fontWeight: 700,
                    background: wcGroup === gi ? accent : "var(--sp-border)",
                    color: wcGroup === gi ? "#000" : "var(--sp-text-muted)",
                  }}>
                  {String.fromCharCode(65 + gi)} guruhi
                </button>
              ))}
              {!data?.wc2026?.length && ["A","B","C","D","E","F","G","H","I","J","K","L"].map((g, gi) => (
                <button key={gi} onClick={() => setWcGroup(gi)}
                  style={{
                    padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 10, fontWeight: 700,
                    background: wcGroup === gi ? accent : "var(--sp-border)",
                    color: wcGroup === gi ? "#000" : "var(--sp-text-muted)",
                  }}>
                  {g} guruhi
                </button>
              ))}
            </div>
            {/* Standing table */}
            {isLoading ? (
              <p style={{ fontSize: 12, color: "var(--sp-text-muted)", textAlign: "center", padding: 16 }}>Yuklanmoqda…</p>
            ) : (data?.wc2026?.[wcGroup] || []).length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: compact ? 10 : 11 }}>
                <thead>
                  <tr style={{ color: "var(--sp-text-dim)", fontSize: 9 }}>
                    <th style={{ textAlign: "left", padding: "4px 0", width: 24 }}>#</th>
                    <th style={{ textAlign: "left", padding: "4px 0" }}>Jamoa</th>
                    <th style={{ padding: "4px 4px" }}>O</th>
                    <th style={{ padding: "4px 4px" }}>G</th>
                    <th style={{ padding: "4px 4px" }}>D</th>
                    <th style={{ padding: "4px 4px" }}>M</th>
                    <th style={{ padding: "4px 4px", color: accent, fontWeight: 700 }}>B</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.wc2026[wcGroup] || []).map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--sp-border)", background: i < 2 ? `${accent}08` : "transparent" }}>
                      <td style={{ padding: "6px 0", fontWeight: 700, color: i < 2 ? accent : "var(--sp-text-muted)" }}>{r.pos}</td>
                      <td style={{ padding: "6px 0", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 14 }}>{r.fl}</span>
                        <span style={{ color: "var(--sp-text)", fontWeight: i < 2 ? 700 : 400 }}>{r.team}</span>
                      </td>
                      <td style={{ textAlign: "center", color: "var(--sp-text-muted)", padding: "6px 4px" }}>{r.played}</td>
                      <td style={{ textAlign: "center", color: "#34d399", padding: "6px 4px" }}>{r.won}</td>
                      <td style={{ textAlign: "center", color: "var(--sp-text-muted)", padding: "6px 4px" }}>{r.drawn}</td>
                      <td style={{ textAlign: "center", color: "#f87171", padding: "6px 4px" }}>{r.lost}</td>
                      <td style={{ textAlign: "center", fontWeight: 800, color: accent, padding: "6px 4px" }}>{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: 11, color: "var(--sp-text-muted)", textAlign: "center", padding: 12 }}>
                Ma'lumot yuklanmadi. Sahifani yangilang.
              </p>
            )}
          </div>
          {/* Uzbekistan */}
          {(data?.uzLeague || []).length > 0 && (
            <div style={{
              borderRadius: 16, padding: compact ? "14px" : "18px",
              background: "var(--sp-surface)", border: `1px solid ${accent}22`,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--sp-text)", marginBottom: 10 }}>🇺🇿 O'zbekiston Superligasi</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: compact ? 10 : 11 }}>
                <tbody>
                  {(data?.uzLeague || []).slice(0, 8).map((r, i) => (
                    <tr key={i} style={{ borderTop: i > 0 ? "1px solid var(--sp-border)" : "none" }}>
                      <td style={{ padding: "5px 0", width: 20, fontWeight: 700, color: i < 3 ? accent : "var(--sp-text-dim)", fontSize: 10 }}>{r.pos}</td>
                      <td style={{ padding: "5px 0", display: "flex", gap: 5, alignItems: "center" }}>
                        <span>{r.fl}</span>
                        <span style={{ color: "var(--sp-text)", fontWeight: i < 3 ? 700 : 400 }}>{r.team}</span>
                      </td>
                      <td style={{ textAlign: "center", color: "var(--sp-text-muted)", width: 24 }}>{r.played}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: accent, width: 24 }}>{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Streams */}
      {view === "streams" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            borderRadius: 14, padding: "12px 14px",
            background: `${accent}0a`, border: `1px solid ${accent}22`,
          }}>
            <p style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 4 }}>💡 Bepul futbol tomosha qilish</p>
            <p style={{ fontSize: 10, color: "var(--sp-text-muted)", lineHeight: 1.5 }}>
              Quyidagi kanallar orqali Jahon chempionati va boshqa o'yinlarni bepul tomosha qiling. UTG kabalga hojat yo'q!
            </p>
          </div>
          {WC_STREAMS.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{
                borderRadius: 14, padding: "14px 16px", textDecoration: "none",
                background: "var(--sp-surface)", border: `1px solid ${s.color}22`,
                display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s", cursor: "pointer",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${s.color}10`; (e.currentTarget as HTMLElement).style.borderColor = `${s.color}44`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--sp-surface)"; (e.currentTarget as HTMLElement).style.borderColor = `${s.color}22`; }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--sp-text)" }}>{s.name}</p>
                <p style={{ fontSize: 10, color: "var(--sp-text-muted)" }}>{s.url.replace("https://", "")}</p>
              </div>
              <span style={{ fontSize: 16, color: s.color, opacity: 0.7 }}>→</span>
            </a>
          ))}
          <div style={{
            borderRadius: 12, padding: "10px 14px",
            background: "var(--sp-surface)", border: "1px solid var(--sp-border)",
            fontSize: 10, color: "var(--sp-text-dim)", lineHeight: 1.5,
          }}>
            ℹ️ FIFA+ platformasida ko'plab o'yinlar bepul jonli efirda beriladi. Ro'yxatdan o'tish talab qilinishi mumkin.
          </div>
        </div>
      )}
    </div>
  );
}
