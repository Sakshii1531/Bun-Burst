import { useState } from "react"
import { Cloud, Settings, Info } from "lucide-react"

const languageTabs = [
  { key: "default", label: "Default" },
  { key: "en", label: "English(EN)" },
  { key: "bn", label: "Bengali - বাংলা(BN)" },
  { key: "ar", label: "Arabic - العربية (AR)" },
  { key: "es", label: "Spanish - español(ES)" }
]

const notificationMessages = [
  {
    id: 1,
    key: "orderPending",
    label: "Order pending message",
    defaultText: "Your order {orderId} is pending",
    enabled: true
  },
  {
    id: 2,
    key: "orderConfirmation",
    label: "Order confirmation message",
    defaultText: "Your order {orderId} has been confirmed",
    enabled: true
  },
  {
    id: 3,
    key: "orderProcessing",
    label: "Order processing message",
    defaultText: "Your order {orderId} is being processed",
    enabled: true
  },
  {
    id: 4,
    key: "restaurantHandover",
    label: "Restaurant handover message",
    defaultText: "Your order {orderId} has been handed over to restaurant {restaurantName}",
    enabled: true
  },
  {
    id: 5,
    key: "orderOutForDelivery",
    label: "Order out for delivery message",
    defaultText: "Your order {orderId} is out for delivery",
    enabled: true
  },
  {
    id: 6,
    key: "orderDelivered",
    label: "Order delivered message",
    defaultText: "Your order {orderId} has been delivered",
    enabled: true
  },
  {
    id: 7,
    key: "deliverymanAssign",
    label: "Deliveryman assign message",
    defaultText: "Deliveryman {userName} has been assigned to your order {orderId}",
    enabled: true
  },
  {
    id: 8,
    key: "deliverymanDelivered",
    label: "Deliveryman delivered message",
    defaultText: "Deliveryman {userName} has delivered your order {orderId}",
    enabled: true
  },
  {
    id: 9,
    key: "orderCanceled",
    label: "Order canceled message",
    defaultText: "Your order {orderId} has been canceled",
    enabled: true
  },
  {
    id: 10,
    key: "orderRefunded",
    label: "Order refunded message",
    defaultText: "Your order {orderId} has been refunded",
    enabled: true
  },
  {
    id: 11,
    key: "orderRefundCancel",
    label: "Order Refund cancel message",
    defaultText: "Refund for order {orderId} has been canceled",
    enabled: true
  },
  {
    id: 12,
    key: "offlineOrderDeny",
    label: "Offline order deny message",
    defaultText: "Ex : Your offline payment is denied",
    enabled: false
  },
  {
    id: 13,
    key: "offlineOrderAccept",
    label: "Offline order accept message",
    defaultText: "Ex : Your offline payment is accepted",
    enabled: false
  }
]

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center w-11 h-6 rounded-full border transition-all ${enabled
          ? "bg-blue-600 border-blue-600 justify-end"
          : "bg-slate-200 border-slate-300 justify-start"
        }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  )
}

export default function FirebaseNotification() {
  const [activeTab, setActiveTab] = useState("push-notification")
  const [activeLanguage, setActiveLanguage] = useState("bn")
  const [messages, setMessages] = useState(notificationMessages)
  const [firebaseConfig, setFirebaseConfig] = useState({
    serviceFileContent: "",
    apiKey: "",
    fcmProjectId: "",
    messagingSenderId: "",
    authDomain: "",
    appId: "",
    storageBucket: "",
    measurementId: ""
  })

  const handleMessageToggle = (id) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, enabled: !msg.enabled } : msg
    ))
  }

  const handleMessageChange = (id, value) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, defaultText: value } : msg
    ))
  }

  const handleFirebaseConfigChange = (key, value) => {
    setFirebaseConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
