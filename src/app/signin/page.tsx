import { SignInCard } from "@/components/SignInCard";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 px-4">
      <SignInCard error={error} />
    </main>
  );
}