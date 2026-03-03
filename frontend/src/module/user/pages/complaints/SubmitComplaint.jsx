import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, AlertCircle, FileText } from "lucide-react"
import { orderAPI } from "@/lib/api"
import { toast } from "sonner"

const COMPLAINT_TYPES = [
  { value: 'food_quality', label: 'Food Quality Issue' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'missing_item', label: 'Missing Item' },
  { value: 'delivery_issue', label: 'Delivery Issue' },
  { value: 'packaging', label: 'Packaging Problem' },
  { value: 'pricing', label: 'Pricing Issue' },
  { value: 'service', label: 'Service Issue' },
  { value: 'other', label: 'Other' },
]

export default function SubmitComplaint() {
  const navigate = useNavigate()
  const { orderId } = useParams()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    complaintType: '',
    subject: '',
    description: '',
  })

  useEffect(() => {
    if (!orderId) {
      console.error("Order ID missing from URL params")
      toast.error("Order ID is required")
      setTimeout(() => {
        navigate("/user/orders")
      }, 2000)
      return
    }

    const fetchOrder = async () => {
      try {
        setLoading(true)
