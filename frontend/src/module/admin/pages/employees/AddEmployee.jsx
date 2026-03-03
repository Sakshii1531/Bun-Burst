import { useState } from "react"
import { UserPlus, User, Eye, EyeOff, Upload, ChevronDown } from "lucide-react"

export default function AddEmployee() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    zone: "All",
    role: "",
    phone: "",
    phoneCode: "+1",
    employeeImage: null,
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (field, file) => {
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
