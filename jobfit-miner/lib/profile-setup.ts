type ProfileSetupStateInput = {
  hasSavedProfile: boolean;
  loadingProfile: boolean;
  hasSelectedFile: boolean;
  sourceName?: string | null;
};

type ProfileSetupState = {
  showUploader: boolean;
  statusText: string;
  actionLabel: string | null;
  disableAction: boolean;
};

export function getProfileSetupState(
  input: ProfileSetupStateInput,
): ProfileSetupState {
  if (input.hasSavedProfile) {
    const sourceDetail = input.sourceName ? ` from ${input.sourceName}` : "";

    return {
      showUploader: false,
      statusText: `Using saved summary${sourceDetail}. You can mine jobs again without uploading your CV.`,
      actionLabel: null,
      disableAction: true,
    };
  }

  return {
    showUploader: true,
    statusText: "Upload your CV once. The file is read, summarized, and not stored.",
    actionLabel: input.loadingProfile ? "Reading CV..." : "Upload CV",
    disableAction: input.loadingProfile || !input.hasSelectedFile,
  };
}
