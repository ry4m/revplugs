import { React, ReactNative as RN } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { rawColors, semanticColors } from "@vendetta/ui";
import { showToast } from "@vendetta/ui/toasts";

const { TouchableOpacity, Image } = RN;

const uploadModule = findByProps("uploadFiles", "uploadLocalFiles");
const SelectedChannelStore = findByProps("getChannelId", "getVoiceChannelId");

function sc(key: string): string {
  const sym = (semanticColors as any)?.[key];
  return typeof sym === "string" ? sym : "#DBDCDD";
}

export default function VoiceButton() {
  const handleSendVoice = () => {
    const channelId = SelectedChannelStore?.getChannelId();
    if (!channelId) {
      showToast("No active channel found!");
      return;
    }

    const defaultWaveform = "AAAAAAYGBg4ODh4eHj4+PkBAQEhISEpKSk5OTlBCQkJAMzMz";
    const voiceFlag = 1 << 13;

    const filePayload = {
      filename: "voice-message.ogg",
      name: "voice-message.ogg",
      mimeType: "audio/ogg",
      waveform: defaultWaveform,
      duration_secs: 3.0,
      item: {
        filename: "voice-message.ogg",
        name: "voice-message.ogg",
        mimeType: "audio/ogg",
        waveform: defaultWaveform,
        duration_secs: 3.0
      }
    };

    if (uploadModule?.uploadFiles) {
      uploadModule.uploadFiles({
        channelId: channelId,
        uploads: [filePayload],
        parsedMessage: {
          flags: voiceFlag
        }
      });
      showToast("Sent Voice Message!");
    } else {
      showToast("Upload module not available!");
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSendVoice}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <Image
        source={{ uri: "https://raw.githubusercontent.com/vendetta-mod/assets/main/icons/ic_mic_24px.png" }}
        style={{
          width: 22,
          height: 22,
          tintColor: rawColors.BRAND_500 || sc("interactive-normal")
        }}
      />
    </TouchableOpacity>
  );
}

