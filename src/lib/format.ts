export function timeAgo(timestamp: string, now: number = Date.now()): string {
  const diff = now - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatRwf(amount: number): string {
  return `RWF ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString("en-US")} ${unit}`;
}
