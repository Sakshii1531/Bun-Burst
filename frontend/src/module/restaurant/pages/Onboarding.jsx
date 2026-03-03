import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Image as ImageIcon, Upload, Clock, Calendar as CalendarIcon, Sparkles } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { uploadAPI, api } from "@/lib/api"
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { determineStepToShow } from "../utils/onboardingUtils"
import { toast } from "sonner"
import { useCompanyName } from "@/lib/hooks/useCompanyName"

const cuisinesOptions = [
  "North Indian",
  "South Indian",
  "Chinese",
  "Pizza",
  "Burgers",
  "Bakery",
  "Cafe",
]

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const ONBOARDING_STORAGE_KEY = "restaurant_onboarding_data"

// Helper functions for localStorage
const saveOnboardingToLocalStorage = (step1, step2, step3, step4, currentStep) => {
  try {
    // Convert File objects to a serializable format (we'll store file names/paths if available)
    const serializableStep2 = {
      ...step2,
      menuImages: step2.menuImages.map((file) => {
        if (file instanceof File) {
          return { name: file.name, size: file.size, type: file.type }
        }
        return file
      }),
      profileImage: step2.profileImage instanceof File
        ? { name: step2.profileImage.name, size: step2.profileImage.size, type: step2.profileImage.type }
        : step2.profileImage,
    }

    const serializableStep3 = {
      ...step3,
      panImage: step3.panImage instanceof File
        ? { name: step3.panImage.name, size: step3.panImage.size, type: step3.panImage.type }
        : step3.panImage,
      gstImage: step3.gstImage instanceof File
        ? { name: step3.gstImage.name, size: step3.gstImage.size, type: step3.gstImage.type }
        : step3.gstImage,
      fssaiImage: step3.fssaiImage instanceof File
        ? { name: step3.fssaiImage.name, size: step3.fssaiImage.size, type: step3.fssaiImage.type }
        : step3.fssaiImage,
    }

    const dataToSave = {
      step1,
      step2: serializableStep2,
      step3: serializableStep3,
      step4: step4 || {},
      currentStep,
      timestamp: Date.now(),
    }
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    console.error("Failed to save onboarding data to localStorage:", error)
  }
}

const loadOnboardingFromLocalStorage = () => {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load onboarding data from localStorage:", error)
  }
  return null
}

const clearOnboardingFromLocalStorage = () => {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear onboarding data from localStorage:", error)
  }
}

// Helper function to convert "HH:mm" string to Date object
const stringToTime = (timeString) => {
  if (!timeString || !timeString.includes(":")) {
    return new Date(2000, 0, 1, 10, 0) // Default to 10:00 AM
  }
  const [hours, minutes] = timeString.split(":").map(Number)
  return new Date(2000, 0, 1, hours || 10, minutes || 0)
}

// Helper function to convert Date object to "HH:mm" string
const timeToString = (date) => {
  if (!date) return ""
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

function TimeSelector({ label, value, onChange }) {
  const timeValue = stringToTime(value)

  const handleTimeChange = (newValue) => {
    if (newValue) {
      const timeString = timeToString(newValue)
      onChange(timeString)
    }
  }

  return (
    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50/60">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-gray-800" />
        <span className="text-xs font-medium text-gray-900">{label}</span>
      </div>
      <MobileTimePicker
        value={timeValue}
        onChange={handleTimeChange}
        slotProps={{
          textField: {
            variant: "outlined",
            size: "small",
            placeholder: "Select time",
            sx: {
              "& .MuiOutlinedInput-root": {
                height: "36px",
                fontSize: "12px",
                backgroundColor: "white",
                "& fieldset": {
                  borderColor: "#e5e7eb",
                },
                "&:hover fieldset": {
                  borderColor: "#d1d5db",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#000",
                },
              },
              "& .MuiInputBase-input": {
                padding: "8px 12px",
                fontSize: "12px",
              },
            },
          },
        }}
        format="hh:mm a"
      />
    </div>
  )
}

export default function RestaurantOnboarding() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [step1, setStep1] = useState({
    restaurantName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    primaryContactNumber: "",
    location: {
      addressLine1: "",
      addressLine2: "",
      area: "",
      city: "",
      landmark: "",
    },
  })

  const [step2, setStep2] = useState({
    menuImages: [],
    profileImage: null,
    cuisines: [],
    openingTime: "",
    closingTime: "",
    openDays: [],
  })

  const [step3, setStep3] = useState({
    panNumber: "",
    nameOnPan: "",
    panImage: null,
    gstRegistered: false,
    gstNumber: "",
    gstLegalName: "",
    gstAddress: "",
    gstImage: null,
    fssaiNumber: "",
    fssaiExpiry: "",
    fssaiImage: null,
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    accountType: "",
  })

  const [step4, setStep4] = useState({
    estimatedDeliveryTime: "",
    featuredDish: "",
    featuredPrice: "",
    offer: "",
  })


  // Load from localStorage on mount and check URL parameter
  useEffect(() => {
    // Check if step is specified in URL (from OTP login redirect)
    const stepParam = searchParams.get("step")
    if (stepParam) {
      const stepNum = parseInt(stepParam, 10)
      if (stepNum >= 1 && stepNum <= 3) {
        setStep(stepNum)
      }
    }

    const localData = loadOnboardingFromLocalStorage()
    if (localData) {
      if (localData.step1) {
        setStep1({
          restaurantName: localData.step1.restaurantName || "",
          ownerName: localData.step1.ownerName || "",
          ownerEmail: localData.step1.ownerEmail || "",
          ownerPhone: localData.step1.ownerPhone || "",
          primaryContactNumber: localData.step1.primaryContactNumber || "",
          location: {
            addressLine1: localData.step1.location?.addressLine1 || "",
            addressLine2: localData.step1.location?.addressLine2 || "",
            area: localData.step1.location?.area || "",
            city: localData.step1.location?.city || "",
            landmark: localData.step1.location?.landmark || "",
          },
        })
      }
      if (localData.step2) {
        setStep2({
          menuImages: localData.step2.menuImages || [],
          profileImage: localData.step2.profileImage || null,
          cuisines: localData.step2.cuisines || [],
          openingTime: localData.step2.openingTime || "",
          closingTime: localData.step2.closingTime || "",
          openDays: localData.step2.openDays || [],
        })
      }
      if (localData.step3) {
        setStep3({
          panNumber: localData.step3.panNumber || "",
          nameOnPan: localData.step3.nameOnPan || "",
          panImage: localData.step3.panImage || null,
          gstRegistered: localData.step3.gstRegistered || false,
          gstNumber: localData.step3.gstNumber || "",
          gstLegalName: localData.step3.gstLegalName || "",
          gstAddress: localData.step3.gstAddress || "",
          gstImage: localData.step3.gstImage || null,
          fssaiNumber: localData.step3.fssaiNumber || "",
          fssaiExpiry: localData.step3.fssaiExpiry || "",
          fssaiImage: localData.step3.fssaiImage || null,
          accountNumber: localData.step3.accountNumber || "",
          confirmAccountNumber: localData.step3.confirmAccountNumber || "",
          ifscCode: localData.step3.ifscCode || "",
          accountHolderName: localData.step3.accountHolderName || "",
          accountType: localData.step3.accountType || "",
        })
      }
      if (localData.step4) {
        setStep4({
          estimatedDeliveryTime: localData.step4.estimatedDeliveryTime || "",
          featuredDish: localData.step4.featuredDish || "",
          featuredPrice: localData.step4.featuredPrice || "",
          offer: localData.step4.offer || "",
        })
      }
      // Only set step from localStorage if URL doesn't have a step parameter
      if (localData.currentStep && !stepParam) {
        setStep(localData.currentStep)
      }
    }
  }, [searchParams])

  // Save to localStorage whenever step data changes
  useEffect(() => {
    saveOnboardingToLocalStorage(step1, step2, step3, step4, step)
  }, [step1, step2, step3, step4, step])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await api.get("/restaurant/onboarding")
        const data = res?.data?.data?.onboarding
        if (data) {
          if (data.step1) {
            setStep1((prev) => ({
              restaurantName: data.step1.restaurantName || "",
              ownerName: data.step1.ownerName || "",
              ownerEmail: data.step1.ownerEmail || "",
              ownerPhone: data.step1.ownerPhone || "",
              primaryContactNumber: data.step1.primaryContactNumber || "",
              location: {
                addressLine1: data.step1.location?.addressLine1 || "",
                addressLine2: data.step1.location?.addressLine2 || "",
                area: data.step1.location?.area || "",
                city: data.step1.location?.city || "",
                landmark: data.step1.location?.landmark || "",
              },
            }))
          }
          if (data.step2) {
            setStep2({
              // Load menu images from URLs if available
              menuImages: data.step2.menuImageUrls || [],
              // Load profile image URL if available
              profileImage: data.step2.profileImageUrl || null,
              cuisines: data.step2.cuisines || [],
              openingTime: data.step2.deliveryTimings?.openingTime || "",
              closingTime: data.step2.deliveryTimings?.closingTime || "",
              openDays: data.step2.openDays || [],
            })
          }
          if (data.step3) {
            setStep3({
              panNumber: data.step3.pan?.panNumber || "",
              nameOnPan: data.step3.pan?.nameOnPan || "",
              panImage: null, // Don't load images from API, user needs to re-upload
              gstRegistered: data.step3.gst?.isRegistered || false,
              gstNumber: data.step3.gst?.gstNumber || "",
              gstLegalName: data.step3.gst?.legalName || "",
              gstAddress: data.step3.gst?.address || "",
              gstImage: null, // Don't load images from API, user needs to re-upload
              fssaiNumber: data.step3.fssai?.registrationNumber || "",
              fssaiExpiry: data.step3.fssai?.expiryDate
                ? data.step3.fssai.expiryDate.slice(0, 10)
                : "",
              fssaiImage: null, // Don't load images from API, user needs to re-upload
              accountNumber: data.step3.bank?.accountNumber || "",
              confirmAccountNumber: data.step3.bank?.accountNumber || "",
              ifscCode: data.step3.bank?.ifscCode || "",
              accountHolderName: data.step3.bank?.accountHolderName || "",
              accountType: data.step3.bank?.accountType || "",
            })
          }
          
          if (data.step4) {
            setStep4({
              estimatedDeliveryTime: data.step4.estimatedDeliveryTime || "",
              featuredDish: data.step4.featuredDish || "",
              featuredPrice: data.step4.featuredPrice || "",
              offer: data.step4.offer || "",
            })
          }
          
          // Determine which step to show based on completeness
          const stepToShow = determineStepToShow(data)
          setStep(stepToShow)
        }
      } catch (err) {
        // Handle error gracefully - if it's a 401 (unauthorized), the user might need to login again
        // Otherwise, just continue with empty onboarding data
        if (err?.response?.status === 401) {
          console.error("Authentication error fetching onboarding:", err)
          // Don't show error to user, they can still fill the form
          // The error might be because restaurant is not yet active (pending verification)
        } else {
          console.error("Error fetching onboarding data:", err)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleUpload = async (file, folder) => {
    try {
      const res = await uploadAPI.uploadMedia(file, { folder })
      const d = res?.data?.data || res?.data
      return { url: d.url, publicId: d.publicId }
    } catch (err) {
      // Provide more informative error message for upload failures
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to upload image"
      console.error("Upload error:", errorMsg, err)
      throw new Error(`Image upload failed: ${errorMsg}`)
    }
  }

  // Validation functions for each step
  const validateStep1 = () => {
    const errors = []
    
    if (!step1.restaurantName?.trim()) {
      errors.push("Restaurant name is required")
    }
    if (!step1.ownerName?.trim()) {
      errors.push("Owner name is required")
    }
    if (!step1.ownerEmail?.trim()) {
      errors.push("Owner email is required")
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.ownerEmail)) {
      errors.push("Please enter a valid email address")
    }
    if (!step1.ownerPhone?.trim()) {
      errors.push("Owner phone number is required")
    }
    if (!step1.primaryContactNumber?.trim()) {
      errors.push("Primary contact number is required")
    }
    if (!step1.location?.area?.trim()) {
      errors.push("Area/Sector/Locality is required")
    }
    if (!step1.location?.city?.trim()) {
      errors.push("City is required")
    }
    
    return errors
  }

  const validateStep2 = () => {
    const errors = []
    
    // Check menu images - must have at least one File or existing URL
    const hasMenuImages = step2.menuImages && step2.menuImages.length > 0
    if (!hasMenuImages) {
      errors.push("At least one menu image is required")
    } else {
      // Verify that menu images are either File objects or have valid URLs
      const validMenuImages = step2.menuImages.filter(img => {
        if (img instanceof File) return true
        if (img?.url && typeof img.url === 'string') return true
        if (typeof img === 'string' && img.startsWith('http')) return true
        return false
      })
      if (validMenuImages.length === 0) {
        errors.push("Please upload at least one valid menu image")
      }
    }
    
    // Check profile image - must be a File or existing URL
    if (!step2.profileImage) {
      errors.push("Restaurant profile image is required")
    } else {
      // Verify profile image is either a File or has a valid URL
      const isValidProfileImage = 
        step2.profileImage instanceof File ||
        (step2.profileImage?.url && typeof step2.profileImage.url === 'string') ||
        (typeof step2.profileImage === 'string' && step2.profileImage.startsWith('http'))
      if (!isValidProfileImage) {
        errors.push("Please upload a valid restaurant profile image")
      }
    }
    
    if (!step2.cuisines || step2.cuisines.length === 0) {
      errors.push("Please select at least one cuisine")
    }
    if (!step2.openingTime?.trim()) {
      errors.push("Opening time is required")
    }
    if (!step2.closingTime?.trim()) {
      errors.push("Closing time is required")
    }
    if (!step2.openDays || step2.openDays.length === 0) {
      errors.push("Please select at least one open day")
    }
    
    return errors
  }

  const validateStep4 = () => {
    const errors = []
    if (!step4.estimatedDeliveryTime || !step4.estimatedDeliveryTime.trim()) {
      errors.push("Estimated delivery time is required")
    }
    if (!step4.featuredDish || !step4.featuredDish.trim()) {
      errors.push("Featured dish name is required")
    }
    if (!step4.featuredPrice || step4.featuredPrice === "" || isNaN(parseFloat(step4.featuredPrice)) || parseFloat(step4.featuredPrice) <= 0) {
      errors.push("Featured dish price is required and must be greater than 0")
    }
    if (!step4.offer || !step4.offer.trim()) {
      errors.push("Special offer/promotion is required")
    }
    return errors
  }

  const validateStep3 = () => {
    const errors = []
    
    if (!step3.panNumber?.trim()) {
      errors.push("PAN number is required")
    }
    if (!step3.nameOnPan?.trim()) {
      errors.push("Name on PAN is required")
    }
    // Validate PAN image - must be a File or existing URL
    if (!step3.panImage) {
      errors.push("PAN image is required")
    } else {
      const isValidPanImage = 
        step3.panImage instanceof File ||
        (step3.panImage?.url && typeof step3.panImage.url === 'string') ||
        (typeof step3.panImage === 'string' && step3.panImage.startsWith('http'))
      if (!isValidPanImage) {
        errors.push("Please upload a valid PAN image")
      }
    }
    
    if (!step3.fssaiNumber?.trim()) {
      errors.push("FSSAI number is required")
    }
    if (!step3.fssaiExpiry?.trim()) {
      errors.push("FSSAI expiry date is required")
    }
    // Validate FSSAI image - must be a File or existing URL
    if (!step3.fssaiImage) {
      errors.push("FSSAI image is required")
    } else {
      const isValidFssaiImage = 
        step3.fssaiImage instanceof File ||
        (step3.fssaiImage?.url && typeof step3.fssaiImage.url === 'string') ||
        (typeof step3.fssaiImage === 'string' && step3.fssaiImage.startsWith('http'))
      if (!isValidFssaiImage) {
        errors.push("Please upload a valid FSSAI image")
      }
    }
    
    // Validate GST details if GST registered
    if (step3.gstRegistered) {
      if (!step3.gstNumber?.trim()) {
        errors.push("GST number is required when GST registered")
      }
      if (!step3.gstLegalName?.trim()) {
        errors.push("GST legal name is required when GST registered")
      }
      if (!step3.gstAddress?.trim()) {
        errors.push("GST registered address is required when GST registered")
      }
      // Validate GST image if GST registered
      if (!step3.gstImage) {
        errors.push("GST image is required when GST registered")
      } else {
        const isValidGstImage = 
          step3.gstImage instanceof File ||
          (step3.gstImage?.url && typeof step3.gstImage.url === 'string') ||
          (typeof step3.gstImage === 'string' && step3.gstImage.startsWith('http'))
        if (!isValidGstImage) {
          errors.push("Please upload a valid GST image")
        }
      }
    }
    
    if (!step3.accountNumber?.trim()) {
      errors.push("Account number is required")
    }
    if (!step3.confirmAccountNumber?.trim()) {
      errors.push("Please confirm your account number")
    }
    if (step3.accountNumber && step3.confirmAccountNumber && step3.accountNumber !== step3.confirmAccountNumber) {
      errors.push("Account number and confirmation do not match")
    }
    if (!step3.ifscCode?.trim()) {
      errors.push("IFSC code is required")
    }
    if (!step3.accountHolderName?.trim()) {
      errors.push("Account holder name is required")
    }
    if (!step3.accountType?.trim()) {
      errors.push("Account type is required")
    }
    
    return errors
  }

  // Fill dummy data for testing (development mode only)
  const fillDummyData = () => {
    if (step === 1) {
      setStep1({
        restaurantName: "Test Restaurant",
        ownerName: "John Doe",
        ownerEmail: "john.doe@example.com",
        ownerPhone: "+91 9876543210",
        primaryContactNumber: "+91 9876543210",
        location: {
          addressLine1: "123 Main Street",
          addressLine2: "Building A, Floor 2",
          area: "Downtown",
          city: "Mumbai",
          landmark: "Near Central Park",
        },
      })
      toast.success("Step 1 filled with dummy data", { duration: 2000 })
    } else if (step === 2) {
      setStep2({
        menuImages: [],
        profileImage: null,
        cuisines: ["North Indian", "Chinese"],
        openingTime: "09:00",
        closingTime: "22:00",
        openDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      })
      toast.success("Step 2 filled with dummy data", { duration: 2000 })
      } else if (step === 3) {
        // Calculate expiry date 1 year from now
        const expiryDate = new Date()
        expiryDate.setFullYear(expiryDate.getFullYear() + 1)
        const expiryDateString = expiryDate.toISOString().split("T")[0]

        setStep3({
          panNumber: "ABCDE1234F",
          nameOnPan: "John Doe",
          panImage: null,
          gstRegistered: true,
          gstNumber: "27ABCDE1234F1Z5",
          gstLegalName: "Test Restaurant Private Limited",
          gstAddress: "123 Main Street, Mumbai, Maharashtra 400001",
          gstImage: null,
          fssaiNumber: "12345678901234",
          fssaiExpiry: expiryDateString,
          fssaiImage: null,
          accountNumber: "1234567890123",
          confirmAccountNumber: "1234567890123",
          ifscCode: "HDFC0001234",
          accountHolderName: "John Doe",
          accountType: "savings",
        })
        toast.success("Step 3 filled with dummy data", { duration: 2000 })
      } else if (step === 4) {
        setStep4({
          estimatedDeliveryTime: "25-30 mins",
          featuredDish: "Butter Chicken Special",
          featuredPrice: "249",
          offer: "Flat ₹50 OFF above ₹199",
        })
        toast.success("Step 4 filled with dummy data", { duration: 2000 })
      }
  }

  const handleNext = async () => {
    setError("")
    
    // Validate current step before proceeding
    let validationErrors = []
    if (step === 1) {
      validationErrors = validateStep1()
    } else if (step === 2) {
      validationErrors = validateStep2()
    } else if (step === 3) {
      validationErrors = validateStep3()
    } else if (step === 4) {
      validationErrors = validateStep4()
                  
                  if (step2.profileImage instanceof File) {
                    imageSrc = URL.createObjectURL(step2.profileImage);
                  } else if (step2.profileImage?.url) {
                    // If it's an object with url property (from backend)
                    imageSrc = step2.profileImage.url;
                  } else if (typeof step2.profileImage === 'string') {
                    // If it's a direct URL string
                    imageSrc = step2.profileImage;
                  }
                  
                  return imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Restaurant profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-500" />
                  );
                })()
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div className="flex-1 flex-col flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-900">Upload profile image</span>
                <span className="text-[11px] text-gray-500">
                  This will be shown on your listing card and restaurant page.
                </span>
              </div>
             
            </div>
            
          </div>
           <label
                htmlFor="profileImageInput"
                className="inline-flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white text-black  border-black text-xs font-medium cursor-pointer     w-full items-center"
                >
                <Upload className="w-4.5 h-4.5" />
                <span>Upload</span>
              </label>
              <input
                id="profileImageInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (file) {
