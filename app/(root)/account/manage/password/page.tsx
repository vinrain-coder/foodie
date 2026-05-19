import { Card, CardContent } from "@/components/ui/card";
import Breadcrumb from "@/components/shared/breadcrumb";
import { getSetting } from "@/lib/actions/setting.actions";
import { getServerSession } from "@/lib/get-session";
import { hasPassword } from "@/lib/actions/user.actions";
import { Metadata } from "next";
import { unauthorized } from "next/navigation";
import { PasswordForm } from "./password-form";
import { SetPasswordForm } from "./set-password-form";

const PAGE_TITLE = "Password";

export const metadata: Metadata = {
  title: PAGE_TITLE,
};

export default async function PasswordPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();
  const { site } = await getSetting();
  const userHasPassword = await hasPassword();

  return (
    <div className="mb-24">
      <Breadcrumb />

      <h1 className="h1-bold py-4">{PAGE_TITLE}</h1>

      <Card className="max-w-2xl">
        <CardContent className="p-4 flex flex-col gap-6">
          <p className="text-sm">
            {userHasPassword
              ? `If you want to change the password associated with your ${site.name}'s account, you may do so below. Be sure to click the Change Password button when you are done.`
              : `Set a password for your ${site.name} account to sign in with your email. After setting a password, you can sign in with either your Google account or your email and password.`}
          </p>

          {userHasPassword ? <PasswordForm /> : <SetPasswordForm />}
        </CardContent>
      </Card>
    </div>
  );
}
