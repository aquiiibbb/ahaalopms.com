/**
 * PAYMENT GATEWAY SERVICE (US MARKET FOCUS)
 * Supports: Stripe, Fortis, Shift4, PAYBOTX, Venmo, Zelle
 */

export const STORAGE_KEY_PAYMENT_GATEWAYS = "hotelpms_payment_gateways_v1";

export const DEFAULT_PAYMENT_GATEWAY_CONFIG = {
  activePrimaryGateway: "stripe",
  activeOnlineGateway: "stripe",
  enableCardSurcharge: false,
  cardSurchargePercent: 3.0,
  
  // STRIPE CONFIG
  stripe: {
    enabled: true,
    environment: "sandbox", // 'sandbox' | 'live'
    publishableKey: "pk_test_sample_stripe_key_991823",
    secretKey: "sk_test_sample_stripe_secret_881923",
    terminalLocationId: "tmpl_loc_77192",
    enableApplePay: true,
    enableGooglePay: true,
  },

  // FORTIS CONFIG
  fortis: {
    enabled: true,
    environment: "sandbox",
    developerId: "fortis_dev_9912",
    apiKey: "fortis_key_secret_1234",
    locationId: "fortis_loc_001",
    terminalSerial: "FORTIS-TERM-88492",
  },

  // SHIFT4 CONFIG
  shift4: {
    enabled: true,
    environment: "sandbox",
    merchantId: "S4_MERCHANT_44819",
    accessBlockKey: "s4_access_key_9921",
    skyTabTerminalId: "SKYTAB-POS-0092",
  },

  // PAYBOTX CONFIG
  paybotx: {
    enabled: true,
    environment: "sandbox",
    botApiToken: "pbx_token_9918274619",
    partnerAccountId: "PBX-HOTEL-8819",
    autoCapture: true,
  },

  // VENMO CONFIG
  venmo: {
    enabled: true,
    venmoHandle: "@HotelFrontDeskUSD",
    businessName: "Grand Plaza Hotel & Suites",
    qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=venmo://paycharge?txn=pay&recipients=HotelFrontDeskUSD",
  },

  // ZELLE CONFIG
  zelle: {
    enabled: true,
    registeredPhone: "+1 (800) 555-0199",
    registeredEmail: "payments@grandplazahotel.com",
    bankRefName: "Grand Plaza Hospitality Inc",
  }
};

/**
 * Retrieve saved Payment Gateway configurations or defaults
 */
export function getPaymentGatewayConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENT_GATEWAYS);
    if (!raw) return DEFAULT_PAYMENT_GATEWAY_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PAYMENT_GATEWAY_CONFIG, ...parsed };
  } catch (err) {
    console.error("Error parsing payment gateway config:", err);
    return DEFAULT_PAYMENT_GATEWAY_CONFIG;
  }
}

/**
 * Return array of enabled gateway keys e.g. ['stripe', 'fortis']
 */
export function getEnabledPaymentGateways() {
  const config = getPaymentGatewayConfig();
  const gateways = ["stripe", "fortis", "shift4", "paybotx", "venmo", "zelle"];
  return gateways.filter((gw) => Boolean(config[gw]?.enabled));
}

/**
 * Check if a specific gateway is enabled
 */
export function isGatewayEnabled(gatewayKey) {
  const config = getPaymentGatewayConfig();
  return Boolean(config[String(gatewayKey).toLowerCase()]?.enabled);
}

/**
 * Save updated Payment Gateway configuration to localStorage
 */
export function savePaymentGatewayConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY_PAYMENT_GATEWAYS, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("pms_payment_gateways_updated", { detail: config }));
    return true;
  } catch (err) {
    console.error("Error saving payment gateway config:", err);
    return false;
  }
}

/**
 * Simulate live terminal payment execution (Stripe / Fortis / Shift4 / PAYBOTX)
 */
export function processTerminalCharge({ gateway, amount, currency = "USD", folioId, roomNo, cardToken }) {
  const config = getPaymentGatewayConfig();
  const gatewayInfo = config[gateway] || {};

  const txnId = `${gateway.toUpperCase()}-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    success: true,
    gateway: gateway.toUpperCase(),
    transactionId: txnId,
    amount: Number(amount),
    currency,
    folioId,
    roomNo,
    status: "APPROVED",
    cardBrand: "Visa / Mastercard",
    last4: cardToken ? cardToken.slice(-4) : "4242",
    terminalId: gatewayInfo.terminalSerial || gatewayInfo.terminalLocationId || gatewayInfo.skyTabTerminalId || "TERM-ONLINE-01",
    timestamp: new Date().toISOString(),
    receiptUrl: `https://pms-receipts.local/${txnId}`
  };
}

/**
 * Simulate pre-authorization (Card hold)
 */
export function processPreAuth({ gateway, amount, currency = "USD", folioId }) {
  const authId = `${gateway.toUpperCase()}-AUTH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  return {
    success: true,
    gateway: gateway.toUpperCase(),
    authId,
    amountHold: Number(amount),
    currency,
    folioId,
    status: "AUTHORIZED_HOLD",
    expiresInDays: 7,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate SMS/Email payment link for guest
 */
export function generatePaymentLink({ amount, currency = "USD", guestPhone, guestEmail, folioId }) {
  const linkId = `PAYLINK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const payUrl = `https://pay.grandplazahotel.com/checkout/${linkId}?amt=${amount}&folio=${folioId}`;
  
  return {
    success: true,
    linkId,
    payUrl,
    amount: Number(amount),
    currency,
    sentToPhone: guestPhone || null,
    sentToEmail: guestEmail || null,
    timestamp: new Date().toISOString()
  };
}
