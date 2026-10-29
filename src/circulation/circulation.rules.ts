/** Règles de la bibliothèque (modifiables au même endroit). */
export const LIBRARY_RULES = {
  /** Durée d'un prêt par défaut, en jours. */
  LOAN_DAYS: 14,
  /** Durée maximale d'un prêt au guichet, en jours. */
  MAX_LOAN_DAYS: 30,
  /** Nombre de livres qu'un adhérent peut avoir en même temps. */
  MAX_ACTIVE_LOANS: 3,
  /** Nombre de renouvellements autorisés par prêt. */
  MAX_RENEWALS: 2,
  /** Jours ajoutés à chaque renouvellement. */
  RENEWAL_DAYS: 14,
  /** Nombre de réservations actives (en attente ou prêtes) par adhérent. */
  MAX_ACTIVE_RESERVATIONS: 3,
  /** Jours pendant lesquels un livre réservé reste mis de côté au comptoir. */
  HOLD_DAYS: 3,
  /** Amende par jour de retard, en euros. */
  FINE_PER_DAY: 0.2,
} as const;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
