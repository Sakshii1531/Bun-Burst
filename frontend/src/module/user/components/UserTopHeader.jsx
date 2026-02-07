import { Link, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { ChevronDown, ShoppingCart, Search, Mic, MapPin, User, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useLocation } from "../hooks/useLocation"
import { useCart } from "../context/CartContext"
import { useLocationSelector, useSearchOverlay } from "./UserLayout"
import { getCachedSettings, loadBusinessSettings } from "@/lib/utils/businessSettings"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const DEFAULT_PLACEHOLDERS = [
    "Search \"burger\"",
    "Search \"biryani\"",
    "Search \"pizza\"",
    "Search \"desserts\"",
    "Search \"chinese\"",
    "Search \"thali\"",
    "Search \"momos\"",
    "Search \"dosa\""
]

export default function UserTopHeader({
    className = "",
    sticky = true,
    onVegModeChange,
    vegMode = false,
    showVegToggle = true,
    placeholders = DEFAULT_PLACEHOLDERS,
    showSearchAlways = false, // If true, search is visible on desktop too
}) {
    const navigate = useNavigate()
    const { location } = useLocation()
    const { getCartCount } = useCart()
    const { openLocationSelector } = useLocationSelector()
    const { openSearch, setSearchValue } = useSearchOverlay()
    const cartCount = getCartCount()
    const [logoUrl, setLogoUrl] = useState(null)
    const [companyName, setCompanyName] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [placeholderIndex, setPlaceholderIndex] = useState(0)

    // Load business settings logo
    useEffect(() => {
        const loadLogo = async () => {
            try {
                let cached = getCachedSettings()
                if (cached) {
                    if (cached.logo?.url) setLogoUrl(cached.logo.url)
                    if (cached.companyName) setCompanyName(cached.companyName)
                }

                const settings = await loadBusinessSettings()
                if (settings) {
                    if (settings.logo?.url) setLogoUrl(settings.logo.url)
                    if (settings.companyName) setCompanyName(settings.companyName)
                }
            } catch (error) {
                console.error('Error loading logo:', error)
            }
        }

        loadLogo()

        const handleSettingsUpdate = () => {
            const cached = getCachedSettings()
            if (cached) {
                if (cached.logo?.url) setLogoUrl(cached.logo.url)
                if (cached.companyName) setCompanyName(cached.companyName)
            }
        }
        window.addEventListener('businessSettingsUpdated', handleSettingsUpdate)

        return () => {
            window.removeEventListener('businessSettingsUpdated', handleSettingsUpdate)
        }
    }, [])

    // Animated placeholder cycling
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
        }, 2000)
        return () => clearInterval(interval)
    }, [placeholders.length])

    // Get location display
    const getLocationText = () => {
        if (!location) return "Select location"
        if (location.area && location.area.trim() !== "") return location.area
        if (location.city && location.city.trim() !== "" && location.city !== "Unknown City") return location.city
        if (location.formattedAddress && location.formattedAddress !== "Select location") {
            const parts = location.formattedAddress.split(',')
            return parts[0]?.trim() || "Select location"
        }
        return "Select location"
    }

    const handleSearchFocus = () => {
        if (searchQuery) {
            setSearchValue(searchQuery)
        }
        openSearch()
    }

    return (
        <header
            className={cn(
                "w-full bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-gray-800 z-50",
                sticky && "sticky top-0",
                className
            )}
        >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
                {/* Main Header Row */}
                <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
                    {/* Left: Logo */}
                    <div className="flex items-center flex-shrink-0 ml-2 lg:ml-1">
                        <Link to="/user" className="flex-shrink-0 group">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt={companyName || "Logo"}
                                    className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 object-contain rounded-lg hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300">
                                    <span className="text-white font-bold text-xl sm:text-2xl lg:text-3xl">
                                        {companyName?.[0] || "F"}
                                    </span>
                                </div>
                            )}
                        </Link>
                    </div>

                    {/* Desktop Search Center (NEW) */}
                    {(showSearchAlways) && (
                        <div className="hidden md:flex flex-1 max-w-xl mx-4">
                            <div className="w-full relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-md">
                                <div className="flex items-center gap-2.5 px-4 py-2">
                                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    <div className="flex-1 relative">
                                        <Input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={handleSearchFocus}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && searchQuery.trim()) {
                                                    navigate(`/user/search?q=${encodeURIComponent(searchQuery.trim())}`)
                                                }
                                            }}
                                            className="h-6 px-0 border-0 bg-transparent text-sm font-medium text-gray-700 dark:text-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
                                        />
                                        {!searchQuery && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none h-5 overflow-hidden">
                                                <AnimatePresence mode="wait">
                                                    <motion.span
                                                        key={placeholderIndex}
                                                        initial={{ y: 16, opacity: 0 }}
                                                        animate={{ y: 0, opacity: 1 }}
                                                        exit={{ y: -16, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="text-sm font-medium text-gray-400 inline-block text-nowrap"
                                                    >
                                                        {placeholders[placeholderIndex]}
                                                    </motion.span>
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={handleSearchFocus} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all">
                                        <Mic className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Center/Right: Location Selector */}
                    <div className={cn("hidden lg:flex items-center", showSearchAlways ? "flex-shrink-0" : "flex-1 justify-center")}>
                        <button
                            onClick={() => openLocationSelector()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 max-w-[300px]"
                        >
                            <MapPin className="h-5 w-5 text-purple-600 flex-shrink-0" />
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-full leading-tight">
                                    {getLocationText()}
                                </span>
                                {location?.state && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">
                                        {location.state}
                                    </span>
                                )}
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                    </div>

                    {/* Mobile Only Location (Compact) */}
                    <div className="lg:hidden flex-1 flex justify-center min-w-0">
                        <button onClick={() => openLocationSelector()} className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg max-w-[150px]">
                            <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0" />
                            <span className="text-sm font-bold truncate">{getLocationText()}</span>
                            <ChevronDown className="h-3 w-3 text-gray-400" />
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* VEG Toggle */}
                        {showVegToggle && (
                            <div className="hidden sm:flex flex-col items-center gap-0.5">
                                <span className="text-[9px] font-black text-green-700 dark:text-green-500 leading-none">VEG</span>
                                <Switch
                                    checked={vegMode}
                                    onCheckedChange={onVegModeChange}
                                    className="scale-90 data-[state=checked]:bg-green-600"
                                />
                            </div>
                        )}

                        {/* Actions Icons */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Link to="/user/wallet" className="hidden sm:block">
                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                                    <Wallet className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                </Button>
                            </Link>
                            <Link to="/user/cart" className="relative">
                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-purple-50 dark:hover:bg-purple-950/20">
                                    <ShoppingCart className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-[#0a0a0a]">
                                            {cartCount > 9 ? "9+" : cartCount}
                                        </span>
                                    )}
                                </Button>
                            </Link>
                            <Link to="/user/profile">
                                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-gray-100 dark:border-gray-800">
                                    <AvatarFallback className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 text-xs">
                                        <User className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Search Bar Row (Visible on Mobile/Tablet, hidden on Desktop if search is in header) */}
                <div className="md:hidden pb-3 px-1 flex items-center gap-3">
                    <div className="flex-1 relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-2.5 px-4 py-2.5">
                            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 relative">
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={handleSearchFocus}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchQuery.trim()) {
                                            navigate(`/user/search?q=${encodeURIComponent(searchQuery.trim())}`)
                                        }
                                    }}
                                    className="h-6 px-0 border-0 bg-transparent text-sm font-medium text-gray-700 dark:text-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
                                />
                                {!searchQuery && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none h-5 overflow-hidden">
                                        <AnimatePresence mode="wait">
                                            <motion.span
                                                key={placeholderIndex}
                                                initial={{ y: 16, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -16, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="text-sm font-medium text-gray-400 inline-block"
                                            >
                                                {placeholders[placeholderIndex]}
                                            </motion.span>
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                            <button type="button" onClick={handleSearchFocus} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all">
                                <Mic className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Veg Toggle */}
                    {showVegToggle && (
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <span className="text-[9px] font-black text-green-700 dark:text-green-500 leading-none">VEG</span>
                            <Switch
                                checked={vegMode}
                                onCheckedChange={onVegModeChange}
                                className="scale-90 data-[state=checked]:bg-green-600 shadow-sm border border-green-200 dark:border-green-900"
                            />
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
