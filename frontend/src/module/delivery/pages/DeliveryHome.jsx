import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import { toast } from "sonner"
import {
  Lightbulb,
  HelpCircle,
  Calendar,
  Clock,
  Lock,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  UtensilsCrossed,
  Wallet,
  TrendingUp,
  CheckCircle,
  Bell,
  MapPin,
  ChefHat,
  Phone,
  X,
  TargetIcon,
  Play,
  Pause,
  IndianRupee,
  Loader2,
  Camera,
  FileText,
  Eye,
  Package,
  Receipt,
} from "lucide-react"
import BottomPopup from "../components/BottomPopup"
import FeedNavbar from "../components/FeedNavbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGigStore } from "../store/gigStore"
import { useProgressStore } from "../store/progressStore"
import { formatTimeDisplay, calculateTotalHours } from "../utils/gigUtils"
import {
  fetchDeliveryWallet,
  calculatePeriodEarnings,
  calculateDeliveryBalances
} from "../utils/deliveryWalletState"
import { formatCurrency } from "../../restaurant/utils/currency"
import { getAllDeliveryOrders } from "../utils/deliveryOrderStatus"
import { getUnreadDeliveryNotificationCount } from "../utils/deliveryNotifications"
import { deliveryAPI, restaurantAPI, uploadAPI } from "@/lib/api"
import { useDeliveryNotifications } from "../hooks/useDeliveryNotifications"
import { getGoogleMapsApiKey } from "@/lib/utils/googleMapsApiKey"
import { useCompanyName } from "@/lib/hooks/useCompanyName"
import { Loader } from "@googlemaps/js-api-loader"
import {
  decodePolyline,
  extractPolylineFromDirections,
  findNearestPointOnPolyline,
  trimPolylineBehindRider,
  calculateBearing,
  animateMarker,
  calculateDistance
} from "../utils/liveTrackingPolyline"
import referralBonusBg from "../../../assets/referralbonuscardbg.png"
// import dropLocationBanner from "../../../assets/droplocationbanner.png" // File not found - commented out
import alertSound from "../../../assets/audio/alert.mp3"
import originalSound from "../../../assets/audio/original.mp3"
import bikeLogo from "../../../assets/bikelogo.png"

// Ola Maps API Key removed

// Mock restaurants data
const mockRestaurants = [
  {
    id: 1,
    name: "Hotel Pankaj",
    address: "Opposite Midway, Behror Locality, Behror",
    lat: 28.2849,
    lng: 76.1209,
    distance: "3.56 km",
    timeAway: "4 mins",
    orders: 2,
    estimatedEarnings: 76.62, // Consistent payment amount
    pickupDistance: "3.56 km",
    dropDistance: "12.2 km",
    payment: "COD",
    amount: 76.62, // Payment amount (consistent with estimatedEarnings)
    items: 2,
    phone: "+911234567890",
    orderId: "ORD1234567890",
    customerName: "Rajesh Kumar",
    customerAddress: "401, 4th Floor, Pushparatna Solitare Building, Janjeerwala Square, New Palasia, Indore",
    customerPhone: "+919876543210",
    tripTime: "38 mins",
    tripDistance: "8.8 kms"
  },
  {
    id: 2,
    name: "Haldi",
    address: "B 2, Narnor-Alwar Rd, Indus Valley, Behror",
    lat: 28.2780,
    lng: 76.1150,
    distance: "4.2 km",
    timeAway: "4 mins",
    orders: 1,
    estimatedEarnings: 76.62,
    pickupDistance: "4.2 km",
    dropDistance: "8.5 km",
    payment: "COD",
    amount: 76.62,
    items: 3,
    phone: "+911234567891",
    orderId: "ORD1234567891",
    customerName: "Priya Sharma",
    customerAddress: "Flat 302, Green Valley Apartments, MG Road, Indore",
    customerPhone: "+919876543211",
    tripTime: "35 mins",
    tripDistance: "7.5 kms"
  },
  {
    id: 3,
    name: "Pandit Ji Samose Wale",
    address: "Near Govt. Senior Secondary School, Behror Locality, Behror",
    lat: 28.2870,
    lng: 76.1250,
    distance: "5.04 km",
    timeAway: "6 mins",
    orders: 1,
    estimatedEarnings: 76.62,
    pickupDistance: "5.04 km",
    dropDistance: "7.8 km",
    payment: "COD",
    amount: 76.62,
    items: 1,
    phone: "+911234567892",
    orderId: "ORD1234567892",
    customerName: "Amit Patel",
    customerAddress: "House No. 45, Sector 5, Vijay Nagar, Indore",
    customerPhone: "+919876543212",
    tripTime: "32 mins",
    tripDistance: "6.9 kms"
  }
]

// ============================================
// STABLE TRACKING SYSTEM - RAPIDO/UBER STYLE
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {number} Distance in meters
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Filter GPS location based on accuracy, distance jump, and speed
 * @param {Object} position - GPS position object
 * @param {Array} lastValidLocation - [lat, lng] of last valid location
 * @param {number} lastLocationTime - Timestamp of last location
 * @returns {boolean} true if location should be accepted
 */
function shouldAcceptLocation(position, lastValidLocation, lastLocationTime) {
  const accuracy = position.coords.accuracy || 0
  const latitude = position.coords.latitude
  const longitude = position.coords.longitude

  // CRITICAL: Always accept first location (no previous location) to ensure admin map shows delivery boy
  // Even if accuracy is poor, we need at least one location update
  const isFirstLocation = !lastValidLocation || !lastLocationTime

  if (isFirstLocation) {
    // For first location, accept if accuracy < 1000m (very lenient)
    if (accuracy > 1000) {

    // Early return if event is not cancelable (passive listener)
    // This prevents the browser warning about calling preventDefault on passive listeners
    if (e.cancelable === false) {
      return; // Event listener is passive, cannot and should not call preventDefault
    }

    // For touch events, check if CSS touch-action is handling it
    // If touch-action is set, we don't need preventDefault
    const eventType = e.type || '';
    if (eventType.includes('touch')) {
      const target = e.target || e.currentTarget;
      if (target) {
        try {
          const computedStyle = window.getComputedStyle(target);
          const touchAction = computedStyle.touchAction;
          // If touch-action is set (not 'auto'), CSS is handling it, skip preventDefault
          if (touchAction && touchAction !== 'auto' && touchAction !== '') {
            return; // CSS touch-action is handling scrolling prevention
          }
        } catch (styleError) {
          // If getComputedStyle fails, continue with preventDefault check
        }
      }
    }

    // For React synthetic events, check the native event's cancelable property
    // React synthetic events may have cancelable: true but the underlying listener is passive
    const nativeEvent = e.nativeEvent;
    if (nativeEvent) {
      // Check native event's cancelable property - this is the most reliable check
      if (nativeEvent.cancelable === false) {
        return; // Native event listener is passive
      }

      // Additional check: if defaultPrevented is already true, no need to call again
      if (nativeEvent.defaultPrevented === true) {
        return;
      }
    }

    // Only call preventDefault if event is cancelable AND we have a function
    // Wrap in try-catch to completely suppress passive listener errors
    if (e.cancelable !== false && typeof e.preventDefault === 'function') {
      try {
        // Final check: ensure native event is still cancelable
        if (nativeEvent && nativeEvent.cancelable === false) {
          return;
        }
        // Suppress console errors temporarily while calling preventDefault
        const originalError = console.error;
        console.error = () => { }; // Temporarily suppress console.error
        try {
          e.preventDefault();
        } finally {
          console.error = originalError; // Restore console.error
        }
      } catch (err) {
        // Silently ignore - this shouldn't happen if cancelable is true
        // But some browsers may still throw if the listener is passive
        // Don't log the error to avoid console spam
        return;
      }
    }
  }
  const [walletState, setWalletState] = useState({
    totalBalance: 0,
    cashInHand: 0,
    totalWithdrawn: 0,
    totalEarned: 0,
    transactions: [],
    joiningBonusClaimed: false
  })
  const [activeOrder, setActiveOrder] = useState(() => {
    const stored = localStorage.getItem('activeOrder')
    return stored ? JSON.parse(stored) : null
  })
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(() => getUnreadDeliveryNotificationCount())

  // Delivery notifications hook
  const { newOrder, clearNewOrder, orderReady, clearOrderReady, isConnected } = useDeliveryNotifications()

  // Default location - will be set from saved location or GPS, not hardcoded
  const [riderLocation, setRiderLocation] = useState(null) // Will be set from GPS or saved location
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false)
  const [bankDetailsFilled, setBankDetailsFilled] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState(null) // Store delivery partner status
  const [rejectionReason, setRejectionReason] = useState(null) // Store rejection reason
  const [isReverifying, setIsReverifying] = useState(false) // Loading state for reverify

  // Map refs and state (Ola Maps removed)
  const mapContainerRef = useRef(null)
  const directionsMapContainerRef = useRef(null)
  const watchPositionIdRef = useRef(null) // Store watchPosition ID for cleanup
  const lastLocationRef = useRef(null) // Store last location for heading calculation
  const bikeMarkerRef = useRef(null) // Store bike marker instance
  const isUserPanningRef = useRef(false) // Track if user manually panned the map
  const routePolylineRef = useRef(null) // Store route polyline instance (legacy - for fallback)
  const routeHistoryRef = useRef([]) // Store route history for traveled path
  const isOnlineRef = useRef(false) // Store online status for use in callbacks

  // Stable tracking system - Rapido/Uber style
  const locationHistoryRef = useRef([]) // Store last 5 valid GPS points for smoothing
  const lastValidLocationRef = useRef(null) // Last valid smoothed location
  const lastLocationTimeRef = useRef(null) // Timestamp of last location update
  const smoothedLocationRef = useRef(null) // Current smoothed location
  const markerAnimationRef = useRef(null) // Track ongoing marker animation
  const zonesPolygonsRef = useRef([]) // Store zone polygons
  // Google Maps Directions API refs
  const directionsServiceRef = useRef(null) // Directions Service instance
  const directionsRendererRef = useRef(null) // Directions Renderer instance
  const directionsMapInstanceRef = useRef(null) // Directions map instance
  const restaurantMarkerRef = useRef(null) // Restaurant marker on directions map
  const directionsBikeMarkerRef = useRef(null) // Bike marker on directions map
  const lastRouteRecalculationRef = useRef(null) // Track last route recalculation time (API cost optimization)
  const lastBikePositionRef = useRef(null) // Track last bike position for deviation detection
  const acceptedOrderIdsRef = useRef(new Set()) // Track accepted order IDs to prevent duplicate notifications
  // Live tracking polyline refs
  const liveTrackingPolylineRef = useRef(null) // Google Maps Polyline instance for live tracking
  const liveTrackingPolylineShadowRef = useRef(null) // Shadow/outline polyline for better visibility (Zomato/Rapido style)
  const fullRoutePolylineRef = useRef([]) // Store full decoded polyline from Directions API
  const lastRiderPositionRef = useRef(null) // Last rider position for smooth animation
  const markerAnimationCancelRef = useRef(null) // Cancel function for marker animation
  const directionsResponseRef = useRef(null) // Store directions response for use in callbacks
  const fetchedOrderDetailsForDropRef = useRef(null) // Prevent re-fetching order details for Reached Drop customer coords
  const [zones, setZones] = useState([]) // Store nearby zones
  const [mapLoading, setMapLoading] = useState(false)
  const [directionsMapLoading, setDirectionsMapLoading] = useState(false)
  const isInitializingMapRef = useRef(false)

  // Safety timeout: hide "Loading map..." overlay after max 2 seconds
  useEffect(() => {
    if (!mapLoading) return
    const timer = setTimeout(() => {
      setMapLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [mapLoading])

  // Seeded random number generator for consistent hotspots
  const createSeededRandom = (seed) => {
    let currentSeed = seed
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280
      return currentSeed / 233280
    }
  }

  // Generate irregular polygon from random nearby points (using seeded random)
  const createIrregularPolygon = (center, numPoints, spread, seedOffset) => {
    const [lat, lng] = center
    const vertices = []
    const seededRandom = createSeededRandom(seedOffset)

    // Generate random points around the center
    for (let i = 0; i < numPoints; i++) {
      // Seeded random angle
      const angle = seededRandom() * 2 * Math.PI
      // Seeded random distance (varying spread for irregularity)
      const distance = spread * (0.5 + seededRandom() * 0.5)

      const vertexLat = lat + distance * Math.cos(angle)
      const vertexLng = lng + distance * Math.sin(angle)
      vertices.push([vertexLat, vertexLng])
    }

    // Sort vertices by angle to create a proper polygon (prevents self-intersection)
    const centerLat = vertices.reduce((sum, v) => sum + v[0], 0) / vertices.length
    const centerLng = vertices.reduce((sum, v) => sum + v[1], 0) / vertices.length

    vertices.sort((a, b) => {
      const angleA = Math.atan2(a[0] - centerLat, a[1] - centerLng)
      const angleB = Math.atan2(b[0] - centerLat, b[1] - centerLng)
      return angleA - angleB
    })

    return vertices
  }

  // Generate nearby hotspot locations with irregular shapes from 3-5 points
  // Using useState with lazy initializer to generate hotspots once and keep them fixed
  const [hotspots] = useState(() => {
    // Use default location if riderLocation is not available yet
    const defaultLocation = [23.2599, 77.4126] // Bhopal center as fallback
    const [lat, lng] = riderLocation || defaultLocation
    const hotspots = []
    const baseSpread = 0.004 // Base spread for points in degrees

    // Hotspot 1 - Northeast, 3 points
    hotspots.push({
      type: 'polygon',
      center: [lat + 0.008, lng + 0.006],
      vertices: createIrregularPolygon([lat + 0.008, lng + 0.006], 3, baseSpread * 1.2, 1000),
      opacity: 0.25
    })

    // Hotspot 2 - Northwest, 4 points
    hotspots.push({
      type: 'polygon',
      center: [lat + 0.005, lng - 0.007],
      vertices: createIrregularPolygon([lat + 0.005, lng - 0.007], 4, baseSpread * 1.0, 2000),
      opacity: 0.3
    })

    // Hotspot 3 - Southeast, 5 points
    hotspots.push({
      type: 'polygon',
      center: [lat - 0.006, lng + 0.009],
      vertices: createIrregularPolygon([lat - 0.006, lng + 0.009], 5, baseSpread * 0.9, 3000),
      opacity: 0.2
    })

    // Hotspot 4 - Southwest, 3 points
    hotspots.push({
      type: 'polygon',
      center: [lat - 0.004, lng - 0.005],
      vertices: createIrregularPolygon([lat - 0.004, lng - 0.005], 3, baseSpread * 1.1, 4000),
      opacity: 0.28
    })

    // Hotspot 5 - North, 4 points
    hotspots.push({
      type: 'polygon',
      center: [lat + 0.011, lng + 0.001],
      vertices: createIrregularPolygon([lat + 0.011, lng + 0.001], 4, baseSpread * 0.7, 5000),
      opacity: 0.22
    })

    // Hotspot 6 - East, 5 points
    hotspots.push({
      type: 'polygon',
      center: [lat + 0.002, lng + 0.012],
      vertices: createIrregularPolygon([lat + 0.002, lng + 0.012], 5, baseSpread * 1.1, 6000),
      opacity: 0.32
    })

    // Hotspot 7 - South, 3 points
    hotspots.push({
      type: 'polygon',
      center: [lat - 0.009, lng - 0.002],
      vertices: createIrregularPolygon([lat - 0.009, lng - 0.002], 3, baseSpread * 1.0, 7000),
      opacity: 0.26
    })

    // Hotspot 8 - West, 4 points
    hotspots.push({
      type: 'polygon',
      center: [lat - 0.001, lng - 0.010],
      vertices: createIrregularPolygon([lat - 0.001, lng - 0.010], 4, baseSpread * 0.85, 8000),
      opacity: 0.24
    })

    // Hotspot 9 - Northeast (further), 5 points
    hotspots.push({
      type: 'polygon',
      center: [lat + 0.006, lng + 0.008],
      vertices: createIrregularPolygon([lat + 0.006, lng + 0.008], 5, baseSpread * 0.6, 9000),
      opacity: 0.23
    })

    // Hotspot 10 - Southwest (further), 3 points
    hotspots.push({
      type: 'polygon',
      center: [lat - 0.007, lng - 0.008],
      vertices: createIrregularPolygon([lat - 0.007, lng - 0.008], 3, baseSpread * 0.9, 10000),
      opacity: 0.27
    })

    return hotspots
  })
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false)
  const [acceptButtonProgress, setAcceptButtonProgress] = useState(0)
  const [isAnimatingToComplete, setIsAnimatingToComplete] = useState(false)
  const [hasAutoShown, setHasAutoShown] = useState(false)
  const [showNewOrderPopup, setShowNewOrderPopup] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState(300)
  const countdownTimerRef = useRef(null)
  const [showRejectPopup, setShowRejectPopup] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const alertAudioRef = useRef(null)
  const userInteractedRef = useRef(false) // Track user interaction for autoplay policy
  const newOrderAcceptButtonRef = useRef(null)
  const newOrderAcceptButtonSwipeStartX = useRef(0)
  const newOrderAcceptButtonSwipeStartY = useRef(0)
  const newOrderAcceptButtonIsSwiping = useRef(false)
  const [newOrderAcceptButtonProgress, setNewOrderAcceptButtonProgress] = useState(0)
  const [newOrderIsAnimatingToComplete, setNewOrderIsAnimatingToComplete] = useState(false)
  const newOrderPopupRef = useRef(null)
  const newOrderSwipeStartY = useRef(0)
  const newOrderIsSwiping = useRef(false)
  const [newOrderDragY, setNewOrderDragY] = useState(0)
  const [isDraggingNewOrderPopup, setIsDraggingNewOrderPopup] = useState(false)
  const [isNewOrderPopupMinimized, setIsNewOrderPopupMinimized] = useState(false)
  const [showDirectionsMap, setShowDirectionsMap] = useState(false)
  const [navigationMode, setNavigationMode] = useState('restaurant') // 'restaurant' or 'customer'
  const [showreachedPickupPopup, setShowreachedPickupPopup] = useState(false)
  const [showOrderIdConfirmationPopup, setShowOrderIdConfirmationPopup] = useState(false)
  const [showReachedDropPopup, setShowReachedDropPopup] = useState(false)
  const [showOrderDeliveredAnimation, setShowOrderDeliveredAnimation] = useState(false)
  const [showCustomerReviewPopup, setShowCustomerReviewPopup] = useState(false)
  const [showPaymentPage, setShowPaymentPage] = useState(false)
  const [showDigitalBillPopup, setShowDigitalBillPopup] = useState(false)
  const [digitalBillData, setDigitalBillData] = useState(null)
  const [isLoadingBill, setIsLoadingBill] = useState(false)
  const [isUploadingBill, setIsUploadingBill] = useState(false)
  const [customerRating, setCustomerRating] = useState(0)
  const [customerReviewText, setCustomerReviewText] = useState("")
  const [orderEarnings, setOrderEarnings] = useState(0) // Store earnings from completed order
  const [routePolyline, setRoutePolyline] = useState([])
  const [showRoutePath, setShowRoutePath] = useState(false) // Toggle to show/hide route path - disabled by default
  const [directionsResponse, setDirectionsResponse] = useState(null) // Directions API response for road-based routing
  const [reachedPickupButtonProgress, setreachedPickupButtonProgress] = useState(0)
  const [reachedPickupIsAnimatingToComplete, setreachedPickupIsAnimatingToComplete] = useState(false)
  const reachedPickupButtonRef = useRef(null)
  const reachedPickupSwipeStartX = useRef(0)
  const reachedPickupSwipeStartY = useRef(0)
  const reachedPickupIsSwiping = useRef(false)
  const [reachedDropButtonProgress, setReachedDropButtonProgress] = useState(0)
  const [reachedDropIsAnimatingToComplete, setReachedDropIsAnimatingToComplete] = useState(false)
  const reachedDropButtonRef = useRef(null)
  const reachedDropSwipeStartX = useRef(0)
  const reachedDropSwipeStartY = useRef(0)
  const reachedDropIsSwiping = useRef(false)
  const [orderIdConfirmButtonProgress, setOrderIdConfirmButtonProgress] = useState(0)
  const [orderIdConfirmIsAnimatingToComplete, setOrderIdConfirmIsAnimatingToComplete] = useState(false)
  const orderIdConfirmButtonRef = useRef(null)
  const orderIdConfirmSwipeStartX = useRef(0)
  const orderIdConfirmSwipeStartY = useRef(0)
  const orderIdConfirmIsSwiping = useRef(false)
  const [orderDeliveredButtonProgress, setOrderDeliveredButtonProgress] = useState(0)
  const [orderDeliveredIsAnimatingToComplete, setOrderDeliveredIsAnimatingToComplete] = useState(false)
  const orderDeliveredButtonRef = useRef(null)
  // Trip distance and time from Google Maps API
  const [tripDistance, setTripDistance] = useState(null) // in meters
  const [tripTime, setTripTime] = useState(null) // in seconds
  const pickupRouteDistanceRef = useRef(0) // Distance to pickup in meters
  const pickupRouteTimeRef = useRef(0) // Time to pickup in seconds
  const deliveryRouteDistanceRef = useRef(0) // Distance to delivery in meters
  const deliveryRouteTimeRef = useRef(0) // Time to delivery in seconds
  const orderDeliveredSwipeStartX = useRef(0)
  const orderDeliveredSwipeStartY = useRef(0)
  const orderDeliveredIsSwiping = useRef(false)
  const [earningsGuaranteeIsPlaying, setEarningsGuaranteeIsPlaying] = useState(true)
  const [earningsGuaranteeAudioTime, setEarningsGuaranteeAudioTime] = useState("00:00")
  const earningsGuaranteeAudioRef = useRef(null)
  const bottomSheetRef = useRef(null)
  const handleRef = useRef(null)
  const acceptButtonRef = useRef(null)
  const swipeStartY = useRef(0)
  const isSwiping = useRef(false)
  const acceptButtonSwipeStartX = useRef(0)
  const acceptButtonSwipeStartY = useRef(0)
  const acceptButtonIsSwiping = useRef(false)
  const autoShowTimerRef = useRef(null)

  const {
    bookedGigs,
    currentGig,
    goOnline,
    goOffline,
    getSelectedDropLocation
  } = useGigStore()

  // Use same localStorage key as FeedNavbar for online status
  const LS_KEY = "app:isOnline"

  // Initialize online status from localStorage (same as FeedNavbar)
  const [isOnline, setIsOnline] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      const value = raw ? JSON.parse(raw) === true : false
      isOnlineRef.current = value // Initialize ref
      return value
    } catch {
      isOnlineRef.current = false
      return false
    }
  })

  // Keep ref in sync with state
  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  // Sync online status with localStorage changes (from FeedNavbar or other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === LS_KEY && e.newValue != null) {
        const next = JSON.parse(e.newValue) === true
 default to 0 so UI is not empty)
  const calculatedEarnings = calculatePeriodEarnings(walletState, 'today') || 0
  const todayEarnings = hasStoreDataForToday && todayData
    ? (todayData.earnings ?? calculatedEarnings)
    : calculatedEarnings

  // Calculate today's trips (prefer store, then calculated; default to 0)
  const allOrders = getAllDeliveryOrders()
  const calculatedTrips = allOrders.filter(order => {
    const orderId = order.orderId || order.id
    const orderDateKey = `delivery_order_date_${orderId}`
    const orderDateStr = localStorage.getItem(orderDateKey)
    if (!orderDateStr) return false
    const orderDate = new Date(orderDateStr)
    orderDate.setHours(0, 0, 0, 0)
    return orderDate.getTime() === today.getTime()
  }).length
  const todayTrips = hasStoreDataForToday && todayData
    ? (todayData.trips ?? calculatedTrips)
    : calculatedTrips

  // Calculate today's gigs count
  const todayGigsCount = bookedGigs.filter(gig => gig.date === todayDateKey).length

  // Calculate weekly earnings from wallet transactions (payment + earning_addon bonus)
  // Include both payment and earning_addon transactions in weekly earnings
  const weeklyEarnings = walletState?.transactions
    ?.filter(t => {
      // Include both payment and earning_addon transactions
      if ((t.type !== 'payment' && t.type !== 'earning_addon') || t.status !== 'Completed') return false
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const transactionDate = t.date ? new Date(t.date) : (t.createdAt ? new Date(t.createdAt) : null)
      if (!transactionDate) return false
      return transactionDate >= startOfWeek && transactionDate <= now
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0

  // Calculate weekly orders count from transactions
  const calculateWeeklyOrders = () => {
    if (!walletState || !walletState.transactions || !Array.isArray(walletState.transactions)) {
      return 0
    }

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0)

    return walletState.transactions.filter(t => {
      // Count payment transactions (completed orders)
      if (t.type !== 'payment' || t.status !== 'Completed') return false
      const transactionDate = t.date ? new Date(t.date) : (t.createdAt ? new Date(t.createdAt) : null)
      if (!transactionDate) return false
      return transactionDate >= startOfWeek && transactionDate <= now
    }).length
  }

  const weeklyOrders = calculateWeeklyOrders()

  // State for active earning addon
  const [activeEarningAddon, setActiveEarningAddon] = useState(null)

  // Fetch active earning addon offers
  useEffect(() => {
    const fetchActiveEarningAddons = async () => {
      try {
        const response = await deliveryAPI.getActiveEarningAddons()
 default to 0)
  const calculatedHours = bookedGigs
    .filter(gig => gig.date === todayDateKey)
    .reduce((total, gig) => total + (gig.totalHours || 0), 0)
  const todayHoursWorked = hasStoreDataForToday && todayData
    ? (todayData.timeOnOrders ?? calculatedHours)
    : calculatedHours

  // Track last updated values to prevent infinite loops
  const lastUpdatedRef = useRef({ earnings: null, trips: null, hours: null })

  // Update progress store with calculated values when data changes (with debounce)
  useEffect(() => {
    // Only update if values have actually changed
    if (
      calculatedEarnings !== undefined &&
      calculatedTrips !== undefined &&
      calculatedHours !== undefined &&
      (
        lastUpdatedRef.current.earnings !== calculatedEarnings ||
        lastUpdatedRef.current.trips !== calculatedTrips ||
        lastUpdatedRef.current.hours !== calculatedHours
      )
    ) {
      lastUpdatedRef.current = {
        earnings: calculatedEarnings,
        trips: calculatedTrips,
        hours: calculatedHours
      }

      updateTodayProgress({
        earnings: calculatedEarnings,
        trips: calculatedTrips,
        timeOnOrders: calculatedHours
      })
    }
  }, [calculatedEarnings, calculatedTrips, calculatedHours, updateTodayProgress])

  // Listen for progress data updates from other components
  useEffect(() => {
    const handleProgressUpdate = () => {
      // Force re-render to show updated progress
      setAnimationKey(prev => prev + 1)
    }

    window.addEventListener('progressDataUpdated', handleProgressUpdate)
    return () => {
      window.removeEventListener('progressDataUpdated', handleProgressUpdate)
    }
  }, []) // Empty dependency array - only set up listener once

  const formatHours = (hours) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  // Calculate available cash limit
  const walletBalances = calculateDeliveryBalances(walletState)
  const totalCashLimit = Number.isFinite(Number(walletState?.totalCashLimit))
    ? Number(walletState.totalCashLimit)
    : 0
  const availableCashLimit =
    Number.isFinite(Number(walletState?.availableCashLimit)) &&
      Number(walletState?.availableCashLimit) >= 0
      ? Number(walletState.availableCashLimit)
      : Math.max(0, totalCashLimit - (Number(walletBalances.cashInHand) || 0))


  // Listen for progress data updates
  useEffect(() => {
    const handleProgressUpdate = () => {
      // Force re-render to show updated progress
      setAnimationKey(prev => prev + 1)
    }

    window.addEventListener('progressDataUpdated', handleProgressUpdate)
    window.addEventListener('storage', handleProgressUpdate)

    return () => {
      window.removeEventListener('progressDataUpdated', handleProgressUpdate)
      window.removeEventListener('storage', handleProgressUpdate)
    }
  }, [])

  // Initialize Lenis
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
  }, [location.pathname, animationKey])

  // Track user interaction for autoplay policy
  useEffect(() => {
    const handleUserInteraction = () => {
      userInteractedRef.current = true
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }

    // Listen for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true })
    document.addEventListener('touchstart', handleUserInteraction, { once: true })
    document.addEventListener('keydown', handleUserInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [])

  // Play alert sound function - plays until countdown ends (30 seconds)
  const playAlertSound = async () => {
    // Only play if user has interacted with the page (browser autoplay policy)
    if (!userInteractedRef.current) {
            const lastSentTime = window.lastLocationSentTime || 0;
            const timeSinceLastSend = now - lastSentTime;

            // Fallback: Send last valid location every 30 seconds even if new location is rejected
            if (timeSinceLastSend >= 30000) {
              const [lat, lng] = lastValidLocationRef.current;
              if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                deliveryAPI.updateLocation(lat, lng, true)
                  .then(() => {
                    window.lastLocationSentTime = now;
                  })
                  .catch(error => {
                    if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
                      console.error('❌ Error sending fallback location:', error);
                    }
                  });
              }
            }
          }
          // Keep using last valid location
          return
        }

        // Location passed filter - add to history
        const rawLocation = [latitude, longitude]
        locationHistoryRef.current.push(rawLocation)

        // Keep only last 5 points for moving average
        if (locationHistoryRef.current.length > 5) {
          locationHistoryRef.current.shift()
        }

        // Apply moving average smoothing
        const smoothedLocation = smoothLocation(locationHistoryRef.current)

        if (!smoothedLocation) {
          // Not enough points yet, use raw location
          const newLocation = rawLocation
          lastValidLocationRef.current = newLocation
          lastLocationTimeRef.current = Date.now()
          smoothedLocationRef.current = newLocation

          // Initialize if first location
          if (!lastLocationRef.current) {
            setRiderLocation(newLocation)
            lastLocationRef.current = newLocation
            routeHistoryRef.current = [{
              lat: newLocation[0],
              lng: newLocation[1]
            }]

            // Save to localStorage
            localStorage.setItem('deliveryBoyLastLocation', JSON.stringify(newLocation))

            // Update marker with correct location
            if (window.deliveryMapInstance) {
              const [lat, lng] = newLocation
            const lastSentTime = window.lastLocationSentTime || 0;
            const timeSinceLastSend = now - lastSentTime;

            // Send location every 5 seconds even if not smoothed
            if (timeSinceLastSend >= 5000) {
              if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    window.lastSentLocation = newLocation;
                    }
                  });
              }
            }
          }

          return
        }

        // ============================================
        // SMOOTH MARKER ANIMATION (NO INSTANT JUMPS)
        // ============================================

        const [smoothedLat, smoothedLng] = smoothedLocation
        const newSmoothedLocation = { lat: smoothedLat, lng: smoothedLng }

        // Calculate heading
        let heading = position.coords.heading !== null && position.coords.heading !== undefined
          ? position.coords.heading
          : null

        if (heading === null && smoothedLocationRef.current) {
          const [prevLat, prevLng] = smoothedLocationRef.current
          heading = calculateHeading(prevLat, prevLng, smoothedLat, smoothedLng)
        }

        // Update refs
        lastValidLocationRef.current = smoothedLocation
        lastLocationTimeRef.current = Date.now()
        smoothedLocationRef.current = smoothedLocation

        // Update route history with smoothed location
        routeHistoryRef.current.push({
          lat: smoothedLat,
          lng: smoothedLng
        })
        if (routeHistoryRef.current.length > 1000) {
          routeHistoryRef.current.shift()
        }

        // Save smoothed location to localStorage
        localStorage.setItem('deliveryBoyLastLocation', JSON.stringify(smoothedLocation))

        // Update live tracking polyline for any active route (pickup or delivery)
        const currentDirectionsResponse = directionsResponseRef.current;
        if (currentDirectionsResponse && currentDirectionsResponse.routes && currentDirectionsResponse.routes.length > 0) {
          updateLiveTrackingPolyline(currentDirectionsResponse, smoothedLocation);
        }

        // ============================================
        // SMOOTH MARKER ANIMATION (1-2 seconds)
        // ============================================

        // Update state with smoothed location FIRST
        setRiderLocation(smoothedLocation)
        lastLocationRef.current = smoothedLocation

        // Always update bike marker with latest smoothed location
        if (window.deliveryMapInstance) {
          if (bikeMarkerRef.current) {
            // Marker exists - animate smoothly to new position
            animateMarkerSmoothly(bikeMarkerRef.current, newSmoothedLocation, 1500, markerAnimationRef)
          } else {
            // Marker doesn't exist yet, create it immediately with correct location
          const lastSentTime = window.lastLocationSentTime || 0;
          const timeSinceLastSend = now - lastSentTime;

          // Use smoothed location for backend (not raw GPS) - already declared above

          // Simple distance check using Haversine formula
          const calculateDistance = (lat1, lng1, lat2, lng2) => {
            const R = 6371; // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          };

          // Get last sent location for distance check
          const lastSentLocation = window.lastSentLocation || null;

          // Send location every 5 seconds OR if location changed significantly (>50m)
          const shouldSend = timeSinceLastSend >= 5000 ||
            (lastSentLocation &&
              calculateDistance(lastSentLocation[0], lastSentLocation[1], smoothedLat, smoothedLng) > 0.05);

          if (shouldSend) {
            // Final validation before sending to backend
            // Ensure coordinates are in correct format [lat, lng] and within valid ranges
            if (smoothedLat >= -90 && smoothedLat <= 90 && smoothedLng >= -180 && smoothedLng <= 180) {

              deliveryAPI.updateLocation(smoothedLat, smoothedLng, true)
                .then(() => {
                  window.lastLocationSentTime = now;
                  window.lastSentLocation = smoothedLocation; // Store last sent location
                })
                .catch(error => {
                  // Only log non-network errors (backend might be down, which is expected in dev)
                  if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
                    console.error('❌ Error sending location to backend:', error);
                  } else {
                    // Silently handle network errors - backend might not be running
                    // Socket.IO will handle reconnection automatically
                  }
                });
            } else {
              console.error('❌ Invalid smoothed coordinates - not sending to backend:', {
                smoothedLat,
                smoothedLng,
                raw: { latitude, longitude }
              });
            }
          }
        }
      },
      (error) => {
        console.warn("⚠️ Error watching location:", error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // Always use fresh location
        timeout: 10000
      }
    )

    watchPositionIdRef.current = watchId

    // Show bike marker immediately if we have last known location and map is ready
    if (window.deliveryMapInstance && lastLocationRef.current && lastLocationRef.current.length === 2) {
      const [lat, lng] = lastLocationRef.current
      // Get heading from route history if available
      let heading = null
      if (routeHistoryRef.current.length > 1) {
        const prev = routeHistoryRef.current[routeHistoryRef.current.length - 2]
        heading = calculateHeading(prev.lat, prev.lng, lat, lng)
      }
      createOrUpdateBikeMarker(lat, lng, heading, !isUserPanningRef.current)
    }

    return () => {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current)
        watchPositionIdRef.current = null
      }
    }
  }, [isOnline]) // Re-run when online status changes - this controls start/stop of tracking

  // Handle new order popup accept button swipe
  const handleNewOrderAcceptTouchStart = (e) => {
    newOrderAcceptButtonSwipeStartX.current = e.touches[0].clientX
    newOrderAcceptButtonSwipeStartY.current = e.touches[0].clientY
    newOrderAcceptButtonIsSwiping.current = false
    setNewOrderIsAnimatingToComplete(false)
    setNewOrderAcceptButtonProgress(0)
  }

  const handleNewOrderAcceptTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - newOrderAcceptButtonSwipeStartX.current
    const deltaY = e.touches[0].clientY - newOrderAcceptButtonSwipeStartY.current

    // Only handle horizontal swipes (swipe right)
    if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
      newOrderAcceptButtonIsSwiping.current = true
      // Don't call preventDefault - CSS touch-action handles scrolling prevention
      // safePreventDefault(e) // Removed to avoid passive listener error

      // Calculate max swipe distance
      const buttonWidth = newOrderAcceptButtonRef.current?.offsetWidth || 300
      const circleWidth = 56 // w-14 = 56px
      const padding = 16 // px-4 = 16px
      const maxSwipe = buttonWidth - circleWidth - (padding * 2)

      const progress = Math.min(Math.max(deltaX / maxSwipe, 0), 1)
      setNewOrderAcceptButtonProgress(progress)
    }
  }

  const handleNewOrderAcceptTouchEnd = (e) => {
    if (!newOrderAcceptButtonIsSwiping.current) {
      setNewOrderAcceptButtonProgress(0)
      return
    }

    const deltaX = e.changedTouches[0].clientX - newOrderAcceptButtonSwipeStartX.current
    const buttonWidth = newOrderAcceptButtonRef.current?.offsetWidth || 300
    const circleWidth = 56
    const padding = 16
    const maxSwipe = buttonWidth - circleWidth - (padding * 2)
    const threshold = maxSwipe * 0.7 // 70% of max swipe

    if (deltaX > threshold) {
      // Stop audio immediately when user accepts
      if (alertAudioRef.current) {
        alertAudioRef.current.pause()
        alertAudioRef.current.currentTime = 0
        alertAudioRef.current = null
            if (order) {
              // Extract restaurant location with robust fallbacks
              const restaurantCoords = extractLatLng(
                order.restaurantId?.location || order.restaurantLocation || order.location
              )
              const restaurantLat = restaurantCoords.lat ??
                toFiniteCoordinate(order.restaurantLat) ??
                toFiniteCoordinate(selectedRestaurant?.lat)
              const restaurantLng = restaurantCoords.lng ??
                toFiniteCoordinate(order.restaurantLng) ??
                toFiniteCoordinate(selectedRestaurant?.lng)

              // Format restaurant address - check multiple possible locations
              let restaurantAddress = 'Restaurant Address'
              const restaurantLocation = order.restaurantId?.location

              // Debug: Log order structure to understand data format
              const earningsValue = backendEarnings
                ? (typeof backendEarnings === 'object' ? backendEarnings.totalEarning : backendEarnings)
                : (selectedRestaurant?.estimatedEarnings || 0);


              restaurantInfo = {
                id: order._id || order.orderId,
                orderId: order.orderId, // Correct order ID from backend
                name: restaurantName, // Restaurant name from backend (priority: restaurantName > restaurantId.name)
                address: restaurantAddress, // Restaurant address from backend
                lat: restaurantLat,
                lng: restaurantLng,
                distance: selectedRestaurant?.distance || '0 km',
                timeAway: selectedRestaurant?.timeAway || '0 mins',
                dropDistance: selectedRestaurant?.dropDistance || '0 km',
                pickupDistance: selectedRestaurant?.pickupDistance || '0 km',
                estimatedEarnings: backendEarnings || selectedRestaurant?.estimatedEarnings || 0,
                amount: earningsValue, // Also set amount for compatibility
                customerName: order.userId?.name || selectedRestaurant?.customerName,
                customerPhone: order.userId?.phone || selectedRestaurant?.customerPhone || null,
                customerAddress: order.address?.formattedAddress ||
                  (order.address?.street ? `${order.address.street}, ${order.address.city || ''}, ${order.address.state || ''}`.trim() : '') ||
                  selectedRestaurant?.customerAddress,
                customerLat: order.address?.location?.coordinates?.[1],
                customerLng: order.address?.location?.coordinates?.[0],
                items: order.items || [],
                total: order.pricing?.total || 0,
                paymentMethod: order.paymentMethod ?? order.payment?.method ?? 'razorpay', // backend-resolved first (COD vs Online)
                phone: order.restaurantId?.phone || order.restaurantId?.ownerPhone || null, // Restaurant phone number (prefer phone, fallback to ownerPhone)
                ownerPhone: order.restaurantId?.ownerPhone || null, // Owner phone number (separate field for direct access)
                orderStatus: order.status || 'preparing', // Store order status (pending, preparing, ready, out_for_delivery, delivered)
                deliveryState: {
                  ...(order.deliveryState || {}),
                  currentPhase: 'en_route_to_pickup', // CRITICAL: Set to en_route_to_pickup after order acceptance
                  status: 'accepted' // Set status to accepted
                }, // Store delivery state (currentPhase, status, etc.)
                deliveryPhase: 'en_route_to_pickup' // CRITICAL: Set to en_route_to_pickup after order acceptance so Reached Pickup popup can show
              }

              return;
            }

            let routeCoordinates = null;
            let directionsResultForMap = null; // Store directions result for main map rendering

            // Use route from backend if available (for fallback/polyline)
            if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
              // Backend returns coordinates as [[lat, lng], ...]
              routeCoordinates = routeData.coordinates;
              setRoutePolyline(routeCoordinates);
            }

            // Calculate route using Google Maps Directions API (Zomato-style road-based routing)
            // Use LIVE location from delivery boy to restaurant
            // Use restaurantInfo directly (not selectedRestaurant) since state update is async
            if (restaurantInfo && hasValidCoordinates(restaurantInfo?.lat, restaurantInfo?.lng) && currentLocation) {

              try {
                // Calculate route immediately with current live location
                const directionsResult = await calculateRouteWithDirectionsAPI(
                  currentLocation, // Delivery boy's current live location
                  { lat: restaurantInfo.lat, lng: restaurantInfo.lng } // Restaurant location
                );

                if (directionsResult) {

                  // Store pickup route distance and time
                  const pickupDistance = directionsResult.routes[0]?.legs[0]?.distance?.value || 0; // in meters
                  const pickupDuration = directionsResult.routes[0]?.legs[0]?.duration?.value || 0; // in seconds
                  pickupRouteDistanceRef.current = pickupDistance;
                  pickupRouteTimeRef.current = pickupDuration;

                  // Store directions result for rendering on main map
                  setDirectionsResponse(directionsResult);
                  directionsResponseRef.current = directionsResult; // Store in ref for callbacks
                  directionsResultForMap = directionsResult; // Store for use in setTimeout

                  // Initialize live tracking polyline with full route (Delivery Boy → Restaurant)
                  if (currentLocation) {
                    // Ensure map is ready before updating polyline
                    if (window.deliveryMapInstance) {
                      updateLiveTrackingPolyline(directionsResult, currentLocation);
                    } else {
                      // Wait for map to be ready
                      setTimeout(() => {
                        if (window.deliveryMapInstance && currentLocation) {
                          updateLiveTrackingPolyline(directionsResult, currentLocation);
                        }
                      }, 500);
                    }
                  }

                } else {
                  // Fallback: Use backend route or OSRM
                  if (!routeCoordinates || routeCoordinates.length === 0) {
                    try {
                      const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation[1]},${currentLocation[0]};${restaurantInfo.lng},${restaurantInfo.lat}?overview=full&geometries=geojson`;
                      const osrmResponse = await fetch(url);
                      const osrmData = await osrmResponse.json();

                      if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
                        routeCoordinates = osrmData.routes[0].geometry.coordinates.map((coord) => [coord[1], coord[0]]);
                        setRoutePolyline(routeCoordinates);
                      } else {
                        // Final fallback: straight line
                        routeCoordinates = [currentLocation, [restaurantInfo.lat, restaurantInfo.lng]];
                        setRoutePolyline(routeCoordinates);
                      }
                    } catch (osrmError) {
                      console.error('❌ Error calculating route with OSRM:', osrmError);
                      // Final fallback: straight line
                      routeCoordinates = [currentLocation, [restaurantInfo.lat, restaurantInfo.lng]];
                      setRoutePolyline(routeCoordinates);
                    }
                  }
                }
              } catch (directionsError) {
                // Handle REQUEST_DENIED gracefully (billing/API key issue)
                if (directionsError.message?.includes('REQUEST_DENIED') || directionsError.message?.includes('not available')) {
                  console.warn('⚠️ Google Maps Directions API not available (billing/API key issue). Using fallback route.');
                } else {
                  console.error('❌ Error calculating route with Directions API:', directionsError);
                }

                // Fallback to OSRM or straight line
                if (!routeCoordinates || routeCoordinates.length === 0) {
                  try {
                    // Try OSRM first
                    const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation[1]},${currentLocation[0]};${restaurantInfo.lng},${restaurantInfo.lat}?overview=full&geometries=geojson`;
                    const osrmResponse = await fetch(url);
                    const osrmData = await osrmResponse.json();

                    if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
                      routeCoordinates = osrmData.routes[0].geometry.coordinates.map((coord) => [coord[1], coord[0]]);
                      setRoutePolyline(routeCoordinates);
                    } else {
                      // Final fallback: straight line
                      routeCoordinates = [currentLocation, [restaurantInfo.lat, restaurantInfo.lng]];
                      setRoutePolyline(routeCoordinates);
                    }
                  } catch (osrmError) {
                    console.warn('⚠️ OSRM fallback failed, using straight line');
                    // Final fallback: straight line
                    routeCoordinates = [currentLocation, [restaurantInfo.lat, restaurantInfo.lng]];
                    setRoutePolyline(routeCoordinates);
                  }
                }
              }
            } else {
              console.error('❌ Cannot calculate route: missing restaurant info or location', {
                restaurantInfo: !!restaurantInfo,
                restaurantLat: restaurantInfo?.lat,
                restaurantLng: restaurantInfo?.lng,
                currentLocation: !!currentLocation
              });
            }

            // Close popup and show route on main map (not full-screen directions map)
            setShowNewOrderPopup(false);
            // CRITICAL: Clear newOrder notification immediately to prevent duplicate notifications
            const acceptedOrderId = restaurantInfo.id || restaurantInfo.orderId || newOrder?.orderMongoId || newOrder?.orderId;
            if (acceptedOrderId) {
              acceptedOrderIdsRef.current.add(acceptedOrderId);
            }
            clearNewOrder();

            // Ensure route path is visible
            setShowRoutePath(true);

            // Show Reached Pickup popup immediately after order acceptance (no distance check)
            // But only if order is not already past pickup phase
            setTimeout(() => {
              const currentOrderStatus = selectedRestaurant?.orderStatus || selectedRestaurant?.status || '';
              const currentDeliveryPhase = selectedRestaurant?.deliveryPhase || selectedRestaurant?.deliveryState?.currentPhase || '';
              const isAlreadyPastPickup = currentOrderStatus === 'out_for_delivery' ||
                currentDeliveryPhase === 'en_route_to_delivery' ||
                currentDeliveryPhase === 'en_route_to_drop' ||
                currentDeliveryPhase === 'picked_up';

              if (!isAlreadyPastPickup) {
                setShowreachedPickupPopup(true);
                // Close directions map if open
                setShowDirectionsMap(false);
              } else {
              }
            }, 500); // Wait 500ms for state to update

            // Show route on main map instead of opening full-screen directions map
            setTimeout(() => {

              // Show route on main map using DirectionsRenderer or polyline
              if (window.deliveryMapInstance && restaurantInfo) {
                // Use DirectionsRenderer on main map if we have directions result
                // Use directionsResponse state (which was set above) instead of local variable
                const directionsResult = directionsResultForMap || (directionsResponse && directionsResponse.routes && directionsResponse.routes.length > 0 ? directionsResponse : null);

                if (directionsResult && directionsResult.routes && directionsResult.routes.length > 0) {

                  // Initialize DirectionsRenderer for main map if not exists
                  // Don't create DirectionsRenderer - it adds dots
                  // We'll extract route path and use custom polyline instead
                  if (!directionsRendererRef.current) {
                    // Create DirectionsRenderer but don't set it on map (only for extracting route data)
                    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                      suppressMarkers: true,
                      suppressInfoWindows: false,
                      polylineOptions: {
                        strokeColor: '#4285F4',
                        strokeWeight: 0,
                        strokeOpacity: 0,
                        zIndex: -1,
                        icons: []
                      },
                      preserveViewport: true
                    });
                    // Explicitly don't set map - we use custom polyline instead
                  }

                  // Extract route path directly from directionsResult (don't use DirectionsRenderer - it adds dots)
                  try {
                    // Validate directionsResult is a valid DirectionsResult object
                    if (!directionsResult || typeof directionsResult !== 'object' || !directionsResult.routes || !Array.isArray(directionsResult.routes) || directionsResult.routes.length === 0) {
                      console.error('❌ Invalid directionsResult:', directionsResult);
                      return;
                    }

                    // Validate it's a Google Maps DirectionsResult (has request and legs)
                    if (!directionsResult.request || !directionsResult.routes[0]?.legs || !Array.isArray(directionsResult.routes[0].legs)) {
                      console.error('❌ directionsResult is not a valid Google Maps DirectionsResult');
                      return;
                    }


                    // Don't create main route polyline - only live tracking polyline will be shown
                    // Remove old custom polyline if exists (cleanup)
                    try {
                      if (routePolylineRef.current) {
                        routePolylineRef.current.setMap(null);
                        routePolylineRef.current = null;
                      }

                      // Completely remove DirectionsRenderer from map to prevent any dots/icons
                      if (directionsRendererRef.current) {
                        directionsRendererRef.current.setMap(null);
                      }
                    } catch (e) {
                      console.warn('⚠️ Error cleaning up polyline:', e);
                    }

                    // Fit bounds to show entire route - but preserve zoom if user has zoomed in
                    const bounds = directionsResult.routes[0].bounds;
                    if (bounds) {
                      const currentZoom = window.deliveryMapInstance.getZoom();
                      window.deliveryMapInstance.fitBounds(bounds, { padding: 100 });
                      // Restore zoom if user had zoomed in more than fitBounds would set
                      setTimeout(() => {
                        const newZoom = window.deliveryMapInstance.getZoom();
                        if (currentZoom > newZoom && currentZoom >= 18) {
                          window.deliveryMapInstance.setZoom(currentZoom);
                        }
                      }, 100);
                    }

                  } catch (error) {
                    console.error('❌ Error extracting route path:', error);
                    console.error('❌ directionsResult type:', typeof directionsResult);
                    console.error('❌ directionsResult:', directionsResult);
                  }
                } else if (routeCoordinates && routeCoordinates.length > 0) {
                  // Fallback: Use polyline if Directions API result not available
                  // setRoutePolyline will trigger useEffect that calls updateRoutePolyline
                  setRoutePolyline(routeCoordinates);
                } else {
                  console.warn('⚠️ No route data available to display (neither Directions API result nor coordinates)');
                }

                // Add restaurant marker to main map
                if (restaurantInfo.lat && restaurantInfo.lng) {
                  const restaurantLocation = {
                    lat: restaurantInfo.lat,
                    lng: restaurantInfo.lng
                  };

                  // Remove old restaurant marker if exists
                  if (restaurantMarkerRef.current) {
                    restaurantMarkerRef.current.setMap(null);
                  }

                  // Create restaurant marker on main map with kitchen icon
                  restaurantMarkerRef.current = new window.google.maps.Marker({
                    position: restaurantLocation,
                    map: window.deliveryMapInstance,
                    icon: {
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="11" fill="#e53935" stroke="#FFFFFF" stroke-width="2"/>
                          <path d="M8 10c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v6H8v-6z" fill="#FFFFFF"/>
                          <path d="M7 16h10M10 12h4M9 14h6" stroke="#e53935" stroke-width="1.5" stroke-linecap="round"/>
                          <path d="M10 8h4v2h-4z" fill="#FFFFFF" opacity="0.7"/>
                        </svg>
                      `),
                      scaledSize: new window.google.maps.Size(48, 48),
                      anchor: new window.google.maps.Point(24, 48)
                    },
                    title: restaurantInfo.name || 'Kitchen',
                    animation: window.google.maps.Animation.DROP,
                    zIndex: 10
                  });

                }
              } else {
                console.warn('⚠️ Main map not ready, will show route when map loads');
              }

              // Save accepted order to localStorage for refresh handling
              try {
                const activeOrderData = {
                  orderId: restaurantInfo.id || restaurantInfo.orderId,
                  restaurantInfo: restaurantInfo,
                  // Don't save directionsResponse - Google Maps objects can't be serialized to JSON
                  // Route will be recalculated on restore using Directions API
                  routeCoordinates: routeCoordinates, // Save coordinates for fallback polyline
                  acceptedAt: new Date().toISOString(),
                  hasDirectionsAPI: !!directionsResultForMap // Flag to indicate we should recalculate with Directions API
                };
                localStorage.setItem('deliveryActiveOrder', JSON.stringify(activeOrderData));
              } catch (storageError) {
                console.error('❌ Error saving active order to localStorage:', storageError);
              }

              // Don't show Reached Pickup popup here - it will be shown when order becomes ready via WebSocket
              // The popup will be triggered by orderReady event from backend
            }, 300); // Wait for popup close animation

          } else {
            console.error('❌ Failed to accept order:', response.data)
            // Show error message to user
            toast.error(response.data?.message || 'Failed to accept order. Please try again.')
            // Still close popup
            setShowNewOrderPopup(false)
            setIsNewOrderPopupMinimized(false) // Reset minimized state
            setNewOrderDragY(0) // Reset drag position
          }
        } catch (error) {
          console.error('❌ Error accepting order:', error)
          console.error('❌ Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            orderId: orderId || 'unknown',
            code: error.code,
            isNetworkError: error.code === 'ERR_NETWORK',
            currentLocation: currentLocation && currentLocation.length === 2 ? 'available' : 'not available'
          })

          // Log full error response for debugging
          if (error.response?.data) {
            console.error('❌ Backend error response:', JSON.stringify(error.response.data, null, 2))
          }

          // Show user-friendly error message
          let errorMessage = 'Failed to accept order. Please try again.'
          if (error.code === 'ERR_NETWORK') {
            errorMessage = 'Network error. Please check your internet connection and try again.'
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message
            // Also log the full error if available
            if (error.response.data.error) {
              console.error('❌ Backend error details:', error.response.data.error)
            }
          } else if (error.message) {
            errorMessage = error.message
          }

          toast.error(errorMessage)

          // Close popup even on error
          setShowNewOrderPopup(false)
          setIsNewOrderPopupMinimized(false) // Reset minimized state
          setNewOrderDragY(0) // Reset drag position
        } finally {
          // Reset after animation
          setTimeout(() => {
            setNewOrderAcceptButtonProgress(0)
            setNewOrderIsAnimatingToComplete(false)
          }, 500)
        }
      }

      // Start accepting order
      acceptOrderAndShowRoute()
    } else {
      // Reset smoothly
      setNewOrderAcceptButtonProgress(0)
    }

    newOrderAcceptButtonSwipeStartX.current = 0
    newOrderAcceptButtonSwipeStartY.current = 0
    newOrderAcceptButtonIsSwiping.current = false
  }

  // Handle new order popup swipe down to minimize (not close)
  // Popup should stay visible until accept/reject is clicked
  const handleNewOrderPopupTouchStart = (e) => {
    // Allow touch start from anywhere when minimized (for swipe up from handle)
    if (isNewOrderPopupMinimized) {
      e.stopPropagation()
      newOrderSwipeStartY.current = e.touches[0].clientY
      newOrderIsSwiping.current = true
      setIsDraggingNewOrderPopup(true)
      return
    }

    // When visible, only allow swipe from top handle area
    const target = e.target
    const rect = newOrderPopupRef.current?.getBoundingClientRect()
    if (!rect) return

    const touchY = e.touches[0].clientY
    const handleArea = rect.top + 100 // Top 100px is swipeable area

    if (touchY <= handleArea) {
      e.stopPropagation()
      newOrderSwipeStartY.current = touchY
      newOrderIsSwiping.current = true
      setIsDraggingNewOrderPopup(true)
    }
  }

  const handleNewOrderPopupTouchMove = (e) => {
    if (!newOrderIsSwiping.current) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - newOrderSwipeStartY.current
    const popupHeight = newOrderPopupRef.current?.offsetHeight || 600

    e.stopPropagation()

    if (isNewOrderPopupMinimized) {
      // Currently minimized - swiping up (negative deltaY) should restore
      if (deltaY < 0) {
        // Calculate new position: start from popupHeight, subtract the upward swipe distance
        const newPosition = popupHeight + deltaY // deltaY is negative, so this reduces the position
        setNewOrderDragY(Math.max(0, newPosition)) // Don't go above 0 (fully visible)
      }
    } else {
      // Currently visible - swiping down (positive deltaY) should minimize
      if (deltaY > 0) {
        setNewOrderDragY(deltaY) // Direct deltaY, will be clamped to popupHeight in touchEnd
      }
    }
  }

  const handleNewOrderPopupTouchEnd = (e) => {
    if (!newOrderIsSwiping.current) {
      newOrderIsSwiping.current = false
      setIsDraggingNewOrderPopup(false)
      return
    }

    e.stopPropagation()

    const deltaY = e.changedTouches[0].clientY - newOrderSwipeStartY.current
    const threshold = 100
    const popupHeight = newOrderPopupRef.current?.offsetHeight || 600

    if (isNewOrderPopupMinimized) {
      // Currently minimized - check if swiping up enough to restore
      if (deltaY < -threshold) {
        // Swipe up enough - restore popup
        setIsNewOrderPopupMinimized(false)
        setNewOrderDragY(0)
      } else {
        // Not enough swipe - keep minimized
        setIsNewOrderPopupMinimized(true)
        setNewOrderDragY(popupHeight)
        // Delay stopping drag to allow position to be set
        setTimeout(() => {
          setIsDraggingNewOrderPopup(false)
        }, 10)
      }
    } else {
      // Currently visible - check if swiping down enough to minimize
      if (deltaY > threshold) {
        // Swipe down enough - minimize popup (but don't close)
        // Set dragY first to current position
        setNewOrderDragY(deltaY)
        // Then set minimized state and update dragY to full height
        setIsNewOrderPopupMinimized(true)
        // Use requestAnimationFrame to ensure state updates are batched
        requestAnimationFrame(() => {
          setNewOrderDragY(popupHeight)
          // Stop dragging after state is set
          setTimeout(() => {
            setIsDraggingNewOrderPopup(false)
          }, 50)
        })
      } else {
        // Not enough swipe - restore to visible (snap back)
        setIsNewOrderPopupMinimized(false)
        setNewOrderDragY(0)
        setIsDraggingNewOrderPopup(false)
      }
    }

    newOrderIsSwiping.current = false
    newOrderSwipeStartY.current = 0
  }

  // Handle Reached Pickup button swipe
  const handlereachedPickupTouchStart = (e) => {
    reachedPickupSwipeStartX.current = e.touches[0].clientX
    reachedPickupSwipeStartY.current = e.touches[0].clientY
    reachedPickupIsSwiping.current = false
    setreachedPickupIsAnimatingToComplete(false)
    setreachedPickupButtonProgress(0)
  }

  const handlereachedPickupTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - reachedPickupSwipeStartX.current
    const deltaY = e.touches[0].clientY - reachedPickupSwipeStartY.current

    // Only handle horizontal swipes (swipe right)
    if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
      reachedPickupIsSwiping.current = true
      // Don't call preventDefault - CSS touch-action handles scrolling prevention
      // safePreventDefault(e) // Removed to avoid passive listener error

      // Calculate max swipe distance
      const buttonWidth = reachedPickupButtonRef.current?.offsetWidth || 300
      const circleWidth = 56 // w-14 = 56px
      const padding = 16 // px-4 = 16px
      const maxSwipe = buttonWidth - circleWidth - (padding * 2)

      const progress = Math.min(Math.max(deltaX / maxSwipe, 0), 1)
      setreachedPickupButtonProgress(progress)
    }
  }

  const handlereachedPickupTouchEnd = (e) => {
    if (!reachedPickupIsSwiping.current) {
      setreachedPickupButtonProgress(0)
      return
    }

    const deltaX = e.changedTouches[0].clientX - reachedPickupSwipeStartX.current
    const buttonWidth = reachedPickupButtonRef.current?.offsetWidth || 300
    const circleWidth = 56
    const padding = 16
    const maxSwipe = buttonWidth - circleWidth - (padding * 2)
    const threshold = maxSwipe * 0.7 // 70% of max swipe

    if (deltaX > threshold) {
      // Animate to completion
      setreachedPickupIsAnimatingToComplete(true)
      setreachedPickupButtonProgress(1)

      // Close popup after animation, confirm reached pickup, then show order ID confirmation popup
      setTimeout(async () => {
        setShowreachedPickupPopup(false)

        // Get order ID - prioritize orderId (string) over id (MongoDB _id) for better compatibility
        // Backend accepts both _id and orderId, but orderId is more reliable
        const orderId = selectedRestaurant?.orderId || selectedRestaurant?.id || newOrder?.orderId || newOrder?.orderMongoId

 (async () => {
          // Get order ID - prioritize MongoDB _id over orderId string for API call
          // Backend expects _id (MongoDB ObjectId) in the URL parameter
          // Use _id (MongoDB ObjectId) if available, otherwise fallback to orderId string
          const orderIdForApi = selectedRestaurant?.id ||
            newOrder?.orderMongoId ||
            newOrder?._id ||
            selectedRestaurant?.orderId ||
            newOrder?.orderId

base64, prefix)
   *   mimeType?: string,        // MIME type (e.g., 'image/jpeg', 'image/png')
   *   fileName?: string,        // File name (e.g., 'bill-image.jpg')
   *   filePath?: string         // Not recommended: File path (requires additional handler to read)
   * }
   * 
   * If user cancels:
   * { success: false } or null
   */
  const handleCameraCapture = async () => {
    try {
      // Check if Flutter InAppWebView handler is available
      if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function') {
 i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
              }
              const byteArray = new Uint8Array(byteNumbers)
              const mimeType = result.mimeType || 'image/jpeg'
              const blob = new Blob([byteArray], { type: mimeType })
              file = new File([blob], result.fileName || `bill-image-${Date.now()}.jpg`, { type: mimeType })
 backend accepts both _id and orderId
          const orderIdForApi = selectedRestaurant?.orderId || selectedRestaurant?.id
          const confirmedOrderIdForApi = selectedRestaurant?.orderId || (orderIdForApi && String(orderIdForApi).startsWith('ORD-') ? orderIdForApi : undefined)

          // Call backend API to confirm order ID
 // in meters
                    const deliveryDuration = directionsResult.routes[0]?.legs[0]?.duration?.value || 0; // in seconds
                    deliveryRouteDistanceRef.current = deliveryDistance;
                    deliveryRouteTimeRef.current = deliveryDuration;

                    // Calculate total trip distance and time
                    const totalDistance = pickupRouteDistanceRef.current + deliveryDistance;
                    const totalTime = pickupRouteTimeRef.current + deliveryDuration;
                    setTripDistance(totalDistance);
                    setTripTime(totalTime);

                    setDirectionsResponse(directionsResult)
                    directionsResponseRef.current = directionsResult

                    // Initialize / update live tracking polyline for customer delivery route
                    updateLiveTrackingPolyline(directionsResult, currentLocation)
                          routePolylineRef.current = null;
                        }

                        // Remove DirectionsRenderer from map
                        if (directionsRendererRef.current) {
                          directionsRendererRef.current.setMap(null);
                        }
                      } catch (e) {
                        console.warn('⚠️ Error cleaning up polyline:', e);
                      }

                      const bounds = directionsResult.routes?.[0]?.bounds
                      if (bounds) {
                        const currentZoomBeforeFit = window.deliveryMapInstance.getZoom();
                        window.deliveryMapInstance.fitBounds(bounds, { padding: 100 });
                        // Preserve zoom if user had zoomed in
                        setTimeout(() => {
                          const newZoom = window.deliveryMapInstance.getZoom();
                          if (currentZoomBeforeFit > newZoom && currentZoomBeforeFit >= 18) {
                            window.deliveryMapInstance.setZoom(currentZoomBeforeFit);
                          }
                        }, 100);
                      }
                    }
                    setShowRoutePath(true)
                  } else if (routeData?.coordinates?.length > 0) {
                    setRoutePolyline(routeData.coordinates)
                    updateRoutePolyline(routeData.coordinates)
                    setShowRoutePath(true)
                  }
                } catch (routeError) {
                  if (routeError.message?.includes('REQUEST_DENIED') || routeError.message?.includes('not available')) {

      // Check if this order has already been accepted
      if (acceptedOrderIdsRef.current.has(orderId)) {
        clearNewOrder();
        return;
      }

      // Check if order is already in localStorage (accepted order)
      try {
        const activeOrderData = localStorage.getItem('deliveryActiveOrder');
        if (activeOrderData) {
          const activeOrder = JSON.parse(activeOrderData);
          const activeOrderId = activeOrder.orderId || activeOrder.restaurantInfo?.id || activeOrder.restaurantInfo?.orderId;
          if (activeOrderId === orderId) {
            acceptedOrderIdsRef.current.add(orderId);
            clearNewOrder();
            return;
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }

      // Check if cash limit reached for COD orders
      const orderPaymentMethod = newOrder.paymentMethod || newOrder.payment?.method || 'cash'
      const isCodOrder = orderPaymentMethod === 'cash'

      if (isCodOrder && availableCashLimit <= 0) {
      if (newOrder.restaurantLocation?.address) {
        restaurantAddress = newOrder.restaurantLocation.address;
      } else if (newOrder.restaurantLocation?.formattedAddress) {
        restaurantAddress = newOrder.restaurantLocation.formattedAddress;
      } else if (newOrder.restaurantAddress) {
        restaurantAddress = newOrder.restaurantAddress;
      }

      // Extract earnings from notification - backend now calculates and sends estimatedEarnings
      const deliveryFee = newOrder.deliveryFee ?? 0;
      const earned = newOrder.estimatedEarnings;
      let earnedValue = 0;

      if (earned) {
        if (typeof earned === 'object' && earned.totalEarning != null) {
          earnedValue = Number(earned.totalEarning) || 0;
        } else if (typeof earned === 'number') {
          earnedValue = earned;
        }
      }

      // Use calculated earnings if available, otherwise fallback to deliveryFee
      const effectiveEarnings = earnedValue > 0 ? earned : (deliveryFee > 0 ? deliveryFee : 0);
      const extractedRestaurantCoords = extractLatLng(newOrder.restaurantLocation || newOrder.restaurant?.location)
      const newOrderRestaurantCoords = {
        lat: extractedRestaurantCoords.lat ?? toFiniteCoordinate(newOrder.restaurantLat),
        lng: extractedRestaurantCoords.lng ?? toFiniteCoordinate(newOrder.restaurantLng)
      }


      // Calculate pickup distance if not provided
      let pickupDistance = newOrder.pickupDistance;
      if (
        !pickupDistance ||
        pickupDistance === '0 km' ||
        pickupDistance === 'Distance not available' ||
        pickupDistance === 'Calculating...'
      ) {
        // Try to calculate from driver's current location to restaurant
        const currentLocation = riderLocation || lastLocationRef.current;
        const restaurantLat = newOrderRestaurantCoords.lat;
        const restaurantLng = newOrderRestaurantCoords.lng;

        if (currentLocation && currentLocation.length === 2 &&
          hasValidCoordinates(restaurantLat, restaurantLng)) {
          // Calculate distance in meters, then convert to km
          const distanceInMeters = calculateDistance(
            currentLocation[0],
            currentLocation[1],
            restaurantLat,
            restaurantLng
          );
          const distanceInKm = distanceInMeters / 1000;
          pickupDistance = `${distanceInKm.toFixed(2)} km`;
        }
      }

      // Default to 'Calculating...' if still no distance
      if (
        !pickupDistance ||
        pickupDistance === '0 km' ||
        pickupDistance === 'Distance not available'
      ) {
        pickupDistance = 'Calculating...';
      }

      const restaurantData = {
        id: newOrder.orderMongoId || newOrder.orderId,
        orderId: newOrder.orderId,
        name: newOrder.restaurantName,
        address: restaurantAddress,
        lat: newOrderRestaurantCoords.lat,
        lng: newOrderRestaurantCoords.lng,
        distance: pickupDistance,
        timeAway: pickupDistance !== 'Calculating...' ? calculateTimeAway(pickupDistance) : 'Calculating...',
        dropDistance: newOrder.deliveryDistance ||
          (typeof newOrder.deliveryDistanceRaw === 'number' && Number.isFinite(newOrder.deliveryDistanceRaw)
            ? `${newOrder.deliveryDistanceRaw.toFixed(2)} km`
            : 'Calculating...'),
        pickupDistance: pickupDistance,
        estimatedEarnings: effectiveEarnings,
        deliveryFee,
        amount: earnedValue > 0 ? earnedValue : (deliveryFee > 0 ? deliveryFee : 0),
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone || newOrder.customer?.phone || null,
        customerAddress: newOrder.customerLocation?.address || 'Customer address',
        customerLat: newOrder.customerLocation?.latitude,
        customerLng: newOrder.customerLocation?.longitude,
        items: newOrder.items || [],
        total: newOrder.total || 0
      }

      setSelectedRestaurant(restaurantData)
      setShowNewOrderPopup(true)
      setCountdownSeconds(300) // Reset countdown to 5 minutes
    }
  }, [newOrder, calculateTimeAway, riderLocation])

  // Recalculate distance when rider location becomes available
  useEffect(() => {
    if (!selectedRestaurant || !showNewOrderPopup) return

    // Only recalculate if distance is missing or showing '0 km' or 'Calculating...'
    const currentDistance = selectedRestaurant.distance || selectedRestaurant.pickupDistance
    if (currentDistance && currentDistance !== '0 km' && currentDistance !== 'Calculating...') {
      return // Distance already calculated
    }

    const currentLocation = riderLocation || lastLocationRef.current
    const restaurantLat = selectedRestaurant.lat
    const restaurantLng = selectedRestaurant.lng

    if (currentLocation && currentLocation.length === 2 &&
      hasValidCoordinates(restaurantLat, restaurantLng)) {
      // Calculate distance in meters, then convert to km
      const distanceInMeters = calculateDistance(
        currentLocation[0],
        currentLocation[1],
        restaurantLat,
        restaurantLng
      )
      const distanceInKm = distanceInMeters / 1000
      const pickupDistance = `${distanceInKm.toFixed(2)} km`

    }
  }

  // Carousel state
  const [currentCarouselSlide, setCurrentCarouselSlide] = useState(0)
  const carouselRef = useRef(null)
  const carouselStartX = useRef(0)
  const carouselIsSwiping = useRef(false)
  const carouselAutoRotateRef = useRef(null)

  // Map view toggle state - Hotspot or Select drop (both show map, just different views)
  const [mapViewMode, setMapViewMode] = useState("hotspot") // "hotspot" or "selectDrop"

  // Swipe bar state - controls whether map or home sections are visible
  const [showHomeSections, setShowHomeSections] = useState(false) // false = map view, true = home sections
  const [swipeBarPosition, setSwipeBarPosition] = useState(0) // 0 = bottom (map), 1 = top (home)
  const [isDraggingSwipeBar, setIsDraggingSwipeBar] = useState(false)
  const swipeBarRef = useRef(null)
  const swipeBarStartY = useRef(0)
  const isSwipingBar = useRef(false)
  const homeSectionsScrollRef = useRef(null)
  const isScrollingHomeSections = useRef(false)

  // Emergency help popup state
  const [showEmergencyPopup, setShowEmergencyPopup] = useState(false)

  // Help popup state
  const [showHelpPopup, setShowHelpPopup] = useState(false)

  // Book gigs popup state
  const [showBookGigsPopup, setShowBookGigsPopup] = useState(false)

  // Drop location selection popup state
  const [showDropLocationPopup, setShowDropLocationPopup] = useState(false)
  const [selectedDropLocation, setSelectedDropLocation] = useState(() => {
    return localStorage.getItem('selectedDropLocation') || null
  })

  // Help options - using paths from DeliveryRouter
  const helpOptions = [
    {
      id: "supportTickets",
      title: "Support tickets",
      subtitle: "Check status of tickets raised",
      icon: "ticket",
      path: "/delivery/help/tickets"
    },
    {
      id: "idCard",
      title: "Show ID card",
      subtitle: `See your ${companyName} ID card`,
      icon: "idCard",
      path: "/delivery/help/id-card"
    }
  ]

  // Handle help option click - navigate to the correct route
  const handleHelpOptionClick = (option) => {
    if (option.path) {
      setShowHelpPopup(false)
      navigate(option.path)
    }
  }

  // Emergency options with phone numbers
  const emergencyOptions = [
    {
      id: "ambulance",
      title: "Call ambulance (10 mins)",
      subtitle: "For medical emergencies",
      phone: "108", // Indian emergency ambulance number
      icon: "ambulance"
    },
    {
      id: "accident",
      title: "Call accident helpline",
      subtitle: "Talk to our emergency team",
      phone: "1073", // Indian accident helpline
      icon: "siren"
    },
    {
      id: "police",
      title: "Call police",
      subtitle: "Report a crime",
      phone: "100", // Indian police emergency number
      icon: "police"
    },
    {
      id: "insurance",
      title: "Insurance card",
      subtitle: "View your insurance details",
      phone: null, // No phone call for insurance
      icon: "insurance"
    }
  ]

  // Handle emergency option click
  const handleEmergencyOptionClick = (option) => {
    if (option.phone) {
      window.location.href = `tel:${option.phone}`
    } else if (option.id === "insurance") {
      // Navigate to insurance page or show insurance details
      navigate("/delivery/insurance")
    }
    setShowEmergencyPopup(false)
  }

  // Fetch wallet data from API
  useEffect(() => {
    const fetchWalletData = async () => {
      // Skip wallet fetch if status is pending
      if (deliveryStatus === 'pending') {
        setWalletState({
          totalBalance: 0,
          cashInHand: 0,
          totalWithdrawn: 0,
          totalEarned: 0,
          transactions: [],
          joiningBonusClaimed: false
        })
        return
      }

      try {
        const walletData = await fetchDeliveryWallet()
        setWalletState(walletData)
      } catch (error) {
        // Only log error if it's not a network error (backend might be down)
        if (error.code !== 'ERR_NETWORK') {
          console.error('Error fetching wallet data:', error)
        }
        // Keep empty state on error
        setWalletState({
          totalBalance: 0,
          cashInHand: 0,
          totalWithdrawn: 0,
          totalEarned: 0,
          transactions: [],
          joiningBonusClaimed: false
        })
      }
    }

    // Only fetch if status is known and not pending
    if (deliveryStatus !== null && deliveryStatus !== 'pending') {
      fetchWalletData()
    } else if (deliveryStatus === null) {
      // If status is not yet loaded, wait for it
      fetchWalletData()
    }
  }, [deliveryStatus])

  // Fetch assigned orders from API when delivery person goes online
  const fetchAssignedOrders = useCallback(async () => {
    if (!isOnline) {
          if (firstOrder.restaurantId?.address) {
            restaurantAddress = firstOrder.restaurantId.address;
          } else if (firstOrder.restaurantId?.location?.formattedAddress) {
            restaurantAddress = firstOrder.restaurantId.location.formattedAddress;
          } else if (firstOrder.restaurantId?.location?.address) {
            restaurantAddress = firstOrder.restaurantId.location.address;
          } else if (firstOrder.restaurantId?.location?.street) {
            // Build address from location fields
            const loc = firstOrder.restaurantId.location;
            const parts = [loc.street, loc.city, loc.state, loc.pincode].filter(Boolean);
            restaurantAddress = parts.join(', ') || 'Restaurant address';
          }


          const assignedRestaurantCoords = extractLatLng(
            firstOrder.restaurantId?.location || firstOrder.restaurantLocation
          );

          // Calculate pickup distance if not provided
          let pickupDistance = null;
          if (firstOrder.assignmentInfo?.distance) {
            pickupDistance = `${firstOrder.assignmentInfo.distance.toFixed(2)} km`;
          } else {
            // Try to calculate from driver's current location to restaurant
            const currentLocation = riderLocation || lastLocationRef.current;
            const restaurantLat = assignedRestaurantCoords.lat;
            const restaurantLng = assignedRestaurantCoords.lng;

            if (currentLocation && currentLocation.length === 2 &&
              hasValidCoordinates(restaurantLat, restaurantLng)) {
              // Calculate distance in meters, then convert to km
              const distanceInMeters = calculateDistance(
                currentLocation[0],
                currentLocation[1],
                restaurantLat,
                restaurantLng
              );
              const distanceInKm = distanceInMeters / 1000;
              pickupDistance = `${distanceInKm.toFixed(2)} km`;
            }
          }

          // Default to 'Calculating...' if still no distance
          if (!pickupDistance || pickupDistance === '0 km') {
            pickupDistance = 'Calculating...';
          }

          const restaurantData = {
            id: firstOrder._id?.toString() || firstOrder.orderId,
            orderId: firstOrder.orderId,
            name: firstOrder.restaurantId?.name || 'Restaurant',
            address: restaurantAddress,
            lat: assignedRestaurantCoords.lat,
            lng: assignedRestaurantCoords.lng,
            distance: pickupDistance,
            timeAway: pickupDistance !== 'Calculating...' ? calculateTimeAway(pickupDistance) : 'Calculating...',
            dropDistance: firstOrder.address?.location?.coordinates
              ? 'Calculating...'
              : '0 km',
            pickupDistance: pickupDistance,
            estimatedEarnings: firstOrder.pricing?.deliveryFee || 0,
            customerName: firstOrder.userId?.name || 'Customer',
            customerPhone: firstOrder.userId?.phone || firstOrder.customerPhone || null,
            customerAddress: firstOrder.address?.formattedAddress ||
              (firstOrder.address?.street
                ? `${firstOrder.address.street}, ${firstOrder.address.city || ''}, ${firstOrder.address.state || ''}`.trim()
                : 'Customer address'),
            customerLat: firstOrder.address?.location?.coordinates?.[1],
            customerLng: firstOrder.address?.location?.coordinates?.[0],
            items: firstOrder.items || [],
            total: firstOrder.pricing?.total || 0,
            payment: firstOrder.payment?.method || 'COD',
            amount: firstOrder.pricing?.total || 0
          }

          setSelectedRestaurant(restaurantData)
          setShowNewOrderPopup(true)
          setCountdownSeconds(300) // Reset countdown to 5 minutes
 just hide bank-details banner so UI doesn't block
          setBankDetailsFilled(true)
        } else {
          setBankDetailsFilled(false)
        }
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

  // Handle reverify (resubmit for approval)
  const handleReverify = async () => {
    try {
      setIsReverifying(true)
      await deliveryAPI.reverify()

      // Refresh profile to get updated status
      const response = await deliveryAPI.getProfile()
      if (response?.data?.success && response?.data?.data?.profile) {
        const profile = response.data.data.profile
        setDeliveryStatus(profile.status)
        setRejectionReason(null)
      }

      alert("Your request has been resubmitted for verification. Admin will review it soon.")
    } catch (err) {
      console.error("Error reverifying:", err)
      alert(err.response?.data?.message || "Failed to resubmit request. Please try again.")
    } finally {
      setIsReverifying(false)
    }
  }

  // Ola Maps SDK check removed

  // Re-run map init when container might have become available (ref can be null on first run)
  const [mapInitRetry, setMapInitRetry] = useState(0)

  // Initialize Google Map - Preserve map across navigation, re-attach when returning
  useEffect(() => {
    if (showHomeSections) {
      return;
    }

    if (!mapContainerRef.current) {
      if (mapInitRetry < 10) {
        const timer = setTimeout(() => setMapInitRetry((r) => r + 1), 200);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Store preserved state for re-initialization after navigation
    let preservedState = null;

    // If map instance exists, preserve state before re-initializing
    if (window.deliveryMapInstance) {
      const existingMap = window.deliveryMapInstance;
      const existingBikeMarker = bikeMarkerRef.current;
      const existingPolyline = routePolylineRef.current;


      // Check if map is already attached to current container
      try {
        const mapDiv = existingMap.getDiv();
        if (mapDiv && mapDiv === mapContainerRef.current) {
          return; // Map is already properly attached, no need to re-initialize
        }
      } catch (error) {
        // Map div check failed, will re-initialize
      }

      // Store map state safely
      try {
        preservedState = {
          center: existingMap.getCenter(),
          zoom: existingMap.getZoom(),
          bikeMarkerPosition: null,
          bikeMarkerHeading: null,
          hasPolyline: !!existingPolyline
        };

        // Store bike marker state
        if (existingBikeMarker) {
          const pos = existingBikeMarker.getPosition();
          if (pos) {
            preservedState.bikeMarkerPosition = { lat: pos.lat(), lng: pos.lng() };
            // Get heading from icon rotation if available
            const icon = existingBikeMarker.getIcon();
            if (icon && typeof icon === 'object' && icon.rotation !== undefined) {
              preservedState.bikeMarkerHeading = icon.rotation;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error preserving map state:', error);
        preservedState = null;
      }

      // Remove markers from old map before clearing (safely)
      try {
        if (existingBikeMarker && typeof existingBikeMarker.setMap === 'function') {
          existingBikeMarker.setMap(null);
        }
        if (existingPolyline && typeof existingPolyline.setMap === 'function') {
          existingPolyline.setMap(null);
        }
      } catch (error) {
        console.warn('⚠️ Error removing markers from old map:', error);
      }

      // Clear old map instance reference (will be re-created below)
      // Markers preserved in refs, will be re-attached after map initialization
      window.deliveryMapInstance = null;
    }


    // Load Google Maps if not already loaded
    const loadGoogleMapsIfNeeded = async () => {
      // Check if already loaded
      if (window.google && window.google.maps) {
        // Wait a bit to ensure ref is available
        await new Promise(resolve => setTimeout(resolve, 100));
        initializeGoogleMap();
        return;
      }

      // Check if script tag is already present (from main.jsx)
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript || window.__googleMapsLoading) {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        while ((!window.google || !window.google.maps) && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (window.google && window.google.maps) {
          await initializeGoogleMap();
          return;
        }
      }

      // Only use Loader if no script tag exists and not already loading
      if (!existingScript && !window.__googleMapsLoading) {
        window.__googleMapsLoading = true;
        try {
          const apiKey = await getGoogleMapsApiKey();
          if (apiKey) {
            const loader = new Loader({
              apiKey: apiKey,
              version: "weekly",
              libraries: ["places", "geometry", "drawing"]
            });
            await loader.load();
            window.__googleMapsLoaded = true;
            window.__googleMapsLoading = false;
            await initializeGoogleMap();
          } else {
            console.error('❌ No Google Maps API key found');
            window.__googleMapsLoading = false;
            setMapLoading(false);
            return;
          }
        } catch (error) {
          console.error('❌ Error loading Google Maps:', error);
          window.__googleMapsLoading = false;
          setMapLoading(false);
          return;
        }
      } else {
        // Wait a bit more if script is loading
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds
        while ((!window.google || !window.google.maps) && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (window.google && window.google.maps) {
          await initializeGoogleMap();
        } else {
          console.error('❌ Google Maps failed to load');
          setMapLoading(false);
        }
      }

      // Wait for MapTypeId to be available (sometimes it loads slightly after maps)
      if (window.google && window.google.maps && !window.google.maps.MapTypeId) {
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max wait

        while (!window.google.maps.MapTypeId && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      // Initialize map once Google Maps is fully loaded
      // Check for both maps and MapTypeId to ensure API is fully initialized
      if (window.google && window.google.maps) {
        // MapTypeId might still not be available, but we have a fallback
        if (!window.google.maps.MapTypeId) {
          console.warn('⚠️ MapTypeId not available, will use string fallback');
        }
        await initializeGoogleMap();
      } else {
        console.error('❌ Google Maps API still not available or not fully loaded');
        console.error('❌ API status:', {
          google: !!window.google,
          maps: !!window.google?.maps,
          MapTypeId: !!window.google?.maps?.MapTypeId
        });
        setMapLoading(false);
      }
    };

    loadGoogleMapsIfNeeded();

    async function initializeGoogleMap() {
      try {
        // Wait for map container ref to be available
        if (!mapContainerRef.current) {
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds max wait

          while (!mapContainerRef.current && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }

          if (!mapContainerRef.current) {
            console.error('❌ Map container ref is still null after waiting');
            setMapLoading(false);
            return;
          }
        }

        if (!window.google || !window.google.maps) {
          console.error('❌ Google Maps API not available');
          setMapLoading(false);
          return;
        }

        setMapLoading(true);

        // Get location from multiple sources (priority: riderLocation > saved location > wait for GPS)
        let initialCenter = null;

        if (riderLocation && riderLocation.length === 2) {
          // Use current rider location
          initialCenter = { lat: riderLocation[0], lng: riderLocation[1] };
        } else {
          // Try to get from localStorage (saved location from previous session)
          const savedLocation = localStorage.getItem('deliveryBoyLastLocation');
          if (savedLocation) {
            try {
              const parsed = JSON.parse(savedLocation);
              if (parsed && Array.isArray(parsed) && parsed.length === 2) {
                const [lat, lng] = parsed;
                // Validate coordinates
                if (typeof lat === 'number' && typeof lng === 'number' &&
                  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                  initialCenter = { lat, lng };
                }
              }
            } catch (e) {
              console.warn('⚠️ Error parsing saved location:', e);
            }
          }
        }

        // If still no location, use default India center so map always loads.
        // When GPS location is received, map will recenter and show bike marker.
        if (!initialCenter) {
          initialCenter = { lat: 20.5937, lng: 78.9629 };
        }


        // Check if MapTypeId is available, use string fallback if not
        // Always use string 'roadmap' to avoid MapTypeId enum issues
        const mapTypeId = (window.google?.maps?.MapTypeId?.ROADMAP !== undefined)
          ? window.google.maps.MapTypeId.ROADMAP
          : 'roadmap';


        // Wrap map initialization in try-catch to handle any Google Maps internal errors
        let map;
        try {
          map = new window.google.maps.Map(mapContainerRef.current, {
            center: initialCenter,
            zoom: 18,
            minZoom: 10, // Minimum zoom level (city/area view)
            maxZoom: 21, // Maximum zoom level - allow full zoom
            mapTypeId: mapTypeId,
            tilt: 45,
            heading: 0,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });
        } catch (mapError) {
          console.error('❌ Error creating Google Map:', mapError);
          console.error('❌ Error details:', {
            message: mapError.message,
            name: mapError.name,
            stack: mapError.stack
          });
          setMapLoading(false);
          return;
        }

        // Store map instance
        window.deliveryMapInstance = map;

        // Add error listener for map errors (if available)
        try {
          if (window.google.maps.event) {
            window.google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
            });
          }
        } catch (eventError) {
          console.warn('⚠️ Could not add map event listeners:', eventError);
        }

        // Add error listener for map errors
        window.google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
        });

        // Handle map errors
        window.google.maps.event.addListener(map, 'error', (error) => {
          console.error('❌ Google Map error:', error);
        });

        // Track user panning to disable auto-center when user manually moves map
        let isUserPanning = false;
        let panTimeout = null;

        map.addListener('dragstart', () => {
          isUserPanning = true;
          isUserPanningRef.current = true;
          if (panTimeout) clearTimeout(panTimeout);
        });

        map.addListener('dragend', () => {
          // Re-enable auto-center after 5 seconds of no panning
          panTimeout = setTimeout(() => {
            isUserPanning = false;
            isUserPanningRef.current = false;
          }, 5000);
        });

        // Also track zoom changes as user interaction
        map.addListener('zoom_changed', () => {
          isUserPanning = true;
          isUserPanningRef.current = true;
          if (panTimeout) clearTimeout(panTimeout);
          panTimeout = setTimeout(() => {
            isUserPanning = false;
            isUserPanningRef.current = false;
          }, 5000);

          // Allow full zoom - no limit
          // Removed zoom limit to allow full zoom in
        });

        // Restore preserved state if coming back from navigation
        if (preservedState) {
          if (preservedState.center && preservedState.zoom) {
            map.setCenter(preservedState.center);
            map.setZoom(preservedState.zoom);
          }

          // Re-create bike marker if it existed before navigation
          if (preservedState.bikeMarkerPosition && isOnlineRef.current) {
            createOrUpdateBikeMarker(
              preservedState.bikeMarkerPosition.lat,
              preservedState.bikeMarkerPosition.lng,
              preservedState.bikeMarkerHeading,
              false // Don't center when restoring from navigation
            );
          }

          // Don't re-attach route polyline on refresh - only show if there's an active order
          // This prevents showing default/mock polylines on page refresh
          if (preservedState.hasPolyline && routePolylineRef.current && selectedRestaurant) {
            // Only re-attach if we have an active order
            if (routeHistoryRef.current.length >= 2) {
              routePolylineRef.current.setMap(map);
            }
          } else if (!selectedRestaurant && routePolylineRef.current) {
            // Clear polyline if no active order
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
          }

          // Clear live tracking polyline if no active order
          if (!selectedRestaurant && liveTrackingPolylineRef.current) {
            liveTrackingPolylineRef.current.setMap(null);
            liveTrackingPolylineRef.current = null;
          }
          if (!selectedRestaurant && liveTrackingPolylineShadowRef.current) {
            liveTrackingPolylineShadowRef.current.setMap(null);
            liveTrackingPolylineShadowRef.current = null;
          }
        } else {
          // Initialize route history with current location (first time initialization)
          if (riderLocation && riderLocation.length === 2) {
            routeHistoryRef.current = [{
              lat: riderLocation[0],
              lng: riderLocation[1]
            }];
            lastLocationRef.current = riderLocation;

            // Always add bike marker if location is available (both online and offline)
            createOrUpdateBikeMarker(riderLocation[0], riderLocation[1], null, true);
          }
        }

        map.addListener('tilesloaded', () => {
          setMapLoading(false);
          // Ensure bike marker is visible after tiles load (always show, both online and offline)
          if (riderLocation && riderLocation.length === 2) {
            setTimeout(() => {
              if (!bikeMarkerRef.current || bikeMarkerRef.current.getMap() === null) {
                createOrUpdateBikeMarker(riderLocation[0], riderLocation[1], null);
              }
            }, 500);
          } else {
            // Try to get location from localStorage if current location not available
            const savedLocation = localStorage.getItem('deliveryBoyLastLocation');
            if (savedLocation) {
              try {
                const parsed = JSON.parse(savedLocation);
                if (parsed && Array.isArray(parsed) && parsed.length === 2) {
                  setTimeout(() => {
                    createOrUpdateBikeMarker(parsed[0], parsed[1], null);
                  }, 500);
                }
              } catch (e) {
                console.warn('⚠️ Error using saved location:', e);
              }
            }
          }

          // Ensure restaurant marker is visible if we have a selected restaurant
          if (selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng) {
            setTimeout(() => {
              if (!restaurantMarkerRef.current || restaurantMarkerRef.current.getMap() === null) {
                const restaurantLocation = {
                  lat: selectedRestaurant.lat,
                  lng: selectedRestaurant.lng
                };

                restaurantMarkerRef.current = new window.google.maps.Marker({
                  position: restaurantLocation,
                  map: window.deliveryMapInstance,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="11" fill="#e53935" stroke="#FFFFFF" stroke-width="2"/>
                        <path d="M8 10c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v6H8v-6z" fill="#FFFFFF"/>
                        <path d="M7 16h10M10 12h4M9 14h6" stroke="#e53935" stroke-width="1.5" stroke-linecap="round"/>
                        <path d="M10 8h4v2h-4z" fill="#FFFFFF" opacity="0.7"/>
                      </svg>
                    `),
                    scaledSize: new window.google.maps.Size(48, 48),
                    anchor: new window.google.maps.Point(24, 48)
                  },
                  title: selectedRestaurant.name || 'Restaurant',
                  zIndex: 10
                });
              }
            }, 500);
          }

          // Load and draw nearby zones after map is ready
          setTimeout(() => {
            fetchAndDrawNearbyZones();
          }, 1000);
        });

      } catch (error) {
        console.error('❌ Error initializing Google Map:', error);
        setMapLoading(false);
      }
    }

    // Cleanup function - DON'T clear map instance on navigation (preserve it for return)
    return () => {
      // Preserve map instance and markers for navigation
      // Map will be re-initialized when component mounts again

      // Don't clear map instance - preserve it in window.deliveryMapInstance
      // Don't clear bike marker - preserve it in bikeMarkerRef
      // Only temporarily remove polyline from map (preserve reference)
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        // Don't set to null - preserve reference for re-attachment
      }
    }
  }, [showHomeSections, mapInitRetry]) // Re-run when showHomeSections or container retry

  // Initialize map when riderLocation becomes available (if map not already initialized)
  useEffect(() => {
    if (showHomeSections) return
    if (!riderLocation || riderLocation.length !== 2) return
    if (window.deliveryMapInstance) return // Map already initialized
    if (!window.google || !window.google.maps) return // Google Maps not loaded yet
    if (!mapContainerRef.current) return // Container not ready


    if (showHomeSections || !window.deliveryMapInstance) {
      return;
    }

    // Always show bike marker on map (both offline and online)
    // When going online/offline, ensure bike marker is visible at current location IMMEDIATELY
    if (riderLocation && riderLocation.length === 2) {
      // Calculate heading if we have previous location
      let heading = null;
      if (lastLocationRef.current) {
        const [prevLat, prevLng] = lastLocationRef.current;
        heading = calculateHeading(prevLat, prevLng, riderLocation[0], riderLocation[1]);
      }


      // Create or update bike marker IMMEDIATELY (blue dot की जगह bike icon)
      createOrUpdateBikeMarker(riderLocation[0], riderLocation[1], heading, true);

      // Center map on bike location smoothly
      window.deliveryMapInstance.panTo({
        lat: riderLocation[0],
        lng: riderLocation[1]
      });

      // Initialize route history if empty
      if (routeHistoryRef.current.length === 0) {
        routeHistoryRef.current = [{
          lat: riderLocation[0],
          lng: riderLocation[1]
        }];
      }

      // Update route polyline only if there's an active order
      if (selectedRestaurant) {
        updateRoutePolyline();
      } else {
        // Clear any existing polylines if no active order
        if (routePolylineRef.current) {
          routePolylineRef.current.setMap(null);
          routePolylineRef.current = null;
        }
        if (liveTrackingPolylineRef.current) {
          liveTrackingPolylineRef.current.setMap(null);
          liveTrackingPolylineRef.current = null;
        }
        if (liveTrackingPolylineShadowRef.current) {
          liveTrackingPolylineShadowRef.current.setMap(null);
          liveTrackingPolylineShadowRef.current = null;
        }
      }

    } else {
      // Try to get location from localStorage if current location not available
      const savedLocation = localStorage.getItem('deliveryBoyLastLocation')
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation)
          if (parsed && Array.isArray(parsed) && parsed.length === 2) {
            const [lat, lng] = parsed

            // Validate and check for coordinate swap
            if (typeof lat === 'number' && typeof lng === 'number' &&
              lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              const mightBeSwapped = (lat >= 68 && lat <= 98 && lng >= 8 && lng <= 38)

              if (mightBeSwapped) {
                console.warn('⚠️ Saved coordinates might be swapped - correcting:', {
                  original: [lat, lng],
                  corrected: [lng, lat]
                })
                createOrUpdateBikeMarker(lng, lat, null, true)
              } else {
      }
    }
  }, [isOnline, riderLocation, showHomeSections])

  // Safeguard: Ensure bike marker and restaurant marker stay on map (prevent them from disappearing)
  // Always show bike marker regardless of online/offline status
  useEffect(() => {
    if (showHomeSections || !window.deliveryMapInstance) return;

    // Check every 2 seconds if markers are still on map
    const checkInterval = setInterval(() => {
      // Check bike marker
      if (riderLocation && riderLocation.length === 2) {
        if (bikeMarkerRef.current) {
          const markerMap = bikeMarkerRef.current.getMap();
          if (markerMap === null) {
            console.warn('⚠️ Bike marker lost map reference, re-adding...');
            createOrUpdateBikeMarker(riderLocation[0], riderLocation[1], null, false);
          }
        } else {
          // Marker doesn't exist, create it
          console.warn('⚠️ Bike marker missing, creating...');
          createOrUpdateBikeMarker(riderLocation[0], riderLocation[1], null, false);
        }
      }

      // Check restaurant marker
      if (selectedRestaurant && selectedRestaurant.lat && selectedRestaurant.lng) {
        if (restaurantMarkerRef.current) {
          const markerMap = restaurantMarkerRef.current.getMap();
          if (markerMap === null || markerMap !== window.deliveryMapInstance) {
            console.warn('⚠️ Restaurant marker lost map reference, re-adding...');
            const restaurantLocation = {
              lat: selectedRestaurant.lat,
              lng: selectedRestaurant.lng
            };

            restaurantMarkerRef.current.setMap(window.deliveryMapInstance);
            restaurantMarkerRef.current.setPosition(restaurantLocation);
          }
        } else {
          // Marker doesn't exist, create it
          console.warn('⚠️ Restaurant marker missing, creating...');
          const restaurantLocation = {
            lat: selectedRestaurant.lat,
            lng: selectedRestaurant.lng
          };

          restaurantMarkerRef.current = new window.google.maps.Marker({
            position: restaurantLocation,
            map: window.deliveryMapInstance,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="11" fill="#e53935" stroke="#FFFFFF" stroke-width="2"/>
                  <path d="M8 10c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v6H8v-6z" fill="#FFFFFF"/>
                  <path d="M7 16h10M10 12h4M9 14h6" stroke="#e53935" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M10 8h4v2h-4z" fill="#FFFFFF" opacity="0.7"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(48, 48),
              anchor: new window.google.maps.Point(24, 48)
            },
            title: selectedRestaurant.name || 'Restaurant',
            zIndex: 10
          });
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [riderLocation, selectedRestaurant, showHomeSections])

  // Create restaurant marker when selectedRestaurant changes
  useEffect(() => {
    if (!window.deliveryMapInstance || !selectedRestaurant || !selectedRestaurant.lat || !selectedRestaurant.lng) {
      return;
    }

    // Only create marker if it doesn't exist or is on wrong map
    if (!restaurantMarkerRef.current || restaurantMarkerRef.current.getMap() !== window.deliveryMapInstance) {
      const restaurantLocation = {
        lat: selectedRestaurant.lat,
        lng: selectedRestaurant.lng
      };

      // Remove old marker if exists
      if (restaurantMarkerRef.current) {
        restaurantMarkerRef.current.setMap(null);
      }

      // Create new restaurant marker
      restaurantMarkerRef.current = new window.google.maps.Marker({
        position: restaurantLocation,
        map: window.deliveryMapInstance,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="#e53935" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M8 10c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v6H8v-6z" fill="#FFFFFF"/>
              <path d="M7 16h10M10 12h4M9 14h6" stroke="#e53935" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M10 8h4v2h-4z" fill="#FFFFFF" opacity="0.7"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(48, 48),
          anchor: new window.google.maps.Point(24, 48)
        },
        title: selectedRestaurant.name || 'Restaurant',
        animation: window.google.maps.Animation.DROP,
        zIndex: 10
      });

    } else {
      // Update position if marker exists
      restaurantMarkerRef.current.setPosition({
        lat: selectedRestaurant.lat,
        lng: selectedRestaurant.lng
      });
      restaurantMarkerRef.current.setTitle(selectedRestaurant.name || 'Restaurant');
    }
  }, [selectedRestaurant?.lat, selectedRestaurant?.lng, selectedRestaurant?.name])

  // Calculate route using Google Maps Directions API (Zomato-style road-based routing)
  // Optimized for TWO_WHEELER mode with DRIVING fallback
  // NOTE: Must be defined BEFORE the useEffect that uses it (Rules of Hooks)
  const calculateRouteWithDirectionsAPI = useCallback(async (origin, destination) => {
    if (!window.google || !window.google.maps || !window.google.maps.DirectionsService) {
      console.warn('⚠️ Google Maps Directions API not available');
      return null;
    }

    try {
      // Initialize Directions Service if not already created
      if (!directionsServiceRef.current) {
        directionsServiceRef.current = new window.google.maps.DirectionsService();
      }

      // Try TWO_WHEELER first (optimized for bike/delivery), fallback to DRIVING
      const tryRoute = (travelMode, modeName) => {
        return new Promise((resolve, reject) => {
          directionsServiceRef.current.route(
            {
              origin: { lat: origin[0], lng: origin[1] },
              destination: { lat: destination.lat, lng: destination.lng },
              travelMode: travelMode,
              provideRouteAlternatives: false, // Save API cost - don't get alternatives
              avoidHighways: false,
              avoidTolls: false,
              optimizeWaypoints: false
            },
            (result, status) => {
              if (status === window.google.maps.DirectionsStatus.OK) {
                setDirectionsResponse(result);
                directionsResponseRef.current = result; // Store in ref for callbacks
                resolve(result);
              } else {
                // Handle specific error cases - suppress console errors for REQUEST_DENIED
                if (status === 'REQUEST_DENIED') {
                  // Don't log as error - this is expected when billing is not enabled
                  // Just reject silently to trigger fallback
                  reject(new Error(`Directions API not available: ${status}`));
                } else if (status === 'OVER_QUERY_LIMIT') {
                  console.warn(`⚠️ Directions API quota exceeded (${modeName})`);
                  reject(new Error(`Directions request failed: ${status}`));
                } else {
                  console.warn(`⚠️ Directions API failed with ${modeName}: ${status}`);
                  reject(new Error(`Directions request failed: ${status}`));
                }
              }
            }
          );
        });
      };

      // Try TWO_WHEELER first (if available in region)
      try {
        if (window.google.maps.TravelMode.TWO_WHEELER) {
          return await tryRoute(window.google.maps.TravelMode.TWO_WHEELER, 'TWO_WHEELER');
        }
      } catch (twoWheelerError) {
      }

      // Fallback to DRIVING mode
      return await tryRoute(window.google.maps.TravelMode.DRIVING, 'DRIVING');
    } catch (error) {
      // Handle REQUEST_DENIED and other errors gracefully
      if (error.message?.includes('REQUEST_DENIED') || error.message?.includes('not available')) {
        console.warn('⚠️ Google Maps Directions API not available (billing/API key issue). Will use fallback route.');
      } else {
        console.error('❌ Error calculating route with Directions API:', error);
      }
      return null; // Return null to trigger fallback
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Update live tracking polyline - Rapido/Zomato style
   * Removes polyline points behind the rider and keeps only forward route
   * @param {Object} directionsResult - Google Maps DirectionsResult
   * @param {Array} riderPosition - [lat, lng] Current rider position
   */
  const updateLiveTrackingPolyline = useCallback((directionsResult, riderPosition) => {
    if (!directionsResult || !riderPosition || !window.google || !window.google.maps) {
      return;
    }

    // CRITICAL: Don't create/update polyline if there's no active order
    // This prevents showing default/mock polylines on page refresh
    // But allow it if we're going to restaurant (not customer)
    // Note: We can't use selectedRestaurant directly in callback, so we'll check it in the calling code
    // For now, just proceed - the calling code will handle the checks

    try {
      // Extract and decode full polyline from directions result
      const fullPolyline = extractPolylineFromDirections(directionsResult);

      if (fullPolyline.length < 2) {
        console.warn('⚠️ Invalid polyline from directions result');
        return;
      }

      // Store full polyline for future updates
      fullRoutePolylineRef.current = fullPolyline;

      // Convert rider position to object format
      const riderPos = { lat: riderPosition[0], lng: riderPosition[1] };

      // Find nearest point on polyline to rider
      const { segmentIndex, nearestPoint, distance } = findNearestPointOnPolyline(fullPolyline, riderPos);

      // Trim polyline to remove points behind rider
      const trimmedPolyline = trimPolylineBehindRider(fullPolyline, nearestPoint, segmentIndex);

      // IMPORTANT: Start polyline from bike's actual position, not from nearest point on route
      // This ensures the polyline always starts at the bike's current location
      const path = [
        new window.google.maps.LatLng(riderPos.lat, riderPos.lng), // Start from bike position
        ...trimmedPolyline.map(point =>
          new window.google.maps.LatLng(point.lat, point.lng)
        )
      ];

      // Update or create live tracking polyline with Zomato/Rapido style
      if (liveTrackingPolylineRef.current) {
        // Update existing polyline path smoothly
        liveTrackingPolylineRef.current.setPath(path);
        // Ensure it's on the map
        if (liveTrackingPolylineRef.current.getMap() === null) {
          liveTrackingPolylineRef.current.setMap(window.deliveryMapInstance);
        }
        // Update shadow polyline if it exists
        if (liveTrackingPolylineShadowRef.current) {
          liveTrackingPolylineShadowRef.current.setPath(path);
          if (liveTrackingPolylineShadowRef.current.getMap() === null) {
            liveTrackingPolylineShadowRef.current.setMap(window.deliveryMapInstance);
          }
        }
      } else {
        // Create new polyline with professional Zomato/Rapido styling
        if (!window.deliveryMapInstance) {
          console.warn('⚠️ Cannot create polyline - map instance not ready');
          return;
        }

        // Create main polyline with vibrant blue color (Zomato style)
        liveTrackingPolylineRef.current = new window.google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: '#1E88E5', // Vibrant blue like Zomato (more visible than #4285F4)
          strokeOpacity: 1.0,
          strokeWeight: 6, // Optimal thickness for visibility
          zIndex: 1000, // High z-index to be above other map elements
          icons: [], // No icons/dots - clean solid line
          map: window.deliveryMapInstance
        });

        // Create shadow/outline polyline for better visibility (like Zomato/Rapido)
        // This creates a subtle outline effect for better contrast
        if (!liveTrackingPolylineShadowRef.current) {
          liveTrackingPolylineShadowRef.current = new window.google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#FFFFFF', // White shadow/outline
            strokeOpacity: 0.6,
            strokeWeight: 10, // Slightly thicker for shadow effect
            zIndex: 999, // Behind main polyline
            icons: [],
            map: window.deliveryMapInstance
          });
        } else {
          liveTrackingPolylineShadowRef.current.setPath(path);
        }

      }

    } catch (error) {
      console.error('❌ Error updating live tracking polyline:', error);
    }
  }, []);

  /**
   * Smoothly animate rider marker to new position with rotation
   * @param {Array} newPosition - [lat, lng] New rider position
   * @param {number} heading - Heading/bearing in degrees (0-360)
   */
  const animateRiderMarker = useCallback((newPosition, heading) => {
    if (!window.google || !window.google.maps || !bikeMarkerRef.current) {
      return;
    }

    const [newLat, newLng] = newPosition;
    const currentPosition = lastRiderPositionRef.current || { lat: newLat, lng: newLng };

    // Cancel any existing animation
    if (markerAnimationCancelRef.current) {
      markerAnimationCancelRef.current();
    }

    // Animate marker smoothly
    const cancelAnimation = animateMarker(
      currentPosition,
      { lat: newLat, lng: newLng },
      500, // 500ms animation duration
      (interpolated) => {
        if (bikeMarkerRef.current) {
          // Update marker position
          bikeMarkerRef.current.setPosition({
            lat: interpolated.lat,
            lng: interpolated.lng
          });

          // Update rotation if heading available
          if (heading !== null && heading !== undefined) {
            getRotatedBikeIcon(heading).then(rotatedIconUrl => {
              if (bikeMarkerRef.current) {
                const currentIcon = bikeMarkerRef.current.getIcon();
                bikeMarkerRef.current.setIcon({
                  url: rotatedIconUrl,
                  scaledSize: currentIcon?.scaledSize || new window.google.maps.Size(60, 60),
                  anchor: currentIcon?.anchor || new window.google.maps.Point(30, 30)
                });
              }
            });
          }
        }
      }
    );

    markerAnimationCancelRef.current = cancelAnimation;
    lastRiderPositionRef.current = { lat: newLat, lng: newLng };
  }, []);

  // Initialize Directions Map with Google Maps Directions API (Zomato-style)
  useEffect(() => {
    if (!showDirectionsMap || !selectedRestaurant) {
      setDirectionsMapLoading(false)
      return
    }

    // Re-initialize if navigation mode changed (restaurant -> customer or vice versa)
    if (directionsMapInstanceRef.current) {
      // Clear existing map to re-initialize with new destination
      directionsMapInstanceRef.current = null;
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (restaurantMarkerRef.current) {
        restaurantMarkerRef.current.setMap(null);
      }
      if (directionsBikeMarkerRef.current) {
        directionsBikeMarkerRef.current.setMap(null);
      }
    }

    const initializeDirectionsMap = async () => {
      if (!window.google || !window.google.maps) {
        console.warn('⚠️ Google Maps API not loaded, waiting...');
        setTimeout(initializeDirectionsMap, 200);
        return;
      }

      if (!directionsMapContainerRef.current) {
        console.warn('⚠️ Directions map container not ready');
        return;
      }

      try {
        setDirectionsMapLoading(true);

        // Get current LIVE location (delivery boy) - prioritize riderLocation which is updated in real-time
        // Use rider location or last known location, don't use default
        const currentLocation = riderLocation || lastLocationRef.current;
        if (!currentLocation) {
          console.warn('⚠️ No location available for navigation')
          return
        }

        // Determine destination based on navigation mode
        let destinationLocation;
        let destinationName;
        if (navigationMode === 'customer' && selectedRestaurant.customerLat && selectedRestaurant.customerLng) {
          destinationLocation = {
            lat: selectedRestaurant.customerLat,
            lng: selectedRestaurant.customerLng
          };
          destinationName = selectedRestaurant.customerName || 'Customer';
        } else {
          destinationLocation = {
            lat: selectedRestaurant.lat,
            lng: selectedRestaurant.lng
          };
          destinationName = selectedRestaurant.name || 'Restaurant';
        }


        // Create map instance
        const map = new window.google.maps.Map(directionsMapContainerRef.current, {
          center: { lat: currentLocation[0], lng: currentLocation[1] },
          zoom: 18,
          minZoom: 10, // Minimum zoom level (city/area view)
          maxZoom: 21, // Maximum zoom level - allow full zoom
          mapTypeId: window.google.maps.MapTypeId.ROADMAP || 'roadmap',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });

        directionsMapInstanceRef.current = map;

        // Initialize Directions Service
        if (!directionsServiceRef.current) {
          directionsServiceRef.current = new window.google.maps.DirectionsService();
        }

        // Initialize Directions Renderer
        if (!directionsRendererRef.current) {
          // Don't create DirectionsRenderer with map - it adds dots
          // We'll extract route path and use custom polyline instead
          directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#4285F4',
              strokeWeight: 0,
              strokeOpacity: 0,
              zIndex: -1,
              icons: []
            },
            preserveViewport: true
          });
          // Explicitly don't set map - we use custom polyline instead
        } else {
          // Don't set map - we use custom polyline instead
          // directionsRendererRef.current.setMap(map);
        }

        // Calculate route using Directions API
        const routeResult = await calculateRouteWithDirectionsAPI(currentLocation, destinationLocation);

        if (routeResult) {
          // Don't create main route polyline - only live tracking polyline will be shown
          // Remove old custom polyline if exists (cleanup)
          try {
            if (routePolylineRef.current) {
              routePolylineRef.current.setMap(null);
              routePolylineRef.current = null;
            }

            // Remove DirectionsRenderer from map
            if (directionsRendererRef.current) {
              directionsRendererRef.current.setMap(null);
            }
          } catch (e) {
            console.warn('⚠️ Error cleaning up polyline:', e);
          }

          // Fit bounds to show entire route
          const bounds = routeResult.routes[0].bounds;
          if (bounds) {
            map.fitBounds(bounds, { padding: 50 });
          }

          // Add custom Destination Marker (Restaurant or Customer)
          const markerIcon = navigationMode === 'customer'
            ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#e53935">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/>
                  <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
                </svg>
              `)}`
            : `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#e53935">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/>
                  <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
                  <path d="M8 16h2v6H8zm6 0h2v6h-2z" fill="#FFFFFF"/>
                </svg>
              `)}`;

          if (!restaurantMarkerRef.current) {
            restaurantMarkerRef.current = new window.google.maps.Marker({
              position: destinationLocation,
              map: map,
              icon: {
                url: markerIcon,
                scaledSize: new window.google.maps.Size(48, 48),
                anchor: new window.google.maps.Point(24, 48)
              },
              title: destinationName,
              animation: window.google.maps.Animation.DROP
            });
          } else {
            restaurantMarkerRef.current.setPosition(destinationLocation);
            restaurantMarkerRef.current.setIcon({
              url: markerIcon,
              scaledSize: new window.google.maps.Size(48, 48),
              anchor: new window.google.maps.Point(24, 48)
            });
            restaurantMarkerRef.current.setTitle(destinationName);
            restaurantMarkerRef.current.setMap(map);
          }

          // Add custom Bike Marker (Delivery Boy)
          if (!directionsBikeMarkerRef.current) {
            directionsBikeMarkerRef.current = new window.google.maps.Marker({
              position: { lat: currentLocation[0], lng: currentLocation[1] },
              map: map,
              icon: {
                url: bikeLogo,
                scaledSize: new window.google.maps.Size(50, 50),
                anchor: new window.google.maps.Point(25, 25)
              },
              title: 'Your Location',
              zIndex: 100 // Bike marker should be on top
            });
          } else {
            directionsBikeMarkerRef.current.setPosition({ lat: currentLocation[0], lng: currentLocation[1] });
            directionsBikeMarkerRef.current.setMap(map);
          }

        } else {
          console.warn('⚠️ Failed to calculate route, using fallback polyline');
          // Fallback to simple polyline if Directions API fails
          if (routePolyline && routePolyline.length > 0) {
            updateRoutePolyline();
          }
        }

        setDirectionsMapLoading(false);
      } catch (error) {
        console.error('❌ Error initializing directions map:', error);
        console.error('❌ Error stack:', error.stack);
        setDirectionsMapLoading(false);
        // Don't crash - show error message instead
        try {
          // Fallback to simple polyline
          if (routePolyline && routePolyline.length > 0) {
            updateRoutePolyline();
          }
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
        }
      }
    };

    initializeDirectionsMap();

    // Cleanup function - only cleanup when showDirectionsMap becomes false
    return () => {
      if (!showDirectionsMap) {
        // Clean up directions renderer when map is closed
        try {
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
          }
          if (restaurantMarkerRef.current) {
            restaurantMarkerRef.current.setMap(null);
          }
          if (directionsBikeMarkerRef.current) {
            directionsBikeMarkerRef.current.setMap(null);
          }
          directionsMapInstanceRef.current = null;
        } catch (cleanupError) {
          console.error('❌ Error during cleanup:', cleanupError);
        }
      }
    };
    // Only re-initialize if showDirectionsMap, selectedRestaurant.id, or navigationMode changes
    // Don't include calculateRouteWithDirectionsAPI to prevent unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDirectionsMap, selectedRestaurant?.id, navigationMode, selectedRestaurant?.customerLat, selectedRestaurant?.customerLng, riderLocation])

  // Helper function to calculate distance in meters (Haversine formula)
  const calculateDistanceInMeters = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }, []);

  // Update bike marker position on directions map when rider location changes
  // Optimized: Only update marker position, don't recalculate route (saves API cost)
  useEffect(() => {
    if (!showDirectionsMap || !directionsMapInstanceRef.current || !directionsBikeMarkerRef.current) {
      return;
    }

    if (riderLocation && riderLocation.length === 2) {
      const newPosition = { lat: riderLocation[0], lng: riderLocation[1] };

      // Update bike marker position (smooth movement)
      directionsBikeMarkerRef.current.setPosition(newPosition);

      // Optional: Auto-center map on bike (like Zomato) - smooth pan
      // Uncomment if you want map to follow bike movement
      // directionsMapInstanceRef.current.panTo(newPosition);

      // API Cost Optimization: Only recalculate route if bike deviates significantly (>50m from route)
      // This prevents unnecessary API calls on every location update
      if (lastBikePositionRef.current) {
        const distance = calculateDistanceInMeters(
          lastBikePositionRef.current.lat,
          lastBikePositionRef.current.lng,
          newPosition.lat,
          newPosition.lng
        );

        // Only recalculate if moved >50 meters AND last recalculation was >30 seconds ago
        const timeSinceLastRecalc = Date.now() - (lastRouteRecalculationRef.current || 0);
        if (distance > 50 && timeSinceLastRecalc > 30000 && selectedRestaurant) {
          lastRouteRecalculationRef.current = Date.now();
          calculateRouteWithDirectionsAPI(
            [newPosition.lat, newPosition.lng],
            { lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }
          ).then(result => {
            if (result && result.routes && result.routes[0]) {
              // Extract route and create custom polyline (don't use DirectionsRenderer - it adds dots)
              try {
                const route = result.routes[0];
                if (route && route.overview_path && window.deliveryMapInstance) {
                  // Don't create main route polyline - only live tracking polyline will be shown
                  // Remove old custom polyline if exists (cleanup)
                  if (routePolylineRef.current) {
                    routePolylineRef.current.setMap(null);
                    routePolylineRef.current = null;
                  }

                  // Remove DirectionsRenderer from map
                  if (directionsRendererRef.current) {
                    directionsRendererRef.current.setMap(null);
                  }
                }
              } catch (e) {
                console.warn('⚠️ Could not create custom polyline:', e);
              }
            }
          }).catch(err => {
            // Handle REQUEST_DENIED gracefully - don't spam console
            if (err.message?.includes('REQUEST_DENIED') || err.message?.includes('not available')) {
            } else {
              console.warn('⚠️ Route recalculation failed:', err);
            }
          });
        }
      }

      lastBikePositionRef.current = newPosition;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDirectionsMap, riderLocation, selectedRestaurant?.id, calculateDistanceInMeters])

  // Handle route polyline visibility and updates
  // Always use custom polyline (DirectionsRenderer is never active - it adds dots)
  useEffect(() => {
    // DirectionsRenderer is never used - we always use custom polyline
    // Remove DirectionsRenderer if it somehow got attached
    if (directionsRendererRef.current && directionsRendererRef.current.getMap()) {
      directionsRendererRef.current.setMap(null);
    }

    // Only show fallback polyline if DirectionsRenderer is NOT active
    if (routePolyline && routePolyline.length > 0 && window.deliveryMapInstance) {
      updateRoutePolyline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePolyline?.length, directionsResponse])

  // Handle directionsResponse updates - Show route on main map when directions are calculated
  useEffect(() => {
    // Only show route if there's an active order (selectedRestaurant)
    if (!selectedRestaurant) {
      // Clear route if no active order
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      return;
    }

    if (!directionsResponse || !directionsResponse.routes || directionsResponse.routes.length === 0) {
      return;
    }

    if (!window.deliveryMapInstance || !window.google || !window.google.maps) {
      console.warn('⚠️ Map not ready for directions display');
      return;
    }


    // Clear any existing fallback polyline to avoid conflicts
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    // Initialize DirectionsRenderer for main map if not exists
    if (!directionsRendererRef.current) {
      // Don't create DirectionsRenderer with map - it adds dots
      // We'll extract route path and use custom polyline instead
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        suppressInfoWindows: false,
        polylineOptions: {
          strokeColor: '#4285F4',
          strokeWeight: 0,
          strokeOpacity: 0,
          zIndex: -1,
          icons: []
        },
        markerOptions: {
          visible: false
        },
        preserveViewport: true
      });
      // Explicitly don't set map - we use custom polyline instead

      // Ensure it's visible by explicitly setting map
      directionsRendererRef.current.setMap(window.deliveryMapInstance);
    } else {
      // Ensure renderer is attached to main map
      directionsRendererRef.current.setMap(window.deliveryMapInstance);
      // Update polyline options to ensure visibility and suppress markers
      directionsRendererRef.current.setOptions({
        suppressMarkers: true, // Hide default markers including car icon
        suppressInfoWindows: false,
        polylineOptions: {
          strokeColor: '#4285F4', // Bright blue like Zomato
          strokeWeight: 0, // Completely hide DirectionsRenderer polyline (has dots)
          strokeOpacity: 0, // Hide completely
          zIndex: -1, // Put behind everything
          icons: [] // No custom icons
        },
        markerOptions: {
          visible: false // Explicitly hide all markers
        },
        preserveViewport: true
      });
    }

    // Set directions response to renderer
    try {
      // Validate directionsResponse is a valid DirectionsResult object
      if (!directionsResponse || typeof directionsResponse !== 'object' || !directionsResponse.routes || !Array.isArray(directionsResponse.routes) || directionsResponse.routes.length === 0) {
        console.error('❌ Invalid directionsResponse:', directionsResponse);
        return;
      }

      // Validate it's a Google Maps DirectionsResult (has status property)
      if (!directionsResponse.request || !directionsResponse.routes[0]?.legs) {
        console.error('❌ directionsResponse is not a valid Google Maps DirectionsResult');
        return;
      }

      // Clear any existing polyline first to ensure clean render
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }

      // Extract route path and create custom clean polyline without dots
      // Don't use DirectionsRenderer on map - it adds dots/icons
      try {
        const route = directionsResponse.routes[0];
        if (route && route.overview_path) {
          // Don't create main route polyline - only live tracking polyline will be shown
          // Remove old custom polyline if exists (cleanup)
          if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
          }


          // Completely remove DirectionsRenderer from map to prevent any dots/icons
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not create custom polyline:', e);
      }

      // Fit bounds to show entire route - but preserve zoom if user has zoomed in
      const bounds = directionsResponse.routes[0].bounds;
      if (bounds) {
        const currentZoomBeforeFit = window.deliveryMapInstance.getZoom();
        window.deliveryMapInstance.fitBounds(bounds, { padding: 100 });
        // Preserve zoom if user had zoomed in more than fitBounds would set
        setTimeout(() => {
          const newZoom = window.deliveryMapInstance.getZoom();
          if (currentZoomBeforeFit > newZoom && currentZoomBeforeFit >= 18) {
            window.deliveryMapInstance.setZoom(currentZoomBeforeFit);
          }
        }, 100);
      }

      // Ensure DirectionsRenderer is removed from map (we use custom polyline instead)
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    } catch (error) {
      console.error('❌ Error setting directions on renderer:', error);
      console.error('❌ directionsResponse type:', typeof directionsResponse);
      console.error('❌ directionsResponse:', directionsResponse);
    }
  }, [directionsResponse, selectedRestaurant])

  // Restore active order from localStorage on page load/refresh
  useEffect(() => {
    const restoreActiveOrder = async () => {
      try {
        const savedOrder = localStorage.getItem('deliveryActiveOrder');
        if (!savedOrder) {
          return;
        }

        const activeOrderData = JSON.parse(savedOrder);

        // Get order ID from saved data
        const orderId = activeOrderData.orderId || activeOrderData.restaurantInfo?.id || activeOrderData.restaurantInfo?.orderId;

        if (!orderId) {
          localStorage.removeItem('deliveryActiveOrder');
          setSelectedRestaurant(null);
          return;
        }

        // Verify order still exists in database before restoring
        try {
          const orderResponse = await deliveryAPI.getOrderDetails(orderId);

          if (!orderResponse.data?.success || !orderResponse.data?.data) {
            localStorage.removeItem('deliveryActiveOrder');
            setSelectedRestaurant(null);
            return;
          }

          // Correctly extract order object from API response
          // The controller returns { order: ... } inside data
          const remoteOrder = orderResponse.data?.data?.order || orderResponse.data?.order || orderResponse.data?.data;

          if (remoteOrder) {
            const status = remoteOrder.status;
            // Check if order is cancelled or delivered using the fresh data
            if (status === 'cancelled' || status === 'delivered') {
              localStorage.removeItem('deliveryActiveOrder');
              setSelectedRestaurant(null);
              return;
            }

            // Update activeOrderData with fresh info (e.g., digitalBillHtml)
            if (remoteOrder.digitalBillHtml && activeOrderData.restaurantInfo) {
              activeOrderData.restaurantInfo.digitalBillHtml = remoteOrder.digitalBillHtml;
              // Also update localStorage to persist this
              localStorage.setItem('deliveryActiveOrder', JSON.stringify(activeOrderData));
            }
          }

        } catch (verifyError) {
          // If order doesn't exist (404) or any other error, clear localStorage
          if (verifyError.response?.status === 404 || verifyError.response?.status === 403) {
            localStorage.removeItem('deliveryActiveOrder');
            setSelectedRestaurant(null);
            return;
          }
          // For other errors (network, etc.), still try to restore but log warning
          console.warn('⚠️ Could not verify order, but restoring anyway:', verifyError.message);
        }

        // Check if order is still valid (not too old - e.g., within 24 hours)
        const acceptedAt = new Date(activeOrderData.acceptedAt);
        const hoursSinceAccepted = (Date.now() - acceptedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceAccepted > 24) {
          localStorage.removeItem('deliveryActiveOrder');
          setSelectedRestaurant(null);
          return;
        }

        // Restore selectedRestaurant state
        if (activeOrderData.restaurantInfo) {
          setSelectedRestaurant(activeOrderData.restaurantInfo);
        }

        // Wait for map to be ready
        const waitForMap = () => {
          if (!window.deliveryMapInstance || !window.google || !window.google.maps) {
            setTimeout(waitForMap, 200);
            return;
          }


          // Recalculate route using Directions API (preferred) or use saved coordinates (fallback)
          // Don't restore directionsResponse from localStorage - Google Maps objects can't be serialized
          if (activeOrderData.restaurantInfo && activeOrderData.restaurantInfo.lat && activeOrderData.restaurantInfo.lng && riderLocation && riderLocation.length === 2) {
            // Try to recalculate with Directions API first (if flag indicates we had Directions API before)
            if (activeOrderData.hasDirectionsAPI) {
              calculateRouteWithDirectionsAPI(
                riderLocation,
                { lat: activeOrderData.restaurantInfo.lat, lng: activeOrderData.restaurantInfo.lng }
              ).then(result => {
                if (result && result.routes && result.routes.length > 0) {
                  setDirectionsResponse(result);
                  directionsResponseRef.current = result; // Store in ref for callbacks

                  // Initialize live tracking polyline for restored route
                  if (riderLocation && riderLocation.length === 2) {
                    updateLiveTrackingPolyline(result, riderLocation);
                  }
                } else {
                  // Fallback to coordinates if Directions API fails
                  if (activeOrderData.routeCoordinates && activeOrderData.routeCoordinates.length > 0) {
                    setRoutePolyline(activeOrderData.routeCoordinates);
                  }
                }
              }).catch(err => {
                console.error('❌ Error recalculating route with Directions API:', err);
                // Fallback to coordinates
                if (activeOrderData.routeCoordinates && activeOrderData.routeCoordinates.length > 0) {
                  setRoutePolyline(activeOrderData.routeCoordinates);
                }
              });
            } else if (activeOrderData.routeCoordinates && activeOrderData.routeCoordinates.length > 0) {
              // Use saved coordinates if we don't have Directions API flag
              setRoutePolyline(activeOrderData.routeCoordinates);
            }
          } else if (activeOrderData.routeCoordinates && activeOrderData.routeCoordinates.length > 0) {
            // Fallback: Use coordinates if restaurant info or rider location not available
            setRoutePolyline(activeOrderData.routeCoordinates);
          }
        };

        waitForMap();
      } catch (error) {
        console.error('❌ Error restoring active order:', error);
        // Clear localStorage and state if there's an error
        localStorage.removeItem('deliveryActiveOrder');
        setSelectedRestaurant(null);
        setShowReachedDropPopup(false);
        setShowOrderDeliveredAnimation(false);
        setShowCustomerReviewPopup(false);
        setShowPaymentPage(false);
      }
    };

    restoreActiveOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only on mount - calculateRouteWithDirectionsAPI is stable

  // Ensure polyline is displayed when map becomes ready and there's an active route
  useEffect(() => {
    if (!selectedRestaurant || !window.deliveryMapInstance || !window.google || !window.google.maps) {
      return;
    }

    const currentDirectionsResponse = directionsResponseRef.current;
    const currentRiderLocation = riderLocation || lastLocationRef.current;

    // If we have a directions response and rider location, but no polyline, create it
    if (currentDirectionsResponse &&
      currentDirectionsResponse.routes &&
      currentDirectionsResponse.routes.length > 0 &&
      currentRiderLocation &&
      currentRiderLocation.length === 2 &&
      !liveTrackingPolylineRef.current) {
      updateLiveTrackingPolyline(currentDirectionsResponse, currentRiderLocation);
    } else if (currentDirectionsResponse &&
      currentRiderLocation &&
      liveTrackingPolylineRef.current &&
      liveTrackingPolylineRef.current.getMap() === null) {
      // Polyline exists but not on map - reattach it
      liveTrackingPolylineRef.current.setMap(window.deliveryMapInstance);
      // Also reattach shadow polyline if it exists
      if (liveTrackingPolylineShadowRef.current) {
        liveTrackingPolylineShadowRef.current.setMap(window.deliveryMapInstance);
      }
    }
  }, [selectedRestaurant, riderLocation, updateLiveTrackingPolyline]);

  // Clear any default/mock routes on mount if there's no active order
  useEffect(() => {
    // Clear immediately on mount if no active order
    if (!selectedRestaurant && window.deliveryMapInstance) {
      // Clear route polyline
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      // Clear live tracking polyline (customer route)
      if (liveTrackingPolylineRef.current) {
        liveTrackingPolylineRef.current.setMap(null);
        liveTrackingPolylineRef.current = null;
      }
      // Clear directions renderer
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      // Clear full route polyline ref
      fullRoutePolylineRef.current = [];
      // Clear route polyline state
      setRoutePolyline([]);
      setDirectionsResponse(null);
      directionsResponseRef.current = null;
      setShowRoutePath(false);
    }

    // Wait a bit for restoreActiveOrder to complete, then check again
    const timer = setTimeout(() => {
      if (!selectedRestaurant && window.deliveryMapInstance) {
        // Clear route polyline
        if (routePolylineRef.current) {
          routePolylineRef.current.setMap(null);
          routePolylineRef.current = null;
        }
        // Clear live tracking polyline (customer route)
        if (liveTrackingPolylineRef.current) {
          liveTrackingPolylineRef.current.setMap(null);
          liveTrackingPolylineRef.current = null;
        }
        if (liveTrackingPolylineShadowRef.current) {
          liveTrackingPolylineShadowRef.current.setMap(null);
          liveTrackingPolylineShadowRef.current = null;
        }
        // Clear directions renderer
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }
        // Clear full route polyline ref
        fullRoutePolylineRef.current = [];
        // Clear route polyline state
        setRoutePolyline([]);
        setDirectionsResponse(null);
        directionsResponseRef.current = null;
        setShowRoutePath(false);
      }
    }, 1000); // Wait 1 second for restoreActiveOrder to complete

    return () => clearTimeout(timer);
  }, [selectedRestaurant])

  // Utility function to clear order data when order is deleted or cancelled
  const handleCallCustomer = useCallback(async () => {
    let customerPhone = selectedRestaurant?.customerPhone ||
      selectedRestaurant?.customer?.phone ||
      selectedRestaurant?.userId?.phone ||
      null

    if (!customerPhone && selectedRestaurant?.orderId) {
      try {
        const response = await deliveryAPI.getOrderDetails(selectedRestaurant.orderId || selectedRestaurant.id)
        const order = response?.data?.data?.order || response?.data?.order || response?.data?.data || null
        customerPhone = order?.customerPhone || order?.userId?.phone || order?.customer?.phone || null

        if (customerPhone) {
          setSelectedRestaurant(prev => prev ? ({
            ...prev,
            customerPhone,
            customerName: prev.customerName || order?.userId?.name || prev.customerName,
            customerAddress: prev.customerAddress || order?.address?.formattedAddress || prev.customerAddress
          }) : prev)
        }
      } catch (error) {
        console.error('❌ [CUSTOMER CALL] Error fetching order details:', error)
      }
    }

    if (!customerPhone) {
      toast.error('Customer phone number not available.')
      return
    }

    const cleanPhone = String(customerPhone).replace(/[^\d+]/g, '')
    window.location.href = `tel:${cleanPhone}`
  }, [selectedRestaurant])

  const clearOrderData = useCallback(() => {
    localStorage.removeItem('deliveryActiveOrder');
    setSelectedRestaurant(null);
    setShowReachedDropPopup(false);
    setShowOrderDeliveredAnimation(false);
    setShowCustomerReviewPopup(false);
    setShowPaymentPage(false);
    setShowNewOrderPopup(false);
    setShowreachedPickupPopup(false);
    setShowOrderIdConfirmationPopup(false);
    clearNewOrder();
    clearOrderReady();
    // Clear accepted orders list when going offline
    acceptedOrderIdsRef.current.clear();
    // Clear route polyline and directions response when order is cleared
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
    setDirectionsResponse(null);
    directionsResponseRef.current = null;
    setRoutePolyline([]);
    setShowRoutePath(false);
  }, [clearNewOrder, clearOrderReady])

  // Periodically verify order still exists (every 30 seconds) to catch deletions
  useEffect(() => {
    if (!selectedRestaurant?.id && !selectedRestaurant?.orderId) {
      return; // No active order to verify
    }

    const orderId = selectedRestaurant.orderId || selectedRestaurant.id;

    const verifyOrderInterval = setInterval(async () => {
      try {
        const orderResponse = await deliveryAPI.getOrderDetails(orderId);

        if (!orderResponse.data?.success || !orderResponse.data?.data) {
          clearOrderData();
          return;
        }

        const order = orderResponse.data.data;

        // Check if order is cancelled, deleted, or delivered/completed
        if (order.status === 'cancelled') {
          clearOrderData();
          return;
        }

        // Check if order is delivered/completed - clear it from UI
        const isOrderDelivered = order.status === 'delivered' ||
          order.status === 'completed' ||
          order.deliveryState?.currentPhase === 'completed' ||
          order.deliveryState?.status === 'delivered'

        if (isOrderDelivered && !showPaymentPage && !showCustomerReviewPopup && !showOrderDeliveredAnimation) {
          clearOrderData();
          return;
        }

        // Update order status if it changed
        if (order.status && order.status !== selectedRestaurant.orderStatus) {
          setSelectedRestaurant(prev => ({
            ...prev,
            orderStatus: order.status,
            status: order.status,
            deliveryPhase: order.deliveryState?.currentPhase || prev?.deliveryPhase,
            deliveryState: order.deliveryState || prev?.deliveryState
          }));
        }
      } catch (error) {
        if (error.response?.status === 404 || error.response?.status === 403) {
          clearOrderData();
        }
        // Ignore other errors (network issues, etc.)
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(verifyOrderInterval);
    };
  }, [selectedRestaurant?.id, selectedRestaurant?.orderId, clearOrderData])

  // Handle route polyline visibility toggle
  // Only show fallback polyline if DirectionsRenderer is NOT active
  useEffect(() => {
    // Only show route if there's an active order (selectedRestaurant)
    if (!selectedRestaurant) {
      // Clear route if no active order
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      if (directionsRendererRef.current && directionsRendererRef.current.getMap()) {
        directionsRendererRef.current.setMap(null);
      }
      return;
    }

    // DirectionsRenderer is never used - we always use custom polyline
    // Remove DirectionsRenderer if it somehow got attached
    if (directionsRendererRef.current && directionsRendererRef.current.getMap()) {
      directionsRendererRef.current.setMap(null);
    }

    // Always use custom polyline (DirectionsRenderer is never active - it adds dots)
    if (routePolylineRef.current) {
      if (showRoutePath && routeHistoryRef.current.length >= 2) {
        routePolylineRef.current.setMap(window.deliveryMapInstance);
      } else if (routePolyline && routePolyline.length > 0) {
        // Show route polyline if we have route data (from order acceptance)
        routePolylineRef.current.setMap(window.deliveryMapInstance);
      } else {
        routePolylineRef.current.setMap(null);
      }
    }
  }, [showRoutePath, routePolyline, directionsResponse, selectedRestaurant])

  // Listen for order ready event from backend (when restaurant marks order ready)
  useEffect(() => {
    if (!orderReady) return
    const deliveryPhase = selectedRestaurant?.deliveryPhase || selectedRestaurant?.deliveryState?.currentPhase || '';

    // Check if order is picked up or out for delivery
    const isPickedUp = orderStatus === 'out_for_delivery' ||
      orderStatus === 'picked_up' ||
      deliveryPhase === 'en_route_to_delivery' ||
      deliveryPhase === 'picked_up';

    // Check if we have customer location
    const hasCustomerLocation = selectedRestaurant?.customerLat && selectedRestaurant?.customerLng;

    // Only switch route if order is picked up and we have customer location
    if (isPickedUp && hasCustomerLocation && riderLocation && riderLocation.length === 2) {
      // Check if we already have a route to customer (avoid recalculating unnecessarily)
      const currentDirections = directionsResponseRef.current;
      const needsCustomerRoute = !currentDirections ||
        !currentDirections.routes ||
        currentDirections.routes.length === 0;

      if (needsCustomerRoute) {

        // Calculate route from current location to customer
        calculateRouteWithDirectionsAPI(
          riderLocation,
          { lat: selectedRestaurant.customerLat, lng: selectedRestaurant.customerLng }
        ).then(directionsResult => {
          if (directionsResult) {
            setDirectionsResponse(directionsResult);
            directionsResponseRef.current = directionsResult;

            // Show polyline for customer route - update live tracking polyline with new route
            if (riderLocation && window.deliveryMapInstance) {
              // Update live tracking polyline with route to customer (Restaurant → Customer)
              updateLiveTrackingPolyline(directionsResult, riderLocation);
            } else {
              // Wait for map to be ready
              setTimeout(() => {
                if (riderLocation && window.deliveryMapInstance) {
                  updateLiveTrackingPolyline(directionsResult, riderLocation);
                }
              }, 500);
            }

            // Clean up old fallback polyline if exists
            if (window.deliveryMapInstance) {
              try {
                if (routePolylineRef.current) {
                  routePolylineRef.current.setMap(null);
                  routePolylineRef.current = null;
                }

                // Remove DirectionsRenderer from map (we use custom polyline instead)
                if (directionsRendererRef.current) {
                  directionsRendererRef.current.setMap(null);
                }
              } catch (e) {
                console.warn('⚠️ Error cleaning up old polyline:', e);
              }

              // Fit map bounds to show entire route
              const bounds = directionsResult.routes[0].bounds;
              if (bounds) {
                const currentZoomBeforeFit = window.deliveryMapInstance.getZoom();
                window.deliveryMapInstance.fitBounds(bounds, { padding: 100 });
                // Preserve zoom if user had zoomed in
                setTimeout(() => {
                  const newZoom = window.deliveryMapInstance.getZoom();
                  if (currentZoomBeforeFit > newZoom && currentZoomBeforeFit >= 18) {
                    window.deliveryMapInstance.setZoom(currentZoomBeforeFit);
                  }
                }, 100);
              }
            }
          }
        }).catch(error => {
          console.warn('⚠️ Error calculating route to customer after pickup:', error);
        });
      }
    }
  }, [
    selectedRestaurant?.orderStatus,
    selectedRestaurant?.status,
    selectedRestaurant?.deliveryPhase,
    selectedRestaurant?.deliveryState?.currentPhase,
    selectedRestaurant?.customerLat,
    selectedRestaurant?.customerLng,
    riderLocation,
    calculateRouteWithDirectionsAPI,
    updateLiveTrackingPolyline
  ]);

  // When out_for_delivery but customerLat/customerLng missing, fetch order details and set them
  useEffect(() => {
    if (!selectedRestaurant) {
      fetchedOrderDetailsForDropRef.current = null
      return
    }
    const orderStatus = selectedRestaurant?.orderStatus || selectedRestaurant?.status || ''
    const deliveryPhase = selectedRestaurant?.deliveryPhase || selectedRestaurant?.deliveryState?.currentPhase || ''
    const isOutForDelivery = orderStatus === 'out_for_delivery' || deliveryPhase === 'en_route_to_delivery'
    const hasCustomerCoords = selectedRestaurant?.customerLat != null && selectedRestaurant?.customerLng != null &&
      !(selectedRestaurant.customerLat === 0 && selectedRestaurant.customerLng === 0)
    const orderId = selectedRestaurant?.orderId || selectedRestaurant?.id

    if (!isOutForDelivery || hasCustomerCoords || !orderId || fetchedOrderDetailsForDropRef.current === orderId) return

    fetchedOrderDetailsForDropRef.current = orderId
    deliveryAPI.getOrderDetails(orderId)
      .then(res => {
        const order = res.data?.data?.order || res.data?.order
        const coords = order?.address?.location?.coordinates
        const lat = coords?.[1]
        const lng = coords?.[0]
        if (lat != null && lng != null && !(lat === 0 && lng === 0) && selectedRestaurant) {
          setSelectedRestaurant(prev => prev ? { ...prev, customerLat: lat, customerLng: lng } : null)
 only log when we're otherwise ready to monitor
      if (isOutForDelivery && !isDeliveredOrCompleted && selectedRestaurant) {
        console.warn('[Reached Drop] Customer location missing. Ensure order has delivery address or wait for fetch.')
      }
      return
    }
    if (!riderPos) {

  // Function to rotate bike logo image based on heading
  const getRotatedBikeIcon = (heading = 0) => {
    // Round heading to nearest 5 degrees for caching
    const roundedHeading = Math.round(heading / 5) * 5;
    const cacheKey = `${roundedHeading}`;

    // Check cache first
    if (rotatedIconCache.current.has(cacheKey)) {
      return Promise.resolve(rotatedIconCache.current.get(cacheKey));
    }

    return new Promise((resolve) => {
      const img = new Image();
      // Don't set crossOrigin for local images - it causes CORS issues
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 60; // Icon size
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          // Clear canvas
          ctx.clearRect(0, 0, size, size);

          // Move to center, rotate, then draw image
          ctx.save();
          ctx.translate(size / 2, size / 2);
          ctx.rotate((roundedHeading * Math.PI) / 180); // Convert degrees to radians
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();

          // Get data URL and cache it
          const dataUrl = canvas.toDataURL();
          rotatedIconCache.current.set(cacheKey, dataUrl);
          resolve(dataUrl);
        } catch (error) {
          console.warn('⚠️ Error rotating bike icon:', error);
          // Fallback to original image if rotation fails
          resolve(bikeLogo);
        }
      };
      img.onerror = () => {
        console.warn('⚠️ Bike logo image failed to load:', bikeLogo);
        // Fallback to original image if loading fails
        resolve(bikeLogo);
      };
      img.src = bikeLogo;

      // If image is already loaded (cached), resolve immediately
      if (img.complete) {
        // Image already loaded, process it
        img.onload();
      }
    });
  };

  // Google Maps marker functions - Zomato style exact location tracking
  const createOrUpdateBikeMarker = async (latitude, longitude, heading = null, shouldCenterMap = true) => {
    if (!window.google || !window.google.maps || !window.deliveryMapInstance) {
      console.warn("⚠️ Google Maps not available");
      return;
    }

    const position = new window.google.maps.LatLng(latitude, longitude);
    const map = window.deliveryMapInstance;

    // Get rotated icon URL
    const rotatedIconUrl = await getRotatedBikeIcon(heading || 0);

    if (!bikeMarkerRef.current) {
      // Create bike marker with rotated icon - exact position
      const bikeIcon = {
        url: rotatedIconUrl,
        scaledSize: new window.google.maps.Size(60, 60), // Larger size for better visibility
        anchor: new window.google.maps.Point(30, 30) // Center point
      };

      bikeMarkerRef.current = new window.google.maps.Marker({
        position: position,
        map: map,
        icon: bikeIcon,
        optimized: false, // Disable optimization for exact positioning
        animation: window.google.maps.Animation.DROP, // Drop animation on first appearance
        zIndex: 1000 // High z-index to ensure it's above other markers
      });


      // Center map on bike location initially - preserve current zoom if user has zoomed in
      if (shouldCenterMap) {
        const currentZoom = map.getZoom();
        map.setCenter(position);
        // Only set zoom to 18 if current zoom is less than 18 (don't reduce user's zoom)
        if (currentZoom < 18) {
          map.setZoom(18); // Full zoom in for better visibility
        }
      }

      // Remove animation after drop completes
      setTimeout(() => {
        if (bikeMarkerRef.current) {
          bikeMarkerRef.current.setAnimation(null);
        }
      }, 2000);
    } else {
      // ALWAYS ensure marker is on the map (prevent it from disappearing)
      const currentMap = bikeMarkerRef.current.getMap();
      if (currentMap === null || currentMap !== map) {
        console.warn('⚠️ Bike marker not on correct map, re-adding...', {
          currentMap: currentMap,
          expectedMap: map
        });
        bikeMarkerRef.current.setMap(map);
      }

      // Update position EXACTLY - use setPosition for precise location
      // Verify coordinates are correct before setting

      // Validate coordinates before setting
      if (typeof latitude === 'number' && typeof longitude === 'number' &&
        !isNaN(latitude) && !isNaN(longitude) &&
        latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        bikeMarkerRef.current.setPosition(position);
      } else {
        console.error('❌ Invalid coordinates for bike marker:', { latitude, longitude });
        return; // Don't update if coordinates are invalid
      }

      // Update icon with rotation for smooth movement
      const currentHeading = heading !== null && heading !== undefined ? heading : 0;
      const rotatedIconUrl = await getRotatedBikeIcon(currentHeading);
      const bikeIcon = {
        url: rotatedIconUrl,
        scaledSize: new window.google.maps.Size(60, 60),
        anchor: new window.google.maps.Point(30, 30)
      };
      bikeMarkerRef.current.setIcon(bikeIcon);

      // Ensure z-index is high
      bikeMarkerRef.current.setZIndex(1000);

      // Auto-center map on bike location (like Zomato) - only if user hasn't manually panned
      if (shouldCenterMap && !isUserPanningRef.current) {
        // Smooth pan to bike location
        map.panTo(position);
      }

      // Double-check marker is still on map after update
      if (bikeMarkerRef.current.getMap() === null) {
        console.warn('⚠️ Bike marker lost map reference after update, re-adding...');
        bikeMarkerRef.current.setMap(map);
      }
    }
  }

  // Create or update route polyline (blue line showing traveled path) - LEGACY/FALLBACK
  // Accepts optional coordinates parameter to draw route immediately without waiting for state update
  // This is a FALLBACK polyline - should only be used when DirectionsRenderer is NOT available
  const updateRoutePolyline = (coordinates = null) => {
    // Only show route if there's an active order (selectedRestaurant)
    if (!selectedRestaurant) {
      // Clear route if no active order
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      return;
    }

    // Don't show fallback polyline if DirectionsRenderer is active (it handles road-snapped routes)
    if (directionsRendererRef.current && directionsRendererRef.current.getDirections()) {
      // DirectionsRenderer is active, hide fallback polyline
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      return;
    }

    if (!window.google || !window.google.maps || !window.deliveryMapInstance) {
      console.warn('⚠️ Map not ready for polyline update');
      return;
    }

    const map = window.deliveryMapInstance;

    // Use provided coordinates or fallback to state
    const coordsToUse = coordinates || routePolyline;

    if (coordsToUse && coordsToUse.length > 0) {
      // Convert coordinates to Google Maps LatLng format
      const path = coordsToUse.map(coord => {
        if (Array.isArray(coord) && coord.length >= 2) {
          return new window.google.maps.LatLng(coord[0], coord[1]);
        }
        return null;
      }).filter(coord => coord !== null);

      if (path.length > 0) {
        // Don't create main route polyline - only live tracking polyline will be shown
        // Remove old custom polyline if exists (cleanup)
        if (routePolylineRef.current) {
          routePolylineRef.current.setMap(null);
          routePolylineRef.current = null;
        }

        // Fit map bounds to show entire route - but preserve zoom if user has zoomed in
        if (path.length > 1) {
          const bounds = new window.google.maps.LatLngBounds();
          path.forEach(point => bounds.extend(point));
          // Add padding to bounds for better visibility
          const currentZoomBeforeFit = map.getZoom();
          map.fitBounds(bounds, { padding: 50 });
          // Preserve zoom if user had zoomed in more than fitBounds would set
          setTimeout(() => {
            const newZoom = map.getZoom();
            if (currentZoomBeforeFit > newZoom && currentZoomBeforeFit >= 18) {
              map.setZoom(currentZoomBeforeFit);
            }
          }, 100);
        }
      }
    } else {
      // Hide polyline if no route data
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
    }
  }

  // Removed createOrUpdateBlueDotMarker - not needed, using bike icon instead


  // Bike marker update removed (Ola Maps removed)

  const isValidAddress = (value) => Boolean(
    value &&
    typeof value === 'string' &&
    value.trim() &&
    value !== 'Restaurant Address' &&
    value !== 'Restaurant address' &&
    value !== 'Address'
  )

  const buildAddressFromLocation = (location) => {
    if (!location || typeof location !== 'object') return null
    const parts = [
      location.formattedAddress,
      location.address,
      location.addressLine1,
      location.addressLine2,
      location.street,
      location.area,
      location.city,
      location.state,
      location.pincode || location.zipCode || location.postalCode
    ].filter(Boolean)
    if (!parts.length) return null
    // If formattedAddress/address is already present, prefer it.
    if (location.formattedAddress) return location.formattedAddress
    if (location.address) return location.address
    return parts.join(', ')
  }

  const getRestaurantDisplayAddress = (source) => {
    if (!source || typeof source !== 'object') return null
    const candidates = [
      source.address,
      source.restaurantAddress,
      source.restaurantLocation?.formattedAddress,
      source.restaurantLocation?.address,
      buildAddressFromLocation(source.restaurantLocation),
      source.restaurantId?.address,
      source.restaurantId?.formattedAddress,
      source.restaurantId?.location?.formattedAddress,
      source.restaurantId?.location?.address,
      buildAddressFromLocation(source.restaurantId?.location),
      source.restaurant?.address,
      source.restaurant?.location?.formattedAddress,
      source.restaurant?.location?.address,
      buildAddressFromLocation(source.restaurant?.location),
      buildAddressFromLocation(source.location)
    ]
    return candidates.find(isValidAddress) || null
  }

  const getCustomerDisplayAddress = (source) => {
    if (!source || typeof source !== 'object') return null
    const candidates = [
      source.deliveryAddress?.formattedAddress,
      source.deliveryAddress?.address,
      source.deliveryAddress?.street,
      buildAddressFromLocation(source.deliveryAddress),
      source.deliveryLocation?.formattedAddress,
      source.deliveryLocation?.address,
      source.address?.formattedAddress,
      source.address?.address,
      source.address?.street,
      buildAddressFromLocation(source.address),
      source.customerAddress
    ]
    return candidates.find((value) => Boolean(value && typeof value === 'string' && value.trim())) || null
  }

  const sliderRestaurantAddress = useMemo(() => {
    const selectedRestaurantAddress = getRestaurantDisplayAddress(selectedRestaurant)
    if (isValidAddress(selectedRestaurantAddress)) return selectedRestaurantAddress
    return getRestaurantDisplayAddress(newOrder)
  }, [selectedRestaurant, newOrder])

  // Carousel slides data - fully dynamic, built from real-time state
  const carouselSlides = useMemo(() => {
    const slides = []

    // Slide 1: Bank details not filled → always show as priority
    if (!bankDetailsFilled) {
      slides.push({
        id: 'bank-details',
        title: 'Submit bank details',
        subtitle: 'PAN & bank details required for payouts',
        icon: 'bank',
        buttonText: 'Submit',
        bgColor: 'bg-[#FFC400]',
        action: 'navigate',
        path: '/delivery/profile/details'
      })
    }

    // Slide 2: Cash limit reached → COD orders paused
    if (availableCashLimit <= 0 && walletState?.totalCashLimit > 0) {
      slides.push({
        id: 'cash-limit',
        title: 'Cash limit reached!',
        subtitle: `Deposit ₹${Math.round(walletState?.cashInHand || 0)} to continue receiving COD orders`,
        icon: 'bag',
        buttonText: 'Deposit',
        bgColor: 'bg-[#e53935]',
        titleColor: 'text-white',
        subtitleColor: 'text-white/90',
        buttonBgColor: 'bg-white text-[#e53935]',
        action: 'navigate',
        path: '/delivery/requests'
      })
    }

    // Slide 3: Active earning addon / earnings guarantee offer
    if (activeEarningAddon && (activeEarningAddon.isValid || activeEarningAddon.isUpcoming)) {
      const target = activeEarningAddon.earningAmount || 0
      const orders = activeEarningAddon.requiredOrders || 0
      const current = earningsGuaranteeCurrentEarnings || 0
      const remaining = Math.max(0, target - current)
      slides.push({
        id: 'earning-offer',
        title: `Earn ₹${target} guarantee!`,
        subtitle: orders > 0
          ? `Complete ${orders} orders to earn ₹${target}. ₹${remaining.toFixed(0)} remaining.`
          : `Active earning bonus offer — valid till ${weekEndDate}`,
        icon: 'bag',
        buttonText: 'View',
        bgColor: 'bg-gray-700',
        titleColor: 'text-white',
        subtitleColor: 'text-white/90',
        buttonBgColor: 'bg-gray-600 text-white',
        action: 'none'
      })
    }

    // Slide 4: Today's earnings summary (always shown if > 0 or at least delivery is approved)
    if (deliveryStatus === 'approved' || deliveryStatus === 'active') {
      if (todayEarnings > 0 || todayTrips > 0) {
        slides.push({
          id: 'today-summary',
          title: `Today: ₹${todayEarnings.toFixed(0)} earned`,
          subtitle: `${todayTrips} ${todayTrips === 1 ? 'trip' : 'trips'} completed${todayHoursWorked > 0 ? ` · ${formatHours(todayHoursWorked)} hrs worked` : ''}`,
          icon: 'bank',
          buttonText: 'Details',
          bgColor: 'bg-gray-700',
          titleColor: 'text-white',
          subtitleColor: 'text-white/90',
          buttonBgColor: 'bg-gray-600 text-white',
          action: 'navigate',
          path: '/delivery/my-orders'
        })
      }
    }

    // Slide 5: Pocket balance info
    if (deliveryStatus === 'approved' || deliveryStatus === 'active') {
      const pocketBal = walletState?.pocketBalance ?? walletState?.totalBalance ?? 0
      if (pocketBal > 0) {
        slides.push({
          id: 'pocket-balance',
          title: `Pocket balance: ₹${pocketBal.toFixed(0)}`,
          subtitle: 'Withdraw to your bank account anytime',
          icon: 'bank',
          buttonText: 'Withdraw',
          bgColor: 'bg-[#FFC400]',
          action: 'navigate',
          path: '/delivery/requests'
        })
      }
    }

    // Slide 3.5: Active order / en-route restaurant info
    const activeRestaurantName =
      selectedRestaurant?.name ||
      selectedRestaurant?.restaurantName ||
      newOrder?.restaurantName ||
      null

    const activeRestaurantAddress = sliderRestaurantAddress

    if (activeRestaurantName && activeRestaurantAddress) {
      const orderStatus =
        selectedRestaurant?.orderStatus ||
        selectedRestaurant?.status ||
        newOrder?.status ||
        ''

      const deliveryPhase =
        selectedRestaurant?.deliveryPhase ||
        selectedRestaurant?.deliveryState?.currentPhase ||
        ''

      // Only show while order is active (not delivered/completed)
      const isDelivered =
        orderStatus === 'delivered' ||
        orderStatus === 'completed' ||
        deliveryPhase === 'completed' ||
        deliveryPhase === 'delivered'

      if (!isDelivered) {
        const phaseLabel =
          deliveryPhase === 'en_route_to_pickup' ? 'Heading to pickup' :
            deliveryPhase === 'at_pickup' ? 'At pickup point' :
              deliveryPhase === 'en_route_to_delivery' || deliveryPhase === 'picked_up' ? 'Out for delivery' :
                orderStatus === 'out_for_delivery' ? 'Out for delivery' :
                  orderStatus === 'ready' ? 'Order ready — pick up now' :
                    orderStatus === 'preparing' ? 'Order is being prepared' :
                      'Active order'

        slides.push({
          id: 'active-order',
          title: `${phaseLabel} · ${activeRestaurantName}`,
          subtitle: activeRestaurantAddress,
          icon: 'bag',
          buttonText: 'Navigate',
          bgColor: 'bg-gray-700',
          titleColor: 'text-white',
          subtitleColor: 'text-white/80',
          buttonBgColor: 'bg-gray-600 text-white hover:bg-gray-500',
          action: 'navigate',
          path: '/delivery'
        })
      }
    }

    return slides
  }, [
    bankDetailsFilled,
    availableCashLimit,
    walletState,
    activeEarningAddon,
    earningsGuaranteeCurrentEarnings,
    weekEndDate,
    deliveryStatus,
    todayEarnings,
    todayTrips,
    todayHoursWorked,
    formatHours,
    sliderRestaurantAddress,
    selectedRestaurant,
    newOrder
  ])

  // Auto-rotate carousel
  useEffect(() => {
    // Reset to first slide if current slide is out of bounds
    setCurrentCarouselSlide((prev) => {
      if (prev >= carouselSlides.length) {
        return 0
      }
      return prev
    })

    carouselAutoRotateRef.current = setInterval(() => {
      setCurrentCarouselSlide((prev) => (prev + 1) % carouselSlides.length)
    }, 3000)
    return () => {
      if (carouselAutoRotateRef.current) {
        clearInterval(carouselAutoRotateRef.current)
      }
    }
  }, [carouselSlides])

  // Reset auto-rotate timer after manual swipe
  const resetCarouselAutoRotate = useCallback(() => {
    if (carouselAutoRotateRef.current) {
      clearInterval(carouselAutoRotateRef.current)
    }
    carouselAutoRotateRef.current = setInterval(() => {
      setCurrentCarouselSlide((prev) => (prev + 1) % carouselSlides.length)
    }, 3000)
  }, [carouselSlides.length])

  // Handle carousel swipe touch events
  const carouselStartY = useRef(0)

  const handleCarouselTouchStart = useCallback((e) => {
    carouselIsSwiping.current = true
    carouselStartX.current = e.touches[0].clientX
    carouselStartY.current = e.touches[0].clientY
  }, [])

  const handleCarouselTouchMove = useCallback((e) => {
    if (!carouselIsSwiping.current) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = Math.abs(currentX - carouselStartX.current)
    const deltaY = Math.abs(currentY - carouselStartY.current)

    // Only prevent default if horizontal swipe is dominant
    // Don't call preventDefault - CSS touch-action handles scrolling prevention
    if (deltaX > deltaY && deltaX > 10) {
      // safePreventDefault(e) // Removed to avoid passive listener error
    }
  }, [])

  const handleCarouselTouchEnd = useCallback((e) => {
    if (!carouselIsSwiping.current) return

    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = carouselStartX.current - endX
    const deltaY = Math.abs(carouselStartY.current - endY)
    const threshold = 50 // Minimum swipe distance

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        // Swiped left - go to next slide
        setCurrentCarouselSlide((prev) => (prev + 1) % carouselSlides.length)
      } else {
        // Swiped right - go to previous slide
        setCurrentCarouselSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)
      }
      resetCarouselAutoRotate()
    }

    carouselIsSwiping.current = false
    carouselStartX.current = 0
    carouselStartY.current = 0
  }, [carouselSlides.length, resetCarouselAutoRotate])

  // Handle carousel mouse events for desktop
  const handleCarouselMouseDown = (e) => {
    carouselIsSwiping.current = true
    carouselStartX.current = e.clientX

    const handleMouseMove = (moveEvent) => {
      if (!carouselIsSwiping.current) return
      // Don't call preventDefault - CSS touch-action handles scrolling prevention
      // safePreventDefault(moveEvent) // Removed for consistency (mouse events aren't passive but removed anyway)
    }

    const handleMouseUp = (upEvent) => {
      if (!carouselIsSwiping.current) {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        return
      }

      const endX = upEvent.clientX
      const deltaX = carouselStartX.current - endX
      const threshold = 50

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          // Swiped left - go to next slide
          setCurrentCarouselSlide((prev) => (prev + 1) % carouselSlides.length)
        } else {
          // Swiped right - go to previous slide
          setCurrentCarouselSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)
        }
        resetCarouselAutoRotate()
      }

      carouselIsSwiping.current = false
      carouselStartX.current = 0
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Setup non-passive touch event listeners for carousel to allow preventDefault
  useEffect(() => {
    const carouselElement = carouselRef.current
    if (!carouselElement) return

    // Add event listeners with { passive: false } for touchmove to allow preventDefault
    carouselElement.addEventListener('touchstart', handleCarouselTouchStart, { passive: true })
    carouselElement.addEventListener('touchmove', handleCarouselTouchMove, { passive: false })
    carouselElement.addEventListener('touchend', handleCarouselTouchEnd, { passive: true })

    return () => {
      carouselElement.removeEventListener('touchstart', handleCarouselTouchStart)
      carouselElement.removeEventListener('touchmove', handleCarouselTouchMove)
      carouselElement.removeEventListener('touchend', handleCarouselTouchEnd)
    }
  }, [handleCarouselTouchStart, handleCarouselTouchMove, handleCarouselTouchEnd])

  // Handle swipe bar touch events
  const handleSwipeBarTouchStart = (e) => {
    // Check if touch is on a button or interactive element
    const target = e.target
    const isInteractive = target.closest('button') || target.closest('a') || target.closest('[role="button"]')

    // If touching an interactive element, don't start swipe
    if (isInteractive && !target.closest('[data-swipe-handle]')) {
      return
    }

    // Check if touch is on scrollable content area
    const isOnScrollableContent = target.closest('[ref="homeSectionsScrollRef"]') ||
      target.closest('.overflow-y-auto') ||
      (homeSectionsScrollRef.current && homeSectionsScrollRef.current.contains(target))

    // Check if we're scrolling vs dragging
    if (showHomeSections && homeSectionsScrollRef.current && isOnScrollableContent) {
      const scrollTop = homeSectionsScrollRef.current.scrollTop
      const scrollHeight = homeSectionsScrollRef.current.scrollHeight
      const clientHeight = homeSectionsScrollRef.current.clientHeight
      const isScrollable = scrollHeight > clientHeight

      // If content is scrollable and not at top/bottom, allow scrolling
      if (isScrollable && (scrollTop > 10 || scrollTop < (scrollHeight - clientHeight - 10))) {
        // User is scrolling, not dragging
        isScrollingHomeSections.current = true
        isSwipingBar.current = false
        return
      }
    }

    // Only start swipe if touch is on swipe handle or at top/bottom of scrollable area
    isSwipingBar.current = true
    swipeBarStartY.current = e.touches[0].clientY
    setIsDraggingSwipeBar(true)
    isScrollingHomeSections.current = false
  }

  const handleSwipeBarTouchMove = (e) => {
    if (!isSwipingBar.current) return

    const currentY = e.touches[0].clientY
    const deltaY = swipeBarStartY.current - currentY // Positive = swiping up, Negative = swiping down
    const windowHeight = window.innerHeight

    // Check if user is scrolling content vs dragging swipe bar
    if (showHomeSections && homeSectionsScrollRef.current) {
      const scrollTop = homeSectionsScrollRef.current.scrollTop
      const scrollHeight = homeSectionsScrollRef.current.scrollHeight
      const clientHeight = homeSectionsScrollRef.current.clientHeight
      const isScrollable = scrollHeight > clientHeight

      // If content is scrollable and user is trying to scroll
      if (isScrollable) {
        // Scrolling down (deltaY < 0) - allow scroll if not at top
        if (deltaY < 0 && scrollTop > 0) {
          isScrollingHomeSections.current = true
          isSwipingBar.current = false
          setIsDraggingSwipeBar(false)
          return // Allow native scroll
        }

        // Scrolling up (deltaY > 0) - allow scroll if not at bottom
        if (deltaY > 0 && scrollTop < (scrollHeight - clientHeight - 10)) {
          isScrollingHomeSections.current = true
          isSwipingBar.current = false
          setIsDraggingSwipeBar(false)
          return // Allow native scroll
        }
      }
    }

    // If user was scrolling, don't handle as swipe
    if (isScrollingHomeSections.current) {
      return
    }

    // Only prevent default if we're actually dragging swipe bar (not scrolling)
    // Only prevent if drag is significant enough
    // Don't call preventDefault - CSS touch-action handles scrolling prevention
    if (Math.abs(deltaY) > 10) {
      // safePreventDefault(e) // Removed to avoid passive listener error
    }

    if (showHomeSections) {
      // Currently showing home sections - swiping down should go back to map
      // Calculate position from 1 (top) to 0 (bottom)
      const newPosition = Math.max(0, Math.min(1, 1 + (deltaY / windowHeight)))
      setSwipeBarPosition(newPosition)
    } else {
      // Currently showing map - swiping up should show home sections
      // Calculate position from 0 (bottom) to 1 (top)
      const newPosition = Math.max(0, Math.min(1, deltaY / windowHeight))
      setSwipeBarPosition(newPosition)
    }
  }

  const handleSwipeBarTouchEnd = (e) => {
    if (!isSwipingBar.current) return

    // If user was scrolling, don't handle as swipe
    if (isScrollingHomeSections.current) {
      isSwipingBar.current = false
      setIsDraggingSwipeBar(false)
      isScrollingHomeSections.current = false
      return
    }

    const windowHeight = window.innerHeight
    const threshold = 50 // Small threshold - just 50px to trigger
    const finalY = e.changedTouches[0].clientY
    const finalDeltaY = swipeBarStartY.current - finalY

    if (showHomeSections) {
      // If showing home sections and swiped down, go back to map
      if (finalDeltaY < -threshold || swipeBarPosition < 0.95) {
        setShowHomeSections(false)
        setSwipeBarPosition(0)
      } else {
        // Keep it open
        setSwipeBarPosition(1)
        setShowHomeSections(true)
      }
    } else {
      // If showing map and swiped up, show home sections
      if (finalDeltaY > threshold || swipeBarPosition > 0.05) {
        setSwipeBarPosition(1)
        setShowHomeSections(true)
      } else {
        setSwipeBarPosition(0)
        setShowHomeSections(false)
      }
    }

    isSwipingBar.current = false
    setIsDraggingSwipeBar(false)
    swipeBarStartY.current = 0
    isScrollingHomeSections.current = false
  }

  // Handle mouse events for desktop
  const handleSwipeBarMouseDown = (e) => {
    // Check if click is on a button or interactive element
    const target = e.target
    const isInteractive = target.closest('button') || target.closest('a') || target.closest('[role="button"]')

    // If clicking an interactive element, don't start swipe
    if (isInteractive && !target.closest('[data-swipe-handle]')) {
      return
    }

    isSwipingBar.current = true
    swipeBarStartY.current = e.clientY
    setIsDraggingSwipeBar(true)
  }

  const handleSwipeBarMouseMove = (e) => {
    if (!isSwipingBar.current) return

    const currentY = e.clientY
    const deltaY = swipeBarStartY.current - currentY
    const windowHeight = window.innerHeight

    // Prevent default to avoid text selection
    // Don't call preventDefault - CSS touch-action handles scrolling prevention
    // safePreventDefault(e) // Removed to avoid passive listener error

    if (showHomeSections) {
      // Currently showing home sections - swiping down should go back to map
      // Calculate position from 1 (top) to 0 (bottom)
      const newPosition = Math.max(0, Math.min(1, 1 + (deltaY / windowHeight)))
      setSwipeBarPosition(newPosition)
    } else {
      // Currently showing map - swiping up should show home sections
      // Calculate position from 0 (bottom) to 1 (top)
      const newPosition = Math.max(0, Math.min(1, deltaY / windowHeight))
      setSwipeBarPosition(newPosition)
    }
  }

  const handleSwipeBarMouseUp = (e) => {
    if (!isSwipingBar.current) return

    const windowHeight = window.innerHeight
    const threshold = 50 // Small threshold - just 50px to trigger
    const finalY = e.clientY
    const finalDeltaY = swipeBarStartY.current - finalY

    if (showHomeSections) {
      // If showing home sections and swiped down, go back to map
      if (finalDeltaY < -threshold || swipeBarPosition < 0.95) {
        setShowHomeSections(false)
        setSwipeBarPosition(0)
      } else {
        // Keep it open
        setSwipeBarPosition(1)
        setShowHomeSections(true)
      }
    } else {
      // If showing map and swiped up, show home sections
      if (finalDeltaY > threshold || swipeBarPosition > 0.05) {
        setSwipeBarPosition(1)
        setShowHomeSections(true)
      } else {
        setSwipeBarPosition(0)
        setShowHomeSections(false)
      }
    }

    isSwipingBar.current = false
    setIsDraggingSwipeBar(false)
    swipeBarStartY.current = 0
  }

  // Handle chevron click to slide down swipe bar
  const handleChevronDownClick = () => {
    if (showHomeSections) {
      setShowHomeSections(false)
      setSwipeBarPosition(0)
      setIsDraggingSwipeBar(false)
    }
  }

  // Handle chevron click to slide up swipe bar
  const handleChevronUpClick = () => {
    if (!showHomeSections) {
      setShowHomeSections(true)
      setSwipeBarPosition(1)
      setIsDraggingSwipeBar(false)
    }
  }

  // Add global mouse event listeners
  useEffect(() => {
    if (isDraggingSwipeBar) {
      document.addEventListener('mousemove', handleSwipeBarMouseMove)
      document.addEventListener('mouseup', handleSwipeBarMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleSwipeBarMouseMove)
        document.removeEventListener('mouseup', handleSwipeBarMouseUp)
      }
    }
  }, [isDraggingSwipeBar, swipeBarPosition])

  // Get next available slot for booking
  const getNextAvailableSlot = () => {
    if (!todayGig) return null

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    // Find next slot after current gig ends
    if (todayGig.endTime && todayGig.endTime > currentTime) {
      const [hours, minutes] = todayGig.endTime.split(':').map(Number)
      const nextStartHour = hours
      const nextEndHour = hours + 1
      return {
        start: `${String(nextStartHour).padStart(2, '0')}:00`,
        end: `${String(nextEndHour).padStart(2, '0')}:00`
      }
    }
    return null
  }

  const nextSlot = getNextAvailableSlot()

  // Fetch zones within 70km radius from backend
  const fetchAndDrawNearbyZones = async () => {
    if (!riderLocation || riderLocation.length !== 2 || !window.google || !window.deliveryMapInstance) {
      return
    }

    try {
      const [riderLat, riderLng] = riderLocation
      const response = await deliveryAPI.getZonesInRadius(riderLat, riderLng, 70)

      if (response.data?.success && response.data.data?.zones) {
        const nearbyZones = response.data.data.zones
        setZones(nearbyZones)
        drawZonesOnMap(nearbyZones)
      }
    } catch (error) {
      // Suppress network errors - backend might be down or endpoint not available
      if (error.code === 'ERR_NETWORK') {
        // Silently handle network errors - backend might not be running
        return
      }
      // Only log non-network errors
      if (error.response) {
        console.error("Error fetching zones:", error.response?.data || error.message)
      }
    }
  }

  // Draw zones on map
  const drawZonesOnMap = (zonesToDraw) => {
    if (!window.google || !window.deliveryMapInstance || !zonesToDraw || zonesToDraw.length === 0) {
      return
    }

    // Clear previous zones
    zonesPolygonsRef.current.forEach(polygon => {
      if (polygon) polygon.setMap(null)
    })
    zonesPolygonsRef.current = []

    const map = window.deliveryMapInstance
    // Light orange color for all zones
    const lightOrangeColor = "#FFB84D" // Light orange
    const strokeColor = "#FF9500" // Slightly darker orange for border

    zonesToDraw.forEach((zone, index) => {
      if (!zone.coordinates || zone.coordinates.length < 3) return

      // Convert coordinates to LatLng array
      const path = zone.coordinates.map(coord => {
        const lat = typeof coord === 'object' ? (coord.latitude || coord.lat) : null
        const lng = typeof coord === 'object' ? (coord.longitude || coord.lng) : null
        if (lat === null || lng === null) return null
        return new window.google.maps.LatLng(lat, lng)
      }).filter(Boolean)

      if (path.length < 3) return

      // Create polygon with light orange fill
      const polygon = new window.google.maps.Polygon({
        paths: path,
        strokeColor: strokeColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: lightOrangeColor,
        fillOpacity: 0.3, // Light fill opacity for better visibility
        editable: false,
        draggable: false,
        clickable: true,
        zIndex: 1
      })

      polygon.setMap(map)
      zonesPolygonsRef.current.push(polygon)

      // InfoWindow removed - no popup on zone click
    })
  }

  // Fetch zones when map is ready and location changes
  useEffect(() => {
    if (!mapLoading && window.deliveryMapInstance && riderLocation && riderLocation.length === 2) {
      fetchAndDrawNearbyZones()
    }
  }, [mapLoading, riderLocation])

  const desktopBottomPopupPanelClass = "lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[min(920px,calc(100%-2.5rem))] lg:bottom-4 lg:rounded-3xl lg:border lg:border-[#f0e4da] lg:shadow-[0_30px_80px_rgba(30,30,30,0.20)]"

  // Render normal feed view when offline or no gig booked
  return (
    <div className="w-full min-h-screen bg-[#f6e9dc] overflow-x-hidden flex flex-col lg:max-w-[1100px] lg:mx-auto" style={{ height: '100vh' }}>
      {/* Top Navigation Bar */}
      <FeedNavbar
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        onEmergencyClick={() => setShowEmergencyPopup(true)}
        onHelpClick={() => setShowHelpPopup(true)}
      />


      {/* Carousel - Only show if there are slides */}
      {carouselSlides.length > 0 && (
        <div
          ref={carouselRef}
          className="relative overflow-hidden bg-gray-700 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
          onMouseDown={handleCarouselMouseDown}
        >
          <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentCarouselSlide * 100}%)` }}>
            {carouselSlides.map((slide) => {
              // Resolve text colors: use explicit slide colors, or infer from bgColor
              const isDark = slide.bgColor === 'bg-gray-700' || slide.bgColor === 'bg-[#e53935]'
              const titleCls = slide.titleColor ?? (isDark ? 'text-white' : 'text-black')
              const subtitleCls = slide.subtitleColor ?? (isDark ? 'text-white/90' : 'text-black/80')
              const addressCls = isDark ? 'text-white/80' : 'text-black/70'
              const btnCls = slide.buttonBgColor ?? (isDark ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-[#e53935] text-white hover:bg-[#c62828]')

              return (
                <div key={slide.id} className="min-w-full">
                  <div className={`${slide.bgColor} px-4 py-3 flex items-center gap-3 min-h-[80px]`}>
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {slide.icon === 'bag' ? (
                        <div className="relative">
                          <div className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center shadow-lg relative">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-black/20 rounded-full blur-sm" />
                        </div>
                      ) : (
                        <div className="relative w-10 h-10">
                          <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center relative">
                            <svg className="w-12 h-12 text-white absolute" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`${titleCls} text-sm font-semibold mb-0.5 truncate`}>
                        {slide.title}
                      </h3>
                      <p className={`${subtitleCls} text-xs truncate`}>
                        {slide.subtitle}
                      </p>
                    </div>

                    {/* Button */}
                    <button
                      onClick={() => {
                        if (slide.action === 'navigate' && slide.path) {
                          navigate(slide.path)
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap ${btnCls}`}
                    >
                      {slide.buttonText}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Carousel Indicators */}
          {carouselSlides.length > 1 && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {carouselSlides.map((slide, index) => {
                const currentSlide = carouselSlides[currentCarouselSlide]
                const isDarkSlide = currentSlide?.bgColor === 'bg-gray-700' || currentSlide?.bgColor === 'bg-[#e53935]'
                return (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentCarouselSlide(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${index === currentCarouselSlide
                      ? (isDarkSlide ? 'w-6 bg-white' : 'w-6 bg-black')
                      : (isDarkSlide ? 'w-1.5 bg-white/50' : 'w-1.5 bg-black/30')
                      }`}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}


      {/* Conditional Content Based on Swipe Bar Position */}
      {!showHomeSections ? (
        <>
          {/* Map View - Shows map with Hotspot or Select drop mode */}
          <div className="relative flex-1 overflow-hidden pb-16 md:pb-0" style={{ minHeight: 0, pointerEvents: 'auto' }}>
            {/* Google Maps Container */}
            <div
              ref={mapContainerRef}
              className="w-full h-full"
              style={{
                height: '100%',
                width: '100%',
                backgroundColor: '#e5e7eb', // Light gray background while loading
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'auto',
                zIndex: 0
              }}
            />

            {/* Loading indicator */}
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-gray-600 font-medium">Loading map...</div>
                  <div className="text-xs text-gray-500">Please wait</div>
                </div>
              </div>
            )}

            {/* Map Refresh Overlay - Professional Loading Indicator */}
            {isRefreshingLocation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
              >
                {/* Loading indicator container */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="relative"
                >
                  {/* Outer pulsing ring */}
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 0.3, 0.6]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.6, 1], // Smooth ease-in-out
                      type: "tween",
                      times: [0, 0.5, 1]
                    }}
                    className="absolute inset-0 w-20 h-20 bg-[#FFC400]/20 rounded-full"
                  />

                  {/* Middle ring */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.2, 0.5]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.6, 1], // Smooth ease-in-out
                      type: "tween",
                      delay: 0.3,
                      times: [0, 0.5, 1]
                    }}
                    className="absolute inset-0 w-16 h-16 bg-[#FFC400]/30 rounded-full m-2"
                  />

                  {/* Inner spinner */}
                  <div className="relative w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "linear",
                        type: "tween"
                      }}
                      className="w-8 h-8 border-[3px] border-[#e53935] border-t-transparent rounded-full"
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Floating Action Button - My Location */}
            <motion.button
              onClick={() => {
                if (navigator.geolocation) {
                  setIsRefreshingLocation(true)
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      // Validate coordinates
                      const latitude = position.coords.latitude
                      const longitude = position.coords.longitude

                      // Validate coordinates are valid numbers
                      if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
                        isNaN(latitude) || isNaN(longitude) ||
                        latitude < -90 || latitude > 90 ||
                        longitude < -180 || longitude > 180) {
                        console.warn("⚠️ Invalid coordinates received:", { latitude, longitude })
                        setIsRefreshingLocation(false)
                        return
                      }

                      const newLocation = [latitude, longitude] // [lat, lng] format

                      // Calculate heading from previous location
                      let heading = null
                      if (lastLocationRef.current) {
                        const [prevLat, prevLng] = lastLocationRef.current
                        heading = calculateHeading(prevLat, prevLng, latitude, longitude)
                      }

                      // Save location to localStorage (for refresh handling)
                      localStorage.setItem('deliveryBoyLastLocation', JSON.stringify(newLocation))

                      // Update route history
                      if (lastLocationRef.current) {
                        routeHistoryRef.current.push({
                          lat: latitude,
                          lng: longitude
                        })
                        if (routeHistoryRef.current.length > 1000) {
                          routeHistoryRef.current.shift()
                        }
                      } else {
                        routeHistoryRef.current = [{
                          lat: latitude,
                          lng: longitude
                        }]
                      }

                      // Update bike marker (only if online - blue dot नहीं, bike icon)
                      if (window.deliveryMapInstance) {
                        // Always show bike marker on map (both offline and online)
                        // Center map automatically (Zomato style) unless user is panning
                        createOrUpdateBikeMarker(latitude, longitude, heading, !isUserPanningRef.current)
                        updateRoutePolyline()
                      }

                      setRiderLocation(newLocation)
                      lastLocationRef.current = newLocation


                // If address is default or missing, try to find it in other fields
                if (!address || address === 'Restaurant Address' || address === 'Restaurant address') {
                  // Check if address might be in a different field
                  const possibleAddress =
                    selectedRestaurant?.restaurantAddress ||
                    selectedRestaurant?.restaurant?.address ||
                    selectedRestaurant?.restaurantId?.address ||
                    selectedRestaurant?.restaurantId?.location?.formattedAddress ||
                    selectedRestaurant?.restaurantId?.location?.address ||
                    selectedRestaurant?.location?.address ||
                    selectedRestaurant?.location?.formattedAddress;

                  if (possibleAddress && possibleAddress !== 'Restaurant Address' && possibleAddress !== 'Restaurant address') {
                    return possibleAddress;
                  }
                }

                return address && address !== 'Restaurant Address' && address !== 'Restaurant address'
                  ? address
                  : 'Address will be updated...';
              })()}
            </p>
            <p className="text-gray-500 text-sm font-medium">
              Order ID: {selectedRestaurant?.orderId || 'ORD1234567890'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={async () => {
                // Try multiple paths to find restaurant phone number
                let restaurantPhone = selectedRestaurant?.phone ||
                  selectedRestaurant?.restaurantId?.phone ||
                  selectedRestaurant?.ownerPhone ||
                  selectedRestaurant?.restaurant?.phone ||
                  null

                    setIsLoadingBill(true);
                    try {
                      const response = await deliveryAPI.getOrderDetails(orderId);
                      const order = response.data?.data?.order || response.data?.order || response.data?.data;
                      if (order) {
                        setDigitalBillData(order);
                        setShowDigitalBillPopup(true);
                      } else {
                        toast.error('Failed to load bill');
                      }
                    } catch (error) {
                      console.error('Error loading bill:', error);
                      toast.error('Failed to load bill');
                    } finally {
                      setIsLoadingBill(false);
                    }
                  }}
                  disabled={isLoadingBill}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#e53935] text-white rounded-lg text-sm font-medium hover:bg-[#c62828] transition-colors disabled:opacity-50"
                >
                  {isLoadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  {isLoadingBill ? 'Loading...' : 'View'}
                </button>
                <button
                  onClick={async () => {
                    const orderId = selectedRestaurant?.orderId || selectedRestaurant?.id || newOrder?.orderId || newOrder?.orderMongoId;

                    // If we already have bill data, use it. Otherwise fetch it.
                    let orderData = digitalBillData;
                    if (!orderData) {
                      setIsLoadingBill(true);
                      try {
                        const response = await deliveryAPI.getOrderDetails(orderId);
                        orderData = response.data?.data?.order || response.data?.order || response.data?.data;
                      } catch (error) {
                        console.error('Error loading bill:', error);
                        toast.error('Failed to download bill');
                        setIsLoadingBill(false);
                        return;
                      }
                      setIsLoadingBill(false);
                    }

                    if (!orderData) {
                      toast.error('No bill data available');
                      return;
                    }

                    // Generate HTML bill
                    const billHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${orderData.orderId || 'N/A'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 8px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .content { padding: 32px; }
    .section { margin-bottom: 32px; }
    .section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .info-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .info-box h3 { font-size: 18px; margin-bottom: 4px; }
    .info-box p { color: #6b7280; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    thead { background: #f3f4f6; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { font-weight: 600; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    td { font-size: 14px; }
    .text-right { text-align: right; }
    .font-semibold { font-weight: 600; }
    .pricing-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .pricing-row.total {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      font-size: 18px;
      font-weight: 700;
      color: #1e40af;
    }
    .footer {
      border-top: 2px solid #e5e7eb;
      padding-top: 16px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .addons { font-size: 12px; color: #6b7280; margin-top: 4px; }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Digital Invoice</h1>
      <p>Order #${orderData.orderId || 'N/A'}</p>
    </div>
    
    <div class="content">
      <!-- Restaurant Info -->
      <div class="section">
        <div class="section-title">From</div>
        <div class="info-box">
          <h3>${orderData.restaurantId?.name || orderData.restaurantName || 'Restaurant'}</h3>
          <p>${getRestaurantDisplayAddress(orderData) || 'Address'}</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="section">
        <div class="section-title">Bill To</div>
        <div class="info-box">
          <h3>${orderData.userId?.name || orderData.userName || 'Customer'}</h3>
          <p>${getCustomerDisplayAddress(orderData) || 'Delivery Address'}</p>
        </div>
      </div>

      <!-- Order Items -->
      <div class="section">
        <div class="section-title">Order Items</div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items?.map(item => `
              <tr>
                <td>
                  <div class="font-semibold">${item.name || item.menuItemId?.name || 'Item'}</div>
                  ${item.selectedAddons && item.selectedAddons.length > 0 ? `
                    <div class="addons">Addons: ${item.selectedAddons.map(a => a.name).join(', ')}</div>
                  ` : ''}
                </td>
                <td class="text-right">${item.quantity || 1}</td>
                <td class="text-right">₹${(item.price || 0).toFixed(2)}</td>
                <td class="text-right font-semibold">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
              </tr>
            `).join('') || '<tr><td colspan="4">No items</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Pricing Summary -->
      <div class="section">
        <div class="pricing-row">
          <span>Subtotal</span>
          <span class="font-semibold">₹${(orderData.pricing?.subtotal || orderData.pricing?.itemTotal || 0).toFixed(2)}</span>
        </div>
        ${(orderData.pricing?.tax || 0) > 0 ? `
          <div class="pricing-row">
            <span>Tax & Fees</span>
            <span class="font-semibold">₹${orderData.pricing.tax.toFixed(2)}</span>
          </div>
        ` : ''}
        ${(orderData.pricing?.deliveryFee || 0) > 0 ? `
          <div class="pricing-row">
            <span>Delivery Fee</span>
            <span class="font-semibold">₹${orderData.pricing.deliveryFee.toFixed(2)}</span>
          </div>
        ` : ''}
        ${(orderData.pricing?.discount || 0) > 0 ? `
          <div class="pricing-row" style="color: #059669;">
            <span>Discount</span>
            <span class="font-semibold">-₹${orderData.pricing.discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="pricing-row total">
          <span>Total Amount</span>
          <span>₹${(orderData.pricing?.total || 0).toFixed(2)}</span>
        </div>
      </div>

      <!-- Payment Info -->
      <div class="section">
        <div class="pricing-row">
          <span>Payment Method</span>
          <span class="font-semibold">${orderData.payment?.method === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Bill generated on ${new Date(orderData.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
        <p style="margin-top: 8px;">Thank you for your order!</p>
      </div>
    </div>
  </div>
</body>
</html>
                    `.trim();

                    // Create and download the HTML file
                    const blob = new Blob([billHtml], { type: 'text/html' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Invoice-${orderId}.html`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);

                    toast.success('Bill downloaded successfully!');
                  }}
                  disabled={isLoadingBill}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-[#1E1E1E] border border-[#F5F5F5] rounded-lg text-sm font-medium hover:bg-[#fff8f7] transition-colors disabled:opacity-50"
                >
                  {isLoadingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  {isLoadingBill ? 'Loading...' : 'Download'}
                </button>
              </div>
              <p className="text-xs text-[#FFC400] text-center mt-2">
                Auto-generated digital invoice
              </p>
            </div>



            {/* Order Picked Up Button with Swipe */}
            <div className="relative w-full">
              <motion.div
                ref={orderIdConfirmButtonRef}
                className="relative w-full bg-[#e53935] rounded-full overflow-hidden shadow-xl"
                style={{
                  touchAction: 'pan-x'
                }}
                onTouchStart={handleOrderIdConfirmTouchStart}
                onTouchMove={handleOrderIdConfirmTouchMove}
                onTouchEnd={handleOrderIdConfirmTouchEnd}
                whileTap={{ scale: 0.98 }}
              >
                {/* Swipe progress background */}
                <motion.div
                  className="absolute inset-0 bg-[#d32f2f] rounded-full"
                  animate={{
                    width: `${orderIdConfirmButtonProgress * 100}%`
                  }}
                  transition={orderIdConfirmIsAnimatingToComplete ? {
                    type: "spring",
                    stiffness: 200,
                    damping: 25
                  } : { duration: 0 }}
                />

                {/* Button content container */}
                <div className="relative flex items-center h-[64px] px-1">
                  {/* Left: Black circle with arrow */}
                  <motion.div
                    className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0 relative z-20 shadow-2xl"
                    animate={{
                      x: orderIdConfirmButtonProgress * (orderIdConfirmButtonRef.current ? (orderIdConfirmButtonRef.current.offsetWidth - 56 - 32) : 240)
                    }}
                    transition={orderIdConfirmIsAnimatingToComplete ? {
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    } : { duration: 0 }}
                  >
                    <ArrowRight className="w-5 h-5 text-white" />
                  </motion.div>

                  {/* Text - centered and stays visible */}
                  <div className="absolute inset-0 flex items-center justify-center left-16 right-4 pointer-events-none">
                    <motion.span
                      className="text-white font-semibold flex items-center justify-center text-center text-base select-none"
                      animate={{
                        opacity: orderIdConfirmButtonProgress > 0.5 ? Math.max(0.2, 1 - orderIdConfirmButtonProgress * 0.8) : 1,
                        x: orderIdConfirmButtonProgress > 0.5 ? orderIdConfirmButtonProgress * 15 : 0
                      }}
                      transition={orderIdConfirmIsAnimatingToComplete ? {
                        type: "spring",
                        stiffness: 200,
                        damping: 25
                      } : { duration: 0 }}
                    >
                      {orderIdConfirmButtonProgress > 0.5
                        ? 'Release to Confirm'
                        : 'Order Picked Up'}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </BottomPopup>

      {/* Start Navigation Button Card - Show when order is out_for_delivery */}
      {selectedRestaurant &&
        (selectedRestaurant.orderStatus === 'out_for_delivery' ||
          selectedRestaurant.deliveryPhase === 'en_route_to_delivery') &&
        !showReachedDropPopup &&
        !showOrderDeliveredAnimation &&
        !showCustomerReviewPopup &&
        !showPaymentPage && (
          <div className="fixed bottom-24 left-0 right-0 px-4 z-50">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl p-5 border border-[#F5F5F5]"
            >
              {/* Customer Info */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-teal-600"
                    >
                      <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[#1E1E1E]">
                      Head to Customer Location
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {selectedRestaurant?.customerName || 'Customer'}
                    </p>
                  </div>
                </div>
                {selectedRestaurant?.customerAddress && (
                  <p className="text-xs text-gray-500 ml-13 truncate">
                    {selectedRestaurant.customerAddress}
                  </p>
                )}
              </div>

              {/* Start Navigation Button */}
              <button
                type="button"
                onClick={handleStartNavigation}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleStartNavigation()
                }}
                className="w-full bg-[#e53935] hover:bg-[#c62828] text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                </svg>
                <span>START NAVIGATION</span>
              </button>

              <p className="text-center text-xs text-gray-500 mt-3">
                Opens Google Maps in Bike Mode 🏍️
              </p>
            </motion.div>
          </div>
        )}

      {/* Reached Drop Popup - shown instantly after Order Picked Up confirmation */}
      <BottomPopup
        isOpen={showReachedDropPopup}
        onClose={() => setShowReachedDropPopup(false)}
        showCloseButton={false}
        closeOnBackdropClick={false}
        maxHeight="70vh"
        showHandle={true}
        showBackdrop={false}
        backdropBlocksInteraction={false}
        panelClassName={desktopBottomPopupPanelClass}
      >
        <div className="">
          {/* Drop Label */}
          <div className="mb-4">
            <span className="bg-teal-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
              Drop
            </span>
          </div>

          {/* Customer Info */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">
              {selectedRestaurant?.customerName || 'Customer Name'}
            </h2>
            <p className="text-gray-600 mb-2 leading-relaxed">
              {selectedRestaurant?.customerAddress || 'Customer Address'}
            </p>
            <p className="text-gray-500 text-sm font-medium">
              Order ID: {selectedRestaurant?.orderId || 'ORD1234567890'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleCallCustomer}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-[#F5F5F5] rounded-lg hover:bg-[#fff8f7] transition-colors"
            >
              <Phone className="w-5 h-5 text-gray-700" />
              <span className="text-gray-700 font-medium">Call</span>
            </button>
            <button
              type="button"
              onClick={handleStartNavigation}
              onTouchEnd={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleStartNavigation()
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <MapPin className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Map</span>
            </button>
          </div>

          {/* Reached Drop Button with Swipe */}
          <div className="relative w-full">
            <motion.div
              ref={reachedDropButtonRef}
              className="relative w-full bg-[#e53935] rounded-full overflow-hidden shadow-xl"
              style={{ touchAction: 'pan-x' }} // Prevent vertical scrolling, allow horizontal pan
              onTouchStart={handleReachedDropTouchStart}
              onTouchMove={handleReachedDropTouchMove}
              onTouchEnd={handleReachedDropTouchEnd}
              whileTap={{ scale: 0.98 }}
            >
              {/* Swipe progress background */}
              <motion.div
                className="absolute inset-0 bg-[#e53935] rounded-full"
                animate={{
                  width: `${reachedDropButtonProgress * 100}%`
                }}
                transition={reachedDropIsAnimatingToComplete ? {
                  type: "spring",
                  stiffness: 200,
                  damping: 25
                } : { duration: 0 }}
              />

              {/* Button content container */}
              <div className="relative flex items-center h-[64px] px-1">
                {/* Left: Black circle with arrow */}
                <motion.div
                  className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0 relative z-20 shadow-2xl"
                  animate={{
                    x: reachedDropButtonProgress * (reachedDropButtonRef.current ? (reachedDropButtonRef.current.offsetWidth - 56 - 32) : 240)
                  }}
                  transition={reachedDropIsAnimatingToComplete ? {
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  } : { duration: 0 }}
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </motion.div>

                {/* Text - centered and stays visible */}
                <div className="absolute inset-0 flex items-center justify-center left-16 right-4 pointer-events-none">
                  <motion.span
                    className="text-white font-semibold flex items-center justify-center text-center text-base select-none"
                    animate={{
                      opacity: reachedDropButtonProgress > 0.5 ? Math.max(0.2, 1 - reachedDropButtonProgress * 0.8) : 1,
                      x: reachedDropButtonProgress > 0.5 ? reachedDropButtonProgress * 15 : 0
                    }}
                    transition={reachedDropIsAnimatingToComplete ? {
                      type: "spring",
                      stiffness: 200,
                      damping: 25
                    } : { duration: 0 }}
                  >
                    {reachedDropButtonProgress > 0.5 ? 'Release to Confirm' : 'Reached Drop'}
                  </motion.span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </BottomPopup>

      {/* Order Delivered Bottom Popup - shown instantly after Reached Drop is confirmed */}
      <BottomPopup
        isOpen={showOrderDeliveredAnimation}
        onClose={() => {
          setShowOrderDeliveredAnimation(false)
          setShowCustomerReviewPopup(true)
        }}
        showCloseButton={false}
        closeOnBackdropClick={false}
        maxHeight="80vh"
        showHandle={true}
        showBackdrop={false}
        backdropBlocksInteraction={false}
        panelClassName={desktopBottomPopupPanelClass}
      >
        <div className="">
          {/* Success Icon and Title */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-[#e53935] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#1E1E1E] mb-2">
              Great job! Delivery complete 👍
            </h1>
          </div>

          {/* Trip Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600 text-sm">Trip distance</span>
                </div>
                <span className="text-[#1E1E1E] font-semibold">
                  {tripDistance !== null
                    ? (tripDistance >= 1000
                      ? `${(tripDistance / 1000).toFixed(1)} kms`
                      : `${tripDistance.toFixed(0)} m`)
                    : (selectedRestaurant?.tripDistance || '—')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600 text-sm">Trip time</span>
                </div>
                <span className="text-[#1E1E1E] font-semibold">
                  {tripTime !== null
                    ? (tripTime >= 60
                      ? `${Math.round(tripTime / 60)} mins`
                      : `${tripTime} secs`)
                    : (selectedRestaurant?.tripTime || '—')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment info: Online = amount paid, COD = collect from customer */}
          {selectedRestaurant?.total != null && (() => {
            const m = (selectedRestaurant.paymentMethod || '').toLowerCase()
            const isCod = m === 'cash' || m === 'cod'
            const total = Number(selectedRestaurant.total) || 0
            return (
              <div className={`rounded-xl p-4 mb-6 ${isCod ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IndianRupee className={`w-4 h-4 ${isCod ? 'text-amber-600' : 'text-emerald-600'}`} />
                    <span className={`text-sm font-medium ${isCod ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {isCod ? 'Collect from customer (COD)' : 'Amount paid (Online)'}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${isCod ? 'text-amber-700' : 'text-emerald-700'}`}>
                    ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )
          })()}

          {/* Order Delivered Button with Swipe */}
          <div className="relative w-full">
            <motion.div
              ref={orderDeliveredButtonRef}
              className="relative w-full bg-[#e53935] rounded-full overflow-hidden shadow-xl"
              style={{ touchAction: 'pan-x' }} // Prevent vertical scrolling, allow horizontal pan
              onTouchStart={handleOrderDeliveredTouchStart}
              onTouchMove={handleOrderDeliveredTouchMove}
              onTouchEnd={handleOrderDeliveredTouchEnd}
              whileTap={{ scale: 0.98 }}
            >
              {/* Swipe progress background */}
              <motion.div
                className="absolute inset-0 bg-[#e53935] rounded-full"
                animate={{
                  width: `${orderDeliveredButtonProgress * 100}%`
                }}
                transition={orderDeliveredIsAnimatingToComplete ? {
                  type: "spring",
                  stiffness: 200,
                  damping: 25
                } : { duration: 0 }}
              />

              {/* Button content container */}
              <div className="relative flex items-center h-[64px] px-1">
                {/* Left: Black circle with arrow */}
                <motion.div
                  className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0 relative z-20 shadow-2xl"
                  animate={{
                    x: orderDeliveredButtonProgress * (orderDeliveredButtonRef.current ? (orderDeliveredButtonRef.current.offsetWidth - 56 - 32) : 240)
                  }}
                  transition={orderDeliveredIsAnimatingToComplete ? {
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  } : { duration: 0 }}
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </motion.div>

                {/* Text - centered and stays visible */}
                <div className="absolute inset-0 flex items-center justify-center left-16 right-4 pointer-events-none">
                  <motion.span
                    className="text-white font-semibold flex items-center justify-center text-center text-base select-none"
                    animate={{
                      opacity: orderDeliveredButtonProgress > 0.5 ? Math.max(0.2, 1 - orderDeliveredButtonProgress * 0.8) : 1,
                      x: orderDeliveredButtonProgress > 0.5 ? orderDeliveredButtonProgress * 15 : 0
                    }}
                    transition={orderDeliveredIsAnimatingToComplete ? {
                      type: "spring",
                      stiffness: 200,
                      damping: 25
                    } : { duration: 0 }}
                  >
                    {orderDeliveredButtonProgress > 0.5 ? 'Release to Confirm' : 'Order Delivered'}
                  </motion.span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </BottomPopup>

      {/* Customer Review Popup - shown after Order Delivered */}
      <BottomPopup
        isOpen={showCustomerReviewPopup}
        onClose={() => setShowCustomerReviewPopup(false)}
        showCloseButton={false}
        closeOnBackdropClick={false}
        maxHeight="80vh"
        showHandle={true}
        panelClassName={desktopBottomPopupPanelClass}
      >
        <div className="">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[#1E1E1E] mb-2">
              Rate Your Experience
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              How was your delivery experience?
            </p>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setCustomerRating(star)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  {star <= customerRating ? (
                    <span className="text-[#FFC400]">★</span>
                  ) : (
                    <span className="text-gray-300">★</span>
                  )}
                </button>
              ))}
            </div>

            {/* Optional Review Text */}
            <div className="mb-6">
              <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                Review (Optional)
              </label>
              <textarea
                value={customerReviewText}
                onChange={(e) => setCustomerReviewText(e.target.value)}
                placeholder="Share your experience..."
                className="w-full px-4 py-3 border border-[#F5F5F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e53935] focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={async () => {
                // Get order ID - use MongoDB _id for API call
                const orderIdForApi = selectedRestaurant?.id ||
                  newOrder?.orderMongoId ||
                  newOrder?._id ||
                  selectedRestaurant?.orderId ||
                  newOrder?.orderId

                // Save review by calling completeDelivery API with rating and review
                if (orderIdForApi) {
                  try {
                  }
                  // Handle estimatedEarnings - can be number or object
                  const earnings = selectedRestaurant?.amount || selectedRestaurant?.estimatedEarnings || 0;
                  if (typeof earnings === 'object' && earnings.totalEarning) {
                    return earnings.totalEarning.toFixed(2);
                  }
                  return typeof earnings === 'number' ? earnings.toFixed(2) : '0.00';
                })()}
              </p>
              <p className="text-[#FFC400] text-sm mt-2">💰 Added to your wallet</p>
            </div>

            {/* Payment Details */}
            <div className="px-6 py-6 pb-6 h-full flex flex-col justify-between">
              <div className="bg-white rounded-xl shadow-sm border border-[#F5F5F5] p-5 mb-6">
                <h3 className="text-lg font-bold text-[#1E1E1E] mb-4">Payment Details</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#F5F5F5]">
                    <span className="text-gray-600">Trip pay</span>
                    <span className="text-[#1E1E1E] font-semibold">₹{(() => {
                      let earnings = 0;
                      if (orderEarnings > 0) {
                        earnings = orderEarnings;
                      } else {
                        const estEarnings = selectedRestaurant?.amount || selectedRestaurant?.estimatedEarnings || 0;
                        if (typeof estEarnings === 'object' && estEarnings.totalEarning) {
                          earnings = estEarnings.totalEarning;
                        } else if (typeof estEarnings === 'number') {
                          earnings = estEarnings;
                        }
                      }
                      return (earnings - 5).toFixed(2);
                    })()}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-[#F5F5F5]">
                    <span className="text-gray-600">Long distance return pay</span>
                    <span className="text-[#1E1E1E] font-semibold">₹5.00</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-lg font-bold text-[#1E1E1E]">Total Earnings</span>
                    <span className="text-lg font-bold text-[#1E1E1E]">₹{(() => {
                      if (orderEarnings > 0) {
                        return orderEarnings.toFixed(2);
                      }
                      // Handle estimatedEarnings - can be number or object
                      const earnings = selectedRestaurant?.amount || selectedRestaurant?.estimatedEarnings || 0;
                      if (typeof earnings === 'object' && earnings.totalEarning) {
                        return earnings.totalEarning.toFixed(2);
                      }
                      return typeof earnings === 'number' ? earnings.toFixed(2) : '0.00';
                    })()}</span>
                  </div>
                </div>
              </div>


              {/* Complete Button */}
              <button
                onClick={() => {
                  setShowPaymentPage(false)
                  // CRITICAL: Clear all order-related popups and states when completing
                  setShowreachedPickupPopup(false)
                  setShowOrderIdConfirmationPopup(false)
                  setShowReachedDropPopup(false)
                  setShowOrderDeliveredAnimation(false)
                  setShowCustomerReviewPopup(false)

                  // Clear selected restaurant/order to prevent showing popups for delivered order
                  setSelectedRestaurant(null)

                  // CRITICAL: Clear active order from localStorage to prevent it from showing again
                  localStorage.removeItem('deliveryActiveOrder')
                  localStorage.removeItem('activeOrder')

                  // Clear newOrder from notifications hook (if available)
                  if (typeof clearNewOrder === 'function') {
                    clearNewOrder()
                  }

                  // Clear accepted orders list when order is completed
                  acceptedOrderIdsRef.current.clear();

                  navigate("/delivery")
                  // Reset states
                  setTimeout(() => {
                    setReachedDropButtonProgress(0)
                    setReachedDropIsAnimatingToComplete(false)
                    setCustomerRating(0)
                    setCustomerReviewText("")
                  }, 500)
                }}
                className="w-full sticky bottom-4 bg-[#e53935] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#c62828] transition-colors shadow-lg "
              >
                Complete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Digital Bill Popup Modal */}
      <AnimatePresence>
        {showDigitalBillPopup && digitalBillData && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 z-[200]"
              onClick={() => setShowDigitalBillPopup(false)}
            />

            {/* Bill Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[210] max-w-lg mx-auto max-h-[85vh]"
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-6 py-5 relative" style={{ background: '#e53935' }}>
                  <button
                    onClick={() => setShowDigitalBillPopup(false)}
                    className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-white text-xl font-bold">Digital Bill</h2>
                      <p className="text-white/80 text-sm">Invoice #{digitalBillData.orderId || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Bill Content */}
                <div className="p-6 space-y-5 overflow-y-auto">
                  {/* Restaurant Info */}
                  <div className="pb-4" style={{ borderBottom: '1.5px solid #F5F5F5' }}>
                    <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#9e9e9e' }}>From</p>
                    <h3 className="text-lg font-bold" style={{ color: '#1E1E1E' }}>
                      {digitalBillData.restaurantId?.name || digitalBillData.restaurantName || 'Restaurant'}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: '#555' }}>
                      {getRestaurantDisplayAddress(digitalBillData) || 'Address'}
                    </p>
                  </div>

                  {/* Customer Info */}
                  <div className="pb-4" style={{ borderBottom: '1.5px solid #F5F5F5' }}>
                    <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#9e9e9e' }}>Bill To</p>
                    <h3 className="text-base font-semibold" style={{ color: '#1E1E1E' }}>
                      {digitalBillData.userId?.name || digitalBillData.userName || 'Customer'}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: '#555' }}>
                      {getCustomerDisplayAddress(digitalBillData) || 'Delivery Address'}
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="pb-4" style={{ borderBottom: '1.5px solid #F5F5F5' }}>
                    <p className="text-xs uppercase tracking-wide mb-3" style={{ color: '#9e9e9e' }}>Items</p>
                    <div className="space-y-3">
                      {digitalBillData.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: '#1E1E1E' }}>{item.name || item.menuItemId?.name}</p>
                            <p className="text-xs" style={{ color: '#888' }}>Qty: {item.quantity}</p>
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <p className="text-xs mt-1" style={{ color: '#888' }}>
                                Addons: {item.selectedAddons.map(a => a.name).join(', ')}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-semibold" style={{ color: '#1E1E1E' }}>
                            ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm" style={{ color: '#555' }}>Subtotal</p>
                      <p className="text-sm font-medium" style={{ color: '#1E1E1E' }}>
                        ₹{(digitalBillData.pricing?.subtotal || digitalBillData.pricing?.itemTotal || 0).toFixed(2)}
                      </p>
                    </div>
                    {(digitalBillData.pricing?.tax || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-sm" style={{ color: '#555' }}>Tax & Fees</p>
                        <p className="text-sm font-medium" style={{ color: '#1E1E1E' }}>
                          ₹{digitalBillData.pricing.tax.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {(digitalBillData.pricing?.deliveryFee || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-sm" style={{ color: '#555' }}>Delivery Fee</p>
                        <p className="text-sm font-medium" style={{ color: '#1E1E1E' }}>
                          ₹{digitalBillData.pricing.deliveryFee.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {(digitalBillData.pricing?.discount || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-sm" style={{ color: '#e53935' }}>Discount</p>
                        <p className="text-sm font-medium" style={{ color: '#e53935' }}>
                          -₹{digitalBillData.pricing.discount.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="rounded-xl p-4" style={{ background: '#FFF9E0', border: '1.5px solid #FFC400' }}>
                    <div className="flex justify-between items-center">
                      <p className="text-base font-bold" style={{ color: '#1E1E1E' }}>Total Amount</p>
                      <p className="text-xl font-bold" style={{ color: '#FFC400' }}>
                        ₹{(digitalBillData.pricing?.total || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1.5px solid #F5F5F5' }}>
                    <p className="text-sm" style={{ color: '#555' }}>Payment Method</p>
                    <p className="text-sm font-medium" style={{ color: '#1E1E1E' }}>
                      {digitalBillData.payment?.method === 'cash' ? 'Cash on Delivery' : 'Online Payment'}
                    </p>
                  </div>

                </div>

                {/* Upload Button */}
                <div className="sticky bottom-0 bg-white px-4 pb-4 pt-3" style={{ borderTop: '1.5px solid #F5F5F5' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      const mongoId = digitalBillData._id;
                      const orderId = digitalBillData.orderId;

                      try {
                        setIsUploadingBill(true);

                        // Mark the order as having digital bill uploaded
                        await deliveryAPI.confirmOrderId(
                          mongoId,
                          orderId,
                          {},
                          {
                            digitalBillUploaded: true,
                            digitalBillUploadedAt: new Date().toISOString()
                          }
                        );

                        toast.success('Digital bill uploaded successfully!');
                        setShowDigitalBillPopup(false);
                      } catch (error) {
                        console.error('Error uploading bill:', error);
                        toast.error(error.response?.data?.message || 'Failed to upload bill');
                      } finally {
                        setIsUploadingBill(false);
                      }
                    }}
                    disabled={isUploadingBill}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-colors shadow-lg bg-[#e53935] hover:bg-[#c62828] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadingBill ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading Bill...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Upload Digital Bill
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div >
  )
}




