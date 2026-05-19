"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, Controller, FormProvider, type Resolver } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordRequirements } from "@/components/shared/password-requirements";
import SubmitButton from "@/components/shared/submit-button";
import { FormError } from "@/components/shared/form-error";
import { createUserByAdmin } from "@/lib/actions/user.actions";
import { passwordSchema } from "@/lib/validator";
import { USER_ROLES } from "@/lib/constants";
import { toast } from "sonner";

const adminCreateUserSchema = z.object({
  name: z.string().min(2, "Username must be at least 2 characters").max(50),
  email: z.string().email("Email is invalid"),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm password is required"),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AdminCreateUserFormValues = z.infer<typeof adminCreateUserSchema>;

export default function UserCreateForm() {
  const router = useRouter();

  const form = useForm<AdminCreateUserFormValues>({
    resolver: zodResolver(adminCreateUserSchema) as Resolver<AdminCreateUserFormValues>,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "USER",
    },
  });

  async function onSubmit(values: AdminCreateUserFormValues) {
    const res = await createUserByAdmin(values);
    if (!res.success) {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as any, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || "Failed to create user");
      return;
    }

    toast.success(res.message);
    router.push("/admin/users");
    router.refresh();
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Name</FieldLabel>
                
                  <Input placeholder="Enter full name" aria-invalid={fieldState.invalid} {...field} />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Email</FieldLabel>
                
                  <Input type="email" placeholder="Enter email" aria-invalid={fieldState.invalid} {...field} />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Password</FieldLabel>
                
                  <PasswordInput placeholder="Enter password" aria-invalid={fieldState.invalid} {...field} />
                
                <PasswordRequirements
                  password={form.watch("password") || ""}
                />
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Confirm Password</FieldLabel>
                
                  <PasswordInput placeholder="Confirm password" aria-invalid={fieldState.invalid} {...field} />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <FormError message={form.formState.errors.root?.message} />

        <Controller
          control={form.control}
          name="role"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Role</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError  errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SubmitButton
            type="submit"
            isLoading={form.formState.isSubmitting}
            className="w-full sm:w-auto"
          >
            Create User
          </SubmitButton>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
