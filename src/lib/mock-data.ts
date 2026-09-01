export type Role = "farmer" | "buyer" | "supplier" | "transporter" | "admin";

export const ROLE_LABELS: Record<Role, string> = {
  farmer: "Farmer",
  buyer: "Buyer",
  supplier: "Input Supplier",
  transporter: "Transporter",
  admin: "Admin",
};

export type Language = "rw" | "en" | "fr";

export const LANGUAGE_LABELS: Record<Language, string> = {
  rw: "Kinyarwanda",
  en: "English",
  fr: "Français",
};

export type ReliabilityTier = "new" | "trusted" | "verified";

export const RELIABILITY_TIER_LABELS: Record<ReliabilityTier, string> = {
  new: "New",
  trusted: "Trusted",
  verified: "Verified",
};

export function reliabilityTier(score: number): ReliabilityTier {
  if (score >= 80) return "verified";
  if (score >= 50) return "trusted";
  return "new";
}

export type LocationLevel = "region" | "district" | "sector" | "cell" | "village";

export const LOCATION_LEVEL_LABELS: Record<LocationLevel, string> = {
  region: "Region",
  district: "District",
  sector: "Sector",
  cell: "Cell",
  village: "Village",
};

export interface Location {
  id: string;
  name: string;
  level: LocationLevel;
  parentId: string | null;
}

export type CategoryType = "produce" | "input";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
}

export type Unit = "kg" | "ton" | "bag" | "litre" | "piece";

export const UNIT_LABELS: Record<Unit, string> = {
  kg: "kg",
  ton: "ton",
  bag: "bag (50kg)",
  litre: "litre",
  piece: "piece",
};

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  type: CategoryType;
  defaultUnit: Unit;
  /** for post-harvest spoilage alerts (§8.5); undefined for inputs */
  shelfLifeDays?: number;
}

export type OrganizationType =
  "cooperative" | "distributor" | "retailer" | "ngo" | "government" | "supplier" | "farm_group";

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  cooperative: "Cooperative",
  distributor: "Distributor",
  retailer: "Retailer",
  ngo: "NGO",
  government: "Government",
  supplier: "Supplier",
  farm_group: "Farm Group",
};

export interface Cooperative {
  id: string;
  name: string;
  districtId: string;
  registrationNumber: string;
  organizationType: OrganizationType;
}

export type UserStatus = "active" | "suspended";

export interface Endorsement {
  id: string;
  endorserId: string;
  endorsedId: string;
  note: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  roles: Role[];
  preferredLanguage: Language;
  locationId: string;
  nationalId?: string;
  isVerified: boolean;
  reliabilityScore: number;
  cooperativeId?: string;
  avatarColorIndex: number;
  status: UserStatus;
  createdAt: string;
}

export function primaryRole(user: User): Role {
  return user.roles[0] ?? "farmer";
}

export type ListingScope = "peer" | "commercial";
export type ListingStatus = "available" | "reserved" | "sold" | "expired";

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  expired: "Expired",
};

export interface ProduceListing {
  id: string;
  sellerId: string;
  productId: string;
  quantity: number;
  unit: Unit;
  unitPrice: number | null;
  negotiable: boolean;
  locationId: string;
  harvestDate: string;
  qualityGrade?: string;
  listingScope: ListingScope;
  status: ListingStatus;
  expiresAt: string;
  createdAt: string;
}

export type RequestStatus = "open" | "partially_filled" | "filled" | "cancelled";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Open",
  partially_filled: "Partially filled",
  filled: "Filled",
  cancelled: "Cancelled",
};

export interface BuyerRequest {
  id: string;
  buyerId: string;
  productId: string;
  quantityNeeded: number;
  unit: Unit;
  targetPrice: number | null;
  deliveryLocationId: string;
  neededByDate: string;
  status: RequestStatus;
  createdAt: string;
}

export type AggregationType = "sale" | "input_purchase";
export type AggregationStatus = "proposed" | "confirmed" | "partially_confirmed" | "cancelled";

export const AGGREGATION_STATUS_LABELS: Record<AggregationStatus, string> = {
  proposed: "Proposed",
  confirmed: "Confirmed",
  partially_confirmed: "Partially confirmed",
  cancelled: "Cancelled",
};

export interface AggregationGroup {
  id: string;
  type: AggregationType;
  requestId: string | null;
  status: AggregationStatus;
  targetQuantity: number;
  unit: Unit;
  unitPrice: number;
  deadline: string;
  createdAt: string;
}

export type ParticipantStatus = "pending" | "accepted" | "declined";

export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

export interface AggregationParticipant {
  id: string;
  groupId: string;
  listingId: string;
  farmerId: string;
  allocatedQuantity: number;
  status: ParticipantStatus;
  agreedUnitPrice: number;
}

export interface InputListing {
  id: string;
  supplierId: string;
  productId: string;
  unit: Unit;
  price: number;
  stockQty: number;
  deliveryDistrictIds: string[];
  createdAt: string;
}

export type GroupPurchaseStatus = "collecting" | "fulfilled" | "expired";

export const GROUP_PURCHASE_STATUS_LABELS: Record<GroupPurchaseStatus, string> = {
  collecting: "Collecting pledges",
  fulfilled: "Fulfilled",
  expired: "Expired",
};

export interface GroupPurchase {
  id: string;
  inputListingId: string;
  thresholdQuantity: number;
  deadline: string;
  status: GroupPurchaseStatus;
  supplierInvoiceTotal: number | null;
  createdAt: string;
}

export interface GroupPurchasePledge {
  id: string;
  groupPurchaseId: string;
  farmerId: string;
  pledgedQuantity: number;
  computedShareAmount: number | null;
}

export type TransactionStatus =
  "pending" | "confirmed_by_seller" | "confirmed_by_buyer" | "completed" | "disputed";

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: "Pending",
  confirmed_by_seller: "Confirmed by seller",
  confirmed_by_buyer: "Confirmed by buyer",
  completed: "Completed",
  disputed: "Disputed",
};

export interface Transaction {
  id: string;
  buyerId: string;
  sellerId: string;
  groupId: string | null;
  productId: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  status: TransactionStatus;
  confirmedBySeller: boolean;
  confirmedByBuyer: boolean;
  disputeReason?: string;
  createdAt: string;
  completedAt: string | null;
}

export interface Rating {
  id: string;
  transactionId: string;
  ratedBy: string;
  ratedUser: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  participantIds: string[];
  subject: string;
  relatedListingId?: string;
  relatedRequestId?: string;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  sentAt: string;
}

export type PriceSource = "transaction" | "manual_survey";

export interface MarketPriceRecord {
  id: string;
  productId: string;
  districtId: string;
  avgPrice: number;
  sampleDate: string;
  source: PriceSource;
}

export type NotificationKind =
  "new_match" | "aggregation_invite" | "spoilage_alert" | "group_purchase" | "transaction" | "system";

export interface NotificationLog {
  id: string;
  timestamp: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  detail: string;
}

function day(offset: number) {
  const d = new Date(2026, 8, 1);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function hoursAgo(hours: number) {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

/* --------------------------------- Locations -------------------------------- */

export const locations: Location[] = [
  { id: "reg-kigali", name: "Kigali City", level: "region", parentId: null },
  { id: "reg-north", name: "Northern Province", level: "region", parentId: null },
  { id: "reg-south", name: "Southern Province", level: "region", parentId: null },
  { id: "reg-east", name: "Eastern Province", level: "region", parentId: null },
  { id: "reg-west", name: "Western Province", level: "region", parentId: null },

  { id: "dist-gasabo", name: "Gasabo", level: "district", parentId: "reg-kigali" },
  { id: "dist-kicukiro", name: "Kicukiro", level: "district", parentId: "reg-kigali" },
  { id: "dist-nyarugenge", name: "Nyarugenge", level: "district", parentId: "reg-kigali" },
  { id: "dist-musanze", name: "Musanze", level: "district", parentId: "reg-north" },
  { id: "dist-gicumbi", name: "Gicumbi", level: "district", parentId: "reg-north" },
  { id: "dist-huye", name: "Huye", level: "district", parentId: "reg-south" },
  { id: "dist-nyanza", name: "Nyanza", level: "district", parentId: "reg-south" },
  { id: "dist-nyagatare", name: "Nyagatare", level: "district", parentId: "reg-east" },
  { id: "dist-rwamagana", name: "Rwamagana", level: "district", parentId: "reg-east" },
  { id: "dist-rubavu", name: "Rubavu", level: "district", parentId: "reg-west" },
  { id: "dist-nyabihu", name: "Nyabihu", level: "district", parentId: "reg-west" },

  { id: "sec-katabagemu", name: "Katabagemu", level: "sector", parentId: "dist-nyagatare" },
  { id: "sec-rukomo", name: "Rukomo", level: "sector", parentId: "dist-nyagatare" },
  { id: "sec-muhoza", name: "Muhoza", level: "sector", parentId: "dist-musanze" },
  { id: "sec-nyange", name: "Nyange", level: "sector", parentId: "dist-musanze" },
  { id: "sec-ngoma", name: "Ngoma", level: "sector", parentId: "dist-huye" },
  { id: "sec-tumba", name: "Tumba", level: "sector", parentId: "dist-huye" },

  { id: "cell-rwiba", name: "Rwiba", level: "cell", parentId: "sec-katabagemu" },
  { id: "cell-cyabararika", name: "Cyabararika", level: "cell", parentId: "sec-muhoza" },

  { id: "vil-rwiba-1", name: "Rwiba I", level: "village", parentId: "cell-rwiba" },
  { id: "vil-cyabararika-1", name: "Cyabararika I", level: "village", parentId: "cell-cyabararika" },
];

export function locationById(id: string | undefined | null): Location | undefined {
  return id ? locations.find((l) => l.id === id) : undefined;
}

/** Full "Village, Cell, Sector, District" style path for display. */
export function locationLabel(id: string | undefined | null): string {
  const loc = locationById(id);
  if (!loc) return "Unknown location";
  const parts: string[] = [loc.name];
  let parent = locationById(loc.parentId);
  while (parent) {
    parts.push(parent.name);
    parent = locationById(parent.parentId);
  }
  return parts.join(", ");
}

/** Nearest ancestor (or self) at district level — the unit most filters/search scope by. */
export function districtOf(id: string | undefined | null): Location | undefined {
  let loc = locationById(id);
  while (loc && loc.level !== "district") loc = locationById(loc.parentId);
  return loc;
}

export const DISTRICTS = locations.filter((l) => l.level === "district");

/* --------------------------------- Categories & products -------------------------------- */

export const categories: Category[] = [
  { id: "cat-produce", name: "Agricultural Produce", type: "produce", parentId: null },
  { id: "cat-cereals", name: "Cereals", type: "produce", parentId: "cat-produce" },
  { id: "cat-legumes", name: "Legumes", type: "produce", parentId: "cat-produce" },
  { id: "cat-tubers", name: "Tubers", type: "produce", parentId: "cat-produce" },
  { id: "cat-vegetables", name: "Vegetables", type: "produce", parentId: "cat-produce" },
  { id: "cat-fruits", name: "Fruits", type: "produce", parentId: "cat-produce" },
  { id: "cat-dairy", name: "Dairy", type: "produce", parentId: "cat-produce" },
  { id: "cat-inputs", name: "Agricultural Inputs", type: "input", parentId: null },
  { id: "cat-fertilizer", name: "Fertilizer", type: "input", parentId: "cat-inputs" },
  { id: "cat-seed", name: "Seed", type: "input", parentId: "cat-inputs" },
  { id: "cat-pesticide", name: "Pesticide", type: "input", parentId: "cat-inputs" },
];

export const products: Product[] = [
  { id: "prod-maize", name: "Maize", categoryId: "cat-cereals", type: "produce", defaultUnit: "kg", shelfLifeDays: 180 },
  { id: "prod-rice", name: "Rice (paddy)", categoryId: "cat-cereals", type: "produce", defaultUnit: "kg", shelfLifeDays: 270 },
  { id: "prod-beans", name: "Beans", categoryId: "cat-legumes", type: "produce", defaultUnit: "kg", shelfLifeDays: 270 },
  { id: "prod-irish-potato", name: "Irish Potatoes", categoryId: "cat-tubers", type: "produce", defaultUnit: "kg", shelfLifeDays: 90 },
  { id: "prod-cassava", name: "Cassava", categoryId: "cat-tubers", type: "produce", defaultUnit: "kg", shelfLifeDays: 14 },
  { id: "prod-tomato", name: "Tomatoes", categoryId: "cat-vegetables", type: "produce", defaultUnit: "kg", shelfLifeDays: 6 },
  { id: "prod-onion", name: "Onions", categoryId: "cat-vegetables", type: "produce", defaultUnit: "kg", shelfLifeDays: 120 },
  { id: "prod-banana", name: "Bananas", categoryId: "cat-fruits", type: "produce", defaultUnit: "kg", shelfLifeDays: 10 },
  { id: "prod-avocado", name: "Avocado", categoryId: "cat-fruits", type: "produce", defaultUnit: "kg", shelfLifeDays: 7 },
  { id: "prod-milk", name: "Milk", categoryId: "cat-dairy", type: "produce", defaultUnit: "litre", shelfLifeDays: 1 },
  { id: "prod-urea", name: "Urea Fertilizer", categoryId: "cat-fertilizer", type: "input", defaultUnit: "kg" },
  { id: "prod-dap", name: "DAP Fertilizer", categoryId: "cat-fertilizer", type: "input", defaultUnit: "kg" },
  { id: "prod-maize-seed", name: "Hybrid Maize Seed", categoryId: "cat-seed", type: "input", defaultUnit: "kg" },
  { id: "prod-bean-seed", name: "Bean Seed", categoryId: "cat-seed", type: "input", defaultUnit: "kg" },
  { id: "prod-mancozeb", name: "Mancozeb Pesticide", categoryId: "cat-pesticide", type: "input", defaultUnit: "litre" },
];

export function productById(id: string | undefined | null): Product | undefined {
  return id ? products.find((p) => p.id === id) : undefined;
}

/* --------------------------------- Cooperatives -------------------------------- */

export const cooperatives: Cooperative[] = [
  {
    id: "coop-1",
    name: "Nyagatare Maize Growers Cooperative",
    districtId: "dist-nyagatare",
    registrationNumber: "RCA/COOP/2021/0412",
    organizationType: "cooperative",
  },
  {
    id: "coop-2",
    name: "Musanze Irish Potato Farmers Union",
    districtId: "dist-musanze",
    registrationNumber: "RCA/COOP/2019/0187",
    organizationType: "cooperative",
  },
  {
    id: "coop-3",
    name: "Huye Vegetable Growers Association",
    districtId: "dist-huye",
    registrationNumber: "RCA/COOP/2022/0733",
    organizationType: "cooperative",
  },
];

/* --------------------------------- Users -------------------------------- */

export const users: User[] = [
  {
    id: "u1",
    name: "Emmanuel Nkurunziza",
    phone: "+250788100001",
    email: "emmanuel@agribridge.rw",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "sec-katabagemu",
    isVerified: true,
    reliabilityScore: 88,
    cooperativeId: "coop-1",
    avatarColorIndex: 0,
    status: "active",
    createdAt: day(-200),
  },
  {
    id: "u2",
    name: "Alice Mukamana",
    phone: "+250788100002",
    email: "alice@agribridge.rw",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "sec-rukomo",
    isVerified: true,
    reliabilityScore: 74,
    cooperativeId: "coop-1",
    avatarColorIndex: 1,
    status: "active",
    createdAt: day(-180),
  },
  {
    id: "u3",
    name: "Jean Bosco Habyarimana",
    phone: "+250788100003",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "sec-muhoza",
    isVerified: true,
    reliabilityScore: 91,
    cooperativeId: "coop-2",
    avatarColorIndex: 2,
    status: "active",
    createdAt: day(-220),
  },
  {
    id: "u4",
    name: "Chantal Mutesi",
    phone: "+250788100004",
    roles: ["farmer"],
    preferredLanguage: "fr",
    locationId: "sec-nyange",
    isVerified: false,
    reliabilityScore: 32,
    cooperativeId: "coop-2",
    avatarColorIndex: 3,
    status: "active",
    createdAt: day(-20),
  },
  {
    id: "u5",
    name: "Aline Ingabire",
    phone: "+250788100005",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "sec-ngoma",
    isVerified: true,
    reliabilityScore: 66,
    cooperativeId: "coop-3",
    avatarColorIndex: 4,
    status: "active",
    createdAt: day(-160),
  },
  {
    id: "u6",
    name: "Patrick Mugisha",
    phone: "+250788100006",
    roles: ["farmer"],
    preferredLanguage: "en",
    locationId: "sec-tumba",
    isVerified: false,
    reliabilityScore: 45,
    cooperativeId: "coop-3",
    avatarColorIndex: 0,
    status: "active",
    createdAt: day(-90),
  },
  {
    id: "u7",
    name: "Samuel Okoro",
    phone: "+250788100007",
    roles: ["farmer", "buyer"],
    preferredLanguage: "en",
    locationId: "dist-nyagatare",
    isVerified: true,
    reliabilityScore: 70,
    avatarColorIndex: 1,
    status: "active",
    createdAt: day(-140),
  },
  {
    id: "u8",
    name: "Grace Uwase",
    phone: "+250788100008",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "dist-gicumbi",
    isVerified: true,
    reliabilityScore: 58,
    avatarColorIndex: 2,
    status: "active",
    createdAt: day(-75),
  },
  {
    id: "u9",
    name: "Peter Nsanzimana",
    phone: "+250788100009",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "dist-nyanza",
    isVerified: false,
    reliabilityScore: 20,
    avatarColorIndex: 3,
    status: "active",
    createdAt: day(-10),
  },
  {
    id: "u10",
    name: "Immaculee Mukamana",
    phone: "+250788100010",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "dist-rwamagana",
    isVerified: true,
    reliabilityScore: 82,
    avatarColorIndex: 4,
    status: "active",
    createdAt: day(-300),
  },
  {
    id: "u11",
    name: "Meridian Foods Ltd",
    phone: "+250788200001",
    email: "procurement@meridianfoods.rw",
    roles: ["buyer"],
    preferredLanguage: "en",
    locationId: "dist-gasabo",
    isVerified: true,
    reliabilityScore: 85,
    avatarColorIndex: 0,
    status: "active",
    createdAt: day(-250),
  },
  {
    id: "u12",
    name: "Kigali Fresh Market",
    phone: "+250788200002",
    roles: ["buyer"],
    preferredLanguage: "rw",
    locationId: "dist-kicukiro",
    isVerified: true,
    reliabilityScore: 61,
    avatarColorIndex: 1,
    status: "active",
    createdAt: day(-130),
  },
  {
    id: "u13",
    name: "Daniel Habimana",
    phone: "+250788200003",
    roles: ["buyer"],
    preferredLanguage: "en",
    locationId: "dist-nyarugenge",
    isVerified: false,
    reliabilityScore: 15,
    avatarColorIndex: 2,
    status: "active",
    createdAt: day(-8),
  },
  {
    id: "u14",
    name: "Agro Input Distributors Rwanda",
    phone: "+250788300001",
    email: "sales@agroinputrw.com",
    roles: ["supplier"],
    preferredLanguage: "en",
    locationId: "dist-gasabo",
    isVerified: true,
    reliabilityScore: 90,
    avatarColorIndex: 3,
    status: "active",
    createdAt: day(-260),
  },
  {
    id: "u15",
    name: "Musanze Farm Supplies",
    phone: "+250788300002",
    roles: ["supplier"],
    preferredLanguage: "rw",
    locationId: "dist-musanze",
    isVerified: false,
    reliabilityScore: 40,
    avatarColorIndex: 4,
    status: "active",
    createdAt: day(-30),
  },
  {
    id: "u16",
    name: "Eastern Agro Chemicals",
    phone: "+250788300003",
    roles: ["supplier"],
    preferredLanguage: "en",
    locationId: "dist-nyagatare",
    isVerified: true,
    reliabilityScore: 77,
    avatarColorIndex: 0,
    status: "active",
    createdAt: day(-190),
  },
  {
    id: "u17",
    name: "Vincent Rutayisire",
    phone: "+250788400001",
    roles: ["transporter"],
    preferredLanguage: "rw",
    locationId: "dist-nyagatare",
    isVerified: true,
    reliabilityScore: 68,
    avatarColorIndex: 1,
    status: "active",
    createdAt: day(-100),
  },
  {
    id: "u18",
    name: "Kwame Boateng",
    phone: "+250788999999",
    email: "admin@agribridge.rw",
    roles: ["admin"],
    preferredLanguage: "en",
    locationId: "dist-gasabo",
    isVerified: true,
    reliabilityScore: 100,
    avatarColorIndex: 2,
    status: "active",
    createdAt: day(-400),
  },
  {
    id: "u19",
    name: "Sarah Ingabire",
    phone: "+250788100011",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "sec-katabagemu",
    isVerified: false,
    reliabilityScore: 0,
    avatarColorIndex: 3,
    status: "active",
    createdAt: day(-2),
  },
  {
    id: "u20",
    name: "Eric Tuyishime",
    phone: "+250788100012",
    roles: ["farmer"],
    preferredLanguage: "rw",
    locationId: "sec-rukomo",
    isVerified: false,
    reliabilityScore: 55,
    avatarColorIndex: 4,
    status: "suspended",
    createdAt: day(-60),
  },
];

export function userById(id: string | null | undefined): User | undefined {
  return id ? users.find((u) => u.id === id) : undefined;
}

export const endorsements: Endorsement[] = [
  {
    id: "end-1",
    endorserId: "u1",
    endorsedId: "u19",
    note: "Cooperative member in good standing, vouching for her first season on the platform.",
    createdAt: day(-1),
  },
];

/* --------------------------------- Produce listings -------------------------------- */

export const produceListings: ProduceListing[] = [
  { id: "PL-1001", sellerId: "u1", productId: "prod-maize", quantity: 1200, unit: "kg", unitPrice: 320, negotiable: false, locationId: "sec-katabagemu", harvestDate: day(-5), qualityGrade: "Grade A", listingScope: "commercial", status: "available", expiresAt: day(25), createdAt: day(-5) },
  { id: "PL-1002", sellerId: "u2", productId: "prod-maize", quantity: 800, unit: "kg", unitPrice: 310, negotiable: true, locationId: "sec-rukomo", harvestDate: day(-3), qualityGrade: "Grade A", listingScope: "commercial", status: "available", expiresAt: day(27), createdAt: day(-3) },
  { id: "PL-1003", sellerId: "u7", productId: "prod-maize", quantity: 500, unit: "kg", unitPrice: 315, negotiable: false, locationId: "dist-nyagatare", harvestDate: day(-8), listingScope: "commercial", status: "reserved", expiresAt: day(22), createdAt: day(-8) },
  { id: "PL-1004", sellerId: "u3", productId: "prod-irish-potato", quantity: 2000, unit: "kg", unitPrice: 250, negotiable: false, locationId: "sec-muhoza", harvestDate: day(-1), qualityGrade: "Grade A", listingScope: "commercial", status: "available", expiresAt: day(60), createdAt: day(-1) },
  { id: "PL-1005", sellerId: "u4", productId: "prod-irish-potato", quantity: 350, unit: "kg", unitPrice: 240, negotiable: true, locationId: "sec-nyange", harvestDate: day(-2), listingScope: "peer", status: "available", expiresAt: day(60), createdAt: day(-2) },
  { id: "PL-1006", sellerId: "u5", productId: "prod-tomato", quantity: 300, unit: "kg", unitPrice: 450, negotiable: false, locationId: "sec-ngoma", harvestDate: day(-1), listingScope: "commercial", status: "available", expiresAt: day(4), createdAt: day(-1) },
  { id: "PL-1007", sellerId: "u6", productId: "prod-tomato", quantity: 120, unit: "kg", unitPrice: 420, negotiable: true, locationId: "sec-tumba", harvestDate: day(-4), listingScope: "peer", status: "available", expiresAt: day(1), createdAt: day(-4) },
  { id: "PL-1008", sellerId: "u8", productId: "prod-beans", quantity: 900, unit: "kg", unitPrice: 600, negotiable: false, locationId: "dist-gicumbi", harvestDate: day(-10), qualityGrade: "Grade B", listingScope: "commercial", status: "available", expiresAt: day(90), createdAt: day(-10) },
  { id: "PL-1009", sellerId: "u9", productId: "prod-cassava", quantity: 1500, unit: "kg", unitPrice: 180, negotiable: true, locationId: "dist-nyanza", harvestDate: day(-1), listingScope: "commercial", status: "available", expiresAt: day(6), createdAt: day(-1) },
  { id: "PL-1010", sellerId: "u10", productId: "prod-banana", quantity: 600, unit: "kg", unitPrice: 280, negotiable: false, locationId: "dist-rwamagana", harvestDate: day(-2), listingScope: "commercial", status: "sold", expiresAt: day(6), createdAt: day(-9) },
  { id: "PL-1011", sellerId: "u1", productId: "prod-beans", quantity: 400, unit: "kg", unitPrice: 590, negotiable: false, locationId: "sec-katabagemu", harvestDate: day(-15), listingScope: "peer", status: "available", expiresAt: day(70), createdAt: day(-15) },
  { id: "PL-1012", sellerId: "u2", productId: "prod-rice", quantity: 1000, unit: "kg", unitPrice: 520, negotiable: false, locationId: "sec-rukomo", harvestDate: day(-20), listingScope: "commercial", status: "available", expiresAt: day(240), createdAt: day(-20) },
  { id: "PL-1013", sellerId: "u5", productId: "prod-avocado", quantity: 200, unit: "kg", unitPrice: 380, negotiable: true, locationId: "sec-ngoma", harvestDate: day(-1), listingScope: "peer", status: "available", expiresAt: day(2), createdAt: day(-1) },
  { id: "PL-1014", sellerId: "u3", productId: "prod-onion", quantity: 750, unit: "kg", unitPrice: 400, negotiable: false, locationId: "sec-muhoza", harvestDate: day(-30), listingScope: "commercial", status: "available", expiresAt: day(80), createdAt: day(-30) },
  { id: "PL-1015", sellerId: "u9", productId: "prod-maize", quantity: 60, unit: "kg", unitPrice: 300, negotiable: false, locationId: "dist-nyanza", harvestDate: day(-40), listingScope: "commercial", status: "expired", expiresAt: day(-5), createdAt: day(-40) },
];

/* --------------------------------- Buyer requests -------------------------------- */

export const buyerRequests: BuyerRequest[] = [
  { id: "BR-2001", buyerId: "u11", productId: "prod-maize", quantityNeeded: 5000, unit: "kg", targetPrice: 315, deliveryLocationId: "dist-nyagatare", neededByDate: day(15), status: "open", createdAt: day(-6) },
  { id: "BR-2002", buyerId: "u12", productId: "prod-tomato", quantityNeeded: 400, unit: "kg", targetPrice: 430, deliveryLocationId: "dist-kicukiro", neededByDate: day(3), status: "open", createdAt: day(-2) },
  { id: "BR-2003", buyerId: "u11", productId: "prod-irish-potato", quantityNeeded: 3000, unit: "kg", targetPrice: 245, deliveryLocationId: "dist-musanze", neededByDate: day(10), status: "partially_filled", createdAt: day(-7) },
  { id: "BR-2004", buyerId: "u13", productId: "prod-beans", quantityNeeded: 600, unit: "kg", targetPrice: null, deliveryLocationId: "dist-gicumbi", neededByDate: day(20), status: "open", createdAt: day(-1) },
  { id: "BR-2005", buyerId: "u7", productId: "prod-rice", quantityNeeded: 800, unit: "kg", targetPrice: 510, deliveryLocationId: "dist-nyagatare", neededByDate: day(30), status: "open", createdAt: day(-3) },
  { id: "BR-2006", buyerId: "u12", productId: "prod-banana", quantityNeeded: 600, unit: "kg", targetPrice: 275, deliveryLocationId: "dist-kicukiro", neededByDate: day(5), status: "filled", createdAt: day(-11) },
];

/* --------------------------------- Aggregation -------------------------------- */

export const aggregationGroups: AggregationGroup[] = [
  {
    id: "AG-3001",
    type: "sale",
    requestId: "BR-2001",
    status: "proposed",
    targetQuantity: 5000,
    unit: "kg",
    unitPrice: 315,
    deadline: day(2),
    createdAt: day(-1),
  },
  {
    id: "AG-3002",
    type: "sale",
    requestId: "BR-2003",
    status: "partially_confirmed",
    targetQuantity: 3000,
    unit: "kg",
    unitPrice: 245,
    deadline: day(1),
    createdAt: day(-3),
  },
  {
    id: "AG-3003",
    type: "sale",
    requestId: "BR-2006",
    status: "confirmed",
    targetQuantity: 600,
    unit: "kg",
    unitPrice: 275,
    deadline: day(-2),
    createdAt: day(-10),
  },
];

export const aggregationParticipants: AggregationParticipant[] = [
  { id: "AP-1", groupId: "AG-3001", listingId: "PL-1001", farmerId: "u1", allocatedQuantity: 1200, status: "accepted", agreedUnitPrice: 315 },
  { id: "AP-2", groupId: "AG-3001", listingId: "PL-1002", farmerId: "u2", allocatedQuantity: 800, status: "pending", agreedUnitPrice: 315 },
  { id: "AP-3", groupId: "AG-3001", listingId: "PL-1003", farmerId: "u7", allocatedQuantity: 500, status: "pending", agreedUnitPrice: 315 },
  { id: "AP-4", groupId: "AG-3002", listingId: "PL-1004", farmerId: "u3", allocatedQuantity: 2000, status: "accepted", agreedUnitPrice: 245 },
  { id: "AP-5", groupId: "AG-3002", listingId: "PL-1005", farmerId: "u4", allocatedQuantity: 350, status: "declined", agreedUnitPrice: 245 },
  { id: "AP-6", groupId: "AG-3003", listingId: "PL-1010", farmerId: "u10", allocatedQuantity: 600, status: "accepted", agreedUnitPrice: 275 },
];

/* --------------------------------- Input marketplace -------------------------------- */

export const inputListings: InputListing[] = [
  { id: "IL-4001", supplierId: "u14", productId: "prod-urea", unit: "kg", price: 900, stockQty: 20000, deliveryDistrictIds: ["dist-nyagatare", "dist-gicumbi", "dist-rwamagana"], createdAt: day(-100) },
  { id: "IL-4002", supplierId: "u14", productId: "prod-dap", unit: "kg", price: 1050, stockQty: 15000, deliveryDistrictIds: ["dist-nyagatare", "dist-musanze"], createdAt: day(-100) },
  { id: "IL-4003", supplierId: "u15", productId: "prod-maize-seed", unit: "kg", price: 2200, stockQty: 3000, deliveryDistrictIds: ["dist-musanze", "dist-gicumbi"], createdAt: day(-60) },
  { id: "IL-4004", supplierId: "u16", productId: "prod-bean-seed", unit: "kg", price: 1400, stockQty: 5000, deliveryDistrictIds: ["dist-nyagatare", "dist-rwamagana"], createdAt: day(-45) },
  { id: "IL-4005", supplierId: "u16", productId: "prod-mancozeb", unit: "litre", price: 6500, stockQty: 800, deliveryDistrictIds: ["dist-nyagatare"], createdAt: day(-45) },
  { id: "IL-4006", supplierId: "u15", productId: "prod-urea", unit: "kg", price: 920, stockQty: 8000, deliveryDistrictIds: ["dist-musanze", "dist-nyabihu"], createdAt: day(-30) },
];

export const groupPurchases: GroupPurchase[] = [
  { id: "GP-5001", inputListingId: "IL-4001", thresholdQuantity: 5000, deadline: day(4), status: "collecting", supplierInvoiceTotal: null, createdAt: day(-6) },
  { id: "GP-5002", inputListingId: "IL-4003", thresholdQuantity: 1000, deadline: day(-1), status: "fulfilled", supplierInvoiceTotal: 2_310_000, createdAt: day(-20) },
];

export const groupPurchasePledges: GroupPurchasePledge[] = [
  { id: "GPP-1", groupPurchaseId: "GP-5001", farmerId: "u1", pledgedQuantity: 800, computedShareAmount: null },
  { id: "GPP-2", groupPurchaseId: "GP-5001", farmerId: "u2", pledgedQuantity: 600, computedShareAmount: null },
  { id: "GPP-3", groupPurchaseId: "GP-5001", farmerId: "u7", pledgedQuantity: 1500, computedShareAmount: null },
  { id: "GPP-4", groupPurchaseId: "GP-5002", farmerId: "u3", pledgedQuantity: 600, computedShareAmount: 1_386_000 },
  { id: "GPP-5", groupPurchaseId: "GP-5002", farmerId: "u4", pledgedQuantity: 420, computedShareAmount: 970_200 },
];

/* --------------------------------- Transactions & reviews -------------------------------- */

export const transactions: Transaction[] = [
  { id: "TX-6001", buyerId: "u12", sellerId: "u10", groupId: "AG-3003", productId: "prod-banana", quantity: 600, unit: "kg", unitPrice: 275, status: "completed", confirmedBySeller: true, confirmedByBuyer: true, createdAt: day(-9), completedAt: day(-6) },
  { id: "TX-6002", buyerId: "u11", sellerId: "u1", groupId: null, productId: "prod-maize", quantity: 300, unit: "kg", unitPrice: 318, status: "completed", confirmedBySeller: true, confirmedByBuyer: true, createdAt: day(-14), completedAt: day(-12) },
  { id: "TX-6003", buyerId: "u13", sellerId: "u8", groupId: null, productId: "prod-beans", quantity: 200, unit: "kg", unitPrice: 600, status: "confirmed_by_seller", confirmedBySeller: true, confirmedByBuyer: false, createdAt: day(-2), completedAt: null },
  { id: "TX-6004", buyerId: "u12", sellerId: "u5", groupId: null, productId: "prod-tomato", quantity: 100, unit: "kg", unitPrice: 440, status: "pending", confirmedBySeller: false, confirmedByBuyer: false, createdAt: day(-1), completedAt: null },
  { id: "TX-6005", buyerId: "u7", sellerId: "u9", groupId: null, productId: "prod-cassava", quantity: 500, unit: "kg", unitPrice: 175, status: "disputed", confirmedBySeller: true, confirmedByBuyer: false, disputeReason: "Delivered quantity was short by roughly 40kg.", createdAt: day(-5), completedAt: null },
  { id: "TX-6006", buyerId: "u1", sellerId: "u14", groupId: "GP-5002", productId: "prod-maize-seed", quantity: 600, unit: "kg", unitPrice: 2310, status: "completed", confirmedBySeller: true, confirmedByBuyer: true, createdAt: day(-18), completedAt: day(-16) },
];

export const ratings: Rating[] = [
  { id: "RT-1", transactionId: "TX-6001", ratedBy: "u12", ratedUser: "u10", score: 5, comment: "On time, exactly as described.", createdAt: day(-6) },
  { id: "RT-2", transactionId: "TX-6002", ratedBy: "u11", ratedUser: "u1", score: 5, comment: "Great quality maize, will buy again.", createdAt: day(-12) },
  { id: "RT-3", transactionId: "TX-6002", ratedBy: "u1", ratedUser: "u11", score: 4, createdAt: day(-12) },
];

/* --------------------------------- Messaging -------------------------------- */

export const messageThreads: MessageThread[] = [
  { id: "MT-1", participantIds: ["u11", "u1"], subject: "Maize listing PL-1001", relatedListingId: "PL-1001", lastMessageAt: hoursAgo(3) },
  { id: "MT-2", participantIds: ["u12", "u5"], subject: "Tomatoes — can you deliver by Friday?", relatedListingId: "PL-1006", lastMessageAt: hoursAgo(20) },
  { id: "MT-3", participantIds: ["u7", "u9"], subject: "Cassava short delivery", relatedListingId: "PL-1009", lastMessageAt: hoursAgo(30) },
];

export const messages: Message[] = [
  { id: "MSG-1", threadId: "MT-1", senderId: "u11", body: "Is the 1200kg still available? We can take all of it.", sentAt: hoursAgo(6) },
  { id: "MSG-2", threadId: "MT-1", senderId: "u1", body: "Yego, biraboneka. When do you need delivery?", sentAt: hoursAgo(5) },
  { id: "MSG-3", threadId: "MT-1", senderId: "u11", body: "Within the next 5 days works. Sharing my number so we can call.", sentAt: hoursAgo(3) },
  { id: "MSG-4", threadId: "MT-2", senderId: "u12", body: "Can you deliver 100kg to Kicukiro by Friday morning?", sentAt: hoursAgo(21) },
  { id: "MSG-5", threadId: "MT-2", senderId: "u5", body: "Yes, that works. I'll confirm the price once picked.", sentAt: hoursAgo(20) },
  { id: "MSG-6", threadId: "MT-3", senderId: "u7", body: "The delivered sacks were about 40kg short of what we agreed.", sentAt: hoursAgo(31) },
  { id: "MSG-7", threadId: "MT-3", senderId: "u9", body: "I weighed everything before pickup — let's check with the transporter.", sentAt: hoursAgo(30) },
];

/* --------------------------------- Market prices -------------------------------- */

export const marketPriceRecords: MarketPriceRecord[] = [
  { id: "MP-1", productId: "prod-maize", districtId: "dist-nyagatare", avgPrice: 318, sampleDate: day(-1), source: "transaction" },
  { id: "MP-2", productId: "prod-maize", districtId: "dist-musanze", avgPrice: 305, sampleDate: day(-1), source: "manual_survey" },
  { id: "MP-3", productId: "prod-maize", districtId: "dist-gicumbi", avgPrice: 300, sampleDate: day(-2), source: "manual_survey" },
  { id: "MP-4", productId: "prod-irish-potato", districtId: "dist-musanze", avgPrice: 248, sampleDate: day(-1), source: "manual_survey" },
  { id: "MP-5", productId: "prod-irish-potato", districtId: "dist-nyabihu", avgPrice: 230, sampleDate: day(-3), source: "manual_survey" },
  { id: "MP-6", productId: "prod-tomato", districtId: "dist-huye", avgPrice: 435, sampleDate: day(-1), source: "manual_survey" },
  { id: "MP-7", productId: "prod-tomato", districtId: "dist-kicukiro", avgPrice: 460, sampleDate: day(-1), source: "manual_survey" },
  { id: "MP-8", productId: "prod-beans", districtId: "dist-gicumbi", avgPrice: 600, sampleDate: day(-2), source: "manual_survey" },
  { id: "MP-9", productId: "prod-banana", districtId: "dist-rwamagana", avgPrice: 275, sampleDate: day(-6), source: "transaction" },
  { id: "MP-10", productId: "prod-cassava", districtId: "dist-nyanza", avgPrice: 178, sampleDate: day(-1), source: "manual_survey" },
  { id: "MP-11", productId: "prod-rice", districtId: "dist-nyagatare", avgPrice: 520, sampleDate: day(-4), source: "manual_survey" },
  { id: "MP-12", productId: "prod-avocado", districtId: "dist-huye", avgPrice: 375, sampleDate: day(-1), source: "manual_survey" },
];

/* --------------------------------- Notifications -------------------------------- */

export const notificationLog: NotificationLog[] = [
  { id: "N-1", timestamp: hoursAgo(1), userId: "u1", kind: "aggregation_invite", title: "Aggregation invite", detail: "Meridian Foods needs 5,000kg of maize — your listing PL-1001 was included." },
  { id: "N-2", timestamp: hoursAgo(2), userId: "u2", kind: "aggregation_invite", title: "Aggregation invite", detail: "Confirm your 800kg allocation for buyer request BR-2001 within 24h." },
  { id: "N-3", timestamp: hoursAgo(4), userId: "u5", kind: "spoilage_alert", title: "Listing may spoil soon", detail: "Your tomato listing PL-1006 is nearing its shelf-life window — consider lowering the price." },
  { id: "N-4", timestamp: hoursAgo(5), userId: "u6", kind: "spoilage_alert", title: "Listing may spoil soon", detail: "Your tomato listing PL-1007 expires tomorrow." },
  { id: "N-5", timestamp: hoursAgo(8), userId: "u7", kind: "new_match", title: "New matching buyer request", detail: "A new request for rice (800kg) was posted near you." },
  { id: "N-6", timestamp: hoursAgo(10), userId: "u1", kind: "group_purchase", title: "Group purchase update", detail: "Urea fertilizer group purchase is at 2,900 / 5,000kg pledged." },
  { id: "N-7", timestamp: hoursAgo(20), userId: "u9", kind: "transaction", title: "Buyer raised a dispute", detail: "Samuel Okoro disputed transaction TX-6005 — short delivery." },
  { id: "N-8", timestamp: hoursAgo(30), userId: "u12", kind: "transaction", title: "Transaction completed", detail: "Your purchase of 600kg bananas from Immaculee Mukamana is complete." },
];
