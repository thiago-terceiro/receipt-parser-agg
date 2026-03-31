import type { GroceryCategory } from "@/lib/receipt";

import type { AppLocale } from "./config";

const pluralize = (count: number, singular: string, plural: string) => {
  return count === 1 ? singular : plural;
};

export type Messages = {
  metadata: {
    title: string;
    description: string;
  };
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
    currentPreference: string;
    currentPreferenceSystem: (resolvedThemeLabel: string) => string;
    currentPreferenceExplicit: (themeLabel: string) => string;
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
      itemsTracked: string;
      receiptsSaved: string;
      categoriesActive: string;
    };
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
  };
  categories: Record<GroceryCategory, string>;
};

const englishCategories: Record<GroceryCategory, string> = {
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
};

const spanishCategories: Record<GroceryCategory, string> = {
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
};

const portugueseCategories: Record<GroceryCategory, string> = {
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
};

const englishMessages: Messages = {
  metadata: {
    title: "Receipt AI",
    description: "Receipt extraction UI backed by Hugging Face Inference on Vercel.",
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
    currentPreference: "Current preference",
    currentPreferenceSystem: (resolvedThemeLabel) =>
      `Current preference: system (${resolvedThemeLabel.toLowerCase()}).`,
    currentPreferenceExplicit: (themeLabel) =>
      `Current preference: ${themeLabel.toLowerCase()}.`,
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
    heroTitle: "Upload a receipt and extract line items without running the model locally.",
    heroDescription:
      "This frontend is designed for Vercel. The browser uploads the image to a server route, and the server route calls Hugging Face with the model configured in the server environment.",
    fileReady: "Receipt image ready",
    dropImage: "Drop a receipt image here",
    replaceHelp: "Replace it by dropping another image or browsing files.",
    browseHelp: "PNG, JPG, or WEBP works best. Click to browse if you prefer.",
    removeSelectedImage: "Remove selected image",
    dragAndDrop: "Drag and drop",
    clickToBrowse: "or click anywhere in this panel to browse",
    modelLabel: "Model",
    selectModel: "Select model",
    modelHelp:
      "The server default comes from HF_MODEL_ID. The model now categorizes grocery items as part of extraction.",
    extracting: "Extracting...",
    extractReceipt: "Extract receipt",
    removeImage: "Remove image",
    preview: "Preview",
    noFileSelected: "No file selected",
    previewAlt: "Receipt preview",
    previewPlaceholder: "Your receipt preview will appear here.",
    extractedItems: "Extracted items",
    waitingForExtraction: "Waiting for extraction",
    servedBy: (backend) => `Served by ${backend}`,
    lines: (count) => `${count} ${pluralize(count, "line", "lines")}`,
    total: (amount) => `${amount} total`,
    corrected: (count) => `${count} corrected`,
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
    resultPlaceholder: "Extracted categorized groceries and the raw model response will appear here.",
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
      unitPriceFixed: (price) =>
        `Unit price stays fixed at ${price}. The line total will be recalculated when you apply the correction.`,
      reset: "Reset to AI result",
      apply: "Apply correction",
    },
    alerts: {
      corrected: "Corrected",
      adjust: "Adjust",
    },
    errors: {
      invalidImage: "Use an image file such as PNG, JPG, or WEBP.",
      noFile: "Select a receipt image before extracting.",
      extractionFailed: "Extraction failed.",
      unexpectedRequest: "Unexpected request error.",
      noResultToSave: "Extract a receipt before saving groceries.",
      saveFailed: "Unable to save groceries.",
      unexpectedSave: "Unexpected save error.",
      invalidCategory: "Select a valid grocery category.",
      invalidQuantity: "Quantity must be greater than zero.",
    },
    saveSuccess: (count, monthLabel) =>
      `Saved ${count} grocery lines to ${monthLabel}. The dashboard link is now primed with the fresh month view.`,
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
    dayOf: (currentDay, totalDays) => `Day ${currentDay} of ${totalDays}`,
    stats: {
      monthTotal: "Month total",
      itemsTracked: "Items tracked",
      receiptsSaved: "Receipts saved",
      categoriesActive: "Categories active",
    },
    emptyTitle: "No groceries saved for this month yet",
    emptyDescription: (monthLabel) =>
      `Extract a grocery receipt, save the categorized result, and ${monthLabel} will bloom into the month view automatically.`,
    extractReceipt: "Extract a receipt",
    repeatedGroups: (count) => `${count} repeated item groups`,
    mobileDescription:
      "Repeated items, quantity rollups, and spend for this category so far this month.",
    units: (count) => `${count} ${pluralize(count, "unit", "units")}`,
    uniqueItems: (count) => `${count} unique items`,
    ofMonth: "of month",
    table: {
      item: "Item",
      unitPrice: "Unit price",
      amount: "Amount",
      total: "Total",
    },
    receiptEntries: (count) => `${count} receipt ${pluralize(count, "entry", "entries")}`,
  },
  categories: englishCategories,
};

const spanishMessages: Messages = {
  metadata: {
    title: "Receipt AI",
    description: "Interfaz de extracción de recibos con Hugging Face Inference en Vercel.",
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
    currentPreference: "Preferencia actual",
    currentPreferenceSystem: (resolvedThemeLabel) =>
      `Preferencia actual: sistema (${resolvedThemeLabel.toLowerCase()}).`,
    currentPreferenceExplicit: (themeLabel) =>
      `Preferencia actual: ${themeLabel.toLowerCase()}.`,
  },
  auth: {
    sectionLabel: "Controles de autenticación",
    title: "Inicio de sesión con Google",
    connected: "Cuenta de Google conectada.",
    startSession: "Usa Google para iniciar una sesión en este espacio de trabajo.",
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
    heroTitle: "Sube un recibo y extrae las líneas sin ejecutar el modelo localmente.",
    heroDescription:
      "Este frontend está diseñado para Vercel. El navegador sube la imagen a una ruta del servidor y esa ruta llama a Hugging Face con el modelo configurado en el entorno del servidor.",
    fileReady: "Imagen del recibo lista",
    dropImage: "Suelta una imagen del recibo aquí",
    replaceHelp: "Reemplázala soltando otra imagen o buscando archivos.",
    browseHelp: "PNG, JPG o WEBP funcionan mejor. Haz clic para buscar si lo prefieres.",
    removeSelectedImage: "Quitar imagen seleccionada",
    dragAndDrop: "Arrastrar y soltar",
    clickToBrowse: "o haz clic en cualquier parte de este panel para buscar",
    modelLabel: "Modelo",
    selectModel: "Selecciona un modelo",
    modelHelp:
      "El valor predeterminado del servidor proviene de HF_MODEL_ID. Ahora el modelo categoriza artículos de supermercado durante la extracción.",
    extracting: "Extrayendo...",
    extractReceipt: "Extraer recibo",
    removeImage: "Quitar imagen",
    preview: "Vista previa",
    noFileSelected: "Ningún archivo seleccionado",
    previewAlt: "Vista previa del recibo",
    previewPlaceholder: "La vista previa del recibo aparecerá aquí.",
    extractedItems: "Artículos extraídos",
    waitingForExtraction: "Esperando extracción",
    servedBy: (backend) => `Servido por ${backend}`,
    lines: (count) => `${count} ${pluralize(count, "línea", "líneas")}`,
    total: (amount) => `${amount} total`,
    corrected: (count) => `${count} corregidos`,
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
      unitPriceFixed: (price) =>
        `El precio unitario permanece fijo en ${price}. El total de la línea se recalculará cuando apliques la corrección.`,
      reset: "Restablecer al resultado de la IA",
      apply: "Aplicar corrección",
    },
    alerts: {
      corrected: "Corregido",
      adjust: "Ajustar",
    },
    errors: {
      invalidImage: "Usa un archivo de imagen como PNG, JPG o WEBP.",
      noFile: "Selecciona una imagen del recibo antes de extraer.",
      extractionFailed: "La extracción falló.",
      unexpectedRequest: "Error inesperado en la solicitud.",
      noResultToSave: "Extrae un recibo antes de guardar las compras.",
      saveFailed: "No se pudieron guardar las compras.",
      unexpectedSave: "Error inesperado al guardar.",
      invalidCategory: "Selecciona una categoría válida.",
      invalidQuantity: "La cantidad debe ser mayor que cero.",
    },
    saveSuccess: (count, monthLabel) =>
      `Se guardaron ${count} líneas de compras en ${monthLabel}. El enlace al panel ya quedó listo con la vista mensual actualizada.`,
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
    dayOf: (currentDay, totalDays) => `Día ${currentDay} de ${totalDays}`,
    stats: {
      monthTotal: "Total del mes",
      itemsTracked: "Artículos registrados",
      receiptsSaved: "Recibos guardados",
      categoriesActive: "Categorías activas",
    },
    emptyTitle: "Todavía no hay compras guardadas para este mes",
    emptyDescription: (monthLabel) =>
      `Extrae un recibo de compras, guarda el resultado categorizado y ${monthLabel} se convertirá automáticamente en la vista mensual.`,
    extractReceipt: "Extraer un recibo",
    repeatedGroups: (count) => `${count} grupos de artículos repetidos`,
    mobileDescription:
      "Artículos repetidos, cantidades acumuladas y gasto de esta categoría en lo que va del mes.",
    units: (count) => `${count} ${pluralize(count, "unidad", "unidades")}`,
    uniqueItems: (count) => `${count} artículos únicos`,
    ofMonth: "del mes",
    table: {
      item: "Artículo",
      unitPrice: "Precio unitario",
      amount: "Cantidad",
      total: "Total",
    },
    receiptEntries: (count) => `${count} ${pluralize(count, "entrada de recibo", "entradas de recibo")}`,
  },
  categories: spanishCategories,
};

const portugueseMessages: Messages = {
  metadata: {
    title: "Receipt AI",
    description: "Interface de extração de recibos com Hugging Face Inference na Vercel.",
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
    currentPreference: "Preferência atual",
    currentPreferenceSystem: (resolvedThemeLabel) =>
      `Preferência atual: sistema (${resolvedThemeLabel.toLowerCase()}).`,
    currentPreferenceExplicit: (themeLabel) =>
      `Preferência atual: ${themeLabel.toLowerCase()}.`,
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
    heroTitle: "Envie um recibo e extraia os itens sem rodar o modelo localmente.",
    heroDescription:
      "Este frontend foi pensado para a Vercel. O navegador envia a imagem para uma rota do servidor, e a rota do servidor chama o Hugging Face com o modelo configurado no ambiente.",
    fileReady: "Imagem do recibo pronta",
    dropImage: "Solte uma imagem do recibo aqui",
    replaceHelp: "Substitua soltando outra imagem ou procurando arquivos.",
    browseHelp: "PNG, JPG ou WEBP funcionam melhor. Clique para procurar se preferir.",
    removeSelectedImage: "Remover imagem selecionada",
    dragAndDrop: "Arrastar e soltar",
    clickToBrowse: "ou clique em qualquer lugar deste painel para procurar",
    modelLabel: "Modelo",
    selectModel: "Selecione um modelo",
    modelHelp:
      "O padrão do servidor vem de HF_MODEL_ID. Agora o modelo categoriza itens de supermercado durante a extração.",
    extracting: "Extraindo...",
    extractReceipt: "Extrair recibo",
    removeImage: "Remover imagem",
    preview: "Prévia",
    noFileSelected: "Nenhum arquivo selecionado",
    previewAlt: "Prévia do recibo",
    previewPlaceholder: "A prévia do recibo aparecerá aqui.",
    extractedItems: "Itens extraídos",
    waitingForExtraction: "Aguardando extração",
    servedBy: (backend) => `Atendido por ${backend}`,
    lines: (count) => `${count} ${pluralize(count, "linha", "linhas")}`,
    total: (amount) => `${amount} no total`,
    corrected: (count) => `${count} corrigidos`,
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
      unitPriceFixed: (price) =>
        `O preço unitário permanece fixo em ${price}. O total da linha será recalculado quando você aplicar a correção.`,
      reset: "Voltar ao resultado da IA",
      apply: "Aplicar correção",
    },
    alerts: {
      corrected: "Corrigido",
      adjust: "Ajustar",
    },
    errors: {
      invalidImage: "Use um arquivo de imagem como PNG, JPG ou WEBP.",
      noFile: "Selecione uma imagem do recibo antes de extrair.",
      extractionFailed: "A extração falhou.",
      unexpectedRequest: "Erro inesperado na requisição.",
      noResultToSave: "Extraia um recibo antes de salvar as compras.",
      saveFailed: "Não foi possível salvar as compras.",
      unexpectedSave: "Erro inesperado ao salvar.",
      invalidCategory: "Selecione uma categoria válida.",
      invalidQuantity: "A quantidade deve ser maior que zero.",
    },
    saveSuccess: (count, monthLabel) =>
      `Salvou ${count} linhas de compras em ${monthLabel}. O link do painel já foi preparado com a visão mensal atualizada.`,
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
    dayOf: (currentDay, totalDays) => `Dia ${currentDay} de ${totalDays}`,
    stats: {
      monthTotal: "Total do mês",
      itemsTracked: "Itens acompanhados",
      receiptsSaved: "Recibos salvos",
      categoriesActive: "Categorias ativas",
    },
    emptyTitle: "Ainda não há compras salvas para este mês",
    emptyDescription: (monthLabel) =>
      `Extraia um recibo de compras, salve o resultado categorizado e ${monthLabel} vai aparecer automaticamente na visão mensal.`,
    extractReceipt: "Extrair um recibo",
    repeatedGroups: (count) => `${count} grupos de itens repetidos`,
    mobileDescription:
      "Itens repetidos, quantidades acumuladas e gasto desta categoria até agora neste mês.",
    units: (count) => `${count} ${pluralize(count, "unidade", "unidades")}`,
    uniqueItems: (count) => `${count} itens únicos`,
    ofMonth: "do mês",
    table: {
      item: "Item",
      unitPrice: "Preço unitário",
      amount: "Quantidade",
      total: "Total",
    },
    receiptEntries: (count) => `${count} ${pluralize(count, "entrada de recibo", "entradas de recibo")}`,
  },
  categories: portugueseCategories,
};

export const messages: Record<AppLocale, Messages> = {
  en: englishMessages,
  es: spanishMessages,
  "pt-BR": portugueseMessages,
};

export const getMessages = (locale: AppLocale): Messages => {
  return messages[locale];
};
