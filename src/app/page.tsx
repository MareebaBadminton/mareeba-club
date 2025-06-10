'use client'

import { useState } from 'react'

interface Booking {
  id: string
  date: string
  time: string
  status: string
}

interface SearchResults {
  bookings: Booking[]
}

// Add this import at the top of the file
import RegisterForm from '@/components/RegisterForm'
import NextSessionPlayers from '@/components/NextSessionPlayers'
import PaymentTracker from '@/components/PaymentTracker'
import BookingForm from '@/components/BookingForm'

export default function Home() {
  const [activeTab, setActiveTab] = useState('register')
  const [playerId, setPlayerId] = useState('')
  const [name, setName] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async () => {
    if (!playerId && !name) {
      alert('Please enter either a Player ID or Name to search')
      return
    }

    setIsSearching(true)
    // TODO: Implement actual API call here
    // For now, just showing a mock response
    setTimeout(() => {
      setSearchResults({
        bookings: [
          {
            id: 'BOOK123',
            date: '2024-03-15',
            time: '18:00',
            status: 'Confirmed'
          }
        ]
      })
      setIsSearching(false)
    }, 1000)
  }

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'register', label: 'Register' },
    { id: 'book', label: 'Book Session' },
    { id: 'next-session', label: 'Next Session' },
    { id: 'payments', label: 'Payments' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-white text-center">Mareeba Badminton Club</h1>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 text-lg font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          
          {/* Home Tab */}
          {activeTab === 'home' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Welcome to Mareeba Badminton Club</h2>
              <p className="text-gray-600 text-lg">
                Join our friendly community of badminton players in Mareeba. Whether you're a beginner or an experienced player,
                we welcome players of all skill levels.
              </p>
              <div className="mt-8 grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Session Times</h3>
                  <div className="space-y-2 text-gray-600">
                    <p><strong>Monday:</strong> 8:00 PM - 10:00 PM</p>
                    <p><strong>Friday:</strong> 7:30 PM - 9:30 PM</p>
                    <p><strong>Sunday:</strong> 2:30 PM - 4:30 PM</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">Location</h3>
                  <div className="text-gray-600">
                    <p>183 Walsh Street, Mareeba QLD 4880</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Register Tab */}
          {activeTab === 'register' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Player Registration</h2>
              <RegisterForm />
            </div>
          )}

          {/* Book Session Tab */}
          {activeTab === 'book' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Book a Session</h2>
              <BookingForm />
            </div>
          )}

          {/* Find Booking Tab */}
          {activeTab === 'lookup' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Find Your Booking</h2>
              <form className="space-y-6">
                <div>
                  <label htmlFor="playerIdLookup" className="block text-sm font-medium text-gray-700 mb-2">
                    Player ID
                  </label>
                  <input
                    type="text"
                    id="playerIdLookup"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your Player ID"
                  />
                </div>
                <div>
                  <label htmlFor="nameLookup" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="nameLookup"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Or enter your full name"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search Bookings'}
                </button>

                {searchResults && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">Search Results</h3>
                    {searchResults.bookings.length > 0 ? (
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="min-w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Booking ID</th>
                              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Date</th>
                              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Time</th>
                              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {searchResults.bookings.map((booking) => (
                              <tr key={booking.id} className="bg-white">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{booking.id}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{booking.date}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{booking.time}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{booking.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 bg-gray-50 p-6 rounded-lg">No bookings found.</p>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Next Session Tab */}
          {activeTab === 'next-session' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Next Session</h2>
              <NextSessionPlayers />
            </div>
          )}
          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <PaymentTracker />
          )}

        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-gray-500">
          <p className="mb-2">ABN: 61470216342</p>
          <p>© 2024 Mareeba Badminton Club. All rights reserved.</p>
        </div>
      </footer>
    </div>
    )
}