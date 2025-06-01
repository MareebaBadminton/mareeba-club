'use client'

export default function HomeSection() {
  return (
    <div className="space-y-8">
      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Mareeba Badminton Club</h2>
        <p className="text-gray-600 mb-6">
          Join our friendly community of badminton players in Mareeba. Whether you're a beginner or an experienced player,
          we welcome players of all skill levels.
        </p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Location</h3>
        <p className="text-gray-600 mb-2">
          Mareeba PCYC
        </p>
        <p className="text-gray-600">
          183 Walsh Street, Mareeba QLD 4880
        </p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Session Times</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Monday</h4>
            <p className="text-gray-600">8:00 PM - 10:00 PM</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Friday</h4>
            <p className="text-gray-600">7:30 PM - 9:30 PM</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Sunday</h4>
            <p className="text-gray-600">2:30 PM - 4:30 PM</p>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Club Policies</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Session Fees</h4>
            <p className="text-gray-600">$10 per session</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Equipment</h4>
            <p className="text-gray-600">Racquets available for hire ($2). Shuttles provided.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Dress Code</h4>
            <p className="text-gray-600">Sports attire and non-marking shoes required.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Smoking Policy</h4>
            <p className="text-gray-600">Smoking is not permitted in any Council building, site or within 5m of public entrances including bathrooms and kitchens.</p>
          </div>
        </div>
      </section>
    </div>
  )
} 