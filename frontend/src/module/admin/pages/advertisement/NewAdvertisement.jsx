import { useState, useRef } from "react"
import { Upload, Heart, Star, Calendar, CheckCircle2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// Using placeholders for advertisement images
const profilePlaceholder = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop"
const coverPlaceholder = "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=400&fit=crop"

export default function NewAdvertisement() {
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    restaurant: "",
    priority: "Priority",
    advertisementType: "Restaurant Promotion",
    validity: "",
    showReview: true,
    showRatings: true,
  })
  const [profileImage, setProfileImage] = useState(null)
  const [coverImage, setCoverImage] = useState(null)
  const [profilePreview, setProfilePreview] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const profileInputRef = useRef(null)
  const coverInputRef = useRef(null)

  const languageTabs = [
    { key: "default", label: "Default" },
    { key: "en", label: "English(EN)" },
    { key: "bn", label: "Bengali - বাংলা(BN)" },
    { key: "ar", label: "Arabic - العربية (AR)" },
    { key: "es", label: "Spanish - español(ES)" },
  ]

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleFileUpload = (type, file) => {
    const maxSize = 2 * 1024 * 1024 // 2MB
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]

    if (!allowedTypes.includes(file.type)) {
      setFormErrors(prev => ({
        ...prev,
        [type]: "Invalid file type. Please upload PNG, JPG, JPEG, or WEBP."
      }))
      return
    }

    if (file.size > maxSize) {
      setFormErrors(prev => ({
        ...prev,
        [type]: "File size exceeds 2MB limit."
      }))
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (type === "profileImage") {
        setProfileImage(file)
        setProfilePreview(reader.result)
      } else {
        setCoverImage(file)
        setCoverPreview(reader.result)
      }
    }
    reader.readAsDataURL(file)

    if (formErrors[type]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[type]
        return newErrors
      })
    }
  }

  const handleRemoveImage = (type) => {
    if (type === "profileImage") {
      setProfileImage(null)
      setProfilePreview(null)
      if (profileInputRef.current) {
        profileInputRef.current.value = ""
      }
    } else {
      setCoverImage(null)
      setCoverPreview(null)
      if (coverInputRef.current) {
        coverInputRef.current.value = ""
      }
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.title.trim()) {
      errors.title = "Advertisement title is required"
    }

    if (!formData.restaurant) {
      errors.restaurant = "Restaurant selection is required"
    }

    if (!formData.validity) {
      errors.validity = "Validity date is required"
    } else {
      const validityDate = new Date(formData.validity)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (validityDate < today) {
        errors.validity = "Validity date must be today or later"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormErrors({})

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Here you would typically send the data to your API
