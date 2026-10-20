import { Suspense } from "react";
import { login } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Shortlist</CardTitle>
          <CardDescription>Your job search dashboard. Enter the password you set in Vercel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoginForm next="" failed={false} />}>
            <LoginWithParams searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function LoginWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  return <LoginForm next={typeof sp.next === "string" ? sp.next : ""} failed={sp.error === "1"} />;
}

function LoginForm({ next, failed }: { next: string; failed: boolean }) {
  return (
    <form action={login} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <Input name="password" type="password" placeholder="Password" autoComplete="current-password" autoFocus required aria-invalid={failed || undefined} />
      {failed && <p className="text-sm text-destructive">That password is not right.</p>}
      <Button type="submit" className="w-full">
        Open dashboard
      </Button>
    </form>
  );
}
