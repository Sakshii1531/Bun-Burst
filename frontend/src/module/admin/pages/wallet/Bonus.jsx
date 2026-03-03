import { useState, useMemo } from "react"
import { Search, Wallet, Info, Calendar, Edit, Trash2 } from "lucide-react"
import { walletBonusDummy } from "../../data/walletBonusDummy"

export default function Bonus() {
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [searchQuery, setSearchQuery] = useState("")
  const [bonuses, setBonuses] = useState(walletBonusDummy)
  const [formData, setFormData] = useState({
    bonusTitle: "",
    shortDescription: "",
    bonusType: "Percentage (%)",
    bonusAmount: "",
    minAddMoney: "",
    maxBonus: "",
    startDate: "",
    expireDate: "",
  })

  const languageTabs = [
    { key: "default", label: "Default" },
    { key: "en", label: "English(EN)" },
    { key: "bn", label: "Bengali - বাংলা(BN)" },
    { key: "ar", label: "Arabic - العربية (AR)" },
    { key: "es", label: "Spanish - español(ES)" },
  ]

  const filteredBonuses = useMemo(() => {
    if (!searchQuery.trim()) {
      return bonuses
    }
    
    const query = searchQuery.toLowerCase().trim()
    return bonuses.filter(bonus =>
      bonus.bonusTitle.toLowerCase().includes(query)
    )
  }, [bonuses, searchQuery])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
