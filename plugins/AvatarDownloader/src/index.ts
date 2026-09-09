import { patcher } from "@vendetta";
import { findByProps } from "@vendetta/metro";
import React from "react";
import DownloadAvatarButton from "./components/DownloadAvatarButton";

const ProfileActions = findByProps("openUserProfileModal", "openUserProfile") ?? findByProps("showUserProfile");
const UserProfileModal = findByProps("UserProfileModal") ?? findByProps("default", "UserProfile");

let unpatches: Function[] = [];

export default {
  onLoad: () => {
    if (UserProfileModal) {
      const patch = patcher.after("default", UserProfileModal, (args, ret) => {
        try {
          const user = args[0]?.user;
          if (!user) return ret;

          const children = ret?.props?.children;
          if (Array.isArray(children)) {
            children.push(React.createElement(DownloadAvatarButton, { user }));
          }
        } catch {}
        return ret;
      });

      unpatches.push(patch);
    }
  },

  onUnload: () => {
    for (const unpatch of unpatches) {
      unpatch();
    }
    unpatches = [];
  }
};
