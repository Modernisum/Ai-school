import React, { useState, memo } from "react";
import { deleteSpace } from "./api";

const SpacesListTab = memo(({ spaces, refreshSpaces }) => {
  const [openSpaceId, setOpenSpaceId] = useState(null);

  const handleDelete = async (spaceId, categoryName) => {
    if (!window.confirm("Are you sure you want to delete this space?")) return;
    try {
      await deleteSpace(categoryName, spaceId);
      refreshSpaces();
    } catch (err) {
      console.error(err);
      alert("Error deleting space");
    }
  };

  // ✅ Color helper for material quantity
  const getMaterialColor = (quantity) => {
    if (quantity <= 2) return "bg-red-200 border-red-400";
    if (quantity <= 5) return "bg-yellow-200 border-yellow-400";
    return "bg-green-200 border-green-400";
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 overflow-auto">
      {Object.keys(spaces).length === 0 ? (
        <p className="text-gray-500">No spaces available.</p>
      ) : (
        Object.keys(spaces).map((category) => (
          <div key={category} className="mb-6">
            <h3 className="font-bold text-lg mb-2">{category}</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th>ID</th>
                  <th>Room Size</th>
                  <th>Description</th>
                  <th>Materials</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {spaces[category].map((space) => {
                  const totalValue = space.availableMaterials?.reduce(
                    (sum, m) => sum + (m.totalSpend || 0),
                    0
                  );

                  return (
                    <tr key={space.spaceId}>
                      <td>{space.spaceId}</td>
                      <td>{space.roomSize}</td>
                      <td>{space.description}</td>
                      <td>
                        <button
                          onClick={() =>
                            setOpenSpaceId(openSpaceId === space.spaceId ? null : space.spaceId)
                          }
                          className="bg-blue-600 px-3 py-1 text-white rounded hover:bg-blue-700"
                        >
                          View Materials ({space.availableMaterials?.length || 0})
                        </button>

                        {openSpaceId === space.spaceId && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                            <div className="bg-white p-6 rounded-xl max-w-lg w-full relative shadow-lg">
                              <button
                                onClick={() => setOpenSpaceId(null)}
                                className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-lg font-bold"
                              >
                                ✕
                              </button>
                              <h3 className="text-xl font-bold mb-4">
                                Materials in {space.spaceId}
                              </h3>

                              {space.availableMaterials?.length > 0 ? (
                                <>
                                  <div className="grid grid-cols-1 gap-3 max-h-72 overflow-auto">
                                    {space.availableMaterials.map((m, i) => (
                                      <div
                                        key={i}
                                        className={`p-3 border rounded-lg shadow flex justify-between items-center ${getMaterialColor(m.quantity)}`}
                                      >
                                        <div>
                                          <p className="font-semibold">{m.materialName}</p>
                                          <p className="text-sm text-gray-700">
                                            Quantity: {m.quantity}
                                          </p>
                                        </div>
                                        <span className="font-semibold">₹{m.totalSpend}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-4 p-3 border-t font-bold text-right">
                                    Total Value: ₹{totalValue}
                                  </div>
                                </>
                              ) : (
                                <p className="text-gray-500">No materials assigned yet.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="flex justify-center gap-2">
                        <button
                          onClick={() => handleDelete(space.spaceId, category)}
                          className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 text-white"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
});

export default SpacesListTab;
