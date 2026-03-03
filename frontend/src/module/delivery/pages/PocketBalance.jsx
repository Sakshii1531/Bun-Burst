import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import {
  fetchDeliveryWallet,
  calculateDeliveryBalances,
  calculatePeriodEarnings
} from "../utils/deliveryWalletState"
import { formatCurrency } from "../../restaurant/utils/currency"
import { deliveryAPI } from "@/lib/api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function PocketBalancePage() {
  const navigate = useNavigate()
  const [walletState, setWalletState] = useState({
    totalBalance: 0,
    cashInHand: 0,
    totalWithdrawn: 0,
    totalEarned: 0,
    transactions: [],
    joiningBonusClaimed: false
  })
  const [walletLoading, setWalletLoading] = useState(true)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)

  // Fetch wallet data from API (cashInHand = Cash collected from backend)
  const fetchWalletData = async () => {
    try {
      setWalletLoading(true)
      const walletData = await fetchDeliveryWallet()
      setWalletState(walletData)
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      setWalletState({
        totalBalance: 0,
        cashInHand: 0,
        totalWithdrawn: 0,
        totalEarned: 0,
        transactions: [],
        joiningBonusClaimed: false
      })
    } finally {
      setWalletLoading(false)
    }
  }

  useEffect(() => {
    fetchWalletData()

    const handleWalletUpdate = () => {
      fetchWalletData()
    }

    window.addEventListener('deliveryWalletStateUpdated', handleWalletUpdate)
    window.addEventListener('storage', handleWalletUpdate)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchWalletData()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Refetch periodically when visible so admin approve/reject reflects in pocket balance
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchWalletData()
    }, 20000)

    return () => {
      window.removeEventListener('deliveryWalletStateUpdated', handleWalletUpdate)
      window.removeEventListener('storage', handleWalletUpdate)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [])

  const balances = calculateDeliveryBalances(walletState)
  
  // Calculate weekly earnings for the current week (excludes bonus)
  const weeklyEarnings = calculatePeriodEarnings(walletState, 'week')
  
  // Calculate total bonus amount from all bonus transactions
  const totalBonus = walletState?.transactions
    ?.filter(t => t.type === 'bonus' && t.status === 'Completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0
  
  // Calculate total withdrawn (needed for pocket balance calculation)
  const totalWithdrawn = balances.totalWithdrawn || 0
  
  // Pocket balance = total balance (includes bonus + earnings)
  // Formula: Pocket Balance = Earnings + Bonus - Withdrawals
  // Use walletState.pocketBalance if available, otherwise calculate from totalBalance
  let pocketBalance = walletState?.pocketBalance !== undefined 
    ? walletState.pocketBalance 
    : (walletState?.totalBalance || balances.totalBalance || 0)
  
  // IMPORTANT: Ensure pocket balance includes bonus
  // If backend totalBalance is 0 but we have bonus, calculate it manually
  // This ensures bonus is always reflected in pocket balance and withdrawable amount
  if (pocketBalance === 0 && totalBonus > 0) {
    // If totalBalance is 0 but we have bonus, pocket balance = bonus
    pocketBalance = totalBonus
  } else if (pocketBalance > 0 && totalBonus > 0) {
    // Verify pocket balance includes bonus
    // Calculate expected: Earnings + Bonus - Withdrawals
    const expectedBalance = weeklyEarnings + totalBonus - totalWithdrawn
    // Use the higher value to ensure bonus is included
    if (expectedBalance > pocketBalance) {
      pocketBalance = expectedBalance
    }
  }
  
  // Calculate cash collected (cash in hand)
  const cashCollected = balances.cashInHand || 0
  
  // Deductions = actual deductions only (fees, penalties). Pending withdrawal is NOT a deduction.
  const deductions = 0
  
  // Amount withdrawn = approved + pending (requested) withdrawals. Withdraw ki hui amount yahin dikhegi.
  const amountWithdrawnDisplay = (balances.totalWithdrawn || 0) + (balances.pendingWithdrawals || 0)
  
  // Withdrawal limit from admin (min amount above which withdrawal is allowed)
  const withdrawalLimit = Number(walletState?.deliveryWithdrawalLimit) || 100
  
  // Withdrawable amount = pocket balance (includes bonus + earnings)
  const withdrawableAmount = pocketBalance > 0 ? pocketBalance : 0
  
  // Withdrawal allowed only when withdrawable amount >= withdrawal limit
  const canWithdraw = withdrawableAmount >= withdrawalLimit && withdrawableAmount > 0
  
  // Debug logging (cashInHand = Cash collected from backend)
