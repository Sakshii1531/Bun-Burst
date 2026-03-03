import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Info } from "lucide-react"

export default function ManageOutlets() {
  const navigate = useNavigate()
  const [showToast, setShowToast] = useState(false)

  const options = [
    "Timings",
    "Contacts",
    "FSSAI Food License",
    "Bank account details",
    "Profile picture",
    "Name, address, location",
    "Ratings, reviews",
    "Delivery area changes",
  ]

  const handleOptionClick = (option) => {
    // Navigate based on option selected
    switch (option) {
      case "Timings":
        navigate("/restaurant/outlet-timings")
        break
      case "Contacts":
        navigate("/restaurant/contact-details")
        break
      case "FSSAI Food License":
        navigate("/restaurant/fssai")
        break
      case "Bank account details":
        navigate("/restaurant/update-bank-details")
        break
      case "Profile picture":
        navigate("/restaurant/outlet-info")
        break
      case "Name, address, location":
        navigate("/restaurant/outlet-info")
        break
      case "Ratings, reviews":
        navigate("/restaurant/ratings-reviews")
        break
      case "Delivery area changes":
        setShowToast(true)
        setTimeout(() => setShowToast(false), 5000)
        break
      default:
