import { getTranslations } from "next-intl/server";

import { metadata } from "@/app/metadata";
import { groceryCategories, type GroceryCategory } from "@/lib/receipt";

import type { Metadata } from "next";
import type { AppLocale } from "./config";

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
    checking: string;
    userAlt: string;
    signedInFallback: string;
    emailFallback: string;
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
      item: string;
      category: string;
      selectCategory: string;
      quantity: string;
      unitPriceFixed: (price: string) => string;
      reset: string;
      apply: string;
    };
    alerts: {
      corrected: string;
      adjust: string;
    };
    errors: {
      invalidImage: string;
      noFile: string;
      extractionFailed: string;
      unexpectedRequest: string;
      noResultToSave: string;
      saveFailed: string;
      unexpectedSave: string;
      invalidCategory: string;
      invalidQuantity: string;
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
      switchFailed: string;
      nameRequired: string;
      createFailed: string;
      inviteFailed: string;
      copyFailed: string;
      boardCreated: (name: string) => string;
    };
  };
  categories: Record<GroceryCategory, string>;
};

type TranslationValues = Record<
  string,
  string | number | boolean | null | undefined
>;

type TranslationFn = (key: string, values?: TranslationValues) => string;

const buildCategoryLabels = (t: TranslationFn) => {
  return Object.fromEntries(
    groceryCategories.map((category) => [
      category,
      t(`categories.${category}`),
    ]),
  ) as Record<GroceryCategory, string>;
};

export const createMessagesObject = (
  t: TranslationFn,
  _locale: AppLocale,
): Messages => {
  return {
    metadata: {
      title: { default: t("metadata.title"), template: "%s | Receipt Aggregator AI", },
      description: t("metadata.description"),
    },
    locales: {
      en: t("locales.en"),
      es: t("locales.es"),
      "pt-BR": t("locales.pt-BR"),
    },
    common: {
      language: t("common.language"),
      cancel: t("common.cancel"),
    },
    theme: {
      label: t("theme.label"),
      switcherLabel: t("theme.switcherLabel"),
      system: t("theme.system"),
      light: t("theme.light"),
      dark: t("theme.dark"),
    },
    auth: {
      sectionLabel: t("auth.sectionLabel"),
      title: t("auth.title"),
      connected: t("auth.connected"),
      startSession: t("auth.startSession"),
      setupHint: t("auth.setupHint"),
      signOut: t("auth.signOut"),
      continueWithGoogle: t("auth.continueWithGoogle"),
      checking: t("auth.checking"),
      userAlt: t("auth.userAlt"),
      signedInFallback: t("auth.signedInFallback"),
      emailFallback: t("auth.emailFallback"),
    },
    home: {
      dashboardTitle: t("home.dashboardTitle"),
      dashboardDescription: t("home.dashboardDescription"),
      openGroceriesView: t("home.openGroceriesView"),
    },
    receipt: {
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
        item: t("receipt.editor.item"),
        category: t("receipt.editor.category"),
        selectCategory: t("receipt.editor.selectCategory"),
        quantity: t("receipt.editor.quantity"),
        unitPriceFixed: (price) =>
          t("receipt.editor.unitPriceFixed", { price }),
        reset: t("receipt.editor.reset"),
        apply: t("receipt.editor.apply"),
      },
      alerts: {
        corrected: t("receipt.alerts.corrected"),
        adjust: t("receipt.alerts.adjust"),
      },
      errors: {
        invalidImage: t("receipt.errors.invalidImage"),
        noFile: t("receipt.errors.noFile"),
        extractionFailed: t("receipt.errors.extractionFailed"),
        unexpectedRequest: t("receipt.errors.unexpectedRequest"),
        noResultToSave: t("receipt.errors.noResultToSave"),
        saveFailed: t("receipt.errors.saveFailed"),
        unexpectedSave: t("receipt.errors.unexpectedSave"),
        invalidCategory: t("receipt.errors.invalidCategory"),
        invalidQuantity: t("receipt.errors.invalidQuantity"),
      },
      saveSuccess: (count, monthLabel) =>
        t("receipt.saveSuccess", { count, monthLabel }),
    },
    groceries: {
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
      recentExtractionsDescription: t("groceries.recentExtractionsDescription"),
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
        createBoardDescription: t("groceries.boards.createBoardDescription"),
        createBoardPlaceholder: t("groceries.boards.createBoardPlaceholder"),
        createBoardSubmit: t("groceries.boards.createBoardSubmit"),
        members: t("groceries.boards.members"),
        membersTitle: t("groceries.boards.membersTitle"),
        membersDescription: t("groceries.boards.membersDescription"),
        membersCount: (count) => t("groceries.boards.membersCount", { count }),
        noMembers: t("groceries.boards.noMembers"),
        invite: t("groceries.boards.invite"),
        inviteTitle: t("groceries.boards.inviteTitle"),
        inviteDescription: t("groceries.boards.inviteDescription"),
        inviteEmailLabel: t("groceries.boards.inviteEmailLabel"),
        inviteEmailPlaceholder: t("groceries.boards.inviteEmailPlaceholder"),
        createInvite: t("groceries.boards.createInvite"),
        inviteLinkLabel: t("groceries.boards.inviteLinkLabel"),
        copyInviteLink: t("groceries.boards.copyInviteLink"),
        inviteCreated: t("groceries.boards.inviteCreated"),
        inviteCopied: t("groceries.boards.inviteCopied"),
        roleOwner: t("groceries.boards.roleOwner"),
        roleEditor: t("groceries.boards.roleEditor"),
        switchFailed: t("groceries.boards.switchFailed"),
        nameRequired: t("groceries.boards.nameRequired"),
        createFailed: t("groceries.boards.createFailed"),
        inviteFailed: t("groceries.boards.inviteFailed"),
        copyFailed: t("groceries.boards.copyFailed"),
        boardCreated: (name) => t("groceries.boards.boardCreated", { name }),
      },
    },
    categories: buildCategoryLabels(t),
  };
};

const metadataTitle = metadata?.title &&
  typeof metadata.title === "object" &&
  "default" in metadata.title
  ? metadata.title.default
  : typeof metadata?.title === "string"
    ? metadata.title
    : "Receipts AI"

export const localeMessages = {
  en: {
    metadata: {
      title: metadataTitle,
      description: metadata.description,
    },
    locales: {
      en: "English",
      es: "Spanish",
      "pt-BR": "Portuguese (Brazil)",
    },
    common: {
      language: "Language",
      cancel: "Cancel",
    },
    theme: {
      label: "Theme",
      switcherLabel: "Theme switcher",
      system: "System",
      light: "Light",
      dark: "Dark",
    },
    auth: {
      sectionLabel: "Authentication controls",
      title: "Google login",
      connected: "Google account connected.",
      startSession: "Use Google to start a session in this workspace.",
      setupHint:
        "Set AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET to enable Google login.",
      signOut: "Sign out",
      continueWithGoogle: "Continue with Google",
      checking: "Checking Google login...",
      userAlt: "User",
      signedInFallback: "Signed in",
      emailFallback: "Google account",
    },
    home: {
      dashboardTitle: "Groceries dashboard",
      dashboardDescription:
        "Open the month view with category cards, totals, and repeated-item rollups.",
      openGroceriesView: "Open groceries view",
    },
    receipt: {
      eyebrow: "Receipt AI",
      heroTitle:
        "Upload a receipt and extract line items without running the model locally.",
      heroDescription:
        "This frontend is designed for Vercel. The browser uploads the image to a server route, and the server route calls Hugging Face with the model configured in the server environment.",
      fileReady: "Receipt file ready",
      dropImage: "Drop a receipt file here",
      replaceHelp: "Replace it by dropping another image or PDF, or browsing files.",
      browseHelp:
        "PNG, JPG, WEBP, or PDF works best. Click to browse if you prefer.",
      removeSelectedImage: "Remove selected file",
      dragAndDrop: "Drag and drop",
      clickToBrowse: "or click anywhere in this panel to browse",
      modelLabel: "Model",
      selectModel: "Select model",
      modelHelp:
        "The server default comes from HF_MODEL_ID. The model now categorizes grocery items as part of extraction.",
      extracting: "Extracting...",
      extractReceipt: "Extract receipt",
      removeImage: "Remove file",
      preview: "Preview",
      noFileSelected: "No file selected",
      previewAlt: "Receipt preview",
      previewPlaceholder: "Your receipt preview will appear here.",
      pdfPreviewPlaceholder:
        "PDF selected. Preview is not shown here, but extraction will use the PDF pages.",
      extractedItems: "Extracted items",
      waitingForExtraction: "Waiting for extraction",
      servedBy: "Served by {backend}",
      lines: "{count, plural, one {# line} other {# lines}}",
      total: "{amount} total",
      corrected: "{count} corrected",
      reviewHint:
        "Review the AI picks before saving. Use Adjust on any row to override category or quantity.",
      saveCardTitle: "Save these groceries into the month view",
      saveSignedIn:
        "Persist this categorized receipt and open the dashboard to inspect totals and repeated items.",
      saveSignedOut:
        "Sign in with Google first to persist groceries to your personal month dashboard.",
      saving: "Saving...",
      saveGroceries: "Save groceries",
      openDashboard: "Open dashboard",
      openFreshDashboard: "Open fresh dashboard",
      resultPlaceholder:
        "Extracted categorized groceries and the raw model response will appear here.",
      table: {
        item: "Item",
        category: "Category",
        quantity: "Qty",
        unit: "Unit",
        total: "Total",
        adjust: "Adjust",
      },
      editor: {
        title: "Adjust extracted grocery",
        description:
          "Override the AI-picked category or quantity before this receipt is saved into the monthly dashboard.",
        item: "Item",
        category: "Category",
        selectCategory: "Select category",
        quantity: "Quantity",
        unitPriceFixed:
          "Unit price stays fixed at {price}. The line total will be recalculated when you apply the correction.",
        reset: "Reset to AI result",
        apply: "Apply correction",
      },
      alerts: {
        corrected: "Corrected",
        adjust: "Adjust",
      },
      errors: {
        invalidImage: "Use an image or PDF file such as PNG, JPG, WEBP, or PDF.",
        noFile: "Select a receipt file before extracting.",
        extractionFailed: "Extraction failed.",
        unexpectedRequest: "Unexpected request error.",
        noResultToSave: "Extract a receipt before saving groceries.",
        saveFailed: "Unable to save groceries.",
        unexpectedSave: "Unexpected save error.",
        invalidCategory: "Select a valid grocery category.",
        invalidQuantity: "Quantity must be greater than zero.",
      },
      saveSuccess:
        "Saved {count} grocery lines to {monthLabel}. The dashboard link is now primed with the fresh month view.",
    },
    groceries: {
      signInTitle: "Sign in to unlock your groceries dashboard",
      signInDescription:
        "This page reads user-scoped grocery history, so it only opens once a Google session is active.",
      backToHome: "Back to home",
      eyebrow: "Groceries",
      currentMonthView: "Current month view",
      historicalMonthView: "Historical month view",
      heroDescription:
        "A live category map of what has landed in the basket so far this month, with fast drill-down into repeated items.",
      previousMonth: "Previous month",
      selectMonth: "Select month",
      nextMonth: "Next month",
      backToUpload: "Back to receipt upload",
      monthProgress: "Month progress",
      dayOf: "Day {currentDay} of {totalDays}",
      stats: {
        monthTotal: "Month total",
        uniqueItemsTracked: "Unique items tracked",
        itemsTracked: "Items tracked",
        receiptsSaved: "Receipts saved",
        categoriesActive: "Categories active",
      },
      recentExtractions: "Recent receipts",
      recentExtractionsDescription:
        "Saved receipts included in this month's totals. Deleting one removes its grocery lines from the dashboard totals.",
      deleteReceipt: "Delete receipt",
      deleteReceiptTitle: "Delete this receipt?",
      deleteReceiptDescription:
        "Deleting {receiptName} removes every grocery line from this receipt out of the monthly totals.",
      deleteReceiptConfirm: "Delete receipt",
      deletingReceipt: "Deleting...",
      deleteReceiptFailed: "Unable to delete the receipt.",
      untitledReceipt: "Untitled receipt",
      emptyTitle: "No groceries saved for this month yet",
      emptyDescription:
        "Extract a grocery receipt, save the categorized result, and {monthLabel} will bloom into the month view automatically.",
      extractReceipt: "Extract a receipt",
      repeatedGroups: "{count} repeated item groups",
      mobileDescription:
        "Repeated items, quantity rollups, and spend for this category so far this month.",
      units: "{count, plural, one {# unit} other {# units}}",
      uniqueItems: "{count} unique items",
      ofMonth: "of month",
      table: {
        item: "Item",
        unitPrice: "Unit price",
        amount: "Amount",
        total: "Total",
      },
      receiptEntries:
        "{count, plural, one {# receipt entry} other {# receipt entries}}",
      boards: {
        sectionLabel: "Shared boards",
        selectBoard: "Select board",
        createBoard: "New board",
        createBoardTitle: "Create a shared board",
        createBoardDescription:
          "Boards let multiple people add groceries into the same dashboard.",
        createBoardPlaceholder: "Weekend groceries",
        createBoardSubmit: "Create board",
        members: "Members",
        membersTitle: "Board members",
        membersDescription:
          "Everyone listed here can open this dashboard. Owners can also issue invite links.",
        membersCount: "{count, plural, one {# member} other {# members}}",
        noMembers: "No members found for this board yet.",
        invite: "Invite",
        inviteTitle: "Invite a collaborator",
        inviteDescription:
          "Generate a secure invite link for someone who should add groceries to this board.",
        inviteEmailLabel: "Invite email (optional)",
        inviteEmailPlaceholder: "friend@example.com",
        createInvite: "Create invite link",
        inviteLinkLabel: "Invite link",
        copyInviteLink: "Copy link",
        inviteCreated: "Invite link generated.",
        inviteCopied: "Invite link copied.",
        roleOwner: "Owner",
        roleEditor: "Editor",
        switchFailed: "Unable to switch boards.",
        nameRequired: "Enter a board name before creating it.",
        createFailed: "Unable to create the board.",
        inviteFailed: "Unable to create the invite.",
        copyFailed: "Unable to copy the invite link.",
        boardCreated: "Board {name} created.",
      },
    },
    categories: {
      produce: "Produce",
      dairy: "Dairy",
      bakery: "Bakery",
      meat: "Meat",
      pantry: "Pantry",
      frozen: "Frozen",
      beverages: "Beverages",
      snacks: "Snacks",
      household: "Household",
      "personal-care": "Personal care",
      other: "Other",
    },
  },
  es: {
    metadata: {
      title: metadataTitle,
      description:
        "Interfaz de extracción de recibos con Hugging Face Inference en Vercel.",
    },
    locales: {
      en: "Inglés",
      es: "Español",
      "pt-BR": "Portugués (Brasil)",
    },
    common: {
      language: "Idioma",
      cancel: "Cancelar",
    },
    theme: {
      label: "Tema",
      switcherLabel: "Selector de tema",
      system: "Sistema",
      light: "Claro",
      dark: "Oscuro",
    },
    auth: {
      sectionLabel: "Controles de autenticación",
      title: "Inicio de sesión con Google",
      connected: "Cuenta de Google conectada.",
      startSession:
        "Usa Google para iniciar una sesión en este espacio de trabajo.",
      setupHint:
        "Define AUTH_SECRET, AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET para habilitar el inicio de sesión con Google.",
      signOut: "Cerrar sesión",
      continueWithGoogle: "Continuar con Google",
      checking: "Comprobando inicio de sesión con Google...",
      userAlt: "Usuario",
      signedInFallback: "Sesión iniciada",
      emailFallback: "Cuenta de Google",
    },
    home: {
      dashboardTitle: "Panel de compras",
      dashboardDescription:
        "Abre la vista mensual con tarjetas por categoría, totales y agrupaciones de artículos repetidos.",
      openGroceriesView: "Abrir vista de compras",
    },
    receipt: {
      eyebrow: "Receipt AI",
      heroTitle:
        "Sube un recibo y extrae las líneas sin ejecutar el modelo localmente.",
      heroDescription:
        "Este frontend está diseñado para Vercel. El navegador sube la imagen a una ruta del servidor y esa ruta llama a Hugging Face con el modelo configurado en el entorno del servidor.",
      fileReady: "Archivo del recibo listo",
      dropImage: "Suelta un archivo de recibo aquí",
      replaceHelp: "Reemplázalo soltando otra imagen o PDF, o buscando archivos.",
      browseHelp:
        "PNG, JPG, WEBP o PDF funcionan mejor. Haz clic para buscar si lo prefieres.",
      removeSelectedImage: "Quitar archivo seleccionado",
      dragAndDrop: "Arrastrar y soltar",
      clickToBrowse: "o haz clic en cualquier parte de este panel para buscar",
      modelLabel: "Modelo",
      selectModel: "Selecciona un modelo",
      modelHelp:
        "El valor predeterminado del servidor proviene de HF_MODEL_ID. Ahora el modelo categoriza artículos de supermercado durante la extracción.",
      extracting: "Extrayendo...",
      extractReceipt: "Extraer recibo",
      removeImage: "Quitar archivo",
      preview: "Vista previa",
      noFileSelected: "Ningún archivo seleccionado",
      previewAlt: "Vista previa del recibo",
      previewPlaceholder: "La vista previa del recibo aparecerá aquí.",
      pdfPreviewPlaceholder:
        "PDF seleccionado. La vista previa no se muestra aquí, pero la extracción usará las páginas del PDF.",
      extractedItems: "Artículos extraídos",
      waitingForExtraction: "Esperando extracción",
      servedBy: "Servido por {backend}",
      lines: "{count, plural, one {# línea} other {# líneas}}",
      total: "{amount} total",
      corrected: "{count} corregidos",
      reviewHint:
        "Revisa las selecciones de la IA antes de guardar. Usa Ajustar en cualquier fila para sobrescribir la categoría o la cantidad.",
      saveCardTitle: "Guarda estas compras en la vista mensual",
      saveSignedIn:
        "Guarda este recibo categorizado y abre el panel para revisar totales y artículos repetidos.",
      saveSignedOut:
        "Primero inicia sesión con Google para guardar las compras en tu panel mensual personal.",
      saving: "Guardando...",
      saveGroceries: "Guardar compras",
      openDashboard: "Abrir panel",
      openFreshDashboard: "Abrir panel actualizado",
      resultPlaceholder:
        "Las compras categorizadas extraídas y la respuesta sin procesar del modelo aparecerán aquí.",
      table: {
        item: "Artículo",
        category: "Categoría",
        quantity: "Cant.",
        unit: "Unidad",
        total: "Total",
        adjust: "Ajustar",
      },
      editor: {
        title: "Ajustar compra extraída",
        description:
          "Sobrescribe la categoría o la cantidad elegida por la IA antes de guardar este recibo en el panel mensual.",
        item: "Artículo",
        category: "Categoría",
        selectCategory: "Selecciona una categoría",
        quantity: "Cantidad",
        unitPriceFixed:
          "El precio unitario permanece fijo en {price}. El total de la línea se recalculará cuando apliques la corrección.",
        reset: "Restablecer al resultado de la IA",
        apply: "Aplicar corrección",
      },
      alerts: {
        corrected: "Corregido",
        adjust: "Ajustar",
      },
      errors: {
        invalidImage: "Usa un archivo de imagen o PDF como PNG, JPG, WEBP o PDF.",
        noFile: "Selecciona un archivo del recibo antes de extraer.",
        extractionFailed: "La extracción falló.",
        unexpectedRequest: "Error inesperado en la solicitud.",
        noResultToSave: "Extrae un recibo antes de guardar las compras.",
        saveFailed: "No se pudieron guardar las compras.",
        unexpectedSave: "Error inesperado al guardar.",
        invalidCategory: "Selecciona una categoría válida.",
        invalidQuantity: "La cantidad debe ser mayor que cero.",
      },
      saveSuccess:
        "Se guardaron {count} líneas de compras en {monthLabel}. El enlace al panel ya quedó listo con la vista mensual actualizada.",
    },
    groceries: {
      signInTitle: "Inicia sesión para desbloquear tu panel de compras",
      signInDescription:
        "Esta página lee el historial de compras asociado al usuario, así que solo se abre cuando hay una sesión de Google activa.",
      backToHome: "Volver al inicio",
      eyebrow: "Compras",
      currentMonthView: "Vista del mes actual",
      historicalMonthView: "Vista histórica",
      heroDescription:
        "Un mapa vivo por categoría de lo que ya entró en la canasta este mes, con acceso rápido a artículos repetidos.",
      previousMonth: "Mes anterior",
      selectMonth: "Seleccionar mes",
      nextMonth: "Mes siguiente",
      backToUpload: "Volver a cargar recibo",
      monthProgress: "Progreso del mes",
      dayOf: "Día {currentDay} de {totalDays}",
      stats: {
        monthTotal: "Total del mes",
        uniqueItemsTracked: "Artículos únicos registrados",
        itemsTracked: "Artículos registrados",
        receiptsSaved: "Recibos guardados",
        categoriesActive: "Categorías activas",
      },
      recentExtractions: "Recibos recientes",
      recentExtractionsDescription:
        "Recibos guardados que ya forman parte de los totales del mes. Al eliminar uno, sus líneas se quitan del panel.",
      deleteReceipt: "Eliminar recibo",
      deleteReceiptTitle: "¿Eliminar este recibo?",
      deleteReceiptDescription:
        "Al eliminar {receiptName}, todas las líneas de compra de ese recibo se quitarán de los totales mensuales.",
      deleteReceiptConfirm: "Eliminar recibo",
      deletingReceipt: "Eliminando...",
      deleteReceiptFailed: "No se pudo eliminar el recibo.",
      untitledReceipt: "Recibo sin título",
      emptyTitle: "Todavía no hay compras guardadas para este mes",
      emptyDescription:
        "Extrae un recibo de compras, guarda el resultado categorizado y {monthLabel} se convertirá automáticamente en la vista mensual.",
      extractReceipt: "Extraer un recibo",
      repeatedGroups: "{count} grupos de artículos repetidos",
      mobileDescription:
        "Artículos repetidos, cantidades acumuladas y gasto de esta categoría en lo que va del mes.",
      units: "{count, plural, one {# unidad} other {# unidades}}",
      uniqueItems: "{count} artículos únicos",
      ofMonth: "del mes",
      table: {
        item: "Artículo",
        unitPrice: "Precio unitario",
        amount: "Cantidad",
        total: "Total",
      },
      receiptEntries:
        "{count, plural, one {# entrada de recibo} other {# entradas de recibo}}",
      boards: {
        sectionLabel: "Tableros compartidos",
        selectBoard: "Seleccionar tablero",
        createBoard: "Nuevo tablero",
        createBoardTitle: "Crear un tablero compartido",
        createBoardDescription:
          "Los tableros permiten que varias personas agreguen compras en el mismo panel.",
        createBoardPlaceholder: "Compras del fin de semana",
        createBoardSubmit: "Crear tablero",
        members: "Miembros",
        membersTitle: "Miembros del tablero",
        membersDescription:
          "Todas las personas listadas aquí pueden abrir este panel. Los dueños también pueden crear enlaces de invitación.",
        membersCount: "{count, plural, one {# miembro} other {# miembros}}",
        noMembers: "Todavía no hay miembros en este tablero.",
        invite: "Invitar",
        inviteTitle: "Invitar a un colaborador",
        inviteDescription:
          "Genera un enlace de invitación seguro para alguien que deba agregar compras a este tablero.",
        inviteEmailLabel: "Correo para la invitación (opcional)",
        inviteEmailPlaceholder: "amigo@example.com",
        createInvite: "Crear enlace de invitación",
        inviteLinkLabel: "Enlace de invitación",
        copyInviteLink: "Copiar enlace",
        inviteCreated: "Enlace de invitación generado.",
        inviteCopied: "Enlace de invitación copiado.",
        roleOwner: "Dueño",
        roleEditor: "Editor",
        switchFailed: "No se pudo cambiar de tablero.",
        nameRequired: "Escribe un nombre para el tablero antes de crearlo.",
        createFailed: "No se pudo crear el tablero.",
        inviteFailed: "No se pudo crear la invitación.",
        copyFailed: "No se pudo copiar el enlace de invitación.",
        boardCreated: "Se creó el tablero {name}.",
      },
    },
    categories: {
      produce: "Frutas y verduras",
      dairy: "Lácteos",
      bakery: "Panadería",
      meat: "Carnes",
      pantry: "Despensa",
      frozen: "Congelados",
      beverages: "Bebidas",
      snacks: "Snacks",
      household: "Hogar",
      "personal-care": "Cuidado personal",
      other: "Otros",
    },
  },
  "pt-BR": {
    metadata: {
      title: metadataTitle,
      description:
        "Interface de extração de recibos com Hugging Face Inference na Vercel.",
    },
    locales: {
      en: "Inglês",
      es: "Espanhol",
      "pt-BR": "Português (Brasil)",
    },
    common: {
      language: "Idioma",
      cancel: "Cancelar",
    },
    theme: {
      label: "Tema",
      switcherLabel: "Seletor de tema",
      system: "Sistema",
      light: "Claro",
      dark: "Escuro",
    },
    auth: {
      sectionLabel: "Controles de autenticação",
      title: "Login com Google",
      connected: "Conta do Google conectada.",
      startSession: "Use o Google para iniciar uma sessão neste workspace.",
      setupHint:
        "Defina AUTH_SECRET, AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET para habilitar o login com Google.",
      signOut: "Sair",
      continueWithGoogle: "Continuar com Google",
      checking: "Verificando login do Google...",
      userAlt: "Usuário",
      signedInFallback: "Sessão iniciada",
      emailFallback: "Conta do Google",
    },
    home: {
      dashboardTitle: "Painel de compras",
      dashboardDescription:
        "Abra a visão mensal com cartões por categoria, totais e agrupamentos de itens repetidos.",
      openGroceriesView: "Abrir visão de compras",
    },
    receipt: {
      eyebrow: "Receipt AI",
      heroTitle:
        "Envie um recibo e extraia os itens sem rodar o modelo localmente.",
      heroDescription:
        "Este frontend foi pensado para a Vercel. O navegador envia a imagem para uma rota do servidor, e a rota do servidor chama o Hugging Face com o modelo configurado no ambiente.",
      fileReady: "Arquivo do recibo pronto",
      dropImage: "Solte um arquivo do recibo aqui",
      replaceHelp: "Substitua soltando outra imagem ou PDF, ou procurando arquivos.",
      browseHelp:
        "PNG, JPG, WEBP ou PDF funcionam melhor. Clique para procurar se preferir.",
      removeSelectedImage: "Remover arquivo selecionado",
      dragAndDrop: "Arrastar e soltar",
      clickToBrowse: "ou clique em qualquer lugar deste painel para procurar",
      modelLabel: "Modelo",
      selectModel: "Selecione um modelo",
      modelHelp:
        "O padrão do servidor vem de HF_MODEL_ID. Agora o modelo categoriza itens de supermercado durante a extração.",
      extracting: "Extraindo...",
      extractReceipt: "Extrair recibo",
      removeImage: "Remover arquivo",
      preview: "Prévia",
      noFileSelected: "Nenhum arquivo selecionado",
      previewAlt: "Prévia do recibo",
      previewPlaceholder: "A prévia do recibo aparecerá aqui.",
      pdfPreviewPlaceholder:
        "PDF selecionado. A prévia não aparece aqui, mas a extração usará as páginas do PDF.",
      extractedItems: "Itens extraídos",
      waitingForExtraction: "Aguardando extração",
      servedBy: "Atendido por {backend}",
      lines: "{count, plural, one {# linha} other {# linhas}}",
      total: "{amount} no total",
      corrected: "{count} corrigidos",
      reviewHint:
        "Revise as escolhas da IA antes de salvar. Use Ajustar em qualquer linha para sobrescrever categoria ou quantidade.",
      saveCardTitle: "Salve estas compras na visão mensal",
      saveSignedIn:
        "Persista este recibo categorizado e abra o painel para conferir totais e itens repetidos.",
      saveSignedOut:
        "Faça login com Google primeiro para salvar as compras no seu painel mensal pessoal.",
      saving: "Salvando...",
      saveGroceries: "Salvar compras",
      openDashboard: "Abrir painel",
      openFreshDashboard: "Abrir painel atualizado",
      resultPlaceholder:
        "As compras categorizadas extraídas e a resposta bruta do modelo aparecerão aqui.",
      table: {
        item: "Item",
        category: "Categoria",
        quantity: "Qtd.",
        unit: "Unid.",
        total: "Total",
        adjust: "Ajustar",
      },
      editor: {
        title: "Ajustar compra extraída",
        description:
          "Sobrescreva a categoria ou a quantidade escolhida pela IA antes de salvar este recibo no painel mensal.",
        item: "Item",
        category: "Categoria",
        selectCategory: "Selecione uma categoria",
        quantity: "Quantidade",
        unitPriceFixed:
          "O preço unitário permanece fixo em {price}. O total da linha será recalculado quando você aplicar a correção.",
        reset: "Voltar ao resultado da IA",
        apply: "Aplicar correção",
      },
      alerts: {
        corrected: "Corrigido",
        adjust: "Ajustar",
      },
      errors: {
        invalidImage: "Use um arquivo de imagem ou PDF como PNG, JPG, WEBP ou PDF.",
        noFile: "Selecione um arquivo do recibo antes de extrair.",
        extractionFailed: "A extração falhou.",
        unexpectedRequest: "Erro inesperado na requisição.",
        noResultToSave: "Extraia um recibo antes de salvar as compras.",
        saveFailed: "Não foi possível salvar as compras.",
        unexpectedSave: "Erro inesperado ao salvar.",
        invalidCategory: "Selecione uma categoria válida.",
        invalidQuantity: "A quantidade deve ser maior que zero.",
      },
      saveSuccess:
        "Salvou {count} linhas de compras em {monthLabel}. O link do painel já foi preparado com a visão mensal atualizada.",
    },
    groceries: {
      signInTitle: "Faça login para desbloquear seu painel de compras",
      signInDescription:
        "Esta página lê o histórico de compras do usuário, então ela só abre quando existe uma sessão do Google ativa.",
      backToHome: "Voltar para o início",
      eyebrow: "Compras",
      currentMonthView: "Visão do mês atual",
      historicalMonthView: "Visão histórica",
      heroDescription:
        "Um mapa vivo por categoria do que já entrou na cesta neste mês, com detalhamento rápido de itens repetidos.",
      previousMonth: "Mês anterior",
      selectMonth: "Selecionar mês",
      nextMonth: "Próximo mês",
      backToUpload: "Voltar para envio do recibo",
      monthProgress: "Progresso do mês",
      dayOf: "Dia {currentDay} de {totalDays}",
      stats: {
        monthTotal: "Total do mês",
        uniqueItemsTracked: "Itens únicos acompanhados",
        itemsTracked: "Itens acompanhados",
        receiptsSaved: "Recibos salvos",
        categoriesActive: "Categorias ativas",
      },
      recentExtractions: "Recibos recentes",
      recentExtractionsDescription:
        "Recibos salvos que já entram nos totais do mês. Ao excluir um deles, as linhas dessa compra saem do painel.",
      deleteReceipt: "Excluir recibo",
      deleteReceiptTitle: "Excluir este recibo?",
      deleteReceiptDescription:
        "Ao excluir {receiptName}, todas as linhas de compra desse recibo sairão dos totais mensais.",
      deleteReceiptConfirm: "Excluir recibo",
      deletingReceipt: "Excluindo...",
      deleteReceiptFailed: "Não foi possível excluir o recibo.",
      untitledReceipt: "Recibo sem título",
      emptyTitle: "Ainda não há compras salvas para este mês",
      emptyDescription:
        "Extraia um recibo de compras, salve o resultado categorizado e {monthLabel} vai aparecer automaticamente na visão mensal.",
      extractReceipt: "Extrair um recibo",
      repeatedGroups: "{count} grupos de itens repetidos",
      mobileDescription:
        "Itens repetidos, quantidades acumuladas e gasto desta categoria até agora neste mês.",
      units: "{count, plural, one {# unidade} other {# unidades}}",
      uniqueItems: "{count} itens únicos",
      ofMonth: "do mês",
      table: {
        item: "Item",
        unitPrice: "Preço unitário",
        amount: "Quantidade",
        total: "Total",
      },
      receiptEntries:
        "{count, plural, one {# entrada de recibo} other {# entradas de recibo}}",
      boards: {
        sectionLabel: "Quadros compartilhados",
        selectBoard: "Selecionar quadro",
        createBoard: "Novo quadro",
        createBoardTitle: "Criar um quadro compartilhado",
        createBoardDescription:
          "Os quadros permitem que várias pessoas adicionem compras no mesmo painel.",
        createBoardPlaceholder: "Compras do fim de semana",
        createBoardSubmit: "Criar quadro",
        members: "Membros",
        membersTitle: "Membros do quadro",
        membersDescription:
          "Todas as pessoas listadas aqui podem abrir este painel. Donos também podem gerar links de convite.",
        membersCount: "{count, plural, one {# membro} other {# membros}}",
        noMembers: "Ainda não há membros neste quadro.",
        invite: "Convidar",
        inviteTitle: "Convidar um colaborador",
        inviteDescription:
          "Gere um link de convite seguro para alguém que deve adicionar compras neste quadro.",
        inviteEmailLabel: "Email do convite (opcional)",
        inviteEmailPlaceholder: "amigo@example.com",
        createInvite: "Criar link de convite",
        inviteLinkLabel: "Link do convite",
        copyInviteLink: "Copiar link",
        inviteCreated: "Link de convite gerado.",
        inviteCopied: "Link de convite copiado.",
        roleOwner: "Dono",
        roleEditor: "Editor",
        switchFailed: "Não foi possível trocar de quadro.",
        nameRequired: "Digite um nome para o quadro antes de criá-lo.",
        createFailed: "Não foi possível criar o quadro.",
        inviteFailed: "Não foi possível criar o convite.",
        copyFailed: "Não foi possível copiar o link do convite.",
        boardCreated: "Quadro {name} criado.",
      },
    },
    categories: {
      produce: "Hortifruti",
      dairy: "Laticínios",
      bakery: "Padaria",
      meat: "Carnes",
      pantry: "Despensa",
      frozen: "Congelados",
      beverages: "Bebidas",
      snacks: "Lanches",
      household: "Casa",
      "personal-care": "Cuidados pessoais",
      other: "Outros",
    },
  },
} as const satisfies Record<AppLocale, Record<string, unknown>>;

export const getMessages = async (locale: AppLocale): Promise<Messages> => {
  const t = await getTranslations({ locale });

  return createMessagesObject(
    (key, values) => t(key as never, values as never),
    locale,
  );
};
