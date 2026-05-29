import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="flex justify-between items-center p-6 border-b">
        <h1 className="text-2xl font-bold tracking-tight">FASHION AI</h1>
        <div className="flex gap-4">
          <Link href="/upload" className="px-4 py-2 border rounded-lg hover:bg-black hover:text-white transition">
            Upload Item
          </Link>
          <Link href="/wardrobe" className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition">
            My Wardrobe
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto text-center py-24 px-6">
        <h2 className="text-5xl font-bold mb-6">AI-Powered Outfit Styling</h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Upload your clothes. Our AI analyzes them and creates complete outfits with real shopping links from ASOS, SHEIN, Zara, and more.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/upload" className="px-8 py-4 bg-black text-white rounded-lg text-lg font-semibold hover:bg-gray-800">
            Start Styling →
          </Link>
          <Link href="/wardrobe" className="px-8 py-4 border rounded-lg text-lg font-semibold hover:bg-gray-50">
            View Wardrobe
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8 px-6 pb-24">
        <div className="p-6 border rounded-xl">
          <div className="text-3xl mb-3">📸</div>
          <h3 className="font-bold mb-2">Upload & Analyze</h3>
          <p className="text-sm text-gray-600">AI detects color, style, fit, and fabric instantly.</p>
        </div>
        <div className="p-6 border rounded-xl">
          <div className="text-3xl mb-3">✨</div>
          <h3 className="font-bold mb-2">Generate Outfits</h3>
          <p className="text-sm text-gray-600">Get 3 complete outfit combinations tailored to your item.</p>
        </div>
        <div className="p-6 border rounded-xl">
          <div className="text-3xl mb-3">🛍️</div>
          <h3 className="font-bold mb-2">Shop the Look</h3>
          <p className="text-sm text-gray-600">Direct links to ASOS, SHEIN, Zara, H&M, and Urban Outfitters.</p>
        </div>
      </div>
    </div>
  );
}