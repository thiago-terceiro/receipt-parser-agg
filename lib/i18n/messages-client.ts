import type { GroceryCategory } from "@/lib/receipt";

import type { AppLocale } from "./config";
import type { Metadata } from "next";

const groceryCategoryKeys: readonly GroceryCategory[] = [
  "produce",
  "dairy",
  "bakery",
  "meat",
  "pantry",
  "frozen",
  "beverages",
  "snacks",
  "household",
  "personal-care",
  "other",
];

export type Messages = { metadata: Metadata } & {
  locales: Record<AppLocale, string>;
  common: {
    language: string;
    cancel: string;
  };
  theme: {
    label: string;
    switcherLabel: string;
    system: string;
    light: string;
    dark: string;
  };
  auth: {
    sectionLabel: string;
    title: string;
    connected: string;
    startSession: string;
    setupHint: string;
    signOut: string;
    continueWithGoogle: string;
    continueWithGitHub: string;
    checking: string;
    userAlt: string;
    signedInFallback: string;
    emailFallback: string;
    credentials: {
      buttonLabel: string;
      signInTitle: string;
      signUpTitle: string;
      closeAria: string;
      modeAria: string;
      signInTab: string;
      signUpTab: string;
      quickSelectHint: string;
      fullNameLabel: string;
      fullNamePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      usernameLabel: string;
      usernamePlaceholder: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      passwordSignUpPlaceholder: string;
      confirmPasswordLabel: string;
      confirmPasswordPlaceholder: string;
      switchToSignUp: string;
      switchToSignIn: string;
      submitSignIn: string;
      submitSignUp: string;
      submittingSignIn: string;
      submittingSignUp: string;
      passwordsDoNotMatch: string;
      passwordTooShort: string;
      registrationFailed: string;
      accountCreated: string;
      accountCreatedSignInFailed: string;
      registrationNetworkError: string;
      invalidCredentials: string;
      signInFailed: string;
    };
  };
  home: {
    dashboardTitle: string;
    dashboardDescription: string;
    openGroceriesView: string;
  };
  receipt: {
    eyebrow: string;
    heroTitle: string;
    heroDescription: string;
    fileReady: string;
    dropImage: string;
    replaceHelp: string;
    browseHelp: string;
    removeSelectedImage: string;
    dragAndDrop: string;
    clickToBrowse: string;
    modelLabel: string;
    selectModel: string;
    modelHelp: string;
    extracting: string;
    extractReceipt: string;
    removeImage: string;
    preview: string;
    noFileSelected: string;
    previewAlt: string;
    previewPlaceholder: string;
    pdfPreviewPlaceholder: string;
    extractedItems: string;
    waitingForExtraction: string;
    servedBy: (backend: string) => string;
    lines: (count: number) => string;
    total: (amount: string) => string;
    corrected: (count: number) => string;
    reviewHint: string;
    saveCardTitle: string;
    saveSignedIn: string;
    saveSignedOut: string;
    saving: string;
    saveGroceries: string;
    openDashboard: string;
    openFreshDashboard: string;
    addManualItem: string;
    selectDashboard: string;
    loadingDashboards: string;
    noDashboardsAvailable: string;
    purchaseDate: string;
    resultPlaceholder: string;
    table: {
      item: string;
      category: string;
      quantity: string;
      unit: string;
      total: string;
      adjust: string;
    };
    editor: {
      title: string;
      description: string;
      manualTitle: string;
      manualDescription: string;
      item: string;
      category: string;
      selectCategory: string;
      quantity: string;
      unitPrice: string;
      unitPriceFixed: (price: string) => string;
      reset: string;
      addManual: string;
      apply: string;
      saveManual: string;
    };
    alerts: {
      corrected: string;
      adjust: string;
      manual: string;
      remove: string;
    };
    errors: {
      invalidImage: string;
      noFile: string;
      extractionFailed: string;
      unexpectedRequest: string;
      noResultToSave: string;
      noDashboardSelected: string;
      saveFailed: string;
      unexpectedSave: string;
      loadDashboards: string;
      invalidItemName: string;
      invalidCategory: string;
      invalidQuantity: string;
      invalidUnitPrice: string;
    };
    saveSuccess: (count: number, monthLabel: string) => string;
  };
  groceries: {
    signInTitle: string;
    signInDescription: string;
    backToHome: string;
    eyebrow: string;
    currentMonthView: string;
    historicalMonthView: string;
    heroDescription: string;
    previousMonth: string;
    selectMonth: string;
    nextMonth: string;
    backToUpload: string;
    monthProgress: string;
    dayOf: (currentDay: number, totalDays: number) => string;
    stats: {
      monthTotal: string;
      uniqueItemsTracked: string;
      itemsTracked: string;
      receiptsSaved: string;
      categoriesActive: string;
    };
    recentExtractions: string;
    recentExtractionsDescription: string;
    deleteReceipt: string;
    deleteReceiptTitle: string;
    deleteReceiptDescription: (receiptName: string) => string;
    deleteReceiptConfirm: string;
    deletingReceipt: string;
    deleteReceiptFailed: string;
    untitledReceipt: string;
    emptyTitle: string;
    emptyDescription: (monthLabel: string) => string;
    extractReceipt: string;
    repeatedGroups: (count: number) => string;
    mobileDescription: string;
    units: (count: number) => string;
    uniqueItems: (count: number) => string;
    ofMonth: string;
    table: {
      item: string;
      unitPrice: string;
      amount: string;
      total: string;
    };
    receiptEntries: (count: number) => string;
    boards: {
      sectionLabel: string;
      selectBoard: string;
      createBoard: string;
      createBoardTitle: string;
      createBoardDescription: string;
      createBoardPlaceholder: string;
      createBoardSubmit: string;
      members: string;
      membersTitle: string;
      membersDescription: string;
      membersCount: (count: number) => string;
      noMembers: string;
      invite: string;
      inviteTitle: string;
      inviteDescription: string;
      inviteEmailLabel: string;
      inviteEmailPlaceholder: string;
      createInvite: string;
      inviteLinkLabel: string;
      copyInviteLink: string;
      inviteCreated: string;
      inviteCopied: string;
      roleOwner: string;
      roleEditor: string;
      switching: string;
      switchFailed: string;
      nameRequired: string;
      createFailed: string;
      inviteFailed: string;
      copyFailed: string;
      boardCreated: (name: string) => string;
    };
  };
  categories: Record<GroceryCategory, string>;
  invite: {
    noToken: string;
    signInPrompt: (boardName?: string | null) => string;
    invitedDescription: (boardName?: string | null, role?: string | null) => string;
    acceptedDescription: string;
    redirecting: string;
    boardLabel: string;
    roleLabel: string;
    signedInAs: (email: string) => string;
    emailMismatch: string;
    signOutAnotherAccount: string;
    acceptInvitation: string;
    accepting: string;
    alreadyAccepted: string;
    expired: string;
    goToBoard: string;
    retry: string;
  };
};

type TranslationValues = Record<
  string,
  string | number | boolean | null | undefined
>;

type TranslationFn = (key: string, values?: TranslationValues) => string;

const buildCategoryLabels = (t: TranslationFn) => {
  return Object.fromEntries(
    groceryCategoryKeys.map((category) => [
      category,
      t(`categories.${category}`),
    ]),
  ) as Record<GroceryCategory, string>;
};

export const createMessagesObject = (
  t: TranslationFn,
  _locale: AppLocale,
): Messages => {
  let metadataCache: Messages["metadata"] | undefined;
  let localesCache: Messages["locales"] | undefined;
  let commonCache: Messages["common"] | undefined;
  let themeCache: Messages["theme"] | undefined;
  let authCache: Messages["auth"] | undefined;
  let homeCache: Messages["home"] | undefined;
  let receiptCache: Messages["receipt"] | undefined;
  let groceriesCache: Messages["groceries"] | undefined;
  let categoriesCache: Messages["categories"] | undefined;
  let inviteCache: Messages["invite"] | undefined;

  return {
    get metadata() {
      if (!metadataCache) {
        metadataCache = {
          title: {
            default: t("metadata.title"),
            template: "%s | Receipt Aggregator AI",
          },
          description: t("metadata.description"),
        };
      }
      return metadataCache;
    },
    get locales() {
      if (!localesCache) {
        localesCache = {
          en: t("locales.en"),
          es: t("locales.es"),
          "pt-BR": t("locales.pt-BR"),
        };
      }
      return localesCache;
    },
    get common() {
      if (!commonCache) {
        commonCache = {
          language: t("common.language"),
          cancel: t("common.cancel"),
        };
      }
      return commonCache;
    },
    get theme() {
      if (!themeCache) {
        themeCache = {
          label: t("theme.label"),
          switcherLabel: t("theme.switcherLabel"),
          system: t("theme.system"),
          light: t("theme.light"),
          dark: t("theme.dark"),
        };
      }
      return themeCache;
    },
    get auth() {
      if (!authCache) {
        authCache = {
          sectionLabel: t("auth.sectionLabel"),
          title: t("auth.title"),
          connected: t("auth.connected"),
          startSession: t("auth.startSession"),
          setupHint: t("auth.setupHint"),
          signOut: t("auth.signOut"),
          continueWithGoogle: t("auth.continueWithGoogle"),
          continueWithGitHub: t("auth.continueWithGitHub"),
          checking: t("auth.checking"),
          userAlt: t("auth.userAlt"),
          signedInFallback: t("auth.signedInFallback"),
          emailFallback: t("auth.emailFallback"),
          credentials: {
            buttonLabel: t("auth.credentials.buttonLabel"),
            signInTitle: t("auth.credentials.signInTitle"),
            signUpTitle: t("auth.credentials.signUpTitle"),
            closeAria: t("auth.credentials.closeAria"),
            modeAria: t("auth.credentials.modeAria"),
            signInTab: t("auth.credentials.signInTab"),
            signUpTab: t("auth.credentials.signUpTab"),
            quickSelectHint: t("auth.credentials.quickSelectHint"),
            fullNameLabel: t("auth.credentials.fullNameLabel"),
            fullNamePlaceholder: t("auth.credentials.fullNamePlaceholder"),
            emailLabel: t("auth.credentials.emailLabel"),
            emailPlaceholder: t("auth.credentials.emailPlaceholder"),
            usernameLabel: t("auth.credentials.usernameLabel"),
            usernamePlaceholder: t("auth.credentials.usernamePlaceholder"),
            passwordLabel: t("auth.credentials.passwordLabel"),
            passwordPlaceholder: t("auth.credentials.passwordPlaceholder"),
            passwordSignUpPlaceholder: t(
              "auth.credentials.passwordSignUpPlaceholder",
            ),
            confirmPasswordLabel: t("auth.credentials.confirmPasswordLabel"),
            confirmPasswordPlaceholder: t(
              "auth.credentials.confirmPasswordPlaceholder",
            ),
            switchToSignUp: t("auth.credentials.switchToSignUp"),
            switchToSignIn: t("auth.credentials.switchToSignIn"),
            submitSignIn: t("auth.credentials.submitSignIn"),
            submitSignUp: t("auth.credentials.submitSignUp"),
            submittingSignIn: t("auth.credentials.submittingSignIn"),
            submittingSignUp: t("auth.credentials.submittingSignUp"),
            passwordsDoNotMatch: t("auth.credentials.passwordsDoNotMatch"),
            passwordTooShort: t("auth.credentials.passwordTooShort"),
            registrationFailed: t("auth.credentials.registrationFailed"),
            accountCreated: t("auth.credentials.accountCreated"),
            accountCreatedSignInFailed: t(
              "auth.credentials.accountCreatedSignInFailed",
            ),
            registrationNetworkError: t(
              "auth.credentials.registrationNetworkError",
            ),
            invalidCredentials: t("auth.credentials.invalidCredentials"),
            signInFailed: t("auth.credentials.signInFailed"),
          },
        };
      }
      return authCache;
    },
    get home() {
      if (!homeCache) {
        homeCache = {
          dashboardTitle: t("home.dashboardTitle"),
          dashboardDescription: t("home.dashboardDescription"),
          openGroceriesView: t("home.openGroceriesView"),
        };
      }
      return homeCache;
    },
    get receipt() {
      if (!receiptCache) {
        receiptCache = {
          eyebrow: t("receipt.eyebrow"),
          heroTitle: t("receipt.heroTitle"),
          heroDescription: t("receipt.heroDescription"),
          fileReady: t("receipt.fileReady"),
          dropImage: t("receipt.dropImage"),
          replaceHelp: t("receipt.replaceHelp"),
          browseHelp: t("receipt.browseHelp"),
          removeSelectedImage: t("receipt.removeSelectedImage"),
          dragAndDrop: t("receipt.dragAndDrop"),
          clickToBrowse: t("receipt.clickToBrowse"),
          modelLabel: t("receipt.modelLabel"),
          selectModel: t("receipt.selectModel"),
          modelHelp: t("receipt.modelHelp"),
          extracting: t("receipt.extracting"),
          extractReceipt: t("receipt.extractReceipt"),
          removeImage: t("receipt.removeImage"),
          preview: t("receipt.preview"),
          noFileSelected: t("receipt.noFileSelected"),
          previewAlt: t("receipt.previewAlt"),
          previewPlaceholder: t("receipt.previewPlaceholder"),
          pdfPreviewPlaceholder: t("receipt.pdfPreviewPlaceholder"),
          extractedItems: t("receipt.extractedItems"),
          waitingForExtraction: t("receipt.waitingForExtraction"),
          servedBy: (backend) => t("receipt.servedBy", { backend }),
          lines: (count) => t("receipt.lines", { count }),
          total: (amount) => t("receipt.total", { amount }),
          corrected: (count) => t("receipt.corrected", { count }),
          reviewHint: t("receipt.reviewHint"),
          saveCardTitle: t("receipt.saveCardTitle"),
          saveSignedIn: t("receipt.saveSignedIn"),
          saveSignedOut: t("receipt.saveSignedOut"),
          saving: t("receipt.saving"),
          saveGroceries: t("receipt.saveGroceries"),
          openDashboard: t("receipt.openDashboard"),
          openFreshDashboard: t("receipt.openFreshDashboard"),
          addManualItem: t("receipt.addManualItem"),
          selectDashboard: t("receipt.selectDashboard"),
          loadingDashboards: t("receipt.loadingDashboards"),
          noDashboardsAvailable: t("receipt.noDashboardsAvailable"),
          purchaseDate: t("receipt.purchaseDate"),
          resultPlaceholder: t("receipt.resultPlaceholder"),
          table: {
            item: t("receipt.table.item"),
            category: t("receipt.table.category"),
            quantity: t("receipt.table.quantity"),
            unit: t("receipt.table.unit"),
            total: t("receipt.table.total"),
            adjust: t("receipt.table.adjust"),
          },
          editor: {
            title: t("receipt.editor.title"),
            description: t("receipt.editor.description"),
            manualTitle: t("receipt.editor.manualTitle"),
            manualDescription: t("receipt.editor.manualDescription"),
            item: t("receipt.editor.item"),
            category: t("receipt.editor.category"),
            selectCategory: t("receipt.editor.selectCategory"),
            quantity: t("receipt.editor.quantity"),
            unitPrice: t("receipt.editor.unitPrice"),
            unitPriceFixed: (price) =>
              t("receipt.editor.unitPriceFixed", { price }),
            reset: t("receipt.editor.reset"),
            addManual: t("receipt.editor.addManual"),
            apply: t("receipt.editor.apply"),
            saveManual: t("receipt.editor.saveManual"),
          },
          alerts: {
            corrected: t("receipt.alerts.corrected"),
            adjust: t("receipt.alerts.adjust"),
            manual: t("receipt.alerts.manual"),
            remove: t("receipt.alerts.remove"),
          },
          errors: {
            invalidImage: t("receipt.errors.invalidImage"),
            noFile: t("receipt.errors.noFile"),
            extractionFailed: t("receipt.errors.extractionFailed"),
            unexpectedRequest: t("receipt.errors.unexpectedRequest"),
            noResultToSave: t("receipt.errors.noResultToSave"),
            noDashboardSelected: t("receipt.errors.noDashboardSelected"),
            saveFailed: t("receipt.errors.saveFailed"),
            unexpectedSave: t("receipt.errors.unexpectedSave"),
            loadDashboards: t("receipt.errors.loadDashboards"),
            invalidItemName: t("receipt.errors.invalidItemName"),
            invalidCategory: t("receipt.errors.invalidCategory"),
            invalidQuantity: t("receipt.errors.invalidQuantity"),
            invalidUnitPrice: t("receipt.errors.invalidUnitPrice"),
          },
          saveSuccess: (count, monthLabel) =>
            t("receipt.saveSuccess", { count, monthLabel }),
        };
      }
      return receiptCache;
    },
    get groceries() {
      if (!groceriesCache) {
        groceriesCache = {
          signInTitle: t("groceries.signInTitle"),
          signInDescription: t("groceries.signInDescription"),
          backToHome: t("groceries.backToHome"),
          eyebrow: t("groceries.eyebrow"),
          currentMonthView: t("groceries.currentMonthView"),
          historicalMonthView: t("groceries.historicalMonthView"),
          heroDescription: t("groceries.heroDescription"),
          previousMonth: t("groceries.previousMonth"),
          selectMonth: t("groceries.selectMonth"),
          nextMonth: t("groceries.nextMonth"),
          backToUpload: t("groceries.backToUpload"),
          monthProgress: t("groceries.monthProgress"),
          dayOf: (currentDay, totalDays) =>
            t("groceries.dayOf", { currentDay, totalDays }),
          stats: {
            monthTotal: t("groceries.stats.monthTotal"),
            uniqueItemsTracked: t("groceries.stats.uniqueItemsTracked"),
            itemsTracked: t("groceries.stats.itemsTracked"),
            receiptsSaved: t("groceries.stats.receiptsSaved"),
            categoriesActive: t("groceries.stats.categoriesActive"),
          },
          recentExtractions: t("groceries.recentExtractions"),
          recentExtractionsDescription: t(
            "groceries.recentExtractionsDescription",
          ),
          deleteReceipt: t("groceries.deleteReceipt"),
          deleteReceiptTitle: t("groceries.deleteReceiptTitle"),
          deleteReceiptDescription: (receiptName) =>
            t("groceries.deleteReceiptDescription", { receiptName }),
          deleteReceiptConfirm: t("groceries.deleteReceiptConfirm"),
          deletingReceipt: t("groceries.deletingReceipt"),
          deleteReceiptFailed: t("groceries.deleteReceiptFailed"),
          untitledReceipt: t("groceries.untitledReceipt"),
          emptyTitle: t("groceries.emptyTitle"),
          emptyDescription: (monthLabel) =>
            t("groceries.emptyDescription", { monthLabel }),
          extractReceipt: t("groceries.extractReceipt"),
          repeatedGroups: (count) => t("groceries.repeatedGroups", { count }),
          mobileDescription: t("groceries.mobileDescription"),
          units: (count) => t("groceries.units", { count }),
          uniqueItems: (count) => t("groceries.uniqueItems", { count }),
          ofMonth: t("groceries.ofMonth"),
          table: {
            item: t("groceries.table.item"),
            unitPrice: t("groceries.table.unitPrice"),
            amount: t("groceries.table.amount"),
            total: t("groceries.table.total"),
          },
          receiptEntries: (count) => t("groceries.receiptEntries", { count }),
          boards: {
            sectionLabel: t("groceries.boards.sectionLabel"),
            selectBoard: t("groceries.boards.selectBoard"),
            createBoard: t("groceries.boards.createBoard"),
            createBoardTitle: t("groceries.boards.createBoardTitle"),
            createBoardDescription: t(
              "groceries.boards.createBoardDescription",
            ),
            createBoardPlaceholder: t(
              "groceries.boards.createBoardPlaceholder",
            ),
            createBoardSubmit: t("groceries.boards.createBoardSubmit"),
            members: t("groceries.boards.members"),
            membersTitle: t("groceries.boards.membersTitle"),
            membersDescription: t("groceries.boards.membersDescription"),
            membersCount: (count) =>
              t("groceries.boards.membersCount", { count }),
            noMembers: t("groceries.boards.noMembers"),
            invite: t("groceries.boards.invite"),
            inviteTitle: t("groceries.boards.inviteTitle"),
            inviteDescription: t("groceries.boards.inviteDescription"),
            inviteEmailLabel: t("groceries.boards.inviteEmailLabel"),
            inviteEmailPlaceholder: t(
              "groceries.boards.inviteEmailPlaceholder",
            ),
            createInvite: t("groceries.boards.createInvite"),
            inviteLinkLabel: t("groceries.boards.inviteLinkLabel"),
            copyInviteLink: t("groceries.boards.copyInviteLink"),
            inviteCreated: t("groceries.boards.inviteCreated"),
            inviteCopied: t("groceries.boards.inviteCopied"),
            roleOwner: t("groceries.boards.roleOwner"),
            roleEditor: t("groceries.boards.roleEditor"),
            switching: t("groceries.boards.switching"),
            switchFailed: t("groceries.boards.switchFailed"),
            nameRequired: t("groceries.boards.nameRequired"),
            createFailed: t("groceries.boards.createFailed"),
            inviteFailed: t("groceries.boards.inviteFailed"),
            copyFailed: t("groceries.boards.copyFailed"),
            boardCreated: (name) =>
              t("groceries.boards.boardCreated", { name }),
          },
        };
      }
      return groceriesCache;
    },
    get categories() {
      if (!categoriesCache) {
        categoriesCache = buildCategoryLabels(t);
      }
      return categoriesCache;
    },
    get invite() {
      if (!inviteCache) {
        inviteCache = {
          noToken: t("invite.noToken"),
          signInPrompt: (boardName) =>
            boardName
              ? t("invite.signInPromptWithName", { boardName })
              : t("invite.signInPrompt"),
          invitedDescription: (boardName, role) =>
            boardName
              ? t("invite.invitedDescriptionWithName", {
                  boardName,
                  role: role ? ` (${role})` : "",
                })
              : t("invite.invitedDescription"),
          acceptedDescription: t("invite.acceptedDescription"),
          redirecting: t("invite.redirecting"),
          boardLabel: t("invite.boardLabel"),
          roleLabel: t("invite.roleLabel"),
          signedInAs: (email) => t("invite.signedInAs", { email }),
          emailMismatch: t("invite.emailMismatch"),
          signOutAnotherAccount: t("invite.signOutAnotherAccount"),
          acceptInvitation: t("invite.acceptInvitation"),
          accepting: t("invite.accepting"),
          alreadyAccepted: t("invite.alreadyAccepted"),
          expired: t("invite.expired"),
          goToBoard: t("invite.goToBoard"),
          retry: t("invite.retry"),
        };
      }
      return inviteCache;
    },
  };
};
