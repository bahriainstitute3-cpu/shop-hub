import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { canAccessSettings, isEmailAllowed, isPrivilegedEmail, isSellerEmail, normalizeEmail, SELLER_EMAILS } from "../lib/allowedEmails";
import { getProductPermission } from "../lib/permissions";

const AuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Firestore /users/{uid} doc
  const [loading, setLoading] = useState(true);

  async function refreshProfile(fbUser = auth.currentUser) {
    if (!fbUser) {
      setUser(null);
      setProfile(null);
      return null;
    }

    const ref = doc(db, "users", fbUser.uid);
    let existing = {};
    let profileExists = false;
    try {
      const snap = await getDoc(ref);
      profileExists = snap.exists();
      existing = profileExists ? snap.data() : {};
    } catch (err) {
      console.error("Could not read user profile:", err);
    }

    let canAddProduct = isSellerEmail(fbUser.email);
    if (!canAddProduct) {
      try {
        canAddProduct = await getProductPermission(fbUser.email);
      } catch (err) {
        console.error("Permission check failed:", err);
      }
    }

    const nextProfile = {
      ...existing,
      name: existing.name || fbUser.displayName || "",
      email: normalizeEmail(fbUser.email) || existing.email || "",
      photoURL: fbUser.photoURL || existing.photoURL || "",
      canAddProduct,
      role: isPrivilegedEmail(fbUser.email) ? "admin" : (existing.role || "customer"),
    };

    try {
      if (profileExists) {
        await setDoc(ref, { ...nextProfile, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        await setDoc(ref, { ...nextProfile, blocked: false, createdAt: serverTimestamp() });
      }
    } catch (err) {
      console.error("Could not sync user profile:", err);
    }

    setUser(fbUser);
    setProfile(nextProfile);
    return nextProfile;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await refreshProfile(fbUser);
      } catch (err) {
        console.error("Authentication initialization failed:", err);
        setProfile({
          name: fbUser.displayName || "",
          email: normalizeEmail(fbUser.email),
          photoURL: fbUser.photoURL || "",
          canAddProduct: isSellerEmail(fbUser.email),
          role: isPrivilegedEmail(fbUser.email) ? "admin" : "customer",
        });
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // Remote-logout listener: watches THIS device's own /users/{uid} doc. If
  // an admin sets forceLogoutAt (via Settings > Sellers & Admins > Logout)
  // and it's newer than when this device signed in, this device signs
  // itself out immediately. Without this listener there's no way for a
  // remote logout to ever take effect — a client can't reach into another
  // device's session directly.
  useEffect(() => {
    if (!user) return;
    const signInMs = user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : Date.now();
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      const forceLogoutAt = data?.forceLogoutAt;
      const forceMs = forceLogoutAt?.toMillis ? forceLogoutAt.toMillis() : 0;
      if (forceMs > signInMs) {
        signOut(auth);
      }
    });
    return unsub;
  }, [user?.uid]);

  async function signup({ name, email, phone, password }) {
    // Allow any email to sign up
    const normalEmail = normalizeEmail(email);
    if (!normalEmail) throw new Error("Email is required.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const userDoc = {
      name, email: normalizeEmail(email),
      phone: phone || "",
      role: isPrivilegedEmail(email) ? "admin" : "customer",
      canAddProduct: isSellerEmail(email),
      blocked: false,
      photoURL: "",
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", cred.user.uid), userDoc);
    setProfile(userDoc);
    return cred.user;
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (snap.exists() && snap.data().blocked) {
      await signOut(auth);
      throw new Error("This account has been blocked. Contact support.");
    }
    return cred.user;
  }

  // "Continue with Google" — open to any Google account (unlike email/password
  // signup, which is restricted to ALLOWED_EMAILS). Only the SELLER_EMAIL
  // account gets canAddProduct: true, checked fresh on every login so
  // changing SELLER_EMAIL later takes effect immediately.
  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const googleEmail = normalizeEmail(cred.user.email);
    let canAddProduct = isSellerEmail(googleEmail);
    
    // Try to get permission from Firestore, but don't fail if it throws
    try {
      const perm = await getProductPermission(googleEmail);
      if (perm) canAddProduct = true;
    } catch (err) {
      console.error("Could not fetch permissions:", err);
    }

    const ref = doc(db, "users", cred.user.uid);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().blocked) {
      await signOut(auth);
      throw new Error("This account has been blocked. Contact support.");
    }

    const userDoc = {
      name: cred.user.displayName || "",
      email: googleEmail,
      phone: cred.user.phoneNumber || "",
      role: isPrivilegedEmail(googleEmail) ? "admin" : (snap.exists() ? (snap.data().role || "customer") : "customer"),
      canAddProduct,
      photoURL: cred.user.photoURL || "",
      blocked: false,
      updatedAt: serverTimestamp(),
      createdAt: snap.exists() ? snap.data().createdAt || serverTimestamp() : serverTimestamp(),
    };

    await setDoc(ref, userDoc, { merge: true });
    setProfile(userDoc);
    return cred.user;
  }

  async function logout() {
    setProfile(null);
    setUser(null);
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const canAddProduct = !!profile?.canAddProduct;
  const canAccessSettingsState = !!user && canAccessSettings(user.email);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, canAddProduct, canAccessSettings: canAccessSettingsState, signup, login, loginWithGoogle, logout, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);