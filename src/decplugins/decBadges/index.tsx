/*
 * Decord Cloud badges — RSA signed, role-based, donor modal
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addProfileBadge, BadgePosition, ProfileBadge, BadgeUserArgs } from "@api/Badges";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { DecordDevs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import {
    ContextMenuApi, Forms, Menu, Modal, openModal,
    FluxDispatcher, Toasts, UserStore
} from "@webpack/common";

const log = new Logger("DecBadges");
const DEFAULT_API = "https://badges.decord.dev";

interface CloudBadge {
    id: string;
    tooltip: string;
    icon: string;
    kind?: "donor" | "role" | "manual" | string;
}

interface SignedPayload {
    v: number;
    userId: string;
    guildId: string;
    fingerprint: string;
    badges: CloudBadge[];
    issuedAt: number;
    nonce: string;
}

interface SignedResponse {
    payload: SignedPayload;
    signature: string;
}

interface PublicConfig {
    guildId: string;
    fingerprint: string;
}

let publicKeyPem: string | null = null;
let trustedConfig: PublicConfig | null = null;
let donateUrl = "";
const badgeCache = new Map<string, ProfileBadge[]>();
const pending = new Set<string>();

function pemToArrayBuffer(pem: string) {
    const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");
    const binary = atob(b64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    return buf.buffer;
}

async function importPublicKey(pem: string) {
    return crypto.subtle.importKey(
        "spki",
        pemToArrayBuffer(pem),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
    );
}

async function verifySigned(data: SignedResponse, expectedUserId: string): Promise<SignedPayload | null> {
    if (!publicKeyPem) return null;
    try {
        const key = await importPublicKey(publicKeyPem);
        const payloadStr = JSON.stringify(data.payload);
        const sig = Uint8Array.from(atob(data.signature), c => c.charCodeAt(0));
        const ok = await crypto.subtle.verify(
            "RSASSA-PKCS1-v1_5",
            key,
            sig,
            new TextEncoder().encode(payloadStr)
        );
        if (!ok) return null;

        const p = data.payload;
        if (p.userId !== expectedUserId) {
            log.warn("userId mismatch — rejected tampered payload");
            return null;
        }
        if (trustedConfig) {
            if (p.guildId !== trustedConfig.guildId) {
                log.warn("guildId mismatch — rejected");
                return null;
            }
            if (p.fingerprint !== trustedConfig.fingerprint) {
                log.warn("fingerprint mismatch — server identity tampered");
                return null;
            }
        }
        return p;
    } catch (e) {
        log.error("Verify failed", e);
        return null;
    }
}

function BadgeContextMenu({ badge }: { badge: Omit<ProfileBadge, "id"> & BadgeUserArgs; }) {
    return (
        <Menu.Menu navId="decord-badge-ctx" onClose={ContextMenuApi.closeContextMenu} aria-label="Badge Options">
            {badge.description && (
                <Menu.MenuItem id="copy-name" label="Copy Badge Name" action={() => copyWithToast(badge.description!)} />
            )}
            {badge.iconSrc && (
                <Menu.MenuItem id="copy-link" label="Copy Badge Image Link" action={() => copyWithToast(badge.iconSrc!)} />
            )}
        </Menu.Menu>
    );
}

function openDonorModal() {
    openModal(props => (
        <ErrorBoundary noop onError={() => props.onClose()}>
            <Modal
                {...props}
                title={
                    <Forms.FormTitle tag="h2" style={{ width: "100%", textAlign: "center", margin: 0 }}>
                        <Flex justifyContent="center" alignItems="center" gap="0.5em">
                            <Heart />
                            Decord Donor
                        </Flex>
                    </Forms.FormTitle>
                }
            >
                <div>
                    <Flex>
                        <img role="presentation" src="https://cdn.discordapp.com/emojis/1026533070955872337.png" alt="" style={{ margin: "auto" }} />
                        <img role="presentation" src="https://cdn.discordapp.com/emojis/1026533090627174460.png" alt="" style={{ margin: "auto" }} />
                    </Flex>
                    <div style={{ padding: "1em" }}>
                        <Forms.FormText>
                            This badge is a special perk for Decord Donors.
                        </Forms.FormText>
                        <Forms.FormText className={Margins.top20}>
                            Thank you for supporting Decord!
                        </Forms.FormText>
                    </div>
                </div>
                {donateUrl && (
                    <Flex justifyContent="center" style={{ width: "100%", paddingBottom: "1em" }}>
                        <Forms.FormText>
                            <a href={donateUrl} onClick={e => { e.preventDefault(); VencordNative.native.openExternal(donateUrl); }}>
                                Support Decord
                            </a>
                        </Forms.FormText>
                    </Flex>
                )}
            </Modal>
        </ErrorBoundary>
    ));
}

function toProfileBadges(userId: string, list: CloudBadge[]): ProfileBadge[] {
    return list.map((b, i) => {
        const isDonor = b.kind === "donor";
        return {
            id: `decord_${userId}_${b.id || i}`,
            iconSrc: b.icon,
            description: b.tooltip,
            position: BadgePosition.START,
            props: {
                style: { borderRadius: "50%", transform: "scale(0.9)" }
            },
            onContextMenu(event, badge) {
                ContextMenuApi.openContextMenu(event, () => <BadgeContextMenu badge={badge} />);
            },
            onClick: isDonor ? () => openDonorModal() : undefined,
        } satisfies ProfileBadge;
    });
}

let pluginRef: { store: { apiBase: string; }; } | null = null;

async function ensureCloudConfig(apiBase: string) {
    if (publicKeyPem && trustedConfig) return;
    const [pk, cfg] = await Promise.all([
        fetch(`${apiBase}/public-key`).then(r => r.json()),
        fetch(`${apiBase}/api/config/public`).then(r => r.json()),
    ]);
    publicKeyPem = pk.publicKey;
    trustedConfig = { guildId: cfg.guildId, fingerprint: cfg.fingerprint };
}

async function fetchBadgesForUser(userId: string) {
    if (pending.has(userId)) return;
    if (badgeCache.has(userId)) return;
    pending.add(userId);
    const api = (pluginRef?.store.apiBase ?? DEFAULT_API).replace(/\/$/, "");

    try {
        await ensureCloudConfig(api);
        const res = await fetch(`${api}/api/badges/${userId}`);
        if (!res.ok) {
            badgeCache.set(userId, []);
            return;
        }

        const signed = await res.json() as SignedResponse;
        const payload = await verifySigned(signed, userId);
        if (!payload) {
            log.warn("Rejected badges for", userId);
            badgeCache.set(userId, []);
            return;
        }

        badgeCache.set(userId, toProfileBadges(userId, payload.badges));
        FluxDispatcher.dispatch({ type: "USER_PROFILE_MODAL_OPEN" });
    } catch (e) {
        log.error("Fetch failed", userId, e);
    } finally {
        pending.delete(userId);
    }
}

const decBadgeProvider: ProfileBadge = {
    id: "decord_cloud_provider",
    position: BadgePosition.START,
    getBadges({ userId }) {
        if (!badgeCache.has(userId)) void fetchBadgesForUser(userId);
        return badgeCache.get(userId) ?? [];
    },
};

export default definePlugin({
    name: "DecBadges",
    description: "Decord Cloud badges — RSA signed, role-based, Decord Donor support",
    authors: [DecordDevs.Owner],
    required: true,
    options: {
        apiBase: {
            type: OptionType.STRING,
            description: "Decord Cloud URL (your Pterodactyl server)",
            default: DEFAULT_API,
        },
        cacheMinutes: {
            type: OptionType.NUMBER,
            description: "Badge cache TTL (minutes)",
            default: 15,
        },
    },

    toolboxActions: {
        async "Refresh Decord Badges"() {
            badgeCache.clear();
            publicKeyPem = null;
            trustedConfig = null;
            Toasts.show({ id: Toasts.genId(), message: "Decord badge cache cleared", type: Toasts.Type.SUCCESS });
        }
    },

    start() {
        pluginRef = this;
        addProfileBadge(decBadgeProvider);
        const api = this.store.apiBase.replace(/\/$/, "");
        ensureCloudConfig(api).catch(e => log.warn("Cloud config load failed", e));
        setInterval(() => {
            badgeCache.clear();
            publicKeyPem = null;
        }, this.store.cacheMinutes * 60 * 1000);
    },

    stop() {
        pluginRef = null;
    },
});
