import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import Lenis from "lenis"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import BottomNavbar from "../components/BottomNavbar"
import MenuOverlay from "../components/MenuOverlay"
import { formatCurrency, usdToInr } from "../utils/currency"

export default function BusinessPlanPage() {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showPlans, setShowPlans] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState("basic")

  // Lenis smooth scrolling for consistency
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

  const plan = {
    title: "Commission Base Plan",
    rate: "10.0 %",
    description:
      "Restaurant will pay 10.0% commission to StackFood from each order. You will get access of all the features and options in restaurant panel , app and interaction with user.",
  }

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: formatCurrency(usdToInr(199.00)),
      duration: "60 days",
      features: ["Max Order (200)", "Max Product (15)", "POS", "Mobile App"],
    },
    {
      id: "basic",
      name: "Basic",
      price: formatCurrency(usdToInr(399.00)),
      duration: "120 days",
      features: [
        "Max Order (400)",
        "Max Product (30)",
        "POS",
        "Mobile App",
        "Review",
      ],
    },
    {
      id: "premium",
      name: "Premium",
      price: formatCurrency(usdToInr(699.00)),
      duration: "180 days",
      features: [
        "Max Order (Unlimited)",
        "Max Product (Unlimited)",
        "POS",
        "Mobile App",
        "Review",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#f6f6f6] pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center -ml-8">
          My Business Plan
        </h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 flex justify-center">
        <Card className="w-full max-w-md bg-white shadow-sm border-0">
          <CardContent className="pt-10 pb-16 px-6 text-center">
            <h2 className="text-base font-semibold text-[#008069] mb-4">
              {plan.title}
            </h2>
            <p className="text-4xl font-extrabold text-[#008069] mb-6">
              {plan.rate}
            </p>
            <p className="text-sm leading-relaxed text-gray-600 max-w-xs mx-auto">
              {plan.description}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-40 space-y-2">
        <Button
          variant="outline"
          className="w-full border-[#ff8100] text-[#ff8100] hover:bg-[#ff8100]/5 font-semibold py-2.5 rounded-xl text-sm"
          onClick={() => {
            setShowPlans(true)
          }}
        >
          Plans
        </Button>
        <Button
          className="w-full bg-[#ff8100] hover:bg-[#e67300] text-white font-semibold py-3 rounded-xl text-base"
          onClick={() => {
            // Future: open change plan flow
