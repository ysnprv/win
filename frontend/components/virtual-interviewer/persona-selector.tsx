"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/constants";

interface Persona {
  name: string;
  role: string;
  company: string;
  years_experience: number;
  style: string;
  difficulty: string;
  tone: string;
}

interface PersonaData {
  [key: string]: Persona;
}

// Avatar mapping for personas
const PERSONA_AVATARS: { [key: string]: string } = {
  "alex_chen": "/personas/Alex Chen.png",
  "sarah_williams": "/personas/Sarah Williams.png",
  "marcus_johnson": "/personas/Ali Mahmoud.png",
  "priya_patel": "/personas/Aisha Obeid.png",
  "jordan_lee": "/personas/Jordan Lee.png",
};

export function PersonaSelector() {
  const [personas, setPersonas] = useState<PersonaData>({});
  const [selectedPersona, setSelectedPersona] = useState<string>("alex_chen");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPersonas();
    // Load selected persona from localStorage
    const savedPersona = localStorage.getItem("selectedPersona");
    if (savedPersona) {
      setSelectedPersona(savedPersona);
    }
  }, []);

  const fetchPersonas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/virtual-interviewer/personas`);
      const data = await response.json();
      setPersonas(data.personas);
    } catch (error) {
      console.error("Failed to fetch personas:", error);
      toast.error("Failed to load interviewer personas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPersona = (personaKey: string) => {
    setSelectedPersona(personaKey);
    // Store in localStorage for interview room to access
    localStorage.setItem("selectedPersona", personaKey);
    toast.success(`Selected ${personas[personaKey].name}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "entry-level":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "advanced":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Choose Your Interviewer</h3>
        <p className="text-sm text-muted-foreground">
          Select an AI interviewer persona that matches your preparation goals
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col sm:flex-row justify-center gap-4 flex-wrap items-center sm:justify-center">
          {Object.entries(personas).slice(0, 3).map(([key, persona]) => (
            <Card
              key={key}
              className={`relative p-5 cursor-pointer transition-all duration-300 hover:shadow-lg border-2 w-full sm:w-64 max-w-full ${
              selectedPersona === key
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleSelectPersona(key)}
          >
            {/* Selection indicator */}
            {selectedPersona === key && (
              <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}

            {/* Avatar */}
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border">
                <img
                  src={PERSONA_AVATARS[key] || "/personas/Alex Chen.png"}
                  alt={`${persona.name} avatar`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Fallback to generic user icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <svg class="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    `;
                  }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-3 text-center">
              <div>
                <h4 className="font-semibold text-foreground mb-1 break-words whitespace-normal max-w-full">{persona.name}</h4>
                <p className="text-xs text-muted-foreground">{persona.role}</p>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                <Badge variant="outline" className="text-xs whitespace-normal max-w-full break-words">
                  {persona.company}
                </Badge>
                <Badge variant="outline" className="text-xs whitespace-normal max-w-full break-words">
                  {persona.years_experience}+ yrs
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs">
                  <span className="text-muted-foreground">Style:</span>{" "}
                  <span className="font-medium text-foreground">{persona.style}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Tone:</span>{" "}
                  <span className="font-medium text-foreground">{persona.tone}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <Badge className={`${getDifficultyColor(persona.difficulty)} text-xs`}>
                  {persona.difficulty}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4 flex-wrap items-center sm:justify-center">
          {Object.entries(personas).slice(3).map(([key, persona]) => (
            <Card
              key={key}
              className={`relative p-5 cursor-pointer transition-all duration-300 hover:shadow-lg border-2 w-full sm:w-64 max-w-full ${
              selectedPersona === key
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleSelectPersona(key)}
          >
            {/* Selection indicator */}
            {selectedPersona === key && (
              <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}

            {/* Avatar */}
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border">
                <img
                  src={PERSONA_AVATARS[key] || "/personas/Alex Chen.png"}
                  alt={`${persona.name} avatar`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Fallback to generic user icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <svg class="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    `;
                  }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-3 text-center">
              <div>
                <h4 className="font-semibold text-foreground mb-1">{persona.name}</h4>
                <p className="text-xs text-muted-foreground">{persona.role}</p>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                <Badge variant="outline" className="text-xs">
                  {persona.company}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {persona.years_experience}+ yrs
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs">
                  <span className="text-muted-foreground">Style:</span>{" "}
                  <span className="font-medium text-foreground">{persona.style}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Tone:</span>{" "}
                  <span className="font-medium text-foreground">{persona.tone}</span>
                </div>
              </div>

              <div className="flex justify-center">
                <Badge className={`${getDifficultyColor(persona.difficulty)} text-xs`}>
                  {persona.difficulty}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}
