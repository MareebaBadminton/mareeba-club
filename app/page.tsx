'use client'

import { useState } from 'react'
import RegisterForm from '@/components/RegisterForm'
import BookingForm from '@/components/BookingForm'

export default function Home() {
  const [activeTab, setActiveTab] = useState('register')

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">Mareeba Badminton Club</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('register')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'register'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Register
              </button>
              <button
                onClick={() => setActiveTab('book')}
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'book'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Book Session
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'register' ? (
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