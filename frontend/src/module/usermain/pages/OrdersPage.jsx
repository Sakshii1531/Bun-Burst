import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft,
  Clock,
  CheckCircle,
  Home,
  Heart,
  ShoppingBag,
  Menu,
  ChefHat,
  Loader2,
  AlertCircle
} from "lucide-react"
import { userAPI } from "@/lib/api"
import { toast } from "sonner"

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        
        // Check authentication token
        const userToken = localStorage.getItem('user_accessToken') || localStorage.getItem('accessToken')
        const userData = localStorage.getItem('user_user') || localStorage.getItem('userProfile')
        let currentUserId = null
        if (userData) {
          try {
            const parsed = JSON.parse(userData)
            currentUserId = parsed._id || parsed.id
