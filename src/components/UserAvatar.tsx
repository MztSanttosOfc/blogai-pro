import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
}

export function UserAvatar({ src, name, email, className }: UserAvatarProps) {
  const label = (name ?? email ?? "U").trim();
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  return (
    <Avatar className={cn("border border-primary/20", className)}>
      {src ? <AvatarImage src={src} alt={label} /> : null}
      <AvatarFallback className="bg-primary/15 text-primary font-semibold">
        {initials || "U"}
      </AvatarFallback>
    </Avatar>
  );
}
