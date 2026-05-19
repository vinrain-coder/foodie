"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, Controller, FormProvider } from "react-hook-form";
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
import { updateUser } from "@/lib/actions/user.actions";
import { USER_ROLES } from "@/lib/constants";
import { UserUpdateSchema } from "@/lib/validator";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import SubmitButton from "@/components/shared/submit-button";
import { FormError } from "@/components/shared/form-error";
import { useEffect } from "react";

type UserEditFormValues = z.infer<typeof UserUpdateSchema>;

const UserEditForm = ({ user }: { user: UserEditFormValues }) => {
  const router = useRouter();

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(UserUpdateSchema),
    defaultValues: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscription: user.subscription || "FREE",
      subscriptionStatus: user.subscriptionStatus || "inactive",
      subscriptionExpiresAt: user.subscriptionExpiresAt
        ? new Date(user.subscriptionExpiresAt)
        : null,
    },
  });

  useEffect(() => {
    if (!user) return;

    form.reset({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscription: user.subscription || "FREE",
      subscriptionStatus: user.subscriptionStatus || "inactive",
      subscriptionExpiresAt: user.subscriptionExpiresAt
        ? new Date(user.subscriptionExpiresAt)
        : null,
    });
  }, [user]);

  async function onSubmit(values: UserEditFormValues) {
    try {
      const res = await updateUser({
        ...values,
        _id: user._id,
      });

      if (!res.success) {
        if (res.errors) {
          Object.entries(res.errors).forEach(([field, messages]) => {
            form.setError(field as keyof UserEditFormValues, {
              type: "server",
              message: messages.join(". "),
            });
          });
        }
        toast.error(res.message || "Failed to update user");
      } else {
        toast.success(res.message);
        router.push("/admin/users");
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user",
      );
    }
  }

  return (
    <FormProvider {...form}>
      <form
        method="post"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Name</FieldLabel>
                
                  <Input placeholder="Enter user name" aria-invalid={fieldState.invalid} {...field} />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field className="w-full" data-invalid={fieldState.invalid}>
                <FieldLabel>Email</FieldLabel>
                
                  <Input placeholder="Enter user email" aria-invalid={fieldState.invalid} {...field} />
                
                <FieldError  errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <Field className="space-y-2" data-invalid={fieldState.invalid}>
                  <FieldLabel>Role</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value.toString()}
                  >
                    
                      <SelectTrigger className="cursor-pointer" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem
                          key={role}
                          value={role}
                          className="cursor-pointer"
                        >
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="subscription"
              render={({ field, fieldState }) => (
                <Field className="space-y-2" data-invalid={fieldState.invalid}>
                  <FieldLabel>Subscription Tier</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value?.toString()}
                  >
                    
                      <SelectTrigger className="cursor-pointer" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                    
                    <SelectContent>
                      <SelectItem value="FREE" className="cursor-pointer">
                        Free
                      </SelectItem>
                      <SelectItem value="PREMIUM" className="cursor-pointer">
                        Premium
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              control={form.control}
              name="subscriptionStatus"
              render={({ field, fieldState }) => (
                <Field className="space-y-2" data-invalid={fieldState.invalid}>
                  <FieldLabel>Subscription Status</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value?.toString()}
                  >
                    
                      <SelectTrigger className="cursor-pointer" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    
                    <SelectContent>
                      <SelectItem value="active" className="cursor-pointer">
                        Active
                      </SelectItem>
                      <SelectItem value="inactive" className="cursor-pointer">
                        Inactive
                      </SelectItem>
                      <SelectItem value="trial" className="cursor-pointer">
                        Trial
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="subscriptionExpiresAt"
              render={({ field, fieldState }) => (
                <Field className="flex flex-col" data-invalid={fieldState.invalid}>
                  <FieldLabel>Subscription Expires At</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
        </div>

        <FormError message={form.formState.errors.root?.message} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SubmitButton
            type="submit"
            isLoading={form.formState.isSubmitting}
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? "Submitting..." : `Update User `}
          </SubmitButton>

          <Button
            variant="outline"
            type="button"
            onClick={() => router.push(`/admin/users`)}
          >
            Back
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export default UserEditForm;
