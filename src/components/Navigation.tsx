import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-blue-600 text-white p-4 mb-8">
      <div className="max-w-4xl mx-auto flex flex-wrap gap-4 justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-blue-100">
          Mareeba Badminton
        </Link>
        <div className="flex gap-4">
          <Link href="/register" className="hover:text-blue-100">
            Register
          </Link>
          <Link href="/book" className="hover:text-blue-100">
            Book Session
          </Link>
          <Link href="/profile" className="hover:text-blue-100">
            My Profile
          </Link>
        </div>
      </div>
    </nav>
  )
} 