import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";

const ClipboardUtils = findByProps("SUPPORTS_COPY", "copy") ?? findByProps("copyToClipboard");

storage.previewModeEnabled ??= true;

const CANDIDATES: [string, string?][] = [
    ["isPremium"],
    ["hasPremiumFeature"],
    ["hasNitro"],
    ["hasNitroClassic"],
    ["isPremiumEarlySupporterOrStaff"],
    ["canUsePremiumCustomization"],
    ["useIsPremium"],
    ["usePremiumType", "PremiumType"]
];

let unpatches: (() => void)[] = [];
const matchedNames: string[] = [];
const callLog: string[] = [];

function safeCopy(text: string) {
    try {
        ClipboardUtils?.copy?.(text) ?? ClipboardUtils?.copyToClipboard?.(text);
    } catch {}
}

function tryPatch(propNames: string[]) {
    const mod = findByProps(...propNames);
    if (!mod) return;

    const targetProp = propNames[0];
    if (typeof mod[targetProp] !== "function") return;

    matchedNames.push(targetProp);

    const unpatch = after(targetProp, mod, (_args: any[], result: any) => {
        if (!storage.previewModeEnabled) return result;

        const entry = `${targetProp} -> ${typeof result === "boolean" ? result : JSON.stringify(result)?.slice(0, 60)}`;
        callLog.push(entry);
        safeCopy(callLog.join("\n"));
        showToast(`Called: ${entry}`);

        if (typeof result === "boolean") return true;
        return result;
    });

    unpatches.push(unpatch);
}

export default {
    onLoad() {
        CANDIDATES.forEach((propNames) => tryPatch(propNames as string[]));

        const summary = matchedNames.length
            ? `Matched: ${matchedNames.join(", ")}`
            : "No premium-check function matched any candidate.";

        safeCopy(summary);
        showToast(summary);
    },

    onUnload() {
        for (const unpatch of unpatches) {
            unpatch?.();
        }
        unpatches = [];
        matchedNames.length = 0;
        callLog.length = 0;
    }
};
