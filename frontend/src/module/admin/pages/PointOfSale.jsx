import { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, DollarSign, ShoppingCart, XCircle, Star, Calendar, BarChart3, Users, Award, Package } from 'lucide-react'
import { adminAPI } from '@/lib/api'

export default function PointOfSale() {
  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [restaurantData, setRestaurantData] = useState(null)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Dummy data structure - replace with actual API calls
  const [analyticsData, setAnalyticsData] = useState({
    totalOrders: 0,
    cancelledOrders: 0,
    completedOrders: 0,
    averageRating: 0,
    totalRatings: 0,
    commissionPercentage: 0,
    monthlyProfit: 0,
    yearlyProfit: 0,
    averageOrderValue: 0,
    totalRevenue: 0,
    totalCommission: 0,
    restaurantEarning: 0,
    monthlyOrders: 0,
    yearlyOrders: 0,
    averageMonthlyProfit: 0,
    averageYearlyProfit: 0,
    status: 'active',
    joinDate: '',
    totalCustomers: 0,
    repeatCustomers: 0,
    cancellationRate: 0,
    completionRate: 0
  })

  // Fetch restaurants list
  useEffect(() => {
    fetchRestaurants()
  }, [])

  // Fetch restaurant analytics when restaurant is selected
  useEffect(() => {
    if (selectedRestaurant) {
      fetchRestaurantAnalytics(selectedRestaurant)
    } else {
      setRestaurantData(null)
      setAnalyticsData({
        totalOrders: 0,
        cancelledOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalRatings: 0,
        commissionPercentage: 0,
        monthlyProfit: 0,
        yearlyProfit: 0,
        averageOrderValue: 0,
        totalRevenue: 0,
        totalCommission: 0,
        restaurantEarning: 0,
        monthlyOrders: 0,
        yearlyOrders: 0,
        averageMonthlyProfit: 0,
        averageYearlyProfit: 0,
        status: 'active',
        joinDate: '',
        totalCustomers: 0,
        repeatCustomers: 0,
        cancellationRate: 0,
        completionRate: 0
      })
    }
  }, [selectedRestaurant])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getRestaurants({ limit: 1000, isActive: true })
      if (response?.data?.success) {
        setRestaurants(response.data.data?.restaurants || response.data.data || [])
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error)
      // Fallback to dummy data for development
      setRestaurants([
        { _id: '1', name: 'Spice Garden', restaurantId: 'RST001' },
        { _id: '2', name: 'Tandoor Express', restaurantId: 'RST002' },
        { _id: '3', name: 'Coastal Delights', restaurantId: 'RST003' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchRestaurantAnalytics = async (restaurantId) => {
    try {
      setLoading(true)
      
      // Validate restaurantId
      if (!restaurantId) {
        console.error('Restaurant ID is required')
        return
      }
      
        
