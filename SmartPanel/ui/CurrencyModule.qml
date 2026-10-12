import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: root
    width: parent ? parent.width : 320
    height: 220

    property var currencyData: null
    property bool loading: false
    property bool isDark: true
    property color cardBg: isDark ? Qt.rgba(1,1,1,0.06) : Qt.rgba(0,0,0,0.05)
    property color textColor: isDark ? "#FFFFFF" : "#111111"
    property color subColor: isDark ? "#AAAAAA" : "#555555"
    property color accentColor: "#FFD166"

    function applyData(jsonStr) {
        var d = JSON.parse(jsonStr)
        root.currencyData = d
        root.loading = false
    }

    function reload() {
        root.loading = true
        bridge.fetchCurrency(baseCombo.currentText || "USD")
    }

    Component.onCompleted: reload()

    readonly property var rateKeys: root.currencyData && root.currencyData.rates
        ? Object.keys(root.currencyData.rates) : []

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

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: "💱 Currency"
                    color: root.accentColor
                    font.pixelSize: 13
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                ComboBox {
                    id: baseCombo
                    model: ["USD", "EUR", "GBP", "RUB", "UAH", "JPY", "CNY"]
                    currentIndex: 0
                    width: 70
                    height: 28
                    font.pixelSize: 12
                    contentItem: Text {
                        leftPadding: 8
                        text: baseCombo.displayText
                        color: root.textColor
                        font: baseCombo.font
                        verticalAlignment: Text.AlignVCenter
                    }
                    background: Rectangle {
                        color: Qt.rgba(1,1,1,0.08)
                        radius: 8
                        border.color: Qt.rgba(1,1,1,0.15)
                    }
                    onCurrentTextChanged: root.reload()
                }

                Rectangle {
                    width: 28; height: 28; radius: 8
                    color: root.accentColor
                    opacity: rMa.containsMouse ? 1.0 : 0.8
                    Text { anchors.centerIn: parent; text: "↻"; color: "#000"; font.pixelSize: 16; font.bold: true }
                    MouseArea { id: rMa; anchors.fill: parent; hoverEnabled: true; onClicked: root.reload(); cursorShape: Qt.PointingHandCursor }
                }
            }

            // Loading
            Text {
                visible: root.loading
                Layout.fillWidth: true
                Layout.fillHeight: true
                text: "Loading…"; color: root.subColor; font.pixelSize: 13
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }

            // Error
            Text {
                visible: !root.loading && root.currencyData !== null && root.currencyData.error !== null && root.currencyData.error !== undefined && root.currencyData.error !== ""
                Layout.fillWidth: true
                text: root.currencyData ? ("⚠ " + root.currencyData.error) : ""
                color: "#FF6B6B"; font.pixelSize: 12; wrapMode: Text.Wrap
                horizontalAlignment: Text.AlignHCenter
            }

            // Rates grid
            GridLayout {
                visible: !root.loading && root.currencyData !== null && (root.currencyData.error === null || root.currencyData.error === undefined || root.currencyData.error === "")
                Layout.fillWidth: true
                columns: 2
                rowSpacing: 4
                columnSpacing: 8

                Repeater {
                    model: root.rateKeys

                    Rectangle {
                        Layout.fillWidth: true
                        height: 26
                        color: Qt.rgba(1,1,1,0.04)
                        radius: 6

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 8
                            anchors.rightMargin: 8

                            Text {
                                text: modelData
                                color: root.accentColor
                                font.pixelSize: 12
                                font.bold: true
                                Layout.preferredWidth: 36
                            }
                            Item { Layout.fillWidth: true }
                            Text {
                                text: root.currencyData && root.currencyData.rates
                                    ? root.currencyData.rates[modelData].toString()
                                    : ""
                                color: root.textColor
                                font.pixelSize: 12
                            }
                        }
                    }
                }
            }

            // Updated timestamp
            Text {
                visible: root.currencyData !== null && root.currencyData.updated !== undefined
                text: root.currencyData ? ("Updated: " + root.currencyData.updated) : ""
                color: root.subColor; font.pixelSize: 10
                Layout.fillWidth: true
                horizontalAlignment: Text.AlignRight
            }
        }
    }
}
