import { useState } from "react"
import { Plus, Trash2, Settings, ChevronDown } from "lucide-react"

const defaultFields = [
  "Restaurant Name", "Restaurant Logo", "Owner Last Name",
  "Vat/Tax", "Cuisine", "Phone Number",
  "Delivery Address", "Zone", "Email",
  "Min Delivery Time", "Latitude & Longitude", "Password",
  "Max Delivery Time", "Map Location",
  "Restaurant Cover", "Owner First Name"
]

const fieldTypes = ["Text", "Date", "File Upload", "Number", "Email", "Phone"]

export default function JoinUsPageSetup() {
  const [activeTab, setActiveTab] = useState("restaurant")
  const [customFields, setCustomFields] = useState([
    {
      id: 1,
      type: "Text",
      title: "Enter Your Tin Number",
      placeholder: "Enter TIN",
      isRequired: true,
      uploadMultiple: false,
      fileFormats: { jpg: true, pdf: true, docs: true }
    },
    {
      id: 2,
      type: "Date",
      title: "Date",
      placeholder: "Enter Date",
      isRequired: true,
      uploadMultiple: false,
      fileFormats: { jpg: false, pdf: false, docs: false }
    },
    {
      id: 3,
      type: "File Upload",
      title: "License Document",
      placeholder: "",
      isRequired: true,
      uploadMultiple: false,
      fileFormats: { jpg: true, pdf: true, docs: true }
    }
  ])

  const handleAddField = () => {
    const newField = {
      id: Date.now(),
      type: "Text",
      title: "",
      placeholder: "",
      isRequired: false,
      uploadMultiple: false,
      fileFormats: { jpg: false, pdf: false, docs: false }
    }
    setCustomFields([...customFields, newField])
  }

  const handleDeleteField = (id) => {
    setCustomFields(customFields.filter(field => field.id !== id))
  }

  const handleFieldChange = (id, key, value) => {
    setCustomFields(customFields.map(field =>
      field.id === id ? { ...field, [key]: value } : field
    ))
  }

  const handleFileFormatChange = (id, format) => {
    setCustomFields(customFields.map(field =>
      field.id === id
        ? { ...field, fileFormats: { ...field.fileFormats, [format]: !field.fileFormats[format] } }
        : field
    ))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
