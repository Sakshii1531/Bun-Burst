import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import Lenis from "lenis"
import { 
  ArrowLeft,
  User,
  Bell,
  Shield,
  Globe,
  Moon,
  Sun,
  Info,
  LogOut,
  Lock,
  Mail,
  Phone,
  CreditCard,
  FileText,
  MessageSquare,
  ChevronRight
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import BottomNavbar from "../components/BottomNavbar"
import MenuOverlay from "../components/MenuOverlay"

export default function SettingsPage() {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  // Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  // Settings sections
  const settingsSections = [
    {
      id: "account",
      title: "Account",
      items: [
        { id: "notifications", label: "Notifications", icon: Bell, hasToggle: true, toggleValue: notificationsEnabled, onToggle: setNotificationsEnabled },
        { id: "privacy", label: "Privacy & Security", icon: Shield, route: "/restaurant/privacy" },
      ]
    },
    {
      id: "preferences",
      title: "Preferences",
      items: [
        { id: "language", label: "Language", icon: Globe, route: "/restaurant/language", value: "English" },
        { id: "theme", label: "Theme", icon: darkMode ? Moon : Sun, hasToggle: true, toggleValue: darkMode, onToggle: setDarkMode },
      ]
    },
    {
      id: "support",
      title: "Support & Information",
      items: [
        { id: "conversation", label: "Conversation", icon: MessageSquare, route: "/restaurant/conversation" },
        { id: "terms", label: "Terms & Conditions", icon: FileText, route: "/restaurant/terms" },
        { id: "privacy-policy", label: "Privacy Policy", icon: Shield, route: "/restaurant/privacy" },
        { id: "about", label: "About", icon: Info, route: "/restaurant/about" },
      ]
    },
    {
      id: "actions",
      title: "Actions",
      items: [
        { id: "logout", label: "Logout", icon: LogOut, isDestructive: true, action: () => {
