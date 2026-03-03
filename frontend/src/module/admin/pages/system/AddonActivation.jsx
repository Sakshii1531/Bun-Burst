import { useState } from "react"
import { ChevronDown, Settings } from "lucide-react"

const addons = [
  {
    id: 1,
    title: "Restaurant app",
    description: "With this app your vendor will mange their business through mobile app",
    enabled: true,
    hasSettings: true
  },
  {
    id: 2,
    title: "Deliveryman app",
    description: "With this app your all your deliveryman will mange their orders through mobile app",
    enabled: false,
    hasSettings: false
  },
  {
    id: 3,
    title: "React user website",
    description: "With this react website your customers will experience your system in a more attractive and seamless way",
    enabled: false,
    hasSettings: false
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

export default function AddonActivation() {
  const [addonStates, setAddonStates] = useState(
    addons.reduce((acc, addon) => {
      acc[addon.id] = addon.enabled
      return acc
    }, {})
  )

  const handleToggle = (id) => {
    setAddonStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleView = (id) => {
