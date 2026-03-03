import { useState, useMemo } from "react"
import { Search, Download, ChevronDown, Plus, Edit, Trash2, Upload, Image as ImageIcon, Info } from "lucide-react"
import { bannersDummy } from "../data/bannersDummy"
// Using placeholders for banner images
const bannerImage1 = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop"
const bannerImage2 = "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop"
const bannerImage3 = "https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&h=400&fit=crop"
const bannerImage4 = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop"
const bannerImage5 = "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop"
const bannerImage6 = "https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&h=400&fit=crop"

const bannerImages = {
  1: bannerImage1,
  2: bannerImage2,
  3: bannerImage3,
  4: bannerImage4,
  5: bannerImage5,
  6: bannerImage6,
}

export default function Banners() {
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [searchQuery, setSearchQuery] = useState("")
  const [bannerType, setBannerType] = useState("all")
  const [banners, setBanners] = useState(bannersDummy)
  const [formData, setFormData] = useState({
    title: "",
    zone: "",
    bannerType: "Restaurant wise",
    restaurant: "",
  })

  const languageTabs = [
    { key: "default", label: "Default" },
    { key: "en", label: "English(EN)" },
    { key: "bn", label: "Bengali - বাংলা(BN)" },
    { key: "ar", label: "Arabic - العربية (AR)" },
    { key: "es", label: "Spanish - español(ES)" },
  ]

  const filteredBanners = useMemo(() => {
    let result = [...banners]

    if (bannerType !== "all") {
      if (bannerType === "Restaurant wise") {
        result = result.filter(banner => banner.bannerType === "Restaurant wise")
      } else if (bannerType === "Zone wise") {
        result = result.filter(banner => banner.bannerType === "Zone wise")
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(banner =>
        banner.title.toLowerCase().includes(query)
      )
    }

    return result
  }, [banners, searchQuery, bannerType])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
