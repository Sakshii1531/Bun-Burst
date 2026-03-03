import { useState, useMemo, useEffect } from "react"
import { Search, Download, ChevronDown, Star, ArrowUpDown, Settings, FileText, FileSpreadsheet, Code, Check, Columns, Loader2, Eye } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { exportReviewsToCSV, exportReviewsToExcel, exportReviewsToPDF, exportReviewsToJSON } from "../../components/deliveryman/deliverymanExportUtils"
import { adminAPI } from "@/lib/api"
import { toast } from "sonner"

export default function DeliverymanReviews() {
  const [searchQuery, setSearchQuery] = useState("")
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    orderId: true,
    deliveryman: true,
    deliverymanId: true,
    customer: true,
    review: true,
    rating: true,
    date: true,
  })

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) {
      return reviews
    }
    
    const query = searchQuery.toLowerCase().trim()
    return reviews.filter(review =>
      review.deliveryman.toLowerCase().includes(query) ||
      review.customer.toLowerCase().includes(query) ||
      review.review.toLowerCase().includes(query) ||
      (review.orderId && review.orderId.toLowerCase().includes(query)) ||
      (review.deliverymanId && review.deliverymanId.toString().toLowerCase().includes(query))
    )
  }, [reviews, searchQuery])

  const handleExport = (format) => {
    if (filteredReviews.length === 0) {
      alert("No data to export")
      return
    }
    switch (format) {
      case "csv": exportReviewsToCSV(filteredReviews); break
      case "excel": exportReviewsToExcel(filteredReviews); break
      case "pdf": exportReviewsToPDF(filteredReviews); break
      case "json": exportReviewsToJSON(filteredReviews); break
    }
  }

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }))
  }

  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      orderId: true,
      deliveryman: true,
      deliverymanId: true,
      customer: true,
      review: true,
      rating: true,
      date: true,
    })
  }

  const columnsConfig = {
    si: "Serial Number",
    orderId: "Order ID",
    deliveryman: "Deliveryman",
    deliverymanId: "Delivery Boy ID",
    customer: "Customer",
    review: "Review",
    rating: "Rating",
    date: "Date & Time",
  }

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
      const year = date.getFullYear()
      const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      return `${day} ${month} ${year}, ${time}`
    } catch (e) {
      return 'Invalid Date'
    }
  }

  // Fetch deliveryman reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true)
