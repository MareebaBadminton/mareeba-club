'use client'

import { useState } from 'react'

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredPlayer, setRegisteredPlayer] = useState<{ id: string; firstName: string } | null>(null)

  const generateShortId = () => {
    return 'MB' + Math.random().toString(36).substring(2, 5).toUpperCase()
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const form = e.currentTarget
    if (!form) return

    setIsSubmitting(true)

    try {
      const firstName = (form.elements.namedItem('firstName') as HTMLInputElement)?.value || ''
      const lastName = (form.elements.namedItem('lastName') as HTMLInputElement)?.value || ''
      const email = (form.elements.namedItem('email') as HTMLInputElement)?.value || ''
      const phone = (form.elements.namedItem('phone') as HTMLInputElement)?.value || ''

      if (!firstName || !lastName || !email || !phone) {
        console.error('Missing required fields')
        setIsSubmitting(false)
        return
      }

      // Simulate registration
      setTimeout(() => {
        const playerId = generateShortId()
        console.log('Registering player:', { firstName, lastName, email, phone, id: playerId })
        setRegisteredPlayer({
          id: playerId,
          firstName: firstName
        })
        setIsSubmitting(false)
      }, 1000)
    } catch (error) {
      console.error('Form submission error:', error)
      setIsSubmitting(false)
    }
  }

  if (registeredPlayer) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-md">
        <h3 className="text-xl font-semibold text-green-800 mb-2">Registration Successful!</h3>
        <p className="mb-4">Thank you for registering, {registeredPlayer.firstName}!</p>
        <div className="bg-white p-4 rounded-md border border-green-300">
          <p className="font-medium">Your Player ID:</p>
          <p className="font-mono text-lg mt-1">{registeredPlayer.id}</p>
          <p className="text-sm mt-2 text-green-600">
            Please save this ID - you'll need it to book sessions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            required
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            required
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          required
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-2 px-4 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isSubmitting
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  )
} 