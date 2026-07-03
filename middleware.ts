import { auth } from "@/auth";

// Gate every page/route (except the auth endpoints and the sign-in page) behind
// an allowed-domain Google session. Unauthenticated requests go to /signin.
export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/signin", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)"],
};