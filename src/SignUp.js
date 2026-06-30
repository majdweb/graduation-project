import { useMemo, useState } from "react";
import "./signUp.css";
import { signUpUser, verifySignUpCode } from "./services/auth";
import { addRequest } from "./data/hotelRequests";
import { fileToResizedDataUrl } from "./data/imageUtil";

const initialForm = {
  username: "",
  email: "",
  phoneNumber: "",
  hotelName: "",
  city: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
// At least 8 chars, 1 uppercase, 1 lowercase, 1 special character
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[^A-Za-z0-9]).{8,}$/;

function SignUp() {
  const [form, setForm] = useState(initialForm);
  const [doc, setDoc] = useState(null); // { name, dataUrl } — hotel document image
  const [isOwnerSignUp, setIsOwnerSignUp] = useState(false);
  const [currentPage, setCurrentPage] = useState("signup");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

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

      // Register a "new hotel" request for the admin to approve/reject.
      // This is stored client-side (JSON in localStorage), independent of the backend.
      try {
        addRequest({
          type: "create",
          hotelId: "",
          ownerName: payload.username,
          ownerEmail: payload.email,
          changes: {
            hotelName: payload.hotelName,
            city: payload.city,
            phoneNumber: payload.phoneNumber,
          },
          document: doc,
        });
      } catch (err) {
        setSubmitError(err.message || "Could not submit the hotel request.");
        setLoading(false);
        return;
      }
    }

    try {
      await signUpUser(payload);
      setVerificationEmail(payload.email);
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
                <input
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  autoComplete="address-level2"
                />
                {errors.city && <span className="error">{errors.city}</span>}
              </label>

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
              I accept the <strong>Terms</strong> and <strong>Privacy Policy</strong>.
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
    </div>
  );
}

export default SignUp;
