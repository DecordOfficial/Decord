import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import type { Channel } from "@vencord/discord-types";
import { GuildStore, IconUtils, React } from "@webpack/common";

interface WaitPromptModalProps {
    modalProps: ModalProps;
    channel: Channel;
    onWait: () => void;
    onJump: () => void;
}

export function WaitPromptModal({ modalProps, channel, onWait, onJump }: WaitPromptModalProps) {
    const guild = GuildStore.getGuild(channel.guild_id);
    const guildIcon = guild?.icon == null ? undefined : IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 32 });

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader className="vc-wfs-header">
                <BaseText size="lg" weight="semibold">Channel Full</BaseText>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <div className="vc-wfs-vc-row">
                    {guildIcon && <img className="vc-wfs-guild-icon" src={guildIcon} alt="" />}
                    <BaseText size="md" weight="semibold">{channel.name}</BaseText>
                </div>
                <Paragraph size="md">
                    Would you like to wait for a slot to open in this voice channel?
                </Paragraph>
            </ModalContent>
            <ModalFooter justify="start" direction="horizontal" className="vc-wfs-footer">
                <Button
                    onClick={() => {
                        onWait();
                        modalProps.onClose();
                    }}
                    variant="positive"
                    size="small"
                >
                    Wait for Slot
                </Button>
                <Button
                    onClick={() => {
                        onJump();
                        modalProps.onClose();
                    }}
                    variant="secondary"
                    size="small"
                >
                    Jump
                </Button>
                <Button
                    onClick={modalProps.onClose}
                    variant="dangerPrimary"
                    size="small"
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}
