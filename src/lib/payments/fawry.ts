import { createHash } from "crypto";

// FawryPay integration core — signature build + callback verification.
// Docs: https://developer.fawrystaging.com  (Express Checkout + Server-to-Server Notification V2)
//
// Credentials come from the merchant's Fawry account (per-merchant, no public sandbox):
//   FAWRY_MERCHANT_CODE, FAWRY_SECURITY_KEY, FAWRY_MODE=sandbox|production

const MERCHANT = process.env.FAWRY_MERCHANT_CODE || "";
const SECURE_KEY = process.env.FAWRY_SECURITY_KEY || "";
const MODE = process.env.FAWRY_MODE === "production" ? "production" : "sandbox";

export const FAWRY_BASE =
  MODE === "production" ? "https://www.atfawry.com" : "https://atfawry.fawrystaging.com";

// FawryPay hosted checkout JS plugin (loaded client-side to render card/wallet UI).
export const FAWRY_PLUGIN_URL = `${FAWRY_BASE}/atfawry/plugin/assets/payments/fawrypay-payments.js`;

export const fawryConfigured = () => Boolean(MERCHANT && SECURE_KEY);

const money = (n: number | string) => Number(n).toFixed(2);
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

export interface FawryItem {
  itemId: string;
  description: string;
  price: number;
  quantity: number;
}

export interface ChargeRequest {
  merchantCode: string;
  merchantRefNum: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  customerProfileId?: string;
  chargeItems: Array<{ itemId: string; description: string; price: string; quantity: number }>;
  returnUrl: string;
  language: string;
  signature: string;
  paymentExpiry?: number;
}

/**
 * Build a signed FawryPay charge request for the hosted checkout.
 * Signature = SHA256( merchantCode + merchantRefNum + customerProfileId("" if none)
 *   + returnUrl + Σ(itemId + quantity + price[2dp]) sorted by itemId + secureKey )
 */
export function buildChargeRequest(opts: {
  merchantRefNum: string;
  items: FawryItem[];
  returnUrl: string;
  customer?: { name?: string; mobile?: string; email?: string; profileId?: string };
  paymentExpiryMs?: number;
}): ChargeRequest {
  const { merchantRefNum, items, returnUrl, customer } = opts;
  const profileId = customer?.profileId ?? "";
  const sorted = [...items].sort((a, b) => a.itemId.localeCompare(b.itemId));
  const itemsPart = sorted.map((i) => `${i.itemId}${i.quantity}${money(i.price)}`).join("");
  const signature = sha256(`${MERCHANT}${merchantRefNum}${profileId}${returnUrl}${itemsPart}${SECURE_KEY}`);

  return {
    merchantCode: MERCHANT,
    merchantRefNum,
    customerName: customer?.name,
    customerMobile: customer?.mobile,
    customerEmail: customer?.email,
    customerProfileId: profileId || undefined,
    chargeItems: sorted.map((i) => ({
      itemId: i.itemId,
      description: i.description,
      price: money(i.price),
      quantity: i.quantity,
    })),
    returnUrl,
    language: "ar-eg",
    signature,
    ...(opts.paymentExpiryMs ? { paymentExpiry: opts.paymentExpiryMs } : {}),
  };
}

type CallbackLike = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));
const cents = (v: unknown) => (v == null || v === "" ? "" : money(v as number));

/**
 * Verify a FawryPay server notification (V2) signature.
 * Signature = SHA256( fawryRefNumber + merchantRefNum + paymentAmount[2dp] + orderAmount[2dp]
 *   + orderStatus + paymentMethod + fawryFees[2dp] + (shippingFees[2dp]?) + (authNumber?)
 *   + (customerMail?) + (customerMobile?) + secureKey )
 */
export function verifyCallbackSignature(cb: CallbackLike): boolean {
  const provided = str(cb.messageSignature || cb.signature).toLowerCase();
  if (!provided) return false;
  const parts =
    str(cb.fawryRefNumber || cb.referenceNumber) +
    str(cb.merchantRefNumber || cb.merchantRefNum) +
    cents(cb.paymentAmount) +
    cents(cb.orderAmount) +
    str(cb.orderStatus) +
    str(cb.paymentMethod) +
    cents(cb.fawryFees) +
    (cb.shippingFees != null && cb.shippingFees !== "" ? cents(cb.shippingFees) : "") +
    (cb.authNumber ? str(cb.authNumber) : "") +
    (cb.customerMail ? str(cb.customerMail) : "") +
    (cb.customerMobile ? str(cb.customerMobile) : "");
  return sha256(parts + SECURE_KEY).toLowerCase() === provided;
}

export const isPaid = (cb: CallbackLike) => str(cb.orderStatus).toUpperCase() === "PAID";
