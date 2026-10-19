"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GroceryCategorySummary } from "@/lib/groceries";
import type { Messages } from "@/lib/i18n/messages";
import { formatCategoryLabel } from "@/lib/receipt";

import { CategorySummaryCard, MemoizedCategoryDetails } from "./GroceriesDashboardParts";

type GroceriesDashboardCategoriesSectionProps = {
  categories: GroceryCategorySummary[];
  activeCategory: string | null;
  active: GroceryCategorySummary | null;
  activeCategoryLabel: string | null;
  isMobileDetailOpen: boolean;
  translations: Messages;
  currencyFormatter: Intl.NumberFormat;
  percentFormatter: Intl.NumberFormat;
  onSelectCategory: (category: GroceryCategorySummary) => void;
  onMobileDialogOpenChange: (open: boolean) => void;
};

export const GroceriesDashboardCategoriesSection = ({
  categories,
  activeCategory,
  active,
  activeCategoryLabel,
  isMobileDetailOpen,
  translations,
  currencyFormatter,
  percentFormatter,
  onSelectCategory,
  onMobileDialogOpenChange,
}: GroceriesDashboardCategoriesSectionProps) => {
  return (
    <>
      <LayoutGroup>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
          <motion.div layout className="grid h-fit gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <CategorySummaryCard
                key={category.category}
                category={category}
                isActive={activeCategory === category.category}
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
                onSelect={onSelectCategory}
              />
            ))}
          </motion.div>

          <div className="hidden lg:block">
            <AnimatePresence mode="wait" initial={false}>
              {active ? (
                <motion.div
                  key={active.category}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="sticky top-6"
                >
                  <Card className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-strong)] py-0 shadow-[var(--shadow)] backdrop-blur-[20px]">
                    <CardContent className="p-6">
                      <MemoizedCategoryDetails
                        category={active}
                        categoryLabel={activeCategoryLabel ?? ""}
                        translations={translations}
                        currencyFormatter={currencyFormatter}
                        percentFormatter={percentFormatter}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      </LayoutGroup>

      <Dialog open={isMobileDetailOpen} onOpenChange={onMobileDialogOpenChange}>
        <DialogContent className="lg:hidden">
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formatCategoryLabel(active.category, translations.categories)}
                </DialogTitle>
                <DialogDescription>
                  {translations.groceries.mobileDescription}
                </DialogDescription>
              </DialogHeader>
              <MemoizedCategoryDetails
                category={active}
                categoryLabel={activeCategoryLabel ?? ""}
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
                className="mt-4"
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};