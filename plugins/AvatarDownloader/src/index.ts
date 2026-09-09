import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { React } from "@vendetta/metro/common";
import { findInReactTree } from "@vendetta/utils";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";

const ActionSheet = findByProps("openLazy", "hideActionSheet");
const { ActionSheetRow } = findByProps("ActionSheetRow");

const RNFS =
    findByProps("downloadFile", "DocumentDirectoryPath") ??
    findByProps("downloadFile", "CachesDirectoryPath");

const CameraRoll = findByProps("save", "getPhotos") ?? findByProps("saveToCameraRoll");

const DownloadIcon =
    getAssetIDByName("ic_download") ??
    getAssetIDByName("DownloadIcon") ??
    getAssetIDByName("ic_file_download");

let unpatches: (() => void)[] = [];

function getAvatarURL(author: any): string | null {
    if (!author) return null;

    if (typeof author.getAvatarURL === "function") {
        try {
            return author.getAvatarURL(false, 512, true); // no-animation-restriction, size, canAnimate
        } catch {
        	
        }
    }

    if (author.avatar && author.id) {
        const ext = author.avatar.startsWith("a_") ? "gif" : "png";
        return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.${ext}?size=512`;
    }

    return null;
}

async function downloadAvatar(url: string, username: string) {
    if (!RNFS) {
        showToast("Couldn't find a file system module to download with.");
        console.error("[DownloadUserAvatar] No RNFS-like module found.");
        return;
    }

    const ext = url.includes(".gif") ? "gif" : "png";
    const fileName = `${username}_avatar_${Date.now()}.${ext}`;
    const destPath = `${RNFS.CachesDirectoryPath ?? RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
        const { promise } = RNFS.downloadFile({
            fromUrl: url,
            toFile: destPath
        });

        await promise;

        if (CameraRoll?.save) {
            await CameraRoll.save(`file://${destPath}`, { type: "photo" });
            showToast(`Saved ${username}'s avatar to your gallery.`);
        } else {
            showToast(`Downloaded ${username}'s avatar to app storage.`);
        }
    } catch (e) {
        console.error("[DownloadUserAvatar] Download failed:", e);
        showToast("Failed to download avatar.");
    }
}

export default {
    onLoad() {
        const unpatchOpenLazy = before(
            "openLazy",
            ActionSheet,
            ([comp, args, msg]) => {
                if (args !== "MessageLongPressActionSheet" || !msg?.message) {
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
                                (c: any) => c?.props?.label === "Download Avatar"
                            );
                            if (alreadyExists) return;

                            const downloadButton = React.createElement(
                                ActionSheetRow,
                                {
                                    label: "Download Avatar",
                                    icon: React.createElement(
                                        ActionSheetRow.Icon,
                                        { source: DownloadIcon }
                                    ),
                                    onPress: () => {
                                        const author =
                                            instance.__currentActiveMessage?.author;
                                        const url = getAvatarURL(author);

                                        ActionSheet.hideActionSheet();

                                        if (!url) {
                                            showToast("Couldn't resolve an avatar URL.");
                                            return;
                                        }

                                        setTimeout(() => {
                                            downloadAvatar(
                                                url,
                                                author?.username ?? "user"
                                            );
                                        }, 100);
                                    }
                                }
                            );

                            if (groups?.unshift) {
                                groups.unshift(
                                    React.createElement(
                                        ActionSheetRow.Group,
                                        null,
                                        downloadButton
                                    )
                                );
                            } else {
                                console.log(
                                    "[DownloadUserAvatar] Could not insert button - skipping"
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
