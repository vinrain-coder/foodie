export type ActionState<T = unknown> = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
};
