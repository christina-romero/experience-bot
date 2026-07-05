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
      // Drive files/folders. access_type=offline + prompt=consent yield a refresh
      // token so we can refresh the 1-hour access token instead of failing.
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.readonly",
          access_type: "offline",
          prompt: "consent",
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
      // Initial sign-in: capture tokens + expiry.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.expiresAt = account.expires_at;
        token.error = undefined;
        return token;
      }
      // Still valid (60s safety buffer).
      if (token.expiresAt && Date.now() < token.expiresAt * 1000 - 60_000) {
        return token;
      }
      // Expired: refresh with the refresh token if we have one.
      if (!token.refreshToken) {
        token.error = "NoRefreshToken";
        return token;
      }
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID ?? "",
            client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
          }),
        });
        const data = (await res.json()) as {
          access_token?: string;
          expires_in?: number;
          refresh_token?: string;
        };
        if (!res.ok || !data.access_token) throw new Error("refresh failed");
        token.accessToken = data.access_token;
        token.expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600);
        token.refreshToken = data.refresh_token ?? token.refreshToken;
        token.error = undefined;
      } catch {
        token.error = "RefreshFailed";
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});