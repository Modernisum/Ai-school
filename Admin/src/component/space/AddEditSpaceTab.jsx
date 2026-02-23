import React from "react";

export default function AddEditSpaceTab({ categories, formData, setFormData, handleSubmit, editingSpace }) {
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-xl">
      <h3 className="text-xl font-bold mb-4">{editingSpace ? "Edit Space" : "Add New Space"}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
        <select
          name="categoryName"
          value={formData.categoryName}
          onChange={handleChange}
          required
          className="p-3 border rounded"
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.categoryName}>
              {cat.categoryName}
            </option>
          ))}
        </select>

        <input
          name="roomSize"
          placeholder="Room Size"
          value={formData.roomSize}
          onChange={handleChange}
          className="p-3 border rounded"
        />
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          className="p-3 border rounded"
        />

        <button
          type="submit"
          className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 transition"
        >
          {editingSpace ? "Update Space" : "Add Space"}
        </button>
      </form>
    </div>
  );
}
