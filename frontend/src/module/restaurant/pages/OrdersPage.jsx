import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import BottomNavbar from "../components/BottomNavbar"
import MenuOverlay from "../components/MenuOverlay"
import NewOrderNotification from "../components/NewOrderNotification"
import { useRestaurantNotifications } from "../hooks/useRestaurantNotifications"
import {
  Home,
  ShoppingBag,
  Store,
  Wallet,
  Menu,
  CheckCircle,
  Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
import { getOrderStatus, normalizeStatus, matchesOrdersPageFilter, ORDER_STATUS } from "../utils/orderStatus"
import { getTransactionsByType, getOrderPaymentAmount } from "../utils/walletState"
import { formatCurrency, usdToInr } from "../utils/currency"
import { restaurantAPI } from "@/lib/api"

export default function OrdersPage() {
  const navigate = useNavigate()
  // Default to "all" to show all orders (active + history)
  const [activeFilterTab, setActiveFilterTab] = useState("all")
  const [showMenu, setShowMenu] = useState(false)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Restaurant notifications hook
  const { newOrder, clearNewOrder, isConnected } = useRestaurantNotifications()

  // Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  // Calculate summary cards from payment transactions
  const calculateSummaryCards = () => {
    const paymentTransactions = getTransactionsByType("payment")
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thisWeek = new Date(today)
    thisWeek.setDate(today.getDate() - 7)

    const thisMonth = new Date(today)
    thisMonth.setMonth(today.getMonth() - 1)

    const parseDate = (dateString) => {
      // Parse date string like "01 Jun 2023" or "07 Feb 2023"
      try {
        const parts = dateString.split(' ')
        if (parts.length === 3) {
          const day = parseInt(parts[0])
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const month = monthNames.indexOf(parts[1])
          const year = parseInt(parts[2])
          return new Date(year, month, day)
        }
      } catch (e) {
        // If parsing fails, return old date
        return new Date(0)
      }
      return new Date(0)
    }

    let todayCount = 0
    let weekCount = 0
    let monthCount = 0

    paymentTransactions.forEach(transaction => {
      const transactionDate = parseDate(transaction.date)
      transactionDate.setHours(0, 0, 0, 0)

      if (transactionDate >= today) {
        todayCount++
      }
      if (transactionDate >= thisWeek) {
        weekCount++
      }
      if (transactionDate >= thisMonth) {
        monthCount++
      }
    })

    return [
      { label: "Today", count: todayCount },
      { label: "This Week", count: weekCount },
      { label: "This Month", count: monthCount }
    ]
  }

  const summaryCards = calculateSummaryCards()

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await restaurantAPI.getOrders()

        if (response.data?.success && response.data.data?.orders) {
          // Transform API orders to match component structure
          const transformedOrders = response.data.data.orders.map(order => {
            const createdAt = new Date(order.createdAt)
            const now = new Date()
            const diffMs = now - createdAt
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)

            let timeAgo = ""
            if (diffMins < 1) {
              timeAgo = "Just now"
            } else if (diffMins < 60) {
              timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
            } else if (diffHours < 24) {
              timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
            } else if (diffDays < 7) {
              timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
            } else {
              const weeks = Math.floor(diffDays / 7)
              timeAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`
            }

            return {
              id: order.orderId || order._id,
              mongoId: order._id,
              items: order.items?.length || 0,
              timeAgo: timeAgo,
              deliveryType: 'Home Delivery',
              amount: order.pricing?.total || 0,
              status: order.status || 'pending',
              createdAt: order.createdAt,
              customerName: order.userId?.name || 'Customer',
              customerPhone: order.userId?.phone || '',
              address: order.address
            }
          })

          setOrders(transformedOrders)
        } else {
          setOrders([])
        }
      } catch (err) {
        console.error('Error fetching orders:', err)
        setError(err.response?.data?.message || 'Failed to fetch orders')
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()

    // Set up interval to refresh orders every 10 seconds (fallback if Socket.IO fails)
    const refreshInterval = setInterval(() => {
      fetchOrders()
    }, 10000)

    return () => {
      clearInterval(refreshInterval)
    }
  }, [])

  // Refresh orders when new order notification is received
  useEffect(() => {
    if (newOrder) {
