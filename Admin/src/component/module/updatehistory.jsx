// HistoryModal.js
import React from "react";

export default function HistoryModal({ history, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-start pt-20 z-50">
      <div className="bg-white w-11/12 md:w-3/4 lg:w-1/2 rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold">Update History</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-auto space-y-4">
          {history.length === 0 && <p className="text-gray-500">No update history.</p>}

          {history.map((h, idx) => (
            <div key={idx} className="border rounded-lg p-3 shadow-sm hover:shadow-md transition">
              <div className="text-gray-500 text-sm mb-2">
                Updated At: {new Date(h.updatedAt).toLocaleString()}
              </div>
              <div className="space-y-2">
                {Object.entries(h.changes).map(([field, values]) => (
                  <div key={field} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span className="font-medium text-gray-700">{field}</span>
                    <span className="flex space-x-2 items-center text-gray-800">
                      <span className="line-through text-red-500">{values.old ?? "-"}</span>
                      <span className="text-green-600 font-semibold">→ {values.new ?? "-"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
