import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import type { Square, PieceSymbol, Color } from "chess.js";

// ──────────────── PIECE VALUES ─────────────────────────────────────────────
const PV: Record<string, number> = { p:100, n:320, b:330, r:500, q:900, k:20000 };

// Piece-square tables (standard, white's perspective)
const PST: Record<string, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function evalBoard(game: Chess): number {
  const board = game.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const idx = p.color === "w" ? r * 8 + c : (7 - r) * 8 + c;
      const val = PV[p.type] + (PST[p.type]?.[idx] ?? 0);
      score += p.color === "w" ? val : -val;
    }
  }
  return score;
}

function orderedMoves(game: Chess) {
  return game.moves({ verbose: true }).sort((a, b) => {
    const av = a.captured ? PV[a.captured] - PV[a.piece] : -999;
    const bv = b.captured ? PV[b.captured] - PV[b.piece] : -999;
    return bv - av;
  });
}

function minimax(
  game: Chess, depth: number, alpha: number, beta: number, maximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) return maximizing ? -Infinity : Infinity;
    if (game.isDraw()) return 0;
    return evalBoard(game);
  }
  const moves = orderedMoves(game);
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m); best = Math.max(best, minimax(game, depth-1, alpha, beta, false)); game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      game.move(m); best = Math.min(best, minimax(game, depth-1, alpha, beta, true)); game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(fen: string, depth: number) {
  const game = new Chess(fen);
  const moves = orderedMoves(game);
  if (!moves.length) return null;
  const isWhite = game.turn() === "w";
  let bestMove = moves[0];
  let bestScore = isWhite ? -Infinity : Infinity;
  for (const m of moves) {
    game.move(m);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
    game.undo();
    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score; bestMove = m;
    }
  }
  return bestMove;
}

// ──────────────── PIECE SYMBOLS ───────────────────────────────────────────
const SYM: Record<string, string> = {
  wk:"♔", wq:"♕", wr:"♖", wb:"♗", wn:"♘", wp:"♙",
  bk:"♚", bq:"♛", br:"♜", bb:"♝", bn:"♞", bp:"♟",
};
const DIFF_LABEL = ["","Yangi boshlovchi","Havaskor","Tajribali","Ekspert","Grandmaster"];
const DIFF_DEPTH = [0, 1, 2, 3, 4, 5];

// ──────────────── COMPONENT ───────────────────────────────────────────────
export default function ChessWidget({ accent, compact }: { accent: string; compact?: boolean }) {
  const [game, setGame]           = useState(() => new Chess());
  const [selected, setSelected]   = useState<Square | null>(null);
  const [validMoves, setVMoves]   = useState<Set<Square>>(new Set());
  const [lastMove, setLastMove]   = useState<{ from: Square; to: Square } | null>(null);
  const [flipped, setFlipped]     = useState(false);
  const [difficulty, setDiff]     = useState(3);
  const [playerColor, setPColor]  = useState<Color>("w");
  const [thinking, setThinking]   = useState(false);
  const [gameStatus, setStatus]   = useState<string | null>(null);
  const [capW, setCapW]           = useState<PieceSymbol[]>([]);
  const [capB, setCapB]           = useState<PieceSymbol[]>([]);
  const [history, setHistory]     = useState<string[]>([]);
  const [promo, setPromo]         = useState<{ from: Square; to: Square } | null>(null);
  const [moveCount, setMoveCount] = useState(0);

  const gameRef  = useRef(game);
  useEffect(() => { gameRef.current = game; }, [game]);
  const histRef  = useRef<HTMLDivElement>(null);
  useEffect(() => { if (histRef.current) histRef.current.scrollTop = histRef.current.scrollHeight; }, [history]);

  // ── Responsive board size ──
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sz, setSz] = useState(compact ? 40 : 54);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const calc = () => {
      const W = el.clientWidth;
      // window.innerHeight is reliable; subtract topbar(48) + widget overhead(170)
      const boardH = Math.max(200, window.innerHeight - 48 - 170);
      // Desktop: board sits left of right panel (~160px + gap)
      const boardW = compact ? W - 30 : W - 172 - 24;
      const raw = Math.min(boardH, boardW) / 8;
      setSz(Math.max(40, Math.min(98, Math.floor(raw))));
    };
    const obs = new ResizeObserver(calc);
    obs.observe(el);
    window.addEventListener("resize", calc, { passive: true });
    calc();
    return () => { obs.disconnect(); window.removeEventListener("resize", calc); };
  }, [compact]);

  const checkStatus = useCallback((g: Chess) => {
    if (g.isCheckmate()) setStatus(g.turn() === "w" ? "⬛ Qora g'alaba! Shoh mat!" : "⬜ Oq g'alaba! Shoh mat!");
    else if (g.isStalemate()) setStatus("🤝 Pat! Durang.");
    else if (g.isDraw()) setStatus("🤝 Durang!");
    else setStatus(null);
  }, []);

  const refreshCaptures = useCallback((g: Chess) => {
    const hist = g.history({ verbose: true });
    const wb: PieceSymbol[] = [], bb: PieceSymbol[] = [];
    hist.forEach(m => { if (m.captured) { if (m.color === "w") wb.push(m.captured); else bb.push(m.captured); } });
    setCapW(wb); setCapB(bb);
  }, []);

  const doAI = useCallback((fen: string, diff: number, pColor: Color) => {
    const g = new Chess(fen);
    if (g.isGameOver() || g.turn() === pColor) return;
    setThinking(true);
    setTimeout(() => {
      const best = getBestMove(fen, DIFF_DEPTH[diff]);
      if (best) {
        const ng = new Chess(fen);
        const made = ng.move(best);
        if (made) {
          setLastMove({ from: made.from as Square, to: made.to as Square });
          setHistory(h => [...h, made.san]);
          setMoveCount(c => c + 1);
          refreshCaptures(ng);
          checkStatus(ng);
          setGame(ng);
        }
      }
      setThinking(false);
    }, 30);
  }, [refreshCaptures, checkStatus]);

  const handleClick = useCallback((sq: Square) => {
    if (thinking || gameStatus || promo) return;
    const g = gameRef.current;

    if (selected && validMoves.has(sq)) {
      const piece = g.get(selected);
      const isPromo = piece?.type === "p" &&
        ((piece.color === "w" && sq[1] === "8") || (piece.color === "b" && sq[1] === "1"));
      if (isPromo) { setPromo({ from: selected, to: sq }); setSelected(null); setVMoves(new Set()); return; }

      const ng = new Chess(g.fen());
      const made = ng.move({ from: selected, to: sq });
      if (made) {
        setSelected(null); setVMoves(new Set());
        setLastMove({ from: made.from as Square, to: made.to as Square });
        setHistory(h => [...h, made.san]);
        setMoveCount(c => c + 1);
        refreshCaptures(ng);
        checkStatus(ng);
        setGame(ng);
        setTimeout(() => doAI(ng.fen(), difficulty, playerColor), 80);
      }
      return;
    }

    const piece = g.get(sq);
    if (piece && piece.color === playerColor && piece.color === g.turn()) {
      setSelected(sq);
      setVMoves(new Set(g.moves({ square: sq, verbose: true }).map(m => m.to as Square)));
    } else { setSelected(null); setVMoves(new Set()); }
  }, [thinking, gameStatus, promo, selected, validMoves, playerColor, difficulty, doAI, refreshCaptures, checkStatus]);

  const doPromotion = (p: PieceSymbol) => {
    if (!promo) return;
    const ng = new Chess(gameRef.current.fen());
    const made = ng.move({ from: promo.from, to: promo.to, promotion: p });
    if (made) {
      setLastMove({ from: made.from as Square, to: made.to as Square });
      setHistory(h => [...h, made.san]);
      setMoveCount(c => c + 1);
      refreshCaptures(ng);
      checkStatus(ng);
      setGame(ng);
      setPromo(null);
      setTimeout(() => doAI(ng.fen(), difficulty, playerColor), 80);
    }
  };

  const startNew = useCallback((pColor: Color = playerColor, diff: number = difficulty) => {
    const ng = new Chess();
    setGame(ng); setSelected(null); setVMoves(new Set()); setLastMove(null);
    setStatus(null); setHistory([]); setCapW([]); setCapB([]);
    setPromo(null); setThinking(false); setMoveCount(0);
    if (pColor === "b") setTimeout(() => doAI(ng.fen(), diff, pColor), 400);
  }, [playerColor, difficulty, doAI]);

  const undoMove = () => {
    if (thinking) return;
    const ng = new Chess(gameRef.current.fen());
    ng.undo(); ng.undo();
    const h = ng.history();
    setHistory(h);
    setMoveCount(ng.history({ verbose: true }).length);
    refreshCaptures(ng);
    checkStatus(ng);
    setLastMove(null); setSelected(null); setVMoves(new Set());
    setGame(ng);
  };

  // ── Board ──
  const board = game.board();
  const rows  = flipped ? [...board].reverse().map(r => [...r].reverse()) : board;
  const files = flipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];
  const ranks = flipped ? ["1","2","3","4","5","6","7","8"] : ["8","7","6","5","4","3","2","1"];

  const sqFromCoords = (ri: number, ci: number): Square =>
    `${files[ci]}${ranks[ri]}` as Square;

  const inCheck = game.inCheck();
  let kingInCheck: Square | null = null;
  if (inCheck) {
    const turn = game.turn();
    outer: for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p?.type === "k" && p.color === turn) { kingInCheck = (String.fromCharCode(97+c) + (8-r)) as Square; break outer; }
    }
  }

  const acF = accent + "22";
  const acM = accent + "55";
  const card = { background:"var(--sp-surface)", border:"1px solid var(--sp-border)", borderRadius:10 };

  // Classic Chess.com board colors
  const LIGHT = "#f0d9b5";
  const DARK  = "#b58863";
  function sqColor(light: boolean, isSel: boolean, isLast: boolean, isChk: boolean) {
    if (isChk)  return light ? "#ff7070" : "#cc2929";
    if (isSel)  return light ? "#f6f669" : "#c9ca53";
    if (isLast) return light ? "#cdd269" : "#a9a841";
    return light ? LIGHT : DARK;
  }

  const matAdv = capW.reduce((s,p) => s + PV[p], 0) - capB.reduce((s,p) => s + PV[p], 0);

  return (
    <div ref={wrapRef} style={{ display:"flex", flexDirection:"column", gap:10, height:"100%", overflow:"auto" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:22 }}>♟️</span>
          <div>
            <div style={{ color:"var(--sp-text)", fontWeight:700, fontSize:15, lineHeight:1.2 }}>Shaxmat</div>
            <div style={{ color:"var(--sp-text-dim)", fontSize:10 }}>{DIFF_LABEL[difficulty]} · {moveCount} harakat</div>
          </div>
          {thinking && (
            <div style={{ display:"flex", alignItems:"center", gap:4, background:acF, border:`1px solid ${acM}`, borderRadius:6, padding:"2px 8px" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:accent, display:"inline-block", animation:"pulse 0.8s ease-in-out infinite" }}/>
              <span style={{ color:accent, fontSize:10, fontWeight:600 }}>AI o'ylayapti</span>
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:5 }}>
          <button onClick={() => setFlipped(f=>!f)}
            style={{ padding:"4px 9px", background:"var(--sp-surface)", border:"1px solid var(--sp-border)", borderRadius:6, color:"var(--sp-text-muted)", fontSize:11, cursor:"pointer" }} title="Taxtani ag'darish">
            🔄
          </button>
          <button onClick={undoMove} disabled={thinking || history.length < 2}
            style={{ padding:"4px 9px", background:"var(--sp-surface)", border:"1px solid var(--sp-border)", borderRadius:6, color:"var(--sp-text-muted)", fontSize:11, cursor:"pointer", opacity: history.length < 2 ? 0.35 : 1 }} title="Qayta harakat">
            ↩
          </button>
          <button onClick={() => startNew()}
            style={{ padding:"4px 12px", background:accent, border:"none", borderRadius:6, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            ✨ Yangi
          </button>
        </div>
      </div>

      {/* ── Settings Row ── */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <span style={{ color:"var(--sp-text-dim)", fontSize:10 }}>Daraja:</span>
          {[1,2,3,4,5].map(d => (
            <button key={d} onClick={() => setDiff(d)}
              style={{ width:22, height:22, borderRadius:4, border:`1px solid ${d===difficulty?accent:"var(--sp-border)"}`,
                background: d===difficulty?accent:"transparent", color: d===difficulty?"#fff":"var(--sp-text-dim)",
                fontSize:10, cursor:"pointer", fontWeight:700, transition:"all 0.15s" }}>
              {d}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          <span style={{ color:"var(--sp-text-dim)", fontSize:10 }}>Rang:</span>
          {(["w","b"] as Color[]).map(c => (
            <button key={c} onClick={() => { setPColor(c); startNew(c, difficulty); }}
              style={{ padding:"2px 8px", borderRadius:4, border:`1px solid ${c===playerColor?accent:"var(--sp-border)"}`,
                background: c===playerColor?accent:"transparent", color: c===playerColor?"#fff":"var(--sp-text-dim)",
                fontSize:10, cursor:"pointer", transition:"all 0.15s" }}>
              {c==="w" ? "⬜ Oq" : "⬛ Qora"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Board + Panel ── */}
      <div style={{ display:"flex", gap:12, flex:1, flexWrap: compact ? "wrap" : "nowrap", alignItems:"flex-start" }}>

        {/* Board */}
        <div style={{ flexShrink:0 }}>
          {/* AI captures */}
          <div style={{ display:"flex", gap:2, marginBottom:4, minHeight:18, alignItems:"center" }}>
            {(playerColor==="w" ? capB : capW).map((p, i) => (
              <span key={i} style={{ fontSize:11, color:"var(--sp-text-muted)" }}>{SYM[(playerColor==="w"?"w":"b")+p]}</span>
            ))}
            {matAdv !== 0 && <span style={{ fontSize:9, color: matAdv < 0 ? "#4ade80" : "#f87171", marginLeft:3 }}>
              {matAdv < 0 ? `+${Math.abs(matAdv/100)|0}` : `-${(matAdv/100)|0}`}
            </span>}
          </div>

          {/* Grid — no separate label strips; labels overlay inside corner squares */}
          <div style={{
            display:"grid",
            gridTemplateColumns:`repeat(8,${sz}px)`,
            gridTemplateRows:`repeat(8,${sz}px)`,
            borderRadius:10, overflow:"hidden",
            boxShadow:"0 12px 40px rgba(0,0,0,0.55), 0 0 0 3px rgba(0,0,0,0.35)",
          }}>
            {rows.map((row, ri) =>
              row.map((piece, ci) => {
                const sq    = sqFromCoords(ri, ci);
                const light = (ri + ci) % 2 === 0;
                const isSel = selected === sq;
                const isVM  = validMoves.has(sq);
                const isLM  = lastMove?.from === sq || lastMove?.to === sq;
                const isKC  = kingInCheck === sq;
                const bg    = sqColor(light, isSel, isLM, isKC);

                // Coordinate labels: rank on left edge (col 0), file on bottom edge (row 7)
                const showRank = ci === 0;
                const showFile = ri === 7;
                const lblColor = light ? DARK : LIGHT;

                return (
                  <div key={sq} onClick={() => handleClick(sq)}
                    style={{ width:sz, height:sz, background:bg,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      cursor:"pointer", position:"relative", userSelect:"none",
                      transition:"background 0.1s",
                      outline: isSel ? `3px solid rgba(0,0,0,0.5)` : "none",
                      outlineOffset: isSel ? "-3px" : "0",
                    }}>

                    {/* Coordinate labels inside corner squares */}
                    {showRank && (
                      <span style={{ position:"absolute", top:2, left:3, fontSize:Math.max(8, sz*0.18),
                        fontWeight:700, color:lblColor, lineHeight:1, pointerEvents:"none", zIndex:3 }}>
                        {ranks[ri]}
                      </span>
                    )}
                    {showFile && (
                      <span style={{ position:"absolute", bottom:2, right:3, fontSize:Math.max(8, sz*0.18),
                        fontWeight:700, color:lblColor, lineHeight:1, pointerEvents:"none", zIndex:3 }}>
                        {files[ci]}
                      </span>
                    )}

                    {/* Valid move: dot for empty, ring for capture */}
                    {isVM && !piece && (
                      <div style={{ width:sz*0.32, height:sz*0.32, borderRadius:"50%",
                        background:"rgba(0,0,0,0.22)", pointerEvents:"none", zIndex:2 }}/>
                    )}
                    {isVM && piece && (
                      <div style={{ position:"absolute", inset:0, borderRadius:0,
                        background:`radial-gradient(circle, transparent 55%, rgba(0,0,0,0.25) 55%)`,
                        pointerEvents:"none", zIndex:2 }}/>
                    )}

                    {/* Piece */}
                    {piece && (
                      <span style={{
                        fontSize: sz * 0.78, lineHeight:1, zIndex:1,
                        color: piece.color === "w" ? "#ffffff" : "#1a0f00",
                        textShadow: piece.color === "w"
                          ? "0 1px 0 #8B6914, 0 -1px 0 #8B6914, 1px 0 0 #8B6914, -1px 0 0 #8B6914, 0 2px 4px rgba(0,0,0,0.5)"
                          : "0 1px 0 rgba(255,220,100,0.25), 0 2px 4px rgba(0,0,0,0.4)",
                        pointerEvents:"none", display:"block", userSelect:"none",
                      }}>
                        {SYM[piece.color + piece.type]}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Player captures */}
          <div style={{ display:"flex", gap:2, marginTop:4, minHeight:18, alignItems:"center" }}>
            {(playerColor==="w" ? capW : capB).map((p, i) => (
              <span key={i} style={{ fontSize:11, color:"var(--sp-text-muted)" }}>{SYM[(playerColor==="b"?"w":"b")+p]}</span>
            ))}
            {matAdv !== 0 && <span style={{ fontSize:9, color: matAdv > 0 ? "#4ade80" : "#f87171", marginLeft:3 }}>
              {matAdv > 0 ? `+${(matAdv/100)|0}` : `-${Math.abs(matAdv/100)|0}`}
            </span>}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={{ flex:1, minWidth:130, display:"flex", flexDirection:"column", gap:8 }}>

          {/* Status */}
          {gameStatus ? (
            <div style={{ ...card, padding:14, textAlign:"center", borderColor: accent + "55" }}>
              <div style={{ fontSize:15, fontWeight:800, color:accent, marginBottom:10 }}>{gameStatus}</div>
              <button onClick={() => startNew()}
                style={{ padding:"6px 18px", background:accent, border:"none", borderRadius:6, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Qayta o'ynash ♟
              </button>
            </div>
          ) : (
            <div style={{ ...card, padding:8, display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:14, height:14, borderRadius:2, flexShrink:0,
                background: game.turn()==="w" ? "#f8f8f8" : "#1c1208",
                border: `2px solid ${game.turn()==="w" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.2)"}`,
                boxShadow:"0 1px 3px rgba(0,0,0,0.4)" }}/>
              <div>
                <div style={{ color:"var(--sp-text)", fontSize:11, fontWeight:700 }}>
                  {game.turn() === playerColor
                    ? (thinking ? "..." : "Sizning navbatingiz")
                    : (thinking ? "🤔 AI o'ylayapti..." : "Raqib navbati")}
                </div>
                {inCheck && <div style={{ color:"#f87171", fontSize:10, fontWeight:700 }}>⚠️ Shoh ostida!</div>}
              </div>
            </div>
          )}

          {/* AI strength bar */}
          <div style={{ ...card, padding:8 }}>
            <div style={{ color:"var(--sp-text-dim)", fontSize:9, fontWeight:700, letterSpacing:1, marginBottom:5 }}>AI KUCHI</div>
            <div style={{ display:"flex", gap:2, marginBottom:4 }}>
              {[1,2,3,4,5].map(d => (
                <div key={d} style={{ flex:1, height:5, borderRadius:3, transition:"background 0.3s",
                  background: d<=difficulty ? accent : "var(--sp-border)" }}/>
              ))}
            </div>
            <div style={{ color:accent, fontSize:10, fontWeight:600 }}>{DIFF_LABEL[difficulty]}</div>
          </div>

          {/* Move history */}
          <div style={{ ...card, padding:8, flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ color:"var(--sp-text-dim)", fontSize:9, fontWeight:700, letterSpacing:1, marginBottom:6 }}>HARAKATLAR</div>
            <div ref={histRef} style={{ flex:1, overflowY:"auto", maxHeight: compact ? 120 : 260 }}>
              {history.length === 0 ? (
                <div style={{ color:"var(--sp-text-dim)", fontSize:10, textAlign:"center", padding:12 }}>
                  Hali harakat yo'q
                </div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, fontFamily:"monospace" }}>
                  <tbody>
                    {Array.from({ length: Math.ceil(history.length/2) }, (_, i) => (
                      <tr key={i} style={{ background: i%2===0 ? "transparent" : "rgba(255,255,255,0.03)" }}>
                        <td style={{ color:"var(--sp-text-dim)", fontSize:9, paddingRight:4, width:20, textAlign:"right" }}>{i+1}.</td>
                        <td style={{ padding:"1px 4px", borderRadius:3,
                          background: history.length-1===i*2 ? acF : "transparent",
                          color:"var(--sp-text)", fontWeight: history.length-1===i*2 ? 700 : 400 }}>
                          {history[i*2]}
                        </td>
                        <td style={{ padding:"1px 4px", borderRadius:3,
                          background: history.length-1===i*2+1 ? acF : "transparent",
                          color:"var(--sp-text)", fontWeight: history.length-1===i*2+1 ? 700 : 400 }}>
                          {history[i*2+1] || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tips */}
          {!gameStatus && history.length < 3 && (
            <div style={{ ...card, padding:8, borderColor: acM }}>
              <div style={{ color:"var(--sp-text-dim)", fontSize:10 }}>
                💡 <strong style={{ color:"var(--sp-text-muted)" }}>Qanday o'ynash:</strong> Dona bosing → yashil doiralar ko'rinadi → manzil bosing
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Promotion Modal ── */}
      {promo && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:"var(--sp-surface)", border:`1px solid ${accent}66`, borderRadius:16, padding:28, textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ color:"var(--sp-text)", fontWeight:800, fontSize:14, marginBottom:4 }}>Piyodani oshiring!</div>
            <div style={{ color:"var(--sp-text-dim)", fontSize:11, marginBottom:16 }}>Qaysi donaga aylantirmoqchisiz?</div>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              {(["q","r","b","n"] as PieceSymbol[]).map(p => (
                <button key={p} onClick={() => doPromotion(p)}
                  style={{ width:60, height:60, borderRadius:10, border:`1px solid ${acM}`,
                    background:"var(--sp-surface)", cursor:"pointer", fontSize:36,
                    transition:"transform 0.15s, border-color 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; (e.currentTarget as HTMLElement).style.borderColor = accent; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.borderColor = acM; }}>
                  {SYM[playerColor + p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:.5;transform:scale(.9)}50%{opacity:1;transform:scale(1.1)}}`}</style>
    </div>
  );
}
