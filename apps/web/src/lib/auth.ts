import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
// Deep import, not the package barrel: lib/auth.ts is also loaded by Edge
// middleware for session checks, and the @growthpilot/core barrel now pulls
// in Node-only code (Prisma, the OpenAI SDK) that Edge can't bundle.
import { verifyUserPassword } from "@growthpilot/core/src/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await verifyUserPassword(email, password);
        if (!user) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
