import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, HelpCircle } from "lucide-react";
import type { Question, QuestionOption } from "@/stores/chat";

interface QuestionPromptProps {
  questions: Question[];
  onSubmit: (answers: (string | string[])[]) => void;
  disabled?: boolean;
}

// Helper to normalize options
function normalizeOption(opt: string | QuestionOption): QuestionOption {
  if (typeof opt === "string") {
    return { label: opt, value: opt };
  }
  return { ...opt, value: opt.value ?? opt.label };
}

// Check if any option has an image
function hasImageOptions(options: (string | QuestionOption)[]): boolean {
  return options.some((opt) => typeof opt !== "string" && opt.imageUrl);
}

// Get the value to return for an option
function getOptionValue(opt: string | QuestionOption): string {
  if (typeof opt === "string") return opt;
  return opt.value ?? opt.label;
}

export function QuestionPrompt({ questions, onSubmit, disabled = false }: QuestionPromptProps) {
  const [answers, setAnswers] = useState<(string | string[])[]>(
    questions.map((q) => (q.type === "multi" ? [] : ""))
  );

  const updateAnswer = (index: number, value: string | string[]) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const toggleMultiOption = (questionIndex: number, option: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      const current = next[questionIndex] as string[];
      next[questionIndex] = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return next;
    });
  };

  const isComplete = answers.every((a, i) => {
    const q = questions[i];
    if (q.type === "multi") return (a as string[]).length > 0;
    return (a as string).trim().length > 0;
  });

  const handleSubmit = () => {
    if (isComplete && !disabled) {
      onSubmit(answers);
    }
  };

  return (
    <div className="rounded-xl border bg-amber-50/50 p-4 space-y-4">
      <div className="flex items-center gap-2 text-amber-700">
        <HelpCircle className="w-4 h-4" />
        <span className="text-sm font-medium">AI needs your input</span>
      </div>

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="space-y-2">
            <p className="text-sm font-medium text-foreground">{q.question}</p>

            {q.type === "text" && (
              <Input
                placeholder="Type your answer..."
                value={answers[qIndex] as string}
                onChange={(e) => updateAnswer(qIndex, e.target.value)}
                disabled={disabled}
                className="bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isComplete) {
                    handleSubmit();
                  }
                }}
              />
            )}

            {/* Single choice with images - grid layout */}
            {q.type === "single" && q.options && hasImageOptions(q.options) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                {q.options.map((opt) => {
                  const normalized = normalizeOption(opt);
                  const isSelected = answers[qIndex] === normalized.value;
                  return (
                    <button
                      key={normalized.value}
                      className={cn(
                        "relative flex flex-col rounded-lg border-2 overflow-hidden transition-all",
                        "hover:border-primary/50 hover:shadow-md",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      )}
                      onClick={() => updateAnswer(qIndex, normalized.value!)}
                      disabled={disabled}
                    >
                      {/* Thumbnail */}
                      {normalized.imageUrl ? (
                        <div className="aspect-square bg-muted relative">
                          <img
                            src={normalized.imageUrl}
                            alt={normalized.label}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      )}
                      {/* Label */}
                      <div className="p-2 text-left">
                        <p className="text-xs font-medium truncate">{normalized.label}</p>
                        {normalized.description && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {normalized.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Single choice without images - button layout */}
            {q.type === "single" && q.options && !hasImageOptions(q.options) && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const value = getOptionValue(opt);
                  const label = typeof opt === "string" ? opt : opt.label;
                  return (
                    <Button
                      key={value}
                      variant={answers[qIndex] === value ? "default" : "outline"}
                      size="sm"
                      className="h-8"
                      onClick={() => updateAnswer(qIndex, value)}
                      disabled={disabled}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Multi choice with images */}
            {q.type === "multi" && q.options && hasImageOptions(q.options) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                {q.options.map((opt) => {
                  const normalized = normalizeOption(opt);
                  const isSelected = (answers[qIndex] as string[]).includes(normalized.value!);
                  return (
                    <button
                      key={normalized.value}
                      className={cn(
                        "relative flex flex-col rounded-lg border-2 overflow-hidden transition-all",
                        "hover:border-primary/50 hover:shadow-md",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      )}
                      onClick={() => toggleMultiOption(qIndex, normalized.value!)}
                      disabled={disabled}
                    >
                      {normalized.imageUrl ? (
                        <div className="aspect-square bg-muted relative">
                          <img
                            src={normalized.imageUrl}
                            alt={normalized.label}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>
                      )}
                      <div className="p-2 text-left">
                        <p className="text-xs font-medium truncate">{normalized.label}</p>
                        {normalized.description && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {normalized.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multi choice without images */}
            {q.type === "multi" && q.options && !hasImageOptions(q.options) && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const value = getOptionValue(opt);
                  const label = typeof opt === "string" ? opt : opt.label;
                  const selected = (answers[qIndex] as string[]).includes(value);
                  return (
                    <Button
                      key={value}
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className={cn("h-8 gap-1", selected && "pr-2")}
                      onClick={() => toggleMultiOption(qIndex, value)}
                      disabled={disabled}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isComplete || disabled}
        className="w-full"
      >
        Submit Answers
      </Button>
    </div>
  );
}
