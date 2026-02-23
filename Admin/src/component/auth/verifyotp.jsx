export const verifyOtp = async (confirmationResult, otp) => {
  const result = await confirmationResult.confirm(otp);
  const user = result.user;

  // Get Firebase ID Token
  const idToken = await user.getIdToken();

  // Send token to backend for verification
  const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/school/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  return res.json();
};
