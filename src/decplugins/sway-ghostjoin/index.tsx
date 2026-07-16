/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import {
    addSettingsPanelButton,
    removeSettingsPanelButton,
} from "@plugins/philsPluginLibrary";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import {
    ChannelActions,
    ChannelStore,
    FluxDispatcher,
    MediaEngineStore,
    Menu,
    SelectedChannelStore,
    Toasts,
    UserStore,
    VoiceActions,
} from "@webpack/common";
import type { ComponentProps } from "react";

const BAR_BUTTON_ID = "sway-ghostjoin";

interface VoiceState {
    userId: string;
    channelId?: string | null;
    oldChannelId?: string | null;
    guildId?: string;
}

type GhostPhase = "off" | "joining" | "hidden";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable ghost join.",
        default: true,
        onChange: (value: boolean) => {
            if (!value) {
                resetGhost(true);
                ghostSessionActive = false;
                refreshBarButton();
            } else {
                ghostSessionActive = true;
                refreshBarButton();
            }
        },
    },
    hideFromOthers: {
        type: OptionType.BOOLEAN,
        description: "Tell the server you left the channel while keeping your audio connection (others should not see you).",
        default: true,
    },
    hideLocally: {
        type: OptionType.BOOLEAN,
        description: "Hide yourself from the voice channel member list on your screen.",
        default: true,
    },
    hideDelay: {
        type: OptionType.SLIDER,
        description: "Wait after voice connects before hiding (ms). Increase if you cannot hear audio.",
        default: 2800,
        markers: [1200, 2000, 2800, 4000, 6000],
        stickToMarkers: false,
    },
    autoMute: {
        type: OptionType.BOOLEAN,
        description: "Auto-mute your mic when ghost listening (you still hear the room — do NOT use deafen).",
        default: true,
    },
    showToast: {
        type: OptionType.BOOLEAN,
        description: "Show a toast when ghost listen starts.",
        default: true,
    },
    showBarButton: {
        type: OptionType.BOOLEAN,
        description: "Show a ghost join toggle in the voice bar (bottom panel).",
        default: true,
        onChange: (value: boolean) => {
            if (value) registerBarButton();
            else removeSettingsPanelButton(BAR_BUTTON_ID);
        },
    },
});

let ghostChannelId: string | null = null;
let ghostGuildId: string | null = null;
let ghostJoinPending = false;
let ghostPhase: GhostPhase = "off";
let sendingHideUpdate = false;
let suppressLocalDisconnect = false;
let userRequestedLeave = false;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let hideAttempted = false;

export let ghostSessionActive = true;

let voiceStateUpdateRef: ((opts: Record<string, unknown>) => void) | null = null;
let voiceInterceptor: ((event: { type: string; voiceStates?: VoiceState[]; }) => void | false) | null = null;
let originalSelectVoice: typeof ChannelActions.selectVoiceChannel;

const VoiceStateUpdateLookup = findByCodeLazy("self_video", "preferred_region");
const ChannelActionModule = findByPropsLazy("selectVoiceChannel", "disconnect");

function shouldGhost() {
    return settings.store.enabled && ghostSessionActive;
}

function isGhosting() {
    return shouldGhost() && ghostChannelId != null && ghostPhase === "hidden";
}

function getMyId() {
    return UserStore.getCurrentUser()?.id;
}

function clearHideTimer() {
    if (hideTimer != null) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
}

function resetGhost(userLeave = false) {
    clearHideTimer();
    ghostChannelId = null;
    ghostGuildId = null;
    ghostJoinPending = false;
    ghostPhase = "off";
    sendingHideUpdate = false;
    suppressLocalDisconnect = false;
    hideAttempted = false;
    if (userLeave) userRequestedLeave = false;
}

function notifyGhostJoin() {
    if (!settings.store.showToast) return;
    Toasts.show({
        message: "Ghost listen — you hear the room without showing in the member list.",
        id: Toasts.genId(),
        type: Toasts.Type.MESSAGE,
    });
}

function applyAutoMute() {
    if (!settings.store.autoMute) return;
    try {
        if (!MediaEngineStore.isSelfMute()) VoiceActions.toggleSelfMute();
    } catch { }
}

/** Keep hearing — never deafen for ghost listen. */
function ensureCanHear() {
    try {
        if (MediaEngineStore.isSelfDeaf()) VoiceActions.toggleSelfDeaf();
    } catch { }
}

function resolveVoiceStateUpdate() {
    if (voiceStateUpdateRef) return;

    const mod = VoiceStateUpdateLookup as Record<string, unknown> | ((opts: Record<string, unknown>) => void);
    if (typeof mod === "function") {
        voiceStateUpdateRef = mod;
        return;
    }

    for (const value of Object.values(mod ?? {})) {
        if (typeof value === "function" && /self_video|channelId|preferred_region/.test(value.toString())) {
            voiceStateUpdateRef = value as (opts: Record<string, unknown>) => void;
            return;
        }
    }

    for (const value of Object.values(ChannelActionModule ?? {})) {
        if (typeof value === "function" && /self_video|channel_id|channelId/.test(value.toString())) {
            voiceStateUpdateRef = value as (opts: Record<string, unknown>) => void;
            return;
        }
    }
}

function sendHiddenVoiceState() {
    if (!ghostChannelId || ghostPhase !== "joining" || hideAttempted) return;
    hideAttempted = true;

    resolveVoiceStateUpdate();
    if (!voiceStateUpdateRef) {
        console.warn("[SwayGhostJoin] voiceStateUpdate not found — rebuild & restart Discord.");
        ghostPhase = "hidden";
        suppressLocalDisconnect = true;
        return;
    }

    const channel = ChannelStore.getChannel(ghostChannelId);
    const guildId = ghostGuildId ?? channel?.guild_id ?? null;

    suppressLocalDisconnect = true;
    sendingHideUpdate = true;

    try {
        voiceStateUpdateRef({
            guildId,
            channelId: null,
            selfMute: MediaEngineStore.isSelfMute?.() ?? settings.store.autoMute,
            selfDeaf: false,
            selfVideo: false,
        });
    } catch (e) {
        console.warn("[SwayGhostJoin] hide voice state failed", e);
    } finally {
        sendingHideUpdate = false;
    }

    ghostPhase = "hidden";
    ensureCanHear();
    applyAutoMute();
    notifyGhostJoin();
}

function scheduleHideAfterConnect() {
    clearHideTimer();
    if (!settings.store.hideFromOthers || ghostPhase !== "joining" || hideAttempted) return;

    hideTimer = setTimeout(() => {
        hideTimer = null;
        if (ghostPhase !== "joining" || !ghostChannelId) return;

        const connectedId = SelectedChannelStore.getVoiceChannelId();
        if (connectedId !== ghostChannelId) {
            hideTimer = setTimeout(scheduleHideAfterConnect, 500);
            return;
        }

        sendHiddenVoiceState();
    }, settings.store.hideDelay);
}

function beginGhostJoin(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    ghostChannelId = channelId;
    ghostGuildId = channel?.guild_id ?? null;
    ghostJoinPending = false;
    ghostPhase = "joining";
    hideAttempted = false;
    suppressLocalDisconnect = false;
}

function fixSelfVoiceStateInEvent(voiceStates: VoiceState[]) {
    if (!suppressLocalDisconnect || !ghostChannelId) return;

    const myId = getMyId();
    if (!myId) return;

    for (const state of voiceStates) {
        if (state.userId !== myId) continue;

        if (!state.channelId) {
            state.channelId = ghostChannelId;
            state.guildId = ghostGuildId ?? state.guildId;
        }
    }
}

function stripSelfFromVoiceStates(voiceStates: VoiceState[]) {
    if (!settings.store.hideLocally || !isGhosting()) return;

    const myId = getMyId();
    if (!myId) return;

    for (const state of voiceStates) {
        if (state.userId !== myId || !state.channelId) continue;
        state.oldChannelId = state.channelId;
        state.channelId = null;
    }
}

function GhostIcon(props: ComponentProps<"svg">) {
    const active = ghostSessionActive && (ghostPhase === "joining" || ghostPhase === "hidden");
    return (
        <svg
            {...props}
            aria-hidden="true"
            role="img"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                fill={active ? "var(--status-positive)" : "var(--interactive-normal)"}
                d="M12 2C7.03 2 3 6.03 3 11v3.5c0 .83.67 1.5 1.5 1.5H6v2.5c0 .55.45 1 1 1h1.2c.22 1.14 1.22 2 2.4 2h3.8c1.18 0 2.18-.86 2.4-2H17c.55 0 1-.45 1-1v-2.5h1.5c.83 0 1.5-.67 1.5-1.5V11c0-4.97-4.03-9-9-9zm-2.5 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
            />
        </svg>
    );
}

function refreshBarButton() {
    if (!settings.store.showBarButton) return;
    removeSettingsPanelButton(BAR_BUTTON_ID);
    registerBarButton();
}

function toggleGhostSession() {
    ghostSessionActive = !ghostSessionActive;

    if (!ghostSessionActive) {
        userRequestedLeave = true;
        const id = SelectedChannelStore.getVoiceChannelId();
        if (id) ChannelActions.selectVoiceChannel(null);
        resetGhost(true);
        Toasts.show({
            message: "Ghost join off",
            id: Toasts.genId(),
            type: Toasts.Type.MESSAGE,
        });
        refreshBarButton();
        return;
    }

    const voiceChannelId = SelectedChannelStore.getVoiceChannelId();
    if (voiceChannelId) {
        beginGhostJoin(voiceChannelId);
        ensureCanHear();
        scheduleHideAfterConnect();
    } else {
        Toasts.show({
            message: "Ghost join on — join a voice channel to listen hidden",
            id: Toasts.genId(),
            type: Toasts.Type.MESSAGE,
        });
    }

    refreshBarButton();
}

function registerBarButton() {
    addSettingsPanelButton({
        name: BAR_BUTTON_ID,
        icon: GhostIcon,
        tooltipText: ghostSessionActive ? "Ghost listen: on" : "Ghost listen: off",
        onClick: toggleGhostSession,
    });
}

const ChannelContext: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel || (channel.type !== 2 && channel.type !== 13)) return;

    const inGhostHere = isGhosting() && ghostChannelId === channel.id;

    children.splice(
        -1,
        0,
        <Menu.MenuItem
            id="vc-sway-ghostjoin-toggle"
            label={inGhostHere ? "Stop ghost listen" : "Ghost listen to channel"}
            action={() => {
                if (inGhostHere) {
                    userRequestedLeave = true;
                    ChannelActions.selectVoiceChannel(null);
                    return;
                }
                ghostSessionActive = true;
                ghostJoinPending = true;
                refreshBarButton();
                ChannelActions.selectVoiceChannel(channel.id);
            }}
        />
    );
};

export default definePlugin({
    name: "SwayGhostJoin",
    description: "Listen to voice channels without appearing in the member list (ghost join).",
    tags: ["Voice", "Utility"],
    authors: [{ name: "sway", id: 0n }],
    dependencies: ["PhilsPluginLibrary"],
    settings,

    patches: [
        {
            find: "}voiceStateUpdate(",
            predicate: () => settings.store.hideFromOthers,
            replacement: [
                {
                    match: /voiceStateUpdate:(\i)/,
                    replace: "voiceStateUpdate:$self.hookVoiceStateUpdate($1)",
                },
                {
                    match: /channel_id:(\i)/,
                    replace: "channel_id:$self.maskOutgoingChannelId($1)",
                },
            ],
        },
    ],

    contextMenus: {
        "channel-context": ChannelContext,
    },

    hookVoiceStateUpdate(original: unknown) {
        if (typeof original === "function") {
            voiceStateUpdateRef = original as (opts: Record<string, unknown>) => void;
        }
        return original;
    },

    maskOutgoingChannelId(channelId: string | null) {
        if (!shouldGhost() || !settings.store.hideFromOthers) return channelId;

        if (sendingHideUpdate) return null;

        if (!channelId) {
            if (!userRequestedLeave && suppressLocalDisconnect) return ghostChannelId;
            if (ghostPhase !== "joining") resetGhost();
            return null;
        }

        const joiningThis =
            ghostJoinPending
            || ghostPhase === "joining"
            || (ghostChannelId === channelId && ghostPhase !== "hidden");

        if (!joiningThis) return channelId;

        ghostChannelId = channelId;
        const channel = ChannelStore.getChannel(channelId);
        ghostGuildId = channel?.guild_id ?? ghostGuildId;
        ghostJoinPending = false;

        if (ghostPhase === "off") ghostPhase = "joining";

        if (ghostPhase === "joining" && !hideAttempted) {
            scheduleHideAfterConnect();
        }

        return channelId;
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!shouldGhost() || !voiceStates?.length) return;

            const myId = getMyId();
            if (!myId) return;

            fixSelfVoiceStateInEvent(voiceStates);

            const me = voiceStates.find(s => s.userId === myId);
            if (me?.channelId && ghostPhase === "joining" && me.channelId === ghostChannelId) {
                ensureCanHear();
                scheduleHideAfterConnect();
            }

            if (isGhosting() && settings.store.hideLocally) {
                stripSelfFromVoiceStates(voiceStates);
            }
        },
    },

    start() {
        originalSelectVoice = ChannelActions.selectVoiceChannel;
        ChannelActions.selectVoiceChannel = (id: string | null, ...args: unknown[]) => {
            if (!shouldGhost()) {
                if (!id) resetGhost(true);
                return originalSelectVoice(id, ...args);
            }

            if (id) {
                userRequestedLeave = false;
                ghostJoinPending = true;
                beginGhostJoin(id);
                ensureCanHear();
            } else {
                if (suppressLocalDisconnect && !userRequestedLeave) {
                    return Promise.resolve();
                }
                resetGhost(true);
            }

            return originalSelectVoice(id, ...args);
        };

        voiceInterceptor = event => {
            if (event.type !== "VOICE_STATE_UPDATES" || !event.voiceStates) return;

            if (shouldGhost()) fixSelfVoiceStateInEvent(event.voiceStates);

            if (isGhosting() && settings.store.hideLocally) {
                stripSelfFromVoiceStates(event.voiceStates);
            }
        };

        FluxDispatcher.addInterceptor(voiceInterceptor);

        if (settings.store.showBarButton) registerBarButton();
    },

    stop() {
        if (originalSelectVoice) ChannelActions.selectVoiceChannel = originalSelectVoice;

        if (voiceInterceptor) {
            const list = FluxDispatcher._interceptors ?? [];
            const idx = list.indexOf(voiceInterceptor);
            if (idx !== -1) list.splice(idx, 1);
            voiceInterceptor = null;
        }

        removeSettingsPanelButton(BAR_BUTTON_ID);
        ghostSessionActive = true;
        resetGhost(true);
        voiceStateUpdateRef = null;
    },
});
