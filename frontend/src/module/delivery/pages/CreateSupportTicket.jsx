import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import { deliveryAPI } from "@/lib/api"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function CreateSupportTicket() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    category: "other",
    priority: "medium"
  })
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required"
    } else if (formData.subject.trim().length < 3) {
      newErrors.subject = "Subject must be at least 3 characters"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" })
    }
  }

  const handleCreateTicket = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    try {
      setCreating(true)

      // Prepare request data
      const requestData = {
        subject: formData.subject.trim(),
        description: formData.description.trim()
      }

      // Only include category and priority if they have valid values
      if (formData.category && formData.category !== '') {
        requestData.category = formData.category
      }
      if (formData.priority && formData.priority !== '') {
        requestData.priority = formData.priority
      }

