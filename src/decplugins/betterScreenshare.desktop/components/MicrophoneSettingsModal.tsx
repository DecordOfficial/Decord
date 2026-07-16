/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, React, Slider, useState } from "@webpack/common";

import { ScreenshareAudioProfile, ScreenshareAudioStore } from "../stores/microphoneCompat";
import {
    ProfilableStore,
    SettingsModal,
    SettingsModalCard,
    SettingsModalCardItem,
    SettingsModalProfilesCard,
} from "@plugins/philsPluginLibrary";

export interface MicrophoneSettingsModalProps extends React.ComponentProps<typeof SettingsModal> {
    microphoneStore: ProfilableStore<ScreenshareAudioStore, ScreenshareAudioProfile>;
    onDone?: () => void;
}

export function MicrophoneSettingsModal({ microphoneStore, onDone, title, ...props }: MicrophoneSettingsModalProps) {
    const { currentProfile, setVoiceBitrate } = microphoneStore.use();
    const [isSaving, setIsSaving] = useState(false);

    return (
        <SettingsModal title={title} onClose={onDone} {...props}>
            <SettingsModalProfilesCard
                flex={0.5}
                profileableStore={microphoneStore}
                onSaveStateChanged={setIsSaving}
            />
            <SettingsModalCard title="Voice bitrate">
                <SettingsModalCardItem>
                    <Forms.FormTitle tag="h3">Bitrate (kbps)</Forms.FormTitle>
                    <Slider
                        minValue={8}
                        maxValue={512}
                        initialValue={currentProfile.voiceBitrate ?? 64}
                        onValueChange={v => setVoiceBitrate(v)}
                        onValueRender={v => `${Math.round(v)} kbps`}
                        disabled={isSaving || !currentProfile.voiceBitrateEnabled}
                    />
                </SettingsModalCardItem>
            </SettingsModalCard>
        </SettingsModal>
    );
}
