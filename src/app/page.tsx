'use client'

import { useState } from 'react'
import RegisterForm from '@/components/RegisterForm'
import BookingForm from '@/components/BookingForm'
import Logo from '@/components/Logo'
import HomeSection from '@/components/HomeSection'

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'home'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'register'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Register
              </button>
              <button
                onClick={() => setActiveTab('book')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'book'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Book Session
              </button>
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
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Session</h2>
                <BookingForm />
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
