import { useState } from "react"
import { Bot, Settings, Info, Store } from "lucide-react"

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

export default function AISetup() {
  const [activeTab, setActiveTab] = useState("ai-configuration")
  const [isEnabled, setIsEnabled] = useState(true)
  const [apiKey, setApiKey] = useState("")
  const [organization, setOrganization] = useState("")
  const [sectionWiseLimit, setSectionWiseLimit] = useState("60")
  const [imageUploadLimit, setImageUploadLimit] = useState("20")

  const handleReset = () => {
    setApiKey("")
    setOrganization("")
  }

  const handleAIConfigSave = (e) => {
    e.preventDefault()
