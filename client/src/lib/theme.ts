export interface ThemeTokens {
  id: string;
  label: string;
  isDark: boolean;
  bg: string;
  sidebar: string;
  sidebarBorder: string;
  surface: string;
  surfaceHover: string;
  surfaceAlt: string;
  modal: string;
  overlay: string;
  border: string;
  borderStrong: string;
  text: string;
  textSub: string;
  textMuted: string;
  textDim: string;
  scroll: string;
  optBg: string;
  defaultAccent: string;
  preview: [string, string];
}

const DARK_BASE: ThemeTokens = {
  id: "dark", label: "Qora", isDark: true,
  bg: "linear-gradient(135deg,#060612 0%,#08081a 50%,#060612 100%)",
  sidebar: "rgba(255,255,255,0.025)",
  sidebarBorder: "rgba(255,255,255,0.06)",
  surface: "rgba(255,255,255,0.04)",
  surfaceHover: "rgba(255,255,255,0.09)",
  surfaceAlt: "rgba(0,0,0,0.40)",
  modal: "rgba(8,8,20,0.97)",
  overlay: "rgba(0,0,0,0.60)",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.13)",
  text: "#ffffff",
  textSub: "#7788aa",
  textMuted: "#555570",
  textDim: "#353548",
  scroll: "rgba(255,255,255,0.1)",
  optBg: "#0a0a1a",
  defaultAccent: "#FF6B35",
  preview: ["#060612", "#08081a"],
};

const LIGHT: ThemeTokens = {
  id: "light", label: "Oq", isDark: false,
  bg: "linear-gradient(135deg,#eef0f8 0%,#e4e8f4 50%,#eef0f8 100%)",
  sidebar: "rgba(255,255,255,0.82)",
  sidebarBorder: "rgba(0,0,0,0.07)",
  surface: "rgba(255,255,255,0.65)",
  surfaceHover: "rgba(255,255,255,0.92)",
  surfaceAlt: "rgba(0,0,0,0.05)",
  modal: "rgba(238,242,255,0.97)",
  overlay: "rgba(0,0,0,0.35)",
  border: "rgba(0,0,0,0.08)",
  borderStrong: "rgba(0,0,0,0.14)",
  text: "#111122",
  textSub: "#44446a",
  textMuted: "#8888aa",
  textDim: "#bbbbcc",
  scroll: "rgba(0,0,0,0.12)",
  optBg: "#f0f2ff",
  defaultAccent: "#6366f1",
  preview: ["#eef0f8", "#d8dcf0"],
};

export const THEMES: ThemeTokens[] = [
  DARK_BASE,
  LIGHT,
  { ...DARK_BASE, id:"midnight", label:"Tungi",
    bg:"linear-gradient(135deg,#090520 0%,#110830 50%,#090520 100%)",
    defaultAccent:"#a78bfa", preview:["#090520","#110830"] },
  { ...DARK_BASE, id:"aurora", label:"Aurora",
    bg:"linear-gradient(135deg,#020e0e 0%,#051815 50%,#020e0e 100%)",
    defaultAccent:"#34D399", preview:["#020e0e","#061a12"] },
  { ...DARK_BASE, id:"sunset", label:"Shafaq",
    bg:"linear-gradient(135deg,#140400 0%,#200a04 50%,#140400 100%)",
    defaultAccent:"#fb7185", preview:["#140400","#220c06"] },
  { ...DARK_BASE, id:"forest", label:"O'rmon",
    bg:"linear-gradient(135deg,#030a02 0%,#071408 50%,#030a02 100%)",
    defaultAccent:"#4ade80", preview:["#030a02","#071408"] },
  { ...DARK_BASE, id:"ocean", label:"Okean",
    bg:"linear-gradient(135deg,#020818 0%,#04122a 50%,#020818 100%)",
    defaultAccent:"#38bdf8", preview:["#020818","#04122a"] },
];

export function getTheme(id: string): ThemeTokens {
  return THEMES.find(t => t.id === id) ?? DARK_BASE;
}

export function themeCssVars(t: ThemeTokens): string {
  return [
    `--sp-surface:${t.surface}`,
    `--sp-surface-hov:${t.surfaceHover}`,
    `--sp-surface-alt:${t.surfaceAlt}`,
    `--sp-modal:${t.modal}`,
    `--sp-overlay:${t.overlay}`,
    `--sp-border:${t.border}`,
    `--sp-border-s:${t.borderStrong}`,
    `--sp-text:${t.text}`,
    `--sp-text-sub:${t.textSub}`,
    `--sp-text-muted:${t.textMuted}`,
    `--sp-text-dim:${t.textDim}`,
    `--sp-scroll:${t.scroll}`,
    `--sp-opt-bg:${t.optBg}`,
    `--sp-sidebar:${t.sidebar}`,
    `--sp-sidebar-b:${t.sidebarBorder}`,
    "--sp-radius-sm:10px",
    "--sp-radius-md:14px",
    "--sp-radius-lg:20px",
    "--sp-space-1:4px",
    "--sp-space-2:8px",
    "--sp-space-3:12px",
    "--sp-space-4:16px",
    "--sp-space-5:24px",
    "--sp-motion-fast:140ms",
    "--sp-motion-state:240ms",
    "--sp-motion-theme:450ms",
    `--sp-focus:${t.defaultAccent}`,
    `--sp-shadow-card:0 12px 30px ${t.isDark ? "rgba(0,0,0,0.22)" : "rgba(35,44,80,0.10)"}`,
    `--sp-shadow-float:0 18px 50px ${t.isDark ? "rgba(0,0,0,0.38)" : "rgba(35,44,80,0.16)"}`,
  ].join(";");
}
