/**
 * Business constants shared by client and server code. Pure module: no env reads,
 * so it is safe to import from anywhere.
 */

/** AB Essentia's WhatsApp business number in international format, no '+' or spaces. */
export const WHATSAPP_NUMBER = '233242351314';

/** Same number as an E.164 tel: link. Note there is no trunk '0' after +233. */
export const PHONE_E164 = '+233242351314';

export const CONTACT_PHONE_DISPLAY = '+233 (0) 24 235 1314';
export const CONTACT_EMAIL = 'info@abessentiagh.com';

/** Prefilled WhatsApp chat link. */
export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
