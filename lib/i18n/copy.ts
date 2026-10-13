export type Locale = "en" | "fr";
export type LeadType = "seller" | "buyer";
export type Intent = "sell" | "buy";

export function normalizeLocale(v: string | null | undefined): Locale {
  return v === "fr" ? "fr" : "en";
}

export function intentToLeadType(intent: string | null | undefined): LeadType {
  return intent === "buy" ? "buyer" : "seller";
}

export const UI = {
  en: {
    startTitle: "How can we help?",
    startBody:
      "A short conversation — sell with a preliminary valuation, or buy with a buyer consultation. About three to five minutes.",
    startCta: "Start conversation",
    languageLabel: "Language",
    sellOrBuyAsk: "Are you looking to sell a property, or buy a property?",
    sell: "Sell a property",
    buy: "Buy a property",
    sellerIntro:
      "Great — I'll ask a few questions about your property to prepare a preliminary Estate Valora valuation.",
    buyerIntro:
      "Perfect — I'll ask a few questions about what you're looking for so Ashkan's team can help you buy with clarity.",
    buyerDone:
      "Thank you. I've saved your buyer preferences. You can book a phone or video consultation with Ashkan's team below.",
    buyerPanelTitle: "Your buyer profile",
    buyerPanelNote:
      "This information has been saved and shared with the Estate Valora team as a buyer lead.",
    progressReady: "Ready when you are",
    progressBuyer: "Buyer consultation",
    progressSeller: "AI property valuation",
    progressBuyerDone: "Buyer profile complete",
    progressSellerDone: "Valuation complete",
    connectError: "Couldn't connect to start. Please try again.",
    saveError:
      "Your last answer was recorded here, but couldn't be saved — check your connection.",
  },
  fr: {
    startTitle: "Comment pouvons-nous vous aider?",
    startBody:
      "Une courte conversation — vendre avec une estimation préliminaire, ou acheter avec une consultation acheteur. Environ trois à cinq minutes.",
    startCta: "Commencer",
    languageLabel: "Langue",
    sellOrBuyAsk:
      "Souhaitez-vous vendre une propriété, ou en acheter une?",
    sell: "Vendre une propriété",
    buy: "Acheter une propriété",
    sellerIntro:
      "Parfait — je vais vous poser quelques questions sur votre propriété pour préparer une estimation préliminaire Estate Valora.",
    buyerIntro:
      "Parfait — je vais vous poser quelques questions sur ce que vous recherchez afin que l'équipe d'Ashkan puisse vous accompagner dans votre achat.",
    buyerDone:
      "Merci. J'ai enregistré vos préférences d'acheteur. Vous pouvez réserver une consultation téléphonique ou vidéo avec l'équipe d'Ashkan ci-dessous.",
    buyerPanelTitle: "Votre profil acheteur",
    buyerPanelNote:
      "Ces informations ont été enregistrées et transmises à l'équipe Estate Valora comme piste acheteur.",
    progressReady: "Prêt quand vous l'êtes",
    progressBuyer: "Consultation acheteur",
    progressSeller: "Estimation IA",
    progressBuyerDone: "Profil acheteur terminé",
    progressSellerDone: "Estimation terminée",
    connectError: "Impossible de démarrer. Veuillez réessayer.",
    saveError:
      "Votre dernière réponse est affichée ici, mais n'a pas pu être enregistrée — vérifiez votre connexion.",
  },
} as const;
