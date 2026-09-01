import type { Role, User } from "./mock-data";

export interface DemoCredential {
  role: Role;
  label: string;
  phone: string;
  otp: string;
  blurb: string;
}

/** Demo accounts standing in for phone+OTP sign-in — one per primary role. */
export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    role: "farmer",
    label: "Farmer — cooperative member",
    phone: "+250788100001",
    otp: "1234",
    blurb: "Lists produce, joins aggregation groups and group input purchases.",
  },
  {
    role: "farmer",
    label: "Farmer — also a buyer",
    phone: "+250788100007",
    otp: "1234",
    blurb: "Sells produce and buys inputs — roles aren't mutually exclusive.",
  },
  {
    role: "buyer",
    label: "Buyer — food processor",
    phone: "+250788200001",
    otp: "1234",
    blurb: "Posts bulk requests and gets matched against aggregated farmer listings.",
  },
  {
    role: "supplier",
    label: "Input supplier",
    phone: "+250788300001",
    otp: "1234",
    blurb: "Lists fertilizer/seed/pesticide and fulfils group purchase orders.",
  },
  {
    role: "transporter",
    label: "Transporter",
    phone: "+250788400001",
    otp: "1234",
    blurb: "Offers shared transport once an aggregation group is confirmed.",
  },
  {
    role: "admin",
    label: "Platform admin",
    phone: "+250788999999",
    otp: "1234",
    blurb: "Verifies suppliers, moderates listings and resolves disputes.",
  },
];

/** Any other seeded user can sign in with this shared demo OTP. */
export const SHARED_DEMO_OTP = "1234";

export function authenticate(phone: string, otp: string, users: User[]) {
  const normalized = phone.trim().replace(/\s+/g, "");
  const user = users.find((u) => u.phone === normalized);
  if (!user) return { ok: false as const, error: "No account found for that phone number." };
  if (user.status === "suspended") {
    return { ok: false as const, error: "This account has been suspended." };
  }

  const demo = DEMO_CREDENTIALS.find((c) => c.phone === normalized);
  const expected = demo?.otp ?? SHARED_DEMO_OTP;
  if (otp !== expected) return { ok: false as const, error: "Incorrect OTP code." };

  return { ok: true as const, user };
}

export const SESSION_STORAGE_KEY = "agribridge.session.user";
