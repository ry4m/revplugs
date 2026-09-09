import { findByProps } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";

const MessageActions = findByProps("sendMessage", "editMessage");
const Forms = findByProps("FormSwitch", "FormRow");

const IS_VOICE_MESSAGE_FLAG = 8192;

storage.voiceModeEnabled ??= false;
storage.fakeDurationSecs ??= 5;

function buildFakeWaveform(points = 100): string {
    const bytes = new Uint8Array(points);
    for (let i = 0; i < points; i++) {
        bytes[i] = Math.floor(128 + 100 * Math.sin(i / 4));
    }
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
}

let unpatch: (() => void) | null = null;

export default {
    onLoad() {
        unpatch = before("sendMessage", MessageActions, (args: any[]) => {
            if (!storage.voiceModeEnabled) return;

            const message = args.find(
                (a) => a && typeof a === "object" && Array.isArray(a.attachments)
            );

            if (!message || message.attachments.length !== 1) {
                showToast(
                    "Voice mode is on, but the message needs exactly one attachment and no text."
                );
                return;
            }

            const attachment = message.attachments[0];

            message.content = "";
            attachment.filename = "voice-message.ogg";
            attachment.content_type = "audio/ogg";
            attachment.waveform = buildFakeWaveform();
            attachment.duration_secs = Number(storage.fakeDurationSecs) || 5;
            message.flags = (message.flags || 0) | IS_VOICE_MESSAGE_FLAG;

            storage.voiceModeEnabled = false;
            showToast("Sending as a voice message...");
        });
    },

    onUnload() {
        unpatch?.();
    },

    settings: () => {
        if (!Forms?.FormSwitch || !Forms?.FormRow) return null;

        return React.createElement(
            React.Fragment,
            null,
            React.createElement(Forms.FormRow, {
                label: "Convert next attachment to Voice Message",
                subLabel:
                    "Turns off automatically after one send. Attach any audio file normally, then hit send.",
                trailing: React.createElement(Forms.FormSwitch, {
                    value: storage.voiceModeEnabled,
                    onValueChange: (v: boolean) => {
                        storage.voiceModeEnabled = v;
                    }
                })
            })
        );
    }
};
