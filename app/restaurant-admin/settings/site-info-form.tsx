import { Field, FieldLabel, FieldError } from "@/components/ui/field";
/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { UploadButton } from "@/lib/uploadthing";
import { getUploadthingFileUrl } from "@/lib/uploadthing-media";
import { ISettingInput } from "@/types";
import { TrashIcon } from "lucide-react";
import { UseFormReturn, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export default function SiteInfoForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id: string;
}) {
  const { watch, control } = form;

  const siteLogo = watch("site.logo");
  return (
    <div id={id}>
      <Card>
        <CardHeader>
          <CardTitle>Site Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="site.name"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Name</FieldLabel>
                  
                    <Input placeholder="Enter site name" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="site.url"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Url</FieldLabel>
                  
                    <Input placeholder="Enter url" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="w-full text-left">
              <Controller
                control={control}
                name="site.logo"
                render={({ field, fieldState }) => (
                  <Field className="w-full" data-invalid={fieldState.invalid}>
                    <FieldLabel>Logo</FieldLabel>
                    
                      <Input placeholder="Enter image url" aria-invalid={fieldState.invalid} {...field} />
                    

                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {siteLogo && (
                <div className="flex my-2 items-center gap-2">
                  <img src={siteLogo} alt="logo" width={48} height={48} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.setValue("site.logo", "")}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {!siteLogo && (
                <UploadButton
                  className="items-start! py-2"
                  endpoint="logos"
                  onClientUploadComplete={(res) => {
                    const uploadedUrl = getUploadthingFileUrl(res?.[0]);
                    if (!uploadedUrl) {
                      toast.error("Upload completed but logo URL was missing.");
                      return;
                    }
                    form.setValue("site.logo", uploadedUrl);
                  }}
                  onUploadError={(error: Error) => {
                    toast.error(`ERROR! ${error.message}`);
                  }}
                />
              )}
            </div>
            <Controller
              control={control}
              name="site.description"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Description</FieldLabel>
                  
                    <Textarea
                      placeholder="Enter description"
                      className="h-40"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="site.slogan"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Slogan</FieldLabel>
                  
                    <Input placeholder="Enter slogan name" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="site.keywords"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Keywords</FieldLabel>
                  
                    <Input placeholder="Enter keywords" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="site.phone"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Phone</FieldLabel>
                  
                    <Input placeholder="Enter phone number" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="site.email"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Email</FieldLabel>
                  
                    <Input placeholder="Enter email address" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="site.address"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Address</FieldLabel>
                  
                    <Input placeholder="Enter address" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="site.businessHours"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Business Hours</FieldLabel>
                  
                    <Input placeholder="Enter business hours" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="site.copyright"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Copyright</FieldLabel>
                  
                    <Input placeholder="Enter copyright" aria-invalid={fieldState.invalid} {...field} />
                  

                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <Separator />

          <div className="space-y-3 rounded-lg border border-muted p-4">
            <div>
              <h3 className="text-sm font-semibold">
                SMS Notifications (Africa&apos;s Talking)
              </h3>
              <p className="text-muted-foreground text-xs">
                Configure SMS delivery for admin alerts and customer order
                updates. API keys are loaded securely from server environment
                variables.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Controller
                control={control}
                name="notifications.sms.enabled"
                render={({ field, fieldState }) => (
                  <Field className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3" data-invalid={fieldState.invalid}>
                    
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(Boolean(checked))
                        }
                      />
                    
                    <div className="space-y-1 leading-none">
                      <FieldLabel>Enable SMS notifications</FieldLabel>
                      <p className="text-muted-foreground text-xs">
                        Sends SMS alongside email where phone numbers are
                        available.
                      </p>
                    </div>
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="notifications.sms.sandboxMode"
                render={({ field, fieldState }) => (
                  <Field className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3" data-invalid={fieldState.invalid}>
                    
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(Boolean(checked))
                        }
                      />
                    
                    <div className="space-y-1 leading-none">
                      <FieldLabel>Sandbox mode</FieldLabel>
                      <p className="text-muted-foreground text-xs">
                        Safe testing mode — messages are logged and not
                        delivered live.
                      </p>
                    </div>
                  </Field>
                )}
              />
            </div>

            <div className="flex flex-col gap-5 md:flex-row">
              <Controller
                control={control}
                name="notifications.sms.username"
                render={({ field, fieldState }) => (
                  <Field className="w-full" data-invalid={fieldState.invalid}>
                    <FieldLabel>Africa&apos;s Talking Username</FieldLabel>
                    
                      <Input placeholder="sandbox" aria-invalid={fieldState.invalid} {...field} />
                    
                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="notifications.sms.senderId"
                render={({ field, fieldState }) => (
                  <Field className="w-full" data-invalid={fieldState.invalid}>
                    <FieldLabel>Sender ID (Optional)</FieldLabel>
                    
                      <Input placeholder="TumaFood" aria-invalid={fieldState.invalid} {...field} />
                    
                    <FieldError  errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Controller
              control={control}
              name="notifications.sms.adminRecipients"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Restaurant SMS Recipients</FieldLabel>
                  
                    <Textarea
                      placeholder="+254700000000, +254711111111"
                      className="min-h-20"
                      aria-invalid={fieldState.invalid} {...field}
                    />
                  
                  <p className="text-muted-foreground text-xs">
                    Comma or semicolon-separated E.164 phone numbers for admin
                    alert SMS.
                  </p>
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
