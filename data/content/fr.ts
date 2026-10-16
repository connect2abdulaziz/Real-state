/**
 * French (Québécois) site content — primary locale.
 * Draft for client review; refine wording with native / broker feedback.
 */
export const contentFr = {
  brand: {
    initials: "EV",
    name: "Estate Valora",
    title: "Perspective immobilière Montréal",
  },

  nav: [
    { label: "L'expérience", href: "#experience" },
    { label: "Votre rapport", href: "#report" },
    { label: "À propos", href: "#testimonials" },
  ],

  hero: {
    titleBefore: "L'évaluation de votre propriété en",
    titleItalic: "60 secondes.",
    description: "Amorcez la conversation — sans engagement.",
    cta: "Démarrer mon évaluation",
    ctaHref: "/valuation",
    secondary: "Vendez avec clarté.",
    scrollLabel: "DÉFILER POUR EXPLORER",
    stats: [
      { value: "$25M+", label: "Vendus" },
      { value: "15+", label: "Ans à accompagner les vendeurs" },
      { value: "92%", label: "Se sont sentis plus clairs après" },
    ],
  },

  media: {
    src: "/media/Montreal_Lights_by_Sky_Semijon_1080p.mp4",
    poster: "/media/hero-poster.webp",
  },

  experience: {
    index: "01",
    eyebrow: "L'EXPÉRIENCE",
    headline: [
      [
        { text: "Estate Valora", tone: "strong" },
        { text: " est conçu pour ceux", tone: "muted" },
      ],
      [
        { text: "qui recherchent ", tone: "muted" },
        { text: "clarté, confiance et", tone: "strong" },
      ],
      [
        { text: "une compréhension plus fine de la valeur —", tone: "strong" },
      ],
      [
        { text: "là où la technologie amorce la conversation", tone: "muted" },
      ],
      [
        { text: "et l'accompagnement vous aide à décider", tone: "strong" },
      ],
    ],
    body: "Nous créons un espace où l'insight et l'expertise s'équilibrent. Chaque étape est conçue pour ralentir les approximations — apportant clarté, confidentialité et une confiance tranquille avant de décider de la suite pour votre propriété.",
    cta: "Démarrer l'évaluation",
    ctaHref: "/valuation",
  },

  processSection: {
    index: "02",
    title: "Comment ça fonctionne",
    background: "/media/background_image.jpg",
  },

  process: [
    {
      number: "01",
      tag: "SAISIE",
      title: "Parlez-nous de votre propriété",
      description:
        "Partagez quelques détails sur votre bien grâce à une conversation guidée.",
    },
    {
      number: "02",
      tag: "ANALYSE",
      title: "Comprenez la fourchette estimée",
      description:
        "Découvrez une fourchette d'évaluation façonnée par les informations que vous fournissez.",
    },
    {
      number: "03",
      tag: "SUITE",
      title: "Choisissez la prochaine étape",
      description:
        "Poursuivez avec une consultation personnelle lorsque vous êtes prêt à aller plus loin.",
    },
  ],

  report: {
    index: "03",
    eyebrow: "VOTRE RAPPORT",
    title: "Une image plus claire de la valeur.",
    description:
      "Un aperçu structuré de la fourchette estimée, de ce qui la soutient, et de ce qu'elle ne peut pas affirmer.",
    sample: {
      brand: "Estate Valora",
      docLabel: "Aperçu d'insight",
      property: "Plateau-Mont-Royal",
      propertyType: "Condo · 2 ch.",
      rangeLow: "785 k$",
      rangeHigh: "842 k$",
      rangeLabel: "Fourchette estimée",
      strengths: [
        "Ventes comparables solides à proximité",
        "Rue et immeuble recherchés",
        "Rénovations intérieures récentes prises en compte",
      ],
      limitation:
        "Il s'agit d'une fourchette estimée pour amorcer la conversation — pas une évaluation formelle.",
    },
    floaters: [
      { label: "CONF.", value: "94%", position: "left-top" },
      { label: "COMPS", value: "12", position: "right-top" },
      { label: "A/A", value: "+6,2 %", position: "left-bottom" },
      { label: "MARCHÉ", value: "MTL", position: "right-bottom" },
    ],
    cta: "Voir ma fourchette de valeur",
    ctaHref: "/valuation",
  },

  listings: {
    index: "04",
    eyebrow: "PROPRIÉTÉS",
    title:
      "Plus que des espaces — des demeures choisies pour la clarté, le caractère et le calme.",
    description:
      "Un regard soigné sur des propriétés montréalaises — intérieurs raffinés et vie réfléchie.",
    items: [
      {
        id: "blainville",
        title: "Blainville",
        meta: "849 k$",
        image: "/images/Blainville.png",
      },
      {
        id: "fabreville",
        title: "Fabreville",
        meta: "899 k$",
        image: "/images/Fabreville_Laval.png",
      },
      {
        id: "ville-saint-laurent",
        title: "Ville Saint-Laurent",
        meta: "1,45 M$",
        image: "/images/Ville_Saint_Laurent.png",
      },
      {
        id: "tmr",
        title: "TMR",
        meta: "3,07 M$",
        image: "/images/TMR.png",
      },
      {
        id: "montreal",
        title: "Montréal",
        meta: "369 k$",
        image: "/images/Montréal_QC.png",
      },
      {
        id: "westmount",
        title: "Westmount",
        meta: "2,85 M$",
        image: "/images/Westmount.png",
      },
      {
        id: "laval",
        title: "Laval",
        meta: "869,9 k$",
        image: "/images/Laval_QC_869.png",
      },
      {
        id: "beaconsfield",
        title: "Beaconsfield",
        meta: "2,49 M$",
        image: "/images/Beaconsfield.png",
      },
      {
        id: "ddo",
        title: "DDO",
        meta: "749 k$",
        image: "/images/DDO.png",
      },
      {
        id: "brossard-15",
        title: "Brossard",
        meta: "1,5 M$",
        image: "/images/Brossard.png",
      },
      {
        id: "brossard-780",
        title: "Brossard",
        meta: "780 k$",
        image: "/images/Brossard_QC_780.png",
      },
    ],
  },

  testimonials: {
    index: "05",
    eyebrow: "VOIX",
    titleBefore: "Témoignages de",
    titleItalic: "nos clients",
    description:
      "Des retours authentiques qui reflètent clarté, soin et engagement — avant la prochaine décision.",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Rencontre avec des propriétaires",
    items: [
      {
        id: "t1",
        quote:
          "J'ai enfin compris la fourchette de ma propriété avant de mettre en marché. La conversation était simple, jamais insistante.",
        name: "Marie L.",
        role: "Vendeuse Plateau",
        rating: 5,
      },
      {
        id: "t2",
        quote:
          "Des chiffres clairs, des limites honnêtes, et un suivi humain quand j'en avais besoin. Exactement ce que je voulais.",
        name: "James K.",
        role: "Propriétaire Outremont",
        rating: 5,
      },
      {
        id: "t3",
        quote:
          "L'aperçu du rapport seul m'a donné confiance. Nous avons vendu avec bien moins de stress que prévu.",
        name: "Sofia R.",
        role: "Condo Griffintown",
        rating: 5,
      },
      {
        id: "t4",
        quote:
          "La technologie a amorcé la conversation — Ashkan l'a conclu. Un rare mélange de moderne et de personnel.",
        name: "Daniel P.",
        role: "Client Westmount",
        rating: 5,
      },
      {
        id: "t5",
        quote:
          "Aucune pression, juste de la clarté. Je savais ce qui façonnait l'estimé et quoi faire ensuite.",
        name: "Amélie T.",
        role: "Propriétaire Verdun",
        rating: 5,
      },
      {
        id: "t6",
        quote:
          "Une belle expérience du début à la fin. La fourchette d'évaluation collait de près à la réalité.",
        name: "Chris N.",
        role: "Loft Mile End",
        rating: 5,
      },
    ],
  },

  advisor: {
    eyebrow: "PERSPECTIVE PERSONNELLE",
    name: "Ashkan Shamloo",
    title: "Courtier immobilier agréé",
    description:
      "Quand la conversation a besoin d'une perspective humaine, Ashkan est là pour guider la prochaine décision.",
    cta: "Réserver une consultation",
  },

  faq: {
    index: "06",
    eyebrow: "FAQ",
    title: "Questions fréquentes",
    subtitle: "Des questions? Nous sommes là pour vous aider.",
    cta: "Vos questions",
    ctaHref: "#contact",
    footerNote: "La clarté avant de décider",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80",
    imageAlt: "Villa de luxe moderne au crépuscule",
    items: [
      {
        question: "S'agit-il d'une évaluation officielle?",
        answer:
          "Non. Estate Valora fournit une fourchette estimée pour amorcer la conversation — pas une évaluation formelle. Lorsque vous avez besoin d'une évaluation certifiée, Ashkan peut guider la prochaine étape.",
      },
      {
        question: "Pour qui est destinée cette expérience?",
        answer:
          "Les propriétaires montréalais qui veulent mieux comprendre ce qui façonne la valeur de leur propriété avant de mettre en marché, refinancer ou décider de la suite.",
      },
      {
        question: "Comment la fourchette estimée est-elle calculée?",
        answer:
          "Grâce à une conversation guidée sur votre propriété, des comparables locaux et le contexte du marché. Le rapport met en évidence les forces et les limites connues pour garder des attentes honnêtes.",
      },
      {
        question: "Que se passe-t-il après avoir vu ma fourchette?",
        answer:
          "Vous choisissez: prendre le temps d'y réfléchir, affiner les détails, ou réserver une consultation personnelle lorsque vous êtes prêt à aller plus loin.",
      },
      {
        question: "Mes renseignements restent-ils confidentiels?",
        answer:
          "Oui. Les détails que vous partagez servent à façonner votre insight et la conversation — pas à être vendus comme bruit marketing. La confidentialité fait partie de l'expérience.",
      },
    ],
  },

  contact: {
    index: "07",
    eyebrow: "CONTACT",
    tagline: "Conçu pour des décisions plus claires",
    line1Light: "Discutons de",
    line1Muted: "votre",
    line2Before: "propriété",
    line2After: "avec nous",
    cta: "Nous joindre",
    ctaHref: "mailto:hello@estatevalora.com",
    body: "Que vous prépariez une vente ou souhaitiez simplement y voir plus clair — amorcez une conversation tranquille avec Estate Valora.",
    email: "hello@estatevalora.com",
    socials: [
      { label: "Instagram", handle: "@estatevalora", href: "#" },
      { label: "LinkedIn", handle: "Estate Valora", href: "#" },
    ],
    chips: ["Insight immobilier", "Montréal"],
    footerNav: [
      { label: "Expérience", href: "#experience" },
      { label: "Rapport", href: "#report" },
      { label: "Propriétés", href: "#listings" },
      { label: "FAQ", href: "#faq" },
    ],
    footerNote: "Immobilier de luxe × IA × Montréal After Dark",
  },
} as const;
