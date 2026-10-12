import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtWebEngine 1.10

Item {
    id: root
    width: parent ? parent.width : 500
    height: parent ? parent.height : 400

    property bool isDark: true
    property color cardBg:   isDark ? Qt.rgba(1,1,1,0.04) : Qt.rgba(0,0,0,0.04)
    property color textColor:isDark ? "#FFFFFF" : "#111111"
    property color tabBg:    isDark ? Qt.rgba(1,1,1,0.08) : Qt.rgba(0,0,0,0.06)
    property color activeTab:"#4ECDC4"

    // Messenger list
    readonly property var messengers: [
        { name: "Telegram", url: "https://web.telegram.org/k/", icon: "✈" },
        { name: "WhatsApp", url: "https://web.whatsapp.com/",   icon: "💬" },
        { name: "VK",       url: "https://vk.com/im",           icon: "🔵" },
        { name: "Instagram",url: "https://www.instagram.com/direct/inbox/", icon: "📷" },
    ]

    property int activeIndex: 0

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Tab bar
        Rectangle {
            Layout.fillWidth: true
            height: 42
            color: root.tabBg
            radius: 12

            // Only top corners rounded — fake bottom fill
            Rectangle {
                anchors.bottom: parent.bottom
                anchors.left: parent.left
                anchors.right: parent.right
                height: 12
                color: root.tabBg
            }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 4

                Repeater {
                    model: root.messengers

                    Rectangle {
                        Layout.fillWidth: true
                        height: 34
                        radius: 8
                        color: (index === root.activeIndex) ? root.activeTab : "transparent"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 4
                            Text {
                                text: modelData.icon
                                font.pixelSize: 14
                            }
                            Text {
                                text: modelData.name
                                color: (index === root.activeIndex) ? "#000000" : root.textColor
                                font.pixelSize: 12
                                font.bold: index === root.activeIndex
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.activeIndex = index
                        }
                    }
                }
            }
        }

        // WebEngine stack
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            Repeater {
                model: root.messengers

                WebEngineView {
                    anchors.fill: parent
                    visible: index === root.activeIndex
                    url: visible ? modelData.url : ""

                    // Proper desktop user-agent to avoid "browser not supported" blocks
                    settings.pluginsEnabled: true
                    settings.javascriptEnabled: true
                    settings.localStorageEnabled: true
                    profile: WebEngineProfile {
                        storageName: "messenger_" + modelData.name
                        httpUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                        persistentCookiesPolicy: WebEngineProfile.ForcePersistentCookies
                    }

                    // Inject dark background on load success
                    onLoadingChanged: function(req) {
                        // WebEngineView.LoadSucceededStatus works across Qt 6.x versions
                        if (req.status === WebEngineView.LoadSucceededStatus && root.isDark) {
                            runJavaScript(
                                "document.documentElement.style.setProperty('--background','#1a1a2e');"+
                                "document.body && (document.body.style.background='#1a1a2e');"
                            )
                        }
                    }
                }
            }
        }
    }
}
