import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

interface PasswordInputProps extends React.ComponentProps<typeof Input> {
  startIcon?: React.ReactNode;
}

export function PasswordInput({
  className,
  startIcon,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      {startIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {startIcon}
        </div>
      )}
      <Input
        type={showPassword ? "text" : "password"}
        className={cn(
          "pr-10 [&::-ms-reveal]:hidden",
          startIcon && "pl-10",
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        title={showPassword ? "Hide password" : "Show password"}
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transform cursor-pointer"
      >
        {showPassword ? (
          <EyeOffIcon className="size-5" />
        ) : (
          <EyeIcon className="size-5" />
        )}
      </button>
    </div>
  );
}
