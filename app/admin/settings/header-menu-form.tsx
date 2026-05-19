import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import DeleteDialog from "@/components/shared/delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { ISettingInput } from "@/types";
import { ChevronDown, TrashIcon } from "lucide-react";
import { useFieldArray, UseFormReturn, Controller } from "react-hook-form";

function SubMenuFields({
  form,
  menuIndex,
}: {
  form: UseFormReturn<ISettingInput>;
  menuIndex: number;
}) {
  const {
    fields: subMenuFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: `headerMenus.${menuIndex}.subMenus`,
  });

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Sub-menus</h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ name: "", href: "" })}
        >
          Add sub-menu
        </Button>
      </div>

      {subMenuFields.length === 0 && (
        <p className="text-xs text-muted-foreground">No sub-menus yet.</p>
      )}

      <div className="space-y-2">
        {subMenuFields.map((field, subMenuIndex) => (
          <div
            key={field.id}
            className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]"
          >
            <Controller
              control={form.control}
              name={`headerMenus.${menuIndex}.subMenus.${subMenuIndex}.name`}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  
                    <Input aria-invalid={fieldState.invalid} {...field} placeholder="Sub-menu name" />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name={`headerMenus.${menuIndex}.subMenus.${subMenuIndex}.href`}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  
                    <Input aria-invalid={fieldState.invalid} {...field} placeholder="/path/to/sub-menu" />
                  
                  <FieldError  errors={[fieldState.error]} />
                </Field>
              )}
            />
            <DeleteDialog
              id={field.id}
              title="Delete sub-menu?"
              description="This sub-menu will be removed from the form."
              triggerLabel="Remove sub-menu"
              onDelete={async () => {
                remove(subMenuIndex);

                return {
                  success: true,
                  message: "Sub-menu removed",
                };
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HeaderMenuForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>;
  id: string;
}) {
  const {
    fields: menuFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "headerMenus",
  });

  return (
    <div id={id}>
      <Card>
        <CardHeader>
          <CardTitle>Header Menus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {menuFields.map((field, index) => (
            <details
              key={field.id}
              className="rounded-md border bg-card p-3"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
                <span>Menu {index + 1}</span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <Controller
                    control={form.control}
                    name={`headerMenus.${index}.name`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        {index === 0 && <FieldLabel>Menu name</FieldLabel>}
                        
                          <Input aria-invalid={fieldState.invalid} {...field} placeholder="Menu name" />
                        
                        <FieldError  errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name={`headerMenus.${index}.href`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        {index === 0 && <FieldLabel>Menu URL</FieldLabel>}
                        
                          <Input aria-invalid={fieldState.invalid} {...field} placeholder="/path/to/menu" />
                        
                        <FieldError  errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <DeleteDialog
                    id={field.id}
                    title="Delete menu?"
                    description="This menu will be removed from the form."
                    triggerLabel="Remove menu"
                    onDelete={async () => {
                      remove(index);

                      return {
                        success: true,
                        message: "Menu removed",
                      };
                    }}
                  />
                </div>

                <SubMenuFields form={form} menuIndex={index} />
              </div>
            </details>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: "", href: "", subMenus: [] })}
          >
            Add header menu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
