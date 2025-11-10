import { AlertCircle, TrendingUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useState } from 'react';

interface InsightCardProps {
  title: string;
  description: string;
  productName?: string;
  changePercent?: string;
  reason?: string;
  sku?: string;
  onRestockClick?: (sku: string) => Promise<void>;
  onNavigateProduct?: (sku: string) => void;
  onExportClick?: () => Promise<void>;
  isLoading?: boolean;
}

export default function InsightCard({
  title,
  description,
  productName,
  changePercent,
  reason,
  sku = '',
  onRestockClick,
  onNavigateProduct,
  onExportClick,
  isLoading = false,
}: InsightCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockMessage, setRestockMessage] = useState('');

  const handleRestockNow = async () => {
    if (!onRestockClick || !sku) return;
    setIsProcessing(true);
    try {
      await onRestockClick(sku);
      setRestockMessage('Restock request submitted successfully!');
      setTimeout(() => {
        setRestockModalOpen(false);
        setRestockMessage('');
      }, 2000);
    } catch (error) {
      setRestockMessage('Failed to submit restock request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNavigate = () => {
    if (onNavigateProduct && sku) {
      onNavigateProduct(sku);
    }
  };

  const handleExport = async () => {
    if (!onExportClick) return;
    setIsProcessing(true);
    try {
      await onExportClick();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="rounded-2xl border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 shadow-sm">
      <CardHeader>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-blue-900 dark:text-blue-300">{title}</CardTitle>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
              {description}
              {productName && (
                <>
                  {' '}
                  <span className="font-semibold">{productName}</span>
                  {changePercent && (
                    <>
                      {' '}
                      is expected to <span className="font-semibold">{changePercent}</span>
                    </>
                  )}
                  {reason && (
                    <>
                      {' '}
                      due to <span className="font-semibold">{reason}</span>.
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Dialog open={restockModalOpen} onOpenChange={setRestockModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={!sku || isLoading || isProcessing}
                className="flex items-center gap-1"
              >
                <TrendingUp className="w-4 h-4" />
                Restock Now
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Restock</DialogTitle>
                <DialogDescription>
                  {productName ? `Are you sure you want to restock ${productName}?` : 'Are you sure you want to proceed with restocking?'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {restockMessage ? (
                  <p
                    className={`text-sm ${
                      restockMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {restockMessage}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This action will submit a restock request for this product.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestockModalOpen(false)}
                        disabled={isProcessing}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleRestockNow}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Processing...' : 'Confirm Restock'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNavigate}
            disabled={!sku || isLoading || isProcessing}
          >
            See Product Detail
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading || isProcessing}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
