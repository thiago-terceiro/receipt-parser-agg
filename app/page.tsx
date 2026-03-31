import { defaultModelId, dropdownAvailableModels } from "../lib/receipt";
import { GoogleAuthControls } from "./google-auth-controls";
import { ReceiptWorkspace } from "./receipt-workspace";

const HomePage = () => {
  const hasGoogleAuthConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <main className="mx-auto w-[min(1180px,calc(100vw-32px))] px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1180px)] max-[900px]:pt-5">
      <GoogleAuthControls canUseGoogleAuth={hasGoogleAuthConfigured} />
      <ReceiptWorkspace
        availableModels={dropdownAvailableModels}
        defaultModelId={defaultModelId}
      />
    </main>
  );
};

export default HomePage;
