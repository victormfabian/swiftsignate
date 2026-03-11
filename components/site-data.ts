export const primaryLinks = [
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why-us" },
  { label: "Tracking", href: "#tracking" },
  { label: "Contact", href: "#contact" }
];

export const heroStats = [
  { label: "On-time deliveries", value: "98%" },
  { label: "Support available", value: "24/7" },
  { label: "Cities covered", value: "120+" }
];

export const capabilityCards = [
  {
    title: "Road Freight",
    icon: "freight",
    copy: "Reliable movement of goods across cities and regions for businesses of all sizes.",
    image:
      "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url('https://images.pexels.com/photos/2199293/pexels-photo-2199293.jpeg?auto=compress&cs=tinysrgb&w=1200')"
  },
  {
    title: "Express Delivery",
    icon: "express",
    copy: "Fast delivery options for urgent parcels, commercial orders, and time-sensitive shipments.",
    image:
      "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.16)), url('https://images.pexels.com/photos/4246120/pexels-photo-4246120.jpeg?auto=compress&cs=tinysrgb&w=1200')"
  },
  {
    title: "Warehousing Support",
    icon: "warehouse",
    copy: "Safe storage, handling, and organized dispatch for inventory that needs extra care.",
    image:
      "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.16)), url('https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=1200')"
  }
];

export const trustPoints = [
  {
    title: "Easy booking process",
    copy: "Request a shipment, confirm your details, and get updates without confusion.",
    icon: "clipboard"
  },
  {
    title: "Clear shipment tracking",
    copy: "Customers always know where their goods are and when they should arrive.",
    icon: "tracking"
  },
  {
    title: "Professional support team",
    copy: "Our logistics team is ready to help with routing, delivery questions, and urgent needs.",
    icon: "support"
  }
];

export const processSteps = [
  {
    title: "Request a quote",
    copy: "Tell us what you need moved, where it is going, and when it should arrive.",
    icon: "quote"
  },
  {
    title: "We arrange the shipment",
    copy: "Our team plans the best route and handling option for your delivery.",
    icon: "route"
  },
  {
    title: "Track to delivery",
    copy: "Stay updated from pickup to final drop-off with clear shipment progress.",
    icon: "delivery"
  }
];

export const dashboardMetrics = [
  { label: "Active shipments", value: "412", delta: "+18 today" },
  { label: "Average transit gain", value: "14%", delta: "vs. baseline" },
  { label: "Incident alerts", value: "03", delta: "all contained" }
];

export const recentBookings = [
  { ref: "SS20491", lane: "Lagos -> Nairobi", eta: "4h 20m", status: "In transit" },
  { ref: "SS20488", lane: "Abuja -> Accra", eta: "Awaiting load", status: "Queued" },
  { ref: "SS20472", lane: "Port Harcourt -> Dakar", eta: "Delivered 08:40", status: "Delivered" },
  { ref: "SS20451", lane: "Ibadan -> Kigali", eta: "Customs review", status: "Review" }
];

export const quickActions = [
  {
    title: "New Booking",
    detail: "Start a new delivery request with pickup, destination, and package details."
  },
  {
    title: "Live Tracking",
    detail: "Check the latest status of any shipment using its tracking number."
  }
];

export const trackingRecords = [
  {
    ref: "SS20491",
    customer: "BlueWave Retail",
    route: "Lagos -> Nairobi",
    status: "In transit",
    eta: "Today, 4:20 PM",
    lastUpdate: "Shipment departed regional hub at 10:15 AM.",
    checkpoints: ["Booked", "Picked up", "At regional hub", "In transit", "Out for delivery"]
  },
  {
    ref: "SS20488",
    customer: "Prime Mart",
    route: "Abuja -> Accra",
    status: "Queued",
    eta: "Tomorrow, 9:30 AM",
    lastUpdate: "Shipment is waiting for loading confirmation.",
    checkpoints: ["Booked", "Preparing load", "Queued", "In transit", "Delivered"]
  },
  {
    ref: "SS20472",
    customer: "Northline Foods",
    route: "Port Harcourt -> Dakar",
    status: "Delivered",
    eta: "Delivered at 8:40 AM",
    lastUpdate: "Delivery completed and received by customer.",
    checkpoints: ["Booked", "Picked up", "In transit", "Out for delivery", "Delivered"]
  }
];

export const adminMetrics = [
  { label: "Fleet utilization", value: "87%", trend: "+4.1%" },
  { label: "Cross-border latency", value: "11m", trend: "-2.3m" },
  { label: "Tickets in rotation", value: "26", trend: "-8 open" },
  { label: "Driver readiness", value: "94%", trend: "+6.5%" }
];

export const adminBars = [
  { label: "Mon", value: 62 },
  { label: "Tue", value: 78 },
  { label: "Wed", value: 54 },
  { label: "Thu", value: 91 },
  { label: "Fri", value: 74 },
  { label: "Sat", value: 83 }
];

export const usersTable = [
  { name: "Amara Okafor", role: "Enterprise Ops", region: "West Africa", status: "Active" },
  { name: "Daniel Hart", role: "Broker", region: "Benelux", status: "Review" },
  { name: "Sophia Nasser", role: "Dispatcher", region: "Middle East", status: "Active" },
  { name: "Ifeanyi Cole", role: "Finance Control", region: "UK Hub", status: "Provisioning" }
];

export const routingTable = [
  { unit: "TR-88", route: "Lagos -> Kano", driver: "I. Sani", state: "Rolling" },
  { unit: "VX-14", route: "Tema -> Abidjan", driver: "E. Mensah", state: "Service check" },
  { unit: "AR-32", route: "Dubai -> Doha", driver: "M. Saleh", state: "Rolling" },
  { unit: "RS-07", route: "Rotterdam -> Lille", driver: "A. Laurent", state: "Standby" }
];

export const ticketTable = [
  { id: "TK-9001", issue: "Cold-chain threshold spike", priority: "High", owner: "Systems Desk" },
  { id: "TK-8996", issue: "Port gate credential retry", priority: "Medium", owner: "Access Ops" },
  { id: "TK-8988", issue: "Lane reassignment approval", priority: "Medium", owner: "Dispatch Control" },
  { id: "TK-8971", issue: "Manifest checksum mismatch", priority: "Low", owner: "Compliance Desk" }
];
