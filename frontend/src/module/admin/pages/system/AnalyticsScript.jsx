import { useState } from "react"
import { Lightbulb, ChevronDown } from "lucide-react"

const marketingTools = [
  {
    id: 1,
    name: "Google Analytics",
    description: "To know more click How it works."
  },
  {
    id: 2,
    name: "Google Tag Manager",
    description: "To know more click How it works."
  },
  {
    id: 3,
    name: "LinkedIn Insight Tag",
    description: "To know more click How it works."
  },
  {
    id: 4,
    name: "Meta Pixel",
    description: "To know more click How it works."
  },
  {
    id: 5,
    name: "Pinterest Pixel",
    description: "To know more click How it works."
  },
  {
    id: 6,
    name: "Snapchat Pixel",
    description: "To know more click How it works."
  },
  {
    id: 7,
    name: "TikTok Pixel",
    description: "To know more click How it works."
  },
  {
    id: 8,
    name: "X (Twitter) Pixel",
    description: "To know more click How it works."
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

export default function AnalyticsScript() {
  const [toolStates, setToolStates] = useState(
    marketingTools.reduce((acc, tool) => {
      acc[tool.id] = false
      return acc
    }, {})
  )

  const handleToggle = (id) => {
    setToolStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleView = (id) => {
