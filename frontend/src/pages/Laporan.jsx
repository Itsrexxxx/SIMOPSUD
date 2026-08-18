import { useMemo, useRef, useState } from 'react';

const templateRows = [
  ['tail_number', 'flight_hours_added', 'airbase_name', 'fuel_consumed_liters'],
  ['A-101', '12.5', 'Lanud Halim', '3200'],
  ['A-204', '18.0', 'Lanud Surabaya', '4100'],
];

const emptyDigest = {
  summary: {
    total_flights_processed: 0,
    total_flight_hours_added: 0,
    total_fuel_consumed: 0,
  },
  critical_alerts: {
    aircraft_warnings: [],
    airbase_warnings: [],
    total_aircraft_warnings: 0,
    total_airbase_warnings: 0,
  },
  mitigation: [],
};

export default function Laporan() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [digestData, setDigestData] = useState(emptyDigest);
  const [alertPage, setAlertPage] = useState(1);
  const fileInputRef = useRef(null);

  const totalAlertCount = useMemo(
    () =>
      (digestData?.critical_alerts?.total_aircraft_warnings ?? 0) +
      (digestData?.critical_alerts?.total_airbase_warnings ?? 0),
    [digestData]
  );

  const visibleAircraftAlerts = digestData?.critical_alerts?.aircraft_warnings ?? [];
  const visibleBaseAlerts = digestData?.critical_alerts?.airbase_warnings ?? [];

  const handleDownloadTemplate = () => {
    const csvContent = templateRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simko_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setUploadedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!uploadedFile) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch('http://localhost:8000/api/v1/import/bulk-ops-log', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Import gagal diproses' }));
        throw new Error(err.detail || 'Import gagal diproses');
      }

      const data = await response.json();
      setDigestData(data);
      setAlertPage(1);
    } catch (error) {
      console.error('Upload error:', error);
      setDigestData({ ...emptyDigest, mitigation: [error.message || 'Terjadi kesalahan saat memproses log operasional.'] });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const alertPages = Math.max(
    1,
    Math.ceil(Math.max(totalAlertCount, 0) / 10)
  );

  const handlePrevPage = () => setAlertPage((current) => Math.max(1, current - 1));
  const handleNextPage = () => setAlertPage((current) => Math.min(alertPages, current + 1));

  return (
    <div className="page-container min-h-screen bg-slate-50">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">SIMKO Operational Intelligence</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Laporan Log Operasional Mabes AU</h1>
        </div>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
        >
          Unduh Templat Excel Standar
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-[0_10px_30px_rgba(14,116,144,0.08)]">
        {isProcessing && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-sky-50/90 backdrop-blur-sm">
            <div className="flex items-center gap-4 rounded-2xl border border-sky-200 bg-white px-6 py-4 shadow-lg">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
              <p className="text-base font-semibold text-sky-800">
                Sedang Menganalisis Log Operasional Mabes AU... Harap Tunggu.
              </p>
            </div>
          </div>
        )}

        <div className="p-6 md:p-8">
          <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50/60 p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-2xl text-sky-700">
                  📤
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Upload File Operasional</h2>
                  <p className="text-sm text-slate-600">Format yang didukung: .csv, .xlsx, .xls</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
              <label className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 py-5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-400 hover:bg-sky-50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />
                <span className="mr-2 text-lg">📁</span>
                {uploadedFile ? uploadedFile.name : 'Pilih file log operasional'}
              </label>

              <button
                type="submit"
                disabled={!uploadedFile || isProcessing}
                className="rounded-2xl bg-sky-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-700/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isProcessing ? 'Menganalisis...' : 'Analisis Log'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {digestData && (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total Sortie</p>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {digestData.summary.total_flights_processed ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Accumulated Flight Hours</p>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {Number(digestData.summary.total_flight_hours_added ?? 0).toFixed(1)}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total Fuel Consumed</p>
              <p className="mt-4 text-3xl font-bold text-slate-900">
                {Number(digestData.summary.total_fuel_consumed ?? 0).toFixed(1)} L
              </p>
            </div>
          </div>

          {totalAlertCount > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Critical Anomalies</p>
                  <h3 className="mt-1 text-xl font-bold text-red-800">Anomali Operasional Terdeteksi</h3>
                </div>
                <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                  {totalAlertCount} item
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {visibleAircraftAlerts.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-white p-3">
                    <p className="mb-2 text-sm font-semibold text-red-800">Pesawat Grounded / Perlu Maintenance</p>
                    <ul className="space-y-2">
                      {visibleAircraftAlerts.map((alert, index) => (
                        <li key={`${alert.tail_number}-${index}`} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                          <span>{alert.tail_number}</span>
                          <span>{alert.accumulated_flight_hours} jam</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {visibleBaseAlerts.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-white p-3">
                    <p className="mb-2 text-sm font-semibold text-amber-800">Pangkalan dalam Status Warning / Critical</p>
                    <ul className="space-y-2">
                      {visibleBaseAlerts.map((alert, index) => (
                        <li key={`${alert.airbase_name}-${index}`} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          <span>{alert.airbase_name}</span>
                          <span className="font-semibold uppercase">{alert.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={alertPage === 1}
                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={alertPage >= alertPages}
                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {digestData.mitigation?.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">AI-Generated Contingency Plan</p>
              <h3 className="mt-2 text-xl font-bold text-emerald-900">Rencana Kontinjensi Taktis</h3>

              <ul className="mt-4 space-y-3">
                {digestData.mitigation.map((instruction, index) => (
                  <li key={`${instruction}-${index}`} className="flex gap-3 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-900">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      {index + 1}
                    </span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  Konfirmasi &amp; Terapkan Tindakan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

