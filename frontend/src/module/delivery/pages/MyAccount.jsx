import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Wallet,
  Wifi,
  X,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  getDeliveryWalletState, 
  calculateDeliveryBalances 
} from "../utils/deliveryWalletState"
import { formatCurrency } from "../../restaurant/utils/currency"

export default function MyAccount() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [walletState, setWalletState] = useState(() => getDeliveryWalletState())

  // Listen for wallet state updates
  useEffect(() => {
    const handleWalletUpdate = () => {
      setWalletState(getDeliveryWalletState())
    }

    // Check on mount
    handleWalletUpdate()

    // Listen for custom event (for same tab updates)
    window.addEventListener('deliveryWalletStateUpdated', handleWalletUpdate)
    // Listen for storage event (for cross-tab updates)
    window.addEventListener('storage', handleWalletUpdate)

    return () => {
      window.removeEventListener('deliveryWalletStateUpdated', handleWalletUpdate)
      window.removeEventListener('storage', handleWalletUpdate)
    }
  }, [location.pathname])

  const balances = calculateDeliveryBalances(walletState)

  return (
    <div className="min-h-screen bg-[#f6e9dc] overflow-x-hidden pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:py-6 flex items-center gap-4 rounded-b-3xl md:rounded-b-none">
        <button 
          onClick={() => navigate("/delivery")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 flex flex-col items-center">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-900 rounded-full flex items-center justify-center mb-2 md:mb-3">
            <Wifi className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Account</h1>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        {/* Payable Amount Card */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Wallet className="w-6 h-6 md:w-8 md:h-8 text-white flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-sm md:text-base mb-1">Payable Amount</p>
                <p className="text-white text-3xl md:text-4xl font-bold">
                  {formatCurrency(balances.cashInHand)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto md:flex-shrink-0">
              <Button 
                onClick={() => setShowConfirmDialog(true)}
                className="bg-[#ff8100] hover:bg-[#e67300] text-white font-semibold px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm w-full md:w-auto"
              >
                Adjust Payments
              </Button>
              <Button 
                onClick={() => {
                  // TODO: Process payment
