import { findByPropsLazy } from "@webpack";

export const waitingChannels = new Set<string>();

export let lastKnownVoiceChannelId: string | null = null;
export function setLastKnownVoiceChannelId(id: string | null) {
    lastKnownVoiceChannelId = id;
}

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");

export function stopWaiting(channelId?: string) {
    if (channelId) {
        if (waitingChannels.has(channelId)) {
            waitingChannels.delete(channelId);
        }
    } else {
        waitingChannels.clear();
    }
}

export function joinChannel(channelId: string) {
    stopWaiting(); // Clear all
    selectVoiceChannel(channelId);
}
