import React, { useState, memo } from "react";
import { fetchCategories, addCategory, deleteCategory } from "./api";

const CategoriesTab = memo(({ categories, refreshCategories }) => {
  const [newCategory, setNewCategory] = useState("");

  const handleAddCategory = async () => {
    if (!newCategory) return alert("Enter category name");
    try {
      await addCategory(newCategory);
      setNewCategory("");
      refreshCategories();
      alert("Category added");
    } catch (err) {
      console.error(err);
      alert("Error adding category");
    }
  };

  const handleDeleteCategory = async (catName) => {
    if (!window.confirm("Delete this category and all its spaces?")) return;
    try {
      await deleteCategory(catName);
      refreshCategories();
    } catch (err) {
      console.error(err);
      alert("Error deleting category");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-xl">
      <h3 className="text-xl font-bold mb-4">Manage Categories</h3>
      <div className="flex gap-2 mb-4">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New Category Name"
          className="p-2 border rounded flex-1"
        />
        <button
          onClick={handleAddCategory}
          className="bg-green-600 px-4 py-2 text-white rounded hover:bg-green-700"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="flex justify-between items-center border p-2 rounded">
            {cat.categoryName}
            <button
              onClick={() => handleDeleteCategory(cat.categoryName)}
              className="bg-red-500 px-3 py-1 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default CategoriesTab;
