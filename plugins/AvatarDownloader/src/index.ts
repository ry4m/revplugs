import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { React } from "@vendetta/metro/common";
import { findInReactTree } from "@vendetta/utils";
import { getAssetIDByName } from "@vendetta/ui/assets";

const ActionSheet = findByProps("openLazy", "hideActionSheet");
const { ActionSheetRow } = findByProps("ActionSheetRow");

const ClipboardUtils = findByProps("SUPPORTS_COPY", "copy");
const ToastPresets = findByProps("presentCopiedToClipboard");
const NativeLinking = findByProps("openURL", "canOpenURL");

const DownloadIcon =
    getAssetIDByName("ic_download_24px") ??
    getAssetIDByName("DownloadIcon") ??
    getAssetIDByName("download");

let unpatches: (() => void)[] = [];

function getAvatarUrl(author: any): string | null {
    if (!author?.id) return null;
    if (author.avatar) {
        const isAnimated = author.avatar.startsWith("a_");
        const ext = isAnimated ? "gif" : "png";
        return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.${ext}?size=1024`;
    }
    const defaultIndex = Number((BigInt(author.id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

function handleAvatarDownload(author: any) {
    const avatarUrl = getAvatarUrl(author);
    if (!avatarUrl) return;

    try {
        if (ClipboardUtils?.copy) {
            ClipboardUtils.copy(avatarUrl);
        } else if (ClipboardUtils?.copyToClipboard) {
            ClipboardUtils.copyToClipboard(avatarUrl);
        }
    } catch (e) {
        console.error("[AvatarDownloader] Copy failed:", e);
    }

    if (NativeLinking?.openURL) {
        NativeLinking.openURL(avatarUrl).catch(() => {});
    }

    ToastPresets?.presentCopiedToClipboard?.();
}

export default {
    onLoad() {
        const unpatchOpenLazy = before(
            "openLazy",
            ActionSheet,
            ([comp, args, msg]) => {
                if (
                    args !== "MessageLongPressActionSheet" ||
                    !msg?.message
                ) {
                    return;
                }

                comp.then((instance: any) => {
                    instance.__currentActiveMessage = msg.message;

                    if (instance.__patchedForAvatarDownload) return;
                    instance.__patchedForAvatarDownload = true;

                    const unpatchDefault = after(
                        "default",
                        instance,
                        (_args: any, component: any) => {
                            const groups: any[] = findInReactTree(
                                component,
                                (c: any) =>
                                    Array.isArray(c) &&
                                    c[0]?.type?.name === "ActionSheetRowGroup"
                            );

                            if (!groups?.length) return;

                            const alreadyExists = findInReactTree(
                                component,
                                (c: any) => c?.props?.label === "Save Avatar Link"
                            );
                            if (alreadyExists) return;

                            const avatarButton = React.createElement(
                                ActionSheetRow,
                                {
                                    label: "Save Avatar Link",
                                    icon: React.createElement(
                                        ActionSheetRow.Icon,
                                        { source: DownloadIcon }
                                    ),
                                    onPress: () => {
                                        const currentAuthor =
                                            instance.__currentActiveMessage?.author;

                                        ActionSheet.hideActionSheet();

                                        if (!currentAuthor) return;

                                        setTimeout(() => {
                                            handleAvatarDownload(currentAuthor);
                                        }, 100);
                                    }
                                }
                            );

                            if (groups?.unshift) {
                                groups.unshift(
                                    React.createElement(ActionSheetRow.Group, null, avatarButton)
                                );
                            }
                        }
                    );

                    unpatches.push(unpatchDefault);
                });
            }
        );

        unpatches.push(unpatchOpenLazy);
    },

    onUnload() {
        for (const unpatch of unpatches) {
            unpatch?.();
        }
        unpatches = [];
    }
};
