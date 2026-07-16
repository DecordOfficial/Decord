import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, GuildChannelStore, Menu, React, RestAPI, Toasts, UserStore } from "@webpack/common";

interface VoiceState {
    userId: string;
    channelId?: string;
}

interface VoiceStateStore {
    getAllVoiceStates(): Record<string, Record<string, VoiceState>>;
}

const VoiceStateStore: VoiceStateStore = findStoreLazy("VoiceStateStore");

const settings = definePluginSettings({
    bounceCount: {
        type: OptionType.NUMBER,
        description: "How many random channel moves to do before returning (default 4).",
        default: 4
    },
    moveDelayMs: {
        type: OptionType.NUMBER,
        description: "Delay between each move in milliseconds.",
        default: 700
    }
});

async function moveGuildMember(guildId: string, userId: string, channelId: string | null) {
    await RestAPI.patch({
        url: `/guilds/${guildId}/members/${userId}`,
        body: { channel_id: channelId }
    });
}

function getUserChannelId(userId: string, guildId: string): string | null {
    try {
        const guildStates = VoiceStateStore.getAllVoiceStates()?.[guildId];
        if (!guildStates) return null;
        return guildStates[userId]?.channelId ?? null;
    } catch {
        return null;
    }
}

function getGuildVoiceChannelIds(guildId: string): string[] {
    const guildChannels = GuildChannelStore.getChannels(guildId);
    const vocal = guildChannels?.VOCAL ?? [];
    return vocal
        .map(({ channel }: { channel: any; }) => channel)
        .filter((channel: any) => channel && (channel.type === 2 || channel.type === 13))
        .map((channel: any) => channel.id);
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

const UserContext: NavContextMenuPatchCallback = (children, props) => {
    const user = props?.user;
    const guildId = props?.guildId;
    const myId = UserStore.getCurrentUser()?.id;

    if (!user || !guildId || !myId || user.id === myId) return;

    children.splice(
        -1,
        0,
        React.createElement(
            Menu.MenuGroup,
            { key: "bounce-user-group" },
            React.createElement(Menu.MenuItem, {
                id: "bounce-user",
                label: "Bounce User",
                action: async () => {
                    const guildVoiceChannels = getGuildVoiceChannelIds(guildId);
                    if (guildVoiceChannels.length < 1) {
                        Toasts.show({
                            message: "No voice channels found in this server.",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                        return;
                    }

                    const originalChannelId = getUserChannelId(user.id, guildId);
                    const bounceCount = Math.max(1, Math.floor(settings.store.bounceCount || 4));
                    const moveDelayMs = Math.max(100, Math.floor(settings.store.moveDelayMs || 700));

                    try {
                        let lastChannelId = originalChannelId;
                        for (let i = 0; i < bounceCount; i++) {
                            const possibleChannels = guildVoiceChannels.filter(id => id !== lastChannelId);
                            const pool = possibleChannels.length ? possibleChannels : guildVoiceChannels;
                            const randomChannelId = pickRandom(pool);
                            await moveGuildMember(guildId, user.id, randomChannelId);
                            lastChannelId = randomChannelId;
                            await new Promise(resolve => setTimeout(resolve, moveDelayMs));
                        }

                        await moveGuildMember(guildId, user.id, originalChannelId);
                        Toasts.show({
                            message: `Bounced ${user.username} through ${bounceCount} random channels and returned.`,
                            id: Toasts.genId(),
                            type: Toasts.Type.SUCCESS
                        });
                    } catch (error) {
                        console.error("Bounce user failed", error);
                        Toasts.show({
                            message: "Failed to bounce user. Check permissions.",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                    }
                }
            })
        )
    );
};

export default definePlugin({
    name: "Marble-BounceUser",
    description: "Moves a user through random configured VC channels, then returns them.",
    authors: [{ name: "Marble", id: 846143010340208640n }],
    settings,
    contextMenus: {
        "user-context": UserContext
    }
});