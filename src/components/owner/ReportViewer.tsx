'use client';

export function ReportViewer({ data }: { data: any }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4 dark:text-white">Report Viewer</h3>
      <pre className="text-sm overflow-auto">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}