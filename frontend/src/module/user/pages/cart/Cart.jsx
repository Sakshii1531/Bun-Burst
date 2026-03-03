import { useState, useEffect, useRef, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus, Minus, ArrowLeft, ChevronRight, Clock, MapPin, Phone, FileText, Utensils, Tag, Percent, Truck, Share2, ChevronUp, ChevronDown, X, Check, Settings, CreditCard, Wallet, Building2, Sparkles, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

import AnimatedPage from "../../components/AnimatedPage"
import { Button } from "@/components/ui/button"
import { useCart } from "../../context/CartContext"
import { useProfile } from "../../context/ProfileContext"
import { useOrders } from "../../context/OrdersContext"
import { useLocation as useUserLocation } from "../../hooks/useLocation"
import { useZone } from "../../hooks/useZone"
import { orderAPI, restaurantAPI, adminAPI, userAPI, API_ENDPOINTS } from "@/lib/api"
import { API_BASE_URL } from "@/lib/api/config"
import { initRazorpayPayment } from "@/lib/utils/razorpay"
import { toast } from "sonner"
import { getCompanyNameAsync } from "@/lib/utils/businessSettings"
import { useLocationSelector } from "../../components/UserLayout"


// Removed hardcoded suggested items - now fetching approved addons from backend
// Coupons will be fetched from backend based on items in cart

/**
 * Format full address string from address object
 * @param {Object} address - Address object with street, additionalDetails, city, state, zipCode, or formattedAddress
 * @returns {String} Formatted address string
 */
const formatFullAddress = (address) => {
  if (!address) return ""

  // Priority 1: Use formattedAddress if available (for live location addresses)
  if (address.formattedAddress && address.formattedAddress !== "Select location") {
    return address.formattedAddress
  }

  // Priority 2: Build address from parts
  const addressParts = []
  if (address.street) addressParts.push(address.street)
  if (address.additionalDetails) addressParts.push(address.additionalDetails)
  if (address.city) addressParts.push(address.city)
  if (address.state) addressParts.push(address.state)
  if (address.zipCode) addressParts.push(address.zipCode)

  if (addressParts.length > 0) {
    return addressParts.join(', ')
  }

  // Priority 3: Use address field if available
  if (address.address && address.address !== "Select location") {
    return address.address
  }

  return ""
}

const formatAmount = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return "0.00"
  return amount.toFixed(2)
}

export default function Cart() {
  const navigate = useNavigate()

  // Defensive check: Ensure CartProvider is available
  let cartContext;
  try {
    cartContext = useCart();
  } catch (error) {
    console.error('❌ CartProvider not found. Make sure Cart component is rendered within UserLayout.');
    // Return early with error message
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Cart Error</h2>
          <p className="text-muted-foreground">
            Cart functionality is not available. Please refresh the page.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { cart, updateQuantity, updateCartItem, addToCart, getCartCount, clearCart, cleanCartForRestaurant } = cartContext;
  const { getDefaultAddress, getDefaultPaymentMethod, addresses, paymentMethods, userProfile } = useProfile()
  const { createOrder } = useOrders()
  const { openLocationSelector } = useLocationSelector()
  const { location: userLocation, setManualLocation } = useUserLocation()

  // Custom addon states
  const [selectedItemForAddons, setSelectedItemForAddons] = useState(null)
  const [categoryAddons, setCategoryAddons] = useState([])
  const [loadingCategoryAddons, setLoadingCategoryAddons] = useState(false)
  const [showAddonModal, setShowAddonModal] = useState(false)
  const [selectedAddonsMap, setSelectedAddonsMap] = useState({})
  const [publicCategories, setPublicCategories] = useState([])

  const normalizeCategoryKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, " ")

  const singularize = (text) => {
    if (!text) return text
    if (text.endsWith("ies") && text.length > 4) return `${text.slice(0, -3)}y`
    if (text.endsWith("es") && text.length > 3) return text.slice(0, -2)
    if (text.endsWith("s") && text.length > 2) return text.slice(0, -1)
    return text
  }

  const isFuzzyCategoryMatch = (hint, target) => {
    const a = normalizeCategoryKey(hint)
    const b = normalizeCategoryKey(target)
    if (!a || !b) return false
    if (a === b) return true
    if (singularize(a) === singularize(b)) return true
    if (a.length >= 4 && b.includes(a)) return true
    if (b.length >= 4 && a.includes(b)) return true
    return false
  }

  const categoryLookup = useMemo(() => {
    const byId = new Map()
    const byName = new Map()
    const bySlug = new Map()
    const entries = []

      ; (publicCategories || []).forEach((category) => {
        const resolvedId = category?._id || category?.id
        if (!resolvedId) return
        const normalizedId = String(resolvedId)
        byId.set(normalizedId, normalizedId)

        if (category?.name) {
          byName.set(normalizeCategoryKey(category.name), normalizedId)
        }
        if (category?.slug) {
          bySlug.set(normalizeCategoryKey(category.slug), normalizedId)
        }
        entries.push({
          id: normalizedId,
          name: category?.name || "",
          slug: category?.slug || "",
        })
      })

    return { byId, byName, bySlug, entries }
  }, [publicCategories])

  const resolveCategoryIdForItem = (item) => {
    // Prefer explicit category names first (category/categoryName/sectionName),
    // because item.categoryId can be stale or restaurant-side and may not map
    // to the intended global admin category for addons.
    const primaryNameCandidates = [
      item?.category,
      item?.category?.name,
      item?.categoryName,
      item?.sectionName,
      item?.section,
    ]

    for (const nameCandidate of primaryNameCandidates) {
      if (!nameCandidate) continue
      const normalizedName = normalizeCategoryKey(nameCandidate)
      if (!normalizedName) continue

      const mappedId =
        categoryLookup.byName.get(normalizedName) ||
        categoryLookup.bySlug.get(normalizeCategoryKey(String(nameCandidate)))
      if (mappedId) return mappedId

      const fuzzyMatched = categoryLookup.entries.find((entry) =>
        isFuzzyCategoryMatch(normalizedName, entry.name) ||
        isFuzzyCategoryMatch(normalizedName, entry.slug),
      )
      if (fuzzyMatched?.id) return fuzzyMatched.id
    }

    const directCandidates = [
      item?.categoryId,
      item?.category?._id,
      item?.category?.id,
    ]

    for (const candidate of directCandidates) {
      if (!candidate) continue
      const normalizedCandidate = String(candidate).trim()
      if (!normalizedCandidate) continue

      if (categoryLookup.byId.has(normalizedCandidate)) {
        return categoryLookup.byId.get(normalizedCandidate)
      }

      const byNameOrSlug =
        categoryLookup.bySlug.get(normalizeCategoryKey(normalizedCandidate)) ||
        categoryLookup.byName.get(normalizeCategoryKey(normalizedCandidate))
      if (byNameOrSlug) return byNameOrSlug

      // IMPORTANT:
      // Cart items may carry restaurant/menu-side category ObjectIds which are
      // different from admin global category ids used by addons.
      // So only trust raw ObjectId fallback when we don't have public category
      // mappings loaded yet.
      if (
        /^[a-fA-F0-9]{24}$/.test(normalizedCandidate) &&
        categoryLookup.entries.length === 0
      ) {
        return normalizedCandidate
      }
    }

    const nameCandidates = [item?.name]

    for (const nameCandidate of nameCandidates) {
      if (!nameCandidate) continue
      const normalizedName = normalizeCategoryKey(nameCandidate)
      if (!normalizedName) continue

      const mappedId =
        categoryLookup.byName.get(normalizedName) ||
        categoryLookup.bySlug.get(normalizedName)
      if (mappedId) return mappedId

      const fuzzyMatched = categoryLookup.entries.find((entry) =>
        isFuzzyCategoryMatch(normalizedName, entry.name) ||
        isFuzzyCategoryMatch(normalizedName, entry.slug),
      )
      if (fuzzyMatched?.id) return fuzzyMatched.id
    }

    return null
  }

  useEffect(() => {
    const fetchPublicCategories = async () => {
      try {
        const response = await adminAPI.getPublicCategories()
        const categories = response?.data?.data?.categories || []
        setPublicCategories(categories)
      } catch (error) {
        console.error("Error fetching public categories for addons:", error)
      }
    }

    fetchPublicCategories()
  }, [])

  // Addon Customization Handlers
  const handleOpenAddons = async (item, preResolvedCategoryId = null) => {
    setSelectedItemForAddons(item)
    const categoryId = preResolvedCategoryId || resolveCategoryIdForItem(item)

    if (!categoryId) {
      toast.error("This item doesn't support addon customization")
      return
    }

    try {
      setLoadingCategoryAddons(true)
      setShowAddonModal(true)

      // Initialize selected addons from item
      const initialMap = {}
      const existingAddons = item.selectedAddons || item.addons || []
      existingAddons.forEach(a => {
        initialMap[a.addonId] = true
      })
      setSelectedAddonsMap(initialMap)

      const response = await adminAPI.getAddonsByCategory(categoryId)
      if (response.data.success) {
        setCategoryAddons(response.data.data.addons || [])
      }
    } catch (error) {
      console.error("Error fetching addons:", error)
      toast.error("Failed to load addons")
    } finally {
      setLoadingCategoryAddons(false)
    }
  }

  const handleToggleAddon = (addonId) => {
    setSelectedAddonsMap(prev => ({
      ...prev,
      [addonId]: !prev[addonId]
    }))
  }

  const handleSaveAddons = () => {
    if (!selectedItemForAddons) return

    const selectedList = categoryAddons
      .filter(a => selectedAddonsMap[a.id || a._id])
      .map(a => ({
        addonId: a.id || a._id,
        name: a.name,
        price: a.price
      }))

    const addonsTotal = selectedList.reduce((sum, a) => sum + (a.price || 0), 0)

    updateCartItem(selectedItemForAddons.id, {
      addons: selectedList, // Keep for backward compatibility
      selectedAddons: selectedList, // New field as requested
      price: (selectedItemForAddons.basePrice || selectedItemForAddons.price) + addonsTotal
    })

    setShowAddonModal(false)
    setSelectedItemForAddons(null)
    toast.success("Item customized successfully!")
  }

  const currentAddonsTotal = useMemo(() => {
    return categoryAddons
      .filter(a => selectedAddonsMap[a.id || a._id])
      .reduce((sum, a) => sum + (a.price || 0), 0)
  }, [categoryAddons, selectedAddonsMap])
  const { location: currentLocation } = useUserLocation() // Get live location address
  const { zoneId } = useZone(currentLocation) // Get user's zone

  const [showCoupons, setShowCoupons] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponCode, setCouponCode] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("razorpay") // razorpay | cash | wallet
  const [walletBalance, setWalletBalance] = useState(0)
  const [isLoadingWallet, setIsLoadingWallet] = useState(false)
  const [note, setNote] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [sendCutlery, setSendCutlery] = useState(true)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [showBillDetails, setShowBillDetails] = useState(false)
  const [showPlacingOrder, setShowPlacingOrder] = useState(false)
  const [orderProgress, setOrderProgress] = useState(0)
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [placedOrderId, setPlacedOrderId] = useState(null)


  // Restaurant and pricing state
  const [restaurantData, setRestaurantData] = useState(null)
  const [loadingRestaurant, setLoadingRestaurant] = useState(false)
  const [pricing, setPricing] = useState(null)
  const [loadingPricing, setLoadingPricing] = useState(false)

  // Addons state
  const [addons, setAddons] = useState([])
  const [loadingAddons, setLoadingAddons] = useState(false)

  // Coupons state - fetched from backend
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)

  // Fee settings from database (used as fallback if pricing not available)
  const [feeSettings, setFeeSettings] = useState({
    deliveryFee: 25,
    freeDeliveryThreshold: 149,
    platformFee: 5,
    gstRate: 5,
  })


  const cartCount = getCartCount()
  const savedAddress = getDefaultAddress()
  // Priority: Use live location if available, otherwise use saved address
  const defaultAddress = currentLocation?.formattedAddress && currentLocation.formattedAddress !== "Select location"
    ? {
      ...savedAddress,
      formattedAddress: currentLocation.formattedAddress,
      address: currentLocation.address || currentLocation.formattedAddress,
      street: currentLocation.street || currentLocation.address,
      city: currentLocation.city,
      state: currentLocation.state,
      zipCode: currentLocation.postalCode,
      area: currentLocation.area,
      location: currentLocation.latitude && currentLocation.longitude ? {
        coordinates: [currentLocation.longitude, currentLocation.latitude]
      } : savedAddress?.location
    }
    : savedAddress
  const defaultPayment = getDefaultPaymentMethod()

  // Get restaurant ID from cart or restaurant data
  // Priority: restaurantData > cart[0].restaurantId
  // DO NOT use cart[0].restaurant as slug fallback - it creates wrong slugs
  const restaurantId = cart.length > 0
    ? (restaurantData?._id || restaurantData?.restaurantId || cart[0]?.restaurantId || null)
    : null

  // Extract unique category IDs from cart items to fetch matching global addons.
  const cartCategoryIds = useMemo(() => {
    const unique = new Set()
    cart.forEach((item) => {
      const resolvedCategoryId = resolveCategoryIdForItem(item)
      if (resolvedCategoryId) unique.add(String(resolvedCategoryId))
    })
    return Array.from(unique)
  }, [cart, categoryLookup])



  // â”€â”€ Share cart via native OS share sheet (WhatsApp, Instagram, etc.) â”€â”€
  const handleShareCart = async () => {
    const restaurantSlug = restaurantData?.slug || restaurantName || 'restaurant'
    const shareUrl = `${window.location.origin}/user/restaurants/${restaurantSlug}`
    const itemNames = cart.map(i => i.name).join(', ')
    const shareTitle = `Check out my order from ${restaurantData?.name || restaurantSlug}!`
    const shareText = `I'm ordering ${itemNames} from ${restaurantData?.name || restaurantSlug}. Try it too! 🍽️`
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
      } catch (err) {
        if (err?.name !== 'AbortError') console.error('Share failed:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareUrl}\n${shareText}`)
        toast.success('Link copied to clipboard!')
      } catch {
        toast.error('Unable to share. Please copy the link manually.')
      }
    }
  }

  // Lock body scroll and scroll to top when any full-screen modal opens
  useEffect(() => {
    if (showPlacingOrder || showOrderSuccess) {
      // Lock body scroll
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${window.scrollY}px`

      // Scroll window to top
      window.scrollTo({ top: 0, behavior: 'instant' })
    } else {
      // Restore body scroll
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [showPlacingOrder, showOrderSuccess])

  // Fetch restaurant data when cart has items
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (cart.length === 0) {
        setRestaurantData(null)
        return
      }

      // If we already have restaurantData, don't fetch again
      if (restaurantData) {
        return
      }

      setLoadingRestaurant(true)

      // Strategy 1: Try using restaurantId from cart if available
      if (cart[0]?.restaurantId) {
        try {
          const cartRestaurantId = cart[0].restaurantId;
          const cartRestaurantName = cart[0].restaurant;

            const fetchedRestaurantName = data.name;

            // Check if restaurantId matches
            const restaurantIdMatches =
              fetchedRestaurantId === cartRestaurantId ||
              data._id?.toString() === cartRestaurantId ||
              data.restaurantId === cartRestaurantId;

            // Check if restaurant name matches (if available in cart)
            const restaurantNameMatches =
              !cartRestaurantName ||
              fetchedRestaurantName?.toLowerCase().trim() === cartRestaurantName.toLowerCase().trim();

            if (!restaurantIdMatches) {
              console.error('❌ CRITICAL: Fetched restaurant ID does not match cart restaurantId!', {
                cartRestaurantId: cartRestaurantId,
                fetchedRestaurantId: fetchedRestaurantId,
                fetched_id: data._id?.toString(),
                fetched_restaurantId: data.restaurantId,
                cartRestaurantName: cartRestaurantName,
                fetchedRestaurantName: fetchedRestaurantName
              });
              // Don't set restaurantData if IDs don't match - this prevents wrong restaurant assignment
              setLoadingRestaurant(false);
              return;
            }

            if (!restaurantNameMatches) {
              console.warn('⚠️ WARNING: Restaurant name mismatch:', {
                cartRestaurantName: cartRestaurantName,
                fetchedRestaurantName: fetchedRestaurantName
              });
              // Still proceed but log warning
            }

            const foundRestaurantName = matchingRestaurant.name?.toLowerCase().trim();

            if (cartRestaurantName && foundRestaurantName && cartRestaurantName !== foundRestaurantName) {
              console.error("❌ CRITICAL: Restaurant name mismatch!", {
                cartRestaurantName: cart[0]?.restaurant,
                foundRestaurantName: matchingRestaurant.name,
                cartRestaurantId: cart[0]?.restaurantId,
                foundRestaurantId: matchingRestaurant.restaurantId || matchingRestaurant._id
              });
              // Don't set restaurantData if names don't match - this prevents wrong restaurant assignment
              setLoadingRestaurant(false);
              return;
            }


      // Add couponCode if not present but coupon is applied
      if (!orderPricing.couponCode && appliedCoupon?.code) {
        orderPricing.couponCode = appliedCoupon.code;
      }

      // Include all cart items (main items + addons)
      // Note: Addons are added as separate cart items when user clicks the + button
      const orderItems = cart.map(item => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        image: item.image || "",
        description: item.description || "",
        isVeg: item.isVeg !== false,
        addons: item.selectedAddons || item.addons || []
      }))

      const finalRestaurantName = restaurantData?.name || null;

      if (!finalRestaurantId) {
        console.error('❌ CRITICAL: Cannot place order - Restaurant ID is missing!');
        console.error('📋 Debug info:', {
          restaurantData: restaurantData ? {
            _id: restaurantData._id,
            restaurantId: restaurantData.restaurantId,
            name: restaurantData.name
          } : 'Not loaded',
          cartRestaurantId: restaurantId,
          cartRestaurantName: cart[0]?.restaurant,
          cartItems: cart.map(item => ({
            id: item.id,
            name: item.name,
            restaurant: item.restaurant,
            restaurantId: item.restaurantId
          }))
        });
        alert('Error: Restaurant information is missing. Please refresh the page and try again.');
        setIsPlacingOrder(false);
        return;
      }

      // CRITICAL: Validate that ALL cart items belong to the SAME restaurant
      const cartRestaurantIds = cart
        .map(item => item.restaurantId)
        .filter(Boolean)
        .map(id => String(id).trim()); // Normalize to string and trim

      const cartRestaurantNames = cart
        .map(item => item.restaurant)
        .filter(Boolean)
        .map(name => name.trim().toLowerCase()); // Normalize names

      // Get unique values (after normalization)
      const uniqueRestaurantIds = [...new Set(cartRestaurantIds)];
      const uniqueRestaurantNames = [...new Set(cartRestaurantNames)];

      // Check if cart has items from multiple restaurants
      // Note: If restaurant names match, allow even if IDs differ (same restaurant, different ID format)
      if (uniqueRestaurantNames.length > 1) {
        // Different restaurant names = definitely different restaurants
        console.error('❌ CRITICAL ERROR: Cart contains items from multiple restaurants!', {
          restaurantIds: uniqueRestaurantIds,
          restaurantNames: uniqueRestaurantNames,
          cartItems: cart.map(item => ({
            id: item.id,
            name: item.name,
            restaurant: item.restaurant,
            restaurantId: item.restaurantId
          }))
        });

        // Automatically clean cart to keep items from the restaurant matching restaurantData
        if (finalRestaurantId && finalRestaurantName) {
          cleanCartForRestaurant(finalRestaurantId, finalRestaurantName);
          toast.error('Cart contained items from different restaurants. Items from other restaurants have been removed.');
        } else {
          // If restaurantData is not available, keep items from first restaurant in cart
          const firstRestaurantId = cart[0]?.restaurantId;
          const firstRestaurantName = cart[0]?.restaurant;
          if (firstRestaurantId && firstRestaurantName) {
            cleanCartForRestaurant(firstRestaurantId, firstRestaurantName);
            toast.error('Cart contained items from different restaurants. Items from other restaurants have been removed.');
          } else {
            toast.error('Cart contains items from different restaurants. Please clear cart and try again.');
          }
        }

        setIsPlacingOrder(false);
        return;
      }

      // If restaurant names match but IDs differ, that's OK (same restaurant, different ID format)
      // But log a warning in development
      if (uniqueRestaurantIds.length > 1 && uniqueRestaurantNames.length === 1) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Cart items have different restaurant IDs but same name. This is OK if IDs are in different formats.', {
            restaurantIds: uniqueRestaurantIds,
            restaurantName: uniqueRestaurantNames[0]
          });
        }
      }

      // Validate that cart items' restaurantId matches the restaurantData
      if (cartRestaurantIds.length > 0) {
        const cartRestaurantId = cartRestaurantIds[0];

        // Check if cart restaurantId matches restaurantData
        const restaurantIdMatches =
          cartRestaurantId === finalRestaurantId ||
          cartRestaurantId === restaurantData?._id?.toString() ||
          cartRestaurantId === restaurantData?.restaurantId;

        if (!restaurantIdMatches) {
          console.error('❌ CRITICAL ERROR: Cart restaurantId does not match restaurantData!', {
            cartRestaurantId: cartRestaurantId,
            finalRestaurantId: finalRestaurantId,
            restaurantDataId: restaurantData?._id?.toString(),
            restaurantDataRestaurantId: restaurantData?.restaurantId,
            restaurantDataName: restaurantData?.name,
            cartRestaurantName: cartRestaurantNames[0]
          });
          alert(`Error: Cart items belong to "${cartRestaurantNames[0] || 'Unknown Restaurant'}" but restaurant data doesn't match. Please refresh the page and try again.`);
          setIsPlacingOrder(false);
          return;
        }
      }

      // Validate restaurant name matches
      if (cartRestaurantNames.length > 0 && finalRestaurantName) {
        const cartRestaurantName = cartRestaurantNames[0];
        if (cartRestaurantName.toLowerCase().trim() !== finalRestaurantName.toLowerCase().trim()) {
          console.error('❌ CRITICAL ERROR: Restaurant name mismatch!', {
            cartRestaurantName: cartRestaurantName,
            finalRestaurantName: finalRestaurantName
          });
          alert(`Error: Cart items belong to "${cartRestaurantName}" but restaurant data shows "${finalRestaurantName}". Please refresh the page and try again.`);
          setIsPlacingOrder(false);
          return;
        }
      }

      // Log order details for debugging

      // FINAL VALIDATION: Double-check restaurantId before sending to backend
      const cartRestaurantId = cart[0]?.restaurantId;
      if (cartRestaurantId && cartRestaurantId !== finalRestaurantId &&
        cartRestaurantId !== restaurantData?._id?.toString() &&
        cartRestaurantId !== restaurantData?.restaurantId) {
        console.error('❌ CRITICAL: Final validation failed - restaurantId mismatch!', {
          cartRestaurantId: cartRestaurantId,
          finalRestaurantId: finalRestaurantId,
          restaurantDataId: restaurantData?._id?.toString(),
          restaurantDataRestaurantId: restaurantData?.restaurantId,
          cartRestaurantName: cart[0]?.restaurant,
          finalRestaurantName: finalRestaurantName
        });
        alert('Error: Restaurant information mismatch detected. Please refresh the page and try again.');
        setIsPlacingOrder(false);
        return;
      }

      const orderPayload = {
        items: orderItems,
        address: defaultAddress,
        restaurantId: finalRestaurantId,
        restaurantName: finalRestaurantName,
        pricing: orderPricing,
        note: note || "",
        sendCutlery: sendCutlery !== false,
        paymentMethod: selectedPaymentMethod,
        zoneId: zoneId // CRITICAL: Pass zoneId for strict zone validation
      };
      // Log final order details (including paymentMethod for COD debugging)

      // Check wallet balance if wallet payment selected
      if (selectedPaymentMethod === "wallet" && walletBalance < total) {
        toast.error(`Insufficient wallet balance. Required: ₹${formatAmount(total)}, Available: ₹${formatAmount(walletBalance)}`)
        setIsPlacingOrder(false)
        return
      }

      // Create order in backend
      const orderResponse = await orderAPI.createOrder(orderPayload)

        errorMessage = `Network Error: Cannot connect to backend server.\n\n` +
          `Expected backend URL: ${backendUrl}\n\n` +
          `Please check:\n` +
          `1. Backend server is running\n` +
          `2. Backend is accessible at ${backendUrl}\n` +
          `3. Check browser console (F12) for more details\n\n` +
          `If backend is not running, start it with:\n` +
          `cd appzetofood/backend && npm start`

        console.error("🔴 Network Error Details:", {
          code: error.code,
          message: error.message,
          config: {
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            fullUrl: error.config?.baseURL + error.config?.url,
            method: error.config?.method
          },
          backendUrl: backendUrl,
          apiBaseUrl: API_BASE_URL
        })

        // Try to test backend connectivity
        try {
          fetch(backendUrl + '/health', { method: 'GET', signal: AbortSignal.timeout(5000) })
            .then(response => {
              if (response.ok) {
                                const cartRestaurantName = cart[0]?.restaurant || restaurantName;

                                if (!cartRestaurantId || !cartRestaurantName) {
                                  console.error('❌ Cannot add addon: Missing restaurant information', {
                                    cartRestaurantId,
                                    cartRestaurantName,
                                    restaurantId,
                                    restaurantName,
                                    cartItem: cart[0]
                                  });
                                  toast.error('Restaurant information is missing. Please refresh the page.');
                                  return;
                                }

                                addToCart({
                                  id: addon.id || addon._id,
                                  name: addon.name,
                                  price: addon.price,
                                  image: addon.image || (addon.images && addon.images[0]) || "",
                                  description: addon.description || "",
                                  isVeg: true,
                                  restaurant: cartRestaurantName,
                                  restaurantId: cartRestaurantId
                                });
                              }}
                              className="absolute bottom-1 md:bottom-2 right-1 md:right-2 w-6 h-6 md:w-7 md:h-7 bg-card border border-primary rounded flex items-center justify-center shadow-sm hover:bg-primary/10 transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                            </button>
                          </div>
                          <p className="text-xs md:text-sm font-medium text-foreground mt-1.5 md:mt-2 line-clamp-2 leading-tight">{addon.name}</p>
                          {addon.description && (
                            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 line-clamp-1">{addon.description}</p>
                          )}
                          <p className="text-xs md:text-sm text-foreground font-semibold mt-0.5">₹{formatAmount(addon.price)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Coupon Section */}
              <div className="bg-card px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg md:rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Tag className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      <div>
                        <p className="text-sm md:text-base font-medium text-primary">'{appliedCoupon.code}' applied</p>
                        <p className="text-xs md:text-sm text-primary/80">You saved ₹{formatAmount(discount)}</p>
                      </div>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-muted-foreground text-xs md:text-sm font-medium">Remove</button>
                  </div>
                ) : loadingCoupons ? (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Percent className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                    <p className="text-sm md:text-base text-muted-foreground">Loading coupons...</p>
                  </div>
                ) : availableCoupons.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Percent className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm md:text-base font-medium text-foreground">
                            Save ₹{formatAmount(availableCoupons[0].discount)} with '{availableCoupons[0].code}'
                          </p>
                          {availableCoupons.length > 1 && (
                            <button onClick={() => setShowCoupons(!showCoupons)} className="text-xs md:text-sm text-primary font-medium">
                              View all coupons →
                            </button>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 md:h-8 text-xs md:text-sm border-primary text-primary hover:bg-primary/10"
                        onClick={() => handleApplyCoupon(availableCoupons[0])}
                        disabled={subtotal < availableCoupons[0].minOrder}
                      >
                        {subtotal < availableCoupons[0].minOrder ? `Min ₹${formatAmount(availableCoupons[0].minOrder)}` : 'APPLY'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Percent className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                    <p className="text-sm md:text-base text-muted-foreground">No coupons available</p>
                  </div>
                )}

                {/* Coupons List */}
                {showCoupons && !appliedCoupon && availableCoupons.length > 0 && (
                  <div className="mt-3 md:mt-4 space-y-2 md:space-y-3 border-t border-border pt-3 md:pt-4">
                    {availableCoupons.map((coupon) => (
                      <div key={coupon.code} className="flex items-center justify-between py-2 md:py-3 border-b border-dashed border-border last:border-0">
                        <div>
                          <p className="text-sm md:text-base font-medium text-foreground">{coupon.code}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">{coupon.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 md:h-7 text-xs md:text-sm border-primary text-primary hover:bg-primary/10"
                          onClick={() => handleApplyCoupon(coupon)}
                          disabled={subtotal < coupon.minOrder}
                        >
                          {subtotal < coupon.minOrder ? `Min ₹${formatAmount(coupon.minOrder)}` : 'APPLY'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery Time */}
              <div className="bg-card px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl">
                <div className="flex items-center gap-3 md:gap-4">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm md:text-base text-foreground">Delivery in <span className="font-semibold">{restaurantData?.estimatedDeliveryTime || "10-15 mins"}</span></p>
                  </div>
                </div>
              </div>


              {/* Delivery Address */}
              <div
                className="bg-card px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={openLocationSelector}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4 w-full">
                    <MapPin className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between w-full">
                        <p className="text-sm md:text-base text-foreground">
                          Delivery at <span className="font-semibold">Location</span>
                        </p>
                        <span className="text-primary font-medium text-xs md:text-sm">Edit</span>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {defaultAddress ? (formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || "Add delivery address") : "Add delivery address"}
                      </p>
                      {/* Address Selection Buttons */}
                      <div className="flex gap-2 mt-2">
                        {["Home", "Office", "Other"].map((label) => {
                          const addressExists = addresses.some(addr => addr.label === label)
                          return (
                            <button
                              key={label}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleSelectAddressByLabel(label)
                              }}
                              disabled={!addressExists}
                              className={`text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-md border transition-colors ${addressExists
                                ? 'border-border text-foreground hover:bg-muted bg-card'
                                : 'border-border/30 text-muted-foreground/50 cursor-not-allowed opacity-50'
                                }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-card px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl">
                <Link to="/user/profile" className="flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4">
                    <Phone className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                    <p className="text-sm md:text-base text-foreground">
                      {userProfile?.name || "Your Name"}, <span className="font-medium">{userProfile?.phone || "+91-XXXXXXXXXX"}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                </Link>
              </div>

              {/* Bill Details */}
              <div className="bg-card px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl">
                <button
                  onClick={() => setShowBillDetails(!showBillDetails)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                    <div className="text-left">
                      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                        <span className="text-sm md:text-base text-foreground">Total Bill</span>
                        <span className="text-sm md:text-base text-muted-foreground line-through">₹{formatAmount(totalBeforeDiscount)}</span>
                        <span className="text-sm md:text-base font-semibold text-foreground">₹{formatAmount(total)}</span>
                        {savings > 0 && (
                          <span className="text-xs md:text-sm bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 rounded font-medium">You saved ₹{formatAmount(savings)}</span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground">Incl. taxes and charges</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                </button>

                {showBillDetails && (
                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-dashed border-border space-y-2 md:space-y-3">
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">Item Total</span>
                      <span className="text-foreground">₹{formatAmount(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span className={deliveryFee === 0 ? "text-primary font-bold" : "text-foreground"}>
                        {deliveryFee === 0 ? "FREE" : `₹${formatAmount(deliveryFee)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span className="text-foreground">₹{formatAmount(platformFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">GST and Restaurant Charges</span>
                      <span className="text-foreground">₹{formatAmount(gstCharges)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm md:text-base text-primary">
                        <span>Coupon Discount</span>
                        <span>-₹{formatAmount(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm md:text-base font-semibold pt-2 md:pt-3 border-t border-border">
                      <span>To Pay</span>
                      <span>₹{formatAmount(total)}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column - Order Summary (Desktop) */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-4 md:space-y-6">
                {/* Bill Summary Card */}
                <div className="bg-card px-4 md:px-6 py-4 md:py-5 rounded-lg md:rounded-xl border border-border lg:shadow-sm">
                  <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Order Summary</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">Item Total</span>
                      <span className="text-foreground">₹{formatAmount(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span className={deliveryFee === 0 ? "text-primary font-bold" : "text-foreground"}>
                        {deliveryFee === 0 ? "FREE" : `₹${formatAmount(deliveryFee)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span className="text-foreground">₹{formatAmount(platformFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-muted-foreground">GST</span>
                      <span className="text-foreground">₹{formatAmount(gstCharges)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm md:text-base text-primary">
                        <span>Discount</span>
                        <span>-₹{formatAmount(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base md:text-lg font-bold pt-3 md:pt-4 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">₹{formatAmount(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky - Place Order */}
      <div className="bg-white dark:bg-[#1a1a1a] border-t dark:border-gray-800 shadow-lg z-30 flex-shrink-0 fixed bottom-0 left-0 right-0">
        <div className="w-full lg:max-w-[1100px] mx-auto">
          <div className="px-4 md:px-6 py-3 md:py-4">
            <div className="w-full max-w-md md:max-w-lg mx-auto">
              {/* Pay Using */}
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div className="leading-tight">
                    <p className="text-[11px] md:text-xs uppercase tracking-wide text-muted-foreground/80">
                      PAY USING
                    </p>
                    <p className="text-sm md:text-base font-medium text-foreground">
                      {selectedPaymentMethod === "razorpay"
                        ? "Razorpay"
                        : selectedPaymentMethod === "wallet"
                          ? "Wallet"
                          : "Cash on Delivery"}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="appearance-none bg-muted border border-border text-foreground rounded-lg px-3 py-2 pr-9 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="razorpay">Razorpay</option>
                    <option value="wallet">Wallet {walletBalance > 0 ? `(₹${formatAmount(walletBalance)})` : ''}</option>
                    <option value="cash">COD</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <Button
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || (selectedPaymentMethod === "wallet" && walletBalance < total)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 md:px-10 h-14 md:h-16 rounded-lg md:rounded-xl text-base md:text-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(selectedPaymentMethod === "razorpay" || selectedPaymentMethod === "wallet") && (
                  <div className="text-left mr-3 md:mr-4">
                    <p className="text-sm md:text-base opacity-90">₹{formatAmount(total)}</p>
                    <p className="text-xs md:text-sm opacity-75">TOTAL</p>
                  </div>
                )}
                <span className="font-bold text-base md:text-lg">
                  {isPlacingOrder
                    ? "Processing..."
                    : selectedPaymentMethod === "razorpay"
                      ? "Select Payment"
                      : selectedPaymentMethod === "wallet"
                        ? walletBalance >= total
                          ? "Place Order"
                          : "Insufficient Balance"
                        : "Place Order"}
                </span>
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Placing Order Modal */}
      {showPlacingOrder && (
        <div className="fixed inset-0 z-[60] h-screen w-screen overflow-hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ animation: 'slideUpModal 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="px-6 py-8">
              {/* Title */}
              <h2 className="text-2xl font-bold text-foreground mb-6">Placing your order</h2>

              {/* Payment Info */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl border border-border flex items-center justify-center bg-card shadow-sm">
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedPaymentMethod === "razorpay"
                      ? `Pay ₹${total.toFixed(2)} online (Razorpay)`
                      : selectedPaymentMethod === "wallet"
                        ? `Pay ₹${total.toFixed(2)} from Wallet`
                        : `Pay on delivery (COD)`}
                  </p>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-xl border border-border flex items-center justify-center bg-muted">
                  <svg className="w-7 h-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path d="M9 22V12h6v10" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Delivering to Location</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {defaultAddress ? (formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || "Address") : "Add address"}
                  </p>
                  <p className="text-sm text-muted-foreground/60">
                    {defaultAddress ? (formatFullAddress(defaultAddress) || "Address") : "Address"}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative mb-6">
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
                    style={{
                      width: `${orderProgress}%`,
                      boxShadow: '0 0 10px rgba(255, 112, 81, 0.5)'
                    }}
                  />
                </div>
                {/* Animated shimmer effect */}
                <div
                  className="absolute inset-0 h-2.5 rounded-full overflow-hidden pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    animation: 'shimmer 1.5s infinite',
                    width: `${orderProgress}%`
                  }}
                />
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowPlacingOrder(false)
                  setIsPlacingOrder(false)
                }}
                className="w-full text-right"
              >
                <span className="text-primary font-semibold text-base hover:text-primary/80 transition-colors">
                  CANCEL
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Celebration Page */}
      {showOrderSuccess && (
        <div
          className="fixed inset-0 z-[70] bg-white flex flex-col items-center justify-center h-screen w-screen overflow-hidden"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          {/* Confetti Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Animated confetti pieces */}
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                  backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
                  animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s infinite`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          {/* Success Content */}
          <div className="relative z-10 flex flex-col items-center px-6">
            {/* Success Tick Circle */}
            <div
              className="relative mb-8"
              style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both' }}
            >
              {/* Outer ring animation */}
              <div
                className="absolute inset-0 w-32 h-32 rounded-full border-4 border-primary"
                style={{
                  animation: 'ringPulse 1.5s ease-out infinite',
                  opacity: 0.3
                }}
              />
              {/* Main circle */}
              <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center shadow-2xl">
                <svg
                  className="w-16 h-16 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'checkDraw 0.5s ease-out 0.5s both' }}
                >
                  <path d="M5 12l5 5L19 7" className="check-path" />
                </svg>
              </div>
              {/* Sparkles */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    animation: `sparkle 0.6s ease-out ${0.3 + i * 0.1}s both`,
                    transform: `rotate(${i * 60}deg) translateY(-80px)`,
                  }}
                />
              ))}
            </div>

            {/* Location Info */}
            <div
              className="text-center"
              style={{ animation: 'slideUp 0.5s ease-out 0.6s both' }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-5 h-5 text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {defaultAddress?.city || "Your Location"}
                </h2>
              </div>
              <p className="text-muted-foreground text-base">
                {defaultAddress ? (formatFullAddress(defaultAddress) || defaultAddress?.formattedAddress || defaultAddress?.address || "Delivery Address") : "Delivery Address"}
              </p>
            </div>

            {/* Order Placed Message */}
            <div
              className="mt-12 text-center"
              style={{ animation: 'slideUp 0.5s ease-out 0.8s both' }}
            >
              <h3 className="text-3xl font-bold text-primary mb-2">Order Placed!</h3>
              <p className="text-muted-foreground">Your delicious food is on its way</p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGoToOrders}
              className="mt-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-12 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105"
              style={{ animation: 'slideUp 0.5s ease-out 1s both' }}
            >
              Track Your Order
            </button>
          </div>
        </div>
      )}

      {/* Addon Customization Modal */}
      <AnimatePresence>
        {showAddonModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddonModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-border bg-card sticky top-0 z-10">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground">Customize Item</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{selectedItemForAddons?.name}</p>
                </div>
                <button
                  onClick={() => setShowAddonModal(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {loadingCategoryAddons ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Fetching best addons for you...</p>
                  </div>
                ) : categoryAddons.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Select Addons</p>
                    {categoryAddons.map((addon) => (
                      <div
                        key={addon.id || addon._id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer active:scale-[0.98] ${selectedAddonsMap[addon.id || addon._id]
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                          : 'border-border hover:border-border/80 bg-card'
                          }`}
                        onClick={() => handleToggleAddon(addon.id || addon._id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${selectedAddonsMap[addon.id || addon._id] ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            }`}>
                            {selectedAddonsMap[addon.id || addon._id] && <Check className="h-4 w-4 text-white" />}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-base">{addon.name}</p>
                            <p className="text-sm text-primary font-bold mt-0.5">₹{formatAmount(addon.price)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No addons available for this category</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 md:p-6 border-t border-border bg-card sticky bottom-0 z-10">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Total Addons Price</span>
                    <span className="text-xl font-bold text-foreground">₹{formatAmount(currentAddonsTotal)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Final Item Price</span>
                    <span className="text-xl font-bold text-primary block">₹{formatAmount((selectedItemForAddons?.basePrice || selectedItemForAddons?.price || 0) + currentAddonsTotal)}</span>
                  </div>
                </div>
                <Button
                  onClick={handleSaveAddons}
                  disabled={loadingCategoryAddons}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Save Customization
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeInBackdrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUpBannerSmooth {
          from {
            transform: translateY(100%) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes slideUpBanner {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes shimmerBanner {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes scaleInBounce {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes pulseRing {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.4);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        @keyframes checkMarkDraw {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes slideUpFull {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes slideUpModal {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes checkDraw {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }
        @keyframes ringPulse {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.3);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        @keyframes sparkle {
          0% {
            transform: rotate(var(--rotation, 0deg)) translateY(0) scale(0);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation, 0deg)) translateY(-80px) scale(1);
            opacity: 0;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-slideUpFull {
          animation: slideUpFull 0.3s ease-out;
        }
        .check-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 0;
        }
      `}</style>
    </div>
  )
}
