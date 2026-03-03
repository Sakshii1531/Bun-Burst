/**
 * Delivery Wallet State Management Utility
 * Fetches wallet data from API instead of using localStorage/default data
 */

import { deliveryAPI } from '@/lib/api'

// Empty wallet state structure (no default data)
const EMPTY_WALLET_STATE = {
  totalBalance: 0,
  cashInHand: 0,
  totalWithdrawn: 0,
  totalEarned: 0,
  transactions: [],
  joiningBonusClaimed: false,
  joiningBonusAmount: 0
}

/**
 * Fetch wallet data from API
 * @returns {Promise<Object>} - Wallet state object
 */
export const fetchDeliveryWallet = async () => {
  try {
