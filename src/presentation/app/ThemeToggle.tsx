import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/presentation/app/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={
        isDark
          ? "Switch to light theme (currently dark)"
          : "Switch to dark theme (currently light)"
      }
      title={
        isDark
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
      className={className}
    >
      {isDark ? (
        <Sun className="size-4.5 text-foreground transition-transform hover:rotate-45" aria-hidden="true" />
      ) : (
        <Moon className="size-4.5 text-foreground transition-transform hover:-rotate-12" aria-hidden="true" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
