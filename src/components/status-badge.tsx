import { cva } from "class-variance-authority";
import {
  AGGREGATION_STATUS_LABELS,
  GROUP_PURCHASE_STATUS_LABELS,
  LISTING_STATUS_LABELS,
  PARTICIPANT_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  TRANSACTION_STATUS_LABELS,
  type AggregationStatus,
  type GroupPurchaseStatus,
  type ListingStatus,
  type ParticipantStatus,
  type RequestStatus,
  type TransactionStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
);

const LISTING_STYLES: Record<ListingStatus, string> = {
  available: "bg-success/12 text-success",
  reserved: "bg-warning/20 text-warning-foreground",
  sold: "bg-primary-soft text-primary",
  expired: "bg-muted text-muted-foreground",
};

const REQUEST_STYLES: Record<RequestStatus, string> = {
  open: "bg-info/12 text-info",
  partially_filled: "bg-warning/20 text-warning-foreground",
  filled: "bg-success/12 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

const AGGREGATION_STYLES: Record<AggregationStatus, string> = {
  proposed: "bg-info/12 text-info",
  partially_confirmed: "bg-warning/20 text-warning-foreground",
  confirmed: "bg-success/12 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

const PARTICIPANT_STYLES: Record<ParticipantStatus, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  accepted: "bg-success/12 text-success",
  declined: "bg-destructive/12 text-destructive",
};

const TRANSACTION_STYLES: Record<TransactionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed_by_seller: "bg-info/12 text-info",
  confirmed_by_buyer: "bg-info/12 text-info",
  completed: "bg-success/12 text-success",
  disputed: "bg-destructive/12 text-destructive",
  refund_requested: "bg-warning/20 text-warning-foreground",
  refunded: "bg-muted text-muted-foreground",
};

const GROUP_PURCHASE_STYLES: Record<GroupPurchaseStatus, string> = {
  collecting: "bg-info/12 text-info",
  fulfilled: "bg-success/12 text-success",
  expired: "bg-muted text-muted-foreground",
};

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={cn(badge(), LISTING_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {LISTING_STATUS_LABELS[status]}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={cn(badge(), REQUEST_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );
}

export function AggregationStatusBadge({ status }: { status: AggregationStatus }) {
  return (
    <span className={cn(badge(), AGGREGATION_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {AGGREGATION_STATUS_LABELS[status]}
    </span>
  );
}

export function ParticipantStatusBadge({ status }: { status: ParticipantStatus }) {
  return (
    <span className={cn(badge(), PARTICIPANT_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {PARTICIPANT_STATUS_LABELS[status]}
    </span>
  );
}

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={cn(badge(), TRANSACTION_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {TRANSACTION_STATUS_LABELS[status]}
    </span>
  );
}

export function GroupPurchaseStatusBadge({ status }: { status: GroupPurchaseStatus }) {
  return (
    <span className={cn(badge(), GROUP_PURCHASE_STYLES[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {GROUP_PURCHASE_STATUS_LABELS[status]}
    </span>
  );
}
