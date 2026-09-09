import { React, ReactNative as RN } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { showToast } from "@vendetta/ui/toasts";

const { TouchableOpacity, Text } = RN;

const TableRow = findByProps("TableRow")?.TableRow ?? findByProps("FormRow")?.FormRow;
const MediaManager = findByProps("downloadMedia", "saveToCameraRoll") ?? findByProps("saveVideo");

interface Props {
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

export default function DownloadAvatarButton({ user }: Props) {
  if (!user || !user.avatar) return null;

  const handleDownload = async () => {
    const isAnimated = user.avatar.startsWith("a_");
    const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${isAnimated ? "gif" : "png"}?size=4096`;

    try {
      if (MediaManager?.saveToCameraRoll) {
        await MediaManager.saveToCameraRoll(avatarUrl, "photo");
        showToast("Avatar saved to Camera Roll!");
      } else if (MediaManager?.downloadMedia) {
        await MediaManager.downloadMedia(avatarUrl);
        showToast("Downloading avatar...");
      } else {
        RN.Linking.openURL(avatarUrl);
        showToast("Opening avatar in browser...");
      }
    } catch (err) {
      showToast("Failed to save avatar!");
    }
  };

  if (TableRow) {
    return (
      <TableRow
        label="Save Avatar"
        subLabel="Download full-resolution avatar"
        onPress={handleDownload}
        arrow
      />
    );
  }

  return (
    <TouchableOpacity
      onPress={handleDownload}
      style={{
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 8,
        backgroundColor: "#5865F2",
        alignItems: "center"
      }}
    >
      <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Save High-Res Avatar</Text>
    </TouchableOpacity>
  );
}
