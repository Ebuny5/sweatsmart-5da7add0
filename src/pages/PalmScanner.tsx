import PalmScannerApp from '@/components/palm-new/PalmScannerApp';
import PageTransition from '@/components/layout/PageTransition';

export default function PalmScanner() {
  return (
    <PageTransition>
      <div className="min-h-[100dvh] bg-[#3b0764]">
        <PalmScannerApp />
      </div>
    </PageTransition>
  );
}