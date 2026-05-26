import "i18next";

import type common from "./resources/en/common.json";
import type welcome from "./resources/en/welcome.json";
import type newGoal from "./resources/en/newGoal.json";
import type settings from "./resources/en/settings.json";
import type goals from "./resources/en/goals.json";
import type focusMode from "./resources/en/focusMode.json";
import type capturePhoto from "./resources/en/capturePhoto.json";
import type captureVideo from "./resources/en/captureVideo.json";
import type captureVoice from "./resources/en/captureVoice.json";
import type captureText from "./resources/en/captureText.json";
import type captureFile from "./resources/en/captureFile.json";
import type captureLink from "./resources/en/captureLink.json";
import type permissions from "./resources/en/permissions.json";
import type badges from "./resources/en/badges.json";
import type badgeDesigner from "./resources/en/badgeDesigner.json";
import type editGoal from "./resources/en/editGoal.json";
import type timelineJourney from "./resources/en/timelineJourney.json";
import type completion from "./resources/en/completion.json";
import type badgeDetail from "./resources/en/badgeDetail.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      welcome: typeof welcome;
      newGoal: typeof newGoal;
      settings: typeof settings;
      goals: typeof goals;
      focusMode: typeof focusMode;
      capturePhoto: typeof capturePhoto;
      captureVideo: typeof captureVideo;
      captureVoice: typeof captureVoice;
      captureText: typeof captureText;
      captureFile: typeof captureFile;
      captureLink: typeof captureLink;
      permissions: typeof permissions;
      badges: typeof badges;
      badgeDesigner: typeof badgeDesigner;
      editGoal: typeof editGoal;
      timelineJourney: typeof timelineJourney;
      completion: typeof completion;
      badgeDetail: typeof badgeDetail;
    };
  }
}
