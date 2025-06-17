'use client'

import { useState } from 'react'
import Image from 'next/image'

// Add this import at the top of the file
import RegisterForm from '@/components/RegisterForm'
import NextSessionPlayers from '@/components/NextSessionPlayers'
import PaymentTracker from '@/components/PaymentTracker'
import BookingForm from '@/components/BookingForm'
import BookingLookup from '@/components/BookingLookup'
import FindPlayerID from '@/components/FindPlayerID'

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'register', label: 'Register' },
    { id: 'book', label: 'Book Session' },
    { id: 'lookup', label: 'Find Booking' },
    { id: 'next-session', label: 'Next Session' },
    { id: 'payments', label: 'Payments' },
    { id: 'find-id', label: 'Find your ID' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex items-center justify-center space-x-3 sm:space-x-4">
            <Image
              src="/mb-logo.png"
              alt="Mareeba Badminton Club Logo"
              width={80}
              height={80}
              className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20"
            />
            <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold text-white text-center">Mareeba Badminton Club</h1>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-2 sm:px-6">
          <nav className="grid grid-cols-7 gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 sm:py-4 px-1 text-xs sm:text-sm lg:text-base font-medium border-b-2 transition-colors text-center ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 lg:p-8">
          
          {/* Home Tab */}
          {activeTab === 'home' && (
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Welcome to Mareeba Badminton Club</h2>
              
              {/* Facility Photo */}
              <div className="mb-6 sm:mb-8">
                <Image
                  src="/court-photo.jpg.jpg"
                  alt="Mareeba Badminton Club Facility"
                  width={800}
                  height={400}
                  className="w-full h-64 sm:h-80 object-cover rounded-lg shadow-lg"
                />
              </div>
              
              <p className="text-black text-lg sm:text-xl mb-4">
                Join our friendly community of badminton players in Mareeba. Whether you're a beginner or an experienced player, everyone is welcome!
              </p>
              
              <p className="text-black text-lg sm:text-xl mb-8">
                We encourage everyone to register and book through our website—why? Because it's FREE, and booking online is even cheaper! So what are you waiting for?
              </p>

              {/* How to Register Section */}
              <div className="mb-8 sm:mb-10">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">📝 How to Register</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                  <ol className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                      <span className="text-sm sm:text-base">Click on the <strong>"Register"</strong> tab above</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                      <span className="text-sm sm:text-base">Fill in your personal details (name and email)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                      <span className="text-sm sm:text-base">Submit the form and you'll receive a unique <strong>5-digit Player ID</strong></span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                      <span className="text-sm sm:text-base"><strong>Save your Player ID</strong> - you'll need it to book sessions!</span>
                    </li>
                  </ol>
                </div>
              </div>

              {/* How to Book Section */}
              <div className="mb-8 sm:mb-10">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">🏸 How to Book a Session</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
                  <ol className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                      <span className="text-sm sm:text-base">Click on the <strong>"Book Session"</strong> tab above</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                      <span className="text-sm sm:text-base">Enter your <strong>5-digit Player ID</strong> and click "Verify"</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                      <span className="text-sm sm:text-base">Select your preferred <strong>date</strong> for the session</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                      <span className="text-sm sm:text-base">Choose an available <strong>time slot</strong> and click "Book Session"</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">5</span>
                      <span className="text-sm sm:text-base">Make your payment using the provided bank details and <strong>payment reference</strong></span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">6</span>
                      <span className="text-sm sm:text-base">Once you've booked and your payment is confirmed, your name will show up under <strong>'Next Session'</strong>. If it doesn't, head over to <strong>'Find Booking'</strong> to check both your past and upcoming sessions and payments.</span>
                    </li>
                  </ol>
                </div>
                  </div>

              {/* Quick Tips */}
              <div className="mb-8 sm:mb-10">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">💡 Quick Tips</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-1">•</span>
                      <span className="text-sm sm:text-base">Forgot your ID? Just head over to 'Find Your ID' to look it up</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-1">•</span>
                      <span className="text-sm sm:text-base">Use the exact payment reference provided when making your payment</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-1">•</span>
                      <span className="text-sm sm:text-base">Check "Next Session" to see who's playing and confirm your booking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-1">•</span>
                      <span className="text-sm sm:text-base">Use "Find Booking" to check your booking status anytime</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Equipment Information */}
              <div className="mb-8 sm:mb-10">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">🏸 Equipment & Facilities</h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 sm:p-6">
                  <div className="space-y-3 text-gray-700">
                    <p className="text-sm sm:text-base">
                      <strong>🎾 Racquets:</strong> Available free of charge for all players
                    </p>
                    <p className="text-sm sm:text-base">
                      <strong>🏸 Shuttlecocks:</strong> A limited supply of new shuttlecocks are available at no charge each session - please make them last as long as you can
                    </p>
                  </div>
                </div>
              </div>

              {/* Not-for-Profit Statement */}
              <div className="mb-8 sm:mb-10">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 text-center">
                  <p className="text-gray-700 text-sm sm:text-base italic">
                    This badminton club Inc. is a not-for-profit sporting association. As such, all of our time, effort, and revenue are devoted to promoting the club and enhancing the experience for our players.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Register Tab */}
          {activeTab === 'register' && (
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Player Registration</h2>
              <RegisterForm />
            </div>
          )}

          {/* Book Session Tab */}
          {activeTab === 'book' && (
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Book a Session</h2>
              <BookingForm />
            </div>
          )}

          {/* Find Booking Tab */}
          {activeTab === 'lookup' && (
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">View your past and upcoming bookings</h2>
              <BookingLookup />
            </div>
          )}

          {/* Next Session Tab */}
          {activeTab === 'next-session' && (
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Next Session</h2>
              <NextSessionPlayers />
            </div>
          )}
          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <PaymentTracker />
          )}

          {/* Find your ID Tab */}
          {activeTab === 'find-id' && (
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Find Your Player ID</h2>
              <FindPlayerID />
            </div>
          )}

        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 text-center text-gray-500">
          <p className="mb-2 text-sm sm:text-base">ABN: 61470216342</p>
          <p className="text-sm sm:text-base">© 2024 Mareeba Badminton Club. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}