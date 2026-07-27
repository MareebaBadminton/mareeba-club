'use client'

import { useState } from 'react'
import Image from 'next/image'

import SessionDates from '@/components/SessionDates'
import ImageSlideshow from '@/components/ImageSlideshow'
import AnnouncementPopup from '@/components/AnnouncementPopup'

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'dates', label: 'Session Dates' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Announcement Popup - shows upcoming cancellations from the database */}
      <AnnouncementPopup />

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
          <nav className="grid grid-cols-2 gap-0">
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

              {/* Image Slideshow */}
              <div className="mb-6 sm:mb-8">
                <ImageSlideshow
                  images={[
                    '/court-photo.jpg.jpg',
                    '/photo2.jpg.jpeg',
                  ]}
                  alt="Mareeba Badminton Club Facility"
                  interval={5000}
                />
              </div>

              {/* Intro & fee information */}
              <div className="mb-8 sm:mb-10 space-y-4 text-black text-lg sm:text-xl">
                <p>🏸 <strong>Join the Mareeba Badminton Community!</strong><br/>
                  Whether you&apos;re just starting out or a seasoned player, everyone is welcome to join our friendly sessions.</p>

                <p>🏸 <strong>No booking needed</strong> — just turn up and play. Check the
                  <strong> Session Dates</strong> tab to confirm a session is running.</p>

                <div>
                  <p className="font-bold mb-1">💰 Fees:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>$10 cash on the night</li>
                    <li>$8 by bank transfer</li>
                  </ul>
                </div>

                {/* Address before Session Times */}
                <div>
                  <p className="font-bold mb-1">📍 Address: 183 Walsh Street, Mareeba</p>
                </div>

                <div>
                  <p className="font-bold mb-1">📅 Session Times:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Friday: 7:45PM – 9:45PM</li>
                    <li>Sunday: 3:00PM – 5:00PM</li>
                  </ul>
                </div>

                <p className="font-medium">So what are you waiting for? Grab your racquet and join the fun!</p>
              </div>

              {/* Payment Details Section */}
              <div className="mb-8 sm:mb-10">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">💳 Payment Details</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 text-gray-800 text-sm sm:text-base space-y-1">
                  <p className="font-bold text-lg sm:text-xl mb-3">Pay $8 by bank transfer, or $10 cash on the night.</p>
                  <p>🏷️ <span className="font-medium">Name:</span> Mareeba&nbsp;Badminton</p>
                  <p>🏦 <span className="font-medium">BSB:</span> 633-000</p>
                  <p>🏛️ <span className="font-medium">Account:</span> 225&nbsp;395&nbsp;003</p>
                  <p>OR</p>
                  <p>💳 <span className="font-medium">PayID&nbsp;(ABN):</span> 61&nbsp;470&nbsp;216&nbsp;342</p>
                </div>
              </div>

              {/* Equipment Information */}
              <div className="mb-8 sm:mb-10">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">🏸 Equipment & Facilities</h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 sm:p-6">
                  <div className="space-y-3 text-gray-700">
                    <p className="text-sm sm:text-base">
                      <strong>🏸 Racquets:</strong> Available free of charge for all players
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

          {/* Session Dates Tab */}
          {activeTab === 'dates' && (
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
                Session Dates
              </h2>
              <SessionDates />
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
