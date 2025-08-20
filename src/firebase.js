// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDoa8YzQ707xRs1IGD3AqdXNMgPwPM2FWA",
    authDomain: "flowcheck-a4412.firebaseapp.com",
    projectId: "flowcheck-a4412",
    storageBucket: "flowcheck-a4412.firebasestorage.app",
    messagingSenderId: "450070719140",
    appId: "1:450070719140:web:52df78d02e59a45ba2d431"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();