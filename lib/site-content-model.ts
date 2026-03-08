import { capabilityCards, processSteps, trustPoints } from "@/components/site-data";

export type ContentCard = {
  title: string;
  copy: string;
  icon: string;
  image?: string;
};

export type SiteContent = {
  navigation: {
    contactButtonLabel: string;
    contactModalEyebrow: string;
    contactModalTitle: string;
    contactModalSubmitLabel: string;
    whatsappLabel: string;
    emailLabel: string;
    contactEmail: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    copy: string;
    backgroundImage: string;
    bookButtonLabel: string;
    trackButtonLabel: string;
  };
  services: {
    eyebrow: string;
    title: string;
    copy: string;
    cards: ContentCard[];
  };
  whyUs: {
    eyebrow: string;
    title: string;
    copy: string;
    image: string;
    points: ContentCard[];
  };
  process: {
    eyebrow: string;
    title: string;
    copy: string;
    steps: Array<Pick<ContentCard, "title" | "copy" | "icon">>;
  };
  contactCta: {
    eyebrow: string;
    title: string;
    copy: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
  customerPages: {
    eyebrow: string;
    bookTitle: string;
    bookCopy: string;
    bookHelper: string;
    trackTitle: string;
    trackCopy: string;
    trackHelper: string;
    stepLabels: {
      route: string;
      shipment: string;
      delivery: string;
      contact: string;
      payment: string;
    };
    contactTitle: string;
    contactCopy: string;
    paymentTitle: string;
    paymentCopy: string;
    transferTitle: string;
    transferCopy: string;
    paystackTitle: string;
    paystackCopy: string;
  };
};

export const defaultSiteContent: SiteContent = {
  navigation: {
    contactButtonLabel: "Get in Contact",
    contactModalEyebrow: "Contact Swift Signate",
    contactModalTitle: "Tell us about your shipment or support request.",
    contactModalSubmitLabel: "Send Request",
    whatsappLabel: "WhatsApp",
    emailLabel: "Email Us",
    contactEmail: "hello@swiftsignate.com"
  },
  hero: {
    eyebrow: "Swift Signate Logistics",
    title: "Reliable logistics services for businesses and everyday deliveries.",
    copy:
      "We help you move packages, stock, and commercial goods with simple booking, clear tracking, and dependable delivery support.",
    backgroundImage:
      "linear-gradient(90deg, rgba(10,10,10,0.72) 0%, rgba(10,10,10,0.58) 34%, rgba(10,10,10,0.28) 62%, rgba(10,10,10,0.18) 100%), url('https://images.pexels.com/photos/31856778/pexels-photo-31856778.jpeg?cs=srgb&dl=pexels-felipe-silva-1458994757-31856778.jpg&fm=jpg')",
    bookButtonLabel: "Book Shipment",
    trackButtonLabel: "Track Shipment"
  },
  services: {
    eyebrow: "Our Services",
    title: "Straightforward logistics support for shipping, delivery, and storage.",
    copy:
      "Whether you are moving parcels, retail stock, or scheduled deliveries, Swift Signate keeps the process organized and clear.",
    cards: capabilityCards
  },
  whyUs: {
    eyebrow: "Why Choose Swift Signate",
    title: "A logistics partner that keeps things clear from pickup to delivery.",
    copy:
      "We focus on dependable execution, useful updates, and customer-friendly service so shipments do not feel confusing or stressful.",
    image:
      "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.18)), url('https://images.pexels.com/photos/4483610/pexels-photo-4483610.jpeg?auto=compress&cs=tinysrgb&w=1200')",
    points: trustPoints
  },
  process: {
    eyebrow: "How It Works",
    title: "Book a shipment, receive a tracking number, and follow the delivery.",
    copy:
      "Every booking creates a tracking number automatically, so customers can look up the shipment while the admin team updates the status as it moves.",
    steps: processSteps
  },
  contactCta: {
    eyebrow: "Ready to Ship?",
    title: "Let Swift Signate handle your next delivery.",
    copy:
      "Speak with our team, request a quote, or track an existing shipment through a simple and familiar customer experience.",
    primaryLabel: "Request a Quote",
    secondaryLabel: "Track Shipment"
  },
  customerPages: {
    eyebrow: "Customer Services",
    bookTitle: "Book your shipment in clear, guided steps.",
    bookCopy:
      "Choose the shipment type, describe the package, review delivery options, enter contact details, and confirm payment.",
    bookHelper: "Payment confirmation creates your tracking number and air waybill automatically.",
    trackTitle: "Track your shipment in one simple view.",
    trackCopy: "Enter your tracking number to see the latest shipment status, route, and delivery progress.",
    trackHelper: "Use the tracking number from your booking confirmation to look up the latest shipment update.",
    stepLabels: {
      route: "Route & shipper",
      shipment: "Shipment details",
      delivery: "Delivery options",
      contact: "Contact details",
      payment: "Payment"
    },
    contactTitle: "Contact details",
    contactCopy: "Enter the sender and receiver details for pickup and delivery before you move to payment.",
    paymentTitle: "Payment",
    paymentCopy:
      "Choose a payment option to finish the booking. Tracking number and air waybill will be created only after payment is confirmed.",
    transferTitle: "Direct transfer",
    transferCopy: "Transfer to Swift Signate, then wait for finance confirmation before the shipment is issued.",
    paystackTitle: "Paystack",
    paystackCopy: "This checkout can be integrated later for live card and bank payments. The payment step is already prepared for it."
  }
};

export function mergeSiteContent(content: Partial<SiteContent> | null | undefined): SiteContent {
  const parsed = content ?? {};

  return {
    ...defaultSiteContent,
    ...parsed,
    navigation: {
      ...defaultSiteContent.navigation,
      ...parsed.navigation
    },
    hero: {
      ...defaultSiteContent.hero,
      ...parsed.hero
    },
    services: {
      ...defaultSiteContent.services,
      ...parsed.services,
      cards: parsed.services?.cards ?? defaultSiteContent.services.cards
    },
    whyUs: {
      ...defaultSiteContent.whyUs,
      ...parsed.whyUs,
      points: parsed.whyUs?.points ?? defaultSiteContent.whyUs.points
    },
    process: {
      ...defaultSiteContent.process,
      ...parsed.process,
      steps: parsed.process?.steps ?? defaultSiteContent.process.steps
    },
    contactCta: {
      ...defaultSiteContent.contactCta,
      ...parsed.contactCta
    },
    customerPages: {
      ...defaultSiteContent.customerPages,
      ...parsed.customerPages,
      stepLabels: {
        ...defaultSiteContent.customerPages.stepLabels,
        ...parsed.customerPages?.stepLabels
      }
    }
  };
}
