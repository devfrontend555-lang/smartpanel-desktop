# SmartPanel 🌟

A floating Windows desktop companion with a glassmorphism dashboard.

## Features

| Feature | Details |
|---------|---------|
| 🔮 **Floating Orb** | Always-on-top draggable orb, snaps to screen edges |
| 🕐 **Flame Clock** | Animated fire-glow digit clock with particles |
| 💬 **Messengers** | Embedded Telegram, WhatsApp, VK, Instagram via WebView |
| 🌤 **Weather** | Live data from Open-Meteo (no API key needed) |
| 💱 **Currency** | Live exchange rates (USD/EUR/GBP/RUB/UAH/JPY…) |
| 🧮 **Calculator** | Full featured with keyboard-style layout |
| 🌗 **Theme** | Dark / Light mode toggle |
| 🚀 **Autostart** | Windows Registry integration |
| 👻 **Stealth Mode** | `Ctrl+Shift+P` — hides orb completely |
| 🖱 **Right-click menu** | Autostart toggle, stealth, exit |

## Requirements

- Windows 10 / 11 (64-bit)
- Python 3.10 or higher → https://python.org

## Installation

```bat
install.bat
```

This installs:
- `PySide6` + `PySide6-Addons` (Qt 6 framework + WebEngine)
- `requests` (weather & currency API)
- `pynput` (global hotkeys)

## Running

**Normal (no console window):**
```bat
SmartPanel.bat
```

**Debug mode (see console output):**
```bat
SmartPanel_debug.bat
```

## Hotkeys

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Toggle stealth mode (hide/show orb) |
| `Ctrl+Shift+O` | Open/close dashboard |

## Project Structure

```
SmartPanel/
├── main.py                  # Entry point
├── requirements.txt         # pip dependencies
├── install.bat              # One-click installer
├── SmartPanel.bat           # Silent launcher
├── SmartPanel_debug.bat     # Debug launcher
├── engine/
│   ├── autostart.py         # Windows Registry autostart
│   ├── hotkeys.py           # Global hotkey listener (pynput)
│   ├── weather.py           # Open-Meteo weather API
│   └── currency.py          # ExchangeRate-API currency rates
├── modules/
│   └── bridge.py            # Python ↔ QML bridge (QObject)
├── ui/
│   ├── main.qml             # Root QML wiring
│   ├── OrbWindow.qml        # Floating orb window
│   ├── DashboardWindow.qml  # Main glassmorphism panel
│   ├── FlameClock.qml       # Animated flame digit clock
│   ├── WeatherModule.qml    # Weather card
│   ├── CurrencyModule.qml   # Currency rates card
│   ├── CalculatorModule.qml # Calculator
│   ├── MessengerView.qml    # WebEngine messenger tabs
│   └── SettingsPanel.qml    # Settings (autostart, theme, hotkeys)
└── assets/
    └── icon.png             # App icon
```

## Notes on Messengers

- **Telegram Web** — works out of the box
- **WhatsApp Web** — requires QR scan on first launch; cookies are saved
- **VK** — works on desktop user-agent
- **Instagram** — may require login; works after first sign-in (cookies persisted)

Cookies and sessions are stored in your user profile directory under `QtWebEngine/`.
