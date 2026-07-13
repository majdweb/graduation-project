import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./signUp.css";
import { signUpUser, signInUser, verifySignUpCode } from "./services/auth";
import { submitHotelRequest } from "./services/hotelRequests";
import { fileToResizedDataUrl } from "./data/imageUtil";

const initialForm = {
  username: "",
  email: "",
  phoneNumber: "",
  hotelName: "",
  city: "",
  stars: 0,
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => onChange(n)}
          style={{ fontSize: 32, cursor: 'pointer', color: n <= value ? '#f59e0b' : '#d1d5db', userSelect: 'none', lineHeight: 1 }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

const SYRIAN_CITIES = [
  'Damascus', 'Aleppo', 'Homs', 'Hama', 'Latakia', 'Tartous',
  'Idlib', 'Palmyra', 'Bloudan',
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
// At least 8 chars, 1 uppercase, 1 lowercase, 1 special character
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[^A-Za-z0-9]).{8,}$/;

const LEGAL_CONTENT = {
  terms: {
    title: "Terms of Service",
    paragraphs: [
      "Welcome to Velvet Compass. By creating an account and using our booking platform, you agree to use the service only for lawful purposes and to provide accurate information when registering or making a reservation.",
      "Bookings made through Velvet Compass are subject to each hotel's individual cancellation and payment policies, which will be displayed before you confirm a reservation. Velvet Compass acts as a marketplace connecting guests and hotel owners, and is not itself responsible for the condition or service quality of any listed property.",
      "Hotel owners are responsible for keeping their listings, pricing, and availability accurate. Misuse of the platform, fraudulent listings, or fraudulent bookings may result in suspension of an account at our discretion.",
      "We may update these terms from time to time. Continued use of Velvet Compass after changes are posted constitutes acceptance of the revised terms.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    paragraphs: [
      "Velvet Compass collects the information you provide when signing up, such as your name, email address, phone number, and — for hotel owners — your property details. This information is used to create and manage your account, process bookings, and communicate with you about your reservations.",
      "We do not sell your personal information to third parties. Limited data may be shared with hotel owners solely to facilitate a reservation you make on their property.",
      "We use industry-standard practices to protect your data, including secure password storage. You may request access to, correction of, or deletion of your personal data at any time by contacting our support team.",
      "Cookies and similar technologies may be used to keep you signed in and to improve your experience on the site. You can control cookie preferences through your browser settings.",
    ],
  },
};

function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [doc, setDoc] = useState(null); // { name, dataUrl } — hotel document image
  const [isOwnerSignUp, setIsOwnerSignUp] = useState(false);
  const [currentPage, setCurrentPage] = useState("signup");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationPassword, setVerificationPassword] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null
  const [verifying, setVerifying] = useState(false);
  // Stashed here because submitting a hotel request needs a real auth token, which we only have
  // after the owner is actually signed in (post-verification) — by then `form` has been reset.
  const [pendingOwnerRequest, setPendingOwnerRequest] = useState(null);

  const passwordRules = useMemo(
    () => ({
      minLength: form.password.length >= 8,
      hasUpper: /[A-Z]/.test(form.password),
      hasLower: /[a-z]/.test(form.password),
      hasSpecial: /[^A-Za-z0-9]/.test(form.password),
    }),
    [form.password]
  );

  const normalizePhone = (value) => value.trim().replace(/\s+/g, " ");
  const isFetchConnectionError = (err) =>
    err instanceof TypeError && /failed to fetch/i.test(err.message || "");

  const validate = (data) => {
    const nextErrors = {};

    if (!data.username.trim()) nextErrors.username = "Username is required.";
    if (!emailRegex.test(data.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!phoneRegex.test(data.phoneNumber.trim())) {
      nextErrors.phoneNumber = "Enter a valid phone number.";
    }
    if (isOwnerSignUp && !data.hotelName.trim()) {
      nextErrors.hotelName = "Hotel name is required.";
    }
    if (isOwnerSignUp && !data.city.trim()) {
      nextErrors.city = "City is required.";
    }
    if (isOwnerSignUp && !data.stars) {
      nextErrors.stars = "Please select your hotel star rating.";
    }
    if (!passwordRegex.test(data.password)) {
      nextErrors.password =
        "Password must be at least 8 characters with uppercase, lowercase, and special character.";
    }
    if (!data.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (data.confirmPassword !== data.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!data.acceptTerms) {
      nextErrors.acceptTerms = "You must accept the Terms and Privacy Policy.";
    }

    return nextErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSubmitError("");
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleDocChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, document: "Document image is too large (max 8MB)." }));
      e.target.value = "";
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setDoc({ name: file.name, dataUrl });
      setErrors((prev) => ({ ...prev, document: undefined }));
    } catch {
      setErrors((prev) => ({ ...prev, document: "Could not read the image. Try another file." }));
    }
    e.target.value = "";
  };

  const handleSignUpModeToggle = () => {
    setIsOwnerSignUp((prev) => !prev);
    setForm(initialForm);
    setDoc(null);
    setErrors({});
    setSubmitError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToSignUp = () => {
    setCurrentPage("signup");
    setForm(initialForm);
    setDoc(null);
    setErrors({});
    setSubmitError("");
    setVerificationNotice("");
    setVerificationCode("");
    setVerificationError("");
    setVerificationSuccess("");
    setVerificationPassword("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    if (isOwnerSignUp && !doc) {
      nextErrors.document = "Please attach a document image (license / ownership proof).";
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setSubmitError("");

    const payload = {
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: normalizePhone(form.phoneNumber),
      role: isOwnerSignUp ? "hotel_owner" : "guest",
      password: form.password,
      acceptTerms: form.acceptTerms,
    };
    if (isOwnerSignUp) {
      payload.hotelName = form.hotelName.trim();
      payload.city = form.city.trim();
      payload.stars = form.stars || null;

      // Submitting the actual request happens later, once we have a real auth token (see
      // handleVerifyCodeSubmit) — for now just remember what to submit.
      setPendingOwnerRequest({
        hotelName: payload.hotelName,
        city: payload.city,
        phoneNumber: payload.phoneNumber,
        stars: form.stars || null,
        document: doc,
      });
    }

    try {
      await signUpUser(payload);
      setVerificationEmail(payload.email);
      setVerificationPassword(payload.password);
      setVerificationNotice("");
      setVerificationCode("");
      setVerificationError("");
      setVerificationSuccess("");
      setCurrentPage("verification");
      setForm(initialForm);
      setDoc(null);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (isFetchConnectionError(err)) {
        setVerificationEmail(payload.email);
        setVerificationPassword(payload.password);
        setVerificationNotice(
          "We could not reach the server right now, but you can continue to verification."
        );
        setVerificationCode("");
        setVerificationError("");
        setVerificationSuccess("");
        setCurrentPage("verification");
        setForm(initialForm);
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSubmitError(err.message || "Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationCodeChange = (e) => {
    setVerificationCode(e.target.value);
    setVerificationError("");
    setVerificationSuccess("");
  };

  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    const normalizedCode = verificationCode.trim();
    if (!normalizedCode) {
      setVerificationError("Verification code is required.");
      return;
    }

    setVerifying(true);
    setVerificationError("");
    setVerificationSuccess("");

    try {
      await verifySignUpCode({ email: verificationEmail, code: normalizedCode });
      setVerificationSuccess("Code verified successfully.");

      try {
        const res = await signInUser({
          email: verificationEmail,
          password: verificationPassword,
        });
        const existingRaw = localStorage.getItem("mock_auth_user");
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const next = {
          ...res,
          user: {
            ...(existing?.user || {}),
            ...(res?.user || {}),
            hotelId: res?.user?.hotelId || existing?.user?.hotelId || null,
            hotelName: res?.user?.hotelName || existing?.user?.hotelName || null,
          },
        };
        localStorage.setItem("mock_auth_user", JSON.stringify(next));
        setVerificationPassword("");

        // Now that we have a real auth token, actually submit the hotel request. A failure here
        // shouldn't block the account itself — the owner can resubmit later from their own
        // requests page.
        if (pendingOwnerRequest) {
          try {
            await submitHotelRequest({ type: "create", ...pendingOwnerRequest });
          } catch (reqErr) {
            setVerificationNotice(
              "Account created, but we couldn't submit your hotel request. Please submit it again from your owner dashboard."
            );
          }
          setPendingOwnerRequest(null);
        }

        navigate(res?.user?.role === "hotel_owner" ? "/ownerhome" : "/");
      } catch (signInErr) {
        setVerificationNotice(
          "Account verified, but we couldn't sign you in automatically. Please sign in manually."
        );
      }
    } catch (err) {
      setVerificationError(err.message || "Unable to verify code.");
    } finally {
      setVerifying(false);
    }
  };

  if (currentPage === "verification") {
    return (
      <div className="page">
        <div className="overlay" />
        <Link to="/" className="auth-back-btn">← Back</Link>
        <main className="card">
          <h1>Verification</h1>
          <p className="subtitle">One more step to finish creating your account.</p>
          <p className="verification-copy">
            We sent a verification code to <strong>{verificationEmail || "your email"}</strong>.
            Enter it below to verify your account.
          </p>
          {verificationNotice && <p className="verification-note">{verificationNotice}</p>}
          <form onSubmit={handleVerifyCodeSubmit} noValidate>
            <label>
              Verification code
              <input
                name="verificationCode"
                type="text"
                value={verificationCode}
                onChange={handleVerificationCodeChange}
                placeholder="Enter verification code"
                autoComplete="one-time-code"
              />
            </label>
            <div className="verification-actions">
              <button type="submit" disabled={verifying}>
                {verifying ? "Verifying..." : "Verify code"}
              </button>
              <button type="button" onClick={handleBackToSignUp}>
                Back to sign up
              </button>
            </div>
            {verificationSuccess && <p className="success">{verificationSuccess}</p>}
            {verificationError && <p className="error submit-error">{verificationError}</p>}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="overlay" />
      <Link to="/" className="auth-back-btn">← Back</Link>
      <main className="card">
        <h1>{isOwnerSignUp ? "Create hotel owner account" : "Create your account"}</h1>
        <p className="subtitle">
          {isOwnerSignUp ? "Sign up as a hotel owner" : "Sign up to continue"}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Username
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter username"
              autoComplete="username"
            />
            {errors.username && <span className="error">{errors.username}</span>}
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email"
              autoComplete="email"
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </label>

          <label>
            Phone number
            <input
              name="phoneNumber"
              type="tel"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="+963 912345678"
              autoComplete="tel"
            />
            {errors.phoneNumber && (
              <span className="error">{errors.phoneNumber}</span>
            )}
          </label>

          {isOwnerSignUp && (
            <>
              <label>
                Hotel name
                <input
                  name="hotelName"
                  type="text"
                  value={form.hotelName}
                  onChange={handleChange}
                  placeholder="Enter hotel name"
                  autoComplete="organization"
                />
                {errors.hotelName && <span className="error">{errors.hotelName}</span>}
              </label>

              <label>
                City
                <select
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                >
                  <option value="">Select a city</option>
                  {SYRIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.city && <span className="error">{errors.city}</span>}
              </label>

              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Hotel star rating</label>
                <StarPicker
                  value={form.stars}
                  onChange={(n) => { setSubmitError(""); setForm((prev) => ({ ...prev, stars: n })); }}
                />
                {errors.stars && <span className="error">{errors.stars}</span>}
              </div>

              <label>
                Document image (license / ownership proof)
                <input type="file" accept="image/*" onChange={handleDocChange} />
                {doc && (
                  <span className="signup-doc-preview">
                    <img src={doc.dataUrl} alt="Document" />
                    <span className="signup-doc-name">{doc.name}</span>
                  </span>
                )}
                {errors.document && <span className="error">{errors.document}</span>}
              </label>
            </>
          )}

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              autoComplete="new-password"
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </label>

          <ul className="password-hint">
            <li className={passwordRules.minLength ? "ok" : ""}>At least 8 characters</li>
            <li className={passwordRules.hasUpper ? "ok" : ""}>At least 1 uppercase letter</li>
            <li className={passwordRules.hasLower ? "ok" : ""}>At least 1 lowercase letter</li>
            <li className={passwordRules.hasSpecial ? "ok" : ""}>At least 1 special character</li>
          </ul>

          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span className="error">{errors.confirmPassword}</span>
            )}
          </label>

          <label className="checkbox-row">
            <input
              name="acceptTerms"
              type="checkbox"
              checked={form.acceptTerms}
              onChange={handleChange}
            />
            <span>
              I accept the{" "}
              <span
                className="legal-link"
                role="button"
                tabIndex={0}
                onClick={() => setLegalModal("terms")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setLegalModal("terms")}
              >
                Terms
              </span>{" "}
              and{" "}
              <span
                className="legal-link"
                role="button"
                tabIndex={0}
                onClick={() => setLegalModal("privacy")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setLegalModal("privacy")}
              >
                Privacy Policy
              </span>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <span className="error checkbox-error">{errors.acceptTerms}</span>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={handleSignUpModeToggle}
          >
            {isOwnerSignUp ? "Back to regular sign up" : "Sign up as a hotel owner"}
          </button>

          {submitError && <p className="error submit-error">{submitError}</p>}
        </form>
      </main>

      {legalModal && (
        <div className="legal-modal-overlay" onClick={() => setLegalModal(null)}>
          <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="legal-modal-header">
              <h2>{LEGAL_CONTENT[legalModal].title}</h2>
              <button type="button" className="legal-modal-close" onClick={() => setLegalModal(null)}>
                ✕
              </button>
            </div>
            <div className="legal-modal-body">
              {LEGAL_CONTENT[legalModal].paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <button type="button" className="legal-modal-done" onClick={() => setLegalModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignUp;
