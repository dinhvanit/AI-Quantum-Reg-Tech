import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import NeonAdapter from "@auth/neon-adapter";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be configured to use authentication.");
}

const pool = new Pool({ connectionString });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NeonAdapter(pool),
  providers: [
    Google,
    Credentials({
      id: "credentials",
      name: "Email và mật khẩu",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        const password = String(credentials.password ?? "");
        if (!email || !password) return null;

        const result = await pool.query(
          'SELECT id, name, email, image, "passwordHash" FROM users WHERE lower(email) = $1 LIMIT 1',
          [email],
        );
        const user = result.rows[0];
        if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
  // Credentials sign-in requires JWT sessions; OAuth users and accounts remain in Neon.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  jwt: { maxAge: 60 * 60 * 8 },
  callbacks: {
    authorized: ({ auth, request }) =>
      request.nextUrl.pathname.startsWith("/api/auth/") ||
      request.nextUrl.pathname === "/login" ||
      Boolean(auth),
    session: ({ session, token }) => {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
