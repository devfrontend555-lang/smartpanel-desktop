"""SmartPanel diagnostika — terminal orqali tekshirish."""
import sys, os, subprocess

print()
print("=" * 50)
print("  SmartPanel — Diagnostika")
print("=" * 50)

# 1. Python versiyasi
print(f"\n[1] Python: {sys.version}")

# 2. PySide6
try:
    import PySide6
    print(f"[2] PySide6: {PySide6.__version__} ✓")
except ImportError:
    print("[2] PySide6: YO'Q — install.bat ni qayta ishga tushiring!")

# 3. QtWebEngine
try:
    from PySide6.QtWebEngineQuick import QtWebEngineQuick
    print("[3] QtWebEngineQuick: ✓")
except ImportError:
    print("[3] QtWebEngineQuick: YO'Q")
    print("    Tuzatish: pip install PySide6-WebEngine")

# 4. pynput (hotkeys)
try:
    import pynput
    print("[4] pynput: ✓")
except ImportError:
    print("[4] pynput: YO'Q (hotkeys ishlamaydi)")
    print("    Tuzatish: pip install pynput")

# 5. Fayl tekshiruvi
print("\n[5] Kerakli fayllar:")
base = os.path.dirname(os.path.abspath(__file__))
files = [
    "main.py",
    "ui/main.qml",
    "ui/OrbWindow.qml",
    "ui/DashboardWindow.qml",
    "ui/FlameClock.qml",
    "ui/MessengerView.qml",
    "modules/bridge.py",
    "engine/autostart.py",
]
all_ok = True
for f in files:
    path = os.path.join(base, f)
    if os.path.exists(path):
        print(f"    ✓  {f}")
    else:
        print(f"    ✗  {f}  <-- FAYL YO'Q!")
        all_ok = False

# 6. Jarayon tekshiruvi (Windows)
print("\n[6] SmartPanel jarayoni ishlayaptimi:")
try:
    result = subprocess.check_output(
        'tasklist /FI "IMAGENAME eq pythonw.exe" /FO CSV /NH',
        shell=True, text=True, stderr=subprocess.DEVNULL
    )
    if "pythonw" in result.lower():
        print("    ✓  pythonw.exe ishlayapti (SmartPanel fonda ishlamoqda)")
        print("    → Orb ekranda bor, lekin yashiringan bo'lishi mumkin")
        print("    → Task Manager > pythonw.exe > End Task qilib qayta ishga tushiring")
    else:
        print("    ✗  pythonw.exe ishlamayapti — SmartPanel yoqilmagan")
except Exception as e:
    print(f"    (tekshirib bo'lmadi: {e})")

# 7. Ekran o'lchami
print("\n[7] Ekran o'lchami:")
try:
    from PySide6.QtWidgets import QApplication
    from PySide6.QtGui import QScreen
    app = QApplication.instance() or QApplication(sys.argv[:1])
    screen = app.primaryScreen()
    geo = screen.availableGeometry()
    print(f"    {geo.width()} x {geo.height()} px (foydalanish uchun)")
    print(f"    Orb joyi bo'lishi kerak: x={geo.width()-92}, y={geo.height()-92}")
except Exception as e:
    print(f"    (tekshirib bo'lmadi: {e})")

print()
print("=" * 50)
if all_ok:
    print("  Barcha fayllar joyida.")
    print("  SmartPanel_debug.bat ni ishga tushiring.")
else:
    print("  Ba'zi fayllar yo'q — papkani to'liq yuklab oling!")
print("=" * 50)
print()
input("Enter bosing...")
