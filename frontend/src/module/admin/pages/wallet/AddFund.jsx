import { useState } from "react"
import { Wallet, Settings } from "lucide-react"

export default function AddFund() {
  const [formData, setFormData] = useState({
    customer: "",
    amount: "",
    reference: "",
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
