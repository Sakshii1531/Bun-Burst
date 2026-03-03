import { useState } from "react"
import { Settings, Info, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"

const thirdPartyServices = [
  {
    id: 1,
    name: "Stripe",
    category: "Payment Gateway",
    description: "Online payment processing",
    enabled: true,
    configured: true,
    fields: [
      { key: "publishableKey", label: "Publishable Key", value: "pk_test_...", type: "password" },
      { key: "secretKey", label: "Secret Key", value: "sk_test_...", type: "password" }
    ]
  },
  {
    id: 2,
    name: "PayPal",
    category: "Payment Gateway",
    description: "PayPal payment integration",
    enabled: true,
    configured: true,
    fields: [
      { key: "clientId", label: "Client ID", value: "AeA1QIZXiflr1...", type: "text" },
      { key: "clientSecret", label: "Client Secret", value: "ECm...", type: "password" }
    ]
  },
  {
    id: 3,
    name: "Razorpay",
    category: "Payment Gateway",
    description: "Razorpay payment gateway",
    enabled: false,
    configured: false,
    fields: [
      { key: "keyId", label: "Key ID", value: "", type: "text" },
      { key: "keySecret", label: "Key Secret", value: "", type: "password" }
    ]
  },
  {
    id: 4,
    name: "Twilio",
    category: "SMS Service",
    description: "SMS and messaging service",
    enabled: true,
    configured: true,
    fields: [
      { key: "accountSid", label: "Account SID", value: "AC...", type: "text" },
      { key: "authToken", label: "Auth Token", value: "...", type: "password" },
      { key: "phoneNumber", label: "Phone Number", value: "+1234567890", type: "text" }
    ]
  },
  {
    id: 5,
    name: "SendGrid",
    category: "Email Service",
    description: "Transactional email service",
    enabled: false,
    configured: false,
    fields: [
      { key: "apiKey", label: "API Key", value: "", type: "password" },
      { key: "fromEmail", label: "From Email", value: "", type: "email" }
    ]
  },
  {
    id: 6,
    name: "Google Maps",
    category: "Map Service",
    description: "Google Maps API integration",
    enabled: true,
    configured: true,
    fields: [
      { key: "apiKey", label: "API Key", value: "AIzaSy...", type: "password" }
    ]
  },
  {
    id: 7,
    name: "AWS S3",
    category: "Storage Service",
    description: "Amazon S3 file storage",
    enabled: false,
    configured: false,
    fields: [
      { key: "accessKeyId", label: "Access Key ID", value: "", type: "text" },
      { key: "secretAccessKey", label: "Secret Access Key", value: "", type: "password" },
      { key: "bucketName", label: "Bucket Name", value: "", type: "text" },
      { key: "region", label: "Region", value: "", type: "text" }
    ]
  }
]

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center w-11 h-6 rounded-full border transition-all ${
        enabled
          ? "bg-blue-600 border-blue-600 justify-end"
          : "bg-slate-200 border-slate-300 justify-start"
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  )
}

export default function ThirdParty() {
  const [services, setServices] = useState(thirdPartyServices)
  const [expandedService, setExpandedService] = useState(null)
  const [visibleFields, setVisibleFields] = useState({})
  const [fieldValues, setFieldValues] = useState(
    services.reduce((acc, service) => {
      service.fields.forEach(field => {
        acc[`${service.id}-${field.key}`] = field.value
      })
      return acc
    }, {})
  )

  const handleToggle = (id) => {
    setServices(prev => prev.map(service => 
      service.id === id ? { ...service, enabled: !service.enabled } : service
    ))
  }

  const handleFieldChange = (serviceId, fieldKey, value) => {
    const key = `${serviceId}-${fieldKey}`
    setFieldValues(prev => ({ ...prev, [key]: value }))
    
    // Mark as configured if at least one field has value
    const service = services.find(s => s.id === serviceId)
    const hasValue = service.fields.some(f => {
      const fieldKey = `${serviceId}-${f.key}`
      return fieldValues[fieldKey] || (f.key === fieldKey.split('-')[1] && value)
    })
    
    if (hasValue && !service.configured) {
      setServices(prev => prev.map(s => 
        s.id === serviceId ? { ...s, configured: true } : s
      ))
    }
  }

  const toggleFieldVisibility = (serviceId, fieldKey) => {
    const key = `${serviceId}-${fieldKey}`
    setVisibleFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = (serviceId) => {
    const service = services.find(s => s.id === serviceId)
    const serviceFields = service.fields.map(field => ({
      key: field.key,
      value: fieldValues[`${serviceId}-${field.key}`] || field.value
    }))
