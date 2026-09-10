import { findByProps } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";

const MessageActions = findByProps("sendMessage", "editMessage");

const IS_VOICE_MESSAGE_FLAG = 8192;
const TRIGGER_FILENAME = "voice-message.ogg";

function findAttachmentsArray(args: any[]): any[] | null {
    for (const arg of args) {
        if (arg && Array.isArray(arg.attachments)) {
            return arg.attachments;
        }
        if (Array.isArray(arg)) {
            for (const item of arg) {
                if (Array.isArray(item?.attachments)) return item.attachments;
            }
        }
    }
    return null;
}

let unpatch: (() => void) | null = null;

export default {
    onLoad() {
        unpatch = before("sendMessage", MessageActions, (args: any[]) => {
            const attachments = findAttachmentsArray(args);
            if (!attachments?.length) return;

            const target = attachments.find(
                (a) => a?.filename?.toLowerCase() === TRIGGER_FILENAME
            );
            if (!target) return;

            const message = args.find(
                (a) => a && typeof a === "object" && "flags" in a
            ) ?? args.find((a) => a && Array.isArray(a?.attachments));

            if (message) {
                message.content = "";
                message.flags = (message.flags || 0) | IS_VOICE_MESSAGE_FLAG;
            }

            target.content_type = "audio/ogg";
            target.waveform = "=";
            target.duration_secs = target.duration_secs || 5;

            showToast("Sending as a voice message...");
        });
    },

    onUnload() {
        unpatch?.();
    }
};
