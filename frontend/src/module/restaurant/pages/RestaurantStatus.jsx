import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Lenis from "lenis"
import { ArrowLeft, Settings, ChevronRight } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { restaurantAPI } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function RestaurantStatus() {
  const navigate = useNavigate()
  const [deliveryStatus, setDeliveryStatus] = useState(false)
  const [restaurantData, setRestaurantData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [isWithinTimings, setIsWithinTimings] = useState(null) // null = not calculated yet
  const [showOutletClosedDialog, setShowOutletClosedDialog] = useState(false)
  const [showOutsideTimingsDialog, setShowOutsideTimingsDialog] = useState(false)
  const [isDayClosed, setIsDayClosed] = useState(false)
  const [outletTimings, setOutletTimings] = useState(null)

  // Update current date/time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Fetch restaurant data from backend
  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true)
        const response = await restaurantAPI.getCurrentRestaurant()
        const data = response?.data?.data?.restaurant || response?.data?.restaurant
        if (data) {
          setRestaurantData(data)
        }
      } catch (error) {
        // Only log error if it's not a network/timeout error (backend might be down/slow)
        if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
          console.error("Error fetching restaurant data:", error)
        }
        // Continue with default values if fetch fails
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurantData()
  }, [])

  // Load outlet timings from localStorage
  useEffect(() => {
    const loadOutletTimings = () => {
      try {
        const saved = localStorage.getItem("restaurant_outlet_timings")
        if (saved) {
          const data = JSON.parse(saved)
          setOutletTimings(data)
        }
      } catch (error) {
        console.error("Error loading outlet timings:", error)
      }
    }

    loadOutletTimings()

    // Listen for outlet timings updates
    window.addEventListener("outletTimingsUpdated", loadOutletTimings)
    
    return () => {
      window.removeEventListener("outletTimingsUpdated", loadOutletTimings)
    }
  }, [])

  // Check if restaurant is currently open based on timings
  useEffect(() => {
    if (!restaurantData) return

    const checkIfOpen = () => {
      const now = new Date()
      const currentDayFull = now.toLocaleDateString('en-US', { weekday: 'long' }) // "Monday", "Tuesday", etc.
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }) // "Mon", "Tue", etc.
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTimeInMinutes = currentHour * 60 + currentMinute

      // First check outlet timings from localStorage (OutletTimings.jsx stores it there)
      const STORAGE_KEY = "restaurant_outlet_timings"
      let outletTimingsData = null
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          outletTimingsData = JSON.parse(saved)
          setOutletTimings(outletTimingsData)
        }
      } catch (error) {
        console.error("Error loading outlet timings:", error)
      }

      // Check if current day is closed in outlet timings
      if (outletTimingsData && outletTimingsData[currentDayFull]) {
        const dayData = outletTimingsData[currentDayFull]
        if (dayData.isOpen === false) {
          // Day is closed in outlet timings
          setIsDayClosed(true)
          setIsWithinTimings(false)
          setShowOutletClosedDialog(true)
          return
        }
        
        // Check time range if day is open and has timings
        if (dayData.isOpen && dayData.openingTime && dayData.closingTime) {
          // Parse opening and closing times (format: "HH:mm")
          const [openHour, openMinute] = dayData.openingTime.split(':').map(Number)
          const [closeHour, closeMinute] = dayData.closingTime.split(':').map(Number)
          
          const openingTimeInMinutes = openHour * 60 + openMinute
          const closingTimeInMinutes = closeHour * 60 + closeMinute

          // Handle case where closing time is next day (e.g., 22:00 to 02:00)
          let isWithin = false
          if (closingTimeInMinutes > openingTimeInMinutes) {
            // Normal case: same day
            isWithin = currentTimeInMinutes >= openingTimeInMinutes && currentTimeInMinutes <= closingTimeInMinutes
          } else {
            // Overnight case: closing time is next day
            isWithin = currentTimeInMinutes >= openingTimeInMinutes || currentTimeInMinutes <= closingTimeInMinutes
          }

          setIsWithinTimings(isWithin)
          setIsDayClosed(false)
          return
        }
      }

      setIsDayClosed(false)

      // Check if current day is in openDays (from backend)
      const openDays = restaurantData.openDays || []
      const isDayOpen = openDays.some(day => {
        const dayAbbr = day.substring(0, 3) // "Mon", "Tue", etc.
        return dayAbbr === currentDay
      })

      if (!isDayOpen) {
        setIsWithinTimings(false)
        return
      }

      // Check if current time is within delivery timings
      const deliveryTimings = restaurantData.deliveryTimings
      if (!deliveryTimings || !deliveryTimings.openingTime || !deliveryTimings.closingTime) {
        setIsWithinTimings(true) // Default to open if no timings set
        return
      }

      // Parse opening and closing times (format: "HH:mm")
      const [openHour, openMinute] = deliveryTimings.openingTime.split(':').map(Number)
      const [closeHour, closeMinute] = deliveryTimings.closingTime.split(':').map(Number)
      
      const openingTimeInMinutes = openHour * 60 + openMinute
      const closingTimeInMinutes = closeHour * 60 + closeMinute

      // Handle case where closing time is next day (e.g., 22:00 to 02:00)
      let isWithin = false
      if (closingTimeInMinutes > openingTimeInMinutes) {
        // Normal case: same day
        isWithin = currentTimeInMinutes >= openingTimeInMinutes && currentTimeInMinutes <= closingTimeInMinutes
      } else {
        // Overnight case: closing time is next day
        isWithin = currentTimeInMinutes >= openingTimeInMinutes || currentTimeInMinutes <= closingTimeInMinutes
      }

      setIsWithinTimings(isWithin)
    }

    checkIfOpen()
    // Recheck every minute
    const interval = setInterval(checkIfOpen, 60000)
    
    // Listen for outlet timings updates
    const handleOutletTimingsUpdate = () => {
      checkIfOpen()
    }
    window.addEventListener("outletTimingsUpdated", handleOutletTimingsUpdate)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener("outletTimingsUpdated", handleOutletTimingsUpdate)
    }
  }, [restaurantData, currentDateTime])

  // Note: Delivery status is now manually controlled by user via toggle
  // We don't automatically set it based on timings anymore
  // The isWithinTimings is only used to show warning messages

  // Load delivery status from backend and sync with localStorage
  useEffect(() => {
    const loadDeliveryStatus = async () => {
      try {
        // First try to get from backend
        const response = await restaurantAPI.getCurrentRestaurant()
        const restaurant = response?.data?.data?.restaurant || response?.data?.restaurant
        if (restaurant?.isAcceptingOrders !== undefined) {
          setDeliveryStatus(restaurant.isAcceptingOrders)
          // Sync localStorage with backend
          localStorage.setItem('restaurant_online_status', JSON.stringify(restaurant.isAcceptingOrders))
          // Dispatch event to update navbar
          window.dispatchEvent(new CustomEvent('restaurantStatusChanged', { 
            detail: { isOnline: restaurant.isAcceptingOrders } 
          }))
        } else {
          // Fallback to localStorage
          const savedStatus = localStorage.getItem('restaurant_online_status')
          if (savedStatus !== null) {
            const status = JSON.parse(savedStatus)
            setDeliveryStatus(status)
            // Dispatch event to update navbar
            window.dispatchEvent(new CustomEvent('restaurantStatusChanged', { 
              detail: { isOnline: status } 
            }))
          } else {
            // Default to false if not set
            setDeliveryStatus(false)
            // Dispatch event to update navbar
            window.dispatchEvent(new CustomEvent('restaurantStatusChanged', { 
              detail: { isOnline: false } 
            }))
          }
        }
      } catch (error) {
        // Only log error if it's not a network/timeout error (backend might be down/slow)
        if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
          console.error("Error loading delivery status:", error)
        }
        // Fallback to localStorage
        try {
          const savedStatus = localStorage.getItem('restaurant_online_status')
          if (savedStatus !== null) {
            const status = JSON.parse(savedStatus)
            setDeliveryStatus(status)
            window.dispatchEvent(new CustomEvent('restaurantStatusChanged', { 
              detail: { isOnline: status } 
            }))
          } else {
            setDeliveryStatus(false)
            window.dispatchEvent(new CustomEvent('restaurantStatusChanged', { 
              detail: { isOnline: false } 
            }))
          }
        } catch (localError) {
          setDeliveryStatus(false)
          window.dispatchEvent(new CustomEvent('restaurantStatusChanged', { 
            detail: { isOnline: false } 
          }))
        }
      }
    }

    loadDeliveryStatus()
  }, [])

  // Handle delivery status change
  const handleDeliveryStatusChange = async (checked) => {
    // If day is closed in outlet timings, don't allow turning on
    if (checked && isDayClosed) {
      setShowOutletClosedDialog(true)
      return
    }
    
    // If outside scheduled delivery timings, show popup
    if (checked && isWithinTimings === false && !isDayClosed) {
      setShowOutsideTimingsDialog(true)
      return
    }
    
    setDeliveryStatus(checked)
    try {
      // Save to localStorage
      localStorage.setItem('restaurant_online_status', JSON.stringify(checked))
      
      // Update backend
      try {
        await restaurantAPI.updateDeliveryStatus(checked)
