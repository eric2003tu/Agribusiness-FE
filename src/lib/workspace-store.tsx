import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  districtOf,
  type AggregationGroup,
  type AggregationParticipant,
  type AggregationStatus,
  type BuyerRequest,
  type Cooperative,
  type Endorsement,
  type GroupPurchase,
  type GroupPurchasePledge,
  type InputListing,
  type MarketPriceRecord,
  type Message,
  type MessageThread,
  type NotificationLog,
  type ParticipantStatus,
  type ProduceListing,
  type Rating,
  type RequestStatus,
  type Role,
  type Transaction,
  type TransactionStatus,
  type User,
} from "./mock-data";

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

  produceListings: ProduceListing[];
  myListings: ProduceListing[];
  addListing: (input: Omit<ProduceListing, "id" | "sellerId" | "status" | "createdAt">) => void;
  updateListing: (id: string, fields: Partial<ProduceListing>) => void;
  deleteListing: (id: string) => void;
  renewListing: (id: string, expiresAt: string) => void;
  matchingRequestsForListing: (listingId: string) => BuyerRequest[];

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
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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
      toast.success("Listing published");
    },
    [currentUser.id],
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
      toast.success("Request posted");
    },
    [currentUser.id],
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
      toast.success(`Aggregation proposed to ${chosen.length} farmer${chosen.length > 1 ? "s" : ""}`, {
        description: "Each farmer has 24h to accept or decline their allocation.",
      });
    },
    [allBuyerRequests, allAggregationGroups, allAggregationParticipants, allProduceListings, rankListingsForRequest],
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
      toast.success(accept ? "Allocation accepted" : "Allocation declined", {
        description: accept
          ? "You're now part of this aggregation group."
          : "The buyer will be matched with other farmers for the shortfall.",
      });
    },
    [allAggregationParticipants],
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
      toast.success("Order placed", { description: "Track it from your transactions." });
    },
    [allInputListings, currentUser.id],
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
      setAllPledges((prev) => {
        const existing = prev.find(
          (p) => p.groupPurchaseId === groupPurchaseId && p.farmerId === currentUser.id,
        );
        if (existing) {
          return prev.map((p) =>
            p.id === existing.id ? { ...p, pledgedQuantity: p.pledgedQuantity + quantity } : p,
          );
        }
        return [
          ...prev,
          {
            id: `GPP-${Date.now()}`,
            groupPurchaseId,
            farmerId: currentUser.id,
            pledgedQuantity: quantity,
            computedShareAmount: null,
          },
        ];
      });
      toast.success("Pledge recorded");
    },
    [currentUser.id],
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
      toast.success("Group purchase fulfilled", {
        description: `Invoice split across ${pledges.length} farmer${pledges.length > 1 ? "s" : ""}.`,
      });
    },
    [allGroupPurchases, allInputListings, allPledges],
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
      toast.success("Confirmed", {
        description: "Once both sides confirm, the transaction is marked complete.",
      });
    },
    [allTransactions],
  );

  const raiseDispute: WorkspaceContextValue["raiseDispute"] = useCallback((id, reason) => {
    setAllTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "disputed", disputeReason: reason } : t)),
    );
    toast.success("Dispute raised", { description: "An admin will review this transaction." });
  }, []);

  const resolveDispute: WorkspaceContextValue["resolveDispute"] = useCallback((id) => {
    setAllTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: "completed", completedAt: new Date().toISOString().slice(0, 10) }
          : t,
      ),
    );
    toast.success("Dispute resolved");
  }, []);

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

  /* ------------------------------- Notifications ------------------------------ */

  const notificationsForUser = useCallback(
    (userId: string) => allNotifications.filter((n) => n.userId === userId),
    [allNotifications],
  );

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
    signOut,
    setCurrentUserId,
    can,
    userById,
    hasRole,
    updateProfile,

    cooperatives: seedCooperatives,
    endorsements: seedEndorsements,

    produceListings: allProduceListings,
    myListings,
    addListing,
    updateListing,
    deleteListing,
    renewListing,
    matchingRequestsForListing,

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

    messageThreads: allThreads,
    messages: allMessages,
    threadsForUser,
    messagesForThread,
    startThread,
    sendMessage,

    marketPriceRecords: allPriceRecords,
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
