// Service to look up City and State/Province (Full Name) for US and Canada Zip/Postal Codes

const US_STATE_MAP = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
  PR: "Puerto Rico",
  VI: "Virgin Islands",
  GU: "Guam"
};

const CA_PROVINCE_MAP = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon"
};

/**
 * Normalizes state abbreviation to Full Name if applicable
 */
export function getFullStateName(stateStr, isCanada = false) {
  if (!stateStr) return "";
  const trimmed = stateStr.trim();
  const upper = trimmed.toUpperCase();

  if (isCanada) {
    if (CA_PROVINCE_MAP[upper]) return CA_PROVINCE_MAP[upper];
  } else {
    if (US_STATE_MAP[upper]) return US_STATE_MAP[upper];
  }

  // Return as-is if already full name or unmatched
  return trimmed;
}

/**
 * Fetches City, State (Full Name), and Country for a given US or Canada zip/postal code.
 * Returns null if lookup fails or zip format is invalid.
 */
export async function fetchCityStateFromZip(inputZip) {
  if (!inputZip || typeof inputZip !== "string") return null;

  const cleaned = inputZip.trim().toUpperCase().replace(/\s+/g, "");

  // Check US ZIP: 5 digits (e.g., 90210)
  const isUsZip = /^\d{5}$/.test(cleaned);

  // Check Canada Postal Code: 6 characters (e.g., K1A0B1) or 3-char FSA (e.g., K1A)
  const isCaPostal = /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned) || /^[A-Z]\d[A-Z]$/.test(cleaned);

  if (!isUsZip && !isCaPostal) {
    return null;
  }

  try {
    const countryCode = isUsZip ? "us" : "ca";
    // For Canada, Zippopotam uses FSA (first 3 characters) or full postal code prefix
    const lookupKey = isUsZip ? cleaned : cleaned.substring(0, 3);

    const response = await fetch(`https://api.zippopotam.us/${countryCode}/${lookupKey}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.places) || data.places.length === 0) {
      return null;
    }

    const place = data.places[0];
    const rawCity = place["place name"] || "";
    const rawStateAbbr = place["state abbreviation"] || place["state"] || "";
    const fullStateName = getFullStateName(rawStateAbbr, isCaPostal);

    return {
      city: rawCity,
      state: fullStateName,
      stateAbbr: rawStateAbbr,
      country: isUsZip ? "United States" : "Canada"
    };
  } catch (err) {
    // Fail silently on network errors so typing is uninterrupted
    return null;
  }
}
