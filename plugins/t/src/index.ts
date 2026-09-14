import { findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";

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

function tryPatch(propNames: string[]) {
    const mod = findByProps(...propNames);
    if (!mod) return;

    const targetProp = propNames[0];
    if (typeof mod[targetProp] !== "function") return;

    showToast(`Found candidate: ${targetProp}`);

    const unpatch = after(targetProp, mod, (_args: any[], result: any) => {
        if (!storage.previewModeEnabled) return result;

        if (typeof result === "boolean") {
            showToast(`${targetProp} called, returned boolean, forcing true`);
            return true;
        }

        showToast(`${targetProp} called, returned non-boolean: ${JSON.stringify(result).slice(0, 80)}`);
        return result;
    });

    unpatches.push(unpatch);
}

export default {
    onLoad() {
        CANDIDATES.forEach((propNames) => tryPatch(propNames as string[]));

        if (!unpatches.length) {
            showToast("No premium-check function matched any candidate.");
        } else {
            showToast(`Patched ${unpatches.length} premium-check function(s).`);
        }
    },

    onUnload() {
        for (const unpatch of unpatches) {
            unpatch?.();
        }
        unpatches = [];
    }
};
