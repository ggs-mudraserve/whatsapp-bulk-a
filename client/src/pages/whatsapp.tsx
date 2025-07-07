import DirectQRScanner from "@/components/whatsapp/direct-qr-scanner";
import Sidebar from "@/components/layout/sidebar";

export default function WhatsApp() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                WhatsApp QR Scanner
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Connect your WhatsApp numbers by scanning QR code
              </p>
            </div>
            
            <DirectQRScanner />
          </div>
        </main>
      </div>
    </div>
  );
}