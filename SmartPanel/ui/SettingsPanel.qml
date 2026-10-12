import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: root
    width: parent ? parent.width : 420
    height: 340

    property bool isDark: true
    property color cardBg:   isDark ? Qt.rgba(1,1,1,0.06) : Qt.rgba(0,0,0,0.05)
    property color textColor:isDark ? "#FFFFFF" : "#111111"
    property color subColor: isDark ? "#AAAAAA" : "#666666"
    property color accent:   "#4ECDC4"

    property bool autostart: false

    Component.onCompleted: {
        autostart = bridge.getAutostartEnabled()
    }

    Connections {
        target: bridge
        function onAutostartChanged(en) { root.autostart = en }
    }

    Rectangle {
        anchors.fill: parent
        color: root.cardBg
        radius: 16
        border.color: Qt.rgba(1,1,1,0.08)
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 18

            Text {
                text: "⚙  Settings"
                color: root.accent
                font.pixelSize: 16
                font.bold: true
            }

            // Divider
            Rectangle { Layout.fillWidth: true; height: 1; color: Qt.rgba(1,1,1,0.08) }

            // Autostart row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Column {
                    spacing: 2
                    Text { text: "Launch at Windows startup"; color: root.textColor; font.pixelSize: 13 }
                    Text { text: "Registers SmartPanel in the Windows Registry"; color: root.subColor; font.pixelSize: 11 }
                }
                Item { Layout.fillWidth: true }
                Switch {
                    id: autostartSwitch
                    checked: root.autostart
                    onToggled: bridge.setAutostart(checked)
                    palette.button: root.accent
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: Qt.rgba(1,1,1,0.08) }

            // Theme row
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Column {
                    spacing: 2
                    Text { text: "Dark mode"; color: root.textColor; font.pixelSize: 13 }
                    Text { text: "Toggle between dark and light theme"; color: root.subColor; font.pixelSize: 11 }
                }
                Item { Layout.fillWidth: true }
                Switch {
                    checked: root.isDark
                    onToggled: bridge.setTheme(checked ? "dark" : "light")
                    palette.button: root.accent
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: Qt.rgba(1,1,1,0.08) }

            // Hotkeys info
            Column {
                spacing: 6
                Text { text: "Global Hotkeys"; color: root.textColor; font.pixelSize: 13; font.bold: true }
                Repeater {
                    model: [
                        { key: "Ctrl+Shift+P", desc: "Toggle stealth mode (hide/show orb)" },
                        { key: "Ctrl+Shift+O", desc: "Open/close dashboard panel" },
                    ]
                    RowLayout {
                        spacing: 10
                        Rectangle {
                            width: 130; height: 22; radius: 5
                            color: Qt.rgba(1,1,1,0.1)
                            border.color: Qt.rgba(1,1,1,0.2)
                            Text {
                                anchors.centerIn: parent
                                text: modelData.key
                                color: root.accent
                                font.pixelSize: 11
                                font.family: "Consolas, monospace"
                            }
                        }
                        Text {
                            text: modelData.desc
                            color: root.subColor
                            font.pixelSize: 11
                        }
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: Qt.rgba(1,1,1,0.08) }

            // Version / about
            Text {
                text: "SmartPanel v1.0  •  Built with PySide6 + Qt WebEngine"
                color: root.subColor
                font.pixelSize: 10
                Layout.fillWidth: true
                horizontalAlignment: Text.AlignHCenter
            }
        }
    }
}
