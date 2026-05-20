"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { SettingInputSchema } from "@/lib/validator";
import { ClientSetting, ISettingInput } from "@/types";
import { updateSetting } from "@/lib/actions/setting.actions";
import useSetting from "@/hooks/use-setting-store";
import PaymentMethodForm from "./payment-method-form";
import SiteInfoForm from "./site-info-form";
import CommonForm from "./common-form";
import CarouselForm from "./carousel-form";
import AffiliateForm from "./affiliate-form";
import HeaderMenuForm from "./header-menu-form";
import { toast } from "sonner";
import SubmitButton from "@/components/shared/submit-button";
import { ValidationSummary } from "@/components/shared/validation-summary";
import SocialMediaForm from "./social-media-form";

const SettingForm = ({ setting }: { setting: ISettingInput }) => {
  const { setSetting } = useSetting();

  const form = useForm<ISettingInput>({
    resolver: zodResolver(SettingInputSchema) as Resolver<ISettingInput>,
    defaultValues: setting,
  });
  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: ISettingInput) {
    const res = await updateSetting({ ...values });
    if (!res.success) {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as any, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || "Failed to update settings");
    } else {
      toast.success(res.message);
      setSetting(values as ClientSetting);
    }
  }

  return (
    <div className="w-full">
      <FormProvider {...form}>
        <form
          className="space-y-12 w-full"
          method="post"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <SiteInfoForm id="setting-site-info" form={form} />
          <CommonForm id="setting-common" form={form} />
          <SocialMediaForm id="setting-social-media" form={form} />
          <CarouselForm id="setting-carousels" form={form} />
          <HeaderMenuForm id="setting-header-menus" form={form} />

          <PaymentMethodForm id="setting-payment-methods" form={form} />
          <AffiliateForm id="setting-affiliate" form={form} />

          <ValidationSummary errors={form.formState.errors as any} />

          <div>
            <SubmitButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Submitting..."
              className="w-full mb-24 cursor-pointer"
              size="lg"
            >
              Save Setting
            </SubmitButton>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default SettingForm;
