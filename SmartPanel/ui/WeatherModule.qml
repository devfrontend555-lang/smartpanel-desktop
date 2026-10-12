import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: root
    width: parent ? parent.width : 320
    height: 180

    property var weatherData: null
    property bool loading: false
    property bool isDark: true
    property color cardBg: isDark ? Qt.rgba(1,1,1,0.06) : Qt.rgba(0,0,0,0.05)
    property color textColor: isDark ? "#FFFFFF" : "#111111"
    property color subColor: isDark ? "#AAAAAA" : "#555555"
    property color accentColor: "#4ECDC4"

    // Called from parent when bridge emits weatherUpdated
    function applyData(jsonStr) {
        var d = JSON.parse(jsonStr)
        root.weatherData = d
        root.loading = false
    }

    function reload() {
        root.loading = true
        bridge.fetchWeather(cityInput.text || "London")
    }

    Component.onCompleted: reload()

    Rectangle {
        anchors.fill: parent
        color: root.cardBg
        radius: 16
        border.color: Qt.rgba(1,1,1,0.08)
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 8

            // Header row
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: "🌍 Weather"
                    color: root.accentColor
                    font.pixelSize: 13
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                TextField {
                    id: cityInput
                    placeholderText: "City…"
                    text: "London"
                    color: root.textColor
                    background: Rectangle {
                        color: Qt.rgba(1,1,1,0.08)
                        radius: 8
                        border.color: Qt.rgba(1,1,1,0.15)
                    }
                    font.pixelSize: 12
                    width: 100
                    height: 28
                    padding: 6
                    onAccepted: root.reload()
                }

                Rectangle {
                    width: 28; height: 28; radius: 8
                    color: root.accentColor
                    opacity: refreshMa.containsMouse ? 1.0 : 0.8

                    Text {
                        anchors.centerIn: parent
                        text: "↻"
                        color: "#000"
                        font.pixelSize: 16
                        font.bold: true
                    }
                    MouseArea {
                        id: refreshMa
                        anchors.fill: parent
                        hoverEnabled: true
                        onClicked: root.reload()
                        cursorShape: Qt.PointingHandCursor
                    }
                }
            }

            // Loading state
            Item {
                Layout.fillWidth: true
                Layout.fillHeight: true
                visible: root.loading

                Text {
                    anchors.centerIn: parent
                    text: "Loading…"
                    color: root.subColor
                    font.pixelSize: 13
                }
            }

            // Error state
            Item {
                Layout.fillWidth: true
                Layout.fillHeight: true
                visible: !root.loading && root.weatherData !== null && root.weatherData.error !== null && root.weatherData.error !== undefined && root.weatherData.error !== ""

                Text {
                    anchors.centerIn: parent
                    text: root.weatherData ? ("⚠ " + root.weatherData.error) : ""
                    color: "#FF6B6B"
                    font.pixelSize: 12
                    wrapMode: Text.Wrap
                    width: parent.width
                    horizontalAlignment: Text.AlignHCenter
                }
            }

            // Data state
            Item {
                Layout.fillWidth: true
                Layout.fillHeight: true
                visible: !root.loading && root.weatherData !== null && (root.weatherData.error === null || root.weatherData.error === undefined || root.weatherData.error === "")

                RowLayout {
                    anchors.fill: parent
                    spacing: 12

                    // Big emoji + temp
                    Column {
                        spacing: 4
                        Text {
                            text: root.weatherData ? root.weatherData.emoji : ""
                            font.pixelSize: 42
                        }
                        Text {
                            text: root.weatherData ? (root.weatherData.temp + "°C") : ""
                            color: root.textColor
                            font.pixelSize: 28
                            font.bold: true
                        }
                    }

                    // Details column
                    Column {
                        Layout.fillWidth: true
                        spacing: 4

                        Text {
                            text: root.weatherData ? root.weatherData.city : ""
                            color: root.textColor
                            font.pixelSize: 15
                            font.bold: true
                        }
                        Text {
                            text: root.weatherData ? root.weatherData.description : ""
                            color: root.subColor
                            font.pixelSize: 12
                        }
                        Text {
                            text: root.weatherData ? ("Feels like " + root.weatherData.feels_like + "°C") : ""
                            color: root.subColor
                            font.pixelSize: 12
                        }
                        Text {
                            text: root.weatherData ? ("💧 " + root.weatherData.humidity + "%  💨 " + root.weatherData.wind + " km/h") : ""
                            color: root.subColor
                            font.pixelSize: 12
                        }
                    }
                }
            }
        }
    }
}
