/** The order states in the owner's language, shared by the admin list and the order page. */
export const STATUS_DA: Record<string, string> = {
  NEW: 'Ny', PREVIEW_READY: 'Preview klar', PAID: 'Betalt', IN_RETOUCH: 'I retouch', AWAITING_APPROVAL: 'Venter på godkendelse', CHANGE_REQUESTED: 'Ændring ønsket',
  APPROVED: 'Godkendt', IN_PRODUCTION: 'I produktion', SHIPPED: 'Sendt', COMPLETED: 'Afsluttet', REFUNDED: 'Refunderet', MANUAL_REVIEW: 'Manuel vurdering', ABANDONED: 'Opgivet',
};

export const statusDa = (s: string) => STATUS_DA[s] ?? s;
