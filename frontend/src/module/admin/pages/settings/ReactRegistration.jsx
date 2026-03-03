import { useState } from "react"
import { Upload, X, RotateCcw, Plus, Save, Info } from "lucide-react"

export default function ReactRegistration() {
  const [activeTab, setActiveTab] = useState("hero-section")
  const [heroImage, setHeroImage] = useState(null)
  const [heroImagePreview, setHeroImagePreview] = useState(null)
  
  // Steeper state
  const [steeperSteps, setSteeperSteps] = useState([
    { id: 1, title: "Step 1", description: "" },
    { id: 2, title: "Step 2", description: "" },
    { id: 3, title: "Step 3", description: "" },
  ])
  
  // Opportunities state
  const [opportunities, setOpportunities] = useState([
    { id: 1, title: "", description: "", icon: null },
    { id: 2, title: "", description: "", icon: null },
  ])
  
  // FAQ state
  const [faqs, setFaqs] = useState([
    { id: 1, question: "", answer: "" },
    { id: 2, question: "", answer: "" },
  ])

  const tabs = [
    { id: "hero-section", label: "Hero Section" },
    { id: "steeper", label: "Steeper" },
    { id: "opportunities", label: "Opportunities" },
    { id: "faq", label: "FAQ" }
  ]

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setHeroImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setHeroImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setHeroImage(null)
    setHeroImagePreview(null)
  }

  const handleReset = () => {
    setHeroImage(null)
    setHeroImagePreview(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
