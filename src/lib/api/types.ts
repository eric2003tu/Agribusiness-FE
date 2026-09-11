/** Shapes from the AgriBridge API Integration Guide's Authentication section. */

export interface ApiLanguage {
  id: number;
  code: string;
  name: string;
}

export interface ApiLocation {
  id: number;
  name: string;
}

export interface ApiOrganization {
  id: number;
  name: string;
}

/* --------------------------- Reference & organization data --------------------------- */

export interface ApiCurrency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

export interface ApiLocationLevel {
  id: number;
  name: string;
  depth: number;
}

/** The flat `/locations/` shape — raw FK ids, distinct from the nested
 * `{id, name}` `ApiLocation` embedded in a User/Organization. */
export interface ApiLocationFull {
  id: number;
  name: string;
  level: number;
  parent: number | null;
  iso_code: string;
  currency: number | null;
  latitude: string | null;
  longitude: string | null;
}

export type OrganizationStatus = "active" | "suspended" | "deleted";

export interface ApiOrganizationType {
  id: number;
  name: string;
  description: string;
}

/** The flat `/organizations/` shape — raw FK ids, distinct from the nested
 * `{id, name}` `ApiOrganization` embedded in a User. */
export interface ApiOrganizationFull {
  id: number;
  name: string;
  organization_type: number;
  registration_number: string | null;
  tax_id: string | null;
  primary_location: number | null;
  primary_contact_user: number | null;
  founded_date: string | null;
  is_verified: boolean;
  reliability_score: string;
  status: OrganizationStatus;
  created_at: string;
}

export interface ApiOrganizationMember {
  id: number;
  user: number;
  organization: number;
  member_role: string;
  joined_at: string;
}

export type CategoryType = "produce" | "input";

export interface ApiCategory {
  id: number;
  name: string;
  parent: number | null;
  category_type: CategoryType;
  depth: number;
  is_leaf: boolean;
}

export interface ApiUom {
  id: number;
  name: string;
  symbol: string;
  base_unit: number | null;
  conversion_factor: string | null;
}

export type AddressType = "billing" | "pickup" | "farm" | "warehouse";

export interface ApiAddress {
  id: number;
  user: number | null;
  organization: number | null;
  addr_type: AddressType;
  location: number;
  street: string;
  landmark: string;
  is_default: boolean;
}

export type ContactType = "phone" | "whatsapp" | "email";

export interface ApiContact {
  id: number;
  user: number | null;
  organization: number | null;
  contact_type: ContactType;
  value: string;
  is_primary: boolean;
  is_verified: boolean;
}

export type UserStatus = "active" | "suspended" | "deleted";

export interface ApiUser {
  id: number;
  phone: string;
  email: string | null;
  full_name: string;
  national_id: string | null;
  preferred_language: ApiLanguage;
  primary_location: ApiLocation | null;
  organization: ApiOrganization | null;
  is_verified: boolean;
  reliability_score: string;
  notification_preferences: Record<string, unknown>;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
}

export interface RegisterPayload {
  phone: string;
  full_name: string;
  email?: string;
  national_id?: string;
  preferred_language: number;
  primary_location?: number;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: ApiUser;
}

export interface VerifyOtpPayload {
  identifier: string;
  code: string;
}

export interface MessageResponse {
  message: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: ApiUser;
  access: string;
  refresh: string;
}

export interface RefreshResponse {
  message: string;
  access: string;
  refresh: string;
}

/* --------------------------------- Catalog & commerce --------------------------------- */

export type ProdType = "produce" | "input" | "service";

export interface ApiProduct {
  id: number;
  sku: string;
  name: string;
  slug: string;
  category: number;
  prod_type: ProdType;
  brand_org: number | null;
  default_uom: number;
  shelf_life_days: number | null;
  storage_notes: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiVariant {
  id: number;
  product: number;
  variant_sku: string;
  name: string;
  barcode: string | null;
  weight_kg: string | null;
  is_active: boolean;
}

export interface ApiProductImage {
  id: number;
  variant: number;
  image: string;
  display_order: number;
  is_primary: boolean;
}

export type WarehouseType = "farm_store" | "cold_storage" | "distribution_center";

export interface ApiWarehouse {
  id: number;
  name: string;
  owner_user: number | null;
  owner_org: number | null;
  wh_type: WarehouseType;
  address: number;
  capacity_kg: string | null;
}

export interface ApiInventory {
  id: number;
  variant: number;
  warehouse: number;
  qty_on_hand: string;
  qty_reserved: string;
  reorder_level: string | null;
  last_counted: string | null;
}

export type ListingScope = "peer" | "commercial";
export type ListingStatus = "available" | "reserved" | "sold" | "expired";

export interface ApiListing {
  id: number;
  seller_user: number | null;
  seller_org: number | null;
  variant: number;
  qty_available: string;
  uom: number;
  unit_price: string | null;
  negotiable: boolean;
  location: number;
  harvest_date: string;
  grade: string;
  scope: ListingScope;
  status: ListingStatus;
  expires_at: string | null;
  created_at: string;
}

export interface ApiListingPhoto {
  id: number;
  listing: number;
  photo: string;
  created_at: string;
}

export type SourcingRequestStatus = "open" | "matched" | "partially_filled" | "filled" | "cancelled";

/** The `/requests/` resource — buyer sourcing requests. Named `ApiSourcingRequest`
 * here to avoid clashing with the mock domain's own `BuyerRequest` type. */
export interface ApiSourcingRequest {
  id: number;
  buyer_user: number | null;
  buyer_org: number | null;
  product: number;
  qty_needed: string;
  uom: number;
  target_price: string | null;
  delivery_loc: number;
  needed_by: string;
  status: SourcingRequestStatus;
  created_at: string;
}

export interface ApiCart {
  id: number;
  buyer_user: number | null;
  buyer_org: number | null;
  currency: number;
  created_at: string;
  updated_at: string;
}

export interface ApiCartItem {
  id: number;
  cart: number;
  variant: number;
  listing: number | null;
  quantity: string;
  unit_price: string;
  added_at: string;
}

export type AggGroupStatus = "proposed" | "confirmed" | "partially_confirmed" | "cancelled";

export interface ApiAggGroup {
  id: number;
  request: number;
  status: AggGroupStatus;
  target_qty: string;
  confirmed_qty: string;
  created_at: string;
}

export type AggPartStatus = "proposed" | "accepted" | "declined" | "withdrawn";

export interface ApiAggPart {
  id: number;
  group: number;
  listing: number;
  alloc_qty: string;
  agreed_price: string;
  status: AggPartStatus;
  responded_at: string | null;
}

export type GrpPurchaseStatus = "collecting" | "fulfilled" | "expired";

export interface ApiGrpPurchase {
  id: number;
  variant: number;
  supplier_org: number;
  threshold_qty: string;
  deadline: string;
  pledged_qty: string;
  invoice_total: string | null;
  status: GrpPurchaseStatus;
  created_at: string;
}

export type GrpPledgeStatus = "pledged" | "confirmed" | "cancelled";

export interface ApiGrpPledge {
  id: number;
  grp_purchase: number;
  farmer_user: number;
  pledged_qty: string;
  share_amount: string | null;
  status: GrpPledgeStatus;
  created_at: string;
}

/* ------------------------------------ Transactions ------------------------------------ */

export type OrderChannel = "web" | "mobile" | "ussd" | "aggregation" | "group_purchase";
export type OrderStatus = "draft" | "placed" | "confirmed" | "in_delivery" | "delivered" | "completed" | "cancelled";

export interface ApiOrder {
  id: number;
  order_number: string;
  buyer_user: number | null;
  buyer_org: number | null;
  seller_user: number | null;
  seller_org: number | null;
  channel: OrderChannel;
  status: OrderStatus;
  agg_group: number | null;
  grp_purchase: number | null;
  currency: number;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  grand_total: string;
  billing_addr: number | null;
  pickup_addr: number | null;
  delivery_addr: number | null;
  placed_at: string | null;
  confirmed_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface ApiOrderLine {
  id: number;
  order: number;
  variant: number;
  listing: number | null;
  quantity: string;
  uom: number;
  unit_price: string;
  line_sub: string;
  line_total: string;
}

export interface ApiDelivery {
  id: number;
  order: number;
  pickup_addr: number | null;
  delivery_addr: number | null;
  seller_confirmed: string | null;
  buyer_confirmed: string | null;
  completed_at: string | null;
  notes: string;
  created_at: string;
}

export interface ApiPayMethod {
  id: number;
  name: string;
  code: string;
  provider: string;
  api_endpoint: string;
  is_active: boolean;
}

export type PaymentStatus = "pending" | "authorized" | "captured" | "failed" | "refunded";

export interface ApiPayment {
  id: number;
  order: number;
  method: number;
  status: PaymentStatus;
  amount: string;
  currency: number;
  provider_ref: string;
  initiated_at: string;
  captured_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
}

export type PayTxnType = "authorize" | "capture" | "refund" | "void";

export interface ApiPayTxn {
  id: number;
  payment: number;
  txn_type: PayTxnType;
  provider_txn_id: string;
  raw_response: Record<string, unknown> | null;
  occurred_at: string;
}

export type EscrowStatus = "holding" | "released" | "refunded";

export interface ApiEscrow {
  id: number;
  order: number;
  currency: number;
  held_amount: string;
  released_amount: string;
  refunded_amount: string;
  status: EscrowStatus;
  held_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
}

export type PayoutStatus = "pending" | "processing" | "completed" | "failed";

export interface ApiPayout {
  id: number;
  order: number;
  recipient_user: number | null;
  recipient_org: number | null;
  batch_reference: string;
  amount: string;
  currency: number;
  status: PayoutStatus;
  initiated_at: string;
  completed_at: string | null;
}

export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "void";

export interface ApiInvoice {
  id: number;
  inv_number: string;
  order: number;
  issuer_user: number | null;
  issuer_org: number | null;
  recipient_user: number | null;
  recipient_org: number | null;
  status: InvoiceStatus;
  currency: number;
  subtotal: string;
  tax_total: string;
  grand_total: string;
  amount_paid: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
}

export interface ApiInvoiceLine {
  id: number;
  invoice: number;
  order_line: number;
  description: string;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export type ReturnReason = "damaged" | "quality_issue" | "wrong_item" | "spoiled" | "other";
export type ReturnStatus = "requested" | "approved" | "rejected" | "completed";

export interface ApiReturnRequest {
  id: number;
  return_number: string;
  order: number;
  user: number | null;
  org: number | null;
  reason: ReturnReason;
  status: ReturnStatus;
  refund_amount: string | null;
  requested_at: string;
  resolved_at: string | null;
}

export interface ApiReturnLine {
  id: number;
  return_req: number;
  order_line: number;
  qty_returned: string;
  refund_amount: string;
}

export type DisputeStatus = "open" | "under_review" | "resolved" | "dismissed";

export interface ApiDispute {
  id: number;
  order: number;
  raised_user: number | null;
  raised_org: number | null;
  against_user: number | null;
  against_org: number | null;
  admin_user: number | null;
  status: DisputeStatus;
  subject: string;
  description: string;
  evidence_urls: string[] | null;
  resolution: string;
  resolved_at: string | null;
  created_at: string;
}

/* -------------------------------- Social & post-transaction -------------------------------- */

export interface ApiReview {
  id: number;
  order: number;
  reviewer_user: number | null;
  reviewer_org: number | null;
  reviewee_user: number | null;
  reviewee_org: number | null;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ApiThread {
  id: number;
  subject: string;
  created_at: string;
}

export interface ApiThreadUser {
  id: number;
  thread: number;
  user: number;
  joined_at: string;
  last_read_at: string | null;
}

export interface ApiMessage {
  id: number;
  thread: number;
  sender: number;
  body: string;
  sent_at: string;
}

export type NotifType = "listing_match" | "order_status" | "payment" | "delivery" | "dispute" | "system";
export type NotifChannel = "in_app" | "sms" | "push" | "email";

export interface ApiNotification {
  id: number;
  user: number;
  notif_type: NotifType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channel: NotifChannel;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
