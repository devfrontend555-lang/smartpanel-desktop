"""Python ↔ QML bridge exposing all backend functionality."""
from __future__ import annotations
import json
import threading
from PySide6.QtCore import QObject, Signal, Slot, Property, QTimer
from engine.weather import fetch_weather
from engine.currency import fetch_rates
from engine import autostart


class AppBridge(QObject):
    # ── Signals emitted to QML ──────────────────────────────────────────────
    weatherUpdated = Signal(str)          # JSON string
    currencyUpdated = Signal(str)         # JSON string
    autostartChanged = Signal(bool)
    stealthModeChanged = Signal(bool)
    themeChanged = Signal(str)            # "dark" | "light"
    errorOccurred = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._stealth = False
        self._theme = "dark"
        self._autostart = autostart.is_autostart_enabled()
        self._weather_city = "London"

        # Auto-refresh weather every 10 min
        self._weather_timer = QTimer(self)
        self._weather_timer.setInterval(600_000)
        self._weather_timer.timeout.connect(self._refresh_weather_bg)
        self._weather_timer.start()

        # Auto-refresh currency every 30 min
        self._currency_timer = QTimer(self)
        self._currency_timer.setInterval(1_800_000)
        self._currency_timer.timeout.connect(self._refresh_currency_bg)
        self._currency_timer.start()

    # ── Weather ─────────────────────────────────────────────────────────────
    @Slot(str)
    def fetchWeather(self, city: str = "") -> None:
        if city:
            self._weather_city = city
        threading.Thread(target=self._refresh_weather_bg, daemon=True).start()

    def _refresh_weather_bg(self) -> None:
        data = fetch_weather(self._weather_city)
        self.weatherUpdated.emit(json.dumps(data))

    # ── Currency ────────────────────────────────────────────────────────────
    @Slot(str)
    def fetchCurrency(self, base: str = "USD") -> None:
        threading.Thread(target=lambda: self._refresh_currency_bg(base), daemon=True).start()

    def _refresh_currency_bg(self, base: str = "USD") -> None:
        data = fetch_rates(base)
        self.currencyUpdated.emit(json.dumps(data))

    # ── Autostart ────────────────────────────────────────────────────────────
    @Slot(result=bool)
    def getAutostartEnabled(self) -> bool:
        self._autostart = autostart.is_autostart_enabled()
        return self._autostart

    @Slot(bool)
    def setAutostart(self, enabled: bool) -> None:
        if enabled:
            autostart.enable_autostart()
        else:
            autostart.disable_autostart()
        self._autostart = enabled
        self.autostartChanged.emit(enabled)

    @Slot()
    def toggleAutostart(self) -> None:
        new_state = autostart.toggle_autostart()
        self._autostart = new_state
        self.autostartChanged.emit(new_state)

    # ── Theme ────────────────────────────────────────────────────────────────
    @Slot(str)
    def setTheme(self, theme: str) -> None:
        self._theme = theme
        self.themeChanged.emit(theme)

    @Slot(result=str)
    def getTheme(self) -> str:
        return self._theme

    # ── Stealth Mode ────────────────────────────────────────────────────────
    @Slot()
    def toggleStealth(self) -> None:
        self._stealth = not self._stealth
        self.stealthModeChanged.emit(self._stealth)

    @Slot(result=bool)
    def isStealthMode(self) -> bool:
        return self._stealth
