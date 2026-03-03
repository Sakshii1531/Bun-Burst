import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, AlertCircle } from "lucide-react"

export default function UpdateBankDetails() {
  const navigate = useNavigate()
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Bank details state
  const [bankDetails, setBankDetails] = useState({
    beneficiaryName: "Mr. Rajkumar Chouhan",
    accountNumber: "42479177517",
    confirmAccountNumber: "42479177517",
    ifscCode: "SBIN0018764",
    lastUpdated: "9 Dec, 2023"
  })

  const [formData, setFormData] = useState({
    beneficiaryName: bankDetails.beneficiaryName,
    accountNumber: bankDetails.accountNumber,
    confirmAccountNumber: bankDetails.confirmAccountNumber,
    ifscCode: bankDetails.ifscCode
  })

  const [errors, setErrors] = useState({
    beneficiaryName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: ""
  })

  const [touched, setTouched] = useState({
    beneficiaryName: false,
    accountNumber: false,
    confirmAccountNumber: false,
    ifscCode: false
  })

  // Validation functions
  const validateBeneficiaryName = (name) => {
    if (!name.trim()) {
      return "Beneficiary name is required"
    }
    if (name.trim().length < 3) {
      return "Beneficiary name must be at least 3 characters"
    }
    if (name.trim().length > 100) {
      return "Beneficiary name must be less than 100 characters"
    }
    // Allow letters, spaces, dots, and common title prefixes
    const nameRegex = /^[A-Za-z\s.]+$/
    if (!nameRegex.test(name.trim())) {
      return "Beneficiary name can only contain letters, spaces, and dots"
    }
    return ""
  }

  const validateAccountNumber = (accountNumber) => {
    if (!accountNumber.trim()) {
      return "Account number is required"
    }
    // Remove spaces and hyphens for validation
    const cleanAccountNumber = accountNumber.replace(/[\s\-]/g, "")
    // Account numbers are typically 9-18 digits
    if (!/^\d+$/.test(cleanAccountNumber)) {
      return "Account number must contain only digits"
    }
    if (cleanAccountNumber.length < 9) {
      return "Account number must be at least 9 digits"
    }
    if (cleanAccountNumber.length > 18) {
      return "Account number must be less than 18 digits"
    }
    return ""
  }

  const validateConfirmAccountNumber = (confirmAccountNumber, accountNumber) => {
    if (!confirmAccountNumber.trim()) {
      return "Please confirm your account number"
    }
    const cleanConfirm = confirmAccountNumber.replace(/[\s\-]/g, "")
    const cleanAccount = accountNumber.replace(/[\s\-]/g, "")
    if (cleanConfirm !== cleanAccount) {
      return "Account numbers do not match"
    }
    return ""
  }

  const validateIFSC = (ifsc) => {
    if (!ifsc.trim()) {
      return "IFSC code is required"
    }
    
    const trimmedIFSC = ifsc.trim().toUpperCase()
    
    // IFSC format: exactly 11 characters - 4 uppercase letters + 0 + 6 alphanumeric characters
    // Pattern: AAAA0XXXXXX where AAAA is bank code (4 letters) and XXXXXX is branch code (6 alphanumeric)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
    
    if (trimmedIFSC.length !== 11) {
      return "IFSC code must be exactly 11 characters"
    }
    
    if (!ifscRegex.test(trimmedIFSC)) {
      return "Invalid IFSC code format (e.g., SBIN0018764)"
    }
    
    return ""
  }

  const handleInputChange = (field, value) => {
    let processedValue = value
    
    // Auto-uppercase for IFSC
    if (field === "ifscCode") {
      processedValue = value.toUpperCase()
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))

    // Real-time validation
    let error = ""
    if (field === "beneficiaryName") {
      error = validateBeneficiaryName(processedValue)
    } else if (field === "accountNumber") {
      error = validateAccountNumber(processedValue)
      // Also re-validate confirm account number if it's been touched
      if (touched.confirmAccountNumber) {
        setErrors(prev => ({
          ...prev,
          accountNumber: error,
          confirmAccountNumber: validateConfirmAccountNumber(formData.confirmAccountNumber, processedValue)
        }))
        return
      }
    } else if (field === "confirmAccountNumber") {
      error = validateConfirmAccountNumber(processedValue, formData.accountNumber)
    } else if (field === "ifscCode") {
      error = validateIFSC(processedValue)
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }))
  }

  const handleBlur = (field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }))

    // Validate on blur
    let error = ""
    if (field === "beneficiaryName") {
      error = validateBeneficiaryName(formData.beneficiaryName)
    } else if (field === "accountNumber") {
      error = validateAccountNumber(formData.accountNumber)
      // Re-validate confirm account number
      if (touched.confirmAccountNumber || formData.confirmAccountNumber) {
        setErrors(prev => ({
          ...prev,
          accountNumber: error,
          confirmAccountNumber: validateConfirmAccountNumber(formData.confirmAccountNumber, formData.accountNumber)
        }))
        return
      }
    } else if (field === "confirmAccountNumber") {
      error = validateConfirmAccountNumber(formData.confirmAccountNumber, formData.accountNumber)
    } else if (field === "ifscCode") {
      error = validateIFSC(formData.ifscCode)
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({
      beneficiaryName: true,
      accountNumber: true,
      confirmAccountNumber: true,
      ifscCode: true
    })

    // Validate all fields
    const validationErrors = {
      beneficiaryName: validateBeneficiaryName(formData.beneficiaryName),
      accountNumber: validateAccountNumber(formData.accountNumber),
      confirmAccountNumber: validateConfirmAccountNumber(formData.confirmAccountNumber, formData.accountNumber),
      ifscCode: validateIFSC(formData.ifscCode)
    }

    setErrors(validationErrors)

    // Check if there are any errors
    const hasErrors = Object.values(validationErrors).some(error => error !== "")
    if (hasErrors) {
      return
    }

    // Update bank details
    setBankDetails({
      beneficiaryName: formData.beneficiaryName.trim(),
      accountNumber: formData.accountNumber.replace(/[\s\-]/g, ""),
      confirmAccountNumber: formData.confirmAccountNumber.replace(/[\s\-]/g, ""),
      ifscCode: formData.ifscCode.trim().toUpperCase(),
      lastUpdated: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    })
    
    // Switch back to view mode
    setIsEditMode(false)
    
    // Reset touched state
    setTouched({
      beneficiaryName: false,
      accountNumber: false,
      confirmAccountNumber: false,
      ifscCode: false
    })
    
    // Here you would typically save to backend
