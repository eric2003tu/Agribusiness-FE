import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { authenticate, SESSION_STORAGE_KEY } from "./auth";
import {
  users as seedUsers,
  produceListings as seedProduceListings,
  buyerRequests as seedBuyerRequests,
  aggregationGroups as seedAggregationGroups,
  aggregationParticipants as seedAggregationParticipants,
  inputListings as seedInputListings,
  groupPurchases as seedGroupPurchases,
  groupPurchasePledges as seedGroupPurchasePledges,
  transactions as seedTransactions,
  ratings as seedRatings,
  messageThreads as seedMessageThreads,
  messages as seedMessages,
  marketPriceRecords as seedMarketPriceRecords,
  notificationLog as seedNotificationLog,
  cooperatives as seedCooperatives,
  endorsements as seedEndorsements,
  transportOffers as seedTransportOffers,
  districtOf,
  productById,
  type AggregationGroup,
  type AggregationParticipant,
  type AggregationStatus,
  type BuyerRequest,
  type Cooperative,
  type Endorsement,
  type GroupPurchase,
  type GroupPurchasePledge,
  type InputListing,
  type Language,
  type MarketPriceRecord,
  type Message,
  type MessageThread,
  type NotificationKind,
  type NotificationLog,
  type ParticipantStatus,
  type PaymentMethod,
  type ProduceListing,
  type Rating,
  type RequestStatus,
  type Role,
  type Transaction,
  type TransactionStatus,
  type TransportOffer,
  type Unit,
  type User,
} from "./mock-data";

export type CartItemKind = "produce" | "input";

export interface CartLine {
  kind: CartItemKind;
  listingId: string;
  quantity: number;
  /** buyer's proposed price — only meaningful for a negotiable produce listing */
  offerPrice?: number;
}

export interface ResolvedCartLine extends CartLine {
  productId: string;
  productName: string;
  unit: Unit;
  sellerId: string;
  sellerName: string;
  unitPrice: number | null;
  maxQuantity: number;
  lineTotal: number | null;
  photo?: string | undefined;
  available: boolean;
}

type Ability = "moderate" | "manageOwnListings" | "manageOwnRequests" | "manageOwnInputs";

const ROLE_ABILITIES: Record<Role, Ability[]> = {
  farmer: ["manageOwnListings"],
  buyer: ["manageOwnRequests"],
  supplier: ["manageOwnInputs"],
  transporter: [],
  admin: ["moderate", "manageOwnListings", "manageOwnRequests", "manageOwnInputs"],
};

interface WorkspaceContextValue {
  users: User[];
  currentUser: User;
  session: User | null;
  ready: boolean;
  signIn: (phone: string, otp: string) => { ok: boolean; error?: string };
  registerUser: (input: {
    name: string;
    phone: string;
    roles: Role[];
    preferredLanguage: Language;
    locationId: string;
  }) => { ok: boolean; error?: string };
  signOut: () => void;
  setCurrentUserId: (id: string) => void;
  can: (action: Ability) => boolean;
  userById: (id: string | null | undefined) => User | undefined;
  hasRole: (role: Role) => boolean;
  updateProfile: (
    fields: Partial<Pick<User, "name" | "preferredLanguage" | "locationId" | "nationalId">>,
  ) => void;

  cooperatives: Cooperative[];
  endorsements: Endorsement[];
  addEndorsement: (input: { endorsedId: string; note: string }) => void;

  transportOffers: TransportOffer[];
  offersForGroup: (groupId: string) => TransportOffer[];
  offerTransport: (groupId: string, note?: string) => void;

  produceListings: ProduceListing[];
  myListings: ProduceListing[];
  addListing: (input: Omit<ProduceListing, "id" | "sellerId" | "status" | "createdAt">) => void;
  updateListing: (id: string, fields: Partial<ProduceListing>) => void;
  deleteListing: (id: string) => void;
  renewListing: (id: string, expiresAt: string) => void;
  matchingRequestsForListing: (listingId: string) => BuyerRequest[];
  /** Direct farmer<->buyer purchase off a listing (not via aggregation). */
  buyListing: (listingId: string, quantity: number, unitPrice?: number) => boolean;

  buyerRequests: BuyerRequest[];
  myRequests: BuyerRequest[];
  addRequest: (input: Omit<BuyerRequest, "id" | "buyerId" | "status" | "createdAt">) => void;
  updateRequestStatus: (id: string, status: RequestStatus) => void;
  matchingListingsForRequest: (requestId: string) => ProduceListing[];

  aggregationGroups: AggregationGroup[];
  aggregationParticipants: AggregationParticipant[];
  participantsForGroup: (groupId: string) => AggregationParticipant[];
  groupsForUser: (userId: string) => AggregationGroup[];
  proposeAggregation: (requestId: string) => void;
  respondToAggregation: (participantId: string, accept: boolean) => void;
  confirmAggregationGroup: (groupId: string) => void;
  /** Re-runs candidate selection for whatever's still short of the target (§4.3 "Reconcile"). */
  topUpAggregationGroup: (groupId: string) => void;

  inputListings: InputListing[];
  myInputListings: InputListing[];
  addInputListing: (input: Omit<InputListing, "id" | "supplierId" | "createdAt">) => void;
  updateInputListing: (id: string, fields: Partial<InputListing>) => void;
  deleteInputListing: (id: string) => void;
  orderInput: (inputListingId: string, quantity: number) => void;

  groupPurchases: GroupPurchase[];
  groupPurchasePledges: GroupPurchasePledge[];
  pledgesForGroupPurchase: (groupPurchaseId: string) => GroupPurchasePledge[];
  pledgedQuantityFor: (groupPurchaseId: string) => number;
  createGroupPurchase: (input: {
    inputListingId: string;
    thresholdQuantity: number;
    deadline: string;
  }) => void;
  pledgeToGroupPurchase: (groupPurchaseId: string, quantity: number) => void;
  fulfillGroupPurchase: (groupPurchaseId: string) => void;

  transactions: Transaction[];
  myTransactions: Transaction[];
  confirmTransaction: (id: string, as: "buyer" | "seller") => void;
  raiseDispute: (id: string, reason: string) => void;
  resolveDispute: (id: string) => void;
  rateTransaction: (id: string, score: number, comment?: string) => void;
  ratingsForUser: (userId: string) => Rating[];
  requestRefund: (id: string, reason: string) => void;
  resolveRefund: (id: string, approve: boolean) => void;

  cartItems: CartLine[];
  cartLines: ResolvedCartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (kind: CartItemKind, listingId: string, quantity: number, offerPrice?: number) => void;
  updateCartQuantity: (kind: CartItemKind, listingId: string, quantity: number) => void;
  removeFromCart: (kind: CartItemKind, listingId: string) => void;
  clearCart: () => void;
  placeOrder: (paymentMethod: PaymentMethod) => boolean;

  messageThreads: MessageThread[];
  messages: Message[];
  threadsForUser: (userId: string) => MessageThread[];
  messagesForThread: (threadId: string) => Message[];
  startThread: (input: {
    otherUserId: string;
    subject: string;
    relatedListingId?: string;
    relatedRequestId?: string;
    firstMessage: string;
  }) => void;
  sendMessage: (threadId: string, body: string) => void;

  marketPriceRecords: MarketPriceRecord[];
  addManualPriceRecord: (input: { productId: string; districtId: string; avgPrice: number }) => void;

  notifications: NotificationLog[];
  notificationsForUser: (userId: string) => NotificationLog[];

  verifyUser: (id: string, verified: boolean) => void;
  setUserSuspended: (id: string, suspended: boolean) => void;
  expireListing: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function bumpReliability(users: User[], userId: string, delta: number): User[] {
  return users.map((u) =>
    u.id === userId
      ? { ...u, reliabilityScore: Math.max(0, Math.min(100, u.reliabilityScore + delta)) }
      : u,
  );
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [allUsers, setAllUsers] = useState<User[]>(seedUsers);
  const [allProduceListings, setAllProduceListings] =
    useState<ProduceListing[]>(seedProduceListings);
  const [allBuyerRequests, setAllBuyerRequests] = useState<BuyerRequest[]>(seedBuyerRequests);
  const [allAggregationGroups, setAllAggregationGroups] =
    useState<AggregationGroup[]>(seedAggregationGroups);
  const [allAggregationParticipants, setAllAggregationParticipants] = useState<
    AggregationParticipant[]
  >(seedAggregationParticipants);
  const [allInputListings, setAllInputListings] = useState<InputListing[]>(seedInputListings);
  const [allGroupPurchases, setAllGroupPurchases] = useState<GroupPurchase[]>(seedGroupPurchases);
  const [allPledges, setAllPledges] = useState<GroupPurchasePledge[]>(seedGroupPurchasePledges);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(seedTransactions);
  const [allRatings, setAllRatings] = useState<Rating[]>(seedRatings);
  const [allThreads, setAllThreads] = useState<MessageThread[]>(seedMessageThreads);
  const [allMessages, setAllMessages] = useState<Message[]>(seedMessages);
  const [allPriceRecords, setAllPriceRecords] = useState<MarketPriceRecord[]>(seedMarketPriceRecords);
  const [allNotifications, setAllNotifications] = useState<NotificationLog[]>(seedNotificationLog);
  const [allEndorsements, setAllEndorsements] = useState<Endorsement[]>(seedEndorsements);
  const [allTransportOffers, setAllTransportOffers] = useState<TransportOffer[]>(seedTransportOffers);
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const alertedListingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored && seedUsers.some((u) => u.id === stored)) setCurrentUserIdState(stored);
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);

  const session = allUsers.find((u) => u.id === currentUserId) ?? null;
  const currentUser = (session ?? allUsers[0]) as User;

  const persist = useCallback((id: string | null) => {
    try {
      if (id) window.localStorage.setItem(SESSION_STORAGE_KEY, id);
      else window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const signIn = useCallback<WorkspaceContextValue["signIn"]>(
    (phone, otp) => {
      const result = authenticate(phone, otp, allUsers);
      if (!result.ok) {
        toast.error("Sign in failed", { description: result.error });
        return { ok: false, error: result.error };
      }
      setCurrentUserIdState(result.user.id);
      persist(result.user.id);
      toast.success(`Welcome back, ${result.user.name.split(" ")[0]}`, {
        description: `Signed in as ${result.user.roles[0]}.`,
      });
      return { ok: true };
    },
    [persist, allUsers],
  );

  const signOut = useCallback(() => {
    setCurrentUserIdState(null);
    persist(null);
    toast.success("Signed out");
  }, [persist]);

  const setCurrentUserId = useCallback(
    (id: string) => {
      setCurrentUserIdState(id);
      persist(id);
    },
    [persist],
  );

  const can = useCallback(
    (action: Ability) => currentUser.roles.some((r) => ROLE_ABILITIES[r].includes(action)),
    [currentUser],
  );

  const userById = useCallback(
    (id: string | null | undefined) => (id ? allUsers.find((u) => u.id === id) : undefined),
    [allUsers],
  );

  const hasRole = useCallback((role: Role) => currentUser.roles.includes(role), [currentUser]);

  const notify = useCallback(
    (userId: string, kind: NotificationKind, title: string, detail: string) => {
      setAllNotifications((prev) => [
        {
          id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          userId,
          kind,
          title,
          detail,
        },
        ...prev,
      ]);
    },
    [],
  );

  const registerUser: WorkspaceContextValue["registerUser"] = useCallback(
    ({ name, phone, roles, preferredLanguage, locationId }) => {
      const normalized = phone.trim().replace(/\s+/g, "");
      if (allUsers.some((u) => u.phone === normalized)) {
        toast.error("That phone number is already registered", {
          description: "Try signing in instead.",
        });
        return { ok: false, error: "Phone already registered" };
      }
      const id = `u-${Date.now()}`;
      const user: User = {
        id,
        name: name.trim(),
        phone: normalized,
        roles,
        preferredLanguage,
        locationId,
        isVerified: false,
        reliabilityScore: 0,
        avatarColorIndex: allUsers.length % 5,
        status: "active",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setAllUsers((prev) => [...prev, user]);
      setCurrentUserIdState(id);
      persist(id);
      toast.success(`Welcome to Agribridge, ${user.name.split(" ")[0]}`, {
        description: "Your account has been created.",
      });
      return { ok: true };
    },
    [allUsers, persist],
  );

  const updateProfile: WorkspaceContextValue["updateProfile"] = useCallback(
    (fields) => {
      setAllUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...fields } : u)));
      toast.success("Profile updated");
    },
    [currentUser.id],
  );

  /* ------------------------------- Listings ------------------------------- */

  const myListings = useMemo(
    () => allProduceListings.filter((l) => l.sellerId === currentUser.id),
    [allProduceListings, currentUser.id],
  );

  const addListing: WorkspaceContextValue["addListing"] = useCallback(
    (input) => {
      const listing: ProduceListing = {
        ...input,
        id: `PL-${Date.now()}`,
        sellerId: currentUser.id,
        status: "available",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setAllProduceListings((prev) => [listing, ...prev]);
      const matchingBuyers = new Set(
        allBuyerRequests
          .filter((r) => r.productId === listing.productId && r.status === "open")
          .map((r) => r.buyerId),
      );
      const productName = productById(listing.productId)?.name ?? "produce";
      matchingBuyers.forEach((buyerId) =>
        notify(
          buyerId,
          "new_match",
          "New matching listing",
          `A new ${productName} listing (${listing.quantity}${listing.unit}) matches your open request.`,
        ),
      );
      toast.success("Listing published");
    },
    [currentUser.id, allBuyerRequests, notify],
  );

  const updateListing: WorkspaceContextValue["updateListing"] = useCallback((id, fields) => {
    setAllProduceListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...fields } : l)));
    toast.success("Listing updated");
  }, []);

  const deleteListing: WorkspaceContextValue["deleteListing"] = useCallback((id) => {
    setAllProduceListings((prev) => prev.filter((l) => l.id !== id));
    toast.success("Listing removed");
  }, []);

  const renewListing: WorkspaceContextValue["renewListing"] = useCallback((id, expiresAt) => {
    setAllProduceListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "available", expiresAt } : l)),
    );
    toast.success("Listing renewed");
  }, []);

  const matchingRequestsForListing = useCallback(
    (listingId: string) => {
      const listing = allProduceListings.find((l) => l.id === listingId);
      if (!listing) return [];
      return allBuyerRequests.filter(
        (r) => r.productId === listing.productId && r.status === "open",
      );
    },
    [allProduceListings, allBuyerRequests],
  );

  const buyListing: WorkspaceContextValue["buyListing"] = useCallback(
    (listingId, quantity, unitPrice) => {
      const listing = allProduceListings.find((l) => l.id === listingId);
      if (!listing) return false;
      if (listing.status !== "available") {
        toast.error("This listing is no longer available");
        return false;
      }
      if (quantity <= 0 || quantity > listing.quantity) {
        toast.error("Invalid quantity", { description: "Check the available quantity." });
        return false;
      }
      const price = listing.negotiable ? unitPrice : (unitPrice ?? listing.unitPrice ?? 0);
      if (!price || price <= 0) {
        toast.error("Enter a price", { description: "This listing is negotiable — propose a price." });
        return false;
      }
      const now = new Date().toISOString().slice(0, 10);
      const transaction: Transaction = {
        id: `TX-${Date.now()}`,
        buyerId: currentUser.id,
        sellerId: listing.sellerId,
        groupId: null,
        productId: listing.productId,
        quantity,
        unit: listing.unit,
        unitPrice: price,
        status: "pending",
        confirmedBySeller: false,
        confirmedByBuyer: false,
        createdAt: now,
        completedAt: null,
      };
      const remaining = listing.quantity - quantity;
      setAllProduceListings((prev) =>
        prev.map((l) =>
          l.id === listingId
            ? remaining > 0
              ? { ...l, quantity: remaining }
              : { ...l, status: "sold" }
            : l,
        ),
      );
      setAllTransactions((prev) => [transaction, ...prev]);
      const productName = productById(listing.productId)?.name ?? "produce";
      notify(
        listing.sellerId,
        "transaction",
        "New order",
        `${currentUser.name} wants to buy ${quantity}${listing.unit} of ${productName}.`,
      );
      toast.success("Order placed", { description: "Track it from your transactions." });
      return true;
    },
    [allProduceListings, currentUser, notify],
  );

  /* ---------------------------------- Cart ---------------------------------- */

  const addToCart: WorkspaceContextValue["addToCart"] = useCallback(
    (kind, listingId, quantity, offerPrice) => {
      if (quantity <= 0) return;
      if (kind === "produce") {
        const listing = allProduceListings.find((l) => l.id === listingId);
        if (!listing || listing.status !== "available") {
          toast.error("This listing is no longer available");
          return;
        }
        if (listing.sellerId === currentUser.id) {
          toast.error("You can't buy your own listing");
          return;
        }
        if (listing.negotiable && (!offerPrice || offerPrice <= 0)) {
          toast.error("Enter your offer price", { description: "This listing is negotiable." });
          return;
        }
        setCartItems((prev) => {
          const existing = prev.find((l) => l.kind === "produce" && l.listingId === listingId);
          const nextQty = Math.min(listing.quantity, (existing?.quantity ?? 0) + quantity);
          if (existing) {
            const nextOfferPrice = offerPrice ?? existing.offerPrice;
            return prev.map((l) =>
              l.kind === "produce" && l.listingId === listingId
                ? { ...l, quantity: nextQty, ...(nextOfferPrice !== undefined ? { offerPrice: nextOfferPrice } : {}) }
                : l,
            );
          }
          return [
            ...prev,
            { kind: "produce" as const, listingId, quantity: nextQty, ...(offerPrice !== undefined ? { offerPrice } : {}) },
          ];
        });
      } else {
        const listing = allInputListings.find((l) => l.id === listingId);
        if (!listing) {
          toast.error("This listing no longer exists");
          return;
        }
        if (listing.supplierId === currentUser.id) {
          toast.error("You can't buy your own listing");
          return;
        }
        setCartItems((prev) => {
          const existing = prev.find((l) => l.kind === "input" && l.listingId === listingId);
          const nextQty = Math.min(listing.stockQty, (existing?.quantity ?? 0) + quantity);
          if (existing) {
            return prev.map((l) =>
              l.kind === "input" && l.listingId === listingId ? { ...l, quantity: nextQty } : l,
            );
          }
          return [...prev, { kind: "input" as const, listingId, quantity: nextQty }];
        });
      }
      toast.success("Added to cart");
    },
    [allProduceListings, allInputListings, currentUser],
  );

  const updateCartQuantity: WorkspaceContextValue["updateCartQuantity"] = useCallback(
    (kind, listingId, quantity) => {
      setCartItems((prev) => {
        if (quantity <= 0) return prev.filter((l) => !(l.kind === kind && l.listingId === listingId));
        return prev.map((l) => (l.kind === kind && l.listingId === listingId ? { ...l, quantity } : l));
      });
    },
    [],
  );

  const removeFromCart: WorkspaceContextValue["removeFromCart"] = useCallback((kind, listingId) => {
    setCartItems((prev) => prev.filter((l) => !(l.kind === kind && l.listingId === listingId)));
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const cartLines: ResolvedCartLine[] = useMemo(
    () =>
      cartItems.map((line) => {
        if (line.kind === "produce") {
          const listing = allProduceListings.find((l) => l.id === line.listingId);
          const product = productById(listing?.productId);
          const seller = allUsers.find((u) => u.id === listing?.sellerId);
          const unitPrice = listing?.negotiable ? (line.offerPrice ?? null) : (listing?.unitPrice ?? null);
          return {
            ...line,
            productId: listing?.productId ?? "",
            productName: product?.name ?? "Unknown product",
            unit: listing?.unit ?? "kg",
            sellerId: listing?.sellerId ?? "",
            sellerName: seller?.name ?? "Unknown seller",
            unitPrice,
            maxQuantity: listing?.quantity ?? 0,
            lineTotal: unitPrice ? unitPrice * line.quantity : null,
            photo: listing?.photos?.[0],
            available: !!listing && listing.status === "available",
          };
        }
        const listing = allInputListings.find((l) => l.id === line.listingId);
        const product = productById(listing?.productId);
        const seller = allUsers.find((u) => u.id === listing?.supplierId);
        return {
          ...line,
          productId: listing?.productId ?? "",
          productName: product?.name ?? "Unknown product",
          unit: listing?.unit ?? "kg",
          sellerId: listing?.supplierId ?? "",
          sellerName: seller?.name ?? "Unknown supplier",
          unitPrice: listing?.price ?? null,
          maxQuantity: listing?.stockQty ?? 0,
          lineTotal: listing ? listing.price * line.quantity : null,
          photo: listing?.photos?.[0],
          available: !!listing,
        };
      }),
    [cartItems, allProduceListings, allInputListings, allUsers],
  );

  // Number of distinct lines, not the sum of physical quantities — kg/litre
  // amounts don't mean anything added across different products.
  const cartCount = cartItems.length;
  const cartTotal = useMemo(() => cartLines.reduce((s, l) => s + (l.lineTotal ?? 0), 0), [cartLines]);

  const placeOrder: WorkspaceContextValue["placeOrder"] = useCallback(
    (paymentMethod) => {
      if (cartItems.length === 0) {
        toast.error("Your cart is empty");
        return false;
      }
      const now = new Date().toISOString().slice(0, 10);
      const createdTransactions: Transaction[] = [];
      const produceUpdates = new Map<string, number>();
      const inputUpdates = new Map<string, number>();
      const succeededKeys = new Set<string>();
      let skipped = 0;

      cartItems.forEach((line, index) => {
        const key = `${line.kind}__${line.listingId}`;
        if (line.kind === "produce") {
          const listing = allProduceListings.find((l) => l.id === line.listingId);
          const price = listing?.negotiable ? line.offerPrice : listing?.unitPrice;
          if (!listing || listing.status !== "available" || line.quantity > listing.quantity || !price || price <= 0) {
            skipped += 1;
            return;
          }
          createdTransactions.push({
            id: `TX-${Date.now()}-${index}`,
            buyerId: currentUser.id,
            sellerId: listing.sellerId,
            groupId: null,
            productId: listing.productId,
            quantity: line.quantity,
            unit: listing.unit,
            unitPrice: price,
            status: "pending",
            confirmedBySeller: false,
            confirmedByBuyer: false,
            paymentMethod,
            createdAt: now,
            completedAt: null,
          });
          produceUpdates.set(line.listingId, (produceUpdates.get(line.listingId) ?? 0) + line.quantity);
          succeededKeys.add(key);
        } else {
          const listing = allInputListings.find((l) => l.id === line.listingId);
          if (!listing || line.quantity > listing.stockQty) {
            skipped += 1;
            return;
          }
          createdTransactions.push({
            id: `TX-${Date.now()}-${index}`,
            buyerId: currentUser.id,
            sellerId: listing.supplierId,
            groupId: null,
            productId: listing.productId,
            quantity: line.quantity,
            unit: listing.unit,
            unitPrice: listing.price,
            status: "pending",
            confirmedBySeller: false,
            confirmedByBuyer: false,
            paymentMethod,
            createdAt: now,
            completedAt: null,
          });
          inputUpdates.set(line.listingId, (inputUpdates.get(line.listingId) ?? 0) + line.quantity);
          succeededKeys.add(key);
        }
      });

      if (createdTransactions.length === 0) {
        toast.error("Nothing could be ordered", { description: "Those items are no longer available." });
        return false;
      }

      setAllProduceListings((prev) =>
        prev.map((l) => {
          const sub = produceUpdates.get(l.id);
          if (!sub) return l;
          const remaining = l.quantity - sub;
          return remaining > 0 ? { ...l, quantity: remaining } : { ...l, status: "sold" as const };
        }),
      );
      setAllInputListings((prev) =>
        prev.map((l) => {
          const sub = inputUpdates.get(l.id);
          return sub ? { ...l, stockQty: l.stockQty - sub } : l;
        }),
      );
      setAllTransactions((prev) => [...createdTransactions, ...prev]);
      setCartItems((prev) => prev.filter((l) => !succeededKeys.has(`${l.kind}__${l.listingId}`)));

      const sellerIds = new Set(createdTransactions.map((t) => t.sellerId));
      sellerIds.forEach((sellerId) =>
        notify(sellerId, "transaction", "New order", `${currentUser.name} placed a new order.`),
      );

      if (skipped > 0) {
        toast.success("Order placed", {
          description: `${createdTransactions.length} item(s) ordered — ${skipped} item(s) were no longer available and stayed in your cart.`,
        });
      } else {
        toast.success("Order placed", { description: "Track it from your transactions." });
      }
      return true;
    },
    [cartItems, allProduceListings, allInputListings, currentUser, notify],
  );

  /* -------------------------------- Requests -------------------------------- */

  const myRequests = useMemo(
    () => allBuyerRequests.filter((r) => r.buyerId === currentUser.id),
    [allBuyerRequests, currentUser.id],
  );

  const addRequest: WorkspaceContextValue["addRequest"] = useCallback(
    (input) => {
      const request: BuyerRequest = {
        ...input,
        id: `BR-${Date.now()}`,
        buyerId: currentUser.id,
        status: "open",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setAllBuyerRequests((prev) => [request, ...prev]);
      const matchingFarmers = new Set(
        allProduceListings
          .filter((l) => l.productId === request.productId && l.status === "available")
          .map((l) => l.sellerId),
      );
      const productName = productById(request.productId)?.name ?? "produce";
      matchingFarmers.forEach((farmerId) =>
        notify(
          farmerId,
          "new_match",
          "New matching buyer request",
          `A buyer needs ${request.quantityNeeded}${request.unit} of ${productName} — your listing may match.`,
        ),
      );
      toast.success("Request posted");
    },
    [currentUser.id, allProduceListings, notify],
  );

  const updateRequestStatus: WorkspaceContextValue["updateRequestStatus"] = useCallback(
    (id, status) => {
      setAllBuyerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success("Request updated");
    },
    [],
  );

  const rankListingsForRequest = useCallback(
    (request: BuyerRequest, listings: ProduceListing[]) => {
      const targetDistrict = districtOf(request.deliveryLocationId)?.id;
      return [...listings].sort((a, b) => {
        const aSame = districtOf(a.locationId)?.id === targetDistrict ? 0 : 1;
        const bSame = districtOf(b.locationId)?.id === targetDistrict ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        const aPrice = a.unitPrice ?? Number.POSITIVE_INFINITY;
        const bPrice = b.unitPrice ?? Number.POSITIVE_INFINITY;
        if (aPrice !== bPrice) return aPrice - bPrice;
        const aRel = allUsers.find((u) => u.id === a.sellerId)?.reliabilityScore ?? 0;
        const bRel = allUsers.find((u) => u.id === b.sellerId)?.reliabilityScore ?? 0;
        return bRel - aRel;
      });
    },
    [allUsers],
  );

  const matchingListingsForRequest = useCallback(
    (requestId: string) => {
      const request = allBuyerRequests.find((r) => r.id === requestId);
      if (!request) return [];
      const candidates = allProduceListings.filter(
        (l) => l.productId === request.productId && l.status === "available",
      );
      return rankListingsForRequest(request, candidates);
    },
    [allBuyerRequests, allProduceListings, rankListingsForRequest],
  );

  /* ------------------------------ Aggregation ------------------------------ */

  const participantsForGroup = useCallback(
    (groupId: string) => allAggregationParticipants.filter((p) => p.groupId === groupId),
    [allAggregationParticipants],
  );

  const groupsForUser = useCallback(
    (userId: string) => {
      const asFarmer = new Set(
        allAggregationParticipants.filter((p) => p.farmerId === userId).map((p) => p.groupId),
      );
      return allAggregationGroups.filter((g) => {
        const request = allBuyerRequests.find((r) => r.id === g.requestId);
        return asFarmer.has(g.id) || request?.buyerId === userId;
      });
    },
    [allAggregationGroups, allAggregationParticipants, allBuyerRequests],
  );

  const proposeAggregation: WorkspaceContextValue["proposeAggregation"] = useCallback(
    (requestId) => {
      const request = allBuyerRequests.find((r) => r.id === requestId);
      if (!request) return;
      const alreadyIncluded = new Set(
        allAggregationParticipants
          .filter(
            (p) => allAggregationGroups.find((g) => g.id === p.groupId)?.requestId === requestId,
          )
          .map((p) => p.listingId),
      );
      const candidates = allProduceListings.filter(
        (l) =>
          l.productId === request.productId &&
          l.status === "available" &&
          !alreadyIncluded.has(l.id),
      );
      const ranked = rankListingsForRequest(request, candidates);

      const chosen: ProduceListing[] = [];
      let remaining = request.quantityNeeded;
      for (const listing of ranked) {
        if (remaining <= 0) break;
        chosen.push(listing);
        remaining -= listing.quantity;
      }
      if (chosen.length === 0) {
        toast.error("No matching listings found", {
          description: "No available listings match this request yet.",
        });
        return;
      }

      const priced = chosen.filter((l) => l.unitPrice != null).map((l) => l.unitPrice as number);
      const unitPrice =
        request.targetPrice ??
        (priced.length > 0 ? Math.round(priced.reduce((s, p) => s + p, 0) / priced.length) : 0);

      const groupId = `AG-${Date.now()}`;
      const group: AggregationGroup = {
        id: groupId,
        type: "sale",
        requestId,
        status: "proposed",
        targetQuantity: request.quantityNeeded,
        unit: request.unit,
        unitPrice,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        createdAt: new Date().toISOString().slice(0, 10),
      };

      let stillRemaining = request.quantityNeeded;
      const participants: AggregationParticipant[] = chosen.map((listing, i) => {
        const allocated = Math.min(listing.quantity, stillRemaining);
        stillRemaining -= allocated;
        return {
          id: `AP-${Date.now()}-${i}`,
          groupId,
          listingId: listing.id,
          farmerId: listing.sellerId,
          allocatedQuantity: allocated,
          status: "pending",
          agreedUnitPrice: unitPrice,
        };
      });

      setAllAggregationGroups((prev) => [group, ...prev]);
      setAllAggregationParticipants((prev) => [...participants, ...prev]);
      setAllProduceListings((prev) =>
        prev.map((l) => (chosen.some((c) => c.id === l.id) ? { ...l, status: "reserved" } : l)),
      );
      const productName = productById(request.productId)?.name ?? "produce";
      participants.forEach((p) =>
        notify(
          p.farmerId,
          "aggregation_invite",
          "Aggregation invite",
          `A buyer needs ${productName} — confirm your ${p.allocatedQuantity}${group.unit} allocation within 24h.`,
        ),
      );
      toast.success(`Aggregation proposed to ${chosen.length} farmer${chosen.length > 1 ? "s" : ""}`, {
        description: "Each farmer has 24h to accept or decline their allocation.",
      });
    },
    [allBuyerRequests, allAggregationGroups, allAggregationParticipants, allProduceListings, rankListingsForRequest, notify],
  );

  const topUpAggregationGroup: WorkspaceContextValue["topUpAggregationGroup"] = useCallback(
    (groupId) => {
      const group = allAggregationGroups.find((g) => g.id === groupId);
      if (!group) return;
      const participants = allAggregationParticipants.filter((p) => p.groupId === groupId);
      const covered = participants
        .filter((p) => p.status !== "declined")
        .reduce((s, p) => s + p.allocatedQuantity, 0);
      const shortfall = group.targetQuantity - covered;
      if (shortfall <= 0) {
        toast.error("This group already covers its target quantity");
        return;
      }
      const request = allBuyerRequests.find((r) => r.id === group.requestId);
      if (!request) return;
      const alreadyIncluded = new Set(participants.map((p) => p.listingId));
      const candidates = allProduceListings.filter(
        (l) =>
          l.productId === request.productId &&
          l.status === "available" &&
          !alreadyIncluded.has(l.id),
      );
      const ranked = rankListingsForRequest(request, candidates);
      const chosen: ProduceListing[] = [];
      let remaining = shortfall;
      for (const listing of ranked) {
        if (remaining <= 0) break;
        chosen.push(listing);
        remaining -= listing.quantity;
      }
      if (chosen.length === 0) {
        toast.error("No additional farmers found for the shortfall yet");
        return;
      }
      let stillRemaining = shortfall;
      const newParticipants: AggregationParticipant[] = chosen.map((listing, i) => {
        const allocated = Math.min(listing.quantity, stillRemaining);
        stillRemaining -= allocated;
        return {
          id: `AP-${Date.now()}-${i}`,
          groupId,
          listingId: listing.id,
          farmerId: listing.sellerId,
          allocatedQuantity: allocated,
          status: "pending",
          agreedUnitPrice: group.unitPrice,
        };
      });
      setAllAggregationParticipants((prev) => [...newParticipants, ...prev]);
      setAllProduceListings((prev) =>
        prev.map((l) => (chosen.some((c) => c.id === l.id) ? { ...l, status: "reserved" } : l)),
      );
      const productName = productById(request.productId)?.name ?? "produce";
      newParticipants.forEach((p) =>
        notify(
          p.farmerId,
          "aggregation_invite",
          "Aggregation invite",
          `A buyer needs ${productName} — confirm your ${p.allocatedQuantity}${group.unit} allocation within 24h.`,
        ),
      );
      toast.success(`Found ${chosen.length} more farmer${chosen.length > 1 ? "s" : ""} for the shortfall`);
    },
    [allAggregationGroups, allAggregationParticipants, allBuyerRequests, allProduceListings, rankListingsForRequest, notify],
  );

  const respondToAggregation: WorkspaceContextValue["respondToAggregation"] = useCallback(
    (participantId, accept) => {
      const participant = allAggregationParticipants.find((p) => p.id === participantId);
      if (!participant) return;
      const status: ParticipantStatus = accept ? "accepted" : "declined";
      setAllAggregationParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, status } : p)),
      );
      setAllProduceListings((prev) =>
        prev.map((l) =>
          l.id === participant.listingId ? { ...l, status: accept ? "reserved" : "available" } : l,
        ),
      );
      const group = allAggregationGroups.find((g) => g.id === participant.groupId);
      const buyerId = allBuyerRequests.find((r) => r.id === group?.requestId)?.buyerId;
      if (buyerId) {
        notify(
          buyerId,
          "aggregation_invite",
          accept ? "Farmer accepted" : "Farmer declined",
          `${currentUser.name} ${accept ? "accepted" : "declined"} their ${participant.allocatedQuantity}${group?.unit ?? ""} allocation.`,
        );
      }
      toast.success(accept ? "Allocation accepted" : "Allocation declined", {
        description: accept
          ? "You're now part of this aggregation group."
          : "The buyer will be matched with other farmers for the shortfall.",
      });

      if (!accept && group) {
        // Re-run candidate selection for the shortfall right away (§4.3 "Reconcile"),
        // computed from this same snapshot so the just-declined participant is excluded.
        const request = allBuyerRequests.find((r) => r.id === group.requestId);
        const siblings = allAggregationParticipants.filter(
          (p) => p.groupId === group.id && p.id !== participantId,
        );
        const covered = siblings
          .filter((p) => p.status !== "declined")
          .reduce((s, p) => s + p.allocatedQuantity, 0);
        const shortfall = group.targetQuantity - covered;
        if (request && shortfall > 0) {
          const alreadyIncluded = new Set([
            ...siblings.map((p) => p.listingId),
            participant.listingId,
          ]);
          const candidates = allProduceListings.filter(
            (l) =>
              l.productId === request.productId &&
              l.status === "available" &&
              !alreadyIncluded.has(l.id),
          );
          const ranked = rankListingsForRequest(request, candidates);
          const chosen: ProduceListing[] = [];
          let remaining = shortfall;
          for (const listing of ranked) {
            if (remaining <= 0) break;
            chosen.push(listing);
            remaining -= listing.quantity;
          }
          if (chosen.length > 0) {
            let stillRemaining = shortfall;
            const newParticipants: AggregationParticipant[] = chosen.map((listing, i) => {
              const allocated = Math.min(listing.quantity, stillRemaining);
              stillRemaining -= allocated;
              return {
                id: `AP-${Date.now()}-${i}`,
                groupId: group.id,
                listingId: listing.id,
                farmerId: listing.sellerId,
                allocatedQuantity: allocated,
                status: "pending",
                agreedUnitPrice: group.unitPrice,
              };
            });
            setAllAggregationParticipants((prev) => [...newParticipants, ...prev]);
            setAllProduceListings((prev) =>
              prev.map((l) => (chosen.some((c) => c.id === l.id) ? { ...l, status: "reserved" } : l)),
            );
            const productName = productById(request.productId)?.name ?? "produce";
            newParticipants.forEach((p) =>
              notify(
                p.farmerId,
                "aggregation_invite",
                "Aggregation invite",
                `A buyer needs ${productName} — confirm your ${p.allocatedQuantity}${group.unit} allocation within 24h.`,
              ),
            );
          }
        }
      }
    },
    [
      allAggregationParticipants,
      allAggregationGroups,
      allBuyerRequests,
      allProduceListings,
      currentUser.name,
      notify,
      rankListingsForRequest,
    ],
  );

  const confirmAggregationGroup: WorkspaceContextValue["confirmAggregationGroup"] = useCallback(
    (groupId) => {
      const group = allAggregationGroups.find((g) => g.id === groupId);
      if (!group) return;
      const participants = allAggregationParticipants.filter((p) => p.groupId === groupId);
      const accepted = participants.filter((p) => p.status === "accepted");
      if (accepted.length === 0) {
        toast.error("No farmers have accepted yet");
        return;
      }
      const confirmedQuantity = accepted.reduce((s, p) => s + p.allocatedQuantity, 0);
      const status: AggregationStatus =
        confirmedQuantity >= group.targetQuantity ? "confirmed" : "partially_confirmed";

      const now = new Date().toISOString().slice(0, 10);
      const newTransactions: Transaction[] = accepted.map((p, i) => ({
        id: `TX-${Date.now()}-${i}`,
        buyerId: allBuyerRequests.find((r) => r.id === group.requestId)?.buyerId ?? "",
        sellerId: p.farmerId,
        groupId: group.id,
        productId: allProduceListings.find((l) => l.id === p.listingId)?.productId ?? "",
        quantity: p.allocatedQuantity,
        unit: group.unit,
        unitPrice: p.agreedUnitPrice,
        status: "pending",
        confirmedBySeller: false,
        confirmedByBuyer: false,
        createdAt: now,
        completedAt: null,
      }));

      setAllAggregationGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, status } : g)));
      setAllProduceListings((prev) =>
        prev.map((l) => (accepted.some((p) => p.listingId === l.id) ? { ...l, status: "sold" } : l)),
      );
      if (group.requestId) {
        setAllBuyerRequests((prev) =>
          prev.map((r) =>
            r.id === group.requestId
              ? { ...r, status: status === "confirmed" ? "filled" : "partially_filled" }
              : r,
          ),
        );
      }
      setAllTransactions((prev) => [...newTransactions, ...prev]);
      toast.success("Aggregation group confirmed", {
        description: `${accepted.length} transaction${accepted.length > 1 ? "s" : ""} created.`,
      });
    },
    [allAggregationGroups, allAggregationParticipants, allBuyerRequests, allProduceListings],
  );

  /* --------------------------- Input marketplace --------------------------- */

  const myInputListings = useMemo(
    () => allInputListings.filter((l) => l.supplierId === currentUser.id),
    [allInputListings, currentUser.id],
  );

  const addInputListing: WorkspaceContextValue["addInputListing"] = useCallback(
    (input) => {
      const listing: InputListing = {
        ...input,
        id: `IL-${Date.now()}`,
        supplierId: currentUser.id,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setAllInputListings((prev) => [listing, ...prev]);
      toast.success("Input listed");
    },
    [currentUser.id],
  );

  const updateInputListing: WorkspaceContextValue["updateInputListing"] = useCallback(
    (id, fields) => {
      setAllInputListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...fields } : l)));
      toast.success("Listing updated");
    },
    [],
  );

  const deleteInputListing: WorkspaceContextValue["deleteInputListing"] = useCallback((id) => {
    setAllInputListings((prev) => prev.filter((l) => l.id !== id));
    toast.success("Listing removed");
  }, []);

  const orderInput: WorkspaceContextValue["orderInput"] = useCallback(
    (inputListingId, quantity) => {
      const listing = allInputListings.find((l) => l.id === inputListingId);
      if (!listing) return;
      if (quantity <= 0 || quantity > listing.stockQty) {
        toast.error("Invalid quantity", { description: "Check the available stock." });
        return;
      }
      const transaction: Transaction = {
        id: `TX-${Date.now()}`,
        buyerId: currentUser.id,
        sellerId: listing.supplierId,
        groupId: null,
        productId: listing.productId,
        quantity,
        unit: listing.unit,
        unitPrice: listing.price,
        status: "pending",
        confirmedBySeller: false,
        confirmedByBuyer: false,
        createdAt: new Date().toISOString().slice(0, 10),
        completedAt: null,
      };
      setAllInputListings((prev) =>
        prev.map((l) => (l.id === inputListingId ? { ...l, stockQty: l.stockQty - quantity } : l)),
      );
      setAllTransactions((prev) => [transaction, ...prev]);
      notify(
        listing.supplierId,
        "transaction",
        "New order",
        `${currentUser.name} ordered ${quantity}${listing.unit} of ${productById(listing.productId)?.name ?? "input"}.`,
      );
      toast.success("Order placed", { description: "Track it from your transactions." });
    },
    [allInputListings, currentUser, notify],
  );

  /* ---------------------------- Group purchases ---------------------------- */

  const pledgesForGroupPurchase = useCallback(
    (groupPurchaseId: string) => allPledges.filter((p) => p.groupPurchaseId === groupPurchaseId),
    [allPledges],
  );

  const pledgedQuantityFor = useCallback(
    (groupPurchaseId: string) =>
      pledgesForGroupPurchase(groupPurchaseId).reduce((s, p) => s + p.pledgedQuantity, 0),
    [pledgesForGroupPurchase],
  );

  const createGroupPurchase: WorkspaceContextValue["createGroupPurchase"] = useCallback(
    ({ inputListingId, thresholdQuantity, deadline }) => {
      const groupPurchase: GroupPurchase = {
        id: `GP-${Date.now()}`,
        inputListingId,
        thresholdQuantity,
        deadline,
        status: "collecting",
        supplierInvoiceTotal: null,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setAllGroupPurchases((prev) => [groupPurchase, ...prev]);
      toast.success("Group purchase opened");
    },
    [],
  );

  const pledgeToGroupPurchase: WorkspaceContextValue["pledgeToGroupPurchase"] = useCallback(
    (groupPurchaseId, quantity) => {
      if (quantity <= 0) {
        toast.error("Enter a quantity greater than zero");
        return;
      }
      const groupPurchase = allGroupPurchases.find((g) => g.id === groupPurchaseId);
      if (!groupPurchase || groupPurchase.status !== "collecting") {
        toast.error("This group purchase is no longer collecting pledges");
        return;
      }
      const existingForGroup = allPledges.filter((p) => p.groupPurchaseId === groupPurchaseId);
      const existingMine = existingForGroup.find((p) => p.farmerId === currentUser.id);
      const nextPledgesForGroup: GroupPurchasePledge[] = existingMine
        ? existingForGroup.map((p) =>
            p.id === existingMine.id ? { ...p, pledgedQuantity: p.pledgedQuantity + quantity } : p,
          )
        : [
            ...existingForGroup,
            {
              id: `GPP-${Date.now()}`,
              groupPurchaseId,
              farmerId: currentUser.id,
              pledgedQuantity: quantity,
              computedShareAmount: null,
            },
          ];
      setAllPledges((prev) => [
        ...nextPledgesForGroup,
        ...prev.filter((p) => p.groupPurchaseId !== groupPurchaseId),
      ]);
      const inputListing = allInputListings.find((l) => l.id === groupPurchase.inputListingId);
      notify(
        inputListing?.supplierId ?? "",
        "group_purchase",
        "New pledge",
        `${currentUser.name} pledged ${quantity}${inputListing?.unit ?? ""} toward the group purchase.`,
      );

      const totalPledged = nextPledgesForGroup.reduce((s, p) => s + p.pledgedQuantity, 0);
      if (inputListing && totalPledged >= groupPurchase.thresholdQuantity) {
        const invoiceTotal = totalPledged * inputListing.price;
        const now = new Date().toISOString().slice(0, 10);
        const newTransactions: Transaction[] = nextPledgesForGroup.map((p, i) => ({
          id: `TX-${Date.now()}-${i}`,
          buyerId: p.farmerId,
          sellerId: inputListing.supplierId,
          groupId: groupPurchase.id,
          productId: inputListing.productId,
          quantity: p.pledgedQuantity,
          unit: inputListing.unit,
          unitPrice: inputListing.price,
          status: "pending",
          confirmedBySeller: false,
          confirmedByBuyer: false,
          createdAt: now,
          completedAt: null,
        }));
        setAllPledges((prev) =>
          prev.map((p) =>
            p.groupPurchaseId === groupPurchaseId
              ? { ...p, computedShareAmount: (p.pledgedQuantity / totalPledged) * invoiceTotal }
              : p,
          ),
        );
        setAllGroupPurchases((prev) =>
          prev.map((g) =>
            g.id === groupPurchaseId
              ? { ...g, status: "fulfilled", supplierInvoiceTotal: invoiceTotal }
              : g,
          ),
        );
        setAllTransactions((prev) => [...newTransactions, ...prev]);
        nextPledgesForGroup.forEach((p) =>
          notify(
            p.farmerId,
            "group_purchase",
            "Group purchase fulfilled",
            `The order for ${inputListing ? productById(inputListing.productId)?.name : "your input"} was placed — your share is being invoiced.`,
          ),
        );
        toast.success("Threshold reached — order placed automatically", {
          description: "The supplier invoice was split proportionally across every pledge.",
        });
      } else {
        toast.success("Pledge recorded");
      }
    },
    [currentUser, allGroupPurchases, allPledges, allInputListings, notify],
  );

  const fulfillGroupPurchase: WorkspaceContextValue["fulfillGroupPurchase"] = useCallback(
    (groupPurchaseId) => {
      const groupPurchase = allGroupPurchases.find((g) => g.id === groupPurchaseId);
      const inputListing = allInputListings.find((l) => l.id === groupPurchase?.inputListingId);
      if (!groupPurchase || !inputListing) return;
      const pledges = allPledges.filter((p) => p.groupPurchaseId === groupPurchaseId);
      const totalPledged = pledges.reduce((s, p) => s + p.pledgedQuantity, 0);
      if (totalPledged === 0) {
        toast.error("No pledges yet");
        return;
      }
      const invoiceTotal = totalPledged * inputListing.price;
      const now = new Date().toISOString().slice(0, 10);
      const newTransactions: Transaction[] = pledges.map((p, i) => ({
        id: `TX-${Date.now()}-${i}`,
        buyerId: p.farmerId,
        sellerId: inputListing.supplierId,
        groupId: groupPurchase.id,
        productId: inputListing.productId,
        quantity: p.pledgedQuantity,
        unit: inputListing.unit,
        unitPrice: inputListing.price,
        status: "pending",
        confirmedBySeller: false,
        confirmedByBuyer: false,
        createdAt: now,
        completedAt: null,
      }));

      setAllPledges((prev) =>
        prev.map((p) =>
          p.groupPurchaseId === groupPurchaseId
            ? { ...p, computedShareAmount: (p.pledgedQuantity / totalPledged) * invoiceTotal }
            : p,
        ),
      );
      setAllGroupPurchases((prev) =>
        prev.map((g) =>
          g.id === groupPurchaseId
            ? { ...g, status: "fulfilled", supplierInvoiceTotal: invoiceTotal }
            : g,
        ),
      );
      setAllTransactions((prev) => [...newTransactions, ...prev]);
      pledges.forEach((p) =>
        notify(
          p.farmerId,
          "group_purchase",
          "Group purchase fulfilled",
          `The order for ${productById(inputListing.productId)?.name ?? "your input"} was placed — your share is being invoiced.`,
        ),
      );
      toast.success("Group purchase fulfilled", {
        description: `Invoice split across ${pledges.length} farmer${pledges.length > 1 ? "s" : ""}.`,
      });
    },
    [allGroupPurchases, allInputListings, allPledges, notify],
  );

  /* ------------------------------ Transactions ------------------------------ */

  const myTransactions = useMemo(
    () => allTransactions.filter((t) => t.buyerId === currentUser.id || t.sellerId === currentUser.id),
    [allTransactions, currentUser.id],
  );

  const confirmTransaction: WorkspaceContextValue["confirmTransaction"] = useCallback(
    (id, as) => {
      const tx = allTransactions.find((t) => t.id === id);
      if (!tx) return;
      const bothWillBeConfirmed =
        (as === "seller" || tx.confirmedBySeller) && (as === "buyer" || tx.confirmedByBuyer);
      setAllTransactions((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const confirmedBySeller = as === "seller" ? true : t.confirmedBySeller;
          const confirmedByBuyer = as === "buyer" ? true : t.confirmedByBuyer;
          const bothConfirmed = confirmedBySeller && confirmedByBuyer;
          const status: TransactionStatus = bothConfirmed
            ? "completed"
            : as === "seller"
              ? "confirmed_by_seller"
              : "confirmed_by_buyer";
          return {
            ...t,
            confirmedBySeller,
            confirmedByBuyer,
            status,
            completedAt: bothConfirmed ? new Date().toISOString().slice(0, 10) : t.completedAt,
          };
        }),
      );
      if (bothWillBeConfirmed) {
        setAllUsers((prev) => bumpReliability(bumpReliability(prev, tx.buyerId, 2), tx.sellerId, 2));
      }
      const otherParty = currentUser.id === tx.buyerId ? tx.sellerId : tx.buyerId;
      notify(
        otherParty,
        "transaction",
        bothWillBeConfirmed ? "Transaction completed" : "Transaction confirmed",
        `${currentUser.name} confirmed ${productById(tx.productId)?.name ?? "the order"}${bothWillBeConfirmed ? " — it's now complete." : "."}`,
      );
      toast.success("Confirmed", {
        description: "Once both sides confirm, the transaction is marked complete.",
      });
    },
    [allTransactions, currentUser, notify],
  );

  const raiseDispute: WorkspaceContextValue["raiseDispute"] = useCallback(
    (id, reason) => {
      const tx = allTransactions.find((t) => t.id === id);
      setAllTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "disputed", disputeReason: reason } : t)),
      );
      if (tx) {
        const otherParty = currentUser.id === tx.buyerId ? tx.sellerId : tx.buyerId;
        notify(otherParty, "transaction", "Dispute raised", reason);
        allUsers
          .filter((u) => u.roles.includes("admin"))
          .forEach((admin) =>
            notify(admin.id, "transaction", "Buyer or seller raised a dispute", reason),
          );
      }
      toast.success("Dispute raised", { description: "An admin will review this transaction." });
    },
    [allTransactions, allUsers, currentUser, notify],
  );

  const resolveDispute: WorkspaceContextValue["resolveDispute"] = useCallback(
    (id) => {
      const tx = allTransactions.find((t) => t.id === id);
      setAllTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: "completed", completedAt: new Date().toISOString().slice(0, 10) }
            : t,
        ),
      );
      if (tx) {
        notify(tx.buyerId, "transaction", "Dispute resolved", "An admin marked this transaction complete.");
        notify(tx.sellerId, "transaction", "Dispute resolved", "An admin marked this transaction complete.");
      }
      toast.success("Dispute resolved");
    },
    [allTransactions, notify],
  );

  const requestRefund: WorkspaceContextValue["requestRefund"] = useCallback(
    (id, reason) => {
      const tx = allTransactions.find((t) => t.id === id);
      if (!tx) return;
      setAllTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "refund_requested", refundReason: reason } : t)),
      );
      const otherParty = currentUser.id === tx.buyerId ? tx.sellerId : tx.buyerId;
      notify(otherParty, "transaction", "Refund requested", reason);
      allUsers
        .filter((u) => u.roles.includes("admin"))
        .forEach((admin) => notify(admin.id, "transaction", "Refund requested", reason));
      toast.success("Refund requested", { description: "An admin will review this transaction." });
    },
    [allTransactions, allUsers, currentUser, notify],
  );

  const resolveRefund: WorkspaceContextValue["resolveRefund"] = useCallback(
    (id, approve) => {
      const tx = allTransactions.find((t) => t.id === id);
      if (!tx) return;
      setAllTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: approve ? "refunded" : "completed" } : t)),
      );
      notify(
        tx.buyerId,
        "transaction",
        approve ? "Refund approved" : "Refund denied",
        approve ? "Your refund was approved." : "Your refund request was denied.",
      );
      notify(
        tx.sellerId,
        "transaction",
        approve ? "Refund approved" : "Refund denied",
        approve ? "A refund was issued to the buyer." : "The refund request was denied.",
      );
      toast.success(approve ? "Refund approved" : "Refund denied");
    },
    [allTransactions, notify],
  );

  const rateTransaction: WorkspaceContextValue["rateTransaction"] = useCallback(
    (id, score, comment) => {
      const tx = allTransactions.find((t) => t.id === id);
      if (!tx) return;
      const ratedUser = currentUser.id === tx.buyerId ? tx.sellerId : tx.buyerId;
      const rating: Rating = {
        id: `RT-${Date.now()}`,
        transactionId: id,
        ratedBy: currentUser.id,
        ratedUser,
        score,
        ...(comment ? { comment } : {}),
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setAllRatings((prev) => [rating, ...prev]);
      setAllUsers((prev) => bumpReliability(prev, ratedUser, (score - 3) * 2));
      toast.success("Rating submitted");
    },
    [allTransactions, currentUser.id],
  );

  const ratingsForUser = useCallback(
    (userId: string) => allRatings.filter((r) => r.ratedUser === userId),
    [allRatings],
  );

  /* -------------------------------- Messaging ------------------------------- */

  const threadsForUser = useCallback(
    (userId: string) => allThreads.filter((t) => t.participantIds.includes(userId)),
    [allThreads],
  );

  const messagesForThread = useCallback(
    (threadId: string) => allMessages.filter((m) => m.threadId === threadId),
    [allMessages],
  );

  const startThread: WorkspaceContextValue["startThread"] = useCallback(
    ({ otherUserId, subject, relatedListingId, relatedRequestId, firstMessage }) => {
      const threadId = `MT-${Date.now()}`;
      const now = new Date().toISOString();
      const thread: MessageThread = {
        id: threadId,
        participantIds: [currentUser.id, otherUserId],
        subject,
        ...(relatedListingId ? { relatedListingId } : {}),
        ...(relatedRequestId ? { relatedRequestId } : {}),
        lastMessageAt: now,
      };
      const message: Message = {
        id: `MSG-${Date.now()}`,
        threadId,
        senderId: currentUser.id,
        body: firstMessage,
        sentAt: now,
      };
      setAllThreads((prev) => [thread, ...prev]);
      setAllMessages((prev) => [...prev, message]);
      toast.success("Message sent");
    },
    [currentUser.id],
  );

  const sendMessage: WorkspaceContextValue["sendMessage"] = useCallback(
    (threadId, body) => {
      const now = new Date().toISOString();
      const message: Message = {
        id: `MSG-${Date.now()}`,
        threadId,
        senderId: currentUser.id,
        body,
        sentAt: now,
      };
      setAllMessages((prev) => [...prev, message]);
      setAllThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, lastMessageAt: now } : t)));
      toast.success("Message sent");
    },
    [currentUser.id],
  );

  /* ------------------------------ Market prices ------------------------------ */

  const addManualPriceRecord: WorkspaceContextValue["addManualPriceRecord"] = useCallback(
    ({ productId, districtId, avgPrice }) => {
      const record: MarketPriceRecord = {
        id: `MP-${Date.now()}`,
        productId,
        districtId,
        avgPrice,
        sampleDate: new Date().toISOString().slice(0, 10),
        source: "manual_survey",
      };
      setAllPriceRecords((prev) => [record, ...prev]);
      toast.success("Price record added");
    },
    [],
  );

  // Rolling 7-day average per product+district, computed from completed
  // transactions (source of truth once volume exists) — merged alongside the
  // manually-curated survey rows the spec calls for while data is sparse.
  const computedMarketPriceRecords = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const groups = new Map<string, { productId: string; districtId: string; prices: number[] }>();
    allTransactions
      .filter((t) => t.status === "completed" && new Date(t.createdAt).getTime() >= cutoff)
      .forEach((t) => {
        const seller = allUsers.find((u) => u.id === t.sellerId);
        const district = districtOf(seller?.locationId);
        if (!district) return;
        const key = `${t.productId}__${district.id}`;
        const entry = groups.get(key) ?? { productId: t.productId, districtId: district.id, prices: [] };
        entry.prices.push(t.unitPrice);
        groups.set(key, entry);
      });
    const derived: MarketPriceRecord[] = Array.from(groups.entries()).map(([key, g]) => ({
      id: `computed-${key}`,
      productId: g.productId,
      districtId: g.districtId,
      avgPrice: Math.round(g.prices.reduce((s, p) => s + p, 0) / g.prices.length),
      sampleDate: new Date().toISOString().slice(0, 10),
      source: "transaction" as const,
    }));
    const derivedKeys = new Set(derived.map((d) => `${d.productId}__${d.districtId}`));
    const supplementalSeed = allPriceRecords.filter(
      (r) => !derivedKeys.has(`${r.productId}__${r.districtId}`),
    );
    return [...derived, ...supplementalSeed];
  }, [allTransactions, allUsers, allPriceRecords]);

  /* ------------------------------- Notifications ------------------------------ */

  const notificationsForUser = useCallback(
    (userId: string) => allNotifications.filter((n) => n.userId === userId),
    [allNotifications],
  );

  /* ------------------------------ Endorsements ------------------------------ */

  const addEndorsement: WorkspaceContextValue["addEndorsement"] = useCallback(
    ({ endorsedId, note }) => {
      const endorsement: Endorsement = {
        id: `end-${Date.now()}`,
        endorserId: currentUser.id,
        endorsedId,
        note,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setAllEndorsements((prev) => [endorsement, ...prev]);
      setAllUsers((prev) => bumpReliability(prev, endorsedId, 15));
      notify(
        endorsedId,
        "system",
        "You were vouched for",
        `${currentUser.name} vouched for you on Agribridge.`,
      );
      toast.success("Endorsement added", { description: "Their reliability tier has been boosted." });
    },
    [currentUser, notify],
  );

  /* ----------------------------- Transport pooling ---------------------------- */

  const offersForGroup = useCallback(
    (groupId: string) => allTransportOffers.filter((o) => o.groupId === groupId),
    [allTransportOffers],
  );

  const offerTransport: WorkspaceContextValue["offerTransport"] = useCallback(
    (groupId, note) => {
      const offer: TransportOffer = {
        id: `TO-${Date.now()}`,
        groupId,
        transporterId: currentUser.id,
        ...(note ? { note } : {}),
        createdAt: new Date().toISOString(),
      };
      setAllTransportOffers((prev) => [offer, ...prev]);
      const group = allAggregationGroups.find((g) => g.id === groupId);
      const buyerId = allBuyerRequests.find((r) => r.id === group?.requestId)?.buyerId;
      if (buyerId) {
        notify(
          buyerId,
          "system",
          "Transporter available",
          `${currentUser.name} offered to carry the confirmed aggregation group.`,
        );
      }
      toast.success("Offer sent", { description: "The buyer has been notified." });
    },
    [currentUser, allAggregationGroups, allBuyerRequests, notify],
  );

  /* ------------------------- Scheduled-job simulation ------------------------- */
  // Mirrors §8.5 (spoilage alerts) and the expiry sweep implied by FR-3: a
  // client-side interval stands in for the background jobs the real spec runs
  // server-side, since this build has no server/cron to host them.
  const produceListingsRef = useRef(allProduceListings);
  useEffect(() => {
    produceListingsRef.current = allProduceListings;
  }, [allProduceListings]);

  useEffect(() => {
    function runMaintenance() {
      const today = new Date().toISOString().slice(0, 10);
      setAllProduceListings((prev) => {
        let changed = false;
        const next = prev.map((l) => {
          if (l.status === "available" && l.expiresAt < today) {
            changed = true;
            return { ...l, status: "expired" as const };
          }
          return l;
        });
        return changed ? next : prev;
      });
      const now = Date.now();
      produceListingsRef.current.forEach((l) => {
        if (l.status !== "available" || alertedListingIds.current.has(l.id)) return;
        const shelfLifeDays = productById(l.productId)?.shelfLifeDays;
        if (!shelfLifeDays) return;
        const spoilAt = new Date(l.harvestDate).getTime() + shelfLifeDays * 24 * 60 * 60 * 1000;
        if (spoilAt - now <= 48 * 60 * 60 * 1000 && spoilAt > now) {
          alertedListingIds.current.add(l.id);
          notify(
            l.sellerId,
            "spoilage_alert",
            "Listing may spoil soon",
            `Your ${productById(l.productId)?.name ?? "produce"} listing is nearing its shelf-life window — consider lowering the price.`,
          );
        }
      });
    }
    const id = setInterval(runMaintenance, 60_000);
    runMaintenance();
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------- Admin ---------------------------------- */

  const verifyUser: WorkspaceContextValue["verifyUser"] = useCallback((id, verified) => {
    setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isVerified: verified } : u)));
    toast.success(verified ? "User verified" : "Verification removed");
  }, []);

  const setUserSuspended: WorkspaceContextValue["setUserSuspended"] = useCallback(
    (id, suspended) => {
      setAllUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: suspended ? "suspended" : "active" } : u)),
      );
      toast.success(suspended ? "User suspended" : "User reinstated");
    },
    [],
  );

  const expireListing: WorkspaceContextValue["expireListing"] = useCallback((id) => {
    setAllProduceListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "expired" } : l)));
    toast.success("Listing expired");
  }, []);

  const value: WorkspaceContextValue = {
    users: allUsers,
    currentUser,
    session,
    ready,
    signIn,
    registerUser,
    signOut,
    setCurrentUserId,
    can,
    userById,
    hasRole,
    updateProfile,

    cooperatives: seedCooperatives,
    endorsements: allEndorsements,
    addEndorsement,

    transportOffers: allTransportOffers,
    offersForGroup,
    offerTransport,

    produceListings: allProduceListings,
    myListings,
    addListing,
    updateListing,
    deleteListing,
    renewListing,
    matchingRequestsForListing,
    buyListing,

    buyerRequests: allBuyerRequests,
    myRequests,
    addRequest,
    updateRequestStatus,
    matchingListingsForRequest,

    aggregationGroups: allAggregationGroups,
    aggregationParticipants: allAggregationParticipants,
    participantsForGroup,
    groupsForUser,
    proposeAggregation,
    respondToAggregation,
    confirmAggregationGroup,
    topUpAggregationGroup,

    inputListings: allInputListings,
    myInputListings,
    addInputListing,
    updateInputListing,
    deleteInputListing,
    orderInput,

    groupPurchases: allGroupPurchases,
    groupPurchasePledges: allPledges,
    pledgesForGroupPurchase,
    pledgedQuantityFor,
    createGroupPurchase,
    pledgeToGroupPurchase,
    fulfillGroupPurchase,

    transactions: allTransactions,
    myTransactions,
    confirmTransaction,
    raiseDispute,
    resolveDispute,
    rateTransaction,
    ratingsForUser,
    requestRefund,
    resolveRefund,

    cartItems,
    cartLines,
    cartCount,
    cartTotal,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    placeOrder,

    messageThreads: allThreads,
    messages: allMessages,
    threadsForUser,
    messagesForThread,
    startThread,
    sendMessage,

    marketPriceRecords: computedMarketPriceRecords,
    addManualPriceRecord,

    notifications: allNotifications,
    notificationsForUser,

    verifyUser,
    setUserSuspended,
    expireListing,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}
