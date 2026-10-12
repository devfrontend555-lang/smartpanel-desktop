import QtQuick 2.15
import QtQuick.Window 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Window {
    id: dashWin
    objectName: "dashboardWindow"

    width: 900
    height: 620
    flags: Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
    color: "transparent"
    visible: false

    // ── Theme ────────────────────────────────────────────────────────────────
    property bool isDark: true
    property color bgBase:    isDark ? "#0d0d1a" : "#f0f0f5"
    property color panelBg:   isDark ? Qt.rgba(1,1,1,0.07) : Qt.rgba(0,0,0,0.05)
    property color borderCol: isDark ? Qt.rgba(1,1,1,0.12) : Qt.rgba(0,0,0,0.12)
    property color textColor: isDark ? "#FFFFFF" : "#111111"
    property color subColor:  isDark ? "#AAAAAA" : "#666666"
    property color accent1:   "#4ECDC4"
    property color accent2:   "#FF6B35"

    // ── Active tab ────────────────────────────────────────────────────────────
    property int activeTab: 0
    readonly property var tabs: [
        { icon: "🕐", label: "Clock"      },
        { icon: "💬", label: "Messengers" },
        { icon: "🌤", label: "Weather"    },
        { icon: "💱", label: "Currency"   },
        { icon: "🧮", label: "Calculator" },
        { icon: "⚙",  label: "Settings"  },
    ]

    // ── Open/Close animation ──────────────────────────────────────────────────
    function openPanel() {
        var screen = Qt.application.screens[0]
        dashWin.x = (screen.width  - dashWin.width)  / 2
        dashWin.y = (screen.height - dashWin.height) / 2
        dashWin.opacity = 0
        dashWin.scale   = 0.88
        dashWin.visible = true
        openAnim.start()
    }

    function closePanel() {
        closeAnim.start()
    }

    ParallelAnimation {
        id: openAnim
        NumberAnimation { target: dashWin; property: "opacity"; from: 0; to: 1;    duration: 260; easing.type: Easing.OutCubic }
        NumberAnimation { target: dashWin; property: "scale";   from: 0.88; to: 1; duration: 260; easing.type: Easing.OutBack }
    }

    SequentialAnimation {
        id: closeAnim
        ParallelAnimation {
            NumberAnimation { target: dashWin; property: "opacity"; from: 1; to: 0;    duration: 200; easing.type: Easing.InCubic }
            NumberAnimation { target: dashWin; property: "scale";   from: 1; to: 0.88; duration: 200; easing.type: Easing.InCubic }
        }
        ScriptAction { script: dashWin.visible = false }
    }

    // ── Bridge connections ────────────────────────────────────────────────────
    Connections {
        target: bridge
        function onWeatherUpdated(jsonStr)  { weatherModule.applyData(jsonStr) }
        function onCurrencyUpdated(jsonStr) { currencyModule.applyData(jsonStr) }
        function onThemeChanged(t)          { dashWin.isDark = (t === "dark") }
    }

    // ── Root glass rectangle ──────────────────────────────────────────────────
    Rectangle {
        id: glassPanel
        anchors.fill: parent
        radius: 20
        color: dashWin.bgBase
        opacity: 0.97
        border.color: dashWin.borderCol
        border.width: 1
        clip: true

        // Gradient border accent top-left
        Rectangle {
            anchors.top: parent.top
            anchors.left: parent.left
            anchors.right: parent.right
            height: 2
            radius: 20
            gradient: Gradient {
                orientation: Gradient.Horizontal
                GradientStop { position: 0.0; color: dashWin.accent2 }
                GradientStop { position: 0.5; color: dashWin.accent1 }
                GradientStop { position: 1.0; color: "#45B7D1"       }
            }
        }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 0
            spacing: 0

            // ── Sidebar ────────────────────────────────────────────────────
            Rectangle {
                Layout.preferredWidth: 72
                Layout.fillHeight: true
                color: dashWin.isDark ? Qt.rgba(0,0,0,0.25) : Qt.rgba(0,0,0,0.05)
                radius: 0

                // Round left corners only
                Rectangle {
                    anchors.top: parent.top
                    anchors.bottom: parent.bottom
                    anchors.right: parent.right
                    width: 20
                    color: parent.color
                }

                Column {
                    anchors.top: parent.top
                    anchors.topMargin: 20
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 6

                    Repeater {
                        model: dashWin.tabs

                        Rectangle {
                            width: 52
                            height: 52
                            radius: 14
                            color: (index === dashWin.activeTab)
                                   ? Qt.rgba(78/255, 205/255, 196/255, 0.25)
                                   : (tabMa.containsMouse ? Qt.rgba(1,1,1,0.08) : "transparent")

                            Behavior on color { ColorAnimation { duration: 120 } }

                            // Active indicator bar
                            Rectangle {
                                visible: index === dashWin.activeTab
                                anchors.left: parent.left
                                anchors.verticalCenter: parent.verticalCenter
                                width: 3
                                height: 28
                                radius: 2
                                color: dashWin.accent1
                            }

                            Column {
                                anchors.centerIn: parent
                                spacing: 2
                                Text {
                                    anchors.horizontalCenter: parent.horizontalCenter
                                    text: modelData.icon
                                    font.pixelSize: 20
                                }
                                Text {
                                    anchors.horizontalCenter: parent.horizontalCenter
                                    text: modelData.label
                                    color: index === dashWin.activeTab ? dashWin.accent1 : dashWin.subColor
                                    font.pixelSize: 8
                                }
                            }

                            MouseArea {
                                id: tabMa
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: dashWin.activeTab = index
                            }
                        }
                    }
                }

                // Theme toggle at bottom of sidebar
                Rectangle {
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 16
                    anchors.horizontalCenter: parent.horizontalCenter
                    width: 52; height: 52; radius: 14
                    color: themeMa.containsMouse ? Qt.rgba(1,1,1,0.1) : "transparent"
                    Behavior on color { ColorAnimation { duration: 120 } }

                    Text {
                        anchors.centerIn: parent
                        text: dashWin.isDark ? "☀️" : "🌙"
                        font.pixelSize: 22
                    }
                    MouseArea {
                        id: themeMa
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: bridge.setTheme(dashWin.isDark ? "light" : "dark")
                    }
                }
            }

            // ── Main content ────────────────────────────────────────────────
            Item {
                Layout.fillWidth: true
                Layout.fillHeight: true

                // Title bar (drag area)
                Rectangle {
                    id: titleBar
                    anchors.top: parent.top
                    anchors.left: parent.left
                    anchors.right: parent.right
                    height: 44
                    color: "transparent"
                    z: 10

                    property point lastPos

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 16
                        anchors.rightMargin: 8

                        Text {
                            text: dashWin.tabs[dashWin.activeTab].icon + "  " + dashWin.tabs[dashWin.activeTab].label
                            color: dashWin.textColor
                            font.pixelSize: 15
                            font.bold: true
                        }

                        Item { Layout.fillWidth: true }

                        // Minimise / close buttons
                        Repeater {
                            model: [
                                { icon: "−", action: "min", col: "#FFD166" },
                                { icon: "✕", action: "cls", col: "#FF6B6B" },
                            ]
                            Rectangle {
                                width: 26; height: 26; radius: 13
                                color: cbMa.containsMouse ? modelData.col : Qt.rgba(1,1,1,0.1)
                                Behavior on color { ColorAnimation { duration: 100 } }
                                Text {
                                    anchors.centerIn: parent
                                    text: modelData.icon
                                    color: cbMa.containsMouse ? "#000000" : dashWin.subColor
                                    font.pixelSize: 13
                                    font.bold: true
                                }
                                MouseArea {
                                    id: cbMa
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        if (modelData.action === "cls") dashWin.closePanel()
                                        else dashWin.showMinimized()
                                    }
                                }
                            }
                        }
                    }

                    // Drag handler
                    MouseArea {
                        anchors.fill: parent
                        anchors.rightMargin: 68   // leave close buttons clickable
                        property point lastPos
                        onPressed: lastPos = Qt.point(mouseX, mouseY)
                        onPositionChanged: {
                            if (pressed) {
                                var dx = mouseX - lastPos.x
                                var dy = mouseY - lastPos.y
                                dashWin.x += dx
                                dashWin.y += dy
                            }
                        }
                        cursorShape: Qt.SizeAllCursor
                    }
                }

                // ── Tab content ──────────────────────────────────────────────
                Item {
                    anchors.top: titleBar.bottom
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.bottom: parent.bottom
                    anchors.margins: 16

                    // Tab 0 — Flame Clock
                    Item {
                        anchors.fill: parent
                        visible: dashWin.activeTab === 0

                        FlameClock {
                            id: flameClock
                            anchors.centerIn: parent
                            width: Math.min(parent.width - 40, 460)
                            height: 110
                            isDark: dashWin.isDark
                        }

                        // Date text below clock
                        Text {
                            id: dateText
                            anchors.horizontalCenter: parent.horizontalCenter
                            anchors.top: flameClock.bottom
                            anchors.topMargin: 16
                            color: dashWin.subColor
                            font.pixelSize: 14
                            Timer {
                                interval: 60000; running: true; repeat: true; triggeredOnStart: true
                                onTriggered: {
                                    var d = new Date()
                                    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
                                    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
                                    dateText.text = days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear()
                                }
                            }
                        }
                    }

                    // Tab 1 — Messengers
                    MessengerView {
                        anchors.fill: parent
                        visible: dashWin.activeTab === 1
                        isDark: dashWin.isDark
                    }

                    // Tab 2 — Weather
                    Item {
                        anchors.fill: parent
                        visible: dashWin.activeTab === 2

                        WeatherModule {
                            id: weatherModule
                            anchors.centerIn: parent
                            width: Math.min(parent.width - 40, 420)
                            isDark: dashWin.isDark
                        }
                    }

                    // Tab 3 — Currency
                    Item {
                        anchors.fill: parent
                        visible: dashWin.activeTab === 3

                        CurrencyModule {
                            id: currencyModule
                            anchors.centerIn: parent
                            width: Math.min(parent.width - 40, 420)
                            isDark: dashWin.isDark
                        }
                    }

                    // Tab 4 — Calculator
                    Item {
                        anchors.fill: parent
                        visible: dashWin.activeTab === 4

                        CalculatorModule {
                            anchors.centerIn: parent
                            width: Math.min(parent.width - 40, 300)
                            isDark: dashWin.isDark
                        }
                    }

                    // Tab 5 — Settings
                    Item {
                        anchors.fill: parent
                        visible: dashWin.activeTab === 5

                        SettingsPanel {
                            anchors.centerIn: parent
                            width: Math.min(parent.width - 40, 420)
                            isDark: dashWin.isDark
                        }
                    }
                }
            }
        }
    }
}
