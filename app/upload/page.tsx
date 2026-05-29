'use client';

import { useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setAnalyzing(true);

    const fakeUserId = 'user-123';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', fakeUserId);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    setAnalyzing(false);
    setResult(data);
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Upload Your Clothing</h1>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 hover:border-black transition">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
          id="upload" 
        />
        <label htmlFor="upload" className="cursor-pointer text-blue-600 underline">
          {preview ? 'Change photo' : 'Click here to upload a photo'}
        </label>
      </div>

      {preview && (
        <img src={preview} alt="Preview" className="w-48 h-48 object-cover rounded-lg mb-4 mx-auto" />
      )}

      <button
        onClick={handleUpload}
        disabled={!file || analyzing}
        className="w-full bg-black text-white py-3 rounded-lg disabled:opacity-50"
      >
        {analyzing ? 'AI is analyzing your photo...' : 'Analyze Item'}
      </button>

      {result?.success && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h2 className="font-bold text-green-800 mb-2">AI Analysis Complete!</h2>
          <p><strong>Category:</strong> {result.item.category}</p>
          <p><strong>Color:</strong> {result.item.color}</p>
          <p><strong>Style:</strong> {result.item.style}</p>
          <p><strong>Fit:</strong> {result.item.fit}</p>
          <p><strong>Fabric:</strong> {result.item.fabric}</p>
          <p><strong>Description:</strong> {result.item.description}</p>
          <img src={result.item.image_url} className="w-32 h-32 object-cover mt-4 rounded border" />
        </div>
      )}

      {result?.error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <strong>Error:</strong> {result.error}
        </div>
      )}
    </div>
  );
}