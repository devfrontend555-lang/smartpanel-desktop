import QtQuick 2.15
import QtQuick.Window 2.15
import QtQuick.Controls 2.15

Window {
    id: orbWin
    objectName: "orbWindow"

    width: 68
    height: 68
    // Qt.Tool keeps it off the taskbar; Qt.WindowStaysOnTopHint = always on top
    flags: Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
    color: "transparent"
    visible: true   // must be true for orb to appear

    // ── Properties ──────────────────────────────────────────────────────────
    property bool isDragging: false
    property real dragStartX: 0
    property real dragStartY: 0
    property bool dashboardOpen: false
    property string statusColor: "#4ECDC4"

    signal orbClicked()
    signal contextMenuRequested()

    // Position orb: top-right corner (avoids taskbar at bottom)
    Component.onCompleted: {
        var sw = Screen.desktopAvailableWidth
        orbWin.x = sw - orbWin.width - 24
        orbWin.y = 24
    }

    // ── Orb body ─────────────────────────────────────────────────────────────
    Rectangle {
        id: orb
        anchors.fill: parent
        radius: width / 2

        // Vertical gradient (Gradient.Diagonal not supported in all Qt 6 builds)
        gradient: Gradient {
            GradientStop { position: 0.0; color: "#FF6B35" }
            GradientStop { position: 0.5; color: "#4ECDC4" }
            GradientStop { position: 1.0; color: "#45B7D1" }
        }

        // Status dot (green = OK)
        Rectangle {
            width: 10; height: 10; radius: 5
            color: orbWin.statusColor
            anchors.bottom: parent.bottom
            anchors.right:  parent.right
            anchors.margins: 5
            border.color: "#111"; border.width: 1
        }

        // Inner highlight
        Rectangle {
            anchors.centerIn: parent
            width:  parent.width  * 0.55
            height: parent.height * 0.55
            radius: width / 2
            color:  "white"
            opacity: 0.18
        }

        // Drop shadow (simulated)
        layer.enabled: true

        // Idle pulse
        SequentialAnimation on scale {
            id: pulseAnim
            loops: Animation.Infinite
            running: !orbWin.isDragging && !orbWin.dashboardOpen
            NumberAnimation { from: 1.00; to: 1.08; duration: 1200; easing.type: Easing.InOutQuad }
            NumberAnimation { from: 1.08; to: 1.00; duration: 1200; easing.type: Easing.InOutQuad }
        }

        Behavior on opacity { NumberAnimation { duration: 150 } }
    }

    // ── Mouse area ────────────────────────────────────────────────────────────
    MouseArea {
        anchors.fill: parent
        acceptedButtons: Qt.LeftButton | Qt.RightButton
        hoverEnabled: true

        onEntered: { orb.opacity = 0.85 }
        onExited:  { orb.opacity = 1.0  }

        onPressed: function(mouse) {
            if (mouse.button === Qt.LeftButton) {
                orbWin.isDragging = false
                orbWin.dragStartX = mouse.x
                orbWin.dragStartY = mouse.y
            }
        }

        onPositionChanged: function(mouse) {
            if (mouse.buttons & Qt.LeftButton) {
                var dx = mouse.x - orbWin.dragStartX
                var dy = mouse.y - orbWin.dragStartY
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    orbWin.isDragging = true
                    orbWin.x = Math.max(0, Math.min(Screen.desktopAvailableWidth  - orbWin.width,  orbWin.x + dx))
                    orbWin.y = Math.max(0, Math.min(Screen.desktopAvailableHeight - orbWin.height, orbWin.y + dy))
                }
            }
        }

        onReleased: function(mouse) {
            if (mouse.button === Qt.LeftButton && !orbWin.isDragging) {
                orbWin.orbClicked()
            }
            orbWin.isDragging = false
        }

        onClicked: function(mouse) {
            if (mouse.button === Qt.RightButton) {
                orbWin.contextMenuRequested()
            }
        }
    }

    // ── Right-click context menu ──────────────────────────────────────────────
    Menu {
        id: ctxMenu

        MenuItem {
            text: "📋  Panel ochish / yopish"
            onTriggered: orbWin.orbClicked()
        }
        MenuSeparator {}
        MenuItem {
            id: autostartItem
            text: "🚀  Avtostart: —"
            onTriggered: bridge.toggleAutostart()
        }
        MenuItem {
            text: "👻  Stealth mode  (Ctrl+Shift+P)"
            onTriggered: bridge.toggleStealth()
        }
        MenuSeparator {}
        MenuItem {
            text: "❌  Chiqish"
            onTriggered: Qt.quit()
        }
    }

    function showContextMenu() {
        autostartItem.text = "🚀  Avtostart: " + (bridge.getAutostartEnabled() ? "Yoqilgan ✓" : "O'chirilgan")
        ctxMenu.popup()
    }

    // ── Stealth / autostart signals ───────────────────────────────────────────
    Connections {
        target: bridge
        function onStealthModeChanged(stealth) {
            orbWin.visible = !stealth
        }
        function onAutostartChanged(enabled) {
            autostartItem.text = "🚀  Avtostart: " + (enabled ? "Yoqilgan ✓" : "O'chirilgan")
        }
    }
}
