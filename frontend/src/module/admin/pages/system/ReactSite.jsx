import { useState } from "react"
import { X, Monitor } from "lucide-react"

export default function ReactSite() {
  const [reactLicenseCode, setReactLicenseCode] = useState("")
  const [reactDomain, setReactDomain] = useState("")
  const [showWarning, setShowWarning] = useState(true)

  const handleSave = (e) => {
    e.preventDefault()
