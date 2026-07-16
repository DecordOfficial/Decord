/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ProfilableInitializer, ProfileableProfile } from "@plugins/philsPluginLibrary";

export interface ScreenshareAudioProfile {
    name?: string;
    channels?: number;
    channelsEnabled?: boolean;
    freq?: number;
    freqEnabled?: boolean;
    pacsize?: number;
    pacsizeEnabled?: boolean;
    rate?: number;
    rateEnabled?: boolean;
    voiceBitrate?: number;
    voiceBitrateEnabled?: boolean;
}

export interface ScreenshareAudioStore {
    setChannels: (channels?: number) => void;
    setChannelsEnabled: (enabled?: boolean) => void;
    setFreq: (freq?: number) => void;
    setFreqEnabled: (enabled?: boolean) => void;
    setPacsize: (pacsize?: number) => void;
    setPacsizeEnabled: (enabled?: boolean) => void;
    setRate: (rate?: number) => void;
    setRateEnabled: (enabled?: boolean) => void;
    setVoiceBitrate: (bitrate?: number) => void;
    setVoiceBitrateEnabled: (enabled?: boolean) => void;
}

export const defaultScreenshareAudioProfiles = {
    default: {
        name: "Default",
        voiceBitrate: 64,
        voiceBitrateEnabled: true,
        channels: 2,
        channelsEnabled: false,
        rate: 48000,
        rateEnabled: false,
        pacsize: 960,
        pacsizeEnabled: false,
        freq: 48000,
        freqEnabled: false,
    }
} as const satisfies Record<string, ScreenshareAudioProfile & ProfileableProfile>;

export const screenshareAudioStoreDefault: ProfilableInitializer<ScreenshareAudioStore, ScreenshareAudioProfile> = (set, get) => ({
    setChannels: channels => { get().currentProfile.channels = channels; },
    setChannelsEnabled: enabled => { get().currentProfile.channelsEnabled = enabled; },
    setFreq: freq => { get().currentProfile.freq = freq; },
    setFreqEnabled: enabled => { get().currentProfile.freqEnabled = enabled; },
    setPacsize: pacsize => { get().currentProfile.pacsize = pacsize; },
    setPacsizeEnabled: enabled => { get().currentProfile.pacsizeEnabled = enabled; },
    setRate: rate => { get().currentProfile.rate = rate; },
    setRateEnabled: enabled => { get().currentProfile.rateEnabled = enabled; },
    setVoiceBitrate: bitrate => { get().currentProfile.voiceBitrate = bitrate; },
    setVoiceBitrateEnabled: enabled => { get().currentProfile.voiceBitrateEnabled = enabled; },
});
