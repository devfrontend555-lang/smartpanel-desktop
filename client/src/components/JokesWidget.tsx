import { useState, useEffect, useCallback } from "react";

const JOKES = [
  "— Uka, 100 so'm bor-a?\n— Yo'q akaxon.\n— Mana shu yerda 1 soat o'tir, 200 so'm bo'lsa ber!",
  "Nafaqaxo'r chol ertasi kuni do'stiga: <<Kecha xotin meni 40 yil burchim uchun minnatdorchilik bildirdi.>>\n— Nima qilding?\n— Uxlab yotdim.",
  "Shifokor: — Yaxshi xabar va yomon xabar bor.\nBemor: — Avval yaxshisini ayting.\nShifokor: — Siz juda yaxshi uxlaysiz.\nBemor: — Yomoni-chi?\n— Sinov paytida uxlab qoldingiz.",
  "O'qituvchi: — 2 x 8 necha?\nBola: — 16!\nO'qituvchi: — To'g'ri! 8 x 2-chi?\nBola: — Navbatimizmi yoki siznikimi?",
  "Samolyotda mexanik qichqiradi: <<Muammo bor!>>\nAmerikacha: <<Sug'urta bormi?>>\nYaponiyacha: <<Xato qayerda?>>\nO'zbekcha: <<Qo'shni ham uchyaptimi?>>",
  "Bola: — Dada, menga velosiped olib ber!\nDada: — Qo'ying, biz kambag'allar.\nBola: — Nima uchun?\nDada: — Chunki sen qimmat velosiped so'rayapsan.",
  "Xotin: — Nima qilayapsiz?\nEr: — Hech narsa.\nXotin: — Kecha ham hech narsa qildingiz.\nEr: — Ish tugamagan.",
  "Tibbiyot imtihonida:\nProfessor: — Bemor 3 kun oldin vafot etgan. Nima qilamiz?\nTalaba: — Qorinni tekshiramiz!\nProfessor: — Nima uchun?\nTalaba: — Balki u och qolgandir.",
  "Kuyov: — Xonimim, men sizni sog'indim!\nQaynonasi: — Menam!\nKuyov: — (ichida) Miltiq topolmasam kerak...",
  "— Bugun qo'shnim bilan duel qildik.\n— Kim g'olib chiqdi?\n— Ikkalamiz ham tikuvchi chaqirdik.",
  "O'quvchi: — Ustoz, boshim og'riyapti!\nO'qituvchi: — Uyga bor!\nIkkinchi: — Meniyam!\nO'qituvchi: — Birga boring!\nUchinchi: — Ustozning oyog'i og'riyapti!\nO'qituvchi: — Klass bilan boring!",
  "Mashinada 4 kishi:\n— Kim haydayapti?\n— Sudya.\n— Kimni?\n— Hammani.",
  "Mehmon: — Uyingiz juda kichik.\nEgasi: — Endi yanada kichik bo'ladi, chunki siz kirmoqchisiz.",
  "Er: — Xotinim kecha xurrak otdi!\nDo'st: — Yuqori ovozda?\nEr: — Qo'shnining itlari ham uyg'ondi.",
  "Bola: — Dada, nega oy goh dumaloq, goh yarim bo'ladi?\nDada: — O'g'lim, oy dietada.",
  "Pochta bo'limida:\n— Xat yubormoqchi edim.\n— Katta yoki kichik?\n— Ular qaysi tomonimdan o'lchaydi?",
  "— Necha yoshdasiz?\n— 30.\n— Ko'p ko'rinadiz.\n— Shu yoshdan boshladim.",
  "Talaba imtihon oldidan: Xudo yordam ber!\nImtihon boshlanganida: Xudo, kechir!",
  "Haydovchi qizil chiroqda to'xtamadi.\nPolitsiya: — Nima qilyapsiz?\nHaydovchi: — Telefonda gaplashayotgandim.\nPolitsiya: — Keyingi safar e'tibor bering.",
  "Bolakay do'konda:\n— Bir narsa olamanku, lekin pulsizman.\nSotuvchi: — Pulim bo'lmasa ham olaman deyishadi.\nBolakay: — O'sha odamni chaqiring!",
];

const QUOTES = [
  { text: "Yaxshilik qil, daryoga tashla — baliq bilmasa, Xudoy biladi.", author: "O'zbek maqoli" },
  { text: "Mehnat qilsang — temir ham yeyiladi, mehnat qilmasang — temir ham yeyer.", author: "O'zbek hikmatı" },
  { text: "Kitob o'qigan — olam kezgan.", author: "Sharq donishmanди" },
  { text: "Bugun qiyin, ertaga oson. Bugun dam olsang, ertaga ham qiyin.", author: "Noʻqul" },
  { text: "Doʻstingni sinaysan desang — birga sayohat qil.", author: "O'zbek maqoli" },
  { text: "Hamma uchun ulguray dema, avval o'zing uchun ulgu.", author: "Donishmand" },
  { text: "Qushni patidan, odamni suhbatidan bilib olasan.", author: "Xalq hikmatı" },
  { text: "Yaxshi so'z yuz ko'ngilni oshiradi.", author: "O'zbek maqoli" },
  { text: "Sabr tubida — oltin.", author: "Sharq maqoli" },
  { text: "Biror narsani bilmasang, bilaman dema. Bilsang, boshqalarga o'rgat.", author: "Alisher Navoiy" },
];

interface Props { accent?: string; compact?: boolean; }

export default function JokesWidget({ accent = "#fbbf24", compact }: Props) {
  const [mode, setMode] = useState<"hazil" | "gap">("hazil");
  const [jIdx, setJIdx] = useState(() => Math.floor(Math.random() * JOKES.length));
  const [qIdx, setQIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shake, setShake] = useState(false);

  const joke = JOKES[jIdx];
  const quote = QUOTES[qIdx];

  const next = useCallback(() => {
    setShake(true);
    setLiked(false);
    setCopied(false);
    setTimeout(() => {
      if (mode === "hazil") setJIdx(i => (i + 1) % JOKES.length);
      else setQIdx(i => (i + 1) % QUOTES.length);
      setShake(false);
    }, 180);
  }, [mode]);

  const random = useCallback(() => {
    setShake(true);
    setLiked(false);
    setTimeout(() => {
      if (mode === "hazil") setJIdx(Math.floor(Math.random() * JOKES.length));
      else setQIdx(Math.floor(Math.random() * QUOTES.length));
      setShake(false);
    }, 180);
  }, [mode]);

  const copyText = useCallback(() => {
    const text = mode === "hazil" ? joke : `"${quote.text}" — ${quote.author}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [mode, joke, quote]);

  const share = useCallback(() => {
    const text = mode === "hazil"
      ? `😂 SmartPanel hazil:\n\n${joke}`
      : `💡 Bugungi gap:\n\n"${quote.text}"\n— ${quote.author}`;
    if (navigator.share) navigator.share({ text });
    else copyText();
  }, [mode, joke, quote, copyText]);

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Mode toggle */}
      <div style={{
        display: "flex", gap: 4, background: "var(--sp-surface)",
        border: "1px solid var(--sp-border)", borderRadius: 14, padding: 4,
      }}>
        {(["hazil", "gap"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setLiked(false); setCopied(false); }}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 700, transition: "all 0.15s",
              background: mode === m ? accent : "transparent",
              color: mode === m ? "#000" : "var(--sp-text-muted)",
              boxShadow: mode === m ? `0 4px 14px ${accent}44` : "none",
            }}>
            {m === "hazil" ? "😂 Hazillar" : "💡 Dono Gaplar"}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div style={{
        borderRadius: 22, padding: compact ? "20px 18px" : "28px 24px",
        background: `linear-gradient(145deg,${accent}16,${accent}04)`,
        border: `1px solid ${accent}33`,
        position: "relative", overflow: "hidden",
        transition: "opacity 0.18s",
        opacity: shake ? 0 : 1,
        transform: shake ? "scale(0.97)" : "scale(1)",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle,${accent}18,transparent 65%)`, pointerEvents: "none" }} />

        {mode === "hazil" ? (
          <>
            <div style={{ fontSize: compact ? 32 : 48, marginBottom: 12, position: "relative" }}>😂</div>
            <p style={{ fontSize: compact ? 13 : 14, color: "var(--sp-text)", lineHeight: 1.75, whiteSpace: "pre-line", position: "relative" }}>
              {joke}
            </p>
            <p style={{ fontSize: 10, color: "var(--sp-text-dim)", marginTop: 12 }}>
              #{jIdx + 1} / {JOKES.length}
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: compact ? 32 : 48, marginBottom: 12 }}>💡</div>
            <p style={{ fontSize: compact ? 13 : 15, color: accent, fontStyle: "italic", lineHeight: 1.7, fontWeight: 600, position: "relative" }}>
              "{quote.text}"
            </p>
            <p style={{ fontSize: 12, color: "var(--sp-text-muted)", marginTop: 10, fontWeight: 500 }}>
              — {quote.author}
            </p>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setLiked(l => !l)}
          style={{
            flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${liked ? "#f472b688" : "var(--sp-border)"}`,
            background: liked ? "#f472b614" : "var(--sp-surface)", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, fontWeight: 600,
            color: liked ? "#f472b6" : "var(--sp-text-muted)", transition: "all 0.15s",
          }}>
          {liked ? "❤️ Yoqdi!" : "🤍 Yoqdi"}
        </button>
        <button onClick={copyText}
          style={{
            flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${copied ? accent + "88" : "var(--sp-border)"}`,
            background: copied ? `${accent}14` : "var(--sp-surface)", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, fontWeight: 600,
            color: copied ? accent : "var(--sp-text-muted)", transition: "all 0.15s",
          }}>
          {copied ? "✅ Nusxalandi" : "📋 Nusxa"}
        </button>
        <button onClick={share}
          style={{
            flex: 1, padding: "10px", borderRadius: 12, border: "1px solid var(--sp-border)",
            background: "var(--sp-surface)", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, fontWeight: 600,
            color: "var(--sp-text-muted)", transition: "all 0.15s",
          }}>
          📤 Ulash
        </button>
      </div>

      {/* Nav buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={next}
          style={{
            flex: 2, padding: "12px", borderRadius: 14, border: "none",
            background: accent, color: "#000", cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 700,
            boxShadow: `0 4px 20px ${accent}44`,
          }}>
          Keyingisi →
        </button>
        <button onClick={random}
          style={{
            flex: 1, padding: "12px", borderRadius: 14, border: `1px solid ${accent}44`,
            background: `${accent}12`, color: accent, cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
          }}>
          🎲 Tasodif
        </button>
      </div>

      {/* Stats */}
      <div style={{
        borderRadius: 12, padding: "10px 14px",
        background: "var(--sp-surface)", border: "1px solid var(--sp-border)",
        display: "flex", justifyContent: "space-around", textAlign: "center",
      }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: accent }}>{JOKES.length}</p>
          <p style={{ fontSize: 9, color: "var(--sp-text-dim)" }}>Hazil</p>
        </div>
        <div style={{ width: 1, background: "var(--sp-border)" }} />
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: "#60a5fa" }}>{QUOTES.length}</p>
          <p style={{ fontSize: 9, color: "var(--sp-text-dim)" }}>Dono gap</p>
        </div>
        <div style={{ width: 1, background: "var(--sp-border)" }} />
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>∞</p>
          <p style={{ fontSize: 9, color: "var(--sp-text-dim)" }}>Kayfiyat</p>
        </div>
      </div>
    </div>
  );
}
