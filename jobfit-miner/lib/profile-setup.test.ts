import test from "node:test";
import assert from "node:assert/strict";

import { getProfileSetupState } from "./profile-setup.ts";

test("getProfileSetupState shows the uploader during first-time setup", () => {
  const state = getProfileSetupState({
    hasSavedProfile: false,
    loadingProfile: false,
    hasSelectedFile: false,
  });

  assert.equal(state.showUploader, true);
  assert.equal(state.statusText, "Upload your CV once. The file is read, summarized, and not stored.");
  assert.equal(state.actionLabel, "Upload CV");
  assert.equal(state.disableAction, true);
});

test("getProfileSetupState hides the uploader after the CV profile has been saved", () => {
  const state = getProfileSetupState({
    hasSavedProfile: true,
    loadingProfile: false,
    hasSelectedFile: false,
    sourceName: "resume.pdf",
  });

  assert.equal(state.showUploader, false);
  assert.equal(state.statusText, "Using saved summary from resume.pdf. You can mine jobs again without uploading your CV.");
  assert.equal(state.actionLabel, null);
  assert.equal(state.disableAction, true);
});
