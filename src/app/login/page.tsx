import { Suspense } from "react";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-700 text-white">
            <Plane className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Masuk Ke Sistem</CardTitle>
            <CardDescription>Facility Readiness Reporting System - BIJB.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense>
            {params.error ? (
              <div className="mb-4 rounded-md border border-red-900/70 bg-red-950/60 px-3 py-2 text-sm text-red-200">
                {params.error}
              </div>
            ) : null}
          </Suspense>
          <form action={login} className="grid gap-4">
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="mt-2 w-full">
              Masuk
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
