import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Loader2,
  Utensils,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  ThumbsUp
} from "lucide-react"
import RestaurantNavbar from "../components/RestaurantNavbar"
import BottomNavOrders from "../components/BottomNavOrders"
import { Switch } from "@/components/ui/switch"
import { useNavigate } from "react-router-dom"
import { restaurantAPI } from "@/lib/api"
import { toast } from "sonner"

const INVENTORY_STORAGE_KEY = "restaurant_inventory_state"

// Mock data - replace with actual data from API
const mockCategories = [
  {
    id: "combo",
    name: "Combo",
    description: "Combo",
    itemCount: 1,
    inStock: true,
    items: [
      { id: 1, name: "Manchurian with Rice", inStock: true, isVeg: true }
    ]
  },
  {
    id: "starters",
    name: "Starters",
    description: "Starters",
    itemCount: 2,
    inStock: true,
    items: [
      { id: 2, name: "Paneer Manchurian", inStock: true, isVeg: true },
      { id: 3, name: "Cheese Manchurian", inStock: true, isVeg: true }
    ]
  },
  {
    id: "main-course",
    name: "Main Course",
    description: "Main Course",
    itemCount: 2,
    inStock: true,
    items: [
      { id: 4, name: "Butter Chicken", inStock: true, isVeg: false },
      { id: 5, name: "Dal Makhani", inStock: true, isVeg: true }
    ]
  },
  {
    id: "rice",
    name: "Rice",
    description: "Rice and Biryani",
    itemCount: 1,
    inStock: false,
    items: [
      { id: 6, name: "Tava Pulao", inStock: false, isVeg: true }
    ]
  },
  {
    id: "desserts",
    name: "Desserts",
    description: "Desserts",
    itemCount: 3,
    inStock: false,
    items: [
      { id: 7, name: "Gulab Jamun", inStock: false, isVeg: true },
      { id: 8, name: "Ice Cream", inStock: true, isVeg: true },
      { id: 9, name: "Kheer", inStock: false, isVeg: true }
    ]
  }
]

// Time Picker Wheel Component (copied from DaySlots.jsx)
function TimePickerWheel({
  isOpen,
  onClose,
  initialHour,
  initialMinute,
  initialPeriod,
  onConfirm
}) {
  const parsedHour = Math.max(1, Math.min(12, parseInt(initialHour) || 1))
  const parsedMinute = Math.max(0, Math.min(59, parseInt(initialMinute) || 0))
  const parsedPeriod = (initialPeriod === "am" || initialPeriod === "pm") ? initialPeriod : "am"

  const [selectedHour, setSelectedHour] = useState(parsedHour)
  const [selectedMinute, setSelectedMinute] = useState(parsedMinute)
  const [selectedPeriod, setSelectedPeriod] = useState(parsedPeriod)

  const hourRef = useRef(null)
  const minuteRef = useRef(null)
  const periodRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const isScrollingRef = useRef(false)

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const periods = ["am", "pm"]

  useEffect(() => {
    if (isOpen) {
      setSelectedHour(parsedHour)
      setSelectedMinute(parsedMinute)
      setSelectedPeriod(parsedPeriod)
    }
  }, [isOpen, initialHour, initialMinute, initialPeriod, parsedHour, parsedMinute, parsedPeriod])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'

      const timer = setTimeout(() => {
        const padding = 80
        const itemHeight = 40

        const hourIndex = parsedHour - 1
        const hourScrollPos = padding + (hourIndex * itemHeight)
        if (hourRef.current) {
          hourRef.current.scrollTop = hourScrollPos
          setSelectedHour(parsedHour)
          setTimeout(() => {
            hourRef.current?.scrollTo({
              top: hourScrollPos,
              behavior: 'smooth'
            })
          }, 50)
        }

        const minuteIndex = Math.max(0, Math.min(59, parsedMinute))
        const minuteScrollPos = padding + (minuteIndex * itemHeight)
        if (minuteRef.current) {
          minuteRef.current.scrollTop = minuteScrollPos
          setSelectedMinute(minuteIndex)
          setTimeout(() => {
            minuteRef.current?.scrollTo({
              top: minuteScrollPos,
              behavior: 'smooth'
            })
          }, 50)
        }

        const periodIndex = periods.indexOf(parsedPeriod)
        const periodScrollPos = padding + (periodIndex * itemHeight)
        if (periodRef.current) {
          periodRef.current.scrollTop = periodScrollPos
          setSelectedPeriod(parsedPeriod)
          setTimeout(() => {
            periodRef.current?.scrollTo({
              top: periodScrollPos,
              behavior: 'smooth'
            })
          }, 50)
        }
      }, 150)

      return () => {
        clearTimeout(timer)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, parsedHour, parsedMinute, parsedPeriod])

  const handleScroll = (container, setValue, values, itemHeight) => {
    if (!container || isScrollingRef.current) return

    const padding = 80
    const scrollTop = container.scrollTop
    const index = Math.round((scrollTop - padding) / itemHeight)
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1))
    const newValue = values[clampedIndex]

    if (newValue !== undefined) {
      setValue(newValue)
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    isScrollingRef.current = true
    scrollTimeoutRef.current = setTimeout(() => {
      const finalIndex = Math.round((container.scrollTop - padding) / itemHeight)
      const finalClampedIndex = Math.max(0, Math.min(finalIndex, values.length - 1))
      const snapPosition = padding + (finalClampedIndex * itemHeight)
      container.scrollTop = snapPosition
      if (values[finalClampedIndex] !== undefined) {
        setValue(values[finalClampedIndex])
      }
      setTimeout(() => {
        container.scrollTo({
          top: snapPosition,
          behavior: 'smooth'
        })
      }, 50)

      setTimeout(() => {
        isScrollingRef.current = false
      }, 300)
    }, 150)
  }

  const handleConfirm = () => {
    const hourStr = selectedHour.toString()
    const minuteStr = selectedMinute.toString().padStart(2, '0')
    onConfirm(hourStr, minuteStr, selectedPeriod)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-lg shadow-2xl w-full max-w-xs overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center py-8 px-4 relative">
            <style>{`
              .time-picker-scroll::-webkit-scrollbar {
                display: none;
              }
              .time-picker-scroll {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>

            <div className="flex-1 flex flex-col items-center">
              <div
                ref={hourRef}
                className="w-full h-48 overflow-y-scroll time-picker-scroll snap-y snap-mandatory"
                style={{
                  scrollSnapType: 'y mandatory',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch'
                }}
                onScroll={() => handleScroll(hourRef.current, setSelectedHour, hours, 40)}
                onTouchEnd={() => {
                  setTimeout(() => {
                    if (hourRef.current) {
                      const padding = 80
                      const itemHeight = 40
                      const scrollTop = hourRef.current.scrollTop
                      const index = Math.round((scrollTop - padding) / itemHeight)
                      const clampedIndex = Math.max(0, Math.min(index, hours.length - 1))
                      const snapPosition = padding + (clampedIndex * itemHeight)
                      hourRef.current.scrollTop = snapPosition
                      if (hours[clampedIndex] !== undefined) {
                        setSelectedHour(hours[clampedIndex])
                      }
                      setTimeout(() => {
                        hourRef.current?.scrollTo({
                          top: snapPosition,
                          behavior: 'smooth'
                        })
                      }, 50)
                    }
                  }, 100)
                }}
              >
                <div className="h-20"></div>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-10 flex items-center justify-center snap-center"
                    style={{ minHeight: '40px' }}
                  >
                    <span
                      className={`text-lg transition-all duration-200 ${selectedHour === hour
                          ? 'font-bold text-gray-900 text-xl'
                          : 'font-normal text-gray-400 text-base'
                        }`}
                    >
                      {hour}
                    </span>
                  </div>
                ))}
                <div className="h-20"></div>
              </div>
            </div>

            <div className="px-2">
              <span className="text-2xl font-bold text-gray-900">:</span>
            </div>

            <div className="flex-1 flex flex-col items-center">
              <div
                ref={minuteRef}
                className="w-full h-48 overflow-y-scroll time-picker-scroll snap-y snap-mandatory"
                style={{
                  scrollSnapType: 'y mandatory',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch'
                }}
                onScroll={() => handleScroll(minuteRef.current, setSelectedMinute, minutes, 40)}
                onTouchEnd={() => {
                  setTimeout(() => {
                    if (minuteRef.current) {
                      const padding = 80
                      const itemHeight = 40
                      const scrollTop = minuteRef.current.scrollTop
                      const index = Math.round((scrollTop - padding) / itemHeight)
                      const clampedIndex = Math.max(0, Math.min(index, minutes.length - 1))
                      const snapPosition = padding + (clampedIndex * itemHeight)
                      minuteRef.current.scrollTop = snapPosition
                      if (minutes[clampedIndex] !== undefined) {
                        setSelectedMinute(minutes[clampedIndex])
                      }
                      setTimeout(() => {
                        minuteRef.current?.scrollTo({
                          top: snapPosition,
                          behavior: 'smooth'
                        })
                      }, 50)
                    }
                  }, 100)
                }}
              >
                <div className="h-20"></div>
                {minutes.map((minute) => (
                  <div
                    key={minute}
                    className="h-10 flex items-center justify-center snap-center"
                    style={{ minHeight: '40px' }}
                  >
                    <span
                      className={`text-lg transition-all duration-200 ${selectedMinute === minute
                          ? 'font-bold text-gray-900 text-xl'
                          : 'font-normal text-gray-400 text-base'
                        }`}
                    >
                      {minute.toString().padStart(2, '0')}
                    </span>
                  </div>
                ))}
                <div className="h-20"></div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center">
              <div
                ref={periodRef}
                className="w-full h-48 overflow-y-scroll time-picker-scroll snap-y snap-mandatory"
                style={{
                  scrollSnapType: 'y mandatory',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch'
                }}
                onScroll={() => handleScroll(periodRef.current, setSelectedPeriod, periods, 40)}
                onTouchEnd={() => {
                  setTimeout(() => {
                    if (periodRef.current) {
                      const padding = 80
                      const itemHeight = 40
                      const scrollTop = periodRef.current.scrollTop
                      const index = Math.round((scrollTop - padding) / itemHeight)
                      const clampedIndex = Math.max(0, Math.min(index, periods.length - 1))
                      const snapPosition = padding + (clampedIndex * itemHeight)
                      periodRef.current.scrollTop = snapPosition
                      if (periods[clampedIndex] !== undefined) {
                        setSelectedPeriod(periods[clampedIndex])
                      }
                      setTimeout(() => {
                        periodRef.current?.scrollTo({
                          top: snapPosition,
                          behavior: 'smooth'
                        })
                      }, 50)
                    }
                  }, 100)
                }}
              >
                <div className="h-20"></div>
                {periods.map((period) => (
                  <div
                    key={period}
                    className="h-10 flex items-center justify-center snap-center"
                    style={{ minHeight: '40px' }}
                  >
                    <span
                      className={`text-lg transition-all duration-200 ${selectedPeriod === period
                          ? 'font-bold text-gray-900 text-xl'
                          : 'font-normal text-gray-400 text-base'
                        }`}
                    >
                      {period}
                    </span>
                  </div>
                ))}
                <div className="h-20"></div>
              </div>
            </div>

            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="border-t border-gray-300 mx-4"></div>
              <div className="border-b border-gray-300 mx-4 mt-10"></div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-4 flex justify-center">
            <button
              onClick={handleConfirm}
              className="text-blue-600 hover:text-blue-700 font-medium text-base transition-colors"
            >
              Okay
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Simple Calendar Component
function SimpleCalendar({ selectedDate, onDateSelect, isOpen, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return selectedDate ? new Date(selectedDate) : new Date()
  })
  const calendarRef = useRef(null)

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate))
    }
  }, [selectedDate])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1))

    const days = []
    const currentDate = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }, [currentMonth])

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const isSelected = (date) => {
    if (!selectedDate) return false
    return date.toDateString() === new Date(selectedDate).toDateString()
  }

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString()
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          ref={calendarRef}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const prevMonth = new Date(currentMonth)
                  prevMonth.setMonth(prevMonth.getMonth() - 1)
                  setCurrentMonth(prevMonth)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-semibold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                onClick={() => {
                  const nextMonth = new Date(currentMonth)
                  nextMonth.setMonth(nextMonth.getMonth() + 1)
                  setCurrentMonth(nextMonth)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const isCurrent = isCurrentMonth(date)
                const isSelectedDate = isSelected(date)
                const isTodayDate = isToday(date)

                return (
                  <button
                    key={index}
                    onClick={() => {
                      onDateSelect(new Date(date))
                      onClose()
                    }}
                    className={`h-10 text-sm rounded transition-colors ${!isCurrent
                        ? 'text-gray-300'
                        : isSelectedDate
                          ? 'bg-black text-white'
                          : isTodayDate
                            ? 'bg-gray-100 text-black font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function Inventory() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("all-items")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [categories, setCategories] = useState(() => {
    try {
      if (typeof window === "undefined") return mockCategories
      const saved = localStorage.getItem(INVENTORY_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (error) {
      console.error("Error loading inventory from storage:", error)
    }
    return mockCategories
  })
  const [expandedCategories, setExpandedCategories] = useState(() =>
    mockCategories.map(c => c.id)
  )
  const [togglePopupOpen, setTogglePopupOpen] = useState(false)
  const [toggleTarget, setToggleTarget] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Toggle popup state
  const [selectedOption, setSelectedOption] = useState("specific-time")
  const [hours, setHours] = useState(3)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState({ hour: "2", minute: "30", period: "pm" })
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const categoryRefs = useRef({})

  // Swipe gesture refs
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const touchStartY = useRef(0)
  const isSwiping = useRef(false)
  const mouseStartX = useRef(0)
  const mouseEndX = useRef(0)
  const isMouseDown = useRef(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [addons, setAddons] = useState([])
  const [loadingAddons, setLoadingAddons] = useState(false)

  // Inventory tabs
  const inventoryTabs = ["all-items", "add-ons"]

  // Tab bar ref for excluding swipe on topbar
  const tabBarRef = useRef(null)

  // Content container ref
  const contentContainerRef = useRef(null)

  // Fetch menu items from API and convert to inventory format
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoadingInventory(true)
        
        // Fetch menu from API
        const menuResponse = await restaurantAPI.getMenu()
        
        if (menuResponse.data && menuResponse.data.success && menuResponse.data.data && menuResponse.data.data.menu) {
          const menuSections = menuResponse.data.data.menu.sections || []
          
          // Convert menu sections to inventory categories
          const convertedCategories = menuSections.map((section, sectionIndex) => {
            // Collect all items from section and subsections
            const allItems = []
            
            // Add direct items from section
            if (Array.isArray(section.items)) {
              section.items.forEach(item => {
                  allItems.push({
                  id: String(item.id || Date.now() + Math.random()),
                  name: item.name || "Unnamed Item",
                  inStock: item.isAvailable !== undefined ? item.isAvailable : true,
                  isVeg: item.foodType === "Veg",
                  isRecommended: item.isRecommended !== undefined ? item.isRecommended : false,
                  stockQuantity: item.stock || "Unlimited",
                  unit: item.itemSizeUnit || "piece",
                  expiryDate: null,
                  lastRestocked: null,
                })
              })
            }
            
            // Add items from subsections
            if (Array.isArray(section.subsections)) {
              section.subsections.forEach(subsection => {
                if (Array.isArray(subsection.items)) {
                  subsection.items.forEach(item => {
                  allItems.push({
                  id: String(item.id || Date.now() + Math.random()),
                  name: item.name || "Unnamed Item",
                  inStock: item.isAvailable !== undefined ? item.isAvailable : true,
                  isVeg: item.foodType === "Veg",
                  isRecommended: item.isRecommended !== undefined ? item.isRecommended : false,
                  stockQuantity: item.stock || "Unlimited",
                  unit: item.itemSizeUnit || "piece",
                  expiryDate: null,
                  lastRestocked: null,
                })
                  })
                }
              })
            }
            
            // Use category's isEnabled from menu API, not calculated from items
            // Category toggle should be independent of item toggles
            const categoryInStock = section.isEnabled !== undefined ? section.isEnabled : true
            const itemCount = allItems.length
            
            return {
              id: section.id || `category-${sectionIndex}`,
              name: section.name || "Unnamed Category",
              description: section.description || "",
              itemCount: itemCount,
              inStock: categoryInStock,
              items: allItems,
              order: section.order !== undefined ? section.order : sectionIndex,
            }
          })
          
          setCategories(convertedCategories)
          setExpandedCategories(convertedCategories.map(c => c.id))
        } else {
          // Empty menu - start fresh
          setCategories([])
          setExpandedCategories([])
        }
      } catch (error) {
        // Only log and show toast if it's not a network/timeout error
        if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
        console.error('Error fetching menu data:', error)
          toast.error('Failed to load menu data')
        } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          // Silently handle network errors - backend is not running
          // The axios interceptor already handles these with proper error messages
        }
        setCategories([])
        setExpandedCategories([])
      } finally {
        setLoadingInventory(false)
      }
    }
    
    fetchMenuData()
  }, [])

  // Note: Menu items are now displayed from menu API
  // Stock status updates should be managed through the menu API, not inventory API
  // Auto-save disabled since we're displaying menu data, not inventory data

  // Fetch add-ons when add-ons tab is active
  const fetchAddons = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingAddons(true)
      const response = await restaurantAPI.getAddons()
      const data = response?.data?.data?.addons || response?.data?.addons || []
      // Filter to show only approved add-ons
      const approvedAddons = data.filter(addon => addon.approvalStatus === 'approved')
      setAddons(approvedAddons)
    } catch (error) {
      console.error('Error fetching add-ons:', error)
      toast.error('Failed to load add-ons')
      setAddons([])
    } finally {
      if (showLoading) setLoadingAddons(false)
    }
  }

  useEffect(() => {
    if (activeTab === "add-ons") {
      fetchAddons(true)
    }
  }, [activeTab])

  // Handle addon toggle
  const handleAddonToggle = async (addonId, isAvailable) => {
    try {
      // Update addon availability via API
      await restaurantAPI.updateAddon(addonId, {
        isAvailable: isAvailable
      })

      // Update local state
      setAddons(prev => prev.map(a => 
        a.id === addonId ? { ...a, isAvailable } : a
      ))

      toast.success(`Add-on ${isAvailable ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      console.error('Error toggling addon:', error)
      toast.error('Failed to update add-on availability')
    }
  }

  // Handle swipe gestures
  const handleTouchStart = (e) => {
    const target = e.target
    // Don't handle swipe if starting on topbar
    if (tabBarRef.current?.contains(target)) return

    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchEndX.current = e.touches[0].clientX
    isSwiping.current = false
  }

  const handleTouchMove = (e) => {
    if (!isSwiping.current) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current)
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)

      // Determine if this is a horizontal swipe
      if (deltaX > deltaY && deltaX > 10) {
        isSwiping.current = true
      }
    }

    if (isSwiping.current) {
      touchEndX.current = e.touches[0].clientX
    }
  }

  const handleTouchEnd = () => {
    if (!isSwiping.current) {
      touchStartX.current = 0
      touchEndX.current = 0
      return
    }

    const swipeDistance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50
    const swipeVelocity = Math.abs(swipeDistance)

    if (swipeVelocity > minSwipeDistance && !isTransitioning) {
      const currentIndex = inventoryTabs.findIndex(tab => tab === activeTab)
      let newIndex = currentIndex

      if (swipeDistance > 0 && currentIndex < inventoryTabs.length - 1) {
        // Swipe left - go to next tab
        newIndex = currentIndex + 1
      } else if (swipeDistance < 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        newIndex = currentIndex - 1
      }

      if (newIndex !== currentIndex) {
        setIsTransitioning(true)

        // Smooth transition with animation
        setTimeout(() => {
          setActiveTab(inventoryTabs[newIndex])

          // Reset transition state after animation
          setTimeout(() => {
            setIsTransitioning(false)
          }, 300)
        }, 50)
      }
    }

    // Reset touch positions
    touchStartX.current = 0
    touchEndX.current = 0
    touchStartY.current = 0
    isSwiping.current = false
  }

  // Persist categories to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(categories))
    } catch (error) {
      console.error("Error saving inventory to storage:", error)
    }
  }, [categories])

  // Calculate total items
  const totalItems = useMemo(
    () => categories.reduce((sum, cat) => sum + (cat.itemCount || (cat.items?.length || 0)), 0),
    [categories]
  )

  // Filter categories based on selected filter (in stock / out of stock)
  const statusFilteredCategories = useMemo(() => {
    if (!selectedFilter) return categories

    return categories.filter(category => {
      const items = category.items || []
      if (selectedFilter === "out-of-stock") {
        // Show categories that have at least one out of stock item
        return items.some(item => !item.inStock)
      } else if (selectedFilter === "in-stock") {
        // Show categories that have all items in stock
        return items.length > 0 && items.every(item => item.inStock)
      }
      return true
    })
  }, [categories, selectedFilter])

  // Apply text search on categories & items
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return statusFilteredCategories

    return statusFilteredCategories
      .map(category => {
        const items = category.items || []
        const matchesCategory =
          category.name?.toLowerCase().includes(q) ||
          (category.description || "").toLowerCase().includes(q)

        const matchingItems = items.filter(item =>
          item.name?.toLowerCase().includes(q)
        )

        if (!matchesCategory && matchingItems.length === 0) {
          return null
        }

        return {
          ...category,
          items: matchingItems.length > 0 ? matchingItems : items,
        }
      })
      .filter(Boolean)
  }, [statusFilteredCategories, searchQuery])

  // When on Add-ons tab, keep the list empty (no items shown)
  const listToRender = activeTab === "add-ons" ? [] : filteredCategories

  // Calculate out of stock count for a category
  const getOutOfStockCount = (category) => {
    return category.items.filter(item => !item.inStock).length
  }

  // Handle filter apply
  const handleFilterApply = () => {
    setIsLoading(true)
    setFilterOpen(false)

    // Simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  // Handle filter clear
  const handleFilterClear = () => {
    setSelectedFilter(null)
    setFilterOpen(false)
  }

  // Update menu API when category/item toggles change
  const updateMenuAPI = async (categoryId, itemId, isEnabled, isAvailable) => {
    try {
      // Fetch current menu
      const menuResponse = await restaurantAPI.getMenu()
      if (!menuResponse.data || !menuResponse.data.success || !menuResponse.data.data || !menuResponse.data.data.menu) {
        console.error('Failed to fetch menu for update')
        return
      }

      const menu = menuResponse.data.data.menu
      const sections = menu.sections || []

      // Update menu sections
      const updatedSections = sections.map(section => {
        if (section.id !== categoryId) return section

        // If updating category, set isEnabled
        if (itemId === null) {
          return {
            ...section,
            isEnabled: isEnabled,
            // Also update all items in the category
            items: section.items.map(item => ({
              ...item,
              isAvailable: isAvailable
            })),
            subsections: section.subsections.map(subsection => ({
              ...subsection,
              items: subsection.items.map(item => ({
                ...item,
                isAvailable: isAvailable
              }))
            }))
          }
        } else {
          // If updating item, update only that item
          const updatedItems = section.items.map(item =>
            item.id === String(itemId) ? { ...item, isAvailable: isAvailable } : item
          )
          
          // Update items in subsections too
          const updatedSubsections = section.subsections.map(subsection => ({
            ...subsection,
            items: subsection.items.map(item =>
              item.id === String(itemId) ? { ...item, isAvailable: isAvailable } : item
            )
          }))

          return {
            ...section,
            items: updatedItems,
            subsections: updatedSubsections
          }
        }
      })

      // Save updated menu
      await restaurantAPI.updateMenu({ sections: updatedSections })
