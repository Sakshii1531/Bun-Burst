import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import { ArrowLeft, ChevronUp, ChevronDown, Clock, Edit2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { useCompanyName } from "@/lib/hooks/useCompanyName"

const STORAGE_KEY = "restaurant_outlet_timings"

// Helper function to convert "HH:mm" string to Date object
const stringToTime = (timeString) => {
  if (!timeString || !timeString.includes(":")) {
    return new Date(2000, 0, 1, 9, 0) // Default to 9:00 AM
  }
  const [hours, minutes] = timeString.split(":").map(Number)
  // Ensure valid hours (0-23) and minutes (0-59)
  const validHours = Math.max(0, Math.min(23, hours || 9))
  const validMinutes = Math.max(0, Math.min(59, minutes || 0))
  return new Date(2000, 0, 1, validHours, validMinutes)
}

// Helper function to convert Date object to "HH:mm" string
const timeToString = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "09:00"
  }
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

// Format time from 24-hour to 12-hour format for display
const formatTime12Hour = (time24) => {
  if (!time24) return "09:00 AM"
  const [hours, minutes] = time24.split(":").map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  const minutesStr = minutes.toString().padStart(2, '0')
  return `${hours12}:${minutesStr} ${period}`
}

const getDefaultDays = () => ({
  Monday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Tuesday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Wednesday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Thursday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Friday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Saturday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
  Sunday: { isOpen: true, openingTime: "09:00", closingTime: "22:00" },
})

export default function OutletTimings() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const [expandedDay, setExpandedDay] = useState("Monday")
  const isInternalUpdate = useRef(false)
  const [days, setDays] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Validate and ensure all days have proper structure
        const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        const validated = {}
        dayNames.forEach(day => {
          if (parsed[day]) {
            // Migrate from old slot-based format to new time-based format
            if (parsed[day].slots && Array.isArray(parsed[day].slots) && parsed[day].slots.length > 0) {
              const firstSlot = parsed[day].slots[0]
              // Convert slot format to time format
              const parseSlotTime = (time, period) => {
                if (!time) return "09:00"
                const [hours, minutes] = time.split(":").map(Number)
                let hour24 = hours || 9
                if (period === "pm" && hour24 !== 12) hour24 += 12
                if (period === "am" && hour24 === 12) hour24 = 0
                return `${hour24.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
              }
              validated[day] = {
                isOpen: parsed[day].isOpen !== undefined ? parsed[day].isOpen : true,
                openingTime: parseSlotTime(firstSlot.start, firstSlot.startPeriod || "am"),
                closingTime: parseSlotTime(firstSlot.end, firstSlot.endPeriod || "pm"),
              }
            } else {
              validated[day] = {
                isOpen: parsed[day].isOpen !== undefined ? parsed[day].isOpen : true,
                openingTime: parsed[day].openingTime || "09:00",
                closingTime: parsed[day].closingTime || "22:00",
              }
            }
          } else {
            validated[day] = { isOpen: true, openingTime: "09:00", closingTime: "22:00" }
          }
        })
        return validated
      }
    } catch (error) {
      console.error("Error loading outlet timings:", error)
    }
    return getDefaultDays()
  })

  // Save to localStorage whenever days change (but only if it's an internal update)
  useEffect(() => {
    if (isInternalUpdate.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(days))
        // Dispatch event to notify other components
        window.dispatchEvent(new Event("outletTimingsUpdated"))
      } catch (error) {
        console.error("Error saving outlet timings:", error)
      }
      isInternalUpdate.current = false
    }
  }, [days])

  // Listen for updates from other components
  useEffect(() => {
    const handleUpdate = () => {
      if (!isInternalUpdate.current) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const newDays = JSON.parse(saved)
            setDays(prevDays => {
              if (JSON.stringify(newDays) !== JSON.stringify(prevDays)) {
                return newDays
              }
              return prevDays
            })
          }
        } catch (error) {
          console.error("Error loading updated outlet timings:", error)
        }
      }
    }

    window.addEventListener("outletTimingsUpdated", handleUpdate)
    return () => window.removeEventListener("outletTimingsUpdated", handleUpdate)
  }, [])

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

  const toggleDay = (day) => {
    setExpandedDay(expandedDay === day ? null : day)
  }

  const toggleDayOpen = (day) => {
    isInternalUpdate.current = true
    setDays(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen
      }
    }))
  }

  const handleTimeChange = (day, timeType, newTime) => {
    if (!newTime) {
      console.warn('⚠️ No time value received in handleTimeChange')
      return
    }
    
    isInternalUpdate.current = true
    const timeString = timeToString(newTime)
    
    // Validate time string format
    if (!timeString || !timeString.includes(":")) {
      console.warn('⚠️ Invalid time string generated:', timeString)
      return
    }
    
