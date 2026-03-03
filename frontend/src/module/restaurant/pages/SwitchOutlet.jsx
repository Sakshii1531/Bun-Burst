import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import Lenis from "lenis"
import { ArrowLeft, Search, Power } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { clearModuleAuth } from "@/lib/utils/auth"
import { authAPI } from "@/lib/api"
import { firebaseAuth } from "@/lib/firebase"

export default function SwitchOutlet() {
  const navigate = useNavigate()
  const [showOffline, setShowOffline] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Mock outlet data - replace with actual data from your API/store
  const outlets = [
    {
      id: 20959122,
      name: "Kadhai Chammach Restaurant",
      address: "By Pass Road (South)",
      image: "/api/placeholder/80/80", // Replace with actual image URL
      status: "offline", // "online" or "offline"
    }
  ]

  const mappedOutletsCount = outlets.length

  // Filter outlets based on showOffline checkbox
  const visibleOutlets = showOffline 
    ? outlets 
    : outlets.filter(outlet => outlet.status === "online")

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

  const handleLogout = async () => {
    if (isLoggingOut) return // Prevent multiple clicks
    
    setIsLoggingOut(true)
    
    try {
      // Call backend logout API to invalidate refresh token
      try {
        await authAPI.logout()
      } catch (apiError) {
        // Continue with logout even if API call fails (network issues, etc.)
        console.warn("Logout API call failed, continuing with local cleanup:", apiError)
      }

      // Sign out from Firebase if user logged in via Google
      try {
        const { signOut } = await import("firebase/auth")
        const currentUser = firebaseAuth.currentUser
        if (currentUser) {
          await signOut(firebaseAuth)
        }
      } catch (firebaseError) {
        // Continue even if Firebase logout fails
        console.warn("Firebase logout failed, continuing with local cleanup:", firebaseError)
      }

      // Clear restaurant module authentication data
      clearModuleAuth("restaurant")
      
      // Clear any onboarding data from localStorage
      localStorage.removeItem("restaurant_onboarding")
      localStorage.removeItem("restaurant_accessToken")
      
      // Dispatch auth change event to notify other components
      window.dispatchEvent(new Event("restaurantAuthChanged"))

      // Small delay for UX, then navigate to welcome page
      setTimeout(() => {
        navigate("/restaurant/welcome", { replace: true })
      }, 300)
    } catch (error) {
      // Even if there's an error, we should still clear local data and logout
      console.error("Error during logout:", error)
      clearModuleAuth("restaurant")
      localStorage.removeItem("restaurant_onboarding")
      window.dispatchEvent(new Event("restaurantAuthChanged"))
      navigate("/restaurant/welcome", { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleOutletClick = (outletId) => {
    // Implement outlet switching logic here
