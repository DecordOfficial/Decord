/*
 * Decord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DecordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Forms, React } from "@webpack/common";

export default definePlugin({
    name: "DecAbout",
    description: "Shows Decord plugin ecosystem info in settings",
    authors: [DecordDevs.Owner],

    settingsAboutComponent: () => (
        <div style={{ lineHeight: 1.6 }}>
            <Forms.FormTitle tag="h3">Decord Plugin Stack</Forms.FormTitle>
            <Forms.FormText>
                Decord ships <strong>three</strong> plugin libraries:
            </Forms.FormText>
            <ul style={{ marginTop: 8 }}>
                <li><strong>Vencord</strong> — <code>src/plugins/</code> official Vencord plugins</li>
                <li><strong>Equicord</strong> — <code>src/equicordplugins/</code> 150+ community plugins</li>
                <li><strong>Decord</strong> — <code>src/decplugins/</code> exclusive Decord plugins</li>
            </ul>
            <Forms.FormText style={{ marginTop: 12 }}>
                Badges are RSA-signed and only grantable from your Decord Badge Server admin panel.
            </Forms.FormText>
        </div>
    ),
});
