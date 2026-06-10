import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Link as LinkIcon, CheckCircle, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [pos, setPos] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/signup');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('Parsing CSV and routing to Data Science Engine...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('shopId', user.shopId);

    try {
      const res = await fetch('http://localhost:3000/api/v1/onboarding/upload-csv', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setStatus('Success! ' + data.message);
      setTimeout(() => navigate('/logic-auditor'), 2000);
    } catch (err) {
      setStatus('Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const completeWebhookSetup = () => {
    setStatus('Webhook endpoint generated. Waiting for first payload...');
    setTimeout(() => navigate('/logic-auditor'), 2000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white">Welcome, {user.companyName}</h1>
          <p className="text-gray-400 mt-2 text-lg">Let's connect your sales data to the Temporal Engine.</p>
        </div>

        {step === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Select Your Data Source</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <button 
                onClick={() => { setPos('shopify'); setStep(2); }}
                className="flex flex-col items-center justify-center p-8 border-2 border-gray-800 rounded-2xl hover:border-blue-500 hover:bg-gray-800 transition-all group"
              >
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LinkIcon className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Shopify</h3>
                <p className="text-sm text-gray-500 mt-2 text-center">Connect via Webhooks</p>
              </button>

              <button 
                onClick={() => { setPos('csv'); setStep(2); }}
                className="flex flex-col items-center justify-center p-8 border-2 border-gray-800 rounded-2xl hover:border-emerald-500 hover:bg-gray-800 transition-all group"
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">CSV Upload</h3>
                <p className="text-sm text-gray-500 mt-2 text-center">Import historical reports</p>
              </button>

            </div>
          </div>
        )}

        {step === 2 && pos === 'shopify' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-white mb-6">Connect Shopify</h2>
            <p className="text-gray-400 mb-6">Add this webhook URL to your Shopify admin panel to stream live orders to the engine.</p>
            
            <div className="bg-black border border-gray-800 rounded-xl p-4 flex items-center justify-between mb-8">
              <code className="text-emerald-400">https://api.set-retail.com/v1/telemetry/orders</code>
              <button className="text-gray-400 hover:text-white">Copy</button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800">
                <p className="text-sm text-gray-300"><strong className="text-white">Topic:</strong> Order Creation</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800">
                <p className="text-sm text-gray-300"><strong className="text-white">API Key Header:</strong> x-api-key: {user.shopId}</p>
              </div>
            </div>

            <button 
              onClick={completeWebhookSetup}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2"
            >
              I have configured the Webhook
              <ArrowRight className="w-5 h-5" />
            </button>
            {status && <p className="mt-4 text-center text-blue-400">{status}</p>}
          </div>
        )}

        {step === 2 && pos === 'csv' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl animate-fade-in-up">
            <h2 className="text-2xl font-bold text-white mb-6">Upload Historical Sales</h2>
            <p className="text-gray-400 mb-6">Upload a CSV containing your historical sales data. Required columns: SKU, ProductName, Price, Quantity.</p>
            
            <div className="border-2 border-dashed border-gray-700 hover:border-emerald-500 rounded-2xl p-12 text-center transition-colors">
              <input 
                type="file" 
                accept=".csv"
                id="csv-upload"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                {file ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                    <p className="text-emerald-400 font-bold text-lg">{file.name}</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-gray-500 mb-4" />
                    <p className="text-gray-300 font-bold text-lg">Click to select CSV</p>
                    <p className="text-gray-500 text-sm mt-2">Max file size: 50MB</p>
                  </>
                )}
              </label>
            </div>

            <button 
              onClick={handleFileUpload}
              disabled={!file || uploading}
              className="mt-8 w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all"
            >
              {uploading ? 'Processing Data...' : 'Ingest to Engine'}
              {!uploading && <ArrowRight className="w-5 h-5" />}
            </button>
            
            {status && (
              <div className="mt-6 p-4 bg-gray-800 rounded-xl text-center">
                <p className={status.includes('Error') ? 'text-red-400' : 'text-emerald-400'}>
                  {status}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}} />
    </div>
  );
}
