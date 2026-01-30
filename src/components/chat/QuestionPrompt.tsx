import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, HelpCircle } from "lucide-react";
import type { Question } from "@/stores/chat";

interface QuestionPromptProps {
  questions: Question[];
  onSubmit: (answers: (string | string[])[]) => void;
  disabled?: boolean;
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

            {q.type === "single" && q.options && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((option) => (
                  <Button
                    key={option}
                    variant={answers[qIndex] === option ? "default" : "outline"}
                    size="sm"
                    className="h-8"
                    onClick={() => updateAnswer(qIndex, option)}
                    disabled={disabled}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}

            {q.type === "multi" && q.options && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((option) => {
                  const selected = (answers[qIndex] as string[]).includes(option);
                  return (
                    <Button
                      key={option}
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      className={cn("h-8 gap-1", selected && "pr-2")}
                      onClick={() => toggleMultiOption(qIndex, option)}
                      disabled={disabled}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {option}
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
