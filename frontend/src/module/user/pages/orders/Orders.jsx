import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Search, MoreVertical, ChevronRight, Star, RotateCcw, AlertCircle, Loader2, Clock } from "lucide-react"
import { orderAPI, api, API_ENDPOINTS } from "@/lib/api"
import { toast } from "sonner"
import { getCompanyNameAsync } from "@/lib/utils/businessSettings"

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [ratingModal, setRatingModal] = useState({ open: false, order: null })
  const [activeMenuOrderId, setActiveMenuOrderId] = useState(null)
  const [selectedRating, setSelectedRating] = useState(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [submittingRating, setSubmittingRating] = useState(false)
  const [countdowns, setCountdowns] = useState({})
  // Track orders that have shown rating popup - persist in localStorage
  const [shownRatingForOrders, setShownRatingForOrders] = useState(() => {
    try {
      const stored = localStorage.getItem('shownRatingForOrders')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })
  
  // Save to localStorage whenever shownRatingForOrders changes
  useEffect(() => {
    try {
      localStorage.setItem('shownRatingForOrders', JSON.stringify(Array.from(shownRatingForOrders)))
    } catch (error) {
      console.error('Error saving shownRatingForOrders to localStorage:', error)
    }
  }, [shownRatingForOrders])

  // Calculate countdown for an order
  const calculateCountdown = (order) => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled' || order.status === 'restaurant_cancelled') {
      return null
    }

    const createdAt = new Date(order.createdAt)
    const now = new Date()
    const elapsedMinutes = Math.floor((now - createdAt) / (1000 * 60))
    
    // Get max ETA (use eta.max if available, otherwise estimatedDeliveryTime)
    const maxETA = order.eta?.max || order.estimatedDeliveryTime || 30
    const remainingMinutes = Math.max(0, maxETA - elapsedMinutes)
    
    return remainingMinutes > 0 ? remainingMinutes : null
  }

  // Update countdowns for all active orders
  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns = {}
      orders.forEach(order => {
        const remaining = calculateCountdown(order)
        if (remaining !== null) {
          newCountdowns[order.id] = remaining
        }
      })
      setCountdowns(newCountdowns)
    }

    updateCountdowns()
    const interval = setInterval(updateCountdowns, 10000) // Update every 10 seconds for better UX

    return () => clearInterval(interval)
  }, [orders])

  // Get order status text
  const getOrderStatus = (order) => {
    const status = order.status
    if (status === 'delivered' || status === 'completed') return 'delivered'
    if (status === 'out_for_delivery' || status === 'outForDelivery') return 'outForDelivery'
    if (status === 'ready') return 'preparing'
    if (status === 'preparing') return 'preparing'
    if (status === 'confirmed') return 'confirmed'
    return status || 'confirmed'
  }

  // Auto-show rating popup when order is delivered (only once per order)
  useEffect(() => {
    if (orders.length === 0 || ratingModal.open) {
      return
    }

 fallback to restaurant image, then generic food photo
            const firstItemImage = order.items?.[0]?.image
            const restaurantImage = firstItemImage 
              || order.restaurantImage 
              || "https://images.unsplash.com/photo-1604908176997-125188eb3c52?auto=format&fit=crop&w=200&q=80"
            const location = order.restaurantLocation || `${order.address?.city || ''}, ${order.address?.state || ''}`.trim() || 'Location not available'

            return (
              <div key={order.id} className="relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card Header: Restaurant Info */}
                <div className="flex items-start justify-between p-4 pb-2">
                  <div className="flex gap-3">
                    {/* Restaurant Image */}
                    <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                      <img 
                        src={restaurantImage} 
                        alt={order.restaurant} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=100&q=80"
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-lg leading-tight">{order.restaurant}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{location}</p>
                      {order.orderId && (
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">#{order.orderId}</p>
                      )}
                      {order.deliveryPartnerName && (
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Delivery:</span> {order.deliveryPartnerName}
                          {order.deliveryPartnerPhone && ` • ${order.deliveryPartnerPhone}`}
                        </p>
                      )}
                      {order.restaurantId && (
                        <Link to={`/user/restaurants/${order.restaurantId}`}>
                          <button className="text-xs text-red-500 font-medium flex items-center mt-1 hover:text-red-600">
                            View menu <span className="ml-0.5">▸</span>
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => toggleMenuForOrder(order.id)}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Three-dots dropdown menu */}
                {activeMenuOrderId === order.id && (
                  <div className="absolute right-3 top-10 z-20 w-40 rounded-xl bg-white shadow-lg border border-gray-100 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleShareRestaurant(order)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-800"
                    >
                      Share restaurant
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewOrderDetails(order)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-800"
                    >
                      Order details
                    </button>
                  </div>
                )}

                {/* Separator */}
                <div className="border-t border-dashed border-gray-200 mx-4 my-1"></div>

                {/* Items List */}
                <div className="px-4 py-2 space-y-2">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => {
                      const isVeg = item.isVeg !== undefined ? item.isVeg : (item.category === 'veg' || item.type === 'veg')
                      const itemName = item.name || item.foodName || 'Item'
                      const itemQuantity = item.quantity || 1
                      const itemPrice = item.price || 0
                      const itemTotal = itemQuantity * itemPrice
                      const itemImage = item.image || null
                      
                      return (
                        <div key={item._id || item.id || item.itemId || idx} className="flex items-start gap-3">
                          {/* Item Image */}
                          {itemImage && (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              <img 
                                src={itemImage} 
                                alt={itemName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              {/* Veg/Non-Veg Icon */}
                              <div className={`w-4 h-4 border ${isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center p-[2px] flex-shrink-0 mt-0.5`}>
                                <div className={`w-full h-full rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-gray-800 font-medium block">
                                  {itemQuantity} x {itemName}
                                </span>
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-sm font-semibold text-gray-800">₹{itemTotal.toFixed(2)}</span>
                                {itemQuantity > 1 && (
                                  <p className="text-xs text-gray-500">₹{itemPrice.toFixed(2)} each</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500">No items found</p>
                  )}
                </div>

                {/* Order Summary */}
                <div className="px-4 py-3 bg-gray-50 rounded-lg mx-4 mb-2">
                  <div className="space-y-1.5">
                    {order.subtotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-800 font-medium">₹{order.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="text-gray-800 font-medium">₹{order.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    {order.tax > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Tax</span>
                        <span className="text-gray-800 font-medium">₹{order.tax.toFixed(2)}</span>
                      </div>
                    )}
                    {order.pricing?.discount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">Discount</span>
                        <span className="text-green-600 font-medium">-₹{order.pricing.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {order.pricing?.couponCode && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Coupon Applied</span>
                        <span className="text-gray-800 font-medium">{order.pricing.couponCode}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-800">Total</span>
                        <span className="text-base font-bold text-gray-900">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date and Payment Info */}
                <div className="px-4 py-2 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Order placed on {formatDate(order.createdAt)}</p>
                    {order.deliveredAt && (
                      <p className="text-xs text-gray-400 mt-0.5">Delivered on {formatDate(order.deliveredAt)}</p>
                    )}
                    {order.payment && (
                      <p className="text-xs text-gray-500 mt-1">
                        Payment: <span className="font-medium capitalize">
                          {order.payment.method === 'cash' || order.payment.method === 'cod' ? 'Cash on Delivery' :
                           order.payment.method === 'wallet' ? 'Wallet' :
                           order.payment.method === 'razorpay' ? 'Online' :
                           order.payment.method || 'N/A'}
                        </span>
                        {order.payment.status && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            order.payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                            order.payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.payment.status}
                          </span>
                        )}
                      </p>
                    )}
                    {isDelivered && !paymentFailed && (
                      <p className="text-xs font-medium text-green-600 mt-1">✓ Delivered</p>
                    )}
                    {isRestaurantCancelled && (
                      <p className="text-xs font-medium text-red-500 mt-1">✗ Restaurant Cancelled</p>
                    )}
                    {isUserCancelled && (
                      <p className="text-xs font-medium text-gray-500 mt-1">✗ Cancelled by you</p>
                    )}
                    {isCancelled && !isRestaurantCancelled && !isUserCancelled && (
                      <p className="text-xs font-medium text-gray-500 mt-1">✗ Cancelled</p>
                    )}
                  </div>
                  <div className="flex items-center ml-4">
                    <Link to={`/user/orders/${order.id}`}>
                      <button className="text-xs text-red-500 font-medium hover:text-red-600 flex items-center gap-1">
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-gray-100 mx-4"></div>

                {/* Card Footer: Actions */}
                <div className="px-4 py-3 flex items-center justify-between">
                  {/* Left Side: Rating or Error */}
                  {isRestaurantCancelled ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="bg-red-100 p-1 rounded-full">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-xs font-semibold text-red-500">Restaurant Cancelled</span>
                      </div>
                      <p className="text-xs text-gray-600 ml-7">Refund will be processed in 24-48 hours</p>
                    </div>
                  ) : paymentFailed ? (
                    <div className="flex items-center gap-2">
                      <div className="bg-red-100 p-1 rounded-full">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </div>
                      <span className="text-xs font-semibold text-red-500">Payment failed</span>
                    </div>
                  ) : isDelivered && order.rating ? (
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-800">You rated</span>
                        <div className="flex bg-yellow-400 text-white px-1 rounded text-[10px] items-center gap-0.5 h-4">
                          {order.rating}<Star className="w-2 h-2 fill-current" />
                        </div>
                      </div>
                    </div>
                  ) : isDelivered ? (
                    <div>
                      <p className="text-xs text-gray-500">Order delivered</p>
                      <button
                        type="button"
                        onClick={() => handleOpenRating(order)}
                        className="text-xs text-red-500 font-medium mt-0.5 flex items-center"
                      >
                        Rate order <span className="ml-0.5">▸</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-500">{order.status === 'preparing' ? 'Preparing' : order.status === 'outForDelivery' ? 'Out for delivery' : order.status === 'confirmed' ? 'Order confirmed' : ''}</p>
                      {/* Countdown Timer */}
                      {countdowns[order.id] && countdowns[order.id] > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 font-medium">
                          <Clock size={12} />
                          <span>{countdowns[order.id]} min{countdowns[order.id] !== 1 ? 's' : ''} remaining</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Right Side: Reorder Button */}
                  {isDelivered && !paymentFailed && (
                    <button 
                      onClick={() => handleReorder(order)}
                      className="bg-[#E23744] hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Branding */}
      <div className="flex justify-center mt-8 mb-4">
        <h1 className="text-4xl font-black text-gray-200 tracking-tighter italic">appzeto</h1>
      </div>

      {/* Rating & Feedback Modal */}
      {ratingModal.open && ratingModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-[#E23744] to-red-600 px-6 py-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 fill-white" />
                  Rate Your Order
                </h2>
                <button
                  type="button"
                  onClick={handleCloseRating}
                  className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
              <p className="text-sm text-white/90">
                {ratingModal.order.restaurant} • Order #{ratingModal.order.id}
              </p>
            </div>

            <div className="px-6 py-6">
              {/* Star rating (1–5) */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-4 text-center">
                  How was your overall experience?
                </p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((num) => {
                    const isActive = (selectedRating || 0) >= num
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedRating(num)}
                        className="p-2 transition-transform hover:scale-125 active:scale-95"
                      >
                        <Star
                          className={`w-10 h-10 transition-all ${
                            isActive
                              ? "text-yellow-400 fill-yellow-400 drop-shadow-lg"
                              : "text-gray-300 hover:text-yellow-200"
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 px-2">
                  <span className="text-xs text-red-500 font-medium">Poor</span>
                  <span className="text-xs text-gray-400">Average</span>
                  <span className="text-xs text-green-600 font-medium">Excellent</span>
                </div>
                {selectedRating && (
                  <p className="text-center mt-3 text-sm font-medium text-gray-700">
                    {selectedRating === 5 && "⭐⭐⭐⭐⭐ Excellent!"}
                    {selectedRating === 4 && "⭐⭐⭐⭐ Great!"}
                    {selectedRating === 3 && "⭐⭐⭐ Good"}
                    {selectedRating === 2 && "⭐⭐ Fair"}
                    {selectedRating === 1 && "⭐ Poor"}
                  </p>
                )}
              </div>

              {/* Feedback textarea */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Share your feedback <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E23744] focus:border-[#E23744] resize-none transition-all"
                  placeholder="What did you like or dislike about this order? Share your experience..."
                />
                <p className="text-xs text-gray-400 mt-1">Your feedback helps us improve our service</p>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={submittingRating || selectedRating === null}
                onClick={handleSubmitRating}
                className="w-full rounded-xl bg-gradient-to-r from-[#E23744] to-red-600 text-white text-base font-bold py-3.5 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
              >
                {submittingRating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="w-5 h-5 fill-white" />
                    Submit Rating
                  </>
                )}
              </button>
              
              {selectedRating === null && (
                <p className="text-xs text-center text-red-500 mt-2">Please select a rating to continue</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
