
const SUPABASE_URL = "https://mcpqobgxdjihkntphovi.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_9j7w0tU6nAzj2OlLFBjbdQ_hHLYuVOr";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

// Verify that an existing session belongs to an administrator
async function verifyAdmin() {
    const { data: { session } } = await db.auth.getSession();

    if (!session) return false;

    const { data, error } = await db
        .from("admin_users")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

    if (error || !data) {
        await db.auth.signOut();
        return false;
    }

    return true;
}

// Check existing login
verifyAdmin().then(isAdmin => {
    if (isAdmin) {
        window.location.replace("dashboard.html");
    }
});

// Login
loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
    loginMessage.textContent = "";

    try {
        const { data, error } = await db.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        const { data: admin, error: adminError } = await db
            .from("admin_users")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (adminError) throw adminError;

        if (!admin) {
            await db.auth.signOut();
            throw new Error("This account is not authorized as an administrator.");
        }

        loginMessage.textContent = "Login successful. Redirecting...";

        window.location.replace("dashboard.html");

    } catch (error) {
        loginMessage.textContent = error.message || "Login failed.";
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In Securely";
    }
});
