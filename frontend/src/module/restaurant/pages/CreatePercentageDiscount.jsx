import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Search, Percent, ChevronDown, Check, X, Tag, Calendar, Edit, Trash2 } from "lucide-react"
import BottomNavOrders from "../components/BottomNavOrders"
import { restaurantAPI } from "@/lib/api"

export default function CreatePercentageDiscount() {
  const navigate = useNavigate()
  const { goalId, discountType } = useParams()
  
  // Menu data state
  const [menuItems, setMenuItems] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Selected items with discount percentage
  const [selectedItems, setSelectedItems] = useState({}) // { itemId: { item, discountPercentage, couponCode } }
  
  // Discount percentage modal
  const [discountModal, setDiscountModal] = useState({ open: false, itemId: null })
  const [percentageSearchQuery, setPercentageSearchQuery] = useState("")
  
  // Loading state for activating offer
  const [activatingOffer, setActivatingOffer] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState("dish") // "dish" or "running-offer"

  // Running offers state
  const [runningOffers, setRunningOffers] = useState([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  
  // Coupons for dishes
  const [itemCoupons, setItemCoupons] = useState({}) // { itemId: [coupons] }
  const [loadingCoupons, setLoadingCoupons] = useState({}) // { itemId: true/false }

  // Make Offer Modal state
  const [makeOfferModal, setMakeOfferModal] = useState({ open: false, item: null, editingOffer: null })
  const [offerFormData, setOfferFormData] = useState({
    discountType: "percentage", // "percentage" or "flat"
    percentage: "",
    flatAmount: "", // For flat discount
    couponCode: "",
    startDate: "",
    endDate: "",
  })
  const [deletingOfferId, setDeletingOfferId] = useState(null)
  const [togglingOfferId, setTogglingOfferId] = useState(null)
  
  const percentageOptions = ["10", "20", "30", "40", "50", "60", "70", "80", "90"]

  // Generate coupon code based on discount percentage and item price
  const generateCouponCode = (discountValue, itemPrice, discountType = "percentage") => {
    const roundedPrice = Math.round(itemPrice / 10) * 10 // Round to nearest 10
    
    if (discountType === "flat") {
      // Format: FLATOFF{amount}ON{roundedPrice}
      // Example: FLATOFF50ON250 (₹50 off on ₹250)
      return `FLATOFF${discountValue}ON${roundedPrice}`
    } else {
      // Format: GETOFF{percentage}ON{roundedPrice}
      // Example: GETOFF10ON250 (10% off on ₹250)
      return `GETOFF${discountValue}ON${roundedPrice}`
    }
  }

  // Fetch menu items from backend
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoadingMenu(true)
        const response = await restaurantAPI.getMenu()
        
        if (response?.data?.success && response?.data?.data?.menu) {
          const sections = response.data.data.menu.sections || []
          
          // Extract all items from all sections and subsections
          const allItems = []
          sections.forEach(section => {
            // Direct items in section
            if (section.items && Array.isArray(section.items)) {
              section.items.forEach(item => {
                allItems.push({
                  ...item,
                  sectionName: section.name,
                  sectionId: section.id
                })
              })
            }
            
            // Items in subsections
            if (section.subsections && Array.isArray(section.subsections)) {
              section.subsections.forEach(subsection => {
                if (subsection.items && Array.isArray(subsection.items)) {
                  subsection.items.forEach(item => {
                    allItems.push({
                      ...item,
                      sectionName: section.name,
                      subsectionName: subsection.name,
                      sectionId: section.id,
                      subsectionId: subsection.id
                    })
                  })
                }
              })
            }
          })
          
