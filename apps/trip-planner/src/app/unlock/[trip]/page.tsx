import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { UnlockForm } from "./unlock-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { tripBySlug } from "@/data/trips";
import { gateToken, tripGate } from "@/lib/trip-gate";

// The unlock prompt depends on the per-request cookie, so render per-request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "输入行程密码",
};

interface UnlockPageProps {
  params: Promise<{ trip: string }>;
}

export default async function UnlockPage({ params }: UnlockPageProps) {
  const { trip: slug } = await params;
  const trip = tripBySlug(slug);
  if (!trip) notFound();

  // Already unlocked (e.g. a bookmarked /unlock link) — skip straight to the
  // trip rather than asking for a password the visitor has already entered.
  const gate = tripGate(slug);
  if (gate?.password) {
    const token = await gateToken(gate.realm, gate.password);
    const store = await cookies();
    if (store.get(gate.cookie)?.value === token) {
      redirect(`/${slug}`);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <div className="bg-muted text-muted-foreground mb-2 flex size-10 items-center justify-center rounded-full">
            <Lock className="size-5" />
          </div>
          <CardTitle className="text-xl tracking-tight">{trip.title}</CardTitle>
          <CardDescription>{trip.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <UnlockForm slug={trip.slug} />
          <p className="text-muted-foreground mt-4 text-center text-xs">
            每个行程有各自的密码
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
