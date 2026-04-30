export async function signUpUser(payload) {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
  const signUpPath = process.env.REACT_APP_SIGNUP_PATH || "/api/auth/signup";
  const url = `${baseUrl}${signUpPath}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "Unable to sign up.");
  }

  return data || { message: "Sign up successful." };
}

export async function verifySignUpCode({ email, code }) {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const verifyType = process.env.REACT_APP_SUPABASE_VERIFY_TYPE || "signup";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      email,
      token: code,
      type: verifyType,
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || "Invalid verification code.");
  }

  return data;
}
