import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: root
    width: parent ? parent.width : 280
    height: 320

    property bool isDark: true
    property color cardBg:   isDark ? Qt.rgba(1,1,1,0.06) : Qt.rgba(0,0,0,0.05)
    property color textColor:isDark ? "#FFFFFF" : "#111111"
    property color btnBg:    isDark ? Qt.rgba(1,1,1,0.10) : Qt.rgba(0,0,0,0.08)
    property color opBg:     "#4ECDC4"
    property color accentBg: "#FF6B6B"

    // ── Calculator state ─────────────────────────────────────────────────────
    property string display: "0"
    property double firstNum: 0
    property string op: ""
    property bool expectingSecond: false
    property bool hasError: false

    function pressDigit(d) {
        if (hasError) { display = "0"; hasError = false }
        if (expectingSecond) { display = d; expectingSecond = false }
        else { display = (display === "0") ? d : display + d }
        if (display.length > 14) display = display.slice(0, 14)
    }

    function pressOp(o) {
        firstNum = parseFloat(display)
        op = o
        expectingSecond = true
    }

    function pressDot() {
        if (expectingSecond) { display = "0."; expectingSecond = false; return }
        if (!display.includes(".")) display += "."
    }

    function pressEquals() {
        if (!op) return
        var second = parseFloat(display)
        var result
        if      (op === "+") result = firstNum + second
        else if (op === "−") result = firstNum - second
        else if (op === "×") result = firstNum * second
        else if (op === "÷") {
            if (second === 0) { display = "Error"; hasError = true; op = ""; return }
            result = firstNum / second
        }
        display = parseFloat(result.toPrecision(12)).toString()
        if (display.length > 14) display = parseFloat(result.toExponential(4)).toString()
        op = ""
        expectingSecond = false
    }

    function pressPercent() {
        display = (parseFloat(display) / 100).toString()
    }

    function pressClear() {
        display = "0"; firstNum = 0; op = ""; expectingSecond = false; hasError = false
    }

    function pressPlusMinus() {
        if (display !== "0") display = (parseFloat(display) * -1).toString()
    }

    // ── UI ────────────────────────────────────────────────────────────────────
    Rectangle {
        anchors.fill: parent
        color: root.cardBg
        radius: 16
        border.color: Qt.rgba(1,1,1,0.08)
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8

            // Title
            Text {
                text: "🧮 Calculator"
                color: "#4ECDC4"
                font.pixelSize: 13
                font.bold: true
            }

            // Display
            Rectangle {
                Layout.fillWidth: true
                height: 52
                color: Qt.rgba(0,0,0,0.25)
                radius: 10
                border.color: Qt.rgba(1,1,1,0.12)

                Column {
                    anchors.right: parent.right
                    anchors.rightMargin: 12
                    anchors.verticalCenter: parent.verticalCenter

                    Text {
                        text: root.op ? (root.firstNum.toString() + " " + root.op) : ""
                        color: "#888888"
                        font.pixelSize: 10
                        anchors.right: parent.right
                    }
                    Text {
                        text: root.display
                        color: root.hasError ? "#FF6B6B" : root.textColor
                        font.pixelSize: root.display.length > 10 ? 18 : 26
                        font.bold: true
                        anchors.right: parent.right
                    }
                }
            }

            // Buttons
            GridLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                columns: 4
                rowSpacing: 6
                columnSpacing: 6

                Repeater {
                    model: [
                        { lbl: "AC",  type: "clear",  col: root.accentBg },
                        { lbl: "+/−", type: "pm",     col: root.btnBg    },
                        { lbl: "%",   type: "pct",    col: root.btnBg    },
                        { lbl: "÷",   type: "op",     col: root.opBg     },
                        { lbl: "7",   type: "digit",  col: root.btnBg    },
                        { lbl: "8",   type: "digit",  col: root.btnBg    },
                        { lbl: "9",   type: "digit",  col: root.btnBg    },
                        { lbl: "×",   type: "op",     col: root.opBg     },
                        { lbl: "4",   type: "digit",  col: root.btnBg    },
                        { lbl: "5",   type: "digit",  col: root.btnBg    },
                        { lbl: "6",   type: "digit",  col: root.btnBg    },
                        { lbl: "−",   type: "op",     col: root.opBg     },
                        { lbl: "1",   type: "digit",  col: root.btnBg    },
                        { lbl: "2",   type: "digit",  col: root.btnBg    },
                        { lbl: "3",   type: "digit",  col: root.btnBg    },
                        { lbl: "+",   type: "op",     col: root.opBg     },
                        { lbl: "0",   type: "digit",  col: root.btnBg    },
                        { lbl: ".",   type: "dot",    col: root.btnBg    },
                        { lbl: "⌫",   type: "bs",     col: root.btnBg    },
                        { lbl: "=",   type: "eq",     col: "#FFD166"     },
                    ]

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        color: ma.containsMouse ? Qt.lighter(modelData.col, 1.3) : modelData.col
                        radius: 8

                        Text {
                            anchors.centerIn: parent
                            text: modelData.lbl
                            color: modelData.type === "eq" ? "#000000" : root.textColor
                            font.pixelSize: 16
                            font.bold: modelData.type === "op" || modelData.type === "eq"
                        }

                        MouseArea {
                            id: ma
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                var t = modelData.type
                                var l = modelData.lbl
                                if      (t === "digit") root.pressDigit(l)
                                else if (t === "op")    root.pressOp(l)
                                else if (t === "eq")    root.pressEquals()
                                else if (t === "clear") root.pressClear()
                                else if (t === "pm")    root.pressPlusMinus()
                                else if (t === "pct")   root.pressPercent()
                                else if (t === "dot")   root.pressDot()
                                else if (t === "bs") {
                                    if (root.display.length > 1) root.display = root.display.slice(0,-1)
                                    else root.display = "0"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
