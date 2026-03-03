import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import Toast from "../components/Toast"
import { useLocation } from "@/module/user/hooks/useLocation"
import {
  MapPin,
  Bell,
  Search,
  Mic,
  ArrowRight,
  Home,
  Heart,
  ShoppingBag,
  Menu,
  ChefHat,
  Clock,
  Star,
  UtensilsCrossed,
  Store,
  Coffee,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const navigate = useNavigate()
  const { location, loading: locationLoading } = useLocation()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)
  const [wishlist, setWishlist] = useState(() => {
    // Load wishlist from localStorage
    const saved = localStorage.getItem('wishlist')
    return saved ? JSON.parse(saved) : []
  })
  const [toast, setToast] = useState({ show: false, message: '' })

  // Function to extract location parts for display
  // Main location: First 2 parts only (e.g., "Mama Loca, G-2")
  // Sub location: City and State (e.g., "New Palasia, Indore")
  const getLocationDisplay = (fullAddress, city, state, area) => {
    if (!fullAddress) {
      // Fallback: Use area and city/state if available
      if (area) {
        return {
          main: area,
          sub: city && state ? `${city}, ${state}` : city || state || ""
        }
      }
      if (city) {
        return {
          main: city,
          sub: state || ""
        }
      }
      return { main: "Select location", sub: "" }
    }

    // Split address by comma
    const parts = fullAddress.split(',').map(part => part.trim()).filter(part => part.length > 0)

    // Main location: First 2 parts only (e.g., "Mama Loca, G-2")
    let mainLocation = ""
    if (parts.length >= 2) {
      mainLocation = parts.slice(0, 2).join(', ')
    } else if (parts.length >= 1) {
      mainLocation = parts[0]
    }

    // Sub location: City and State (prefer from location object, fallback to address parts)
    let subLocation = ""
    if (city && state) {
      subLocation = `${city}, ${state}`
    } else if (city) {
      subLocation = city
    } else if (state) {
      subLocation = state
    } else if (parts.length >= 5) {
      // Fallback: Try to extract city and state from address parts
      // Usually city and state are in the middle/end of address
      const cityIndex = parts.findIndex(p =>
        p.toLowerCase().includes('indore') ||
        p.toLowerCase().includes('city') ||
        (p.length > 3 && !p.match(/^\d/))
      )
      if (cityIndex !== -1 && cityIndex < parts.length - 1) {
        subLocation = `${parts[cityIndex]}, ${parts[cityIndex + 1]}`
      }
    }

    return {
      main: mainLocation || "Select location",
      sub: subLocation
    }
  }

  // Get location from localStorage as fallback
  const [storedLocation, setStoredLocation] = useState(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userLocation')
      if (stored) {
        const parsed = JSON.parse(stored)
        setStoredLocation(parsed)
      }
    } catch (err) {
      console.error("Failed to parse stored location:", err)
    }
  }, [])

  // Use location from hook, fallback to stored location
  const currentLocation = location || storedLocation

  // Get display location parts
  // Priority: formattedAddress > address > area/city
  // IMPORTANT: Sub location ALWAYS uses city and state from location object, never from address parts
  const locationDisplay = (() => {
    let mainLocation = ""
    let subLocation = ""

    // Get main location from address (first 2 parts)
    if (currentLocation?.formattedAddress) {
      const parts = currentLocation.formattedAddress.split(',').map(part => part.trim()).filter(part => part.length > 0)
      if (parts.length >= 2) {
        mainLocation = parts.slice(0, 2).join(', ')
      } else if (parts.length >= 1) {
        mainLocation = parts[0]
      }
    } else if (currentLocation?.address) {
      const parts = currentLocation.address.split(',').map(part => part.trim()).filter(part => part.length > 0)
      if (parts.length >= 2) {
        mainLocation = parts.slice(0, 2).join(', ')
      } else if (parts.length >= 1) {
        mainLocation = parts[0]
      }
    } else if (currentLocation?.area) {
      mainLocation = currentLocation.area
    } else if (currentLocation?.city) {
      mainLocation = currentLocation.city
    } else {
      mainLocation = "Select location"
    }

    // Sub location: ALWAYS use city and state from location object (never from address parts)
    // Check if city and state exist in location object
    const hasCity = currentLocation?.city && currentLocation.city.trim() !== "" && currentLocation.city !== "Unknown City"
    const hasState = currentLocation?.state && currentLocation.state.trim() !== ""

    if (hasCity && hasState) {
      subLocation = `${currentLocation.city}, ${currentLocation.state}`
    } else if (hasCity) {
      subLocation = currentLocation.city
    } else if (hasState) {
      subLocation = currentLocation.state
    } else {
      // If city/state not available in location object, try to extract from formattedAddress
      // This is a fallback - formattedAddress format: "Mama Loca, G-2, Princess Center 6/3, Opposite Manpasand Garden, New Palasia, Indore, 452001, India"
      if (currentLocation?.formattedAddress) {
        const parts = currentLocation.formattedAddress.split(',').map(part => part.trim()).filter(part => part.length > 0)

        // For Indian addresses: city and state are usually before pincode (which is a 6-digit number)
        if (parts.length >= 4) {
          // Find pincode index (6-digit number)
          const pincodeIndex = parts.findIndex(part => /^\d{6}$/.test(part))

          if (pincodeIndex > 1) {
            // City is 2 positions before pincode, State is 1 position before pincode
            const cityPart = parts[pincodeIndex - 2]
            const statePart = parts[pincodeIndex - 1]

            // Validate: both should be non-empty and not numbers
            if (cityPart && statePart &&
              !cityPart.match(/^\d+$/) &&
              !statePart.match(/^\d+$/) &&
              cityPart.length > 2 &&
              statePart.length > 2) {
              subLocation = `${cityPart}, ${statePart}`
            }
          }

          // Method 2: Direct extraction - if we have 8 parts, city and state are at index 4 and 5
          // Format: "Mama Loca, G-2, Princess Center 6/3, Opposite Manpasand Garden, New Palasia, Indore, 452001, India"
          // parts[4] = "New Palasia" (city), parts[5] = "Indore" (state)
          if (!subLocation && parts.length >= 6) {
            // If we have pincode at index 6, city and state are at 4 and 5
            if (pincodeIndex === 6 && parts.length >= 7) {
              const cityPart = parts[4]
              const statePart = parts[5]

              if (cityPart && statePart &&
                !cityPart.match(/^\d+$/) &&
                !statePart.match(/^\d+$/) &&
                cityPart.length > 2 &&
                statePart.length > 2) {
                subLocation = `${cityPart}, ${statePart}`
              }
            }
          }

          // Method 3: Simple fallback - if we have 6+ parts, always try parts[4] and parts[5]
          // This is the most reliable method for the given address format
          if (!subLocation && parts.length >= 6) {
            // Directly use parts[4] and parts[5] if they look like city/state
            const cityPart = parts[4]
            const statePart = parts[5]

            if (cityPart && statePart &&
              !cityPart.match(/^\d+$/) &&
              !statePart.match(/^\d+$/) &&
              cityPart.length > 2 &&
              statePart.length > 2 &&
              !cityPart.toLowerCase().includes("center") &&
              !cityPart.toLowerCase().includes("princess") &&
              !cityPart.toLowerCase().includes("opposite") &&
              !cityPart.toLowerCase().includes("garden")) {
              subLocation = `${cityPart}, ${statePart}`
            }
          }

          // Method 4: Fallback - If pincode not found or extraction failed, try alternative method
          if (!subLocation && parts.length >= 4) {
            // Last part is usually "India", second last might be pincode
            const lastPart = parts[parts.length - 1]
            const secondLastPart = parts[parts.length - 2]

            // If last part is "India" and second last is pincode (6-digit)
            if (lastPart === "India" && /^\d{6}$/.test(secondLastPart)) {
              // City and state are 3 and 4 positions before "India"
              // Format: "..., New Palasia, Indore, 452001, India"
              // parts[length-1] = "India"
              // parts[length-2] = "452001" (pincode)
              // parts[length-3] = "Indore" (state)
              // parts[length-4] = "New Palasia" (city)
              const cityPart = parts[parts.length - 4]
              const statePart = parts[parts.length - 3]

              if (cityPart && statePart &&
                !cityPart.match(/^\d+$/) &&
                !statePart.match(/^\d+$/) &&
                cityPart.length > 2 &&
                statePart.length > 2) {
                subLocation = `${cityPart}, ${statePart}`
              }
            }
          }
        }
      }

      // If still empty, leave it empty
      if (!subLocation) {
        subLocation = ""
      }
    }

    return {
      main: mainLocation,
      sub: subLocation
    }
  })()

  // Debug: Log location data
  useEffect(() => {
