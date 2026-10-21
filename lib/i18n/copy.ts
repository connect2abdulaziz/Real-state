export type Locale = "en" | "fr";
export type LeadType = "seller" | "buyer";
export type Intent = "sell" | "buy";

export function normalizeLocale(v: string | null | undefined): Locale {
  return v === "fr" ? "fr" : "en";
}

export function intentToLeadType(intent: string | null | undefined): LeadType {
  return intent === "buy" ? "buyer" : "seller";
}

const shared = {
  en: {
    startTitle: "How can we help?",
    startBody:
      "A short conversation — sell with a preliminary valuation, or buy with a buyer consultation. About three to five minutes.",
    startCta: "Start conversation",
    languageLabel: "Language",
    languageHint: "All replies will stay in this language.",
    sellOrBuyAsk: "Are you looking to sell a property, or buy a property?",
    sell: "Sell a property",
    buy: "Buy a property",
    sellerIntro:
      "Great — I'll ask a few questions about your property to prepare a preliminary Estate Valora valuation.",
    buyerIntro:
      "Perfect — I'll ask a few questions about what you're looking for so Ashkan's team can help you buy with clarity.",
    buyerDone:
      "Thank you. I've saved your buyer preferences. You can book a phone or video consultation with Ashkan's team below.",
    sellerDone:
      "Thank you. I have everything I need to prepare your preliminary valuation. I'm analyzing the information you've provided to estimate a current market value range for your property.",
    buyerPanelTitle: "Your buyer profile",
    buyerPanelNote:
      "This information has been saved and shared with the Estate Valora team as a buyer lead.",
    sellerRecordTitle: "Structured property record",
    progressReady: "Ready when you are",
    progressBuyer: "Buyer consultation",
    progressSeller: "AI property valuation",
    progressBuyerDone: "Buyer profile complete",
    progressSellerDone: "Valuation complete",
    connectError: "Couldn't connect to start. Please try again.",
    saveError:
      "Your last answer was recorded here, but couldn't be saved — check your connection.",
    skipped: "Skipped",
    yes: "Yes",
    no: "No",
    continue: "Continue",
    skip: "Skip",
    send: "Send",
    back: "← Back",
    // Step input / rails
    progress: "Progress",
    reviewNote: "Subject to review by Ashkan Shamloo.",
    // Insight rail
    liveInsight: "Live insight",
    sessionSummary: "Session summary",
    nowAsking: "Now asking",
    collected: "Captured so far",
    waitingAnswers: "Your answers will appear here as you go.",
    finishedTitle: "You're all set",
    finishedBody:
      "We've prepared what you need — download your report or book a consultation with Ashkan when you're ready.",
    insightIdleTitle: "A quieter way to understand value.",
    insightIdleBody:
      "One question at a time. Adaptive follow-ups. No long form — then a preliminary range you can download and discuss with Ashkan.",
    bullets: [
      "Guided conversation · 3–5 minutes",
      "Structured property record",
      "AI range + branded PDF report",
    ] as string[],
    property: "Property",
    preparedFor: "Prepared for",
    contact: "Contact",
    tagline: "Property Insight Montreal",
    clarityLine: "Clarity before you decide",
    nextHint:
      "Download your report, then choose whether Ashkan personally reviews it with you.",
    // Valuation panel
    preparingEstimate: "Preparing your estimate",
    preparingEstimateHint: "This usually takes a few seconds…",
    estimateUnavailable: "Estimate unavailable",
    estimateUnavailableBody:
      "We couldn't generate an estimate right now. Ashkan Shamloo will still receive your details.",
    preliminaryEstimate: "Estate Valora preliminary estimate",
    confidence: "Confidence",
    downloadReport: "Download Estate Valora report",
    preparingPdf: "Preparing PDF…",
    pdfHint: "Branded PDF with your range, factors, disclaimer, and next steps.",
    explanation: "Explanation",
    factorsIncreasing: "Factors increasing value",
    factorsDecreasing: "Factors decreasing value",
    strengths: "Strengths",
    considerations: "Considerations",
    disclaimer:
      "This is an AI-assisted preliminary estimate — not a certified appraisal — and is subject to review by Ashkan Shamloo, Licensed Real Estate Broker.",
    // Consultation CTA
    personalReview: "Personal review",
    reviewAsk:
      "Would you like Ashkan to personally review your valuation and give you his professional opinion on the current market value of your property?",
    reviewYes: "Yes, I'd like a professional review",
    reviewNo: "No, I'm just exploring",
    channelAsk: "Great. Would you prefer a quick phone call or a video consultation?",
    phone: "Phone",
    video: "Video / Zoom",
    timeAsk: "What would be the best time for you?",
    timePlaceholder: "e.g. Weekday mornings, or Thursday after 5pm",
    submitRequest: "Submit request",
    saving: "Saving…",
    skipTime: "Skip time for now",
    consultReceived: "Consultation request received",
    thanksExploring: "Thanks — explore at your pace",
    consultFollowUpPhone: "Ashkan's team will follow up about a phone consultation",
    consultFollowUpVideo: "Ashkan's team will follow up about a video consultation",
    downloadAnytime: "You can still download your report anytime.",
    exploreAgain:
      "You can download your Estate Valora report and revisit a professional review whenever you're ready.",
    openCalendar: "Open scheduling calendar →",
    consultFootnote:
      "You can receive and review your valuation without booking a consultation.",
    notReady: "Conversation not ready yet.",
    saveFailed: "Could not save preference",
  },
  fr: {
    startTitle: "Comment pouvons-nous vous aider?",
    startBody:
      "Une courte conversation — vendre avec une estimation préliminaire, ou acheter avec une consultation acheteur. Environ trois à cinq minutes.",
    startCta: "Commencer",
    languageLabel: "Langue",
    languageHint: "Toutes les réponses resteront dans cette langue.",
    sellOrBuyAsk: "Souhaitez-vous vendre une propriété, ou en acheter une?",
    sell: "Vendre une propriété",
    buy: "Acheter une propriété",
    sellerIntro:
      "Parfait — je vais vous poser quelques questions sur votre propriété pour préparer une estimation préliminaire Estate Valora.",
    buyerIntro:
      "Parfait — je vais vous poser quelques questions sur ce que vous recherchez afin que l'équipe d'Ashkan puisse vous accompagner dans votre achat.",
    buyerDone:
      "Merci. J'ai enregistré vos préférences d'acheteur. Vous pouvez réserver une consultation téléphonique ou vidéo avec l'équipe d'Ashkan ci-dessous.",
    sellerDone:
      "Merci. J'ai tout ce qu'il faut pour préparer votre estimation préliminaire. J'analyse les informations fournies afin d'estimer une fourchette de valeur marchande pour votre propriété.",
    buyerPanelTitle: "Votre profil acheteur",
    buyerPanelNote:
      "Ces informations ont été enregistrées et transmises à l'équipe Estate Valora comme piste acheteur.",
    sellerRecordTitle: "Fiche propriété structurée",
    progressReady: "Prêt quand vous l'êtes",
    progressBuyer: "Consultation acheteur",
    progressSeller: "Estimation IA",
    progressBuyerDone: "Profil acheteur terminé",
    progressSellerDone: "Estimation terminée",
    connectError: "Impossible de démarrer. Veuillez réessayer.",
    saveError:
      "Votre dernière réponse est affichée ici, mais n'a pas pu être enregistrée — vérifiez votre connexion.",
    skipped: "Passé",
    yes: "Oui",
    no: "Non",
    continue: "Continuer",
    skip: "Passer",
    send: "Envoyer",
    back: "← Retour",
    progress: "Progression",
    reviewNote: "Sous réserve de révision par Ashkan Shamloo.",
    liveInsight: "Aperçu en direct",
    sessionSummary: "Résumé de la session",
    nowAsking: "Question en cours",
    collected: "Collecté jusqu'ici",
    waitingAnswers: "Vos réponses apparaîtront ici au fur et à mesure.",
    finishedTitle: "C'est terminé",
    finishedBody:
      "Nous avons préparé ce dont vous avez besoin — téléchargez votre rapport ou réservez une consultation avec Ashkan quand vous êtes prêt.",
    insightIdleTitle: "Une façon plus calme de comprendre la valeur.",
    insightIdleBody:
      "Une question à la fois. Suivis adaptés. Pas de long formulaire — puis une fourchette préliminaire à télécharger et discuter avec Ashkan.",
    bullets: [
      "Conversation guidée · 3–5 minutes",
      "Fiche propriété structurée",
      "Fourchette IA + rapport PDF",
    ] as string[],
    property: "Propriété",
    preparedFor: "Préparé pour",
    contact: "Coordonnées",
    tagline: "Aperçu immobilier Montréal",
    clarityLine: "La clarté avant de décider",
    nextHint:
      "Téléchargez votre rapport, puis choisissez si Ashkan le révise avec vous.",
    preparingEstimate: "Préparation de votre estimation",
    preparingEstimateHint: "Cela prend généralement quelques secondes…",
    estimateUnavailable: "Estimation indisponible",
    estimateUnavailableBody:
      "Nous n'avons pas pu générer d'estimation pour le moment. Ashkan Shamloo recevra tout de même vos détails.",
    preliminaryEstimate: "Estimation préliminaire Estate Valora",
    confidence: "Confiance",
    downloadReport: "Télécharger le rapport Estate Valora",
    preparingPdf: "Préparation du PDF…",
    pdfHint:
      "PDF de marque avec votre fourchette, les facteurs, l'avis et les prochaines étapes.",
    explanation: "Explication",
    factorsIncreasing: "Facteurs qui augmentent la valeur",
    factorsDecreasing: "Facteurs qui diminuent la valeur",
    strengths: "Points forts",
    considerations: "Points à considérer",
    disclaimer:
      "Il s'agit d'une estimation préliminaire assistée par IA — pas d'une évaluation certifiée — et elle est sous réserve de révision par Ashkan Shamloo, courtier immobilier agréé.",
    personalReview: "Révision personnelle",
    reviewAsk:
      "Souhaitez-vous qu'Ashkan révise personnellement votre estimation et vous donne son avis professionnel sur la valeur marchande actuelle de votre propriété?",
    reviewYes: "Oui, je souhaite une révision professionnelle",
    reviewNo: "Non, j'explore seulement",
    channelAsk:
      "Parfait. Préférez-vous un appel téléphonique rapide ou une consultation vidéo?",
    phone: "Téléphone",
    video: "Vidéo / Zoom",
    timeAsk: "Quel serait le meilleur moment pour vous?",
    timePlaceholder: "ex. Matins en semaine, ou jeudi après 17 h",
    submitRequest: "Envoyer la demande",
    saving: "Enregistrement…",
    skipTime: "Passer l'horaire pour l'instant",
    consultReceived: "Demande de consultation reçue",
    thanksExploring: "Merci — explorez à votre rythme",
    consultFollowUpPhone:
      "L'équipe d'Ashkan fera un suivi pour une consultation téléphonique",
    consultFollowUpVideo:
      "L'équipe d'Ashkan fera un suivi pour une consultation vidéo",
    downloadAnytime: "Vous pouvez toujours télécharger votre rapport.",
    exploreAgain:
      "Vous pouvez télécharger votre rapport Estate Valora et revenir à une révision professionnelle quand vous voulez.",
    openCalendar: "Ouvrir le calendrier de rendez-vous →",
    consultFootnote:
      "Vous pouvez recevoir et consulter votre estimation sans réserver de consultation.",
    notReady: "La conversation n'est pas encore prête.",
    saveFailed: "Impossible d'enregistrer la préférence",
  },
} as const;

/** Widened so EN/FR string literals are interchangeable at the type level. */
export type UiCopy = {
  [K in keyof (typeof shared)["en"]]: (typeof shared)["en"][K] extends ReadonlyArray<infer U>
    ? U[]
    : string;
};

export const UI: Record<Locale, UiCopy> = shared as unknown as Record<
  Locale,
  UiCopy
>;
