import { Channel } from "@vencord/discord-types";
import { isTextChannel } from "./utils/channels";
import { ChannelStore, GuildChannelStore, VoiceStateStore } from "@webpack/common";

export function getVoiceChannelUserCount(channelId: string): number {
    const voiceStates = VoiceStateStore.getVoiceStatesForChannel(channelId);
    return voiceStates ? Object.keys(voiceStates).length : 0;
}

export function isChannelFull(channel: Channel): boolean {
    if (!channel?.userLimit) return false;
    return getVoiceChannelUserCount(channel.id) >= channel.userLimit;
}

export function findAssociatedTextChannel(voiceChannelId: string): string | null {
    const voiceChannel = ChannelStore.getChannel(voiceChannelId);
    if (!voiceChannel || !voiceChannel.guild_id) return null;

    // In Discord, voice channels often have the same ID as their associated text channel
    // Try using the voice channel ID directly as the text channel ID
    const textChannel = ChannelStore.getChannel(voiceChannelId);
    if (isTextChannel(textChannel)) {
        // Type 0 is GUILD_TEXT
        return voiceChannelId;
    }

    // Fallback: try to find a text channel with the same name
    const guildChannels = GuildChannelStore.getChannels(voiceChannel.guild_id);
    if (!guildChannels || !(guildChannels as any).SELECTABLE) {
        return voiceChannelId; // Still try the voice channel ID as fallback
    }

    const associatedTextChannel = (guildChannels as any).SELECTABLE.find(
        ({ channel }: any) =>
            channel.name === voiceChannel.name &&
            channel.parent_id === voiceChannel.parent_id
    )?.channel;

    return associatedTextChannel ? associatedTextChannel.id : voiceChannelId;
}
