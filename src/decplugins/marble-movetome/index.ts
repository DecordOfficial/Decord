import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, Menu, PermissionsBits, PermissionStore, React, RestAPI, SelectedChannelStore, Toasts, UserStore } from "@webpack/common";

async function moveToMyChannel(userId: string, guildId: string, myChannelId: string) {
    await RestAPI.patch({
        url: `/guilds/${guildId}/members/${userId}`,
        body: { channel_id: myChannelId }
    });
}

const settings = definePluginSettings({
    fallbackChannelId: {
        type: OptionType.STRING,
        description: "Optional voice channel ID used when you are not connected to voice.",
        default: ""
    }
});

interface GuildChannelStore {
    getChannels(guildId: string): {
        VOCAL?: Array<{ channel: { id: string; type: number; guild_id?: string; guildId?: string; }; }>;
    };
}

const GuildChannelStore: GuildChannelStore = findStoreLazy("GuildChannelStore");

function getRandomVoiceChannelId(guildId: string): string | null {
    const guildChannels = GuildChannelStore.getChannels(guildId);
    const vocal = guildChannels?.VOCAL ?? [];
    const voiceChannels = vocal
        .map(x => x.channel)
        .filter(Boolean)
        .filter(channel => channel.type === 2 || channel.type === 13);

    if (!voiceChannels.length) return null;
    return voiceChannels[Math.floor(Math.random() * voiceChannels.length)].id;
}

const UserContext: NavContextMenuPatchCallback = (children, props) => {
    const user = props?.user;
    const guildId = props?.guildId;
    const me = UserStore.getCurrentUser();

    if (!user || !guildId || !me || user.id === me.id) return;

    children.splice(
        -1,
        0,
        React.createElement(
            Menu.MenuGroup,
            { key: "move-to-my-channel-group" },
            React.createElement(Menu.MenuItem, {
                id: "move-to-my-channel",
                label: "Move to My Channel",
                action: async () => {
                    const myChannelId = SelectedChannelStore.getVoiceChannelId()
                        || settings.store.fallbackChannelId?.trim()
                        || getRandomVoiceChannelId(guildId);
                    if (!myChannelId) {
                        Toasts.show({
                            message: "No voice channel found in this server.",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                        return;
                    }

                    const myChannel = ChannelStore.getChannel(myChannelId);
                    if (!myChannel) {
                        Toasts.show({
                            message: "Could not resolve your voice channel.",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                        return;
                    }

                    if ((myChannel as any).guild_id !== guildId) {
                        Toasts.show({
                            message: "Target channel must be in the same server as the selected user.",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                        return;
                    }

                    if (!PermissionStore.can(PermissionsBits.MOVE_MEMBERS, myChannel)) {
                        Toasts.show({
                            message: "Missing Move Members permission in your channel.",
                            id: Toasts.genId(),
                            type: Toasts.Type.FAILURE
                        });
                        return;
                    }

                    try {
                        await moveToMyChannel(user.id, guildId, myChannelId);
                        Toasts.show({
                            message: `Moved ${user.username} to your channel.`,
                            id: Toasts.genId(),
                            type: Toasts.Type.SUCCESS
                        });
                    } catch (error) {
                        console.error("Move to my channel failed", error);
                        const apiMessage = (error as any)?.body?.message;
                        Toasts.show({
                            message: apiMessage ? `Failed to move user: ${apiMessage}` : "Failed to move user. Check permissions.",
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
    name: "Marble-MoveToMe",
    description: "Adds a user menu action to move someone into your current VC.",
    authors: [{ name: "Marble", id: 846143010340208640n }],
    settings,
    contextMenus: {
        "user-context": UserContext
    }
});