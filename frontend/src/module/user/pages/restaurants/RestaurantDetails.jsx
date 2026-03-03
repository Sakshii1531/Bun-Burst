import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { restaurantAPI, diningAPI, adminAPI } from "@/lib/api"
import { API_BASE_URL } from "@/lib/api/config"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useLocation } from "../../hooks/useLocation"
import { useZone } from "../../hooks/useZone"
import {
  ArrowLeft,
  Search,
  MoreVertical,
  MapPin,
  Clock,
  Tag,
  ChevronDown,
  Info,
  Star,
  SlidersHorizontal,
  Utensils,
  Flame,
  Bookmark,
  Share2,
  Plus,
  Minus,
  X,
  RotateCcw,
  Zap,
  Check,
  Lock,
  Percent,
  Eye,
  Users,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import AnimatedPage from "../../components/AnimatedPage"
import { useCart } from "../../context/CartContext"
import { useProfile } from "../../context/ProfileContext"
import AddToCartAnimation from "../../components/AddToCartAnimation"
import { getCompanyNameAsync } from "@/lib/utils/businessSettings"
import { isModuleAuthenticated } from "@/lib/utils/auth"



export default function RestaurantDetails() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showOnlyUnder250 = searchParams.get('under250') === 'true'
  const { addToCart, updateQuantity, removeFromCart, getCartItem, cart } = useCart()
  const { vegMode, addDishFavorite, removeDishFavorite, isDishFavorite, getDishFavorites, getFavorites, addFavorite, removeFavorite, isFavorite } = useProfile()
  const { location: userLocation } = useLocation() // Get user's current location
  const { zoneId, zone, loading: loadingZone, isOutOfService } = useZone(userLocation) // Get user's zone for zone-based filtering
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [quantities, setQuantities] = useState({})
  const [showManageCollections, setShowManageCollections] = useState(false)
  const [showItemDetail, setShowItemDetail] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [showLocationSheet, setShowLocationSheet] = useState(false)
  const [showScheduleSheet, setShowScheduleSheet] = useState(false)
  const [showOffersSheet, setShowOffersSheet] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [expandedCoupons, setExpandedCoupons] = useState(new Set())
  const [showMenuSheet, setShowMenuSheet] = useState(false)
  const [showLargeOrderMenu, setShowLargeOrderMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMenuOptionsSheet, setShowMenuOptionsSheet] = useState(false)
  const [expandedAddButtons, setExpandedAddButtons] = useState(new Set())
  const [expandedSections, setExpandedSections] = useState(new Set([0])) // Default: Recommended section is expanded
  const [filters, setFilters] = useState({
    sortBy: null, // "low-to-high" | "high-to-low"
    vegNonVeg: null, // "veg" | "non-veg"
  })

  // Addon states
  const [itemAddons, setItemAddons] = useState([])
  const [selectedAddons, setSelectedAddons] = useState([])
  const [loadingAddons, setLoadingAddons] = useState(false)

  // Restaurant data state
  const [restaurant, setRestaurant] = useState(null)
  const [loadingRestaurant, setLoadingRestaurant] = useState(true)
  const [restaurantError, setRestaurantError] = useState(null)
  const fetchedRestaurantRef = useRef(false) // Track if restaurant has been fetched for current slug

  // Fetch restaurant data from API
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!slug) return

      // Prevent re-fetching if we've already fetched for this slug and zoneId hasn't changed meaningfully
      // Only re-fetch if slug changed or if we're waiting for zoneId and it just became available
      if (fetchedRestaurantRef.current && restaurant && restaurant.slug === slug) {
        // Only re-fetch if zoneId changed from null to a value (zone just detected)
        if (zoneId && !loadingZone) {
          // Zone is available, but we already have restaurant data - don't re-fetch
          return
        }
      }

      try {
        setLoadingRestaurant(true)
        setRestaurantError(null)

      return;
    }

    // Generate a unique ID if there are addons
    const cartItemId = addons.length > 0
      ? `${item.id}-${addons.map(a => a._id || a.id).sort().join('-')}`
      : item.id

    // Update local state (only for the base item to show quantity badge in list)
    setQuantities((prev) => ({
      ...prev,
      [item.id]: newQuantity,
    }))

    // CRITICAL: Validate restaurant data before adding to cart
    if (!restaurant || !restaurant.name) {
      console.error('❌ Cannot add item to cart: Restaurant data is missing!');
      toast.error('Restaurant information is missing. Please refresh the page.');
      return;
    }

    // Ensure we have a valid restaurantId
    const validRestaurantId = restaurant?.restaurantId || restaurant?._id || restaurant?.id;
    if (!validRestaurantId) {
      console.error('❌ Cannot add item to cart: Restaurant ID is missing!');
      toast.error('Restaurant ID is missing. Please refresh the page.');
      return;
    }

    // Prepare cart item with all required properties
    const addonsPrice = addons.reduce((sum, addon) => sum + (addon.price || 0), 0)
    const cartItem = {
      id: cartItemId,
      baseItemId: item.id, // Store original ID
      name: item.name,
      price: item.price + addonsPrice,
      basePrice: item.price,
      addons: addons.map(a => ({ addonId: a._id || a.id, name: a.name, price: a.price })), // Keep for backward compatibility
      selectedAddons: addons.map(a => ({ addonId: a._id || a.id, name: a.name, price: a.price })), // New field as requested
      image: item.image,
      restaurant: restaurant.name,
      restaurantId: validRestaurantId,
      categoryId: item.categoryId || null,
      category: item.category || item.categoryName || item.sectionName || null,
      categoryName: item.categoryName || item.category || item.sectionName || null,
      sectionName: item.sectionName || null,
      description: item.description,
      originalPrice: item.originalPrice ? (item.originalPrice + addonsPrice) : null,
      isVeg: item.isVeg !== false
    }

    // Get source position for animation
    let sourcePosition = null
    if (event) {
      let buttonElement = event.currentTarget
      if (!buttonElement && event.target) {
        buttonElement = event.target.closest('button') || event.target
      }

      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect()
        sourcePosition = {
          viewportX: rect.left + rect.width / 2,
          viewportY: rect.top + rect.height / 2,
          scrollX: window.pageXOffset || window.scrollX || 0,
          scrollY: window.pageYOffset || window.scrollY || 0,
          itemId: cartItemId,
        }
      }
    }

    // Update cart context
    try {
      if (newQuantity <= 0) {
        removeFromCart(cartItemId, sourcePosition, { id: cartItemId, name: item.name, imageUrl: item.image })
      } else {
        const existingCartItem = getCartItem(cartItemId)
        if (existingCartItem) {
          if (newQuantity > existingCartItem.quantity) {
            addToCart(cartItem, sourcePosition)
          } else {
            updateQuantity(cartItemId, newQuantity, sourcePosition, { id: cartItemId, name: item.name, imageUrl: item.image })
          }
        } else {
          addToCart(cartItem, sourcePosition)
        }
      }
    } catch (error) {
      console.error('❌ Error updating cart:', error);
      toast.error(error.message || 'Error updating cart');
    }
  }

  // Menu categories - dynamically generated from restaurant menu sections
  const menuCategories = (restaurant?.menuSections && Array.isArray(restaurant.menuSections))
    ? restaurant.menuSections.map((section, index) => {
      // Handle section name - check for valid non-empty string
      let sectionTitle = "Unnamed Section"
      if (index === 0) {
        sectionTitle = "Recommended for you"
      } else if (section?.name && typeof section.name === 'string' && section.name.trim()) {
        sectionTitle = section.name.trim()
      } else if (section?.title && typeof section.title === 'string' && section.title.trim()) {
        sectionTitle = section.title.trim()
      }

      const itemCount = section?.items?.length || 0
      const subsectionCount = section?.subsections?.reduce((sum, sub) => sum + (sub?.items?.length || 0), 0) || 0
      const totalCount = itemCount + subsectionCount

      return {
        name: sectionTitle,
        count: totalCount,
        sectionIndex: index,
      }
    })
    : []

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.sortBy) count++
    if (filters.vegNonVeg) count++
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  // Handle bookmark click
  const handleBookmarkClick = (item) => {
    const restaurantId = restaurant?.restaurantId || restaurant?._id || restaurant?.id
    if (!restaurantId) {
      toast.error("Restaurant information is missing")
      return
    }

    const dishId = item.id || item._id
    if (!dishId) {
      toast.error("Dish information is missing")
      return
    }

    const isFavorite = isDishFavorite(dishId, restaurantId)

    if (isFavorite) {
      // If already bookmarked, remove it
      removeDishFavorite(dishId, restaurantId)
      toast.success("Dish removed from favorites")
    } else {
      // Add to favorites
      const dishData = {
        id: dishId,
        name: item.name,
        description: item.description,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        restaurantId: restaurantId,
        restaurantName: restaurant?.name || "",
        restaurantSlug: restaurant?.slug || slug || "",
        foodType: item.foodType,
        isSpicy: item.isSpicy,
        customisable: item.customisable,
      }
      addDishFavorite(dishData)
      toast.success("Dish added to favorites")
    }
  }

  // Handle add to collection
  const handleAddToCollection = () => {
    const restaurantSlug = restaurant?.slug || slug || ""

    if (!restaurantSlug) {
      toast.error("Restaurant information is missing")
      return
    }

    if (!restaurant) {
      toast.error("Restaurant data not available")
      return
    }

    const isAlreadyFavorite = isFavorite(restaurantSlug)

    if (isAlreadyFavorite) {
      // Remove from collection
      removeFavorite(restaurantSlug)
      toast.success("Restaurant removed from collection")
    } else {
      // Add to collection
      addFavorite({
        slug: restaurantSlug,
        name: restaurant.name || "",
        cuisine: restaurant.cuisine || "",
        rating: restaurant.rating || 0,
        deliveryTime: restaurant.deliveryTime || restaurant.estimatedDeliveryTime || "",
        distance: restaurant.distance || "",
        priceRange: restaurant.priceRange || "",
        image: restaurant.profileImageUrl?.url || restaurant.image || ""
      })
      toast.success("Restaurant added to collection")
    }

    setShowMenuOptionsSheet(false)
  }

  // Handle share restaurant
  const handleShareRestaurant = async () => {
    const companyName = await getCompanyNameAsync()
    const restaurantSlug = restaurant?.slug || slug || ""
    const restaurantName = restaurant?.name || "this restaurant"

    // Create share URL
    const shareUrl = `${window.location.origin}/user/restaurants/${restaurantSlug}`
    const shareText = `Check out ${restaurantName} on ${companyName}! ${shareUrl}`

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurantName,
          text: shareText,
          url: shareUrl,
        })
        toast.success("Restaurant shared successfully")
        setShowMenuOptionsSheet(false)
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== "AbortError") {
          // Fallback to copy to clipboard
          await copyToClipboard(shareUrl)
        }
      }
    } else {
      // Fallback to copy to clipboard
      await copyToClipboard(shareUrl)
    }
  }



  // Handle share click
  const handleShareClick = async (item) => {
    const restaurantId = restaurant?.restaurantId || restaurant?._id || restaurant?.id
    const dishId = item.id || item._id
    const restaurantSlug = restaurant?.slug || slug || ""

    // Create share URL
    const shareUrl = `${window.location.origin}/user/restaurants/${restaurantSlug}?dish=${dishId}`
    const shareText = `Check out ${item.name} from ${restaurant?.name || "this restaurant"}! ${shareUrl}`

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${item.name} - ${restaurant?.name || ""}`,
          text: shareText,
          url: shareUrl,
        })
        toast.success("Dish shared successfully")
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== "AbortError") {
          // Fallback to copy to clipboard
          await copyToClipboard(shareUrl)
        }
      }
    } else {
      // Fallback to copy to clipboard
      await copyToClipboard(shareUrl)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Link copied to clipboard!")
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.opacity = "0"
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand("copy")
        toast.success("Link copied to clipboard!")
      } catch (err) {
        toast.error("Failed to copy link")
      }
      document.body.removeChild(textArea)
    }
  }

  // Handle item card click
  const handleItemClick = (item) => {
    setSelectedItem(item)
    setSelectedAddons([]) // Reset selected addons when opening item
    setShowItemDetail(true)
  }

  // Fetch addons when selectedItem changes
  useEffect(() => {
    const fetchItemAddons = async (categoryId) => {
      try {
        setLoadingAddons(true)
        const response = await adminAPI.getAddonsByCategory(categoryId)
        if (response.data?.success) {
          setItemAddons(response.data.data.addons || [])
        }
      } catch (error) {
        console.error("Error fetching item addons:", error)
        setItemAddons([])
      } finally {
        setLoadingAddons(false)
      }
    }

    if (showItemDetail && selectedItem?.categoryId) {
      fetchItemAddons(selectedItem.categoryId)
    } else if (!showItemDetail) {
      setItemAddons([])
      setSelectedAddons([])
    }
  }, [showItemDetail, selectedItem])

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const isSelected = prev.find(a => a._id === addon._id)
      if (isSelected) {
        return prev.filter(a => a._id !== addon._id)
      } else {
        return [...prev, addon]
      }
    })
  }

  const calculateTotalPrice = () => {
    if (!selectedItem) return 0
    const basePrice = selectedItem.price || 0
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0)
    return basePrice + addonsPrice
  }

  // Helper function to calculate final price after discount
  const getFinalPrice = (item) => {
    // If discount exists, calculate from originalPrice, otherwise use price directly
    if (item.originalPrice && item.discountAmount && item.discountAmount > 0) {
      // Calculate discounted price from originalPrice
      let discountedPrice = item.originalPrice;
      if (item.discountType === 'Percent') {
        discountedPrice = item.originalPrice - (item.originalPrice * item.discountAmount / 100);
      } else if (item.discountType === 'Fixed') {
        discountedPrice = item.originalPrice - item.discountAmount;
      }
      return Math.max(0, discountedPrice);
    }
    // Otherwise, use price as the final price
    return Math.max(0, item.price || 0);
  };

  // Filter menu items based on active filters
  const filterMenuItems = (items) => {
    if (!items) return items

    return items.filter((item) => {
      // Under 250 filter (when coming from Under 250 page)
      if (showOnlyUnder250) {
        const finalPrice = getFinalPrice(item);
        if (finalPrice > 250) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const itemName = item.name?.toLowerCase() || ""
        if (!itemName.includes(query)) return false
      }

      // VegMode filter - when vegMode is ON, show only Veg items
      // When vegMode is false/null/undefined, show all items (Veg and Non-Veg)
      if (vegMode === true) {
        if (item.foodType !== "Veg") return false
      }

      // Veg/Non-veg filter (local filter override)
      if (filters.vegNonVeg === "veg") {
        // Show only veg items
        if (item.foodType !== "Veg") return false
      }
      if (filters.vegNonVeg === "non-veg") {
        // Show only non-veg items
        if (item.foodType !== "Non-Veg") return false
      }


      return true
    })
  }

  // Sort items based on sortBy filter
  const sortMenuItems = (items) => {
    if (!items) return items
    if (!filters.sortBy) return items

    const sorted = [...items]
    if (filters.sortBy === "low-to-high") {
      return sorted.sort((a, b) => getFinalPrice(a) - getFinalPrice(b))
    } else if (filters.sortBy === "high-to-low") {
      return sorted.sort((a, b) => getFinalPrice(b) - getFinalPrice(a))
    }
    return sorted
  }

  // Helper function to check if a section has any items under ₹250
  const sectionHasItemsUnder250 = (section) => {
    if (!showOnlyUnder250) return true; // If not filtering, show all sections

    // Check direct items
    if (section.items && section.items.length > 0) {
      const hasUnder250Items = section.items.some(item => {
        if (item.isAvailable === false) return false;
        const finalPrice = getFinalPrice(item);
        return finalPrice <= 250;
      });
      if (hasUnder250Items) return true;
    }

    // Check subsection items
    if (section.subsections && section.subsections.length > 0) {
      for (const subsection of section.subsections) {
        if (subsection.items && subsection.items.length > 0) {
          const hasUnder250Items = subsection.items.some(item => {
            if (item.isAvailable === false) return false;
            const finalPrice = getFinalPrice(item);
            return finalPrice <= 250;
          });
          if (hasUnder250Items) return true;
        }
      }
    }

    return false;
  }

  // Filter sections to only show those with items under ₹250
  // Returns array of { section, originalIndex } to preserve original index for expanded sections
  const getFilteredSections = () => {
    if (!restaurant?.menuSections) return [];
    if (!showOnlyUnder250) {
      return restaurant.menuSections.map((section, index) => ({ section, originalIndex: index }));
    }

    return restaurant.menuSections
      .map((section, index) => ({ section, originalIndex: index }))
      .filter(({ section }) => sectionHasItemsUnder250(section));
  }

  // Highlight offers/texts for the blue offer line
  const highlightOffers = [
    "Upto 50% OFF",
    restaurant?.offerText || "",
    ...(Array.isArray(restaurant?.offers) ? restaurant.offers.map((offer) => offer?.title || "") : []),
  ]

  // Auto-rotate images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        const offersLength = Array.isArray(restaurant?.offers) ? restaurant.offers.length : 1
        return (prev + 1) % offersLength
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [restaurant?.offers?.length || 0])

  // Auto-rotate highlight offer text every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightIndex((prev) => (prev + 1) % highlightOffers.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [highlightOffers.length])

  // Show loading state
  if (loadingRestaurant) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
            <span className="text-sm text-gray-600">Loading restaurant...</span>
          </div>
        </div>
      </AnimatedPage>
    )
  }

  // Show error state if restaurant not found or network error
  if (restaurantError && !restaurant) {
    const isNetworkError = restaurantError.includes('Backend server is not connected')
    const isNotFoundError = restaurantError === 'Restaurant not found'

    return (
      <AnimatedPage>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className={`h-12 w-12 ${isNetworkError ? 'text-orange-500' : 'text-red-500'}`} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {isNetworkError ? 'Connection Error' : isNotFoundError ? 'Restaurant not found' : 'Error'}
              </h2>
              <p className="text-sm text-gray-600 mb-4 max-w-md">{restaurantError}</p>
              {isNetworkError && (
                <p className="text-xs text-gray-500 mb-4">
                  Make sure the backend server is running at {API_BASE_URL.replace('/api', '')}
                </p>
              )}
              <Button onClick={() => navigate(-1)} variant="outline">
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </AnimatedPage>
    )
  }

  // Show error if restaurant is still null
  if (!restaurant) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <span className="text-sm text-gray-600">Restaurant not found</span>
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </AnimatedPage>
    )
  }

  // Only show grayscale when user is out of service (not based on restaurant availability)
  const shouldShowGrayscale = isOutOfService

  return (
    <AnimatedPage
      id="scrollingelement"
      className={`min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col transition-all duration-300 ${shouldShowGrayscale ? 'grayscale opacity-75' : ''
        }`}
    >
      {/* Header - Back, Search, Menu (like reference image) */}
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pt-3 md:pt-4 lg:pt-5 pb-2 md:pb-3 bg-white dark:bg-[#1a1a1a]">
        <div className="w-full lg:max-w-[1100px] mx-auto flex items-center justify-between">
          {/* Back Button */}
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1a1a1a]"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white" />
          </Button>

          {/* Right side: Search pill + menu */}
          <div className="flex items-center gap-3">
            {!showSearch ? (
              <Button
                variant="outline"
                className="rounded-full h-10 px-4 border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1a1a1a] flex items-center gap-2 text-gray-900 dark:text-white"
                onClick={() => setShowSearch(true)}
              >
                <Search className="h-4 w-4" />
                <span className="text-sm font-medium">Search</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for dishes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1a1a1a] text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    autoFocus
                    onBlur={() => {
                      if (!searchQuery) {
                        setShowSearch(false)
                      }
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("")
                        setShowSearch(false)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1a1a1a]"
              onClick={() => setShowMenuOptionsSheet(true)}
            >
              <MoreVertical className="h-5 w-5 text-gray-900 dark:text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-t-3xl relative z-10 min-h-[40vh] pb-[160px] md:pb-[160px]">
        <div className="w-full lg:max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-4 sm:py-5 md:py-6 lg:py-8 space-y-3 md:space-y-4 lg:space-y-5 pb-0">
          {/* Restaurant Name and Rating */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{restaurant?.name || "Unknown Restaurant"}</h1>
              <Info className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex flex-col items-end">
              <Badge className="bg-green-500 text-white mb-1 flex items-center gap-1 px-2 py-1">
                <Star className="h-3 w-3 fill-white" />
                {restaurant?.rating ?? 4.5}
              </Badge>
              <span className="text-xs text-gray-500">By {(restaurant.reviews || 0).toLocaleString()}+</span>
            </div>
          </div>

          {/* Location */}
          <div
            className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            onClick={() => setShowLocationSheet(true)}
          >
            <MapPin className="h-4 w-4" />
            <span>{restaurant?.distance || "1.2 km"} · {restaurant?.location || "Location"}</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>

          {/* Delivery Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Clock className="h-4 w-4" />
              <span>{restaurant?.deliveryTime || "25-30 mins"}</span>
            </div>
          </div>

          {/* Offers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm overflow-hidden">
              <Tag className="h-4 w-4 text-blue-600" />
              <div className="relative h-5 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={highlightIndex}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-blue-600 font-medium inline-block"
                  >
                    {highlightOffers[highlightIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Filter/Category Buttons */}
          <div className="border-y border-gray-200 py-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 w-max">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 whitespace-nowrap border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] relative"
                onClick={() => setShowFilterSheet(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`flex items-center gap-1.5 whitespace-nowrap border-gray-300 bg-white rounded-full ${filters.vegNonVeg === "veg" ? "border-green-500 bg-green-50" : ""
                  }`}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    vegNonVeg: prev.vegNonVeg === "veg" ? null : "veg",
                  }))
                }
              >
                <div className="h-3 w-3 rounded-full bg-green-500" />
                Veg
                {filters.vegNonVeg === "veg" && (
                  <X className="h-3 w-3 text-gray-600" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`flex items-center gap-1.5 whitespace-nowrap border-gray-300 bg-white rounded-full ${filters.vegNonVeg === "non-veg" ? "border-amber-700 bg-amber-50" : ""
                  }`}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    vegNonVeg: prev.vegNonVeg === "non-veg" ? null : "non-veg",
                  }))
                }
              >
                <div className="h-3 w-3 rounded-full bg-amber-700" />
                Non-veg
                {filters.vegNonVeg === "non-veg" && (
                  <X className="h-3 w-3 text-gray-600" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Menu Items Section */}
        {restaurant?.menuSections && Array.isArray(restaurant.menuSections) && restaurant.menuSections.length > 0 && (
          <div className="w-full lg:max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 md:py-10 lg:py-12 space-y-6 md:space-y-8 lg:space-y-10">
            {getFilteredSections().map(({ section, originalIndex }, sectionIndex) => {
              // Handle section name - check for valid non-empty string
              let sectionTitle = "Unnamed Section"
              if (originalIndex === 0) {
                sectionTitle = "Recommended for you"
              } else if (section?.name && typeof section.name === 'string' && section.name.trim()) {
                sectionTitle = section.name.trim()
              } else if (section?.title && typeof section.title === 'string' && section.title.trim()) {
                sectionTitle = section.title.trim()
              }
              const sectionId = `menu-section-${originalIndex}`

              const isExpanded = expandedSections.has(originalIndex)

              return (
                <div key={sectionIndex} id={sectionId} className="space-y-4 scroll-mt-20">
                  {/* Section Header */}
                  {sectionIndex === 0 && (
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Recommended for you
                      </h2>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedSections(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(originalIndex)) {
                              newSet.delete(originalIndex)
                            } else {
                              newSet.add(originalIndex)
                            }
                            return newSet
                          })
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <ChevronDown
                          className={`h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'
                            }`}
                        />
                      </button>
                    </div>
                  )}
                  {sectionIndex > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                          {(section?.name && typeof section.name === 'string' && section.name.trim())
                            ? section.name.trim()
                            : (section?.title && typeof section.title === 'string' && section.title.trim())
                              ? section.title.trim()
                              : "Unnamed Section"}
                        </h2>
                        {section.subtitle && (
                          <button className="text-sm text-blue-600 dark:text-blue-400 underline">
                            {section.subtitle}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedSections(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(originalIndex)) {
                              newSet.delete(originalIndex)
                            } else {
                              newSet.add(originalIndex)
                            }
                            return newSet
                          })
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        <ChevronDown
                          className={`h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'
                            }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Direct Items */}
                  {isExpanded && originalIndex === 0 && section.items && section.items.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                        No dish recommended
                      </p>
                    </div>
                  )}
                  {isExpanded && section.items && section.items.length > 0 && (
                    <div className="space-y-0">
                      {sortMenuItems(filterMenuItems(section.items)).map((item) => {
                        const quantity = quantities[item.id] || 0
                        // Determine veg/non-veg based on foodType
                        const isVeg = item.foodType === "Veg"

                        // Debug: Log preparationTime for troubleshooting
                        if (item.preparationTime) {
                        if (!subsection.items || subsection.items.length === 0) return false;
                        return subsection.items.some(item => {
                          if (item.isAvailable === false) return false;
                          const finalPrice = getFinalPrice(item);
                          return finalPrice <= 250;
                        });
                      }).map((subsection, subIndex) => {
                        const subsectionKey = `${originalIndex}-${subIndex}`
                        const isSubsectionExpanded = expandedSections.has(subsectionKey)

                        return (
                          <div key={subIndex} className="space-y-4">
                            {/* Subsection Header */}
                            <div className="flex items-center justify-between">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                {subsection?.name || subsection?.title || "Subsection"}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedSections(prev => {
                                    const newSet = new Set(prev)
                                    if (newSet.has(subsectionKey)) {
                                      newSet.delete(subsectionKey)
                                    } else {
                                      newSet.add(subsectionKey)
                                    }
                                    return newSet
                                  })
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                              >
                                <ChevronDown
                                  className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isSubsectionExpanded ? '' : '-rotate-90'
                                    }`}
                                />
                              </button>
                            </div>

                            {/* Subsection Items */}
                            {isSubsectionExpanded && subsection.items && subsection.items.length > 0 && (
                              <div className="space-y-0">
                                {sortMenuItems(filterMenuItems(subsection.items)).map((item) => {
                                  const quantity = quantities[item.id] || 0
                                  // Determine veg/non-veg based on foodType
                                  const isVeg = item.foodType === "Veg"

                                  // Debug: Log preparationTime for troubleshooting
                                  if (item.preparationTime) {
