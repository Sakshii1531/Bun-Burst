import { useState, useMemo } from "react"
import { Monitor, Info, Check, Copy, Edit, ExternalLink, Settings, ArrowUpDown, Columns } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const panelLoginUrls = [
  {
    id: 1,
    panelName: "Admin Panel",
    loginUrl: "https://admin.stackfood.com/login",
    status: "active"
  },
  {
    id: 2,
    panelName: "Restaurant Panel",
    loginUrl: "https://restaurant.stackfood.com/login",
    status: "active"
  },
  {
    id: 3,
    panelName: "Deliveryman Panel",
    loginUrl: "https://delivery.stackfood.com/login",
    status: "active"
  },
  {
    id: 4,
    panelName: "Customer Panel",
    loginUrl: "https://app.stackfood.com/login",
    status: "active"
  }
]

export default function LoginSetup() {
  const [activeTab, setActiveTab] = useState("customer-login")
  const [loginOptions, setLoginOptions] = useState({
    manualLogin: true,
    otpLogin: true,
    socialMediaLogin: true
  })
  const [socialMedia, setSocialMedia] = useState({
    google: true,
    facebook: false,
    apple: false
  })
  const [verification, setVerification] = useState({
    emailVerification: true,
    phoneVerification: true
  })
  const [panelUrls, setPanelUrls] = useState(panelLoginUrls)
  const [editingId, setEditingId] = useState(null)
  const [editUrl, setEditUrl] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    panelName: true,
    loginUrl: true,
    status: true,
    actions: true,
  })

  const handleLoginOptionChange = (option) => {
    setLoginOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
  }

  const handleSocialMediaChange = (platform) => {
    setSocialMedia(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }))
  }

  const handleVerificationChange = (type) => {
    setVerification(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (activeTab === "customer-login") {
