import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import {
    Forms,
    React,
    Text,
    Toasts,
    useEffect,
    useMemo,
    useRef,
    useState
} from "@webpack/common";

/* =======================
   STATE
======================= */

export let fakeD = false;

/* =======================
   DISCORD VOICE MODULES
======================= */

const SelfVoice = findByPropsLazy(
    "toggleSelfMute",
    "toggleSelfDeaf",
    "toggleSelfVideo"
);

const MediaEngine = findByPropsLazy(
    "isSelfMute",
    "isSelfDeaf"
);

/* =======================
   TOAST
======================= */

function toast(message: string, type = Toasts.Type.MESSAGE, time = 2500) {
    if (!settings.store.showToasts) return;

    Toasts.show({
        message,
        type,
        id: Toasts.genId(),
        options: {
            duration: time,
            position: Toasts.Position.TOP
        }
    });
}

/* =======================
   SETTINGS
======================= */

const settings = definePluginSettings({
    showToasts: {
        type: OptionType.BOOLEAN,
        default: true
    },

    muteUponFakeDeafen: {
        type: OptionType.BOOLEAN,
        default: false
    },

    mute: {
        type: OptionType.BOOLEAN,
        default: true
    },

    deafen: {
        type: OptionType.BOOLEAN,
        default: true
    },

    cam: {
        type: OptionType.BOOLEAN,
        default: false
    },

    /* KEYBIND */
    keybindEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable keybind",
        default: true
    },

    disableWhileTyping: {
        type: OptionType.BOOLEAN,
        description: "Ignore keybind while typing",
        default: true
    },

    keybindCombo: {
        type: OptionType.STRING,
        default: "ControlLeft + ShiftLeft + KeyD",
        hidden: true
    },

    keybindUI: {
        type: OptionType.COMPONENT,
        component: () => <KeybindRecorder />
    }
});

/* =======================
   KEYBIND UTILS
======================= */

type KeyCombo = string[];

const normalize = (keys: string[]) =>
    Array.from(new Set(keys)).filter(Boolean).slice(0, 3).sort();

const comboToString = (combo: KeyCombo) => normalize(combo).join(" + ");

const parseCombo = (s: string): KeyCombo =>
    normalize((s || "").split("+").map(x => x.trim()).filter(Boolean));

function matchesCombo(pressed: Set<string>, combo: KeyCombo) {
    if (!combo.length) return false;
    return combo.every(k => pressed.has(k));
}

/* =======================
   DISABLE WHILE TYPING
======================= */

function isTypingTarget(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el) return false;

    if (el.isContentEditable) return true;

    const tag = el.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;

    return !!el.closest?.(
        'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    );
}

/* =======================
   KEYBIND RECORDER UI
======================= */

function KeybindRecorder() {
    const [recording, setRecording] = useState(false);
    const [combo, setCombo] = useState<KeyCombo>(() =>
        parseCombo(settings.store.keybindCombo)
    );

    const held = useRef<Set<string>>(new Set());
    const pretty = useMemo(() => comboToString(combo), [combo]);

    useEffect(() => {
        if (!recording) return;

        const down = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            held.current.add(e.code);
            setCombo(normalize([...held.current]));
        };

        const up = (e: KeyboardEvent) => {
            held.current.delete(e.code);
        };

        window.addEventListener("keydown", down, true);
        window.addEventListener("keyup", up, true);

        return () => {
            window.removeEventListener("keydown", down, true);
            window.removeEventListener("keyup", up, true);
            held.current.clear();
        };
    }, [recording]);

    return (
        <Forms.FormSection>
            <Forms.FormTitle>Fake Deafen Keybind</Forms.FormTitle>

            <Forms.FormText>
                Current: <Text strong>{settings.store.keybindCombo || "None"}</Text>
            </Forms.FormText>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Forms.Button
                    color={recording ? "RED" : "BRAND"}
                    size="SMALL"
                    onClick={() => {
                        setRecording(v => !v);
                        held.current.clear();
                        toast(recording ? "Recording stopped" : "Recording… hold up to 3 keys");
                    }}
                >
                    {recording ? "Stop" : "Record"}
                </Forms.Button>

                <Forms.Button
                    color="GREEN"
                    size="SMALL"
                    disabled={!recording}
                    onClick={() => {
                        const final = normalize(combo);
                        if (!final.length) {
                            toast("Record at least one key", Toasts.Type.FAILURE);
                            return;
                        }
                        settings.store.keybindCombo = comboToString(final);
                        setRecording(false);
                        toast("Keybind saved", Toasts.Type.SUCCESS);
                    }}
                >
                    Save
                </Forms.Button>

                <Forms.Button
                    size="SMALL"
                    onClick={() => {
                        settings.store.keybindCombo = "";
                        setCombo([]);
                        toast("Keybind cleared");
                    }}
                >
                    Clear
                </Forms.Button>
            </div>

            {recording && (
                <Forms.FormText>
                    Holding: <Text strong>{pretty || "..."}</Text>
                </Forms.FormText>
            )}
        </Forms.FormSection>
    );
}

/* =======================
   FORCE VOICE STATES
======================= */

function setSelfDeaf(target: boolean) {
    const setter = (SelfVoice as any)?.setSelfDeaf;
    if (typeof setter === "function") return setter(target);

    const current = MediaEngine?.isSelfDeaf?.();
    if (typeof current === "boolean" && current !== target) {
        SelfVoice?.toggleSelfDeaf?.();
    }
}

function setSelfMute(target: boolean) {
    const setter = (SelfVoice as any)?.setSelfMute;
    if (typeof setter === "function") return setter(target);

    const current = MediaEngine?.isSelfMute?.();
    if (typeof current === "boolean" && current !== target) {
        SelfVoice?.toggleSelfMute?.();
    }
}

/* =======================
   TOGGLE FD
======================= */

function toggleFD() {
    const enabling = !fakeD;
    fakeD = enabling;

    if (enabling) {
        setSelfDeaf(true);
        if (settings.store.muteUponFakeDeafen) {
            setTimeout(() => setSelfMute(true), 120);
        }
        toast("FD Enabled", Toasts.Type.SUCCESS);
    } else {
        setSelfDeaf(false);
        toast("FD Disabled (undeafened)", Toasts.Type.SUCCESS);
    }
}

/* =======================
   PLUGIN EXPORT
======================= */

export default definePlugin({
    name: "P8ML-FD2",
    description: "Fake Deafen (single keybind, up to 3 keys)",
    authors: [{ name: "P8ML", id: 787773416719384587n }],

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace:
                    "self_mute:$self.toggle($1,'mute'),self_deaf:$self.toggle($2,'deaf'),self_video:$self.toggle($3,'video')"
            }
        }
    ],

    settings,

    toggle(v: any, what: string) {
        if (!fakeD) return v;
        if (what === "mute") return settings.store.mute;
        if (what === "deaf") return settings.store.deafen;
        if (what === "video") return settings.store.cam;
        return v;
    },

    start() {
        const pressed = new Set<string>();
        let fired = false;

        const onKeyDown = (e: KeyboardEvent) => {
            if (!settings.store.keybindEnabled) return;
            if (settings.store.disableWhileTyping && isTypingTarget(e.target)) return;

            pressed.add(e.code);
            const combo = parseCombo(settings.store.keybindCombo);

            if (matchesCombo(pressed, combo) && !fired) {
                fired = true;
                toggleFD();
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            pressed.delete(e.code);
            if (parseCombo(settings.store.keybindCombo).includes(e.code)) {
                fired = false;
            }
        };

        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("keyup", onKeyUp, true);

        (this as any)._cleanup = () => {
            window.removeEventListener("keydown", onKeyDown, true);
            window.removeEventListener("keyup", onKeyUp, true);
        };

        toast("P8ML-FD loaded");
    },

    stop() {
        (this as any)._cleanup?.();

        if (fakeD) {
            fakeD = false;
            setSelfDeaf(false);
        }

        toast("P8ML-FD unloaded");
    }
});
