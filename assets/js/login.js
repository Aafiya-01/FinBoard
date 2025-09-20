// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    signInAnonymously,
    signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DOM Element References ---
const authContainer = document.getElementById('auth-container');
const appView = document.getElementById('app-view');
const userEmailDisplay = document.getElementById('user-email');
const signInView = document.getElementById('sign-in-view');
const signUpView = document.getElementById('sign-up-view');
const signInForm = document.getElementById('sign-in-form');
const signUpForm = document.getElementById('sign-up-form');
const googleSignInButton = document.getElementById('google-signin-button');
const logoutButton = document.getElementById('logout-button');
const showSignUpButton = document.getElementById('show-signup');
const showSignInButton = document.getElementById('show-signin');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');

// --- UI Logic ---
const showLoader = (button) => {
    button.innerHTML = '<div class="loader"></div>';
    button.disabled = true;
};

const hideLoader = (button, text) => {
    button.innerHTML = text;
    button.disabled = false;
};

const showNotification = (message, isError = false) => {
    notificationMessage.textContent = message;
    notification.className = `fixed top-5 right-5 z-50 p-4 rounded-md text-sm text-white ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    notification.classList.remove('hidden');
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
};

showSignUpButton.addEventListener('click', () => {
    signInView.classList.add('hidden');
    signUpView.classList.remove('hidden');
});

showSignInButton.addEventListener('click', () => {
    signUpView.classList.add('hidden');
    signInView.classList.remove('hidden');
});

// --- Firebase Initialization and Auth Logic ---
try {
    // --- Firebase Configuration ---
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    if (Object.keys(firebaseConfig).length === 0) {
        throw new Error("Firebase configuration is missing or invalid.");
    }
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    
    // --- Initialize Firebase ---
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // --- Firebase Authentication Logic ---

    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
        if (user && !user.isAnonymous) {
            // User is signed in and not anonymous
            authContainer.classList.add('hidden');
            appView.classList.remove('hidden');
            userEmailDisplay.textContent = user.email || `Welcome, ${user.displayName || 'User'}`;
        } else {
            // User is signed out or anonymous
            appView.classList.add('hidden');
            authContainer.classList.remove('hidden');
        }
    });

    // Handle initial authentication from environment
    const initialAuth = async () => {
        try {
            if (initialAuthToken && !auth.currentUser) {
                await signInWithCustomToken(auth, initialAuthToken);
            }
        } catch(error) {
            console.error("Initial custom token authentication error:", error);
            showNotification("Session token is invalid. Please sign in.", true);
        }
    };
    initialAuth();

    // Sign-up with email and password
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const button = document.getElementById('signup-button');
        showLoader(button);
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const userDocRef = doc(db, `/artifacts/${appId}/users/${user.uid}/profile/${user.uid}`);
            await setDoc(userDocRef, {
                uid: user.uid,
                name: name,
                email: user.email,
                createdAt: serverTimestamp(),
                provider: 'email/password'
            });
            showNotification("Account created successfully!", false);
        } catch (error) {
            console.error("Sign-up error:", error);
            if (error.code === 'auth/operation-not-allowed') {
                showNotification("Email sign-up is not enabled. Please use Google sign-in.", true);
            } else {
                showNotification(error.message, true);
            }
        } finally {
            hideLoader(button, 'Sign Up');
        }
    });

    // Sign-in with email and password
    signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        const button = document.getElementById('signin-button');
        showLoader(button);
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification("Signed in successfully!", false);
        } catch (error) {
            console.error("Sign-in error:", error);
             if (error.code === 'auth/operation-not-allowed') {
                showNotification("Email sign-in is not enabled. Please use Google sign-in.", true);
            } else {
                showNotification(error.message, true);
            }
        } finally {
            hideLoader(button, 'Sign In');
        }
    });

    // Sign-in with Google
    googleSignInButton.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userDocRef = doc(db, `/artifacts/${appId}/users/${user.uid}/profile/${user.uid}`);
            await setDoc(userDocRef, {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                createdAt: serverTimestamp(),
                provider: 'google.com'
            }, { merge: true });

            showNotification("Signed in with Google successfully!", false);
        } catch (error) {
            console.error("Google sign-in error:", error);
            showNotification(error.message, true);
        }
    });

    // Log out
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showNotification("You have been logged out.", false);
        } catch (error) {
            console.error("Logout error:", error);
            showNotification(error.message, true);
        }
    });

} catch (e) {
    console.error("Initialization failed:", e);
    showNotification("Could not connect to services. Please refresh.", true);
}
