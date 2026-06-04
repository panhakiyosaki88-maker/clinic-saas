/**
 * Builds a merchant-presented KHQR (Cambodia / Bakong) EMVCo payload string.
 *
 * The string is rendered as a QR image for the customer to scan. This generates
 * the payload only — settlement/auto-confirmation needs the Bakong API, so the
 * UI pairs this with a manual "mark as paid". Spec: NBC KHQR (EMVCo TLV + CRC16).
 */

/** CRC16/CCITT-FALSE over the payload (poly 0x1021, init 0xFFFF). */
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** EMVCo TLV: 2-char id + 2-digit length + value. */
const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

export interface KhqrInput {
  merchantAccount: string; // Bakong account id, e.g. name@bank
  merchantName: string;
  merchantCity: string;
  amount?: number;
  currency?: "USD" | "KHR";
  billNumber?: string;
}

export function buildKhqr(input: KhqrInput): string {
  const { merchantAccount, merchantName, merchantCity, amount = 0, currency = "USD", billNumber } = input;

  let p = "";
  p += tlv("00", "01"); // payload format indicator
  p += tlv("01", amount > 0 ? "12" : "11"); // 12 = dynamic (has amount), 11 = static
  // Tag 29: individual account information under the Bakong namespace.
  p += tlv("29", tlv("00", "kh.gov.nbc.bakong") + tlv("01", merchantAccount));
  p += tlv("52", "5999"); // merchant category code (misc)
  p += tlv("53", currency === "KHR" ? "116" : "840"); // ISO 4217 numeric
  if (amount > 0) p += tlv("54", amount.toFixed(2));
  p += tlv("58", "KH"); // country code
  p += tlv("59", merchantName.slice(0, 25));
  p += tlv("60", merchantCity.slice(0, 15));
  if (billNumber) p += tlv("62", tlv("01", billNumber.slice(0, 25))); // additional data: bill number

  p += "6304"; // CRC tag id + length, value computed over everything incl. this prefix
  return p + crc16(p);
}
