import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from "@/lib/get-session";
import { isAdminRole, isRestaurantRole, isRiderRole } from "@/lib/dashboard-access";

const f = createUploadthing();

const ensureAuthenticatedUser = async () => {
  const session = await getServerSession();
  if (!session?.user?.id) throw new UploadThingError("Unauthorized");
  return session.user;
};

const ensureStaffUser = async () => {
  const user = await ensureAuthenticatedUser();
  if (!isAdminRole(user.role) && !isRestaurantRole(user.role)) {
    throw new UploadThingError("Unauthorized");
  }
  return user;
};

const ensureRiderUser = async () => {
  const user = await ensureAuthenticatedUser();
  if (!isRiderRole(user.role)) {
    throw new UploadThingError("Unauthorized");
  }
  return user;
};

const withSessionMeta = async ({ metadata, file }: { metadata: { userId: string }; file: { ufsUrl: string; key: string; name: string; type: string; size: number } }) => {
  return {
    uploadedBy: metadata.userId,
    fileKey: file.key,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    fileUrl: file.ufsUrl,
    // Backward compatible fields:
    url: file.ufsUrl,
    ufsUrl: file.ufsUrl,
  };
};

export const ourFileRouter = {
  // menu Images
  menuItems: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 6,
    },
    video: {
      maxFileSize: "4MB",
      maxFileCount: 2,
    },
  })
    .middleware(async () => {
      const user = await ensureStaffUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  // Categories
  categories: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await ensureStaffUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  //carousels
  carousels: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await ensureStaffUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  // logos
  logos: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await ensureStaffUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  // tags
  tags: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await ensureStaffUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  // blogs
  blogs: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await ensureStaffUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  // reviews
  reviews: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await ensureAuthenticatedUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  // pages
  pages: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const user = await ensureStaffUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  // restaurants
  restaurants: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 2,
    },
  })
    .middleware(async () => {
      const user = await ensureAuthenticatedUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),

  // proof of delivery photos
  riderProofs: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 5,
    },
  })
    .middleware(async () => {
      const user = await ensureRiderUser();
      return { userId: user.id };
    })
    .onUploadComplete(withSessionMeta),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
