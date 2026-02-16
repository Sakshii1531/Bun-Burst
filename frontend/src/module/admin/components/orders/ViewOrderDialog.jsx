import { useState, useEffect } from "react"
import { adminAPI } from "@/lib/api"
import { toast } from "sonner"
import { Eye, MapPin, Package, User, Phone, Mail, Calendar, Clock, Truck, CreditCard, X, Receipt, FileText, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const getStatusColor = (orderStatus) => {
  const colors = {
    "Delivered": "bg-emerald-100 text-emerald-700",
    "Pending": "bg-blue-100 text-blue-700",
    "Scheduled": "bg-blue-100 text-blue-700",
    "Accepted": "bg-green-100 text-green-700",
    "Processing": "bg-orange-100 text-orange-700",
    "Food On The Way": "bg-yellow-100 text-yellow-700",
    "Canceled": "bg-rose-100 text-rose-700",
    "Cancelled by Restaurant": "bg-red-100 text-red-700",
    "Cancelled by User": "bg-orange-100 text-orange-700",
    "Payment Failed": "bg-red-100 text-red-700",
    "Refunded": "bg-sky-100 text-sky-700",
    "Dine In": "bg-indigo-100 text-indigo-700",
    "Offline Payments": "bg-slate-100 text-slate-700",
  }
  return colors[orderStatus] || "bg-slate-100 text-slate-700"
}

const getPaymentStatusColor = (paymentStatus) => {
  if (paymentStatus === "Paid" || paymentStatus === "Collected") return "text-emerald-600"
  if (paymentStatus === "Not Collected") return "text-amber-600"
  if (paymentStatus === "Unpaid" || paymentStatus === "Failed") return "text-red-600"
  return "text-slate-600"
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ViewOrderDialog({ isOpen, onOpenChange, order }) {
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [deliveryPartners, setDeliveryPartners] = useState([])
  const [selectedPartner, setSelectedPartner] = useState("")
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [showDigitalBillPopup, setShowDigitalBillPopup] = useState(false)
  const [isLoadingBill, setIsLoadingBill] = useState(false)

  useEffect(() => {
    if (showAssignDialog) {
      setIsLoadingPartners(true)
      adminAPI.getDeliveryPartners({ status: 'approved', isActive: true })
        .then(res => {
          // Handle various response structures
          const partners = res.data?.data?.deliveryPartners || res.data?.deliveryPartners || []
          setDeliveryPartners(partners)
        })
        .catch(err => {
          console.error("Failed to fetch delivery partners", err)
          toast.error("Failed to load delivery partners")
        })
        .finally(() => setIsLoadingPartners(false))
    }
  }, [showAssignDialog])

  const handleAssign = async () => {
    if (!selectedPartner) return
    try {
      setIsAssigning(true)
      await adminAPI.assignOrder(order.id || order.orderId, selectedPartner)
      toast.success("Delivery partner assigned successfully")
      setShowAssignDialog(false)
      onOpenChange(false) // Close main dialog to refresh
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || "Failed to assign delivery partner")
    } finally {
      setIsAssigning(false)
    }
  }

  if (!order) return null

  // Debug: Log order data to check billImageUrl
  if (order.billImageUrl) {
    console.log('📸 Bill Image URL found:', order.billImageUrl)
  } else {
    console.log('⚠️ Bill Image URL not found in order:', {
      orderId: order.orderId,
      hasBillImageUrl: !!order.billImageUrl,
      orderKeys: Object.keys(order)
    })
  }

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return "N/A"

    const parts = []
    if (address.label) parts.push(address.label)
    if (address.street) parts.push(address.street)
    if (address.additionalDetails) parts.push(address.additionalDetails)
    if (address.formattedAddress) {
      parts.push(address.formattedAddress)
    } else {
      if (address.city) parts.push(address.city)
      if (address.state) parts.push(address.state)
      if (address.zipCode) parts.push(address.zipCode)
    }

    return parts.length > 0 ? parts.join(", ") : "Address not available"
  }

  // Get coordinates if available
  const getCoordinates = (address) => {
    if (address?.location?.coordinates && Array.isArray(address.location.coordinates) && address.location.coordinates.length === 2) {
      const [lng, lat] = address.location.coordinates
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-white p-0 overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 sticky top-0 bg-white z-10">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-600" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              View complete information about this order
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-6">
            {/* Basic Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Order ID
                  </p>
                  <p className="text-sm font-medium text-slate-900">{order.orderId || order.id || order.subscriptionId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Order Date
                  </p>
                  <p className="text-sm font-medium text-slate-900">{order.date}{order.time ? `, ${order.time}` : ""}</p>
                </div>
                {order.estimatedDeliveryTime && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Estimated Delivery Time
                    </p>
                    <p className="text-sm font-medium text-slate-900">{order.estimatedDeliveryTime} minutes</p>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Delivered At
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(order.deliveredAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).toUpperCase()}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {order.orderStatus && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Status</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                    {order.cancellationReason && (
                      <p className="text-xs text-red-600 mt-1">
                        <span className="font-medium">
                          {order.cancelledBy === 'user' ? 'Cancelled by User - ' :
                            order.cancelledBy === 'restaurant' ? 'Cancelled by Restaurant - ' :
                              'Cancellation '}Reason:
                        </span> {order.cancellationReason}
                      </p>
                    )}
                    {order.cancelledAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        Cancelled: {new Date(order.cancelledAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).toUpperCase()}
                      </p>
                    )}
                  </div>
                )}
                {(order.paymentStatus || order.paymentCollectionStatus != null) && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Payment Status
                    </p>
                    <p className={`text-sm font-medium ${getPaymentStatusColor(
                      order.paymentType === 'Cash on Delivery' || order.payment?.method === 'cash' || order.payment?.method === 'cod'
                        ? (order.paymentCollectionStatus ?? (order.status === 'delivered' ? 'Collected' : 'Not Collected'))
                        : order.paymentStatus
                    )}`}>
                      {order.paymentType === 'Cash on Delivery' || order.payment?.method === 'cash' || order.payment?.method === 'cod'
                        ? (order.paymentCollectionStatus ?? (order.status === 'delivered' ? 'Collected' : 'Not Collected'))
                        : order.paymentStatus}
                    </p>
                  </div>
                )}
                {order.deliveryType && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Delivery Type
                    </p>
                    <p className="text-sm font-medium text-slate-900">{order.deliveryType}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Name</p>
                  <p className="text-sm font-medium text-slate-900">{order.customerName || "N/A"}</p>
                </div>
                {order.customerPhone && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </p>
                    <p className="text-sm font-medium text-slate-900">{order.customerPhone}</p>
                  </div>
                )}
                {order.customerEmail && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </p>
                    <p className="text-sm font-medium text-slate-900">{order.customerEmail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Restaurant Information */}
            {order.restaurant && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Restaurant Information</h3>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Restaurant Name</p>
                  <p className="text-sm font-medium text-slate-900">{order.restaurant}</p>
                </div>
              </div>
            )}

            {/* Order Items */}
            {order.items && Array.isArray(order.items) && order.items.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Order Items ({order.items.length})
                </h3>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded">
                            {item.quantity || 1}x
                          </span>
                          <p className="text-sm font-medium text-slate-900">{item.name || "Unknown Item"}</p>
                          {item.isVeg !== undefined && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${item.isVeg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-1 ml-8">{item.description}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bill Image (Captured by Delivery Boy) */}
            {(order.billImageUrl || order.billImage || order.deliveryState?.billImageUrl) && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-600" />
                  Bill Image (Captured by Delivery Boy)
                </h3>
                <div className="space-y-3">
                  <div className="relative w-full max-w-2xl border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
                    <img
                      src={order.billImageUrl || order.billImage || order.deliveryState?.billImageUrl}
                      alt="Order Bill"
                      className="w-full h-auto object-contain max-h-[500px] mx-auto block"
                      loading="lazy"
                      onError={(e) => {
                        console.error('❌ Failed to load bill image:', e.target.src)
                        e.target.style.display = 'none';
                        const errorDiv = e.target.parentElement.querySelector('.error-message');
                        if (errorDiv) errorDiv.style.display = 'block';
                      }}
                      onLoad={() => {
                        console.log('✅ Bill image loaded successfully')
                      }}
                    />
                    <div className="error-message hidden p-6 text-center text-slate-500 text-sm bg-slate-50">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      Failed to load bill image
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={order.billImageUrl || order.billImage || order.deliveryState?.billImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Size
                    </a>
                    <a
                      href={order.billImageUrl || order.billImage || order.deliveryState?.billImageUrl}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Digital Bill - Always show */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                Digital Invoice
                {order.digitalBillUploaded && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Uploaded by Delivery Boy
                  </span>
                )}
              </h3>
              {order.digitalBillUploadedAt && (
                <p className="text-xs text-slate-500 mb-3">
                  Uploaded on {new Date(order.digitalBillUploadedAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowDigitalBillPopup(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm"
                >
                  <Eye className="w-4 h-4" />
                  View Bill
                </button>
                <button
                  onClick={async () => {
                    setIsLoadingBill(true);
                    try {
                      // Generate HTML bill
                      const billHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${order.orderId || 'N/A'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 8px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .content { padding: 32px; }
    .section { margin-bottom: 32px; }
    .section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .info-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .info-box h3 { font-size: 18px; margin-bottom: 4px; }
    .info-box p { color: #6b7280; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    thead { background: #f3f4f6; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { font-weight: 600; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    td { font-size: 14px; }
    .text-right { text-align: right; }
    .font-semibold { font-weight: 600; }
    .pricing-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .pricing-row.total {
      background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      font-size: 18px;
      font-weight: 700;
      color: #9a3412;
    }
    .footer {
      border-top: 2px solid #e5e7eb;
      padding-top: 16px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .addons { font-size: 12px; color: #6b7280; margin-top: 4px; }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Digital Invoice</h1>
      <p>Order #${order.orderId || 'N/A'}</p>
    </div>
    
    <div class="content">
      <!-- Restaurant Info -->
      <div class="section">
        <div class="section-title">From</div>
        <div class="info-box">
          <h3>${order.restaurantId?.name || order.restaurantName || 'Restaurant'}</h3>
          <p>${order.restaurantId?.address || order.restaurantId?.location?.address || 'Address'}</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="section">
        <div class="section-title">Bill To</div>
        <div class="info-box">
          <h3>${order.userId?.name || order.userName || 'Customer'}</h3>
          <p>${order.deliveryAddress?.street || order.deliveryLocation?.address || 'Delivery Address'}</p>
        </div>
      </div>

      <!-- Order Items -->
      <div class="section">
        <div class="section-title">Order Items</div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map(item => `
              <tr>
                <td>
                  <div class="font-semibold">${item.name || item.menuItemId?.name || 'Item'}</div>
                  ${item.selectedAddons && item.selectedAddons.length > 0 ? `
                    <div class="addons">Addons: ${item.selectedAddons.map(a => a.name).join(', ')}</div>
                  ` : ''}
                </td>
                <td class="text-right">${item.quantity || 1}</td>
                <td class="text-right">₹${(item.price || 0).toFixed(2)}</td>
                <td class="text-right font-semibold">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
              </tr>
            `).join('') || '<tr><td colspan="4">No items</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Pricing Summary -->
      <div class="section">
        <div class="pricing-row">
          <span>Subtotal</span>
          <span class="font-semibold">₹${(order.pricing?.subtotal || order.pricing?.itemTotal || 0).toFixed(2)}</span>
        </div>
        ${(order.pricing?.tax || 0) > 0 ? `
          <div class="pricing-row">
            <span>Tax & Fees</span>
            <span class="font-semibold">₹${order.pricing.tax.toFixed(2)}</span>
          </div>
        ` : ''}
        ${(order.pricing?.deliveryFee || 0) > 0 ? `
          <div class="pricing-row">
            <span>Delivery Fee</span>
            <span class="font-semibold">₹${order.pricing.deliveryFee.toFixed(2)}</span>
          </div>
        ` : ''}
        ${(order.pricing?.discount || 0) > 0 ? `
          <div class="pricing-row" style="color: #059669;">
            <span>Discount</span>
            <span class="font-semibold">-₹${order.pricing.discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="pricing-row total">
          <span>Total Amount</span>
          <span>₹${(order.pricing?.total || 0).toFixed(2)}</span>
        </div>
      </div>

      <!-- Payment Info -->
      <div class="section">
        <div class="pricing-row">
          <span>Payment Method</span>
          <span class="font-semibold">${order.payment?.method === 'cash' ? 'Cash on Delivery' : 'Online Payment'}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Bill generated on ${new Date(order.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
        <p style="margin-top: 8px;">Thank you for your order!</p>
      </div>
    </div>
  </div>
</body>
</html>
                      `.trim();

                      // Create and download the HTML file
                      const blob = new Blob([billHtml], { type: 'text/html' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `Invoice-${order.orderId || order.id}.html`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);

                      toast.success('Bill downloaded successfully!');
                    } catch (error) {
                      console.error('Error downloading bill:', error);
                      toast.error('Failed to download bill');
                    } finally {
                      setIsLoadingBill(false);
                    }
                  }}
                  disabled={isLoadingBill}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Package className="w-4 h-4" />
                  {isLoadingBill ? 'Downloading...' : 'Download Bill'}
                </button>
              </div>
            </div>

            {/* Delivery Address */}
            {order.address && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Delivery Address
                </h3>
                <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-900">{formatAddress(order.address)}</p>
                  {getCoordinates(order.address) && (
                    <p className="text-xs text-slate-500 mt-2">
                      <span className="font-medium">Coordinates:</span> {getCoordinates(order.address)}
                    </p>
                  )}
                  {order.address.label && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium">Label:</span> {order.address.label}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Partner Information */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Delivery Partner
              </h3>
              {order.deliveryPartnerName || order.deliveryPartnerPhone ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.deliveryPartnerName && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</p>
                      <p className="text-sm font-medium text-slate-900">{order.deliveryPartnerName}</p>
                    </div>
                  )}
                  {order.deliveryPartnerPhone && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-medium text-slate-900">{order.deliveryPartnerPhone}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-slate-500 italic">No delivery partner assigned</p>
                  {/* Allow assignment if status is not final/cancelled */}
                  {!['delivered', 'cancelled', 'scheduled', 'dine_in', 'refunded'].includes((order.status || '').toLowerCase()) && (
                    <button
                      onClick={() => setShowAssignDialog(true)}
                      className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      Assign Delivery Partner
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pricing Breakdown */}
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Pricing Breakdown</h3>
              <div className="space-y-2">
                {order.totalItemAmount !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium text-slate-900">₹{order.totalItemAmount.toFixed(2)}</span>
                  </div>
                )}
                {order.itemDiscount !== undefined && order.itemDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Discount</span>
                    <span className="font-medium text-emerald-600">-₹{order.itemDiscount.toFixed(2)}</span>
                  </div>
                )}
                {order.couponDiscount !== undefined && order.couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Coupon Discount</span>
                    <span className="font-medium text-emerald-600">-₹{order.couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {order.deliveryCharge !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Delivery Charge</span>
                    <span className="font-medium text-slate-900">
                      {order.deliveryCharge > 0 ? `₹${order.deliveryCharge.toFixed(2)}` : <span className="text-emerald-600">Free delivery</span>}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Platform Fee</span>
                  <span className="font-medium text-slate-900">
                    {order.platformFee !== undefined && order.platformFee > 0
                      ? `₹${order.platformFee.toFixed(2)}`
                      : <span className="text-slate-400">₹0.00</span>}
                  </span>
                </div>
                {order.vatTax !== undefined && order.vatTax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax (GST)</span>
                    <span className="font-medium text-slate-900">₹{order.vatTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-slate-700">Total Amount</span>
                    <span className="text-xl font-bold text-emerald-600">
                      ₹{(order.totalAmount || order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Delivery Partner Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg font-semibold text-slate-900">Assign Delivery Partner</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Assign a delivery partner for Order <span className="font-mono font-medium text-slate-700">#{order.orderId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Select Partner</label>
              <Select
                value={selectedPartner}
                onValueChange={setSelectedPartner}
                disabled={isLoadingPartners}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingPartners ? "Loading partners..." : "Select a delivery partner"} />
                </SelectTrigger>
                <SelectContent>
                  {deliveryPartners.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500 text-center">No active partners found</div>
                  ) : (
                    deliveryPartners.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.availability?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="font-medium">{p.name}</span>
                          {p.phone && <span className="text-slate-500 text-xs">({p.phone})</span>}
                          {p.availability?.isOnline ? (
                            <span className="text-emerald-600 text-xs bg-emerald-50 px-1.5 py-0.5 rounded">Online</span>
                          ) : (
                            <span className="text-slate-500 text-xs bg-slate-100 px-1.5 py-0.5 rounded">Offline</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="px-6 pb-6 pt-2 flex justify-end gap-3 bg-slate-50/50 border-t border-slate-100 mt-2">
            <button
              onClick={() => setShowAssignDialog(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedPartner || isAssigning}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isAssigning ? 'Assigning...' : 'Assign Partner'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Digital Bill Popup Modal */}
      <Dialog open={showDigitalBillPopup} onOpenChange={setShowDigitalBillPopup}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-5 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold">Digital Invoice</h2>
                  <p className="text-orange-100 text-sm">Invoice #{order?.orderId || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Bill Content */}
            <div className="p-6 space-y-5">
              {/* Restaurant Info */}
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">From</p>
                <h3 className="text-lg font-bold text-gray-900">
                  {order.restaurant || order.restaurantName || order.restaurantId?.name || 'Bun Burst Cafe'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {order.restaurantAddress || order.restaurantId?.address || order.restaurantId?.location?.address || 'Address'}
                </p>
              </div>

              {/* Customer Info */}
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
                <h3 className="text-base font-semibold text-gray-900">
                  {order.customerName || order.userId?.name || 'Customer'}
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  {formatAddress(order.address)}
                </div>
              </div>

              {/* Order Items */}
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Items</p>
                <div className="space-y-3">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name || item.menuItemId?.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Addons: {item.selectedAddons.map(a => a.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        ₹{((item.price || item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-sm font-medium text-gray-900">
                    ₹{(order.totalItemAmount || order.pricing?.subtotal || 0).toFixed(2)}
                  </p>
                </div>
                {(order.vatTax || order.pricing?.tax || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Tax & Fees (GST)</p>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{(order.vatTax || order.pricing?.tax || 0).toFixed(2)}
                    </p>
                  </div>
                )}
                {(order.deliveryCharge || order.pricing?.deliveryFee || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Delivery Fee</p>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{(order.deliveryCharge || order.pricing?.deliveryFee || 0).toFixed(2)}
                    </p>
                  </div>
                )}
                {(order.platformFee || order.pricing?.platformFee || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Platform Fee</p>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{(order.platformFee || order.pricing?.platformFee || 0).toFixed(2)}
                    </p>
                  </div>
                )}
                {((order.itemDiscount || 0) + (order.couponDiscount || 0) + (order.pricing?.discount || 0)) > 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-green-600">Total Discount</p>
                    <p className="text-sm font-medium text-green-600">
                      -₹{((order.itemDiscount || 0) + (order.couponDiscount || 0) + (order.pricing?.discount || 0)).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex justify-between items-center">
                  <p className="text-base font-bold text-gray-900">Total Amount</p>
                  <p className="text-xl font-bold text-orange-700">
                    ₹{(order.totalAmount || order.total || order.pricing?.total || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="text-sm font-medium text-gray-900">
                  {order?.payment?.method === 'cash' ? 'Cash on Delivery' : 'Online Payment'}
                </p>
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Bill generated on {order?.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

