//// Plugin originally written for Equicord at 2026-02-16 by https://github.com/Bluscream, https://antigravity.google
// region Imports
import "./style.css";

import { getUserSettingLazy } from "@api/UserSettings";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";
import {
    addChatBarButton,
    removeChatBarButton,
    ChatBarButton
} from "@api/ChatButtons";
import { Logger } from "@utils/Logger";

import { settings } from "./settings";
// endregion Imports

import { pluginInfo } from "./info";
export { pluginInfo };

// region Variables
const logger = new Logger(pluginInfo.id, pluginInfo.color);

const MessageDisplayCompact = getUserSettingLazy("textAndImages", "messageDisplayCompact")!;
const EmbedLinks = getUserSettingLazy("textAndImages", "embedLinks")!;
const ShowCurrentGame = getUserSettingLazy("status", "showCurrentGame")!;

let AnimatedEmoji: any = null;
let AutoPlayGifs: any = null;

try {
    AnimatedEmoji = getUserSettingLazy("accessibility", "animatedEmoji");
} catch (e) {
    logger.warn("animatedEmoji setting not available");
}

try {
    AutoPlayGifs = getUserSettingLazy("accessibility", "autoPlayGifs");
} catch (e) {
    logger.warn("autoPlayGifs setting not available");
}

let originalSettings: Record<string, any> = {};
// endregion Variables

// region Utils
async function saveOriginalSettings() {
    originalSettings = {
        messageDisplayCompact: await MessageDisplayCompact.getSetting(),
        embedLinks: await EmbedLinks.getSetting(),
        showCurrentGame: await ShowCurrentGame.getSetting(),
    };

    if (AnimatedEmoji) {
        try {
            originalSettings.animatedEmoji = await AnimatedEmoji.getSetting();
        } catch (e) { /* ignored */ }
    }

    if (AutoPlayGifs) {
        try {
            originalSettings.autoPlayGifs = await AutoPlayGifs.getSetting();
        } catch (e) { /* ignored */ }
    }
}

async function applyPerformanceSettings() {
    await saveOriginalSettings();

    if (settings.store.disableEmbeds) {
        await EmbedLinks.updateSetting(false);
    }
    if (settings.store.compactMode) {
        await MessageDisplayCompact.updateSetting(true);
    }
    if (settings.store.disableAnimatedEmojis && AnimatedEmoji) {
        try {
            await AnimatedEmoji.updateSetting(false);
        } catch (e) { /* ignored */ }
    }
    if (settings.store.disableAutoPlayGifs && AutoPlayGifs) {
        try {
            await AutoPlayGifs.updateSetting(false);
        } catch (e) { /* ignored */ }
    }
    if (settings.store.disableActivityStatus) {
        await ShowCurrentGame.updateSetting(false);
    }
    if (settings.store.customCSS) {
        document.body.classList.add("vc-performance-mode-enabled");
    }
}

async function restoreOriginalSettings() {
    if (Object.keys(originalSettings).length === 0) return;

    await MessageDisplayCompact.updateSetting(originalSettings.messageDisplayCompact);
    await EmbedLinks.updateSetting(originalSettings.embedLinks);
    await ShowCurrentGame.updateSetting(originalSettings.showCurrentGame);

    if (AnimatedEmoji && originalSettings.animatedEmoji !== undefined) {
        try {
            await AnimatedEmoji.updateSetting(originalSettings.animatedEmoji);
        } catch (e) { /* ignored */ }
    }

    if (AutoPlayGifs && originalSettings.autoPlayGifs !== undefined) {
        try {
            await AutoPlayGifs.updateSetting(originalSettings.autoPlayGifs);
        } catch (e) { /* ignored */ }
    }

    document.body.classList.remove("vc-performance-mode-enabled");
}
// endregion Utils

// region Definition
export default definePlugin({
    name: pluginInfo.name,
    description: pluginInfo.description,
    authors: pluginInfo.authors,
    dependencies: ["UserSettingsAPI", "ChatInputButtonAPI"],
    settings,

    start() {
        addChatBarButton("performanceModeToggle", () => {
            return (
                <ChatBarButton
                    tooltip="Toggle Performance Mode"
                    onClick={async () => {
                        const newState = !settings.store.enabled;
                        settings.store.enabled = newState;
                        if (newState) {
                            await applyPerformanceSettings();
                        } else {
                            await restoreOriginalSettings();
                        }
                    }}
                >
                    {settings.store.enabled ? "⚡ ON" : "⚡"}
                </ChatBarButton>
            );
        });

        if (settings.store.enabled) {
            applyPerformanceSettings();
        }
    },

    stop() {
        removeChatBarButton("performanceModeToggle");
        if (settings.store.enabled) {
            restoreOriginalSettings();
        }
    },

    settingsAboutComponent: () => {
        const { enabled } = settings.use(["enabled"]);

        return (
            <div>
                <div style={{ marginBottom: "1rem" }}>
                    <h3>Performance Mode Settings</h3>
                    <p>
                        Performance Mode optimizes Discord by disabling resource-intensive features when enabled.
                        The toggle button appears in the chat bar for quick access.
                    </p>
                </div>

                {enabled && (
                    <div style={{
                        padding: "1rem",
                        backgroundColor: "var(--background-modifier-accent)",
                        borderRadius: "8px",
                        marginBottom: "1rem",
                    }}>
                        <strong>⚡ Performance Mode is currently ACTIVE</strong>
                        <br />
                        Discord settings have been optimized for better performance.
                    </div>
                )}

                <div style={{ marginBottom: "1rem" }}>
                    <h4>What Performance Mode does:</h4>
                    <ul style={{ marginLeft: "1rem" }}>
                        <li>Disables auto-embed links (reduces network requests)</li>
                        <li>Enables compact message mode (less visual clutter)</li>
                        <li>Disables animated emojis (reduces CPU usage)</li>
                        <li>Disables auto-play GIFs (saves bandwidth)</li>
                        <li>Disables activity status sharing (reduces overhead)</li>
                        <li>Applies custom CSS optimizations</li>
                    </ul>
                </div>

                <div style={{
                    padding: "1rem",
                    backgroundColor: "var(--background-modifier-hover)",
                    borderRadius: "8px",
                    fontSize: "0.9em",
                }}>
                    <strong>Note:</strong> Original settings are saved and restored when you disable Performance Mode.
                </div>
            </div>
        );
    },
});
// endregion Definition
