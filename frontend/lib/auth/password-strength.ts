export type PasswordStrength = {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
};

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "No password",
      color: "bg-gray-300",
      suggestions: ["Enter a password"],
    };
  }

  let score = 0;
  const suggestions: string[] = [];

  // Length check
  if (password.length >= 8) score++;
  else suggestions.push("Use at least 8 characters");

  if (password.length >= 12) score++;

  // Character variety checks
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);

  if (hasLowerCase && hasUpperCase) score++;
  else if (!hasLowerCase) suggestions.push("Add lowercase letters");
  else if (!hasUpperCase) suggestions.push("Add uppercase letters");

  if (hasNumbers) score++;
  else suggestions.push("Add numbers");

  if (hasSpecialChars) score++;
  else suggestions.push("Add special characters for extra security");

  // Common patterns penalty
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    suggestions.push("Avoid repeating characters");
  }

  if (/^[0-9]+$/.test(password)) {
    score = Math.max(0, score - 2);
    suggestions.push("Don't use only numbers");
  }

  // Determine label and color based on score
  let label: string;
  let color: string;

  switch (score) {
    case 0:
    case 1:
      label = "Weak";
      color = "bg-red-500";
      break;
    case 2:
      label = "Fair";
      color = "bg-orange-500";
      break;
    case 3:
      label = "Good";
      color = "bg-yellow-500";
      break;
    case 4:
      label = "Strong";
      color = "bg-green-500";
      break;
    default:
      label = "Very Strong";
      color = "bg-green-600";
      break;
  }

  return { score, label, color, suggestions: suggestions.slice(0, 2) };
}
