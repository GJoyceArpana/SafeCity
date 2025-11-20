import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBeH2UB430dVf6BzUYcUeOTMv5L4SC6K48",
  authDomain: "crimealert-4d3b9.firebaseapp.com",
  projectId: "crimealert-4d3b9",
  storageBucket: "crimealert-4d3b9.firebasestorage.app",
  messagingSenderId: "16946159180",
  appId: "1:16946159180:web:f92b5e76d538b3bcd95ee9",
  measurementId: "G-WM95058BKL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
