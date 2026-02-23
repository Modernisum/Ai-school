import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCrxzGs7KhQPhYKtecI9TMREArzXLlrKpA",
  authDomain: "modernschool-e873a.firebaseapp.com",
  databaseURL: "https://modernschool-e873a-default-rtdb.firebaseio.com",
  projectId: "modernschool-e873a",
  storageBucket: "modernschool-e873a.firebasestorage.app",
  messagingSenderId: "438141485295",
  appId: "1:438141485295:web:7769e35c0ce08587dcdb1a",
  measurementId: "G-BK74VETBS7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Setup reCAPTCHA
const setupRecaptcha = () => {
  window.recaptchaVerifier = new RecaptchaVerifier(
    "recaptcha-container",
    { size: "invisible" },
    auth
  );
};

// Request OTP
export const requestOtp = async (phoneNumber) => {
  setupRecaptcha();
  const appVerifier = window.recaptchaVerifier;
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  return confirmationResult; // Save to verify later
};
