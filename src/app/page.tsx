export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl text-center">
        <h1 className="text-6xl font-bold mb-6 text-rko-primary">
          RKO Takeaway Studio
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Transform keynote transcripts into personalized AI-generated content
        </p>
        <div className="flex gap-4 justify-center">
          <button className="btn btn-primary">
            Get Started
          </button>
          <button className="btn bg-gray-200 text-gray-800 hover:bg-gray-300">
            Browse Trending
          </button>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        <div className="card text-center">
          <div className="text-4xl mb-4">🎥</div>
          <h3 className="mb-2">Video</h3>
          <p className="text-gray-600">
            AI avatar presentations with leader voices
          </p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-4">🎙️</div>
          <h3 className="mb-2">Podcast</h3>
          <p className="text-gray-600">
            Conversational audio takeaways
          </p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="mb-2">Slides</h3>
          <p className="text-gray-600">
            Executive summary slide decks
          </p>
        </div>
      </div>

      <div className="mt-16 text-center text-sm text-gray-500">
        <p>
          <span className="badge badge-ai mr-2">AI-Generated</span>
          Content created with AI. See README for setup instructions.
        </p>
      </div>
    </div>
  )
}
