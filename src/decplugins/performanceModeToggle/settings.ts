import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Performance Mode",
        default: false,
        restartNeeded: false,
    },
    disableEmbeds: {
        type: OptionType.BOOLEAN,
        description: "Disable auto-embed links",
        default: true,
        restartNeeded: false,
    },
    compactMode: {
        type: OptionType.BOOLEAN,
        description: "Enable compact message mode",
        default: true,
        restartNeeded: false,
    },
    disableAnimatedEmojis: {
        type: OptionType.BOOLEAN,
        description: "Disable animated emojis (reduces CPU usage)",
        default: true,
        restartNeeded: false,
    },
    disableAutoPlayGifs: {
        type: OptionType.BOOLEAN,
        description: "Disable auto-play GIFs (saves bandwidth)",
        default: true,
        restartNeeded: false,
    },
    disableActivityStatus: {
        type: OptionType.BOOLEAN,
        description: "Disable activity status sharing",
        default: true,
        restartNeeded: false,
    },
    customCSS: {
        type: OptionType.BOOLEAN,
        description: "Apply custom performance CSS",
        default: true,
        restartNeeded: false,
    },
});
