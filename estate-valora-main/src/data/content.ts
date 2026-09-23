/**
 * Site content — keep copy here so layout/components stay presentation-only.
 * Placeholder values for scaffolding; refine during design phases.
 */

export const siteContent = {
  brand: {
    initials: "EV",
    name: "Estate Valora",
    title: "Property Insight Montreal",
  },

  nav: [
    { label: "Experience", href: "#experience" },
    { label: "Your Report", href: "#report" },
    { label: "About", href: "#testimonials" },
  ],

  hero: {
    titleBefore: "Sell your home with",
    titleItalic: "clarity.",
    description: "Understand your range before you decide.",
    cta: "See my value range",
    ctaHref: "#experience",
    scrollLabel: "SCROLL TO EXPLORE",
    /** Confirm remaining figures with client — $25M+ is confirmed */
    stats: [
      { value: "$25M+", label: "Sold" },
      { value: "15+", label: "Years guiding sellers" },
      { value: "92%", label: "Felt clearer after" },
    ],
  },

  /**
   * Hero media — self-hosted in /public/media/
   */
  media: {
    src: "/media/Montreal_Lights_by_Sky_Semijon_1080p.mp4",
    poster: "/media/hero-poster.webp",
  },

  experience: {
    index: "01",
    eyebrow: "THE EXPERIENCE",
    /** Alternating emphasis: "strong" = foreground, "muted" = gray */
    headline: [
      [
        { text: "Estate Valora", tone: "strong" },
        { text: " is designed for those", tone: "muted" },
      ],
      [
        { text: "who seek ", tone: "muted" },
        { text: "clarity, confidence, and", tone: "strong" },
      ],
      [
        { text: "a deeper understanding of value —", tone: "strong" },
      ],
      [
        { text: "where technology starts the talk", tone: "muted" },
      ],
      [
        { text: "and guidance helps you decide", tone: "strong" },
      ],
    ],
    body: "We create a space where insight and expertise exist in balance. Every step is designed to slow the guesswork — bringing clarity, privacy, and quiet confidence before you decide what comes next for your home.",
    cta: "Start Valuation",
    ctaHref: "#process",
  },

  processSection: {
    index: "02",
    title: "How it works",
    background: "/media/background_image.jpg",
  },

  process: [
    {
      number: "01",
      tag: "INPUT",
      title: "Tell us about your home",
      description:
        "Share a few details about your property through a guided conversation.",
    },
    {
      number: "02",
      tag: "ANALYSIS",
      title: "Understand estimated range",
      description:
        "See an estimated valuation range shaped by the information you provide.",
    },
    {
      number: "03",
      tag: "OUTCOME",
      title: "Choose what comes next",
      description:
        "Continue with a personal consultation when you're ready to go deeper.",
    },
  ],

  report: {
    index: "03",
    eyebrow: "YOUR REPORT",
    title: "A clearer picture of value.",
    description:
      "A structured preview of estimated range, what supports it, and what it cannot claim.",
    sample: {
      brand: "Estate Valora",
      docLabel: "Sample insight",
      property: "Plateau-Mont-Royal",
      propertyType: "Condo · 2 bed",
      rangeLow: "$785K",
      rangeHigh: "$842K",
      rangeLabel: "Estimated range",
      strengths: [
        "Strong comparable sales nearby",
        "Desirable street & building profile",
        "Recent interior updates reflected",
      ],
      limitation:
        "This is an estimated range to start the conversation — not a formal appraisal.",
    },
    floaters: [
      { label: "CONF.", value: "94%", position: "left-top" },
      { label: "COMPS", value: "12", position: "right-top" },
      { label: "YoY", value: "+6.2%", position: "left-bottom" },
      { label: "MARKET", value: "MTL", position: "right-bottom" },
    ],
    cta: "See my value range",
    ctaHref: "#experience",
  },

  listings: {
    index: "04",
    eyebrow: "LISTINGS",
    title:
      "More than just space — homes chosen for clarity, character, and calm.",
    description:
      "A curated look at Montreal properties — refined interiors and thoughtful living.",
    items: [
      {
        id: "plateau-loft",
        title: "Plateau Loft Residence",
        meta: "2 bed · $825K",
        image:
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "outremont-suite",
        title: "Outremont Garden Suite",
        meta: "3 bed · $1.1M",
        image:
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "griffintown-condo",
        title: "Griffintown Sky Condo",
        meta: "1 bed · $620K",
        image:
          "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "westmount-home",
        title: "Westmount Heritage Home",
        meta: "4 bed · $2.4M",
        image:
          "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "verdun-riverside",
        title: "Verdun Riverside Flat",
        meta: "2 bed · $710K",
        image:
          "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "mile-end-studio",
        title: "Mile End Studio Loft",
        meta: "Studio · $485K",
        image:
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },

  testimonials: {
    index: "05",
    eyebrow: "VOICES",
    titleBefore: "Our clients'",
    titleItalic: "Testimonials",
    description:
      "Real feedback that reflects clarity, care, and commitment — before the next decision.",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Advisor meeting with homeowners",
    items: [
      {
        id: "t1",
        quote:
          "I finally understood my home's range before listing. The conversation felt simple, never pushy.",
        name: "Marie L.",
        role: "Plateau seller",
        rating: 5,
      },
      {
        id: "t2",
        quote:
          "Clear numbers, honest limits, and a human follow-up when I needed it. Exactly what I wanted.",
        name: "James K.",
        role: "Outremont owner",
        rating: 5,
      },
      {
        id: "t3",
        quote:
          "The report preview alone gave me confidence. We sold with far less stress than expected.",
        name: "Sofia R.",
        role: "Griffintown condo",
        rating: 5,
      },
      {
        id: "t4",
        quote:
          "Technology started the talk — Ashkan finished it. A rare mix of modern and personal.",
        name: "Daniel P.",
        role: "Westmount client",
        rating: 5,
      },
      {
        id: "t5",
        quote:
          "No pressure, just clarity. I knew what shaped the estimate and what to do next.",
        name: "Amélie T.",
        role: "Verdun homeowner",
        rating: 5,
      },
      {
        id: "t6",
        quote:
          "Beautiful experience end to end. The valuation range matched reality closely.",
        name: "Chris N.",
        role: "Mile End loft",
        rating: 5,
      },
    ],
  },

  advisor: {
    eyebrow: "PERSONAL PERSPECTIVE",
    name: "Ashkan Shamloo",
    title: "Licensed Real Estate Broker",
    description:
      "When the conversation needs a human perspective, Ashkan is here to guide the next decision.",
    cta: "Book a consultation",
  },

  faq: {
    index: "06",
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    subtitle: "Have questions? We're here to help you.",
    cta: "Your questions",
    ctaHref: "#contact",
    footerNote: "Clarity before you decide",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80",
    imageAlt: "Modern luxury villa exterior at dusk",
    items: [
      {
        question: "Is this an official appraisal?",
        answer:
          "No. Estate Valora provides an estimated range to start the conversation — not a formal appraisal. When you need certified valuation, Ashkan can guide the next step.",
      },
      {
        question: "Who is this experience for?",
        answer:
          "Montreal homeowners who want a clearer sense of what shapes their property's value before listing, refinancing, or deciding what comes next.",
      },
      {
        question: "How is the estimated range calculated?",
        answer:
          "Through a guided conversation about your home, local comparables, and market context. The report highlights strengths and known limitations so expectations stay honest.",
      },
      {
        question: "What happens after I see my range?",
        answer:
          "You choose: sit with the insight, refine details, or book a personal consultation when you’re ready for deeper guidance.",
      },
      {
        question: "Is my information kept private?",
        answer:
          "Yes. Details you share are used to shape your insight and conversation — not sold as marketing noise. Privacy is part of the experience.",
      },
    ],
  },

  contact: {
    index: "07",
    eyebrow: "CONTACT",
    tagline: "Designed for clearer decisions",
    line1Light: "Let's discuss your",
    line1Muted: "home's",
    line2Before: "value",
    line2After: "with us",
    cta: "Get in touch",
    ctaHref: "mailto:hello@estatevalora.com",
    body: "Whether you're preparing to sell or simply want clarity — start a quiet conversation with Estate Valora.",
    email: "hello@estatevalora.com",
    socials: [
      { label: "Instagram", handle: "@estatevalora", href: "#" },
      { label: "LinkedIn", handle: "Estate Valora", href: "#" },
    ],
    chips: ["Property insight", "Montreal"],
    footerNav: [
      { label: "Experience", href: "#experience" },
      { label: "Report", href: "#report" },
      { label: "Listings", href: "#listings" },
      { label: "FAQ", href: "#faq" },
    ],
    footerNote: "Luxury real estate × AI × Montreal After Dark",
  },
} as const;

export type SiteContent = typeof siteContent;
