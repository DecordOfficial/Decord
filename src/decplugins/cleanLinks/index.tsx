/*
 * Decord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DecordDevs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import definePlugin from "@utils/types";
import { Menu, React } from "@webpack/common";

function cleanUrl(raw: string): string {
    try {
        const u = new URL(raw);
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "gclid"].forEach(p => u.searchParams.delete(p));
        u.hash = "";
        return u.toString();
    } catch {
        return raw;
    }
}

export default definePlugin({
    name: "CleanLinks",
    description: "Copy links without tracking params (utm, fbclid, etc.)",
    authors: [DecordDevs.Owner],

    contextMenus: {
        "message": (children, { message }) => {
            const urlMatch = message?.content?.match(/https?:\/\/[^\s<>]+/);
            if (!urlMatch) return;

            children.push(
                <Menu.MenuItem
                    id="decord-clean-link"
                    label="Copy Clean Link"
                    action={() => copyWithToast(cleanUrl(urlMatch[0]))}
                />
            );
        },
    },
});
