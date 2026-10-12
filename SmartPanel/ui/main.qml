import QtQuick 2.15
import QtQuick.Window 2.15

// Root item — wires OrbWindow and DashboardWindow together.
// QQmlApplicationEngine can load a plain Item as root; the child Windows
// are independent top-level windows and manage their own visibility.
Item {
    id: root

    OrbWindow {
        id: orbWin
        visible: true    // make sure orb shows immediately

        onOrbClicked:           toggleDashboard()
        onContextMenuRequested: orbWin.showContextMenu()
    }

    DashboardWindow {
        id: dashWin
        isDark: true
        visible: false
    }

    // ── Toggle dashboard open/close ───────────────────────────────────────────
    function toggleDashboard() {
        if (dashWin.visible) {
            dashWin.closePanel()
            orbWin.dashboardOpen = false
        } else {
            dashWin.openPanel()
            orbWin.dashboardOpen = true
        }
    }

    // When stealth mode is on, also close the dashboard
    Connections {
        target: bridge
        function onStealthModeChanged(stealth) {
            if (stealth && dashWin.visible) {
                dashWin.closePanel()
                orbWin.dashboardOpen = false
            }
        }
    }
}
