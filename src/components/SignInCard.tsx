"use client";

import { signIn } from "next-auth/react";
import { Button } from "./ui";

export function SignInCard({ error }: { error?: string }) {
  return (
    <div className="mx-auto mt-24 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-brand">F2 Experience Builder</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sign in with your <b>2hourlearning.com</b> or <b>alpha.school</b> Google account to continue.
      </p>
      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          That account isn&apos;t allowed. Use your 2hourlearning.com or alpha.school Google account.
        </p>
      )}
      <div className="mt-6 flex justify-center">
        <Button onClick={() => signIn("google", { callbackUrl: "/" })}>Sign in with Google</Button>
      </div>
    </div>
  );
}