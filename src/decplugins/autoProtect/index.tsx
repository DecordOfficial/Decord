/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { PermissionsBits } from "@webpack/common";
import { PermissionStore, UserStore } from "@webpack/common/stores";

import settings from "./settings";
import { VoiceState, VoiceStateUpdateEvent } from "./types/events";

const { selectVoiceChannel }: {
    selectVoiceChannel(channelId: string): void;
} = findByPropsLazy("selectVoiceChannel", "selectChannel");

const { setServerMute, setServerDeaf }: {
    setServerMute(guildId: string, userId: string, mute: boolean): void;
    setServerDeaf(guildId: string, userId: string, deaf: boolean): void;
} = findByPropsLazy("setServerMute", "setServerDeaf");

export default definePlugin({
    name: "AutoProtect",
    description: "Automatically protect users in voice channels from being kicked or muted.",
    authors: [{
        name: "nicola02nb",
        id: 257900031351193600n
    }],
    settings,
    flux: {
        TRACK: track,
        VOICE_STATE_UPDATES: protect
    },
    start: () => {
    },
    stop: () => {
    }
});

let callButtonClicked = false;
let oldChannelId: string | null = null;
let currentChannelId: string | null = null;

function track(event: any) {
    if (event.event === "call_button_clicked") {
        callButtonClicked = true;
    }
    if (event.event === "leave_voice_channel") {
        if (settings.store.protectFromDisconnect && !callButtonClicked && !currentChannelId) {
            protectFromKick(oldChannelId!);
        }
        callButtonClicked = false;
    }
    if (event.event === "join_voice_channel") {
        if (settings.store.protectFromMove && event.properties.was_moved) {
            protectFromKick(oldChannelId!);
        }
    }
}

function protect(event: VoiceStateUpdateEvent) {
    const userId = UserStore.getCurrentUser().id;
    for (const voiceState of event.voiceStates) {
        if (voiceState.userId === userId) {
            oldChannelId = voiceState.oldChannelId || null;
            currentChannelId = voiceState.channelId || null;
            protectVoiceStateUpdate(voiceState);
        }
    }
}

function protectVoiceStateUpdate(voiceState: VoiceState) {
    if (settings.store.protectFromMute && voiceState.mute && PermissionStore.canWithPartialContext(PermissionsBits.MUTE_MEMBERS, { channelId: voiceState.channelId })) {
        setServerMute(voiceState.guildId, voiceState.userId, false);
    }
    if (settings.store.protectFromDeaf && voiceState.deaf && PermissionStore.canWithPartialContext(PermissionsBits.DEAFEN_MEMBERS, { channelId: voiceState.channelId })) {
        setServerDeaf(voiceState.guildId, voiceState.userId, false);
    }
}

function protectFromKick(channelId: string) {
    if (!PermissionStore.can(PermissionsBits.CONNECT, channelId)) {
        selectVoiceChannel(channelId);
    }
}
