'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Static imports for smaller components
import Logo from '@/components/Logo'
import HomeSection from '@/components/HomeSection'

// Dynamic imports for larger components
const RegisterForm = dynamic(() => import('@/components/RegisterForm'), {
  loading: () => <p>Loading registration form...</p>
})

const BookingForm = dynamic(() => import('@/components/BookingForm'), {
  loading: () => <p>Loading booking form...</p>
})

const BookingLookup = dynamic(() => import('@/components/BookingLookup'), {
  loading: () => <p>Loading booking lookup...</p>
})

const NextSessionPlayers = dynamic(() => import('@/components/NextSessionPlayers'), {
  loading: () => <p>Loading next session players...</p>
})

import { initializeStorage } from '@/lib/utils/storage'

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    initializeStorage()
  }, [])

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'register', label: 'Register' },
    { id: 'book', label: 'Book Session' },
    { id: 'lookup', label: 'Find Booking' },
    { id: 'next-session', label: 'Next Session' }
  ]

  if (!isClient) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
            <p className="mt-2 text-gray-600">Please wait while we initialize the application.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between py-4">
            <div className="flex items-center justify-center md:justify-start mb-4 md:mb-0">
              <Logo />
            </div>
            <div className="flex flex-wrap justify-center gap-2 items-center">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            {activeTab === 'home' ? (
              <HomeSection />
            ) : activeTab === 'register' ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Player Registration</h2>
                <RegisterForm />
              </div>
            ) : activeTab === 'book' ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Session</h2>
                <BookingForm />
              </div>
            ) : activeTab === 'lookup' ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Your Booking</h2>
                <BookingLookup />
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Next Session Players</h2>
                <NextSessionPlayers />
              </div>
            )}
          </div>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>ABN: 61470216342</p>
          <p className="mt-2">© 2024 Mareeba Badminton Club. All rights reserved.</p>
        </footer>
      </div>
    </main>
  )
}
