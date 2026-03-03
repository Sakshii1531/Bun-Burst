import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft,
  Search,
  Mic,
  MoreVertical,
  ChevronRight,
  Star,
  RotateCcw,
  AlertCircle,
  Loader2,
  Package
} from "lucide-react"
import { deliveryAPI } from "@/lib/api"
import { toast } from "sonner"
import { useCompanyName } from "@/lib/hooks/useCompanyName"

export default function MyOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        
        // Check authentication token
        const deliveryToken = localStorage.getItem('delivery_accessToken') || localStorage.getItem('accessToken')
