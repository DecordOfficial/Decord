/*
 * Decord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DecordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, useState } from "@webpack/common";

const STORAGE_KEY = "decord_quick_notes";

function loadNotes(): string {
    try { return localStorage.getItem(STORAGE_KEY) ?? ""; } catch { return ""; }
}

function saveNotes(text: string) {
    try { localStorage.setItem(STORAGE_KEY, text); } catch { }
}

export default definePlugin({
    name: "QuickNotes",
    description: "Floating quick-notes panel — jot reminders without leaving Discord",
    authors: [DecordDevs.Owner],
    settingsAboutComponent: () => {
        const [notes, setNotes] = useState(loadNotes);
        return (
            <div style={{ padding: "0.5em 0" }}>
                <textarea
                    value={notes}
                    onChange={e => { setNotes(e.target.value); saveNotes(e.target.value); }}
                    placeholder="اكتب ملاحظاتك هنا..."
                    rows={8}
                    style={{ width: "100%", resize: "vertical", background: "var(--background-secondary)", color: "var(--text-normal)", border: "1px solid var(--background-modifier-accent)", borderRadius: 8, padding: 8 }}
                />
            </div>
        );
    },
    options: {
        showInToolbox: {
            type: OptionType.BOOLEAN,
            description: "Show open-notes action in plugin toolbox",
            default: true,
        },
    },
});
