import { defaultModelId, dropdownAvailableModels } from "../lib/receipt";
import { GoogleAuthControls } from "./google-auth-controls";
import { ReceiptWorkspace } from "./receipt-workspace";

const HomePage = () => {
  const hasGoogleAuthConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <main className="page-shell">
      <GoogleAuthControls canUseGoogleAuth={hasGoogleAuthConfigured} />
      <ReceiptWorkspace
        availableModels={dropdownAvailableModels}
        defaultModelId={defaultModelId}
      />
    </main>
  );
};

export default HomePage;
