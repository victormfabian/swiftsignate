import { capabilityCards, processSteps, trustPoints } from "@/components/site-data";

export type ContentCard = {
  title: string;
  copy: string;
  icon: string;
  image?: string;
};

export type BookingRouteCountry = {
  name: string;
  featuredForPickup: boolean;
  featuredForDestination: boolean;
  cities: string[];
};

export type BookingRouteRate = {
  id: string;
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  deliveryOptionId: string;
  ratePerKg: number;
  minimumTotal: number;
};

export type BookingPackagingOption = {
  id: string;
  label: string;
  description: string;
  icon: string;
  priceAdjustment: number;
};

export type BookingDeliveryOption = {
  id: string;
  title: string;
  operator: string;
  etaHeadline: string;
  etaDetail: string;
  pickupNote: string;
  priceAdjustment: number;
};

export type BookingPricingConfig = {
  businessMarkup: number;
  liabilitySurcharge: number;
  residentialAddressSurcharge: number;
  additionalPackageSurcharge: number;
  volumetricDivisor: number;
  minimumChargeableWeight: number;
};

export type BookingConfig = {
  routeCountries: BookingRouteCountry[];
  routeRates: BookingRouteRate[];
  packageCountSuggestions: number[];
  packagingOptions: BookingPackagingOption[];
  deliveryOptions: BookingDeliveryOption[];
  pricing: BookingPricingConfig;
};

export type SiteContent = {
  navigation: {
    logoMedia: string;
    contactButtonLabel: string;
    contactModalTitle: string;
    contactModalSubmitLabel: string;
    whatsappHref: string;
    whatsappLabel: string;
    emailLabel: string;
    contactEmail: string;
  };
  footer: {
    facebookHref: string;
    instagramHref: string;
    tiktokHref: string;
    xHref: string;
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
  bookingConfig: BookingConfig;
};

export const defaultBookingConfig: BookingConfig = {
  routeCountries: [
    {
      name: "Nigeria",
      featuredForPickup: true,
      featuredForDestination: false,
      cities: ["Lagos", "Abuja", "Port Harcourt"]
    },
    {
      name: "Ghana",
      featuredForPickup: true,
      featuredForDestination: false,
      cities: ["Accra", "Kumasi", "Tema"]
    },
    {
      name: "Kenya",
      featuredForPickup: true,
      featuredForDestination: false,
      cities: ["Nairobi", "Mombasa", "Kisumu"]
    },
    {
      name: "South Africa",
      featuredForPickup: true,
      featuredForDestination: false,
      cities: ["Johannesburg", "Cape Town", "Durban"]
    },
    {
      name: "United Arab Emirates",
      featuredForPickup: false,
      featuredForDestination: true,
      cities: ["Dubai", "Abu Dhabi", "Sharjah"]
    },
    {
      name: "United States of America",
      featuredForPickup: false,
      featuredForDestination: true,
      cities: ["New York", "Houston", "Atlanta"]
    },
    {
      name: "United Kingdom",
      featuredForPickup: false,
      featuredForDestination: true,
      cities: ["London", "Manchester", "Birmingham"]
    },
    {
      name: "Canada",
      featuredForPickup: false,
      featuredForDestination: true,
      cities: ["Toronto", "Vancouver", "Calgary"]
    },
    {
      name: "Germany",
      featuredForPickup: false,
      featuredForDestination: false,
      cities: ["Berlin", "Hamburg", "Frankfurt"]
    }
  ],
  routeRates: [
    {
      id: "ng-gh-dhl",
      fromCountry: "Nigeria",
      fromCity: "",
      toCountry: "Ghana",
      toCity: "",
      deliveryOptionId: "dhl-express",
      ratePerKg: 5000,
      minimumTotal: 15000
    },
    {
      id: "ng-gh-fedex",
      fromCountry: "Nigeria",
      fromCity: "",
      toCountry: "Ghana",
      toCity: "",
      deliveryOptionId: "fedex-priority",
      ratePerKg: 6000,
      minimumTotal: 18000
    },
    {
      id: "ng-gh-swift",
      fromCountry: "Nigeria",
      fromCity: "",
      toCountry: "Ghana",
      toCity: "",
      deliveryOptionId: "swift-economy",
      ratePerKg: 4200,
      minimumTotal: 13000
    },
    {
      id: "ng-ke-dhl",
      fromCountry: "Nigeria",
      fromCity: "",
      toCountry: "Kenya",
      toCity: "",
      deliveryOptionId: "dhl-express",
      ratePerKg: 8200,
      minimumTotal: 22000
    },
    {
      id: "ng-ke-fedex",
      fromCountry: "Nigeria",
      fromCity: "",
      toCountry: "Kenya",
      toCity: "",
      deliveryOptionId: "fedex-priority",
      ratePerKg: 9100,
      minimumTotal: 25000
    },
    {
      id: "ng-ae-dhl",
      fromCountry: "Nigeria",
      fromCity: "",
      toCountry: "United Arab Emirates",
      toCity: "",
      deliveryOptionId: "dhl-express",
      ratePerKg: 10500,
      minimumTotal: 28000
    },
    {
      id: "ng-uk-fedex",
      fromCountry: "Nigeria",
      fromCity: "",
      toCountry: "United Kingdom",
      toCity: "",
      deliveryOptionId: "fedex-priority",
      ratePerKg: 11750,
      minimumTotal: 32000
    },
    {
      id: "gh-ng-swift",
      fromCountry: "Ghana",
      fromCity: "",
      toCountry: "Nigeria",
      toCity: "",
      deliveryOptionId: "swift-economy",
      ratePerKg: 4100,
      minimumTotal: 13000
    }
  ],
  packageCountSuggestions: [1, 2, 3, 4],
  packagingOptions: [
    {
      id: "custom-packaging",
      label: "Your Packaging",
      description: "Ship using your own prepared parcel or carton.",
      icon: "clipboard",
      priceAdjustment: 0
    },
    {
      id: "document-envelope",
      label: "Document Envelope",
      description: "Slim packaging for contracts, letters, and flat items.",
      icon: "quote",
      priceAdjustment: -750
    },
    {
      id: "standard-box",
      label: "Standard Box",
      description: "Standard parcel box for small packaged goods.",
      icon: "delivery",
      priceAdjustment: 0
    },
    {
      id: "large-carton",
      label: "Large Carton",
      description: "Large carton option for bulkier boxed shipments.",
      icon: "warehouse",
      priceAdjustment: 1200
    },
    {
      id: "palletized-freight",
      label: "Palletized Freight",
      description: "Freight handling for palletized commercial cargo.",
      icon: "freight",
      priceAdjustment: 4500
    }
  ],
  deliveryOptions: [
    {
      id: "dhl-express",
      title: "DHL Express",
      operator: "DHL",
      etaHeadline: "1-2 business days",
      etaDetail: "priority international air",
      pickupNote: "Fastest line for urgent cross-border deliveries.",
      priceAdjustment: 0
    },
    {
      id: "fedex-priority",
      title: "FedEx Priority",
      operator: "FedEx",
      etaHeadline: "2-3 business days",
      etaDetail: "priority door delivery",
      pickupNote: "Reliable express handling with premium transit support.",
      priceAdjustment: 0
    },
    {
      id: "swift-economy",
      title: "Swift Economy",
      operator: "Swift Signate",
      etaHeadline: "3-5 business days",
      etaDetail: "consolidated air cargo",
      pickupNote: "Value option for customers who want a lower route rate.",
      priceAdjustment: 0
    }
  ],
  pricing: {
    businessMarkup: 3000,
    liabilitySurcharge: 2500,
    residentialAddressSurcharge: 2000,
    additionalPackageSurcharge: 1500,
    volumetricDivisor: 5000,
    minimumChargeableWeight: 0.5
  }
};

export const defaultSiteContent: SiteContent = {
  navigation: {
    logoMedia: "",
    contactButtonLabel: "Contact Us",
    contactModalTitle: "Tell us about your shipment or support request.",
    contactModalSubmitLabel: "Send Request",
    whatsappHref: "",
    whatsappLabel: "WhatsApp",
    emailLabel: "Email Us",
    contactEmail: "hello@swiftsignate.com"
  },
  footer: {
    facebookHref: "",
    instagramHref: "",
    tiktokHref: "",
    xHref: ""
  },
  hero: {
    eyebrow: "Swift Signate Logistics",
    title: "Reliable logistics services for businesses and everyday deliveries.",
    copy:
      "We help you monitor packages, stock, and commercial goods with clear tracking updates and dependable delivery support.",
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
    title: "Receive a tracking number and follow the delivery.",
    copy:
      "Every shipment carries a tracking number, so customers can look up the status while the Swift Signate team updates it as it moves.",
    steps: processSteps
  },
  contactCta: {
    eyebrow: "Ready to Ship?",
    title: "Let Swift Signate handle your next delivery.",
    copy:
      "Speak with our team or track an existing shipment through a simple and familiar customer experience.",
    primaryLabel: "Contact Us",
    secondaryLabel: "Track Shipment"
  },
  customerPages: {
    eyebrow: "Customer Services",
    bookTitle: "Book your shipment in clear, guided steps.",
    bookCopy:
      "Choose the shipment type, describe the package, review the request, and confirm payment.",
    bookHelper: "Payment confirmation creates your tracking number automatically.",
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
      "Choose a payment option to finish the booking. Tracking number will be created only after payment is confirmed.",
    transferTitle: "Direct transfer",
    transferCopy: "Transfer to Swift Signate, then wait for finance confirmation before the shipment is issued.",
    paystackTitle: "Paystack",
    paystackCopy: "This checkout can be integrated later for live card and bank payments. The payment step is already prepared for it."
  },
  bookingConfig: defaultBookingConfig
};

export function mergeSiteContent(content: Partial<SiteContent> | null | undefined): SiteContent {
  const parsed = content ?? {};
  const navigation = {
    ...defaultSiteContent.navigation,
    ...parsed.navigation
  };

  if (navigation.contactButtonLabel === "Get in Contact") {
    navigation.contactButtonLabel = defaultSiteContent.navigation.contactButtonLabel;
  }

  return {
    ...defaultSiteContent,
    ...parsed,
    navigation,
    footer: {
      ...defaultSiteContent.footer,
      ...parsed.footer
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
      ...parsed.contactCta,
      primaryLabel:
        parsed.contactCta?.primaryLabel === "Request a Quote"
          ? defaultSiteContent.contactCta.primaryLabel
          : (parsed.contactCta?.primaryLabel ?? defaultSiteContent.contactCta.primaryLabel)
    },
    customerPages: {
      ...defaultSiteContent.customerPages,
      ...parsed.customerPages,
      stepLabels: {
        ...defaultSiteContent.customerPages.stepLabels,
        ...parsed.customerPages?.stepLabels
      }
    },
    bookingConfig: {
      ...defaultBookingConfig,
      ...parsed.bookingConfig,
      routeCountries: parsed.bookingConfig?.routeCountries ?? defaultBookingConfig.routeCountries,
      routeRates: parsed.bookingConfig?.routeRates ?? defaultBookingConfig.routeRates,
      packageCountSuggestions:
        parsed.bookingConfig?.packageCountSuggestions ?? defaultBookingConfig.packageCountSuggestions,
      packagingOptions: parsed.bookingConfig?.packagingOptions ?? defaultBookingConfig.packagingOptions,
      deliveryOptions: parsed.bookingConfig?.deliveryOptions ?? defaultBookingConfig.deliveryOptions,
      pricing: {
        ...defaultBookingConfig.pricing,
        ...parsed.bookingConfig?.pricing
      }
    }
  };
}
