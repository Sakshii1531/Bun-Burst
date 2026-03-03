import { useState } from "react"
import { Edit, Upload, Info } from "lucide-react"
// Using placeholder for promotional banner
const bannerPreview = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop"

export default function PromotionalBanner() {
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [title, setTitle] = useState("Promotional")

  const languageTabs = [
    { key: "default", label: "Default" },
    { key: "en", label: "English(EN)" },
    { key: "bn", label: "Bengali - বাংলা(BN)" },
    { key: "ar", label: "Arabic - العربية (AR)" },
    { key: "es", label: "Spanish - español(ES)" },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
