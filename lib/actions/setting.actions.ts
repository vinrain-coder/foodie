"use server";

import { ISettingInput } from "@/types";
import data from "../data";
import Setting from "../db/models/setting.model";
import { connectToDatabase } from "../db";
import { flattenZodErrors, formatError } from "../utils";
import { SettingInputSchema } from "../validator";
import { ActionState } from "@/types/action-state";
import { cacheLife } from "next/cache";
import { cacheTag } from "next/cache";
import { updateTag } from "next/cache";

const withSettingDefaults = (
  setting?: Partial<ISettingInput> | null,
): ISettingInput => {
  const fallback = data.settings[0];
  if (!setting) return fallback;

  return {
    ...fallback,
    ...setting,
    common: { ...fallback.common, ...(setting.common ?? {}) },
    site: { ...fallback.site, ...(setting.site ?? {}) },
    socialMedia: {
      ...fallback.socialMedia,
      ...(setting.socialMedia ?? {}),
    },
    affiliate: { ...fallback.affiliate, ...(setting.affiliate ?? {}) },
    notifications: {
      sms: {
        ...fallback.notifications.sms,
        ...(setting.notifications?.sms ?? {}),
      },
    },
  } as ISettingInput;
};

export async function getSetting(): Promise<ISettingInput> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");

  await connectToDatabase();
  const setting = await Setting.findOne().lean();

  return withSettingDefaults(
    setting ? JSON.parse(JSON.stringify(setting)) : null,
  );
}

export async function getNoCachedSetting(): Promise<ISettingInput> {
  "use cache";
  cacheLife("minutes");
  cacheTag("settings");
  await connectToDatabase();
  const setting = await Setting.findOne().lean();
  return withSettingDefaults(
    setting ? JSON.parse(JSON.stringify(setting)) : null,
  );
}

export async function updateSetting(
  newSetting: ISettingInput,
): Promise<ActionState> {
  try {
    const validated = SettingInputSchema.safeParse(newSetting);
    if (!validated.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: flattenZodErrors(validated.error),
      };
    }

    await connectToDatabase();

    await Setting.findOneAndUpdate({}, validated.data, {
      upsert: true,
      new: true,
    }).lean();

    updateTag("settings");

    return { success: true, message: "Setting updated successfully" };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
