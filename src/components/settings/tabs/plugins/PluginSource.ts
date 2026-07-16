/*
 * Decord, a Discord client mod
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginMeta } from "~plugins";

export const enum PluginSource {
    VENCORD,
    EQUICORD,
    DECORD,
    USER
}

export const PluginSourceLabels: Record<PluginSource, string> = {
    [PluginSource.VENCORD]: "Vencord",
    [PluginSource.EQUICORD]: "Equicord",
    [PluginSource.DECORD]: "Decord",
    [PluginSource.USER]: "User"
};

export function getPluginSource(pluginName: string): PluginSource {
    const meta = PluginMeta[pluginName];
    const folderName = meta?.folderName.replaceAll("\\", "/") ?? "";

    if (meta?.userPlugin)
        return PluginSource.USER;

    if (folderName.startsWith("src/equicordplugins/"))
        return PluginSource.EQUICORD;

    if (folderName.startsWith("src/decplugins/"))
        return PluginSource.DECORD;

    return PluginSource.VENCORD;
}
