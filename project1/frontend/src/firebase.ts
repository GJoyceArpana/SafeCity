// src/firebase.ts

import { initializeApp } from "firebase/app";

let analytics: any = null;

// Load analytics ONLY IN BROWSER (avoids SSR errors)
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics }) => {
      analytics = getAnalytics();
    })
    .catch(() => {
      console.warn("Analytics not supported in this environment.");
    });
}

const firebaseConfig = {
  apiKey: "AIzaSyBeH2UB430dVf6BzUYcUeOTMv5L4SC6K48",
  authDomain: "crimealert-4d3b9.firebaseapp.com",
  projectId: "crimealert-4d3b9",
  storageBucket: "crimealert-4d3b9.firebasestorage.app",
  messagingSenderId: "16946159180",
  appId: "1:16946159180:web:f92b5e76d538b3bcd95ee9",
  measurementId: "G-WM95058BKL"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export { analytics };
