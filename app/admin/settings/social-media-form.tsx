import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { ISettingInput } from "@/types";
import { UseFormReturn, Controller } from "react-hook-form";

export default function SocialMediaForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id: string;
}) {
  const { control } = form;

  return (
    <div id={id}>
      <Card>
        <CardHeader>
          <CardTitle>Social Media Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="socialMedia.facebook"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Facebook</FieldLabel>
                  
                    <Input placeholder="Enter Facebook URL" aria-invalid={fieldState.invalid} {...field} />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="socialMedia.twitter"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Twitter</FieldLabel>
                  
                    <Input placeholder="Enter Twitter URL" aria-invalid={fieldState.invalid} {...field} />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="socialMedia.instagram"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>Instagram</FieldLabel>
                  
                    <Input placeholder="Enter Instagram URL" aria-invalid={fieldState.invalid} {...field} />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="socialMedia.tiktok"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>TikTok</FieldLabel>
                  
                    <Input placeholder="Enter TikTok URL" aria-invalid={fieldState.invalid} {...field} />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="socialMedia.youtube"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>YouTube</FieldLabel>
                  
                    <Input placeholder="Enter YouTube URL" aria-invalid={fieldState.invalid} {...field} />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>

          <div className="flex flex-col gap-5 md:flex-row">
            <Controller
              control={control}
              name="socialMedia.whatsapp"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>WhatsApp</FieldLabel>
                  
                    <Input placeholder="Enter WhatsApp URL" aria-invalid={fieldState.invalid} {...field} />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="socialMedia.linkedin"
              render={({ field, fieldState }) => (
                <Field className="w-full" data-invalid={fieldState.invalid}>
                  <FieldLabel>LinkedIn</FieldLabel>
                  
                    <Input placeholder="Enter LinkedIn URL" aria-invalid={fieldState.invalid} {...field} />
                  
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
