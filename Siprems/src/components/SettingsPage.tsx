import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  Download,
  Database,
  FileText,
  Server,
  Wrench,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface BackupData {
  scheduledBackup: 'Daily' | 'Weekly' | 'Monthly';
  lastBackup: string;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [lastBackup] = useState<BackupData>({
    scheduledBackup: 'Weekly',
    lastBackup: '2025-11-10T02:30:00Z',
  });

  const systemStatusHealthy = true;
  const appVersion = 'v1.0.5';
  const lastUpdateDate = 'November 15, 2025';
  const uptime = 342;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportCSV = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success('CSV export started', {
        description: 'Your data will be downloaded shortly',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCSV = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success('CSV import started', {
        description: 'Processing your uploaded file',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success('Report generated successfully', {
        description: 'Your PDF report has been created',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupToggle = (checked: boolean) => {
    setBackupEnabled(checked);
    if (checked) {
      toast.success('Backup enabled', {
        description: `Scheduled for ${backupFrequency}`,
      });
    } else {
      toast.info('Backup disabled', {
        description: 'No automatic backups will be created',
      });
    }
  };

  const handleBackupFrequencyChange = (value: string) => {
    setBackupFrequency(value as 'Daily' | 'Weekly' | 'Monthly');
    if (backupEnabled) {
      toast.success('Backup schedule updated', {
        description: `Now scheduled for ${value}`,
      });
    }
  };

  const handleMaintenanceAction = async (action: string, description: string) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success(action + ' completed', {
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
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
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage system operations and data</p>
      </div>

      {/* System Status Overview */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm bg-gradient-to-br from-blue-50 to-gray-50 dark:from-gray-800 dark:to-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3">
            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            System Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {systemStatusHealthy ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-900 dark:text-white font-medium">All systems operational</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-gray-900 dark:text-white font-medium">System maintenance required</span>
                  </div>
                )}
              </div>
              <Badge variant={systemStatusHealthy ? 'default' : 'outline'} className={systemStatusHealthy ? 'bg-green-500' : 'border-amber-500 text-amber-600 dark:text-amber-400'}>
                {systemStatusHealthy ? 'Healthy' : 'Warning'}
              </Badge>
            </div>

            {/* System Information Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Version</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{appVersion}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{lastUpdateDate}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{uptime}h</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Database</p>
                <p className="text-base font-medium text-green-600 dark:text-green-400">Connected</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Data Management
          </CardTitle>
          <CardDescription>Import, export, and backup your business data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Operations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Import CSV */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-start gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 mt-0.5">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-900 dark:text-white font-medium">Import CSV</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upload product or transaction data</p>
                </div>
              </div>
              <Button
                onClick={handleImportCSV}
                disabled={isLoading}
                variant="outline"
                className="w-full rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </>
                )}
              </Button>
            </div>

            {/* Export CSV */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-start gap-3">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2 mt-0.5">
                  <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-900 dark:text-white font-medium">Export CSV</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Download transaction data</p>
                </div>
              </div>
              <Button
                onClick={handleExportCSV}
                disabled={isLoading}
                variant="outline"
                className="w-full rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </>
                )}
              </Button>
            </div>

            {/* Generate Report */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-start gap-3">
                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-2 mt-0.5">
                  <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-900 dark:text-white font-medium">Generate Report</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create analysis PDF report</p>
                </div>
              </div>
              <Button
                onClick={handleGenerateReport}
                disabled={isLoading}
                variant="outline"
                className="w-full rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate PDF
                  </>
                )}
              </Button>
            </div>

            {/* Scheduled Backup */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-start gap-3">
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-2 mt-0.5">
                  <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-900 dark:text-white font-medium">Scheduled Backup</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatic data backup</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Enable backups</span>
                  <Switch checked={backupEnabled} onCheckedChange={handleBackupToggle} />
                </div>
                {backupEnabled && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Frequency</label>
                    <Select value={backupFrequency} onValueChange={handleBackupFrequencyChange}>
                      <SelectTrigger className="w-full rounded-lg border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Last Backup Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Last Backup</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{formatDate(lastBackup.lastBackup)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Scheduled: {lastBackup.scheduledBackup}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Maintenance Tools */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3">
            <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            System Maintenance
          </CardTitle>
          <CardDescription>Perform system checks and maintenance operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Clear Cache */}
            <motion.div
              whileHover={{ y: -4 }}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/30 hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <h4 className="text-gray-900 dark:text-white font-medium">Clear Cache</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Remove cached data to free space</p>
              </div>
              <Button
                onClick={() =>
                  handleMaintenanceAction('Clear Cache', 'System cache cleared successfully')
                }
                disabled={isLoading}
                variant="outline"
                className="w-full rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Clear
                  </>
                )}
              </Button>
            </motion.div>

            {/* Reset Configuration */}
            <motion.div
              whileHover={{ y: -4 }}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/30 hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <h4 className="text-gray-900 dark:text-white font-medium">Reset Configuration</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Restore default system settings</p>
              </div>
              <Button
                onClick={() =>
                  handleMaintenanceAction('Reset Configuration', 'System configuration reset to defaults')
                }
                disabled={isLoading}
                variant="outline"
                className="w-full rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Reset
                  </>
                )}
              </Button>
            </motion.div>

            {/* Check for Updates */}
            <motion.div
              whileHover={{ y: -4 }}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/30 hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <h4 className="text-gray-900 dark:text-white font-medium">Check for Updates</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Look for new system updates</p>
              </div>
              <Button
                onClick={() =>
                  handleMaintenanceAction('Check for Updates', 'System is up to date')
                }
                disabled={isLoading}
                variant="outline"
                className="w-full rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4 mr-2" />
                    Check
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
