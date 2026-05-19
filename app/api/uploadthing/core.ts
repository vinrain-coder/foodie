import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from "@/lib/get-session";

const f = createUploadthing();

export const ourFileRouter = {
  // Product Images
  products: f({
    image: {
      maxFileSize: "1MB",
      maxFileCount: 6,
    },
    video: {
      maxFileSize: "2MB",
      maxFileCount: 2,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  // Categories
  categories: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  //carousels
  carousels: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  // logos
  logos: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  // brands
  brands: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  // tags
  tags: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  // blogs
  blogs: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  // reviews
  reviews: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),

  // pages
  pages: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await getServerSession();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
