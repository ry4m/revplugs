import { patcher } from "@vendetta";
import { findByProps, findByName } from "@vendetta/metro";
import React from "react";
import VoiceButton from "./components/VoiceButton";

const uploadModule = findByProps("uploadFiles", "uploadLocalFiles");
const ChatInput = findByProps("ChatInput") || findByName("ChatInput");

let unpatches: Function[] = [];

const DEFAULT_WAVEFORM = "AAAAAAYGBg4ODh4eHj4+PkBAQEhISEpKSk5OTlBCQkJAMzMz";
const VOICE_MESSAGE_FLAG = 1 << 13;

export default {
  onLoad: () => {
    if (uploadModule) {
      const uploadPatch = patcher.before("uploadFiles", uploadModule, (args) => {
        const [uploadData] = args;
        if (!uploadData || !uploadData.uploads) return;

        let isVoice = false;

        for (const file of uploadData.uploads) {
          const filename = file.filename || file.name || file.item?.filename;

          if (filename && filename.toLowerCase() === "voice-message.ogg") {
            isVoice = true;

            file.mimeType = "audio/ogg";
            file.waveform = file.waveform || DEFAULT_WAVEFORM;
            file.duration_secs = file.duration_secs || 3.0;

            if (file.item) {
              file.item.mimeType = "audio/ogg";
              file.item.waveform = file.item.waveform || DEFAULT_WAVEFORM;
              file.item.duration_secs = file.item.duration_secs || 3.0;
            }
          }
        }

        if (isVoice && uploadData.parsedMessage) {
          uploadData.parsedMessage.flags = (uploadData.parsedMessage.flags || 0) | VOICE_MESSAGE_FLAG;
        }
      });

      unpatches.push(uploadPatch);
    }

    if (ChatInput) {
      const chatPatch = patcher.after("render", ChatInput.prototype, (_, ret) => {
        try {
          const children = ret?.props?.children;
          if (Array.isArray(children)) {
            children.push(React.createElement(VoiceButton));
          }
        } catch {}
      });

      unpatches.push(chatPatch);
    }
  },

  onUnload: () => {
    for (const unpatch of unpatches) {
      unpatch();
    }
    unpatches = [];
  }
};
