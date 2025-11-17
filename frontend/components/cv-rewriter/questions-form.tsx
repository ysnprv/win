'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Edit3, Info } from 'lucide-react';

export interface Question {
  id: string;
  question: string;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
}

interface QuestionsFormProps {
  questions: Record<string, string>; // { "q1": "question text", ... }
  onSubmit: (answers: QuestionAnswer[]) => void;
  isSubmitting?: boolean;
}

export function QuestionsForm({ questions, onSubmit, isSubmitting = false }: QuestionsFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  // Initialize answers object and select all questions by default
  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    const questionKeys = Object.keys(questions);
    questionKeys.forEach((key) => {
      initialAnswers[key] = '';
    });
    setAnswers(initialAnswers);
    // Select all questions by default
    setSelectedQuestions(new Set(questionKeys));
  }, [questions]);

  const handleAnswerChange = (questionKey: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: value,
    }));

    // Mark as completed if answer has content and question is selected
    if (value.trim().length > 0 && selectedQuestions.has(questionKey)) {
      setCompletedQuestions((prev) => new Set(prev).add(questionKey));
    } else {
      setCompletedQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionKey);
        return newSet;
      });
    }
  };

  const handleQuestionToggle = (questionKey: string) => {
    setSelectedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionKey)) {
        newSet.delete(questionKey);
        // Also remove from completed if unchecked
        setCompletedQuestions((completedPrev) => {
          const newCompleted = new Set(completedPrev);
          newCompleted.delete(questionKey);
          return newCompleted;
        });
      } else {
        newSet.add(questionKey);
        // Check if it should be marked as completed
        if (answers[questionKey]?.trim().length > 0) {
          setCompletedQuestions((completedPrev) => new Set(completedPrev).add(questionKey));
        }
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    // Convert to array of QuestionAnswer objects, only including selected questions
    const questionAnswerArray: QuestionAnswer[] = Object.entries(questions)
      .filter(([key]) => selectedQuestions.has(key))
      .map(([key, questionText]) => ({
        question: questionText,
        answer: answers[key] || '',
      }));
    onSubmit(questionAnswerArray);
  };

  const questionKeys = Object.keys(questions);
  const totalQuestions = questionKeys.length;
  const selectedCount = selectedQuestions.size;
  const answeredQuestions = completedQuestions.size;
  const progressPercentage = selectedCount > 0 ? (answeredQuestions / selectedCount) * 100 : 0;
  const allAnswered = answeredQuestions === selectedCount && selectedCount >= 2;
  const meetsMinimum = selectedCount >= 2;

  return (
    <div className="w-full space-y-6">
      {/* Header with progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              Answer the Questions
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 font-light">
              Help us tailor your CV perfectly by answering these questions
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {answeredQuestions}/{selectedCount}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">Completed</p>
          </div>
        </div>

        {/* Info message */}
        <div className={`flex items-start gap-2 p-3 rounded-lg border ${
          meetsMinimum 
            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
        }`}>
          <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
            meetsMinimum 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-amber-600 dark:text-amber-400'
          }`} />
          <div className="text-xs">
            <p className={`font-medium ${
              meetsMinimum 
                ? 'text-blue-900 dark:text-blue-100' 
                : 'text-amber-900 dark:text-amber-100'
            }`}>
              {meetsMinimum 
                ? `${selectedCount} questions selected` 
                : 'Minimum 2 questions required'}
            </p>
            <p className={`mt-0.5 ${
              meetsMinimum 
                ? 'text-blue-700 dark:text-blue-300' 
                : 'text-amber-700 dark:text-amber-300'
            }`}>
              {meetsMinimum
                ? 'You can uncheck questions you prefer not to answer. Only checked questions will be used.'
                : 'Please select at least 2 questions to answer for better results.'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questionKeys.map((key, index) => {
          const isCompleted = completedQuestions.has(key);
          const isSelected = selectedQuestions.has(key);
          return (
            <Card
              key={key}
              className={`p-5 rounded-xl backdrop-blur-md border transition-all duration-200 ${
                !isSelected
                  ? 'bg-neutral-50/40 dark:bg-neutral-950/40 border-neutral-200/30 dark:border-neutral-800/30 opacity-60'
                  : isCompleted
                  ? 'bg-neutral-100/60 dark:bg-neutral-800/60 border-neutral-300/50 dark:border-neutral-700/50'
                  : 'bg-white/60 dark:bg-neutral-900/60 border-neutral-200/50 dark:border-neutral-800/50'
              }`}
            >
              <div className="space-y-3">
                {/* Question header */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <Checkbox
                      id={`question-${key}`}
                      checked={isSelected}
                      onCheckedChange={() => handleQuestionToggle(key)}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 dark:bg-neutral-100">
                        <CheckCircle2 className="h-4 w-4 text-neutral-50 dark:text-neutral-900" />
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{index + 1}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label 
                      htmlFor={`question-${key}`}
                      className={`text-sm font-medium leading-relaxed cursor-pointer ${
                        isSelected 
                          ? 'text-neutral-900 dark:text-neutral-100' 
                          : 'text-neutral-500 dark:text-neutral-500'
                      }`}
                    >
                      {questions[key]}
                    </label>
                  </div>
                </div>

                {/* Answer textarea */}
                <div className="pl-14">
                  <Textarea
                    placeholder={isSelected ? "Type your answer here..." : "Check the box to answer this question"}
                    value={answers[key] || ''}
                    onChange={(e) => handleAnswerChange(key, e.target.value)}
                    disabled={!isSelected}
                    className={`min-h-[110px] resize-y transition-all duration-200 text-sm ${
                      !isSelected
                        ? 'bg-neutral-100/50 dark:bg-neutral-900/50 border-neutral-200/30 dark:border-neutral-800/30 cursor-not-allowed opacity-50'
                        : isCompleted
                        ? 'bg-white/70 dark:bg-neutral-900/70 border-neutral-300/50 dark:border-neutral-700/50'
                        : 'bg-white/60 dark:bg-neutral-900/60 border-neutral-200/50 dark:border-neutral-800/50'
                    } focus:border-neutral-400 dark:focus:border-neutral-600`}
                  />
                  {answers[key] && isSelected && (
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-500 flex items-center gap-1">
                      <Edit3 className="h-3 w-3" />
                      {answers[key].length} characters
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || !meetsMinimum || isSubmitting}
          size="lg"
          className={`px-6 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-all duration-200 cursor-pointer ${
            allAnswered && meetsMinimum
              ? 'bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-neutral-50 dark:text-neutral-900'
              : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Generating Your Enhanced CV...
            </>
          ) : allAnswered && meetsMinimum ? (
            'Generate Enhanced CV'
          ) : !meetsMinimum ? (
            `Select At Least 2 Questions (${selectedCount} selected)`
          ) : (
            `Answer Selected Questions (${answeredQuestions}/${selectedCount})`
          )}
        </Button>
      </div>
    </div>
  );
}
