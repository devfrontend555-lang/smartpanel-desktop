"""SmartPanel — main entry point."""
from __future__ import annotations
import sys
import os

# ── Ensure project root is on the Python path ─────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Qt WebEngine MUST be initialised before QApplication ─────────────────────
# Suppress Chromium noise logs
os.environ.setdefault("QTWEBENGINE_CHROMIUM_FLAGS",
    "--disable-logging --log-level=3 --disable-gpu-sandbox")
os.environ.setdefault("QTWEBENGINE_DISABLE_SANDBOX", "1")

# Try to initialise QtWebEngineQuick early (required in Qt 6.2+)
try:
    from PySide6.QtWebEngineQuick import QtWebEngineQuick
    QtWebEngineQuick.initialize()
    print("[WebEngine] Initialized OK")
except ImportError:
    print("[WebEngine] PySide6.QtWebEngineQuick not found — messenger tab won't work")
except Exception as e:
    print(f"[WebEngine] Init warning: {e}")

from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QIcon
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtCore import QUrl, Qt, QTimer

# QQuickStyle — optional, fall back gracefully
try:
    from PySide6.QtQuickControls2 import QQuickStyle
    QQuickStyle.setStyle("Fusion")
except Exception:
    pass

from modules.bridge import AppBridge


def setup_hotkeys(bridge: AppBridge) -> None:
    try:
        from engine.hotkeys import HotkeyManager
        hk = HotkeyManager()
        hk.register("<ctrl>+<shift>+p", bridge.toggleStealth)
        hk.start()
        bridge._hotkey_manager = hk   # keep alive
        print("[Hotkeys] Ctrl+Shift+P (stealth) registered")
    except Exception as e:
        print(f"[Hotkeys] Could not start: {e}")


def main() -> int:
    # ── High-DPI ──────────────────────────────────────────────────────────────
    try:
        QApplication.setHighDpiScaleFactorRoundingPolicy(
            Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
        )
    except Exception:
        pass

    app = QApplication(sys.argv)
    app.setApplicationName("SmartPanel")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("SmartSoft")
    app.setQuitOnLastWindowClosed(False)

    icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "icon.png")
    if os.path.exists(icon_path):
        app.setWindowIcon(QIcon(icon_path))

    # ── Bridge ────────────────────────────────────────────────────────────────
    bridge = AppBridge()

    # ── QML engine ────────────────────────────────────────────────────────────
    engine = QQmlApplicationEngine()
    engine.rootContext().setContextProperty("bridge", bridge)

    ui_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui")
    engine.addImportPath(ui_dir)

    qml_file = os.path.join(ui_dir, "main.qml")
    print(f"[QML] Loading: {qml_file}")

    engine.load(QUrl.fromLocalFile(qml_file))

    if not engine.rootObjects():
        print("[FATAL] QML failed to load. Check errors above.")
        return -1

    print("[SmartPanel] Running — orb should be visible. Right-click it for menu.")

    # ── Hotkeys ───────────────────────────────────────────────────────────────
    setup_hotkeys(bridge)

    # ── Initial data fetch ────────────────────────────────────────────────────
    QTimer.singleShot(1000, bridge._refresh_weather_bg)
    QTimer.singleShot(1500, bridge._refresh_currency_bg)

    return app.exec()


if __name__ == "__main__":
    code = main()
    if code != 0:
        print(f"\n[SmartPanel] Exited with code {code}")
        input("\nXato bo'ldi. Davom etish uchun Enter bosing...")
    sys.exit(code)
