/** Numéro d'adhérent du type MEM-2026-A1B2C3. */
export const newMembershipNumber = () =>
  `MEM-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')}`;
