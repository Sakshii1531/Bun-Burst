import { useState, useMemo, useEffect } from "react"
import { 
  Search, Filter, Eye, Check, X, UtensilsCrossed, ArrowUpDown, Loader2,
  FileText, Image as ImageIcon, ExternalLink, CreditCard, Calendar, Star, Building2, User, Phone, Mail, MapPin, Clock
} from "lucide-react"
import { adminAPI, restaurantAPI } from "../../../../lib/api"

export default function JoiningRequest() {
  const [activeTab, setActiveTab] = useState("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [pendingRequests, setPendingRequests] = useState([])
  const [rejectedRequests, setRejectedRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [restaurantDetails, setRestaurantDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [filters, setFilters] = useState({
    zone: "",
    businessModel: "",
    dateFrom: "",
    dateTo: ""
  })

  // Fetch restaurant join requests
  useEffect(() => {
    fetchRequests()
  }, [activeTab])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const status = activeTab === "pending" ? "pending" : "rejected"
      const response = await adminAPI.getRestaurantJoinRequests({
        status,
        search: searchQuery || undefined,
        page: 1,
        limit: 100
      })

      if (response.data && response.data.success && response.data.data) {
        const requests = response.data.data.requests || []
        if (activeTab === "pending") {
          setPendingRequests(requests)
        } else {
          setRejectedRequests(requests)
        }
      } else {
        if (activeTab === "pending") {
          setPendingRequests([])
        } else {
          setRejectedRequests([])
        }
      }
    } catch (err) {
      console.error("Error fetching restaurant requests:", err)
      setError(err.message || "Failed to fetch restaurant requests")
      if (activeTab === "pending") {
        setPendingRequests([])
      } else {
        setRejectedRequests([])
      }
    } finally {
      setLoading(false)
    }
  }

  const currentRequests = activeTab === "pending" ? pendingRequests : rejectedRequests

  // Get unique zones and business models for filter options
  const filterOptions = useMemo(() => {
    const zones = [...new Set(currentRequests.map(r => r.zone).filter(Boolean))]
    const businessModels = [...new Set(currentRequests.map(r => r.businessModel).filter(Boolean))]
    return { zones, businessModels }
  }, [currentRequests])

  const filteredRequests = useMemo(() => {
    let filtered = currentRequests

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(request =>
        request.restaurantName?.toLowerCase().includes(query) ||
        request.ownerName?.toLowerCase().includes(query) ||
        request.ownerPhone?.includes(query)
      )
    }

    // Apply zone filter
    if (filters.zone) {
      filtered = filtered.filter(request => request.zone === filters.zone)
    }

    // Apply business model filter
    if (filters.businessModel) {
      filtered = filtered.filter(request => request.businessModel === filters.businessModel)
    }

    // Apply date range filter
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(request => {
        if (!request.createdAt) return false
        const requestDate = new Date(request.createdAt).setHours(0, 0, 0, 0)
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0)
          if (requestDate < fromDate) return false
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999)
          if (requestDate > toDate) return false
        }
        return true
      })
    }

    return filtered
  }, [currentRequests, searchQuery, filters])

  const clearFilters = () => {
    setFilters({
      zone: "",
      businessModel: "",
      dateFrom: "",
      dateTo: ""
    })
  }

  const hasActiveFilters = filters.zone || filters.businessModel || filters.dateFrom || filters.dateTo

  const handleApprove = async (request) => {
    if (window.confirm(`Are you sure you want to approve "${request.restaurantName}" restaurant request?`)) {
      try {
        setProcessing(true)
        await adminAPI.approveRestaurant(request._id)
        
        // Refresh the list
        await fetchRequests()
        
        alert(`Successfully approved ${request.restaurantName}'s join request!`)
      } catch (err) {
        console.error("Error approving request:", err)
        alert(err.response?.data?.message || "Failed to approve request. Please try again.")
      } finally {
        setProcessing(false)
      }
    }
  }

  const handleReject = (request) => {
    setSelectedRequest(request)
    setRejectionReason("")
    setShowRejectDialog(true)
  }

  const confirmReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert("Please provide a rejection reason")
      return
    }

    try {
      setProcessing(true)
      await adminAPI.rejectRestaurant(selectedRequest._id, rejectionReason)
      
      // Refresh the list
      await fetchRequests()
      
      setShowRejectDialog(false)
      setSelectedRequest(null)
      setRejectionReason("")
      
      alert(`Successfully rejected ${selectedRequest.restaurantName}'s join request!`)
    } catch (err) {
      console.error("Error rejecting request:", err)
      alert(err.response?.data?.message || "Failed to reject request. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  const formatPhone = (phone) => {
    if (!phone) return "N/A"
    return phone
  }

  // Handle view restaurant details
  const handleViewDetails = async (request) => {
    setSelectedRequest(request)
    setShowDetailsModal(true)
    setLoadingDetails(true)
    setRestaurantDetails(null)
    
    try {
      // First, use fullData if available (has all details from API)
      if (request.fullData) {
