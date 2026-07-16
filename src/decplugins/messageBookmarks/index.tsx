/*
 * Decord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DecordDevs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import definePlugin from "@utils/types";
import { ChannelStore, Menu, React, SelectedChannelStore } from "@webpack/common";

const STORAGE_KEY = "decord_bookmarks";

interface Bookmark {
    id: string;
    channelId: string;
    channelName: string;
    author: string;
    content: string;
    timestamp: number;
}

function load(): Bookmark[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function save(list: Bookmark[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200))); } catch { }
}

export default definePlugin({
    name: "MessageBookmarks",
    description: "Right-click any message → Bookmark — save important messages locally",
    authors: [DecordDevs.Owner],

    contextMenus: {
        "message": (children, { message }) => {
            if (!message?.content && !message?.attachments?.length) return;

            children.push(
                <Menu.MenuItem
                    id="decord-bookmark"
                    label="Bookmark Message"
                    action={() => {
                        const ch = ChannelStore.getChannel(message.channel_id);
                        const list = load();
                        list.unshift({
                            id: message.id,
                            channelId: message.channel_id,
                            channelName: ch?.name ?? "DM",
                            author: message.author?.username ?? "?",
                            content: message.content?.slice(0, 500) ?? "[attachment]",
                            timestamp: Date.now(),
                        });
                        save(list);
                        copyWithToast("Bookmarked!");
                    }}
                />
            );
        },
    },

    toolboxActions: {
        "Copy Bookmarks"() {
            const text = load().map(b =>
                `[${b.channelName}] ${b.author}: ${b.content}`
            ).join("\n");
            copyWithToast(text || "No bookmarks yet");
        },
    },
});
