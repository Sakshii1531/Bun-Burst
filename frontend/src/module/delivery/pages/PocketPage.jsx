import { useEffect, useRef, useState, useMemo } from "react"
import Lenis from "lenis"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Home,
  FileText,
  UtensilsCrossed,
  User,
  ArrowRight,
  Lightbulb,
  HelpCircle,
  Wallet,
  CheckCircle,
  Receipt,
  FileText as FileTextIcon,
  Wallet as WalletIcon,
  Sparkles,
  IndianRupee
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  fetchDeliveryWallet,
  calculateDeliveryBalances,
  calculatePeriodEarnings
} from "../utils/deliveryWalletState"
import { formatCurrency } from "../../restaurant/utils/currency"
import { useGigStore } from "../store/gigStore"
import { useProgressStore } from "../store/progressStore"
import { getAllDeliveryOrders } from "../utils/deliveryOrderStatus"
import { deliveryAPI } from "@/lib/api"
import { API_BASE_URL } from "@/lib/api/config"
import FeedNavbar from "../components/FeedNavbar"
import AvailableCashLimit from "../components/AvailableCashLimit"
import BottomPopup from "../components/BottomPopup"
import DepositPopup from "../components/DepositPopup"

export default function PocketPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [animationKey, setAnimationKey] = useState(0)
  const [walletState, setWalletState] = useState({
    totalBalance: 0,
    cashInHand: 0,
    totalWithdrawn: 0,
    totalEarned: 0,
    transactions: [],
    joiningBonusClaimed: false
  })
  const [walletLoading, setWalletLoading] = useState(true)

  const [currentCarouselSlide, setCurrentCarouselSlide] = useState(0)
  const carouselRef = useRef(null)
  const carouselStartX = useRef(0)
  const carouselIsSwiping = useRef(false)
  const carouselAutoRotateRef = useRef(null)

  const [showCashLimitPopup, setShowCashLimitPopup] = useState(false)
  const [showDepositPopup, setShowDepositPopup] = useState(false)
  const [bankDetailsFilled, setBankDetailsFilled] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [activeEarningAddon, setActiveEarningAddon] = useState(null)
  const [earningAddonLoading, setEarningAddonLoading] = useState(true)

  const {
    isOnline,
    bookedGigs,
    goOnline,
    goOffline
  } = useGigStore()

  const { getDateData, hasDateData } = useProgressStore()

  // Fetch bank details status
  useEffect(() => {
    const checkBankDetails = async () => {
      try {
        const response = await deliveryAPI.getProfile()
        if (response?.data?.success && response?.data?.data?.profile) {
          const profile = response.data.data.profile
          const bankDetails = profile?.documents?.bankDetails

          // Check if all required bank details fields are filled
          const isFilled = !!(
            bankDetails?.accountHolderName?.trim() &&
            bankDetails?.accountNumber?.trim() &&
            bankDetails?.ifscCode?.trim() &&
            bankDetails?.bankName?.trim()
          )

          setBankDetailsFilled(isFilled)
        }
      } catch (error) {
        // Skip logging timeout errors (handled by axios interceptor)
        if (error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
          console.error("Error checking bank details:", error)
        }
        // Default to showing the banner if we can't check
        setBankDetailsFilled(false)
      }
    }

    checkBankDetails()

    // Listen for profile updates
    const handleProfileRefresh = () => {
      checkBankDetails()
    }

    window.addEventListener('deliveryProfileRefresh', handleProfileRefresh)

    return () => {
      window.removeEventListener('deliveryProfileRefresh', handleProfileRefresh)
    }
  }, [])

  // Carousel slides data - only show bank details banner when not filled
  const carouselSlides = useMemo(() =>
    bankDetailsFilled ? [] : [{
      id: 2,
      title: "Submit bank details",
      subtitle: "PAN & bank details required for payouts",
      icon: "bank",
      buttonText: "Submit",
      bgColor: "bg-yellow-400"
    }]
    , [bankDetailsFilled])

  // Calculate balances
  const balances = calculateDeliveryBalances(walletState)

  // Debug: Log wallet state and balances
  useEffect(() => {
