// inspired from fshinz's copy user id, huge thank youu to them, this plugin used to work on vendetta so i just optimized it to work on revenge
import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { React } from "@vendetta/metro/common";
import { findInReactTree } from "@vendetta/utils";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";

const ActionSheet = findByProps("openLazy", "hideActionSheet");
const { ActionSheetRow } = findByProps("ActionSheetRow");

const Linking = findByProps("openURL", "canOpenURL");

const RNFS =
    findByProps("downloadFile", "DocumentDirectoryPath") ??
    findByProps("downloadFile", "CachesDirectoryPath") ??
    findByProps("downloadFile");

const CameraRoll =
    findByProps("save", "getPhotos") ??
    findByProps("saveToCameraRoll") ??
    findByProps("saveAsync") ??
    findByProps("saveImageToGallery");

const MediaManager =
    findByProps("downloadMedia") ??
    findByProps("saveFileToGallery") ??
    findByProps("saveImage");

const DownloadIcon =
    getAssetIDByName("ic_download") ??
    getAssetIDByName("DownloadIcon") ??
    getAssetIDByName("ic_file_download"

let unpatches: (() => void)[] = [];

function getAvatarURL(author: any): string | null {
    if (!author) return null;

    if (typeof author.getAvatarURL === "function") {
        try {
            return author.getAvatarURL(false, 512, true);
        } catch {}
    }

    if (author.avatar && author.id) {
        const ext = author.avatar.startsWith("a_") ? "gif" : "png";
        return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.${ext}?size=512`;
    }

    return null;
}

async function tryCameraRoll(url: string): Promise<boolean> {
    if (!CameraRoll) return false;

    try {
        if (typeof CameraRoll.save === "function") {
            await CameraRoll.save(url, { type: "photo" });
            return true;
        }
        if (typeof CameraRoll.saveToCameraRoll === "function") {
            await CameraRoll.saveToCameraRoll(url, "photo");
            return true;
        }
        if (typeof CameraRoll.saveAsync === "function") {
            await CameraRoll.saveAsync(url);
            return true;
        }
        if (typeof CameraRoll.saveImageToGallery === "function") {
            await CameraRoll.saveImageToGallery(url);
            return true;
        }
    } catch (e) {
        console.error("[DownloadUserAvatar] CameraRoll attempt failed:", e);
    }

    return false;
}

async function tryMediaManager(url: string, fileName: string): Promise<boolean> {
    if (!MediaManager) return false;

    try {
        if (typeof MediaManager.downloadMedia === "function") {
            await MediaManager.downloadMedia(url, fileName);
            return true;
        }
        if (typeof MediaManager.saveFileToGallery === "function") {
            await MediaManager.saveFileToGallery(url, fileName);
            return true;
        }
        if (typeof MediaManager.saveImage === "function") {
            await MediaManager.saveImage(url);
            return true;
        }
    } catch (e) {
        console.error("[DownloadUserAvatar] MediaManager attempt failed:", e);
    }

    return false;
}

async function tryRNFS(url: string, fileName: string): Promise<boolean> {
    if (!RNFS || typeof RNFS.downloadFile !== "function") return false;

    const baseDir =
        RNFS.CachesDirectoryPath ??
        RNFS.DocumentDirectoryPath ??
        RNFS.TemporaryDirectoryPath;

    if (!baseDir) return false;

    const destPath = `${baseDir}/${fileName}`;

    try {
        const result = RNFS.downloadFile({ fromUrl: url, toFile: destPath });
        const promise = result?.promise ?? result;
        await promise;

        const saved = await tryCameraRoll(`file://${destPath}`);
        if (!saved) {
            showToast(`Downloaded to app storage: ${destPath}`);
        }
        return true;
    } catch (e) {
        console.error("[DownloadUserAvatar] RNFS attempt failed:", e);
        return false;
    }
}

async function downloadAvatar(url: string, username: string) {
    const ext = url.includes(".gif") ? "gif" : "png";
    const fileName = `${username}_avatar_${Date.now()}.${ext}`;

    if (await tryCameraRoll(url)) {
        showToast(`Saved ${username}'s avatar to your gallery.`);
        return;
    }

    if (await tryMediaManager(url, fileName)) {
        showToast(`Saved ${username}'s avatar.`);
        return;
    }

    if (await tryRNFS(url, fileName)) {
        showToast(`Saved ${username}'s avatar.`);
        return;
    }

    if (Linking?.openURL) {
        showToast("No download module found, opening in browser instead.");
        Linking.openURL(url);
        return;
    }

    showToast("Couldn't find any way to download or open the avatar.");
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
            
