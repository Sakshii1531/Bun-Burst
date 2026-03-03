import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { ChevronDown, ShoppingCart, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocation } from "../hooks/useLocation"
import { useCart } from "../context/CartContext"
import { useLocationSelector } from "./UserLayout"
import { FaLocationDot } from "react-icons/fa6"
import { getCachedSettings, loadBusinessSettings } from "@/lib/utils/businessSettings"
import appzetoFoodLogo from "@/assets/appzetologo.png"

export default function PageNavbar({
  textColor = "white",
  zIndex = 20,
  showProfile = false,
  onNavClick
}) {
  const { location, loading, requestLocation } = useLocation()
  const { getCartCount } = useCart()
  const { openLocationSelector } = useLocationSelector()
  const cartCount = getCartCount()
  const [logoUrl, setLogoUrl] = useState(null)
  const [companyName, setCompanyName] = useState(null)

  // Auto-trigger location fetch if we have placeholder values (only once on mount)
  useEffect(() => {
    if (location &&
      !loading &&
      requestLocation &&
      (location.formattedAddress === "Select location" ||
        location.city === "Current Location")) {
      // If area is available and different from mainTitle, append it
      if (location?.area && location.area.trim() !== "" &&
        location.area.toLowerCase() !== location.mainTitle.toLowerCase() &&
        location.area.toLowerCase() !== location?.city?.toLowerCase()) {
        mainLocation = `${location.mainTitle}, ${location.area}`;
      }
    }

    // Priority 1: Use formattedAddress if it contains complete detailed address (has multiple parts)
    // Format: "Mama Loca Cafe, 501 Princess Center, 5th Floor, New Palasia, Indore, Madhya Pradesh 452001"
    if (!mainLocation && location?.formattedAddress && !isCoordinates(location.formattedAddress) && location.formattedAddress !== "Select location") {
      const formattedParts = location.formattedAddress.split(',').map(p => p.trim()).filter(p => p.length > 0)

      // Check if formattedAddress has complete address (4+ parts means it has POI, building, area, city, state)
      if (formattedParts.length >= 4) {
 i >= 0; i--) {
            const part = parts[i]
            if (part && part.toLowerCase() !== location.city.toLowerCase() &&
              !part.match(/^\d+/) && part.length > 2 &&
              !part.toLowerCase().includes("madhya") &&
              !part.toLowerCase().includes("pradesh") &&
              part.toLowerCase() !== "india") {
              mainLocation = `${part}, ${location.city}`
