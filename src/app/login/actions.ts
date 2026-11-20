"use server";

import { authPool, signIn } from "@/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function loginWithPassword(formData: FormData) {
  await signIn("credentials", {
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: "/",
  });
}

export async function signupWithPassword(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    redirect("/signup?error=invalid");
  }
  if (password.length < 8 || password.length > 72) {
    redirect("/signup?error=password");
  }
  if (password !== confirmPassword) {
    redirect("/signup?error=mismatch");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let didCreateUser = false;
  try {
    const result = await authPool.query(
      `INSERT INTO users (name, email, "passwordHash")
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [name, email, passwordHash],
    );
    didCreateUser = Boolean(result.rowCount);
  } catch {
    redirect("/signup?error=unavailable");
  }

  if (!didCreateUser) {
    redirect("/signup?error=exists");
  }

  await signIn("credentials", { email, password, redirectTo: "/" });
}
