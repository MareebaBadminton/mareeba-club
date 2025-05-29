'use client'

import { useState } from 'react'

export default function BookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate booking
    setTimeout(() => {
      setBookingConfirmed(true)
      setIsSubmitting(false)
    }, 1000)
  }

  if (bookingConfirmed) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-md">
        <h3 className="text-xl font-semibold text-green-800 mb-2">Booking Confirmed!</h3>
        <p className="mb-4">Your session has been booked successfully.</p>
        <p className="text-sm text-green-600">
          Please arrive 10 minutes before your session time.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="playerId" className="block text-sm font-medium text-gray-700 mb-1">
          Player ID
        </label>
        <input
          type="text"
          id="playerId"
          name="playerId"
          required
          placeholder="e.g. MB123ABC"
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
        />
      </div>

      <div>
        <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-1">
          Session
        </label>
        <select
          id="session"
          name="session"
          required
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
        >
          <option value="">Select a session</option>
          <option value="monday">Monday 7:00 PM - 9:00 PM</option>
          <option value="wednesday">Wednesday 7:00 PM - 9:00 PM</option>
          <option value="saturday">Saturday 2:00 PM - 4:00 PM</option>
        </select>
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
        {isSubmitting ? 'Booking...' : 'Book Session'}
      </button>
    </form>
  )
} 