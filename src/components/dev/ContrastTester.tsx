'use client';

const ContrastTester = () => {
  if (process.env.NODE_ENV !== 'development') return null;
  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white dark:bg-slate-800 border rounded-lg z-[9999] shadow-lg demo-card">
      <h3 className="font-bold mb-2">Contrast Test</h3>
      <div className="space-y-2 text-sm">
        <div className="text-gray-900 dark:text-slate-50">Primary text (15.5:1)</div>
        <div className="text-gray-600 dark:text-slate-300">Secondary text (9.2:1)</div>
        <div className="text-gray-500 dark:text-slate-400">Muted text (6.4:1)</div>
        <button className="btn-primary focusable touch-target">Interactive element</button>
      </div>
    </div>
  );
};

export default ContrastTester; 