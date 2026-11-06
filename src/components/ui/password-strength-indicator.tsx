import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password = '' }) => {
  const hasMinLength = password.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const requirements = [
    { label: 'At least 10 characters', met: hasMinLength },
    { label: 'Contains a letter', met: hasLetter },
    { label: 'Contains a digit', met: hasDigit },
    { label: 'Contains a symbol', met: hasSymbol },
  ];

  const typesCount = [hasLetter, hasDigit, hasSymbol].filter(Boolean).length;

  // A simple strength calculation:
  // 0: weak (0 bars)
  // 1: poor (1 bar)
  // 2: fair (2 bars)
  // 3: good (3 bars)
  // 4: strong (4 bars)
  let strength = 0;
  if (password.length > 0) strength = 1;
  if (hasMinLength) strength += 1;
  if (typesCount >= 2) strength += 1;
  if (typesCount === 3 && hasMinLength) strength = 4;

  const strengthLabels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="flex flex-col gap-3 mt-3 w-full">
      <div className="flex items-center gap-1 w-full">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              strength >= level ? "bg-green-600" : "bg-gray-200"
            )}
          />
        ))}
        <span
          className={cn(
            "text-xs ml-2 font-medium w-12 text-right",
            strength > 0 ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {password.length > 0 ? strengthLabels[strength] : ''}
        </span>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-2">
            <Check className={cn("h-4 w-4", req.met ? "text-green-600" : "text-gray-300")} />
            <span className={req.met ? "text-green-600" : "text-gray-500"}>{req.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Include any 2 of: a letter, a digit, a symbol.
      </p>
    </div>
  );
};
