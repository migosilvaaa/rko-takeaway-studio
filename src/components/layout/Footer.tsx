import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              RKO Takeaway Studio
            </h3>
            <p className="text-sm text-gray-600">
              Transform keynote insights into personalized AI-generated content.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/create"
                  className="text-sm text-gray-600 hover:text-rko-primary transition-colors"
                >
                  Create Content
                </Link>
              </li>
              <li>
                <Link
                  href="/board"
                  className="text-sm text-gray-600 hover:text-rko-primary transition-colors"
                >
                  Trending Board
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Information
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              All content is AI-generated and for internal use only.
            </p>
            <p className="text-xs text-gray-400">
              © {currentYear} RKO. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
