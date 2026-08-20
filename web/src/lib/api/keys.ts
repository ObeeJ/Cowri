import type { Uuid } from './types'

/**
 * Every query key in one place, so an invalidation after a money-moving
 * mutation can be checked against the full list rather than guessed at.
 */
export const queryKeys = {
  wallet: ['wallet'] as const,
  transactions: (page: number, perPage: number) => ['wallet', 'transactions', page, perPage] as const,
  transactionsAll: ['wallet', 'transactions'] as const,

  ajoList: ['ajo'] as const,
  ajoDetail: (id: Uuid) => ['ajo', 'detail', id] as const,
  ajoInvite: (id: Uuid) => ['ajo', 'invite', id] as const,

  billList: (page: number, perPage: number) => ['bills', 'list', page, perPage] as const,
  billListAll: ['bills'] as const,
  billDetail: (id: Uuid) => ['bills', 'detail', id] as const,

  adminDashboard: ['admin', 'dashboard'] as const,
  adminUsers: ['admin', 'users'] as const,
  adminUser: (id: Uuid) => ['admin', 'users', id] as const,
  adminTransactions: (page: number, perPage: number) =>
    ['admin', 'transactions', page, perPage] as const,
  adminAjo: ['admin', 'ajo'] as const,
  adminOutbox: ['admin', 'outbox'] as const,

  health: ['system', 'health'] as const,
  ledgerCheck: ['system', 'ledger-check'] as const,
}
