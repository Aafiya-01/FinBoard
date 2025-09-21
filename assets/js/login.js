// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
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
const signInView = document.getElementById('sign-in-view');
const signUpView = document.getElementById('sign-up-view');
const signInForm = document.getElementById('sign-in-form');
const signUpForm = document.getElementById('sign-up-form');
const googleSignInButton = document.getElementById('google-signin-button');
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
    }, 5000);
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
    const firebaseConfig = {
        apiKey: "AIzaSyD_Ib8N0DMJXjjebiOcyfdoI5S_2Fo5dfk",
        authDomain: "finb-e8d5c.firebaseapp.com",
        projectId: "finb-e8d5c",
        storageBucket: "finb-e8d5c.appspot.com",
        messagingSenderId: "987390693893",
        appId: "1:987390693893:web:97ea78258ab7f033df426c",
        measurementId: "G-Z1GV4QM9B1"
    };

    const appId = firebaseConfig.projectId || 'default-app-id';
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // --- Core App Functions ---

    const handleLogout = async () => {
        try {
            await signOut(auth);
            showNotification("You have been logged out.", false);
        } catch (error) {
            console.error("Logout error:", error);
            showNotification(error.message, true);
        }
    };

    const handleAiSummary = async function() {
        const resultContainer = document.getElementById('ai-summary-result');
        const loader = document.getElementById('ai-summary-loader');
        const button = this; 

        resultContainer.innerHTML = '';
        loader.classList.remove('hidden');
        button.disabled = true;

        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const systemPrompt = "You are a world-class financial analyst. Provide a concise, single-paragraph summary of the key market trends for today. Focus on major indices, significant sector movements, and any impactful economic news. The tone should be professional and informative.";
        const userQuery = "What are the key financial market trends today?";

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            tools: [{ "google_search": {} }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Error: ${response.statusText} - ${errorBody}`);
            }

            const result = await response.json();
            const candidate = result.candidates?.[0];

            if (candidate && candidate.content?.parts?.[0]?.text) {
                const formattedText = candidate.content.parts[0].text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                    .replace(/\n/g, '<br>'); 
                resultContainer.innerHTML = `<p class="text-slate-300 text-sm leading-relaxed">${formattedText}</p>`;
            } else {
                throw new Error("No content received from AI model. The response may be blocked or empty.");
            }

        } catch (error) {
            console.error("AI Summary Error:", error);
            resultContainer.innerHTML = `<p class="text-red-400 text-sm">Failed to generate summary. ${error.message}</p>`;
        } finally {
            loader.classList.add('hidden');
            button.disabled = false;
        }
    };


    // Listen for authentication state changes to manage UI
    onAuthStateChanged(auth, async (user) => {
        if (user && !user.isAnonymous) {
            try {
                const response = await fetch('main.html');
                if (!response.ok) {
                    throw new Error(`Could not load dashboard UI (Status: ${response.status}). Please check that 'main.html' exists.`);
                }
                
                const dashboardHtmlText = await response.text();
                
                // **FIX:** Parse the fetched HTML and extract only the body's content.
                // This prevents creating an invalid DOM structure (e.g., <body> inside a <div>).
                const parser = new DOMParser();
                const doc = parser.parseFromString(dashboardHtmlText, 'text/html');
                const dashboardContent = doc.body.innerHTML;

                appView.innerHTML = dashboardContent; // Inject the clean content
                authContainer.classList.add('hidden');
                appView.classList.remove('hidden');

                // Now that the clean dashboard content is loaded, attach its event listeners
                document.getElementById('user-email').textContent = user.email || `Welcome, ${user.displayName || 'User'}`;
                document.getElementById('logout-button').addEventListener('click', handleLogout);
                document.getElementById('generate-summary-button').addEventListener('click', handleAiSummary);

            } catch (error) {
                console.error("Failed to load dashboard:", error);
                showNotification(error.message, true);
            }
        } else {
            appView.innerHTML = ''; 
            appView.classList.add('hidden');
            authContainer.classList.remove('hidden');
        }
    });

    // --- Authentication Form Handlers ---
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
            showNotification(error.message, true);
        } finally {
            hideLoader(button, 'Sign Up');
        }
    });

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
            showNotification(error.message, true);
        } finally {
            hideLoader(button, 'Sign In');
        }
    });

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
            let userMessage = error.message;
            if (error.code === 'auth/internal-error') {
                userMessage = "Internal error: Please ensure the OAuth consent screen is configured in your Google Cloud project.";
            }
            showNotification(userMessage, true);
        }
    });

} catch (e) {
    console.error("Initialization failed:", e);
    showNotification(e.message || "Could not connect to services. Please refresh.", true);
}

