import Link from "next/link";

import { Button } from "@/components/ui/button";
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
      <section className="mb-4 flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur-[14px] max-[900px]:flex-col max-[900px]:items-stretch">
        <div className="grid gap-1">
          <p className="m-0 text-[1rem] font-bold">Groceries dashboard</p>
          <p className="m-0 text-[0.9rem] leading-[1.5] text-muted-foreground">
            Open the month view with category cards, totals, and repeated-item rollups.
          </p>
        </div>
        <Button asChild variant="secondary" className="border-[var(--border)] bg-[var(--surface-plain)] max-[900px]:w-full">
          <Link href="/groceries">Open groceries view</Link>
        </Button>
      </section>
      <ReceiptWorkspace
        availableModels={dropdownAvailableModels}
        defaultModelId={defaultModelId}
      />
    </main>
  );
};

export default HomePage;
