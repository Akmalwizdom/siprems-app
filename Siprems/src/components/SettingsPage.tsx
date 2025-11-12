import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Download, Database, FileText, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { toast } from 'sonner@2.0.3';

interface SystemStatus {
  version: string;
  last_updated: string;
  ai_model: string;
  database_status: string;
}

const API_URL = 'http://localhost:5000';

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/settings/status`);
        if (!response.ok) throw new Error('Failed to fetch system status');
        const data: SystemStatus = await response.json();
        setStatus(data);
      } catch (err) {
        console.error(err);
        // Set status error jika gagal
        setStatus({
          version: '1.0.0',
          last_updated: 'Unknown',
          ai_model: 'Prophet v1.1',
          database_status: 'Disconnected'
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleExportCSV = () => {
    toast.success('CSV export started', {
      description: 'Your data will be downloaded shortly',
    });
    // Di aplikasi nyata, Anda akan memanggil:
    // window.open(`${API_URL}/data/export/csv`);
  };

  const handleImportCSV = () => {
    toast.success('CSV import started', {
      description: 'Processing your uploaded file',
    });
    // Di sini Anda akan membuka file picker
  };

  const handleExportDatabase = () => {
    toast.success('Database backup created', {
      description: 'Your complete database has been exported',
    });
    // Di aplikasi nyata, Anda akan memanggil:
    // window.open(`${API_URL}/data/export/db_backup`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your application preferences and data</p>
      </div>

      {/* Data Management (Tombol-tombol tetap menggunakan toast) */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Data Management</CardTitle>
          <CardDescription>Import and export your business data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Import CSV */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white">Import CSV</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upload transaction data</p>
                </div>
              </div>
              <Button
                onClick={handleImportCSV}
                variant="outline"
                className="w-full rounded-xl hover:text-blue-200"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>

            {/* Export CSV */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
                  <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white">Export CSV</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Download transaction data</p>
                </div>
              </div>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="w-full rounded-xl hover:text-blue-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>

            {/* Export Database */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-2">
                  <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white">Backup Database</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Export complete database</p>
                </div>
              </div>
              <Button
                onClick={handleExportDatabase}
                variant="outline"
                className="w-full rounded-xl hover:text-blue-200"
              >
                <Database className="w-4 h-4 mr-2" />
                Create Backup
              </Button>
            </div>

            {/* Generate Report */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-2">
                  <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-white">Generate Report</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create analysis report</p>
                </div>
              </div>
              <Button
                onClick={() => toast.success('Report generated successfully')}
                variant="outline"
                className="w-full rounded-xl hover:text-blue-200"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information (Sekarang Dinamis) */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">System Information</CardTitle>
          <CardDescription>Application details and version</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !status ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Version</span>
                <span className="text-gray-900 dark:text-white">{status.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Last Updated</span>
                <span className="text-gray-900 dark:text-white">{status.last_updated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">AI Model</span>
                <span className="text-gray-900 dark:text-white">{status.ai_model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Database Status</span>
                {status.database_status === 'Connected' ? (
                  <span className="text-green-600 dark:text-green-400">Connected</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">Disconnected</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}