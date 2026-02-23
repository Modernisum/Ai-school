import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getSchoolId = () => localStorage.getItem("schoolId") || "622079";

export default function StudentFees() {
  const [studentId, setStudentId] = useState("");
  const [studentFeeData, setStudentFeeData] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");

  // Fetch student fee details
  const fetchStudentFees = async () => {
    if (!studentId) return alert("Enter student ID");
    try {
      const schoolId = getSchoolId();
      const response = await fetch(`${API_BASE_URL}/fees/${schoolId}/student/${studentId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Error fetching student fees");
      }
      const resData = await response.json();
      setStudentFeeData(resData.data);
    } catch (err) {
      console.error(err);
      alert(err.message || "Error fetching student fees");
      setStudentFeeData(null);
    }
  };

  // Pay fees
  const handlePay = async () => {
    if (!payAmount || parseInt(payAmount) <= 0) return alert("Enter valid pay amount");
    try {
      const schoolId = getSchoolId();
      const response = await fetch(`${API_BASE_URL}/fees/${schoolId}/student/${studentId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseInt(payAmount) }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Error processing payment");
      }
      const resData = await response.json();
      setStudentFeeData({ ...studentFeeData, pendingAmount: resData.data.pendingAmount });
      setPayAmount("");
      alert("Payment successful!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Error processing payment");
    }
  };

  // Apply discount
  const handleDiscount = async () => {
    if (!discountAmount || parseInt(discountAmount) <= 0) return alert("Enter valid discount amount");
    try {
      const schoolId = getSchoolId();
      const response = await fetch(`${API_BASE_URL}/fees/${schoolId}/student/${studentId}/discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount: parseFloat(discountAmount) }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Error applying discount");
      }
      const resData = await response.json();
      setStudentFeeData({
        ...studentFeeData,
        totalFees: resData.data.totalFees,
        pendingAmount: resData.data.pendingAmount,
        discount: resData.data.discount,
      });
      setDiscountAmount("");
      alert("Discount applied!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Error applying discount");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <button onClick={fetchStudentFees} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Fetch
        </button>
      </div>

      {studentFeeData && (
        <div className="space-y-3">
          <div className="p-4 border rounded bg-gray-50">
            <p><strong>Student ID:</strong> {studentFeeData.studentId}</p>
            <p><strong>Total Fees:</strong> ₹{studentFeeData.totalFees}</p>
            <p><strong>Discount:</strong> ₹{studentFeeData.discount}</p>
            <p><strong>Pending Amount:</strong> ₹{studentFeeData.pendingAmount}</p>
          </div>

          <div className="p-4 border rounded bg-gray-50">
            <h4 className="font-semibold mb-2">Fees Paid History</h4>
            {studentFeeData.feesPaid?.length === 0 ? (
              <p>No payments yet.</p>
            ) : (
              <ul className="list-disc list-inside">
                {studentFeeData.feesPaid.map((p, idx) => (
                  <li key={idx}>
                    ₹{p.amount} - {new Date(p.date).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Pay Amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button onClick={handlePay} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Pay
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Discount Amount"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button onClick={handleDiscount} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
              Apply Discount
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
