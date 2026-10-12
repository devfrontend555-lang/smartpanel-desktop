import QtQuick 2.15
import QtQuick.Window 2.15

// Flame Clock — Qt 6 compatible (no QtGraphicalEffects, no MultiEffect)
// Glow effect achieved with stacked semi-transparent Text layers
Item {
    id: root
    width: 420
    height: 110

    property bool isDark: true

    // ── Time ──────────────────────────────────────────────────────────────────
    property string hh: "00"
    property string mm: "00"
    property string ss: "00"

    Timer {
        interval: 1000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            var d = new Date()
            root.hh = d.getHours().toString().padStart(2, "0")
            root.mm = d.getMinutes().toString().padStart(2, "0")
            root.ss = d.getSeconds().toString().padStart(2, "0")
        }
    }

    Row {
        anchors.centerIn: parent
        spacing: 2

        // HH
        FlameDigit { digit: root.hh[0]; glowColor: "#FF6B35" }
        FlameDigit { digit: root.hh[1]; glowColor: "#FF6B35" }
        FlameDot   { glowColor: "#FF9050" }
        // MM
        FlameDigit { digit: root.mm[0]; glowColor: "#FFB020" }
        FlameDigit { digit: root.mm[1]; glowColor: "#FFB020" }
        FlameDot   { glowColor: "#FFD060" }
        // SS
        FlameDigit { digit: root.ss[0]; glowColor: "#4ECDC4" }
        FlameDigit { digit: root.ss[1]; glowColor: "#4ECDC4" }
    }

    // ── FlameDigit: stacked text layers for glow ──────────────────────────────
    component FlameDigit: Item {
        property string digit: "0"
        property color  glowColor: "#FF6B35"
        width: 50
        height: root.height

        // Glow background blob (no blur needed — radial gradient rect)
        Rectangle {
            anchors.centerIn: parent
            width: 44; height: 80
            radius: 12
            color: "transparent"
            // Inner glow ring
            Rectangle {
                anchors.centerIn: parent
                width: 36; height: 68; radius: 10
                color: Qt.rgba(
                    glowColor.r, glowColor.g, glowColor.b, glowPulse.value * 0.18
                )
            }
        }

        // Outer glow text (large, very transparent)
        Text {
            anchors.centerIn: parent
            text: parent.digit
            font.pixelSize: 72; font.bold: true; font.family: "Consolas"
            color: Qt.rgba(glowColor.r, glowColor.g, glowColor.b, 0.18)
            scale: 1.25
        }
        // Mid glow text
        Text {
            anchors.centerIn: parent
            text: parent.digit
            font.pixelSize: 66; font.bold: true; font.family: "Consolas"
            color: Qt.rgba(glowColor.r, glowColor.g, glowColor.b, 0.28)
            scale: 1.10
        }
        // Main text
        Text {
            id: mainText
            anchors.centerIn: parent
            text: parent.digit
            font.pixelSize: 60; font.bold: true; font.family: "Consolas"
            color: "#FFFFFF"

            // Digit-change pop animation
            property string prevDigit: ""
            onTextChanged: {
                if (mainText.text !== mainText.prevDigit) {
                    popAnim.start()
                    mainText.prevDigit = mainText.text
                }
            }
            SequentialAnimation {
                id: popAnim
                NumberAnimation { target: mainText; property: "scale"; to: 1.18; duration: 80; easing.type: Easing.OutQuad }
                NumberAnimation { target: mainText; property: "scale"; to: 1.0;  duration: 140; easing.type: Easing.InOutQuad }
            }
        }

        // Glow pulse controller
        NumberAnimation {
            id: glowPulse
            property real value: 0.5
            target: glowPulse; property: "value"
            from: 0.3; to: 1.0; duration: 900
            loops: Animation.Infinite
            running: true
            easing.type: Easing.InOutSine
        }

        // Small flame particles
        Repeater {
            model: 3
            Item {
                property int idx: index
                x: 10 + index * 14
                y: parent.height - 6
                width: 5; height: 5

                Rectangle {
                    id: particle
                    width: 4; height: 4; radius: 2
                    color: glowColor
                    opacity: 0
                }

                SequentialAnimation {
                    loops: Animation.Infinite
                    running: true
                    PauseAnimation { duration: idx * 220 + 100 }
                    ParallelAnimation {
                        NumberAnimation {
                            target: particle; property: "opacity"
                            from: 0.9; to: 0; duration: 650 + idx * 150
                        }
                        NumberAnimation {
                            target: particle; property: "y"
                            from: 0; to: -(20 + idx * 8); duration: 650 + idx * 150
                            easing.type: Easing.OutQuad
                        }
                    }
                }
            }
        }
    }

    // ── FlameDot: blinking colon separator ───────────────────────────────────
    component FlameDot: Item {
        property color glowColor: "#FF9050"
        width: 22; height: root.height

        Column {
            anchors.centerIn: parent
            spacing: 14

            Repeater {
                model: 2
                Rectangle {
                    width: 7; height: 7; radius: 4
                    color: glowColor
                    // Glow ring around dot
                    Rectangle {
                        anchors.centerIn: parent
                        width: 14; height: 14; radius: 7
                        color: Qt.rgba(glowColor.r, glowColor.g, glowColor.b, 0.2)
                    }
                    SequentialAnimation on opacity {
                        loops: Animation.Infinite
                        NumberAnimation { from: 1.0; to: 0.25; duration: 500; easing.type: Easing.InOutSine }
                        NumberAnimation { from: 0.25; to: 1.0; duration: 500; easing.type: Easing.InOutSine }
                    }
                }
            }
        }
    }
}
