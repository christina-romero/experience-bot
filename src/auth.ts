import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/** Only these Google Workspace domains may sign in. */
const ALLOWED_DOMAINS = ["2hourlearning.com", "alpha.school"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Google({
      // Request Drive read scope so the app can read the signed-in user's own
      // Drive files (for the "paste a Drive link" input) without sharing.
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = (profile?.email ?? "").toLowerCase();
      const domain = email.split("@")[1];
      return !!domain && ALLOWED_DOMAINS.includes(domain);
    },
    async jwt({ token, account }) {
      // First sign-in carries the OAuth access token; keep it on the JWT.
      if (account?.access_token) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});