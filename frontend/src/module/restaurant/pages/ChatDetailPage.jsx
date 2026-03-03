import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useParams } from "react-router-dom"
import Lenis from "lenis"
import { ArrowLeft, Send, MoreVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ChatDetailPage() {
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [message, setMessage] = useState("")
  const messagesEndRef = useRef(null)

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

  // Mock messages data
  const messages = [
    {
      id: 1,
      text: "Hi",
      sender: "other",
      time: "10:30 AM",
    },
    {
      id: 2,
      text: "Hello! How can I help you?",
      sender: "me",
      time: "10:31 AM",
    },
    {
      id: 3,
      text: "I need help with my order",
      sender: "other",
      time: "10:32 AM",
    },
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (message.trim()) {
      // Add message logic here
