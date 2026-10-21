import { Suspense } from "react";
import { login } from "@/app/actions";
import { APP_NAME, APP_TAGLINE } from "@/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-[min(420px,40%)] flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-sidebar-accent-foreground">{APP_NAME}</p>
          <p className="mt-2 text-sm text-sidebar-foreground/70">{APP_TAGLINE}</p>
        </div>
        <ul className="space-y-3 text-sm text-sidebar-foreground/80">
          <li>Scout, score, and tailor from one dashboard</li>
          <li>Pick cloud agent models and run on demand</li>
          <li>Track applications, outreach, and resumes</li>
        </ul>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <p className="text-xl font-semibold">{APP_NAME}</p>
            <p className="text-sm text-muted-foreground">Sign in to your dashboard</p>
          </div>
          <Suspense fallback={<LoginForm next="" failed={false} />}>
            <LoginWithParams searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

async function LoginWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  return <LoginForm next={typeof sp.next === "string" ? sp.next : ""} failed={sp.error === "1"} />;
}

function LoginForm({ next, failed }: { next: string; failed: boolean }) {
  return (
    <form action={login} className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use the password from your Vercel environment variables.</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <Input name="password" type="password" placeholder="Password" autoComplete="current-password" autoFocus required aria-invalid={failed || undefined} />
      {failed && <p className="text-sm text-destructive">That password is not right.</p>}
      <Button type="submit" className="w-full">
        Open dashboard
      </Button>
    </form>
  );
}
