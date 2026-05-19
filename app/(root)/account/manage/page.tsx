import { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "@/lib/get-session";
import { hasPassword } from "@/lib/actions/user.actions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import Breadcrumb from "@/components/shared/breadcrumb";
import { User, Mail, Lock, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PAGE_TITLE = "Login & Security";

export const metadata: Metadata = {
  title: PAGE_TITLE,
};

function Row({
  icon: Icon,
  title,
  value,
  href,
  description,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  href: string;
  description?: string;
}) {
  return (
    <div className="group transition-all duration-200">
      <Link href={href} className="block">
        <div className="flex items-center justify-between gap-4 p-5 rounded-xl hover:bg-linear-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 border border-transparent hover:border-primary/10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-linear-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground font-medium break-all">
                {value}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground/70">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
            <span className="text-xs font-medium hidden sm:inline">Edit</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </Link>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await getServerSession();
  const userHasPassword = await hasPassword();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="mb-24 max-w-3xl">
      <Breadcrumb />

      <div className="mb-8 mt-4">
        <h1 className="font-bold tracking-tight text-3xl">{PAGE_TITLE}</h1>
        <p className="text-muted-foreground mt-2 text-base">
          Manage your account details and security settings
        </p>
      </div>

      <div className="mb-8 p-6 rounded-2xl bg-linear-to-r from-primary/5 via-primary/3 to-transparent border border-primary/10">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-xl ring-2 ring-primary/20">
            <AvatarFallback className="rounded-xl bg-linear-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
              {session?.user?.name ? getInitials(session.user.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-lg text-foreground">
              {session?.user?.name ?? "User"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {session?.user?.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                Active account
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-0 shadow-lg shadow-black/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            <Row
              icon={User}
              title="Name"
              value={session?.user?.name ?? "-"}
              href="/account/manage/name"
              description="Your full name for account identification"
            />

            <Row
              icon={Mail}
              title="Email"
              value={session?.user?.email ?? "-"}
              href="/account/manage/email"
              description="Used for login and notifications"
            />

            <Row
              icon={Lock}
              title="Password"
              value="••••••••••••"
              href="/account/manage/password"
              description={
                userHasPassword
                  ? "Last updated: More than 90 days ago"
                  : "Set a password to enable email login"
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
