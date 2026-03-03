import { useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft,
  Camera,
  Save
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function EditProfile() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: "Jhon Doe",
    phone: "+8801700000000",
    email: "jhon.doe@example.com",
    shift: "Morning (04:00 AM - 11:59 AM)"
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission
