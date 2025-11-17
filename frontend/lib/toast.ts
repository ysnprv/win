// Simple toast utility using browser alerts for now
// TODO: Replace with proper toast system later

export function toast({ title, description, variant }: { 
  title: string; 
  description?: string; 
  variant?: "default" | "destructive" 
}) {
  const message = description ? `${title}: ${description}` : title;
  if (variant === "destructive") {
    alert(`❌ ${message}`);
  } else {
    alert(`✓ ${message}`);
  }
}
