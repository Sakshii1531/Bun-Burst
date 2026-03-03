import { useState, useMemo } from "react"
import { Search, Download, ChevronDown, Edit, Trash2, Calendar, RefreshCw } from "lucide-react"
import { cashbackDummy } from "../data/cashbackDummy"

export default function Cashback() {
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [searchQuery, setSearchQuery] = useState("")
  const [cashbackType, setCashbackType] = useState("all")
  const [cashbacks, setCashbacks] = useState(cashbackDummy)
  const [formData, setFormData] = useState({
    title: "Eid Dhamaka",
    customer: "",
    cashbackType: "Percentage (%)",
    cashbackAmount: "",
    minPurchase: "",
    maxDiscount: "",
    startDate: "",
    endDate: "",
    limitForSameUser: "",
  })

  const languageTabs = [
    { key: "default", label: "Default" },
    { key: "en", label: "English(EN)" },
    { key: "bn", label: "Bengali - বাংলা (BN)" },
    { key: "ar", label: "Arabic - العربية (AR)" },
    { key: "es", label: "Spanish - español(ES)" },
  ]

  const filteredCashbacks = useMemo(() => {
    let result = [...cashbacks]

    if (cashbackType !== "all") {
      if (cashbackType === "Percentage") {
        result = result.filter(cb => cb.cashbackType === "Percentage")
      } else if (cashbackType === "Amount") {
        result = result.filter(cb => cb.cashbackType === "Amount")
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(cb =>
        cb.name.toLowerCase().includes(query)
      )
    }

    return result
  }, [cashbacks, searchQuery, cashbackType])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
